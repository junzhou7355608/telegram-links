import { createRootRoute } from '@tanstack/react-router';

import { WebShell } from '@/components/layouts/web-shell';
import { AppProviders } from '@/components/providers/app-providers';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  return (
    <AppProviders>
      <WebShell />
    </AppProviders>
  );
}

function NotFoundComponent() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">404</h1>
        <p className="text-sm text-muted-foreground">没有找到这个页面</p>
      </div>
    </main>
  );
}
