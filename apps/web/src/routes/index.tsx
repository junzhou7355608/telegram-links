import { createFileRoute } from '@tanstack/react-router';

import { LinkWorkspace } from '@/components/features/link-workspace';

export const Route = createFileRoute('/')({
  component: LinkWorkspace,
});
