# Admin

Telegram Links 的管理端，基于 React、Vite、TanStack Router、TanStack
Query、Axios、Hey API、Jotai 和共享 shadcn/ui 构建。

当前页面已对接 Server，支持 Telegram 授权、真实扫描、链接整理、任务
记录和基础资料维护。业务 DTO 统一来自 Hey API 生成客户端。

## 路由

- `/login`：Admin 用户名和密码登录
- `/links/pending`：待整理队列
- `/links`：全部链接
- `/sync-jobs`：同步任务
- `/taxonomy`：分类和标签
- `/telegram`：Telegram 账号与聊天来源边界

筛选、分页和详情 `linkId` 使用 TanStack Router search params 保存，刷新与前进后退
可恢复。`/` 自动进入受保护的工作台，未登录访问业务路由时跳转到 `/login`。

## 项目结构

```text
src/
├── api/                    # Hey API 生成物
├── assets/icons/           # Admin 专属静态图标资源
├── components/
│   ├── features/           # 管理后台业务组件
│   ├── forms/              # 可复用业务表单
│   ├── icons/custom/       # Admin 专属 React 图标
│   ├── layouts/            # 应用布局
│   ├── modals/             # 应用级弹窗
│   └── providers/          # Theme、Query、Jotai 等 Provider
├── constants/              # 应用常量
├── hooks/                  # 可复用 React Hooks
├── lib/                    # Router、QueryClient、Axios 与通用工具
├── routes/                 # TanStack Router 文件路由
├── stores/                 # 临时客户端状态，如 Telegram challenge
├── styles/                 # 全局样式
```

`routeTree.gen.ts` 由 TanStack Router 自动生成。`api/**` 由 Hey API 根据
`openapi.json` 生成，两类文件都不要手工编辑。

## API 客户端

先启动本地数据库和 Server，再同步 Admin Swagger 快照：

```bash
pnpm db:up
pnpm --filter server start:dev
pnpm --filter admin sync:api
pnpm --filter admin gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，只保留
`/api/admin/v1/**`。也可以显式传入地址：

```bash
pnpm --filter admin sync:api -- http://127.0.0.1:3000/docs-json
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`，因此 Server 无需启用
CORS。生产环境可通过 `VITE_API_BASE_URL` 指定地址；留空时使用同源请求。
生成客户端不会自动发起请求。

Admin 不提供演示数据回退。Server 不可用时显示错误状态，数据库为空时显示真实空态。
Telegram 验证码和 2FA 密码不会写入 Jotai、localStorage 或日志。
Admin 登录状态使用 Server 签发的 HttpOnly Cookie，前端只缓存会话状态；退出时会
清除 QueryClient，避免保留管理数据。

## 常用命令

```bash
pnpm --filter admin dev
pnpm --filter admin build
pnpm --filter admin check-types
pnpm --filter admin lint
pnpm --filter admin lint:fix
pnpm --filter admin sync:api
pnpm --filter admin gen:api
pnpm --filter admin test
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。共享 UI
primitives 使用 `pnpm dlx shadcn@4.16.0 add <component> -c apps/admin`
添加，Admin 专属 blocks 保留在本应用中。
