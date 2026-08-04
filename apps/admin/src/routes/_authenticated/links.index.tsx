import { LinksPage } from '@/components/features/links-page';
import { linksSearchSchema } from '@/lib/admin-search';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/links/')({
  validateSearch: linksSearchSchema,
  component: AllLinksRoute,
});

function AllLinksRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <LinksPage
      pendingOnly={false}
      search={search}
      onSearchChange={(updater, options) => {
        void navigate({ replace: options?.replace, search: updater });
      }}
    />
  );
}
