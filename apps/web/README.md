# Web

Telegram Links 的公开只读查询端，基于 React 19、Vite 8、TanStack Router、TanStack
Query、Axios、Hey API、Jotai、Tailwind CSS 4 和共享 shadcn/ui 构建。

## 功能与数据范围

`/` 会跳转到 `/links`。页面通过 `/api/web/v1` 读取 Server 中未归档且已整理的真实
链接；新增、整理、归档和 Telegram 管理操作集中在 Admin。

当前支持：

- 搜索标题、URL、域名、用途、分类、标签、来源消息和聊天名称。
- 查看全部或最近 7 天新增的链接。
- 按分类和一个或多个标签筛选；多个标签按“匹配任意标签”处理。
- 按最近添加、最早添加或标题排序，并进行分页。
- 复制链接，查看完整来源消息、发送者、聊天、时间和 Telegram 消息地址（可用时）。
- 将搜索、筛选、分页和详情 `linkId` 保存在 URL search params 中，支持刷新、分享和
  浏览器前进后退。

Server 不可用时页面显示错误状态，数据库没有匹配数据时显示真实空态。

## 开发

先按根目录 [README](../../README.md) 准备数据库和 Server，然后运行：

```bash
pnpm --filter web dev
pnpm --filter web test
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web build
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`。生产环境可在
`apps/web/.env` 中配置 `VITE_API_BASE_URL`；留空时使用同源地址。

## 项目结构

```text
src/
├── api/                    # Hey API 生成物
├── components/
│   ├── features/           # 链接列表、筛选、详情和侧边栏
│   ├── layouts/            # Web 应用壳
│   └── providers/          # Theme、Query 等 Provider
├── hooks/                  # 应用 Hooks
├── lib/                    # Router、QueryClient、请求封装和 search schema
├── routes/                 # TanStack Router 文件路由
└── styles/                 # 应用全局样式入口
```

共享 shadcn/ui primitives 维护在 `packages/ui`，Web 专属业务组件保留在本应用。

## API 客户端

Server 的 Swagger 是 DTO 唯一来源。先启动启用了 Swagger 的 Server，再同步只包含
`/api/web/v1/**` 的契约并生成客户端：

```bash
pnpm db:up
pnpm --filter server dev
pnpm --filter web sync:api
pnpm --filter web gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，也可以显式传入地址：

```bash
pnpm --filter web sync:api -- http://127.0.0.1:3000/docs-json
```

`openapi.json`、`src/api/**` 和 `src/routeTree.gen.ts` 均为生成物，不要手工编辑。
Web 与 Admin 的 OpenAPI 快照和客户端必须保持路径隔离。
