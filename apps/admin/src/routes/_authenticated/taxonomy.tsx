import {
  adminTaxonomyControllerCreateMutation,
  adminTaxonomyControllerRemoveMutation,
  adminTaxonomyControllerRenameMutation,
} from '@/api/@tanstack/react-query.gen';
import { TaxonomyView } from '@/components/features/taxonomy-view';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import {
  invalidateLinks,
  invalidateTaxonomy,
  type TaxonomyKind,
} from '@/lib/admin-api';
import { taxonomySearchSchema } from '@/lib/admin-search';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authenticated/taxonomy')({
  validateSearch: taxonomySearchSchema,
  component: TaxonomyRoute,
});

function TaxonomyRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const taxonomyQuery = useTaxonomy();
  const createMutation = useMutation(adminTaxonomyControllerCreateMutation());
  const renameMutation = useMutation(adminTaxonomyControllerRenameMutation());
  const removeMutation = useMutation(adminTaxonomyControllerRemoveMutation());
  const isPending =
    createMutation.isPending ||
    renameMutation.isPending ||
    removeMutation.isPending;
  useApiErrorToast(taxonomyQuery.error);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.get('kind') === 'projects') {
      void navigate({ replace: true, search: { kind: 'categories' } });
    }
  }, [navigate]);

  async function create(kind: TaxonomyKind, name: string) {
    await createMutation.mutateAsync({ body: { name }, path: { kind } });
    await invalidateTaxonomy(queryClient);
  }

  async function rename(kind: TaxonomyKind, id: string, name: string) {
    await renameMutation.mutateAsync({
      body: { name },
      path: { id, kind },
    });
    await Promise.all([
      invalidateTaxonomy(queryClient),
      invalidateLinks(queryClient),
    ]);
  }

  async function remove(kind: TaxonomyKind, id: string) {
    await removeMutation.mutateAsync({ path: { id, kind } });
    await invalidateTaxonomy(queryClient);
  }

  if (taxonomyQuery.isPending) {
    return <PageSkeleton rows={5} />;
  }

  return (
    <TaxonomyView
      isPending={isPending}
      kind={search.kind}
      taxonomy={taxonomyQuery.taxonomy}
      onKindChange={(kind) => {
        void navigate({ search: { kind } });
      }}
      onAdd={create}
      onRename={rename}
      onDelete={remove}
    />
  );
}
