# Web

Telegram Links 的公开只读查询端，基于 React 19、Vite 8、TanStack Router、TanStack
Query、Axios、Hey API、Jotai、Tailwind CSS 4 和共享 shadcn/ui 构建。

`/` 会跳转到 `/links`。页面通过 `/api/web/v1` 读取未归档且已整理的链接，支持：

- 搜索标题、URL、用途、分类、标签和来源。
- 查看全部或最近 7 天新增的链接。
- 按分类和标签筛选，按添加时间或标题排序并分页。
- 复制链接和查看 Telegram 来源详情。
- 通过 URL search params 保存筛选、分页和详情状态。

新增、整理、归档和 Telegram 管理操作集中在 Admin。

## 开发

先按根目录 [README](../../README.md) 准备数据库和 Server：

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web build
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`。生产环境可通过
`VITE_API_BASE_URL` 指定 Server；留空时使用同源地址。

业务组件位于 `src/components/features`，应用壳位于 `src/components/layouts`，
路由、请求和 search schema 位于 `src/routes` 与 `src/lib`。共享 UI 维护在
`packages/ui`。

## API 客户端

启动启用了 Swagger 的 Server 后同步并生成 Web 客户端：

```bash
pnpm --filter web sync:api
pnpm --filter web gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，也可在命令末尾传入其他地址。
`openapi.json`、`src/api/**` 和 `src/routeTree.gen.ts` 都由工具维护。Web OpenAPI
只包含 `/api/web/v1/**`。
