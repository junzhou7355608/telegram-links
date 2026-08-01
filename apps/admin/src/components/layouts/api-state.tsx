import { getAdminApiError } from '@/lib/api-error';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ApiErrorState({
  error,
  onRetry,
  title = '无法读取服务端数据',
}: {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}) {
  const apiError = getAdminApiError(error);
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{apiError.message}</span>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            <RefreshCw />
            重试
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-label="正在加载" className="grid gap-3" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
