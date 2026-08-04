# `@repo/ui`

Telegram Links 的私有共享 UI 包，供 Web 和 Admin 直接引用。当前基于 React 19、
Base UI、shadcn/ui `base-nova`、Tailwind CSS 4、CSS Variables、Geist 可变字体和
Lucide Icons。

## 内容

- `src/components/**`：Button、Dialog、Sheet、Sidebar、Table、Toast 等共享
  primitives，以及 `LinkFavicon`、`ModeToggle` 等仓库通用组件。
- `src/hooks/**`：共享 React Hooks。
- `src/lib/**`：className、分页等通用工具。
- `src/styles/globals.css`：字体、颜色 tokens、暗色主题和 Tailwind 全局样式。

包通过以下子路径导出，不提供根入口：

```tsx
import { Button } from '@repo/ui/components/button';
import { useIsMobile } from '@repo/ui/hooks/use-mobile';
import { cn } from '@repo/ui/lib/utils';
import '@repo/ui/globals.css';
```

## 添加组件

Web 与 Admin 的 `components.json` 都把 `ui` alias 指向本包。从仓库根目录任选一个
应用作为 shadcn 配置入口：

```bash
pnpm dlx shadcn@4.16.0 add <component> -c apps/web
pnpm dlx shadcn@4.16.0 add <component> -c apps/admin
```

共享 primitives 应落在 `packages/ui/src/components`；只服务单个应用的业务 block
保留在对应应用中。新增文件后确认 `package.json` 的通配符 exports 能覆盖导入路径。

## 验证

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui lint:fix
pnpm --filter @repo/ui check-types
```
