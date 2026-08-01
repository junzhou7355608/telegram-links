import { LinkPagination } from '@/components/features/link-pagination';
import { ScanJobsView } from '@/components/features/scan-jobs-view';
import { useDemoAdmin } from '@/components/providers/demo-admin-context';
import { syncJobsSearchSchema } from '@/lib/admin-search';
import { createFileRoute } from '@tanstack/react-router';

const PAGE_SIZE = 6;

export const Route = createFileRoute('/sync-jobs')({
  validateSearch: syncJobsSearchSchema,
  component: SyncJobsRoute,
});

function SyncJobsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { runningJob, store } = useDemoAdmin();
  const pageCount = Math.max(1, Math.ceil(store.jobs.length / PAGE_SIZE));
  const page = Math.min(search.page, pageCount);
  const jobs = store.jobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <ScanJobsView jobs={jobs} runningJob={runningJob} />
      <LinkPagination
        page={page}
        pageCount={pageCount}
        total={store.jobs.length}
        onPageChange={(nextPage) => {
          void navigate({ search: { page: nextPage } });
        }}
      />
    </>
  );
}
