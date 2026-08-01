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
        view: 'favorites',
      }),
    ).toEqual({ page: 1, sort: 'newest', view: 'all' });
  });

  it('trims search text and accepts UUID filters', () => {
    const categoryId = '00000000-0000-4000-8000-000000000201';
    expect(
      webLinksSearchSchema.parse({ categoryId, page: '3', q: '  Atlas  ' }),
    ).toEqual({
      categoryId,
      page: 3,
      q: 'Atlas',
      sort: 'newest',
      view: 'all',
    });
  });

  it('round-trips list and detail URL state', () => {
    const value = webLinksSearchSchema.parse({
      categoryId: '00000000-0000-4000-8000-000000000201',
      linkId: '00000000-0000-4000-8000-000000000601',
      page: 2,
      sort: 'title',
      view: 'pending',
    });
    const parsed = defaultParseSearch(defaultStringifySearch(value));
    expect(webLinksSearchSchema.parse(parsed)).toEqual(value);
  });
});
