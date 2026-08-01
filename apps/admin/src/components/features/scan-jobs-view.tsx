import type { SyncJobResponseDto } from '@/api/types.gen';
import {
  formatDateTime,
  formatDuration,
  scanStageLabels,
} from '@/lib/admin-store';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from '@repo/ui/components/progress';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  ScanSearch,
} from 'lucide-react';

interface ScanJobsViewProps {
  jobs: SyncJobResponseDto[];
  runningJob: SyncJobResponseDto | null;
}

const statusLabels: Record<SyncJobResponseDto['status'], string> = {
  failed: '失败',
  interrupted: '已中断',
  partiallySucceeded: '部分成功',
  queued: '排队中',
  running: '运行中',
  succeeded: '成功',
};

const rangeLabels: Record<SyncJobResponseDto['rangeMode'], string> = {
  allHistory: '全部历史消息',
  custom: '自定义时间',
  last7Days: '最近 7 天',
  sinceLast: '从上次扫描',
};

function JobCard({ job }: { job: SyncJobResponseDto }) {
  const isRunning = job.status === 'running' || job.status === 'queued';
  const isFailed = job.status === 'failed' || job.status === 'interrupted';
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {isRunning ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : isFailed ? (
              <AlertTriangle className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {isRunning ? '扫描进行中' : `任务 ${job.id.slice(0, 8)}`}
          </CardTitle>
          <Badge
            variant={
              isRunning ? 'secondary' : isFailed ? 'destructive' : 'outline'
            }
          >
            {statusLabels[job.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {job.chats.map((chat) => chat.chatTitle).join('、') || '全部启用聊天'}{' '}
          · {rangeLabels[job.rangeMode]}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRunning ? (
          <Progress value={job.progress}>
            <ProgressLabel>
              {job.stage ? scanStageLabels[job.stage] : '准备中'}
            </ProgressLabel>
            <ProgressValue />
          </Progress>
        ) : null}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <dt className="text-xs text-muted-foreground">开始时间</dt>
            <dd className="mt-1">{formatDateTime(job.startedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">消息数</dt>
            <dd className="mt-1 font-mono">{job.messageCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">提取链接</dt>
            <dd className="mt-1 font-mono">{job.foundCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">新增</dt>
            <dd className="mt-1 font-mono">{job.newCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">重复</dt>
            <dd className="mt-1 font-mono">{job.duplicateCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">耗时</dt>
            <dd className="mt-1">
              {formatDuration(job.startedAt, job.finishedAt)}
            </dd>
          </div>
        </dl>
        {job.error ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>扫描未完成</AlertTitle>
            <AlertDescription>{job.error}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ScanJobsView({ jobs, runningJob }: ScanJobsViewProps) {
  return (
    <section aria-labelledby="scan-jobs-heading" className="grid gap-5">
      <div>
        <h2
          id="scan-jobs-heading"
          className="text-xl font-semibold tracking-tight sm:text-2xl"
        >
          扫描任务
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          查看演示扫描的来源范围、处理数量和去重结果。
        </p>
      </div>
      {runningJob ? <JobCard job={runningJob} /> : null}
      {jobs.length > 0 ? (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <ScanSearch className="size-5" aria-hidden="true" />
          </span>
          <h3 className="mt-4 font-medium">还没有扫描记录</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            从页面右上角开始第一次模拟扫描。
          </p>
        </div>
      )}
    </section>
  );
}
