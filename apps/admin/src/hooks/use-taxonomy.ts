import { adminTaxonomyControllerListOptions } from '@/api/@tanstack/react-query.gen';
import type { TaxonomyCollections } from '@/lib/admin-api';
import { useQuery } from '@tanstack/react-query';

export function useTaxonomy() {
  const projects = useQuery(
    adminTaxonomyControllerListOptions({ path: { kind: 'projects' } }),
  );
  const categories = useQuery(
    adminTaxonomyControllerListOptions({ path: { kind: 'categories' } }),
  );
  const tags = useQuery(
    adminTaxonomyControllerListOptions({ path: { kind: 'tags' } }),
  );

  const taxonomy: TaxonomyCollections = {
    categories: categories.data ?? [],
    projects: projects.data ?? [],
    tags: tags.data ?? [],
  };
  const error = projects.error ?? categories.error ?? tags.error;

  return {
    error,
    isPending: projects.isPending || categories.isPending || tags.isPending,
    refetch: () =>
      Promise.all([projects.refetch(), categories.refetch(), tags.refetch()]),
    taxonomy,
  };
}
