import type { LinkResponseDto } from '@/api/types.gen';
import { Badge } from '@repo/ui/components/badge';

export function CategoryBadge({
  category,
}: {
  category: LinkResponseDto['category'];
}) {
  return <Badge variant="outline">{category?.name ?? '未分类'}</Badge>;
}
