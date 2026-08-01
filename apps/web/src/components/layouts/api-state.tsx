import { getWebApiError } from '@/lib/api-error';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-label="正在加载" className="grid gap-3" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function LinkCardGridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div
      aria-label="正在加载链接"
      className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
      role="status"
    >
      {Array.from({ length: cards }, (_, index) => (
        <div
          key={index}
          className="flex h-64 flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
          <div className="mt-auto flex justify-end gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ApiErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  const apiError = getWebApiError(error);
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>无法读取链接数据</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{apiError.message}</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw />
          重试
        </Button>
      </AlertDescription>
    </Alert>
  );
}
