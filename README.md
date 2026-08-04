# Telegram Links

一个用于收集、整理和检索个人 Telegram 聊天中网页链接的 monorepo，也支持在管理端
手动新增链接。数据统一保存到 PostgreSQL。

| 应用     | 职责                                            |
| -------- | ----------------------------------------------- |
| `web`    | 公开、只读地搜索和查看已整理链接                |
| `admin`  | 授权 Telegram、发起扫描、整理链接和维护分类标签 |
| `server` | 提供 NestJS API、执行扫描并通过 Prisma 持久化   |

## 核心规则

- Web 只展示未归档且状态为“已整理”的链接，Admin 负责管理操作。
- 扫描支持自上次同步、最近 7 天、自定义时间和全部历史，可预设分类和标签。
- 系统按小写主机名去重，每个主机名对应一条 `Link`；不同完整 URL 及其来源消息保存
  为 `LinkSource`。
- 新扫描链接以主机名作为标题并进入待整理状态；标题、合法 HTTP(S) URL 和分类齐全
  后才能标记为已整理。

## 仓库结构

```text
apps/
  admin/   React + Vite 管理端
  server/  NestJS + Prisma 服务端
  web/     React + Vite 查询端
packages/
  eslint-config/      共享 ESLint 配置
  typescript-config/  共享 TypeScript 配置
  ui/                 共享 UI、主题和工具
docs/
  deployment-render-neon.md  Render + Neon 部署指南
```

## 本地开发

需要 Node.js 20.19+、Corepack、Docker 和 Docker Compose。仓库通过
`packageManager` 固定 pnpm 11.19.0。

```bash
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
```

Admin 登录需要 bcrypt 密码哈希和 32 字节 Base64 会话密钥；Telegram 还需要应用
凭据和另一份会话加密密钥：

```bash
openssl rand -base64 32
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

完整字段说明见 [Server README](./apps/server/README.md)。填写配置后首次启动：

```bash
pnpm db:up
pnpm --filter server prisma:migrate
pnpm dev
```

`pnpm dev` 会同时启动三个应用，Vite 地址以终端输出为准。Server 默认地址：

- 健康检查：<http://localhost:3000/api/healthz>
- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- PostgreSQL：`localhost:5433`

也可以使用 `pnpm --filter <web|admin|server> dev` 单独启动应用。

## 常用命令

```bash
pnpm build           # 构建全部 workspace
pnpm lint            # ESLint 检查
pnpm lint:fix        # 自动修复 ESLint 问题
pnpm format          # Prettier 格式化
pnpm format:check    # Prettier 检查
pnpm check-types     # 类型检查
pnpm db:up           # 启动 PostgreSQL
pnpm db:down         # 停止容器并保留数据卷
pnpm db:logs         # 查看 PostgreSQL 日志
pnpm db:ps           # 查看容器状态
```

测试：

```bash
pnpm --filter web test
pnpm --filter admin test
pnpm --filter server test
pnpm --filter server test:e2e
```

Server E2E 需要先运行 `pnpm db:up`。

## API 契约

Server OpenAPI 是业务 DTO 的唯一来源。Web 和 Admin 分别保存仅包含自身路径的
`openapi.json`，再用 Hey API 生成 `src/api/**`；这些文件和
`src/routeTree.gen.ts` 都由工具维护。

## 部署与贡献

生产容器使用 Caddy 同时提供 Web、Admin 和 API，启动时自动执行 Prisma 迁移。部署
步骤见 [Render + Neon 部署指南](./docs/deployment-render-neon.md)。

参与开发前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。项目使用
[MIT License](./LICENSE)。
