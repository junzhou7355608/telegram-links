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
  SidebarSeparator,
  useSidebar,
} from '@repo/ui/components/sidebar';
import {
  CheckCircle2,
  Database,
  Inbox,
  ListFilter,
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
  const { setOpenMobile } = useSidebar();
  const countByView: Record<AdminView, number | undefined> = {
    pending: pendingCount,
    all: totalCount,
    jobs: jobCount,
    taxonomy: undefined,
  };

  function selectView(view: AdminView) {
    onViewChange(view);
    setOpenMobile(false);
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg border bg-background">
            <ListFilter className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-sm font-medium">Telegram Links</p>
            <p className="truncate text-xs text-muted-foreground">
              链接整理后台
            </p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
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
      <SidebarFooter>
        <div className="flex items-start gap-2 rounded-lg border bg-background p-3">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs font-medium">本地演示模式</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              扫描和编辑结果仅保存在此浏览器。
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
