# Server

Telegram Links 的 NestJS 服务端。它使用 GramJS 以个人 Telegram 账号连接 MTProto，
从选定聊天提取 HTTP(S) 链接，并通过 Prisma 7 和 PostgreSQL 持久化 Telegram 加密
会话、聊天、消息、链接、来源、分类、标签和同步任务。Admin 登录配置来自环境变量，
会话由签名 Cookie 承载，不写入数据库。

## 环境变量

复制示例文件：

```bash
cp apps/server/.env.example apps/server/.env
```

| 变量                                    | 是否必需   | 用途                                                                   |
| --------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                          | 是         | Server 运行时 PostgreSQL 连接串；可通过 `?schema=` 指定 schema         |
| `DIRECT_DATABASE_URL`                   | 生产       | Prisma 迁移和数据导入使用的直连地址；本地未设置时回退到 `DATABASE_URL` |
| `HOST` / `PORT`                         | 否         | 监听地址和端口，默认 `127.0.0.1:3000`                                  |
| `NODE_ENV`                              | 否         | `production` 时 Admin Cookie 启用 `Secure`                             |
| `SWAGGER_ENABLED`                       | 否         | 仅值为 `true` 时暴露 Swagger                                           |
| `BASIC_AUTH_USERNAME`                   | Admin 登录 | Admin 用户名，变量名为兼容既有部署保留                                 |
| `BASIC_AUTH_PASSWORD_HASH`              | Admin 登录 | Caddy bcrypt 格式的密码哈希，不是明文密码                              |
| `ADMIN_AUTH_SESSION_SECRET`             | Admin 登录 | 32 字节 Base64 Cookie 签名密钥                                         |
| `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` | Telegram   | 从 <https://my.telegram.org> 获取的应用凭据                            |
| `TELEGRAM_SESSION_ENCRYPTION_KEY`       | Telegram   | 32 字节 Base64 AES-256-GCM 会话加密密钥                                |

分别为 Admin Cookie 和 Telegram 会话生成两份不同的密钥：

```bash
openssl rand -base64 32
openssl rand -base64 32
```

交互式生成 Admin 密码哈希：

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

Admin Cookie 有效期为 7 天，路径限制为 `/api/admin/v1`，凭据变化会使现有 Cookie
失效。Telegram StringSession 使用 AES-256-GCM 加密后保存；丢失或更换加密密钥后
需要重新授权账号。

## 本地启动

首次启动或新增迁移后执行：

```bash
pnpm db:up
pnpm --filter server prisma:migrate
pnpm --filter server dev
```

默认地址：

- 健康检查：<http://localhost:3000/api/healthz>
- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- PostgreSQL：`localhost:5433`

健康检查不访问数据库。Swagger 默认仅由示例开发配置启用，生产部署应保持关闭。

## 接口分区

全局 API 前缀为 `/api`：

- `/api/healthz`：公开健康检查。
- `/api/web/v1`：公开只读，只返回未归档且已整理的链接、来源详情和概览。
- `/api/admin/v1/auth/session`：查询、创建和删除 Admin Cookie 会话。
- `/api/admin/v1/**` 的其他路径：需要有效 Admin Cookie，负责链接、基础资料、
  Telegram 和同步任务。

Server 生成的 Swagger/OpenAPI 是 Web 与 Admin 业务 DTO 的唯一来源。请求启用全局
白名单校验，未知字段、无效 UUID、分页或枚举值会返回统一错误结构。

## Telegram 授权与扫描

首次授权流程：

1. `POST /api/admin/v1/telegram/auth/code`
2. `POST /api/admin/v1/telegram/auth/code/verify`
3. 账号启用 2FA 时调用
   `POST /api/admin/v1/telegram/auth/password/verify`

登录 challenge 只保存在当前 Server 进程内，10 分钟后过期。验证码和 2FA 密码仅
用于当前请求，不写入数据库。授权后刷新聊天列表，再从可用聊天中选择一个或多个创建
`POST /api/admin/v1/sync-jobs`。

同步范围支持：

- `sinceLast`：已有同步游标时从上次消息继续，否则回退到最近 7 天。
- `last7Days`：扫描最近 7 天。
- `custom`：使用有效的起止时间。
- `allHistory`：扫描全部可读取历史。

任务在 Server 进程内后台运行，同一时间只能有一个 `QUEUED` 或 `RUNNING` 任务。
多聊天任务逐个聊天处理，允许部分成功；Server 重启会把遗留任务标记为
`INTERRUPTED`。

## 链接与来源规则

- 只接受 HTTP(S) URL；扫描会读取纯文本 URL、Telegram URL entity、文本链接和按钮
  URL，并清除 fragment、统一小写主机名和非根路径末尾斜杠。
- `Link.domain` 全局唯一，因此一个小写主机名对应一条链接。更新或手动创建相同主机名
  会返回冲突。
- 同一主机名的不同完整 URL 会作为 `LinkSource` 保留，并关联来源聊天、消息、原始
  URL、发送时间、发送者和可生成的 Telegram 消息地址。
- 新扫描链接以主机名作为标题、以 `PENDING` 状态创建。任务默认分类和标签会补到新
  链接，也会补到仍待整理且未归档的既有链接，但不会自动标记为已整理。
- 手动新增链接没有 Telegram 来源。`ORGANIZED` 状态要求标题、合法 URL 和分类。
- 归档使用 `archivedAt` 软删除，可由 Admin 恢复；Web 永远不返回归档或待整理链接。

## Prisma

Schema 位于 `prisma/schema.prisma`，迁移位于 `prisma/migrations`。生成客户端写入
`src/generated/prisma`，该目录是本地生成物，不提交到 Git。

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
pnpm --filter server prisma:studio
```

`prisma:migrate` 用于本地开发迁移；生产容器入口自动运行 `prisma migrate deploy`。

历史数据如包含被中文标点污染的 Telegram URL，可在确认数据库备份后运行：

```bash
pnpm --filter server repair:chinese-urls
```

## 检查与测试

```bash
pnpm --filter server lint
pnpm --filter server check-types
pnpm --filter server build
pnpm --filter server test
pnpm --filter server test:e2e
```

E2E 自动应用生产迁移，并使用同一 PostgreSQL 数据库中的 `telegram_links_test`
schema，不会清理 `public` schema。测试前先运行 `pnpm db:up`，结束后可使用
`pnpm db:down` 停止容器并保留数据卷。测试会替换 Telegram Gateway，不连接真实
Telegram。

## 当前限制

- 只支持一个已有 Telegram 个人账号，不支持注册新账号。
- 同步由 Admin 手动触发，同一时间只运行一个进程内任务。
