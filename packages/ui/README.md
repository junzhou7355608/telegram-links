# `@repo/ui`

Telegram Links 的共享 shadcn/ui 组件与主题包，供 Web 和 Admin 复用。

当前使用 shadcn/ui 官方默认配置：Base UI、`base-nova`、`neutral`、CSS Variables、Lucide Icons 和 Tailwind CSS v4。

添加共享组件：

```bash
pnpm dlx shadcn@4.16.0 add <component> -c apps/web
```

导入组件和主题：

```tsx
import { Button } from '@repo/ui/components/button';
import '@repo/ui/globals.css';
```

```bash
pnpm --filter @repo/ui lint
pnpm --filter @repo/ui lint:fix
pnpm --filter @repo/ui check-types
```
