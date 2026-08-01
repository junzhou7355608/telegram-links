import { LinksPage } from '@/components/features/links-page';
import { linksSearchSchema } from '@/lib/admin-search';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/links/pending')({
  validateSearch: linksSearchSchema,
  component: PendingLinksRoute,
});

function PendingLinksRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LinksPage
      pendingOnly
      search={search}
      onSearchChange={(updater, options) => {
        void navigate({ replace: options?.replace, search: updater });
      }}
    />
  );
}
