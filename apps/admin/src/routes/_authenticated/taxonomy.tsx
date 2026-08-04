import {
  adminTaxonomyControllerCreateMutation,
  adminTaxonomyControllerRemoveMutation,
  adminTaxonomyControllerRenameMutation,
  adminTaxonomyControllerReorderMutation,
} from '@/api/@tanstack/react-query.gen';
import { TaxonomyView } from '@/components/features/taxonomy-view';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import {
  invalidateLinks,
  invalidateTaxonomy,
  optimisticallyOrderTaxonomy,
  rollbackTaxonomyOrder,
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
  const reorderMutation = useMutation({
    ...adminTaxonomyControllerReorderMutation(),
    onMutate: ({ body, path }) =>
      optimisticallyOrderTaxonomy(queryClient, path.kind, body.ids),
    onError: (_error, _variables, context) => {
      if (context) {
        rollbackTaxonomyOrder(queryClient, context);
      }
    },
    onSuccess: async (items, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.queryKey, items);
      }
      await invalidateLinks(queryClient);
    },
  });
  const isPending =
    createMutation.isPending ||
    renameMutation.isPending ||
    removeMutation.isPending ||
    reorderMutation.isPending;
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
    await invalidateLinks(queryClient);
  }

  async function reorder(kind: TaxonomyKind, ids: string[]) {
    await reorderMutation.mutateAsync({ body: { ids }, path: { kind } });
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
      onReorder={reorder}
    />
  );
}
