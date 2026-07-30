import {
  formatDateTime,
  formatDuration,
  scanStageLabels,
} from '@/lib/admin-store';
import type { ScanJobMock } from '@/types/admin';
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
  jobs: ScanJobMock[];
  runningJob: ScanJobMock | null;
}

function JobCard({ job }: { job: ScanJobMock }) {
  const isFailed = job.status === 'failed';
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            {job.status === 'running' ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : isFailed ? (
              <AlertTriangle className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {job.status === 'running' ? '扫描进行中' : `任务 ${job.id}`}
          </CardTitle>
          <Badge
            variant={
              job.status === 'running'
                ? 'secondary'
                : isFailed
                  ? 'destructive'
                  : 'outline'
            }
          >
            {job.status === 'running' ? '运行中' : isFailed ? '失败' : '成功'}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {job.chatNames.join('、')} · {job.rangeLabel}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {job.status === 'running' ? (
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
            <dd className="mt-1">{formatDuration(job.durationMs)}</dd>
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
    <section aria-labelledby="scan-jobs-heading" className="space-y-4">
      <div>
        <h2 id="scan-jobs-heading" className="font-heading text-lg font-medium">
          扫描任务
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          查看演示扫描的来源范围、处理数量和去重结果。
        </p>
      </div>
      {runningJob ? <JobCard job={runningJob} /> : null}
      {jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <ScanSearch className="size-8 text-muted-foreground" />
          <h3 className="mt-4 font-heading font-medium">还没有扫描记录</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            从页面右上角开始第一次模拟扫描。
          </p>
        </div>
      )}
    </section>
  );
}
