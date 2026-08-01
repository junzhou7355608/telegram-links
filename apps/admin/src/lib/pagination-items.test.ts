import { describe, expect, it } from 'vitest';
import { paginationItems } from '@repo/ui/lib/pagination-items';

describe('paginationItems', () => {
  it('returns every page when the result is short', () => {
    expect(paginationItems(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the beginning and end visible near the first page', () => {
    expect(paginationItems(1, 75)).toEqual([1, 2, 3, 4, 5, 'end-ellipsis', 75]);
  });

  it('keeps the current page centered in the middle', () => {
    expect(paginationItems(38, 75)).toEqual([
      1,
      'start-ellipsis',
      37,
      38,
      39,
      'end-ellipsis',
      75,
    ]);
  });

  it('keeps the final pages visible near the end', () => {
    expect(paginationItems(75, 75)).toEqual([
      1,
      'start-ellipsis',
      71,
      72,
      73,
      74,
      75,
    ]);
  });
});
