import { Toaster } from '@repo/ui/components/sonner';
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar';
import { Outlet } from '@tanstack/react-router';
import { useState, type CSSProperties } from 'react';
import { AppSidebar } from '@/components/features/app-sidebar';
import { WorkspaceHeader } from '@/components/features/workspace-header';
import { webOverviewFixture } from '@/data/links';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

function loadSidebarDefaultOpen() {
  const sidebarCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  return sidebarCookie?.split('=')[1] !== 'false';
}

export function WebShell() {
  const [sidebarDefaultOpen] = useState(loadSidebarDefaultOpen);

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{ '--sidebar-width': '15rem' } as CSSProperties}
    >
      <a
        href="#link-results"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-lg bg-foreground px-3 py-2 text-sm text-background transition-transform focus:translate-y-0"
      >
        跳到链接列表
      </a>
      <AppSidebar overview={webOverviewFixture} />
      <SidebarInset className="min-w-0">
        <WorkspaceHeader overview={webOverviewFixture} />
        <Outlet />
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  );
}
