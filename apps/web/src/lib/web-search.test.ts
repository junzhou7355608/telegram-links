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
        environment: 'staging',
        linkId: 'invalid',
        page: '-2',
        sort: 'invalid',
        view: 'favorites',
      }),
    ).toEqual({ page: 1, sort: 'newest', view: 'all' });
  });

  it('trims search text and accepts UUID filters', () => {
    const projectId = '00000000-0000-4000-8000-000000000101';
    expect(
      webLinksSearchSchema.parse({ page: '3', projectId, q: '  Atlas  ' }),
    ).toEqual({
      page: 3,
      projectId,
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
