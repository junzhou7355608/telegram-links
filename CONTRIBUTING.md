# 参与贡献

感谢你参与 Telegram Links 的开发。

## 本地开发

```bash
corepack enable
pnpm install
pnpm dev
```

服务端需要单独启动：

```bash
pnpm --filter server start:dev
```

改动应保持应用边界清晰：

- `apps/web` 负责公开展示、搜索和复制。
- `apps/admin` 负责检索任务与链接数据维护。
- `apps/server` 负责接口、检索流程和数据持久化。
- 可复用代码放入合适的 `packages/*`。

## 提交前检查

```bash
pnpm lint
pnpm format:check
pnpm build
pnpm --filter server test
pnpm --filter server test:e2e
```

需要自动修复时，使用：

```bash
pnpm lint:fix
pnpm format
```

## 提交信息

使用 Conventional Commits，主题保持简洁，例如：

```text
feat(web): 添加链接搜索
fix(server): 修复重复链接写入
docs: 更新开发说明
chore: 调整工程配置
```

一个提交只处理一个清晰目的，不要混入无关格式化或重构。
