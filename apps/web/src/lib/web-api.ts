import type { WebApiControllerListData } from '@/api/types.gen';
import type { WebLinksSearch } from '@/lib/web-search';

export const WEB_LINK_PAGE_SIZE = 8;

export function createWebLinksQuery(
  search: WebLinksSearch,
): NonNullable<WebApiControllerListData['query']> {
  return {
    categoryId: search.categoryId,
    page: search.page,
    pageSize: WEB_LINK_PAGE_SIZE,
    q: search.q,
    sort: search.sort,
    tagIds: search.tagIds,
    view: search.view,
  };
}
