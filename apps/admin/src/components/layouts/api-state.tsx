import { Skeleton } from '@repo/ui/components/skeleton';

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-label="正在加载" className="grid gap-3" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
