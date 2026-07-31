import { Badge } from '@repo/ui/components/badge';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { ModeToggle } from '@/components/features/mode-toggle';

interface WorkspaceHeaderProps {
  totalCount: number;
  pendingCount: number;
}

export function WorkspaceHeader({
  totalCount,
  pendingCount,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
      <SidebarTrigger aria-label="切换侧栏" />
      <div className="ml-1 min-w-0 flex-1">
        <p className="truncate text-sm font-medium">个人链接库</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          从 Telegram 聊天中收集的项目链接
        </p>
      </div>
      <div className="hidden items-center gap-2 sm:flex">
        <Badge variant="secondary">{totalCount} 条链接</Badge>
        <Badge variant="outline">{pendingCount} 条待整理</Badge>
      </div>
      <ModeToggle />
    </header>
  );
}
