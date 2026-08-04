# `@repo/typescript-config`

Telegram Links monorepo 的私有共享 TypeScript 配置包。配置文件通过 workspace 路径
继承，不发布到 npm。

## 配置

| 文件                 | 用途                                                              |
| -------------------- | ----------------------------------------------------------------- |
| `base.json`          | ES2022、NodeNext、严格模式、声明文件和 `noUncheckedIndexedAccess` |
| `react-library.json` | 在 `base.json` 上启用 `react-jsx`，供 `packages/ui` 使用          |
| `nextjs.json`        | 在 `base.json` 上启用 Bundler resolution 和 Next 插件             |

示例：

```json
{
  "extends": "@repo/typescript-config/react-library.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src"]
}
```

Web、Admin 和 Server 目前还包含各自的应用级 `tsconfig`；本包主要承载可跨 workspace
复用的基线。修改共享基线后至少运行：

```bash
pnpm check-types
pnpm build
```
