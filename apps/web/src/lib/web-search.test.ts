import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';
import { webLinksSearchSchema } from './web-search';

describe('Web links search schema', () => {
  it('uses safe defaults for invalid values', () => {
    expect(
      webLinksSearchSchema.parse({
        categoryId: 'invalid',
        linkId: 'invalid',
        page: '-2',
        sort: 'invalid',
        status: 'pending',
        view: 'pending',
      }),
    ).toEqual({ page: 1, sort: 'newest', view: 'all' });
  });

  it('trims search text and accepts UUID filters', () => {
    const categoryId = '00000000-0000-4000-8000-000000000201';
    const tagId = '00000000-0000-4000-8000-000000000301';
    expect(
      webLinksSearchSchema.parse({
        categoryId,
        page: '3',
        q: '  Atlas  ',
        tagIds: tagId,
      }),
    ).toEqual({
      categoryId,
      page: 3,
      q: 'Atlas',
      sort: 'newest',
      tagIds: [tagId],
      view: 'all',
    });
  });

  it('round-trips list and detail URL state', () => {
    const value = webLinksSearchSchema.parse({
      categoryId: '00000000-0000-4000-8000-000000000201',
      linkId: '00000000-0000-4000-8000-000000000601',
      page: 2,
      sort: 'title',
      tagIds: [
        '00000000-0000-4000-8000-000000000301',
        '00000000-0000-4000-8000-000000000302',
      ],
      view: 'recent',
    });
    const parsed = defaultParseSearch(defaultStringifySearch(value));
    expect(webLinksSearchSchema.parse(parsed)).toEqual(value);
  });
});
