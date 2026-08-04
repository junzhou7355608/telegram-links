# Telegram Links

一个用于收集、整理和检索个人 Telegram 聊天中网页链接的 monorepo。系统也支持
在管理端手动新增链接，并将标题、用途、分类、标签和 Telegram 来源一起保存到
PostgreSQL。

## 当前能力

| 应用     | 默认入口          | 职责                                                    |
| -------- | ----------------- | ------------------------------------------------------- |
| `web`    | `/links`          | 公开、只读地搜索和筛选已整理链接，查看来源并复制 URL    |
| `admin`  | `/admin/`（生产） | 登录后授权 Telegram、发起扫描、整理链接和维护分类标签   |
| `server` | `/api/**`         | 提供 NestJS API、执行 Telegram 扫描并通过 Prisma 持久化 |

当前实现具有以下数据规则：

- Web 只展示未归档且状态为“已整理”的链接，Admin 负责全部管理操作。
- 扫描支持“自上次同步”“最近 7 天”“自定义时间”和“全部历史”四种范围，可为新
  链接预设分类和标签。
- 系统按小写主机名去重，每个主机名只保留一条 `Link`；同一主机名下出现过的完整
  URL 及其来源消息分别保存在 `LinkSource`。
- 新扫描出的链接以主机名作为标题并进入待整理状态。标题、合法 HTTP(S) URL 和分类
  齐全后才能标记为已整理。
- Admin 支持手动新增、单条和批量整理、归档与恢复，以及分类和标签的新增、重命名、
  删除和拖拽排序。

## 仓库结构

```text
apps/
  admin/   React + Vite 管理端
  server/  NestJS + Prisma 服务端
  web/     React + Vite 查询端
packages/
  eslint-config/      共享 ESLint flat config
  typescript-config/  共享 TypeScript 配置
  ui/                 共享 shadcn/ui primitives、主题和工具
docs/
  deployment-render-neon.md  Render + Neon 部署指南
deploy/                       生产容器入口、Caddy 配置和数据导入脚本
```

## 本地开发

环境要求：

- Node.js 20.19 或更高版本
- Corepack；仓库通过 `packageManager` 固定 pnpm 11.19.0
- Docker 与 Docker Compose

安装依赖：

```bash
corepack enable
pnpm install
```

准备 Server 配置。Admin 登录需要用户名、Caddy bcrypt 密码哈希和 32 字节 Base64
会话密钥；使用 Telegram 功能时还需填写 Telegram 应用凭据和另一份会话加密密钥：

```bash
cp apps/server/.env.example apps/server/.env
openssl rand -base64 32
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

将生成值写入 `apps/server/.env`。完整字段说明见
[Server README](./apps/server/README.md)。不要提交本地 `.env`、凭据或数据库连接串。

首次启动数据库时应用迁移，然后启动全部 workspace：

```bash
pnpm db:up
pnpm --filter server prisma:migrate
pnpm dev
```

`pnpm dev` 会同时启动 Web、Admin 和 Server；Vite 访问地址以终端输出为准。Server
默认监听 `127.0.0.1:3000`：

- 健康检查：<http://localhost:3000/api/healthz>
- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- PostgreSQL：`localhost:5433`

本地示例配置启用 Swagger；只有 `SWAGGER_ENABLED=true` 时才会暴露文档。业务接口按
`/api/web/v1/**` 和 `/api/admin/v1/**` 分区，前者公开只读，后者除会话接口外均要求
Admin HttpOnly Cookie。

可以单独启动应用：

```bash
pnpm --filter web dev
pnpm --filter admin dev
pnpm --filter server dev
```

## 常用命令

```bash
pnpm build           # 构建所有 workspace
pnpm lint            # 运行 ESLint，warning 也会失败
pnpm lint:fix        # 自动修复 ESLint 问题
pnpm format          # 使用 Prettier 格式化仓库
pnpm format:check    # 只检查 Prettier 格式
pnpm check-types     # 执行各 workspace 的类型检查
pnpm db:up           # 启动本地 PostgreSQL
pnpm db:down         # 停止容器并保留数据卷
pnpm db:logs         # 持续查看 PostgreSQL 日志
pnpm db:ps           # 查看数据库容器状态
```

前端测试需要分别运行；服务端 E2E 测试需要先执行 `pnpm db:up`：

```bash
pnpm --filter web test
pnpm --filter admin test
pnpm --filter server test
pnpm --filter server test:e2e
```

## API 契约

Server 的 Swagger/OpenAPI 是业务 DTO 的唯一来源。Web 和 Admin 各自保存经过路径过滤
的 `openapi.json`，再用 Hey API 生成 `src/api/**`。这些快照、生成客户端和
`src/routeTree.gen.ts` 都不要手工修改；具体命令见各应用 README。

## 部署

仓库的 `Dockerfile` 会构建三个应用，并在单个容器中通过 Caddy 提供 Web、Admin 和
API。容器启动时先执行 Prisma 生产迁移，再启动 Server 和 Caddy。使用 Render Web
Service 与 Neon PostgreSQL 的步骤、限制和数据迁移方法见
[Render + Neon 部署指南](./docs/deployment-render-neon.md)。

## 参与贡献

提交代码前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。
