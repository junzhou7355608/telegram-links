# Admin

Telegram Links 的管理端，基于 React 19、Vite 8、TanStack Router、TanStack Query、
Axios、Hey API、Jotai、Tailwind CSS 4 和共享 shadcn/ui 构建。

## 功能与路由

- `/login`：Admin 登录。
- `/links/pending`：整理扫描得到的链接。
- `/links`：查看全部链接，支持手动新增、批量编辑、归档与恢复。
- `/sync-jobs`：查看同步任务和各聊天结果。
- `/taxonomy`：维护并排序分类和标签。
- `/telegram`：授权 Telegram，刷新和筛选聊天。

`/` 会跳转到 `/links/pending`。未登录访问业务路由时跳转到 `/login`。筛选、分页和
详情状态保存在 URL search params 中。生产构建的 base 为 `/admin/`。

Telegram 验证码和 2FA 密码仅保存在当前页面内存中。退出 Admin 时会清除
QueryClient 中的管理数据。

## 开发

先按根目录 [README](../../README.md) 准备数据库和 Server：

```bash
pnpm --filter admin dev
pnpm --filter admin test
pnpm --filter admin check-types
pnpm --filter admin lint
pnpm --filter admin build
```

开发服务器将 `/api` 代理到 `http://127.0.0.1:3000`。生产环境可通过
`VITE_API_BASE_URL` 指定 Server；留空时使用同源地址。

业务组件位于 `src/components/features`，路由位于 `src/routes`，临时客户端状态位于
`src/stores`。共享 UI 维护在 `packages/ui`。

## API 客户端

启动启用了 Swagger 的 Server 后同步并生成 Admin 客户端：

```bash
pnpm --filter admin sync:api
pnpm --filter admin gen:api
```

`sync:api` 默认读取 `http://127.0.0.1:3000/docs-json`，也可在命令末尾传入其他地址。
`openapi.json`、`src/api/**` 和 `src/routeTree.gen.ts` 都由工具维护。Admin OpenAPI
只包含 `/api/admin/v1/**`。

共享 primitives 使用
`pnpm dlx shadcn@4.16.0 add <component> -c apps/admin` 添加；应用专属 blocks 保留在
Admin。
