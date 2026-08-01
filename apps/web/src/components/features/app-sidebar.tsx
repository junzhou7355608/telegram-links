import type { WebOverviewResponseDto } from '@/api/types.gen';
import { webLinksSearchSchema } from '@/lib/web-search';
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
  Clock3,
  Inbox,
  Layers3,
  LibraryBig,
  Link2,
} from 'lucide-react';

interface AppSidebarProps {
  overview: WebOverviewResponseDto;
}

export function AppSidebar({ overview }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const location = useRouterState({
    select: (state) => state.location,
  });
  const search = webLinksSearchSchema.parse(location.search);
  const viewItems = [
    {
      value: 'all' as const,
      label: '全部链接',
      icon: LibraryBig,
      count: overview.counts.total,
    },
    {
      value: 'recent' as const,
      label: '最近添加',
      icon: Clock3,
      count: overview.counts.recent,
    },
    {
      value: 'pending' as const,
      label: '待整理',
      icon: Inbox,
      count: overview.counts.pending,
    },
  ];
  const closeMobile = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
              Telegram Links
            </span>
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作区</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {viewItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={
                        location.pathname === '/links' &&
                        search.view === item.value &&
                        !search.categoryId
                      }
                      render={
                        <Link
                          to="/links"
                          search={{
                            page: 1,
                            sort: 'newest',
                            view: item.value,
                          }}
                          onClick={closeMobile}
                        />
                      }
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>分类</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overview.categories.map((category) => (
                <SidebarMenuItem key={category.id}>
                  <SidebarMenuButton
                    tooltip={category.name}
                    isActive={search.categoryId === category.id}
                    render={
                      <Link
                        to="/links"
                        search={{
                          categoryId: category.id,
                          page: 1,
                          sort: 'newest',
                          view: 'all',
                        }}
                        onClick={closeMobile}
                      />
                    }
                  >
                    <Layers3 />
                    <span>{category.name}</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{category.count}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <div className="flex items-center gap-2 rounded-lg border border-sidebar-border p-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:p-0">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent">
            <Inbox className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">本地演示</p>
            <p className="truncate text-[11px] text-muted-foreground">
              当前未连接 Server
            </p>
          </div>
          <Badge
            variant="outline"
            className="group-data-[collapsible=icon]:hidden"
          >
            本地
          </Badge>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
