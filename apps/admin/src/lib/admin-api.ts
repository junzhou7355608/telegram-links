import {
  adminLinksControllerFindOneQueryKey,
  adminLinksControllerListQueryKey,
  adminLinksControllerOverviewQueryKey,
  adminSyncControllerListQueryKey,
  adminTaxonomyControllerListQueryKey,
  adminTelegramControllerAccountQueryKey,
  adminTelegramControllerListChatsQueryKey,
  adminTelegramControllerScanOptionsQueryKey,
} from '@/api/@tanstack/react-query.gen';
import type {
  AdminLinksControllerListData,
  TaxonomyItemResponseDto,
} from '@/api/types.gen';
import type { LinksSearch } from '@/lib/admin-search';
import type { QueryClient } from '@tanstack/react-query';

export const ADMIN_LINK_PAGE_SIZE = 8;
export const ADMIN_JOB_PAGE_SIZE = 6;
export const ADMIN_CHAT_PAGE_SIZE = 8;
export const taxonomyKinds = ['categories', 'tags'] as const;

export type TaxonomyKind = (typeof taxonomyKinds)[number];

export interface TaxonomyCollections {
  categories: TaxonomyItemResponseDto[];
  tags: TaxonomyItemResponseDto[];
}

export function orderTaxonomyItems(
  items: TaxonomyItemResponseDto[],
  ids: string[],
): TaxonomyItemResponseDto[] {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  return ids.flatMap((id) => {
    const item = itemsById.get(id);
    return item ? [item] : [];
  });
}

export function createLinksQuery(
  search: LinksSearch,
  pendingOnly: boolean,
): NonNullable<AdminLinksControllerListData['query']> {
  return {
    categoryId: search.categoryId,
    includeArchived: search.includeArchived || undefined,
    page: search.page,
    pageSize: ADMIN_LINK_PAGE_SIZE,
    q: search.q,
    sort: search.sort,
    sourceChatId: search.sourceChatId,
    status: pendingOnly ? undefined : search.status,
    tagIds: search.tagIds,
    view: pendingOnly ? 'pending' : 'all',
  };
}

export async function invalidateTaxonomy(queryClient: QueryClient) {
  await Promise.all(
    taxonomyKinds.map((kind) =>
      queryClient.invalidateQueries({
        queryKey: adminTaxonomyControllerListQueryKey({ path: { kind } }),
      }),
    ),
  );
}

export async function invalidateLinks(
  queryClient: QueryClient,
  linkId?: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: adminLinksControllerListQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: adminLinksControllerOverviewQueryKey(),
    }),
    linkId
      ? queryClient.invalidateQueries({
          queryKey: adminLinksControllerFindOneQueryKey({
            path: { id: linkId },
          }),
        })
      : Promise.resolve(),
    invalidateTaxonomy(queryClient),
  ]);
}

export async function invalidateSyncResults(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: adminSyncControllerListQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: adminTelegramControllerListChatsQueryKey(),
    }),
    invalidateLinks(queryClient),
  ]);
}

export async function invalidateTelegram(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: adminTelegramControllerAccountQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: adminTelegramControllerListChatsQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: adminTelegramControllerScanOptionsQueryKey(),
    }),
  ]);
}
