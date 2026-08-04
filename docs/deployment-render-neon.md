# Render + Neon 部署指南

仓库根目录 `Dockerfile` 将 Web、Admin 和 Server 构建到一个容器。Render 提供公网
HTTPS，Caddy 提供静态资源和 API 反向代理，NestJS 连接 Neon PostgreSQL。

线上路径：

- `/`、`/links`：Web 查询端。
- `/admin/`：Admin 管理端。
- `/api/web/v1/**`、`/api/admin/v1/**`：业务 API。
- `/api/healthz`：Render 健康检查。

## 启动流程

容器启动时依次：

1. 校验数据库和 Admin 环境变量。
2. 使用 `DIRECT_DATABASE_URL` 执行 `prisma migrate deploy`。
3. 在 `127.0.0.1:${INTERNAL_PORT}` 启动 NestJS。
4. 内部健康检查通过后，在 Render 提供的 `${PORT}` 上启动 Caddy。

Caddy 监听公网端口，NestJS 只监听容器回环地址。数据库、Telegram 加密会话和业务
数据均保存在 Neon。

## 准备 Neon

1. 创建 PostgreSQL 17 项目，区域尽量靠近 Render Web Service。
2. 从 Neon Console 的 **Connect** 对话框复制：
   - pooled 地址作为 `DATABASE_URL`。
   - direct 地址作为 `DIRECT_DATABASE_URL`。
3. 保留连接串中的 TLS 参数。

运行时使用 pooled 地址，迁移、`pg_dump` 和导入使用 direct 地址。详情见
[Neon Connection pooling](https://neon.com/docs/connect/connection-pooling)。

## 创建 Render Web Service

在 Render Dashboard 选择 **New > Web Service**，连接本仓库：

| 设置              | 值                          |
| ----------------- | --------------------------- |
| Source            | Git Provider 中的本仓库     |
| Branch            | 实际部署分支，通常为 `main` |
| Language          | Docker                      |
| Dockerfile Path   | `Dockerfile`                |
| Region            | 尽量靠近 Neon 项目          |
| Health Check Path | `/api/healthz`              |
| Auto-Deploy       | 按发布策略选择              |

Docker 服务直接执行镜像 `ENTRYPOINT`，无需填写 Docker Command。当前 Caddy 配置已经
监听 `0.0.0.0` 和 Render 提供的 `PORT`。不要手工设置 `PORT`；Render 默认使用
`10000`，也可能按服务配置传入其他值。

相关官方文档：
[Docker](https://render.com/docs/docker)、
[Web Services](https://render.com/docs/web-services)、
[Health Checks](https://render.com/docs/health-checks)。

## 环境变量

在 Web Service 的 **Environment** 中配置：

| 名称                              | 用途                             |
| --------------------------------- | -------------------------------- |
| `DATABASE_URL`                    | Neon pooled 连接地址             |
| `DIRECT_DATABASE_URL`             | Neon direct 连接地址             |
| `BASIC_AUTH_USERNAME`             | Admin 用户名                     |
| `BASIC_AUTH_PASSWORD_HASH`        | Admin bcrypt 密码哈希            |
| `ADMIN_AUTH_SESSION_SECRET`       | 32 字节 Base64 Cookie 签名密钥   |
| `TELEGRAM_API_ID`                 | Telegram 应用 ID                 |
| `TELEGRAM_API_HASH`               | Telegram 应用 Hash               |
| `TELEGRAM_SESSION_ENCRYPTION_KEY` | 32 字节 Base64 Telegram 会话密钥 |
| `HOST`                            | `127.0.0.1`                      |
| `INTERNAL_PORT`                   | `3001`                           |
| `NODE_ENV`                        | `production`                     |
| `SWAGGER_ENABLED`                 | `false`                          |

`INTERNAL_PORT` 不得与 Render 的 `PORT` 相同，否则 Caddy 与 NestJS 会争用端口。

生成密码哈希和两份不同的 32 字节密钥：

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
openssl rand -base64 32
```

更换 Telegram 会话密钥后需要重新授权；更换 Admin 凭据或会话密钥会使现有 Cookie
失效。

## 首次部署

Neon 为空时，配置环境变量并创建 Web Service 即可。Render 会使用 BuildKit 构建
Dockerfile，容器每次启动都会先应用生产迁移。

部署日志应依次出现 Prisma 迁移、NestJS 和 Caddy 启动。迁移失败时检查 direct
连接串、TLS 参数和迁移文件；端口检测失败时确认未覆盖 `PORT`，且
`INTERNAL_PORT=3001`。

## 迁移本地数据

`deploy/import-neon-data.sh` 将本地 Docker Compose PostgreSQL 的 `public` schema
导入空的 Neon 业务表。执行前确认本地容器正在运行、Neon 已应用全部迁移，并暂停业务
写入。

```bash
pnpm db:up
cd apps/server
export DIRECT_DATABASE_URL='<NEON_DIRECT_URL>'
pnpm exec prisma migrate deploy
cd ../..

export DIRECT_DATABASE_URL='<NEON_DIRECT_URL>'
./deploy/import-neon-data.sh
```

脚本默认读取 `telegram-links-postgres-1`；自定义容器名时设置
`SOURCE_POSTGRES_CONTAINER`。它会确认目标表为空，在单个事务中按外键顺序导入，并
核对各表记录数。首次稳定运行前保留本地 Docker volume 作为回滚副本。

## 验收

1. Render Deploy 状态为 **Live**，健康检查通过。
2. `/`、`/links` 和 `/api/web/v1/overview` 可访问。
3. `/admin/` 可登录，链接和分类标签操作能写入 Neon。
4. Telegram 账号可恢复，并能完成一次小范围同步。
5. 再部署一次，确认迁移幂等且已有数据可读取。

## Render Free 实例

Free Web Service 连续 15 分钟没有入站流量后会休眠，唤醒通常需要约一分钟。文件系统
为临时存储，每个 workspace 每月共享 750 Free instance hours，且不支持持久磁盘、
横向扩容、SSH 和一次性任务。完整限制见
[Render Free 官方说明](https://render.com/docs/free)。

同步任务在 Server 进程内运行，实例重启或休眠时会中断。长任务应拆成更小的聊天和
时间范围，或使用不会休眠的实例。
