import { Provider } from 'jotai';
import type { PropsWithChildren } from 'react';

import { DemoAdminProvider } from '@/components/providers/demo-admin-provider';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { TooltipProvider } from '@repo/ui/components/tooltip';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ReactQueryProvider>
        <Provider>
          <TooltipProvider>
            <DemoAdminProvider>{children}</DemoAdminProvider>
          </TooltipProvider>
        </Provider>
      </ReactQueryProvider>
    </ThemeProvider>
  );
}
