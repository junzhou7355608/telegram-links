# Web

个人 Telegram 链接查询端，基于 React、Vite、TanStack Router、TanStack
Query、Axios、Hey API、Jotai、Tailwind CSS 4 和共享 shadcn/ui 构建。

当前 `/links` 使用本地演示数据，支持 URL 驱动的搜索、筛选、排序、分页、
复制与来源详情；不会请求 Server。链接收藏功能已取消，主题偏好仍保存在浏览器。

## 开发

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web check-types
pnpm --filter web build
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`；生产环境可使用
`VITE_API_BASE_URL`，未配置时使用同源地址。

## API 客户端

先启动数据库与 Server，再同步只包含 `/api/web/v1/**` 的契约：

```bash
pnpm db:up
pnpm --filter server start:dev
pnpm --filter web sync:api
pnpm --filter web gen:api
```

`openapi.json`、`src/api/**` 和 `src/routeTree.gen.ts` 均为生成物，不要手工
编辑。Web 与 Admin 的 OpenAPI 快照和客户端必须保持路径隔离。

业务组件放在 `src/components/features`，应用壳放在
`src/components/layouts`，路由 search schema、请求实例与通用工具放在
`src/lib`。shadcn/ui primitives 继续统一维护在 `packages/ui`。
