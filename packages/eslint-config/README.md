# `@repo/eslint-config`

Telegram Links monorepo 的私有 ESLint 10 flat config 包。

## 导出

| 导入路径                             | 导出符号           | 用途                                                       |
| ------------------------------------ | ------------------ | ---------------------------------------------------------- |
| `@repo/eslint-config/base`           | `config`           | JavaScript、TypeScript、Turbo 环境变量和 Prettier 兼容规则 |
| `@repo/eslint-config/react-internal` | `config`           | 共享 React 组件与 Hooks                                    |
| `@repo/eslint-config/react-vite`     | `config`           | React + Vite 应用，包含 React Refresh 规则                 |
| `@repo/eslint-config/nest`           | `createNestConfig` | NestJS 的类型感知规则和 Node/Jest globals                  |
| `@repo/eslint-config/next-js`        | `nextJsConfig`     | Next.js 应用配置                                           |

示例：

```js
// React + Vite
import { config } from '@repo/eslint-config/react-vite';

export default config;
```

```js
// NestJS
import { createNestConfig } from '@repo/eslint-config/nest';

export default createNestConfig({ tsconfigRootDir: import.meta.dirname });
```

基础配置统一忽略 `.next`、`.turbo`、`build`、`coverage`、`dist` 和 `out` 等生成
目录，并启用 `turbo/no-undeclared-env-vars`。新增 workspace 环境变量时同步维护根目录
`turbo.json` 的 `globalEnv`。

```bash
pnpm --filter @repo/eslint-config lint
pnpm --filter @repo/eslint-config lint:fix
```
