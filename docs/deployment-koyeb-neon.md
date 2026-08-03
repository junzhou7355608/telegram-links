# Koyeb + Neon 部署指南

本指南将 Web、Admin 和 Server 打包到一个生产容器，并使用 Neon PostgreSQL 保存
数据。Koyeb 提供外部 HTTPS，容器内部由 Caddy 提供静态资源、Basic Auth 和 API
反向代理。

生产地址布局：

- `/`：Web 查询端。
- `/admin/`：Admin 管理端。
- `/api/**`：NestJS API。
- `/api/healthz`：Koyeb 健康检查，不访问数据库且不要求 Basic Auth。

## 账号和资源

1. 注册 Neon Free，在 Frankfurt 创建 PostgreSQL 17 项目。
2. 复制 pooled 和 direct 两种连接地址。应用使用 pooled 地址，迁移和数据导入使用
   direct 地址。
3. 注册 Koyeb Starter，添加有效支付方式，连接 GitHub 仓库。
4. Koyeb 只创建一个 Frankfurt `free` Web Service，不创建 Koyeb Database、Volume
   或其他付费资源，并在 Billing 中设置最低额度提醒。

Koyeb 服务使用以下设置：

| 设置         | 值                                     |
| ------------ | -------------------------------------- |
| Builder      | Dockerfile                             |
| Branch       | `main`                                 |
| Instance     | `free`                                 |
| Region       | Frankfurt                              |
| Exposed port | `8000` / HTTP                          |
| Route        | `/`                                    |
| Health check | HTTP `GET /api/healthz` on port `8000` |
| Auto deploy  | Enabled                                |

## 环境变量和密钥

在 Koyeb 中将连接串、Telegram 凭据和认证信息创建为 Secrets，不要提交 `.env`：

| 名称                              | 用途                                |
| --------------------------------- | ----------------------------------- |
| `DATABASE_URL`                    | Neon pooled 连接地址                |
| `DIRECT_DATABASE_URL`             | Neon direct 连接地址                |
| `TELEGRAM_API_ID`                 | Telegram 应用 ID                    |
| `TELEGRAM_API_HASH`               | Telegram 应用 Hash                  |
| `TELEGRAM_SESSION_ENCRYPTION_KEY` | 现有 32 字节 Base64 会话密钥        |
| `BASIC_AUTH_USERNAME`             | 全站 Basic Auth 用户名              |
| `BASIC_AUTH_PASSWORD_HASH`        | Caddy bcrypt 密码哈希，不是明文密码 |

普通环境变量固定为：

```text
HOST=127.0.0.1
NODE_ENV=production
PORT=3000
PUBLIC_PORT=8000
SWAGGER_ENABLED=false
```

使用交互式命令生成密码哈希，密码不会显示在终端或写入 shell 历史：

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

将输出保存为 `BASIC_AUTH_PASSWORD_HASH`，明文密码只交给站点使用者保管。

## 迁移本地数据

先确保 Neon 数据库为空并已执行生产迁移：

```bash
cd apps/server
DIRECT_DATABASE_URL='<NEON_DIRECT_URL>' \
  DATABASE_URL='<NEON_POOLED_URL>' \
  pnpm exec prisma migrate deploy
```

迁移期间停止本地 Server 和 Admin 的写操作，但保留本地 PostgreSQL 容器。然后执行
仓库提供的导入脚本：

```bash
export DIRECT_DATABASE_URL='<NEON_DIRECT_URL>'
./deploy/import-neon-data.sh
```

脚本只导入 `public` schema 的业务表，不包含 `_prisma_migrations` 或测试 schema；它会
按外键依赖顺序流式传输数据，并在同一个数据库事务中完成全部写入。任一语句失败都会
回滚，成功后脚本逐表核对本地与 Neon 的记录数。只有全部一致才启动 Koyeb 服务。
保留本地 Docker volume 作为首次上线的回滚副本。

## 验收和限制

上线后依次验证：

1. `/api/healthz` 无认证返回 `200`。
2. 其他页面和 API 无认证返回 `401`。
3. 登录后 `/links`、`/admin/links/pending` 和只读 API 正常。
4. Telegram 会话恢复；若 Telegram 拒绝旧会话，再从 Admin 重新授权。
5. 创建小范围同步任务，确认数据写入和任务轮询正常。
6. 触发一次重新部署，确认数据库数据和 Telegram 加密会话仍可恢复。

Koyeb 免费实例空闲一小时后会休眠。首次访问需要等待容器、Neon 和 Telegram
连接恢复；长时间同步期间应保持 Admin 页面打开，让任务轮询持续产生入站请求。
