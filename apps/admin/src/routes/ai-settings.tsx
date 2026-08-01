import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/ai-settings')({
  beforeLoad: () => {
    throw redirect({
      to: '/links/pending',
      search: { page: 1, sort: 'newest' },
    });
  },
});
