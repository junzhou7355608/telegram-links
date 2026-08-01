import { adminSyncControllerListOptions } from '@/api/@tanstack/react-query.gen';
import { LinkPagination } from '@/components/features/link-pagination';
import { ScanJobsView } from '@/components/features/scan-jobs-view';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { ADMIN_JOB_PAGE_SIZE } from '@/lib/admin-api';
import { isActiveSyncJob } from '@/lib/admin-display';
import { syncJobsSearchSchema } from '@/lib/admin-search';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/sync-jobs')({
  validateSearch: syncJobsSearchSchema,
  component: SyncJobsRoute,
});

function SyncJobsRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const jobsQuery = useQuery({
    ...adminSyncControllerListOptions({
      query: { page: search.page, pageSize: ADMIN_JOB_PAGE_SIZE },
    }),
    placeholderData: keepPreviousData,
    refetchInterval: (query) =>
      query.state.data?.items.some(isActiveSyncJob) ? 2_000 : false,
  });
  useApiErrorToast(jobsQuery.error);
  const pagination = jobsQuery.data?.pagination;

  useEffect(() => {
    if (pagination && search.page > pagination.totalPages) {
      void navigate({
        replace: true,
        search: { page: pagination.totalPages },
      });
    }
  }, [navigate, pagination, search.page]);

  if (jobsQuery.isPending) {
    return <PageSkeleton rows={5} />;
  }

  return (
    <>
      <ScanJobsView jobs={jobsQuery.data?.items ?? []} />
      {jobsQuery.data ? (
        <LinkPagination
          page={jobsQuery.data.pagination.page}
          pageCount={jobsQuery.data.pagination.totalPages}
          total={jobsQuery.data.pagination.total}
          onPageChange={(page) => void navigate({ search: { page } })}
        />
      ) : null}
    </>
  );
}
