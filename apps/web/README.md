# Web

Telegram Links 的个人链接工作台，基于 React、Vite、Tailwind CSS v4
和共享的 shadcn/ui 组件。

当前使用 16 条本地假数据展示从 Telegram
聊天中提取的普通网页链接，支持搜索、项目/分类/环境筛选、排序、分页、收藏、复制和来源详情。

页面适配手机、平板和 PC，并支持浅色、深色和跟随系统主题。收藏与主题偏好保存在浏览器本地。

当前交互仅作用于演示数据，不会请求 Server。真实消息扫描、标签编辑和数据持久化尚未接入。

## 命令

从仓库根目录执行：

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web lint:fix
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。

共享 UI primitives 使用 `pnpm dlx shadcn@4.16.0 add <component> -c apps/web` 添加；Web 专属 blocks 保留在本应用中。
