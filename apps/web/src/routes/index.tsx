import { createFileRoute, redirect } from '@tanstack/react-router';
import { defaultWebLinksSearch } from '@/lib/web-search';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/links', search: defaultWebLinksSearch });
  },
});
