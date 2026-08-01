import {
  adminLinksControllerOverviewOptions,
  adminSyncControllerCreateMutation,
  adminSyncControllerListOptions,
  adminTelegramControllerAccountOptions,
} from '@/api/@tanstack/react-query.gen';
import type { CreateSyncJobDto } from '@/api/types.gen';
import { AdminSidebar } from '@/components/features/admin-sidebar';
import { ScanDialog } from '@/components/features/scan-dialog';
import { WorkspaceHeader } from '@/components/features/workspace-header';
import { ApiErrorState } from '@/components/layouts/api-state';
import { invalidateSyncResults } from '@/lib/admin-api';
import {
  formatDateTime,
  isActiveSyncJob,
  scanStageLabels,
} from '@/lib/admin-display';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Progress } from '@repo/ui/components/progress';
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Outlet, useNavigate } from '@tanstack/react-router';
import {
  Activity,
  CheckCircle2,
  Database,
  Inbox,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery(adminLinksControllerOverviewOptions());
  const accountQuery = useQuery(adminTelegramControllerAccountOptions());
  const latestJobQuery = useQuery({
    ...adminSyncControllerListOptions({ query: { page: 1, pageSize: 1 } }),
    refetchInterval: (query) =>
      isActiveSyncJob(query.state.data?.items[0]) ? 2_000 : false,
  });
  const createJobMutation = useMutation(adminSyncControllerCreateMutation());
  const latestJob = latestJobQuery.data?.items[0] ?? null;
  const runningJob = isActiveSyncJob(latestJob) ? latestJob : null;
  const previousJobStatus = useRef(latestJob?.status);
  const overview = overviewQuery.data;
  const authorized = accountQuery.data?.status === 'authorized';
  const serverState =
    overviewQuery.error || accountQuery.error || latestJobQuery.error
      ? ('offline' as const)
      : overviewQuery.data && accountQuery.data && latestJobQuery.data
        ? ('online' as const)
        : ('connecting' as const);

  useEffect(() => {
    const previous = previousJobStatus.current;
    if (
      (previous === 'queued' || previous === 'running') &&
      latestJob &&
      !isActiveSyncJob(latestJob)
    ) {
      void invalidateSyncResults(queryClient);
      toast.success(
        latestJob.status === 'succeeded'
          ? '扫描任务已完成'
          : '扫描任务已结束，请查看任务详情',
      );
    }
    previousJobStatus.current = latestJob?.status;
  }, [latestJob, queryClient]);

  const latestScanLabel = runningJob
    ? runningJob.stage
      ? scanStageLabels[runningJob.stage]
      : '准备中'
    : latestJob
      ? `${latestJob.status === 'succeeded' ? '成功' : '已结束'} · ${formatDateTime(latestJob.startedAt)}`
      : '尚未扫描';

  async function startScan(configuration: CreateSyncJobDto) {
    await createJobMutation.mutateAsync({ body: configuration });
    await invalidateSyncResults(queryClient);
    toast.success('扫描任务已创建，可继续整理其他链接');
  }

  function handleScanAction() {
    if (!authorized) {
      void navigate({ to: '/telegram', search: { page: 1 } });
      return;
    }
    setScanDialogOpen(true);
  }

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{ '--sidebar-width': '15rem' } as CSSProperties}
    >
      <AdminSidebar
        pendingCount={overview?.pending ?? 0}
        totalCount={overview?.total ?? 0}
        jobCount={latestJobQuery.data?.pagination.total ?? 0}
        serverState={serverState}
      />
      <SidebarInset className="min-w-0">
        <WorkspaceHeader
          latestScanLabel={latestScanLabel}
          running={runningJob !== null || createJobMutation.isPending}
          scanDisabled={
            accountQuery.isPending ||
            Boolean(accountQuery.error) ||
            Boolean(latestJobQuery.error)
          }
          scanLabel={authorized ? '开始扫描' : '连接 Telegram'}
          onStartScan={handleScanAction}
        />

        <main
          id="admin-content"
          className="scroll-mt-16 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          <div className="mx-auto grid min-w-0 max-w-[1480px] gap-5 [&>*]:min-w-0">
            {overviewQuery.error ? (
              <ApiErrorState
                error={overviewQuery.error}
                onRetry={() => void overviewQuery.refetch()}
              />
            ) : null}

            <section
              aria-label="工作台概览"
              className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            >
              <StatCard
                label="待整理"
                value={overview?.pending ?? '—'}
                detail="需要补充项目与用途"
                icon={Inbox}
              />
              <StatCard
                label="今日新增"
                value={overview?.todayAdded ?? '—'}
                detail="来自 Telegram 扫描"
                icon={Plus}
              />
              <StatCard
                label="链接总数"
                value={overview?.total ?? '—'}
                detail={
                  overview
                    ? `${overview.total - overview.pending} 条已整理`
                    : '等待服务端数据'
                }
                icon={Database}
              />
              <StatCard
                label="最近扫描"
                value={
                  runningJob
                    ? `${runningJob.progress}%`
                    : latestJob
                      ? '已结束'
                      : '—'
                }
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

      {scanDialogOpen ? (
        <ScanDialog
          authorized={authorized}
          isPending={createJobMutation.isPending}
          open={scanDialogOpen}
          onOpenChange={setScanDialogOpen}
          onSubmit={startScan}
        />
      ) : null}
    </SidebarProvider>
  );
}
