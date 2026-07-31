import type { PropsWithChildren } from 'react';

import { Toaster } from '@repo/ui/components/sonner';

export function AppLayout({ children }: PropsWithChildren) {
  return (
    <>
      <a
        href="#link-results"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-foreground px-3 py-2 text-sm text-background transition-transform focus:translate-y-0"
      >
        跳到链接列表
      </a>
      {children}
      <Toaster position="top-center" />
    </>
  );
}
