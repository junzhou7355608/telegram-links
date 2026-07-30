# Server

Telegram Links 的 NestJS 服务端。

计划负责 Telegram 消息检索、链接识别、默认标签和分类处理、数据持久化，以及为 Web 和 Admin 提供接口。当前仅包含基础示例接口。

默认监听端口为 `3000`，可通过 `PORT` 环境变量覆盖。

## 命令

从仓库根目录执行：

```bash
pnpm --filter server start:dev
pnpm --filter server build
pnpm --filter server lint
pnpm --filter server lint:fix
pnpm --filter server test
pnpm --filter server test:e2e
```

项目级安装、格式化和贡献约定见根目录 [README](../../README.md)。
