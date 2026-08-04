# Admin

Telegram Links 的管理端，基于 React 19、Vite 8、TanStack Router、TanStack Query、
Axios、Hey API、Jotai、Tailwind CSS 4 和共享 shadcn/ui 构建。业务 DTO 统一来自
Server OpenAPI 生成客户端。

## 功能

- 使用 Server 签发的 HttpOnly Cookie 登录和退出管理端。
- 授权或注销一个 Telegram 个人账号，刷新、搜索和按类型筛选聊天。
- 选择多个可用聊天和同步范围发起扫描，可预设分类与标签，并轮询任务进度。
- 查看待整理或全部链接，按关键字、状态、分类、标签、来源聊天和归档状态筛选。
- 手动新增链接；编辑标题、URL、用途、状态、分类和标签；单条或批量整理与归档；
  恢复已归档链接。
- 新增、重命名和删除未被引用的分类或标签，并通过鼠标、触摸或键盘拖拽调整顺序。

Telegram 验证码和 2FA 密码只保存在当前页面的内存状态中，不写入 Jotai、
localStorage、数据库或日志。退出 Admin 时会清除 QueryClient，避免保留管理数据。

## 路由

| 路由             | 用途                         |
| ---------------- | ---------------------------- |
| `/login`         | Admin 用户名和密码登录       |
| `/links/pending` | 待整理队列                   |
| `/links`         | 全部链接、手动新增和归档数据 |
| `/sync-jobs`     | 同步任务及各聊天扫描结果     |
| `/taxonomy`      | 分类和标签维护与排序         |
| `/telegram`      | Telegram 账号和聊天列表      |

`/` 会跳转到 `/links/pending`。未登录访问业务路由时会跳转到 `/login`，登录后返回
安全的原始目标。列表筛选、分页和详情 `linkId` 使用 TanStack Router search params
保存。

开发时路由位于 Vite 地址下；生产构建的 base 为 `/admin/`，因此完整入口是
`/admin/login`、`/admin/links` 等。

## 项目结构

```text
src/
├── api/                    # Hey API 生成物
├── assets/icons/           # Admin 专属静态图标资源
├── components/
│   ├── features/           # 管理后台业务组件
│   ├── forms/              # 可复用业务表单
│   ├── layouts/            # 应用布局
│   ├── modals/             # 应用级弹窗
│   └── providers/          # Theme、Query、Jotai 等 Provider
├── hooks/                  # 可复用 React Hooks
├── lib/                    # Router、QueryClient、请求封装和 search schema
├── routes/                 # TanStack Router 文件路由
├── stores/                 # 临时客户端状态，如 Telegram challenge
└── styles/                 # 应用全局样式入口
```

`routeTree.gen.ts` 由 TanStack Router 自动生成，`api/**` 由 Hey API 根据
`openapi.json` 生成，两类文件都不要手工编辑。

## 开发

先按根目录 [README](../../README.md) 准备数据库和 Server，然后运行：

```bash
pnpm --filter admin dev
pnpm --filter admin test
pnpm --filter admin check-types
pnpm --filter admin lint
pnpm --filter admin build
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`，因此本地 Server 无需启用
CORS。生产环境可在 `apps/admin/.env` 中配置 `VITE_API_BASE_URL`；留空时使用同源
请求。

## API 客户端

先启动启用了 Swagger 的 Server，再同步只包含 `/api/admin/v1/**` 的契约并生成
客户端：

```bash
pnpm db:up
pnpm --filter server dev
pnpm --filter admin sync:api
pnpm --filter admin gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，也可以显式传入地址：

```bash
pnpm --filter admin sync:api -- http://127.0.0.1:3000/docs-json
```

共享 UI primitives 使用
`pnpm dlx shadcn@4.16.0 add <component> -c apps/admin` 添加；Admin 专属 blocks 保留
在本应用中。
