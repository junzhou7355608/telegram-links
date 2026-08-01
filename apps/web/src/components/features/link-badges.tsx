import type { LinkResponseDto } from '@/api/types.gen';
import { environmentLabels, statusLabels } from '@/lib/link-display';
import { Badge } from '@repo/ui/components/badge';

const environmentVariants = {
  production: 'default',
  test: 'secondary',
  development: 'outline',
  unknown: 'ghost',
} as const;

export function EnvironmentBadge({
  environment,
}: {
  environment: LinkResponseDto['environment'];
}) {
  return (
    <Badge variant={environmentVariants[environment]}>
      {environmentLabels[environment]}
    </Badge>
  );
}

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
