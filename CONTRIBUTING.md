# 参与贡献

本地安装、环境变量和首次数据库迁移见根目录 [README](./README.md)。`pnpm dev` 会
同时启动 Web、Admin 和 Server；单独开发时使用：

```bash
pnpm --filter <web|admin|server> dev
```

## 代码边界

- `apps/web` 负责公开、只读的链接查询和来源查看。
- `apps/admin` 负责 Telegram 授权与扫描、链接整理和基础资料维护。
- `apps/server` 负责 API、Admin 会话、GramJS、同步流程和 PostgreSQL 持久化。
- 跨前端 UI 放在 `packages/ui`，其他复用配置放在合适的 `packages/*`。
- 服务端异步状态使用 TanStack Query，跨组件临时客户端状态使用 Jotai。

## 生成文件与数据库

Server OpenAPI 是业务 DTO 的唯一来源。以下内容由工具维护：

- `apps/{web,admin}/openapi.json`
- `apps/{web,admin}/src/api/**`
- `apps/{web,admin}/src/routeTree.gen.ts`
- `apps/server/src/generated/prisma/**`

接口变更后，在启用了 Swagger 的 Server 运行期间同步对应客户端：

```bash
pnpm --filter web sync:api
pnpm --filter web gen:api
pnpm --filter admin sync:api
pnpm --filter admin gen:api
```

Web 快照只包含 `/api/web/v1/**`，Admin 快照只包含 `/api/admin/v1/**`。

Prisma schema 变更后运行：

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
```

提交 schema 变更时同时提交相应迁移。

## 检查与测试

```bash
pnpm lint
pnpm format:check
pnpm check-types
pnpm build
```

根据改动范围补充 Web、Admin 或 Server 测试。Server E2E 使用
`telegram_links_test` schema，运行前先执行 `pnpm db:up`。自动测试必须替换
Telegram Gateway。

自动修复命令为 `pnpm lint:fix` 和 `pnpm format`。

## 提交

使用 `type(scope): subject` 形式的 Conventional Commits，`scope` 必填，主题使用
简体中文，例如：

```text
feat(web): 添加链接搜索
fix(server): 修复重复链接写入
docs(repo): 更新开发说明
```

一个提交只处理一个目的。不要提交 `.env*`、API Key、Telegram 凭据或数据库连接串。
