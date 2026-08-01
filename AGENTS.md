# AGENTS.md

本文件描述自动化编码代理在本仓库中的协作约定。

## 仓库结构

- `apps/web`：个人链接工作台，负责链接搜索、筛选、展示和复制。
- `apps/admin`：管理端，负责触发检索和维护标签、分类。
- `apps/server`：NestJS 服务端，负责接口、检索流程和持久化。
- `packages/ui`：共享 React 组件。
- `packages/eslint-config`：共享 ESLint flat config。
- `packages/typescript-config`：共享 TypeScript 配置。

Web 当前提供本地演示原型，不要把其浏览器状态或假数据描述为真实服务端数据。
Admin 使用 `/api/admin/v1` 真实接口，Server 负责 Telegram 检索和 PostgreSQL
持久化；不要在 Admin 中重新加入演示数据回退或业务 DTO。

## 工作方式

- 使用 pnpm 管理依赖，使用 Turbo 执行跨 workspace 任务。
- 优先从仓库根目录执行命令；单个包使用 `pnpm --filter <name> <script>`。
- 保持 `web`、`admin`、`server` 的职责边界，跨应用复用代码放到 `packages/*`。
- Web 和 Admin 的 UI primitives 统一放在 `packages/ui`，通过
  `pnpm dlx shadcn@4.16.0 add <component> -c apps/web` 或
  `-c apps/admin` 添加。
- 应用专属 shadcn blocks 从对应应用运行 CLI，不要复制共享 primitives。
- Web 和 Admin 页面路由统一放在各自的 `src/routes/**`；跨组件客户端状态使用
  Jotai，服务端异步状态使用 TanStack Query，不要把请求结果复制到 atoms。
- Web 和 Admin 请求复用各自 `src/lib/request.ts`、QueryClient 和 Hey API
  生成客户端，不要在业务组件中创建新的 Axios 或 QueryClient 实例。
- Server OpenAPI 是业务 DTO 的唯一来源；Web/Admin 不得复制链接、同步、Telegram
  或基础资料接口类型，只在组件附近定义表单草稿、选择集合和路由 search 类型。
- 文档使用简体中文，代码标识、命令和 API 名称保留英文。
- 遵循现有 TypeScript、ESLint 和 Prettier 配置，不在业务文件中绕过规则。
- 不编辑 `node_modules`、`dist`、`build`、`coverage`、`.turbo` 等生成内容。
- 不编辑或提交 `apps/server/src/generated/prisma`，通过 Prisma 命令重新生成。
- 不手工编辑 Web/Admin 的 `src/api/**`、`src/routeTree.gen.ts` 或
  `openapi.json`。分别通过 `gen:api`、TanStack Router 插件和 `sync:api`
  更新。
- Web OpenAPI 快照只允许包含 `/api/web/v1/**`，Admin 快照只允许包含
  `/api/admin/v1/**`，不得在两个客户端之间混用接口。
- 不提交密钥、Telegram 凭据、数据库连接串或本地 `.env*` 文件。

## 验证

提交改动前至少运行：

```bash
pnpm lint
pnpm format:check
pnpm build
```

涉及服务端时，再运行：

```bash
pnpm --filter server test
pnpm --filter server test:e2e
```

Server E2E 测试前先运行 `pnpm db:up`，结束后使用 `pnpm db:down` 保留数据卷。

自动修复命令为 `pnpm lint:fix` 和 `pnpm format`；`pnpm lint`、`pnpm format:check` 必须保持只读。
