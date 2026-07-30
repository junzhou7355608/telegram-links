# AGENTS.md

本文件描述自动化编码代理在本仓库中的协作约定。

## 仓库结构

- `apps/web`：个人链接工作台，负责链接搜索、筛选、展示和复制。
- `apps/admin`：管理端，负责触发检索和维护标签、分类。
- `apps/server`：NestJS 服务端，负责接口、检索流程和持久化。
- `packages/ui`：共享 React 组件。
- `packages/eslint-config`：共享 ESLint flat config。
- `packages/typescript-config`：共享 TypeScript 配置。

业务功能仍在规划中。不要把尚未实现的 Telegram 检索、数据库或标签能力描述为已完成。

## 工作方式

- 使用 pnpm 管理依赖，使用 Turbo 执行跨 workspace 任务。
- 优先从仓库根目录执行命令；单个包使用 `pnpm --filter <name> <script>`。
- 保持 `web`、`admin`、`server` 的职责边界，跨应用复用代码放到 `packages/*`。
- Web 和 Admin 的 UI primitives 统一放在 `packages/ui`，通过 `pnpm dlx shadcn@4.16.0 add <component> -c apps/web` 添加。
- 应用专属 shadcn blocks 从对应应用运行 CLI，不要复制共享 primitives。
- 文档使用简体中文，代码标识、命令和 API 名称保留英文。
- 遵循现有 TypeScript、ESLint 和 Prettier 配置，不在业务文件中绕过规则。
- 不编辑 `node_modules`、`dist`、`build`、`coverage`、`.turbo` 等生成内容。
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

自动修复命令为 `pnpm lint:fix` 和 `pnpm format`；`pnpm lint`、`pnpm format:check` 必须保持只读。
