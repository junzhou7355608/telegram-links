import { createFileRoute } from '@tanstack/react-router';

import { AdminWorkspace } from '@/components/features/admin/admin-workspace';

export const Route = createFileRoute('/')({
  component: AdminWorkspace,
});
