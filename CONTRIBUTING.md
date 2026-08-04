# 参与贡献

感谢你参与 Telegram Links 的开发。

## 准备开发环境

仓库要求 Node.js 20.19+、Corepack、Docker 和 Docker Compose。首次开发先执行：

```bash
corepack enable
pnpm install
cp apps/server/.env.example apps/server/.env
pnpm db:up
pnpm --filter server prisma:migrate
pnpm dev
```

Admin 登录和 Telegram 授权所需的环境变量见
[Server README](./apps/server/README.md)。`pnpm dev` 已通过 Turbo 同时启动 Web、
Admin 和 Server，不需要再启动一份 Server。单独开发某个 workspace 时使用：

```bash
pnpm --filter <web|admin|server> dev
```

## 代码边界

- `apps/web` 负责公开、只读的链接展示、搜索、筛选和来源查看。
- `apps/admin` 负责 Telegram 授权与扫描、链接整理、归档和基础资料维护。
- `apps/server` 负责 API、Admin 会话、Telegram/GramJS、同步流程和 PostgreSQL
  持久化。
- 跨前端复用的 React primitives、主题和通用 UI 工具放在 `packages/ui`；其他跨应用
  配置放在合适的 `packages/*`。
- Web 与 Admin 的服务端异步状态使用 TanStack Query，跨组件临时客户端状态使用
  Jotai；不要把请求结果复制到 atoms。

## 生成文件

Server OpenAPI 是业务 DTO 的唯一来源，不要在 Web 或 Admin 复制接口类型。以下文件
由工具维护，不要手工编辑：

- `apps/{web,admin}/openapi.json`
- `apps/{web,admin}/src/api/**`
- `apps/{web,admin}/src/routeTree.gen.ts`
- `apps/server/src/generated/prisma/**`

修改服务端接口后，在启用 Swagger 的 Server 运行期间分别同步所需客户端：

```bash
pnpm --filter web sync:api
pnpm --filter web gen:api
pnpm --filter admin sync:api
pnpm --filter admin gen:api
```

Web 快照只能包含 `/api/web/v1/**`，Admin 快照只能包含 `/api/admin/v1/**`。

## 数据库变更

修改 `apps/server/prisma/schema.prisma` 后，使用 Prisma 命令生成客户端和迁移，不要
编辑 `src/generated/prisma`：

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
```

提交数据库变更时应同时提交相应的 `prisma/migrations/**`。

## 检查与测试

提交前至少运行：

```bash
pnpm lint
pnpm format:check
pnpm check-types
pnpm build
```

根据改动范围补充测试：

```bash
pnpm --filter web test
pnpm --filter admin test
pnpm --filter server test
pnpm --filter server test:e2e
```

Server E2E 使用本地 PostgreSQL 的 `telegram_links_test` schema；先运行
`pnpm db:up`，结束后可运行 `pnpm db:down` 停止容器并保留数据卷。自动测试必须替换
Telegram Gateway，不得连接真实 Telegram。

需要自动修复时使用 `pnpm lint:fix` 和 `pnpm format`；`pnpm lint` 与
`pnpm format:check` 必须保持只读。

## 提交信息

使用 `type(scope): subject` 形式的 Conventional Commits，`scope` 必填，主题使用
简体中文并保持单一目的，例如：

```text
feat(web): 添加链接搜索
fix(server): 修复重复链接写入
docs(repo): 更新开发说明
chore(admin): 同步生成客户端
```

不要提交 `.env*`、API Key、Telegram 凭据、数据库连接串或其他敏感信息，也不要在
功能提交中混入无关格式化和重构。
