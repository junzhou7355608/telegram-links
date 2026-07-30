# Admin

Telegram Links 的管理端，基于 React、Vite 和共享的 shadcn/ui 组件。

计划用于触发 Telegram 消息检索、识别链接，以及维护默认标签、分类和后续编辑。当前仍是基础脚手架。

## 命令

从仓库根目录执行：

```bash
pnpm --filter admin dev
pnpm --filter admin build
pnpm --filter admin lint
pnpm --filter admin lint:fix
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。

共享 UI primitives 统一通过 Web workspace 添加；Admin 专属 blocks 使用 `pnpm dlx shadcn@4.16.0 add <block> -c apps/admin`。
