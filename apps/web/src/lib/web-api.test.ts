import { describe, expect, it } from 'vitest';
import { createWebLinksQuery, WEB_LINK_PAGE_SIZE } from './web-api';

describe('createWebLinksQuery', () => {
  it('maps serializable route state to the generated Web query', () => {
    const categoryId = '00000000-0000-4000-8000-000000000201';
    const tagIds = [
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000302',
    ];

    expect(
      createWebLinksQuery({
        categoryId,
        page: 3,
        q: 'Atlas',
        sort: 'title',
        tagIds,
        view: 'recent',
      }),
    ).toEqual({
      categoryId,
      page: 3,
      pageSize: WEB_LINK_PAGE_SIZE,
      q: 'Atlas',
      sort: 'title',
      tagIds,
      view: 'recent',
    });
  });
});
