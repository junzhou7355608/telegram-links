# `@repo/eslint-config`

Telegram Links monorepo 的共享 ESLint flat config。

可用导出：

- `@repo/eslint-config/base`：通用 JavaScript、TypeScript 和 Turbo 规则。
- `@repo/eslint-config/react-internal`：共享 React 组件库。
- `@repo/eslint-config/react-vite`：React + Vite 应用。
- `@repo/eslint-config/nest`：NestJS 服务端。
- `@repo/eslint-config/next-js`：保留的 Next.js 配置。

配置仅供本仓库 workspace 使用。

```bash
pnpm --filter @repo/eslint-config lint
pnpm --filter @repo/eslint-config lint:fix
```
