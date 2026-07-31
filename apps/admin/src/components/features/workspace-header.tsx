import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { SidebarTrigger } from '@repo/ui/components/sidebar';
import { LoaderCircle, Play } from 'lucide-react';
import { ModeToggle } from '@/components/features/mode-toggle';

interface WorkspaceHeaderProps {
  latestScanLabel: string;
  running: boolean;
  onStartScan: () => void;
}

export function WorkspaceHeader({
  latestScanLabel,
  running,
  onStartScan,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-3 sm:px-4">
      <SidebarTrigger aria-label="切换侧栏" />
      <div className="ml-1 min-w-0 flex-1">
        <p className="truncate text-sm font-medium">管理后台</p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          最近扫描：{latestScanLabel}
        </p>
      </div>
      {running ? (
        <Badge variant="secondary" className="hidden sm:inline-flex">
          <LoaderCircle className="animate-spin" />
          扫描中
        </Badge>
      ) : null}
      <Button type="button" disabled={running} onClick={onStartScan}>
        {running ? <LoaderCircle className="animate-spin" /> : <Play />}
        <span className="hidden sm:inline">开始扫描</span>
        <span className="sm:hidden">扫描</span>
      </Button>
      <ModeToggle />
    </header>
  );
}
