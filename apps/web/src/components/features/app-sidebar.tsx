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
  Clock3,
  FolderClosed,
  Inbox,
  Layers3,
  LibraryBig,
  Link2,
  Star,
} from 'lucide-react';
import {
  categoryLabels,
  isRecentLink,
  linkCategories,
  type LinkCategory,
  type TelegramLinkMock,
} from '@/data/links';

export type LinkView = 'all' | 'recent' | 'favorites' | 'pending';

interface AppSidebarProps {
  links: readonly TelegramLinkMock[];
  favoriteIds: ReadonlySet<string>;
  selectedView: LinkView;
  selectedProject: string;
  selectedCategory: LinkCategory | 'all';
  onSelectView: (view: LinkView) => void;
  onSelectProject: (project: string) => void;
  onSelectCategory: (category: LinkCategory) => void;
}

export function AppSidebar({
  links,
  favoriteIds,
  selectedView,
  selectedProject,
  selectedCategory,
  onSelectView,
  onSelectProject,
  onSelectCategory,
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();
  const projects = Array.from(
    new Set(
      links
        .map((link) => link.project)
        .filter((project): project is string => Boolean(project)),
    ),
  ).sort((left, right) => left.localeCompare(right, 'zh-CN'));
  const pendingCount = links.filter((link) => link.status === 'pending').length;
  const unassignedCount = links.filter((link) => link.project === null).length;
  const recentCount = links.filter(isRecentLink).length;

  const viewItems = [
    {
      value: 'all' as const,
      label: '全部链接',
      icon: LibraryBig,
      count: links.length,
    },
    {
      value: 'recent' as const,
      label: '最近添加',
      icon: Clock3,
      count: recentCount,
    },
    {
      value: 'favorites' as const,
      label: '我的收藏',
      icon: Star,
      count: favoriteIds.size,
    },
    {
      value: 'pending' as const,
      label: '待整理',
      icon: Inbox,
      count: pendingCount,
    },
  ];

  function finishSelection(action: () => void) {
    action();
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
                        selectedView === item.value &&
                        selectedProject === 'all' &&
                        selectedCategory === 'all'
                      }
                      onClick={() =>
                        finishSelection(() => onSelectView(item.value))
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
          <SidebarGroupLabel>项目</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projects.map((project) => {
                const count = links.filter(
                  (link) => link.project === project,
                ).length;

                return (
                  <SidebarMenuItem key={project}>
                    <SidebarMenuButton
                      tooltip={project}
                      isActive={selectedProject === project}
                      onClick={() =>
                        finishSelection(() => onSelectProject(project))
                      }
                    >
                      <FolderClosed />
                      <span>{project}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="未分配项目"
                  isActive={selectedProject === 'unassigned'}
                  onClick={() =>
                    finishSelection(() => onSelectProject('unassigned'))
                  }
                >
                  <Inbox />
                  <span>未分配项目</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>{unassignedCount}</SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>分类</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {linkCategories.map((category) => {
                const count = links.filter(
                  (link) => link.category === category,
                ).length;

                return (
                  <SidebarMenuItem key={category}>
                    <SidebarMenuButton
                      tooltip={categoryLabels[category]}
                      isActive={selectedCategory === category}
                      onClick={() =>
                        finishSelection(() => onSelectCategory(category))
                      }
                    >
                      <Layers3 />
                      <span>{categoryLabels[category]}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{count}</SidebarMenuBadge>
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
            <Inbox className="size-3.5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-medium">演示数据</p>
            <p className="truncate text-[11px] text-muted-foreground">
              最近同步于今天 09:42
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
