import { describe, expect, it } from 'vitest';
import { demoRecentSince, linkFixtures } from '@/data/links';
import { filterAndSortLinks } from './web-links';

describe('filterAndSortLinks', () => {
  it('searches generated DTO fields and source context', () => {
    const result = filterAndSortLinks(
      linkFixtures,
      { page: 1, q: 'OAuth', sort: 'newest', view: 'all' },
      demoRecentSince,
    );
    expect(result.map((link) => link.domain)).toContain('linear.app');
  });

  it('filters pending links and unassigned projects', () => {
    const result = filterAndSortLinks(
      linkFixtures,
      {
        page: 1,
        projectId: 'unassigned',
        sort: 'newest',
        view: 'pending',
      },
      demoRecentSince,
    );
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((link) => !link.project && link.status === 'pending'),
    ).toBe(true);
  });

  it('sorts oldest links first', () => {
    const result = filterAndSortLinks(
      linkFixtures,
      { page: 1, sort: 'oldest', view: 'all' },
      demoRecentSince,
    );
    expect(Date.parse(result[0]!.createdAt)).toBeLessThanOrEqual(
      Date.parse(result.at(-1)!.createdAt),
    );
  });
});
