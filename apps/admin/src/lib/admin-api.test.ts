import { describe, expect, it } from 'vitest';
import { createLinksQuery } from './admin-api';

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
