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
