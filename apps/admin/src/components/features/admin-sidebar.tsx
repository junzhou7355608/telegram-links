import { Badge } from '@repo/ui/components/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@repo/ui/components/sidebar';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  CheckCircle2,
  Database,
  Inbox,
  Link2,
  MessageCircleMore,
  ScanSearch,
  Tags,
} from 'lucide-react';

interface AdminSidebarProps {
  jobCount: number;
  pendingCount: number;
  serverState: 'connecting' | 'online' | 'offline';
  totalCount: number;
}

const navigation = [
  {
    count: 'pending' as const,
    icon: Inbox,
    label: '待整理',
    search: { page: 1, sort: 'newest' as const },
    to: '/links/pending' as const,
  },
  {
    count: 'total' as const,
    icon: Database,
    label: '全部链接',
    search: { page: 1, sort: 'newest' as const },
    to: '/links' as const,
  },
  {
    count: 'jobs' as const,
    icon: ScanSearch,
    label: '扫描任务',
    search: { page: 1 },
    to: '/sync-jobs' as const,
  },
  {
    count: null,
    icon: Tags,
    label: '基础资料',
    search: { kind: 'categories' as const },
    to: '/taxonomy' as const,
  },
  {
    count: null,
    icon: MessageCircleMore,
    label: 'Telegram',
    search: { page: 1 },
    to: '/telegram' as const,
  },
];

export function AdminSidebar({
  pendingCount,
  serverState,
  totalCount,
  jobCount,
}: AdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const counts = { jobs: jobCount, pending: pendingCount, total: totalCount };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-3">
        <div className="flex h-12 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Link2 className="size-4" aria-hidden="true" />
          </span>
          <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">个人链接库</span>
            <span className="truncate text-xs text-muted-foreground">
              管理后台
            </span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作台</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon;
                const count = item.count ? counts[item.count] : undefined;
                const active =
                  item.to === '/links'
                    ? pathname === '/links' || pathname === '/links/'
                    : pathname === item.to;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={active}
                      render={
                        <Link
                          to={item.to}
                          search={item.search}
                          onClick={() => {
                            if (isMobile) {
                              setOpenMobile(false);
                            }
                          }}
                        />
                      }
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    {count !== undefined ? (
                      <SidebarMenuBadge>{count}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">
              {serverState === 'online'
                ? 'Server 已连接'
                : serverState === 'connecting'
                  ? '正在连接 Server'
                  : 'Server 连接失败'}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">
              PostgreSQL 持久化
            </p>
          </div>
          <Badge
            variant="outline"
            className="group-data-[collapsible=icon]:hidden"
          >
            {serverState === 'online'
              ? '在线'
              : serverState === 'connecting'
                ? '连接中'
                : '离线'}
          </Badge>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
