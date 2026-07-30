import { Badge } from '@repo/ui/components/badge';
import {
  categoryLabels,
  environmentLabels,
  statusLabels,
  type LinkCategory,
  type LinkEnvironment,
  type OrganizationStatus,
} from '@/data/links';

const environmentVariants = {
  production: 'default',
  test: 'secondary',
  development: 'outline',
  unknown: 'ghost',
} as const;

interface EnvironmentBadgeProps {
  environment: LinkEnvironment;
}

export function EnvironmentBadge({ environment }: EnvironmentBadgeProps) {
  return (
    <Badge variant={environmentVariants[environment]}>
      {environmentLabels[environment]}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: OrganizationStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge variant={status === 'pending' ? 'outline' : 'secondary'}>
      {statusLabels[status]}
    </Badge>
  );
}

interface CategoryBadgeProps {
  category: LinkCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return <Badge variant="outline">{categoryLabels[category]}</Badge>;
}
