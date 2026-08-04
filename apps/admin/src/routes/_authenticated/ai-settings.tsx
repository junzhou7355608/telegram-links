import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/ai-settings')({
  beforeLoad: () => {
    throw redirect({
      to: '/links/pending',
      search: { page: 1, sort: 'newest' },
    });
  },
});
