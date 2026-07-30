# Web

Telegram Links 的公开展示端，基于 React、Vite 和共享的 shadcn/ui 组件。

计划提供链接展示、搜索和一键复制功能。当前仍是基础脚手架，业务页面尚未实现。

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
