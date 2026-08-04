# Server

Telegram Links 的 NestJS 服务端，使用 GramJS 连接 Telegram MTProto，并通过 Prisma
7 和 PostgreSQL 保存 Telegram 会话、聊天、消息、链接、分类标签和同步任务。Admin
登录使用环境变量和签名 Cookie。

## 环境变量

```bash
cp apps/server/.env.example apps/server/.env
```

| 变量                                    | 用途                                  |
| --------------------------------------- | ------------------------------------- |
| `DATABASE_URL`                          | Server 运行时 PostgreSQL 连接串       |
| `DIRECT_DATABASE_URL`                   | 生产迁移和数据导入使用的直连地址      |
| `HOST` / `PORT`                         | 监听地址和端口，默认 `127.0.0.1:3000` |
| `SWAGGER_ENABLED`                       | 值为 `true` 时启用 Swagger            |
| `BASIC_AUTH_USERNAME`                   | Admin 用户名                          |
| `BASIC_AUTH_PASSWORD_HASH`              | Admin bcrypt 密码哈希                 |
| `ADMIN_AUTH_SESSION_SECRET`             | 32 字节 Base64 Cookie 签名密钥        |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram 应用凭据                     |
| `TELEGRAM_SESSION_ENCRYPTION_KEY`       | 32 字节 Base64 Telegram 会话密钥      |

分别生成 Admin 和 Telegram 密钥，并生成密码哈希：

```bash
openssl rand -base64 32
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

Admin Cookie 有效期为 7 天。Telegram StringSession 使用 AES-256-GCM 加密保存，更换
加密密钥后需要重新授权。

## 启动与接口

```bash
pnpm db:up
pnpm --filter server prisma:migrate
pnpm --filter server dev
```

- 健康检查：<http://localhost:3000/api/healthz>
- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- `/api/web/v1/**`：公开只读的链接和概览接口。
- `/api/admin/v1/auth/session`：Admin 会话接口。
- `/api/admin/v1/**`：链接、分类标签、Telegram 和同步任务接口。

Server OpenAPI 是 Web 与 Admin 业务 DTO 的唯一来源。

## Telegram 扫描

首次授权依次发送验证码、验证验证码，并在需要时验证 2FA 密码。登录 challenge 保存在
Server 进程内，10 分钟后过期。授权完成后刷新聊天并创建同步任务。

同步范围：

- `sinceLast`：从上次同步消息继续，首次使用时读取最近 7 天。
- `last7Days`：最近 7 天。
- `custom`：自定义起止时间。
- `allHistory`：全部可读取历史。

同一时间只运行一个任务。多聊天任务逐个处理并允许部分成功；Server 重启会将遗留任务
标记为 `INTERRUPTED`。

## 链接规则

- 扫描读取纯文本 URL、Telegram URL entity、文本链接和按钮 URL。
- URL 会移除 fragment、统一小写主机名和非根路径末尾斜杠。
- `Link.domain` 全局唯一；同一主机名的不同完整 URL 保存为独立来源记录。
- 新扫描链接以主机名作为标题并进入 `PENDING`；默认分类和标签会应用到新链接和待
  整理的既有链接。
- `ORGANIZED` 状态要求标题、合法 URL 和分类。
- 归档使用 `archivedAt` 软删除，可由 Admin 恢复。

## Prisma 与验证

Schema 位于 `prisma/schema.prisma`，迁移位于 `prisma/migrations`。Prisma Client
生成到 `src/generated/prisma`。

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
pnpm --filter server prisma:studio
```

生产容器自动运行 `prisma migrate deploy`。历史中文 URL 修复脚本为
`pnpm --filter server repair:chinese-urls`。

```bash
pnpm --filter server lint
pnpm --filter server check-types
pnpm --filter server build
pnpm --filter server test
pnpm --filter server test:e2e
```

E2E 使用 `telegram_links_test` schema，运行前先执行 `pnpm db:up`，并替换 Telegram
Gateway。

## 当前限制

- 只支持一个已有 Telegram 个人账号。
- 同步由 Admin 手动触发，同一时间只运行一个进程内任务。
