import { describe, expect, it } from 'vitest';
import {
  defaultParseSearch,
  defaultStringifySearch,
} from '@tanstack/react-router';
import {
  linksSearchSchema,
  taxonomySearchSchema,
  telegramSearchSchema,
} from './admin-search';

describe('Admin route search schemas', () => {
  it('uses stable defaults and drops invalid values', () => {
    expect(
      linksSearchSchema.parse({
        categoryId: 'invalid',
        environment: 'staging',
        page: '-2',
        sort: 'invalid',
      }),
    ).toEqual({ page: 1, sort: 'newest' });
  });

  it('parses serializable list and detail state', () => {
    const linkId = '00000000-0000-4000-8000-000000000601';
    const tagId = '00000000-0000-4000-8000-000000000301';
    expect(
      linksSearchSchema.parse({
        linkId,
        page: '3',
        q: '  Atlas  ',
        tagIds: tagId,
      }),
    ).toEqual({
      linkId,
      page: 3,
      q: 'Atlas',
      sort: 'newest',
      tagIds: [tagId],
    });
  });

  it('normalizes taxonomy and Telegram defaults', () => {
    expect(taxonomySearchSchema.parse({ kind: 'invalid' })).toEqual({
      kind: 'projects',
    });
    expect(telegramSearchSchema.parse({ page: 'nope', type: 'bot' })).toEqual({
      page: 1,
    });
  });

  it('round-trips URL state without losing arrays or detail state', () => {
    const value = linksSearchSchema.parse({
      linkId: '00000000-0000-4000-8000-000000000601',
      page: 2,
      sort: 'title',
      tagIds: [
        '00000000-0000-4000-8000-000000000301',
        '00000000-0000-4000-8000-000000000302',
      ],
    });
    const parsed = defaultParseSearch(defaultStringifySearch(value));

    expect(linksSearchSchema.parse(parsed)).toEqual(value);
  });
});
