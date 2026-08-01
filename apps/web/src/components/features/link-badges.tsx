import type { LinkResponseDto } from '@/api/types.gen';
import { statusLabels } from '@/lib/link-display';
import { Badge } from '@repo/ui/components/badge';

export function StatusBadge({ status }: { status: LinkResponseDto['status'] }) {
  return (
    <Badge variant={status === 'pending' ? 'outline' : 'secondary'}>
      {statusLabels[status]}
    </Badge>
  );
}

export function CategoryBadge({
  category,
}: {
  category: LinkResponseDto['category'];
}) {
  return <Badge variant="outline">{category?.name ?? '未分类'}</Badge>;
}
