import { TaxonomyView } from '@/components/features/taxonomy-view';
import { useDemoAdmin } from '@/components/providers/demo-admin-context';
import { taxonomySearchSchema } from '@/lib/admin-search';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/taxonomy')({
  validateSearch: taxonomySearchSchema,
  component: TaxonomyRoute,
});

function TaxonomyRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const {
    addTaxonomy,
    deleteTaxonomy,
    renameTaxonomy,
    store: { taxonomy },
  } = useDemoAdmin();
  return (
    <TaxonomyView
      kind={search.kind}
      taxonomy={taxonomy}
      onKindChange={(kind) => {
        void navigate({ search: { kind } });
      }}
      onAdd={addTaxonomy}
      onRename={renameTaxonomy}
      onDelete={deleteTaxonomy}
    />
  );
}
