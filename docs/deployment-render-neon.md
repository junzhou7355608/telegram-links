# Render + Neon 部署指南

本指南使用仓库根目录 `Dockerfile` 将 Web、Admin 和 Server 构建到一个容器，并使用
Neon PostgreSQL 保存数据。Render 提供公网 HTTPS；容器内由 Caddy 提供静态资源和
API 反向代理，NestJS 负责 Admin Cookie 会话和业务 API。

线上地址布局：

- `/` 和 `/links`：公开 Web 查询端。
- `/admin/`：Admin 管理端，未登录时显示登录页。
- `/api/web/v1/**`：公开只读 API。
- `/api/admin/v1/**`：Admin API。
- `/api/healthz`：Render 健康检查。

## 容器启动流程

`Dockerfile` 使用 Node.js 24 构建三个 workspace，运行镜像包含：

- `/srv/web`：Web 静态构建。
- `/srv/admin`：以 `/admin/` 为 base 的 Admin 静态构建。
- `/app`：Server 生产依赖、Prisma schema、迁移和 Caddy。

容器入口按以下顺序启动：

1. 校验数据库和 Admin 登录环境变量。
2. 使用 `DIRECT_DATABASE_URL` 执行 `prisma migrate deploy`。
3. 在 `127.0.0.1:${INTERNAL_PORT}` 启动 NestJS。
4. 等待内部 `/api/healthz` 成功后，在 Render 提供的 `${PORT}` 上启动 Caddy。

Caddy 监听容器公网端口，NestJS 只监听容器回环地址。数据库、Telegram 加密会话和业务
数据都保存在 Neon，容器本地文件系统不承载持久数据。

## 准备 Neon

1. 创建 Neon PostgreSQL 17 项目，区域尽量靠近 Render Web Service。
2. 在 Neon Console 的 **Connect** 对话框复制两种连接串：
   - pooled 地址：作为 `DATABASE_URL`，供运行时 Prisma Client 使用。
   - direct 地址：作为 `DIRECT_DATABASE_URL`，供迁移、`pg_dump` 和数据导入使用。
3. 保留连接串自带的 TLS 参数。

连接串不要写入仓库、镜像或日志。Neon pooled 与 direct 地址的区别见
[Connection pooling](https://neon.com/docs/connect/connection-pooling)。

## 创建 Render Web Service

在 Render Dashboard 选择 **New > Web Service**，连接本仓库并使用以下配置：

| 设置              | 值                                                          |
| ----------------- | ----------------------------------------------------------- |
| Source            | Git Provider 中的本仓库                                     |
| Branch            | `main`，或实际部署分支                                      |
| Language          | Docker                                                      |
| Dockerfile Path   | `Dockerfile`                                                |
| Region            | 尽量靠近 Neon 项目                                          |
| Health Check Path | `/api/healthz`                                              |
| Auto-Deploy       | 按发布策略选择 `On Commit`、`After CI Checks Pass` 或 `Off` |

Docker 服务默认执行镜像的 `ENTRYPOINT`，不需要填写 Docker Command。Render Web
Service 要求公网进程监听 `0.0.0.0` 和平台提供的 `PORT`；当前 Caddy 配置已经满足该
要求。不要在 Render Environment 中手工设置 `PORT`，Render 默认提供 `10000`，也会
根据服务配置传入实际公网端口。

配置方式可参考 Render 官方的
[Docker 部署](https://render.com/docs/docker)、
[Web Services](https://render.com/docs/web-services) 和
[Health Checks](https://render.com/docs/health-checks)。

## 环境变量

在 Render Web Service 的 **Environment** 中配置：

| 名称                              | 用途                                   |
| --------------------------------- | -------------------------------------- |
| `DATABASE_URL`                    | Neon pooled 连接地址                   |
| `DIRECT_DATABASE_URL`             | Neon direct 连接地址，容器启动迁移必需 |
| `BASIC_AUTH_USERNAME`             | Admin 登录用户名                       |
| `BASIC_AUTH_PASSWORD_HASH`        | Admin bcrypt 密码哈希                  |
| `ADMIN_AUTH_SESSION_SECRET`       | 32 字节 Base64 Cookie 签名密钥         |
| `TELEGRAM_API_ID`                 | Telegram 应用 ID                       |
| `TELEGRAM_API_HASH`               | Telegram 应用 Hash                     |
| `TELEGRAM_SESSION_ENCRYPTION_KEY` | 32 字节 Base64 Telegram 会话加密密钥   |
| `HOST`                            | 固定为 `127.0.0.1`，供内部 NestJS 使用 |
| `INTERNAL_PORT`                   | 固定为 `3001`                          |
| `NODE_ENV`                        | 固定为 `production`                    |
| `SWAGGER_ENABLED`                 | 固定为 `false`                         |

不要把 `INTERNAL_PORT` 设置为 Render 的 `PORT`，否则 Caddy 与 NestJS 会争用同一个
端口。

生成 Admin 密码哈希：

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

分别运行两次以下命令，生成不同的 Admin 与 Telegram 密钥：

```bash
openssl rand -base64 32
```

密码明文只交给站点使用者保管。更换 Telegram 会话加密密钥后需要重新授权 Telegram；
更换 Admin 用户名、密码哈希或会话密钥会使现有 Admin Cookie 失效。

## 首次部署

Neon 为空且不需要迁移本地业务数据时，配置环境变量后创建 Web Service。Render 会用
BuildKit 构建根目录 Dockerfile，并按 Docker `ENTRYPOINT` 启动容器。容器每次启动时
都会先执行已提交的生产迁移。

部署日志应依次出现 Prisma 迁移、NestJS 启动和 Caddy 启动。迁移失败时优先检查
`DIRECT_DATABASE_URL`、TLS 参数和已提交的迁移文件；端口检测失败时确认没有覆盖
`PORT`，并确认 `INTERNAL_PORT=3001`。

## 迁移现有本地数据

`deploy/import-neon-data.sh` 用于把本地 Docker Compose PostgreSQL 的 `public`
schema 一次性导入空的 Neon 业务表。执行前确认：

- 本机使用 zsh，并已安装 Docker。
- `telegram-links-postgres-1` 容器正在运行；自定义容器名时设置
  `SOURCE_POSTGRES_CONTAINER`。
- Neon 已执行仓库当前全部迁移，且所有目标业务表为空。
- 使用 Neon direct 地址。
- 导入期间没有本地或 Render 端的业务写入。

先启动本地数据库，并在 Neon 执行生产迁移：

```bash
pnpm db:up
cd apps/server
export DIRECT_DATABASE_URL='<NEON_DIRECT_URL>'
pnpm exec prisma migrate deploy
cd ../..
```

然后从仓库根目录导入：

```bash
export DIRECT_DATABASE_URL='<NEON_DIRECT_URL>'
./deploy/import-neon-data.sh
```

脚本只导入 `public` schema 的业务表，不包含 `_prisma_migrations` 或测试 schema。它会
先确认目标表为空，再按外键依赖顺序流式传输数据，并在同一个事务中完成写入。任一 SQL
失败都会回滚；成功后逐表核对本地与 Neon 的记录数。

导入成功后再恢复 Render Web Service 的业务访问。首次稳定运行前保留本地 Docker
volume 作为回滚副本。

## 上线验收

1. Render Deploy 状态为 **Live**，健康检查持续通过。
2. `GET /api/healthz` 返回 `{"status":"ok"}`。
3. `/` 和 `/links` 可访问，`/api/web/v1/overview` 正常返回。
4. `/admin/` 显示登录页，登录后 `/admin/links/pending` 可访问。
5. 分类、标签、链接新增与编辑操作能写入 Neon。
6. Telegram 账号状态可恢复，并能完成一次小范围同步。
7. 手动部署一次当前提交，确认迁移幂等且已有数据仍可读取。

## Render Free 实例

使用 Free Web Service 时需要考虑以下运行特性：

- 连续 15 分钟没有入站 HTTP 或 WebSocket 流量后会休眠，下次访问通常需要约一分钟
  唤醒。
- 文件系统是临时的，重启、重新部署或休眠后本地变更会丢失。
- 每个 workspace 每月共享 750 Free instance hours，并受带宽和构建分钟额度限制。
- Free 实例不支持持久磁盘、横向扩容、SSH 和一次性任务。

完整限制以 [Render Free 官方说明](https://render.com/docs/free) 为准。同步任务在
Server 进程内运行，实例重启或休眠时会中断；长任务应拆成更小的聊天和时间范围，或
使用不会休眠的实例。
