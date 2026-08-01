import { createFileRoute } from '@tanstack/react-router';
import { LinksPage } from '@/components/features/links-page';
import { webLinksSearchSchema } from '@/lib/web-search';

export const Route = createFileRoute('/links')({
  validateSearch: webLinksSearchSchema,
  component: LinksRoute,
});

function LinksRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <LinksPage
      search={search}
      onSearchChange={(updater, options) => {
        void navigate({
          replace: options?.replace,
          search: updater,
        });
      }}
    />
  );
}
