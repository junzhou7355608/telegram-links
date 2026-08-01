import { adminTaxonomyControllerListOptions } from '@/api/@tanstack/react-query.gen';
import type { TaxonomyCollections } from '@/lib/admin-api';
import { useQuery } from '@tanstack/react-query';

export function useTaxonomy() {
  const categories = useQuery(
    adminTaxonomyControllerListOptions({ path: { kind: 'categories' } }),
  );
  const tags = useQuery(
    adminTaxonomyControllerListOptions({ path: { kind: 'tags' } }),
  );

  const taxonomy: TaxonomyCollections = {
    categories: categories.data ?? [],
    tags: tags.data ?? [],
  };
  const error = categories.error ?? tags.error;

  return {
    error,
    isPending: categories.isPending || tags.isPending,
    refetch: () => Promise.all([categories.refetch(), tags.refetch()]),
    taxonomy,
  };
}
