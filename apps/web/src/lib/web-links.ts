import type { LinkResponseDto } from '@/api/types.gen';
import type { WebLinksSearch } from '@/lib/web-search';

export function filterAndSortLinks(
  links: readonly LinkResponseDto[],
  search: WebLinksSearch,
  recentSince: string,
): LinkResponseDto[] {
  const query = search.q?.toLocaleLowerCase('zh-CN');
  return links
    .filter((link) => {
      if (
        search.view === 'recent' &&
        Date.parse(link.createdAt) < Date.parse(recentSince)
      ) {
        return false;
      }
      if (search.view === 'pending' && link.status !== 'pending') {
        return false;
      }
      if (search.categoryId && link.category?.id !== search.categoryId) {
        return false;
      }
      if (search.status && link.status !== search.status) {
        return false;
      }
      if (!query) {
        return true;
      }

      return [
        link.title,
        link.url,
        link.domain,
        link.category?.name,
        link.purpose,
        ...link.tags.map((tag) => tag.name),
        link.latestSource?.chatName,
        link.latestSource?.messagePreview,
      ]
        .filter((value): value is string => Boolean(value))
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(query);
    })
    .toSorted((left, right) => {
      if (search.sort === 'title') {
        return (left.title || left.domain).localeCompare(
          right.title || right.domain,
          'zh-CN',
        );
      }
      const difference =
        Date.parse(right.createdAt) - Date.parse(left.createdAt);
      return search.sort === 'oldest' ? -difference : difference;
    });
}
