# Web

Telegram Links 的个人链接工作台，基于 React、Vite、TanStack Router、
TanStack Query、Axios、Hey API、Jotai 和共享 shadcn/ui 构建。

当前使用 16 条本地假数据展示从 Telegram
聊天中提取的普通网页链接，支持搜索、项目/分类/环境筛选、排序、分页、收藏、复制和来源详情。

页面适配手机、平板和 PC，并支持浅色、深色和跟随系统主题。收藏与主题偏好保存在浏览器本地。

当前交互仅作用于演示数据，不会请求 Server。真实消息扫描、标签编辑和数据持久化尚未接入。

## 项目结构

```text
src/
├── api/                    # Hey API 生成物
├── assets/icons/           # Web 专属静态图标资源
├── components/
│   ├── features/           # 个人链接工作台业务组件
│   ├── forms/              # 可复用业务表单
│   ├── icons/custom/       # Web 专属 React 图标
│   ├── layouts/            # 应用布局
│   ├── modals/             # 应用级弹窗
│   └── providers/          # Theme、Query、Jotai 等 Provider
├── constants/              # 应用常量
├── data/                   # 本地演示数据
├── hooks/                  # 可复用 React Hooks
├── lib/                    # Router、QueryClient、Axios 与通用工具
├── routes/                 # TanStack Router 文件路由
├── stores/                 # Jotai atoms
└── styles/                 # 全局样式
```

`routeTree.gen.ts` 由 TanStack Router 自动生成。`api/**` 由 Hey API 根据
`openapi.json` 生成，两类文件都不要手工编辑。

## API 客户端

先启动本地数据库和 Server，再同步 Web Swagger 快照：

```bash
pnpm db:up
pnpm --filter server start:dev
pnpm --filter web sync:api
pnpm --filter web gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，只保留
`/api/web/v1/**`。也可以显式传入地址：

```bash
pnpm --filter web sync:api -- http://127.0.0.1:3000/docs-json
```

客户端使用 `VITE_API_BASE_URL` 作为可选基础地址，示例见 `.env.example`。
生成客户端不会自动发起请求。

## 常用命令

从仓库根目录执行：

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web check-types
pnpm --filter web lint
pnpm --filter web lint:fix
pnpm --filter web sync:api
pnpm --filter web gen:api
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。

共享 UI primitives 使用 `pnpm dlx shadcn@4.16.0 add <component> -c apps/web` 添加；Web 专属 blocks 保留在本应用中。
