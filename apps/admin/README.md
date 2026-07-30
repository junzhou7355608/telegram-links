# Admin

Telegram Links 的管理端，基于 React、Vite 和共享的 shadcn/ui 组件。

当前是一个使用本地演示数据的响应式管理原型，默认进入待整理队列，支持：

- 搜索、筛选、分页、单条编辑和批量整理。
- 模拟 Telegram 消息扫描、链接提取、URL 去重和任务进度。
- 管理项目、分类和标签，并同步更新已有链接。
- 浅色、深色和跟随系统主题。

链接、任务记录和基础资料使用版本化 `localStorage` 保存。扫描过程不会请求
Telegram 或 Server，真实检索和数据库持久化尚未接入。

## 命令

从仓库根目录执行：

```bash
pnpm --filter admin dev
pnpm --filter admin build
pnpm --filter admin lint
pnpm --filter admin lint:fix
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。

共享 UI primitives 使用
`pnpm dlx shadcn@4.16.0 add <component> -c apps/admin` 添加；Admin
专属 blocks 保留在本应用中。
