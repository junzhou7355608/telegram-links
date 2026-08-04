# Server

Telegram Links 的 NestJS 服务端。它使用 GramJS 以个人 Telegram 账号连接
MTProto，同步选定聊天中的链接，并通过 Prisma 保存到本地 PostgreSQL。
扫描会提取消息中的 HTTP(S) 链接、按精确主机名去重，并保留每个完整 URL 来源。

## 本地启动

1. 在 <https://my.telegram.org> 创建应用并取得 `api_id`、`api_hash`。
2. 复制环境文件并填写 Admin 登录和 Telegram 凭据：

```bash
cp apps/server/.env.example apps/server/.env
openssl rand -base64 32
```

分别生成 `ADMIN_AUTH_SESSION_SECRET` 和 `TELEGRAM_SESSION_ENCRYPTION_KEY`。
前者签名 7 天有效的 Admin HttpOnly Cookie；后者用于 AES-256-GCM 加密 Telegram
StringSession，丢失后需要重新授权账号。Admin 密码继续使用 Caddy bcrypt 格式：

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

将用户名和输出的哈希写入 `BASIC_AUTH_USERNAME`、`BASIC_AUTH_PASSWORD_HASH`。

```bash
pnpm db:up
pnpm --filter server start:dev
```

默认只监听 `127.0.0.1:3000`：

- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- PostgreSQL：`localhost:5433`

只有 `SWAGGER_ENABLED=true` 时才会暴露 Swagger。

## 接口分区

- `/api/web/v1`：只读展示未归档且已整理的链接列表、详情和概览。
- `/api/admin/v1`：登录后使用的 Telegram 授权、聊天刷新、同步任务和链接整理。

Admin 会话接口为 `GET`、`POST`、`DELETE /api/admin/v1/auth/session`。登录 Cookie
不会写入 JavaScript 可读存储；Web 接口和健康检查始终公开。

首次授权依次调用：

1. `POST /api/admin/v1/telegram/auth/code`
2. `POST /api/admin/v1/telegram/auth/code/verify`
3. 账号启用 2FA 时调用
   `POST /api/admin/v1/telegram/auth/password/verify`

验证码和 2FA 密码仅用于当前请求，不会写入数据库。授权后先刷新聊天，再选择
聊天创建 `/api/admin/v1/sync-jobs`。任务在进程内后台运行，通过详情接口轮询。

创建扫描任务时可以选择默认分类和标签。新链接以域名作为标题并进入待整理队列，
后续在 Admin 中补充标题和分类，也可按需添加用途和标签。

## Prisma

Schema 位于 `prisma/schema.prisma`，迁移位于 `prisma/migrations`。生成的客户端
写入 `src/generated/prisma`，该目录是生成物，不提交到 Git。

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
pnpm --filter server prisma:studio
```

## 检查与测试

```bash
pnpm --filter server lint
pnpm --filter server check-types
pnpm --filter server build
pnpm --filter server test
pnpm --filter server test:e2e
```

E2E 使用同一 PostgreSQL 容器中的 `telegram_links_test` schema，不会清理
`public` schema。测试前先运行 `pnpm db:up`，结束后可使用 `pnpm db:down`
停止容器并保留数据卷。

## 当前限制

- 只支持一个已有 Telegram 个人账号。
- 仅保存包含 HTTP(S) 链接的消息。
- 同步需要手动触发，同一时间只能运行一个任务。
- 不实时监听消息，也不抓取目标网页。
- 扫描不会自动识别标题、用途或分类，链接保存后保持“待整理”。
