import { adminTaxonomyControllerListQueryKey } from '@/api/@tanstack/react-query.gen';
import type { TaxonomyItemResponseDto } from '@/api/types.gen';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  createLinksQuery,
  optimisticallyOrderTaxonomy,
  orderTaxonomyItems,
  rollbackTaxonomyOrder,
} from './admin-api';

const taxonomyItems: TaxonomyItemResponseDto[] = [
  { id: 'category-a', name: 'A', referenceCount: 1 },
  { id: 'category-b', name: 'B', referenceCount: 2 },
  { id: 'category-c', name: 'C', referenceCount: 3 },
];

describe('createLinksQuery', () => {
  it('maps URL state to the paginated Admin API query', () => {
    expect(
      createLinksQuery(
        {
          categoryId: '00000000-0000-4000-8000-000000000101',
          includeArchived: true,
          page: 3,
          q: 'Atlas',
          sort: 'title',
          status: 'organized',
          tagIds: ['00000000-0000-4000-8000-000000000201'],
        },
        false,
      ),
    ).toMatchObject({
      categoryId: '00000000-0000-4000-8000-000000000101',
      includeArchived: true,
      page: 3,
      pageSize: 8,
      q: 'Atlas',
      sort: 'title',
      status: 'organized',
      tagIds: ['00000000-0000-4000-8000-000000000201'],
      view: 'all',
    });
  });

  it('forces the pending view and ignores a conflicting status', () => {
    expect(
      createLinksQuery({ page: 1, sort: 'newest', status: 'organized' }, true),
    ).toMatchObject({ status: undefined, view: 'pending' });
  });
});

describe('taxonomy ordering', () => {
  it('moves items according to the submitted id array without mutating input', () => {
    expect(
      orderTaxonomyItems(taxonomyItems, [
        'category-c',
        'category-a',
        'category-b',
      ]).map((item) => item.id),
    ).toEqual(['category-c', 'category-a', 'category-b']);
    expect(taxonomyItems.map((item) => item.id)).toEqual([
      'category-a',
      'category-b',
      'category-c',
    ]);
  });

  it('optimistically updates and can roll back the taxonomy query cache', async () => {
    const queryClient = new QueryClient();
    const queryKey = adminTaxonomyControllerListQueryKey({
      path: { kind: 'categories' },
    });
    queryClient.setQueryData(queryKey, taxonomyItems);

    const snapshot = await optimisticallyOrderTaxonomy(
      queryClient,
      'categories',
      ['category-b', 'category-c', 'category-a'],
    );
    expect(
      queryClient
        .getQueryData<TaxonomyItemResponseDto[]>(queryKey)
        ?.map((item) => item.id),
    ).toEqual(['category-b', 'category-c', 'category-a']);

    rollbackTaxonomyOrder(queryClient, snapshot);
    expect(queryClient.getQueryData(queryKey)).toEqual(taxonomyItems);
  });
});
