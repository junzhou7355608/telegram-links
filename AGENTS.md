# AGENTS.md

本文件描述自动化编码代理在本仓库中的协作约定。

## 仓库边界

- `apps/web`：通过 `/api/web/v1` 提供公开只读链接工作台。
- `apps/admin`：通过 `/api/admin/v1` 管理 Telegram、扫描任务、链接和分类标签。
- `apps/server`：负责 Admin Cookie 会话、GramJS、同步流程、Prisma 和 PostgreSQL。
- `packages/ui`：共享 React UI、主题和工具。
- `packages/eslint-config`、`packages/typescript-config`：共享工程配置。

扫描提取 HTTP(S) 链接，按小写主机名去重并保存 Telegram 来源。Admin 支持手动
新增、批量整理、归档恢复和分类标签排序。

## 工作约定

- 使用 pnpm 和 Turbo；单包命令使用 `pnpm --filter <name> <script>`。
- 保持 Web、Admin、Server 的职责边界，跨应用复用代码放在 `packages/*`。
- 共享 UI 使用 `pnpm dlx shadcn@4.16.0 add <component> -c apps/web` 或
  `-c apps/admin` 添加；应用专属 blocks 保留在对应应用。
- 页面路由放在 `src/routes/**`。服务端异步状态使用 TanStack Query，跨组件临时
  客户端状态使用 Jotai。
- Web 和 Admin 复用各自的请求实例、QueryClient 和 Hey API 客户端。
- Server OpenAPI 是业务 DTO 的唯一来源；前端只定义表单草稿、选择集合和路由 search
  等客户端类型。
- 文档使用简体中文，代码标识、命令和 API 名称保留英文。
- 遵循现有 TypeScript、ESLint 和 Prettier 配置。

## 生成与安全

- 不编辑 `node_modules`、`dist`、`build`、`coverage`、`.turbo` 等生成目录。
- Prisma Client 通过命令生成，不编辑或提交 `apps/server/src/generated/prisma`。
- 不手工编辑 Web/Admin 的 `openapi.json`、`src/api/**` 或
  `src/routeTree.gen.ts`。
- Web OpenAPI 只包含 `/api/web/v1/**`，Admin OpenAPI 只包含
  `/api/admin/v1/**`。
- 不提交 Telegram 凭据、Admin 密钥、数据库连接串或本地 `.env*`。
- 自动测试必须替换 Telegram Gateway。

## 数据约束

- `Link.domain` 全局唯一。
- Web 只读取未归档且状态为 `ORGANIZED` 的链接。
- 标记 `ORGANIZED` 前必须有标题、合法 HTTP(S) URL 和分类。
- Telegram 验证码、2FA 密码和 Admin 明文密码不得持久化或写入日志。
- 同一时间只运行一个同步任务；Server 重启后遗留任务标记为 `INTERRUPTED`。

## 验证

```bash
pnpm lint
pnpm format:check
pnpm check-types
pnpm build
```

服务端改动还需运行 `pnpm --filter server test` 和
`pnpm --filter server test:e2e`；E2E 前先启动本地数据库。
