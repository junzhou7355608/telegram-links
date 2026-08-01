import { AdminSidebar } from '@/components/features/admin-sidebar';
import { ScanDialog } from '@/components/features/scan-dialog';
import { WorkspaceHeader } from '@/components/features/workspace-header';
import { useDemoAdmin } from '@/components/providers/demo-admin-context';
import { formatDateTime, scanStageLabels } from '@/lib/admin-store';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Progress } from '@repo/ui/components/progress';
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar';
import { Outlet } from '@tanstack/react-router';
import {
  Activity,
  CheckCircle2,
  Database,
  Inbox,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

function loadSidebarDefaultOpen() {
  const sidebarCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  return sidebarCookie?.split('=')[1] !== 'false';
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Inbox;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto]">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function AdminShell() {
  const [sidebarDefaultOpen] = useState(loadSidebarDefaultOpen);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const { runningJob, startScan, store } = useDemoAdmin();
  const pendingCount = store.links.filter(
    (link) => link.status === 'pending',
  ).length;
  const today = new Date().toLocaleDateString('en-CA');
  const todayCount = store.links.filter(
    (link) => new Date(link.createdAt).toLocaleDateString('en-CA') === today,
  ).length;
  const latestJob = store.jobs[0];
  const latestScanLabel = runningJob
    ? runningJob.stage
      ? scanStageLabels[runningJob.stage]
      : '准备中'
    : latestJob
      ? `${latestJob.status === 'succeeded' ? '成功' : '已结束'} · ${formatDateTime(latestJob.startedAt)}`
      : '尚未扫描';

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{ '--sidebar-width': '15rem' } as CSSProperties}
    >
      <AdminSidebar
        pendingCount={pendingCount}
        totalCount={store.links.length}
        jobCount={store.jobs.length}
      />
      <SidebarInset className="min-w-0">
        <WorkspaceHeader
          latestScanLabel={latestScanLabel}
          running={runningJob !== null}
          onStartScan={() => setScanDialogOpen(true)}
        />

        <main
          id="admin-content"
          className="scroll-mt-16 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          <div className="mx-auto grid min-w-0 max-w-[1480px] gap-5 [&>*]:min-w-0">
            <section
              aria-label="工作台概览"
              className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            >
              <StatCard
                label="待整理"
                value={pendingCount}
                detail="需要补充项目与用途"
                icon={Inbox}
              />
              <StatCard
                label="今日新增"
                value={todayCount}
                detail="来自本地扫描演示"
                icon={Plus}
              />
              <StatCard
                label="链接总数"
                value={store.links.length}
                detail={`${store.links.length - pendingCount} 条已整理`}
                icon={Database}
              />
              <StatCard
                label="最近扫描"
                value={runningJob ? `${runningJob.progress}%` : '已结束'}
                detail={
                  runningJob
                    ? runningJob.stage
                      ? scanStageLabels[runningJob.stage]
                      : '准备中'
                    : latestJob
                      ? formatDateTime(latestJob.startedAt)
                      : '尚无记录'
                }
                icon={runningJob ? Activity : CheckCircle2}
              />
            </section>

            {runningJob ? (
              <Alert>
                <LoaderCircle className="animate-spin" />
                <AlertTitle>
                  正在
                  {runningJob.stage
                    ? scanStageLabels[runningJob.stage]
                    : '准备扫描'}
                </AlertTitle>
                <AlertDescription className="flex items-center gap-3">
                  <Progress
                    value={runningJob.progress}
                    className="max-w-md flex-1"
                  />
                  <span className="font-mono text-xs">
                    {runningJob.progress}%
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}

            <Outlet />
          </div>
        </main>
      </SidebarInset>

      <ScanDialog
        open={scanDialogOpen}
        taxonomy={store.taxonomy}
        onOpenChange={setScanDialogOpen}
        onSubmit={startScan}
      />
    </SidebarProvider>
  );
}
