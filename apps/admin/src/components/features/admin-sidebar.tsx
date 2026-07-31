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
import {
  CheckCircle2,
  Database,
  Inbox,
  Link2,
  ScanSearch,
  Tags,
} from 'lucide-react';
import type { AdminView } from '@/types/admin';

interface AdminSidebarProps {
  activeView: AdminView;
  pendingCount: number;
  totalCount: number;
  jobCount: number;
  onViewChange: (view: AdminView) => void;
}

const navigation = [
  {
    value: 'pending' as const,
    label: '待整理',
    icon: Inbox,
  },
  {
    value: 'all' as const,
    label: '全部链接',
    icon: Database,
  },
  {
    value: 'jobs' as const,
    label: '扫描任务',
    icon: ScanSearch,
  },
  {
    value: 'taxonomy' as const,
    label: '基础资料',
    icon: Tags,
  },
];

export function AdminSidebar({
  activeView,
  pendingCount,
  totalCount,
  jobCount,
  onViewChange,
}: AdminSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const countByView: Record<AdminView, number | undefined> = {
    pending: pendingCount,
    all: totalCount,
    jobs: jobCount,
    taxonomy: undefined,
  };

  function selectView(view: AdminView) {
    onViewChange(view);
    if (isMobile) {
      setOpenMobile(false);
    }
  }

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
                const count = countByView[item.value];
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      type="button"
                      tooltip={item.label}
                      isActive={activeView === item.value}
                      onClick={() => selectView(item.value)}
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
            <p className="truncate text-xs font-medium">本地演示</p>
            <p className="truncate text-[11px] text-muted-foreground">
              仅保存在当前浏览器
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
