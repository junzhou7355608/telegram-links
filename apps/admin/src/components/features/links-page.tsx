import {
  adminLinksControllerArchiveMutation,
  adminLinksControllerBatchMutation,
  adminLinksControllerFindOneOptions,
  adminLinksControllerListOptions,
  adminLinksControllerRestoreMutation,
  adminLinksControllerUpdateMutation,
} from '@/api/@tanstack/react-query.gen';
import type { BatchLinkPatchDto, UpdateLinkDto } from '@/api/types.gen';
import { BulkActions } from '@/components/features/bulk-actions';
import { LinkEditSheet } from '@/components/features/link-edit-sheet';
import { LinkFiltersBar } from '@/components/features/link-filters';
import { LinkList } from '@/components/features/link-list';
import { LinkPagination } from '@/components/features/link-pagination';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import { createLinksQuery, invalidateLinks } from '@/lib/admin-api';
import type { LinksSearch } from '@/lib/admin-search';
import { getAdminApiError } from '@/lib/api-error';
import { Badge } from '@repo/ui/components/badge';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SearchUpdater = (current: LinksSearch) => LinksSearch;

interface SearchChangeOptions {
  replace?: boolean;
}

interface LinksPageProps {
  pendingOnly: boolean;
  search: LinksSearch;
  onSearchChange: (
    updater: SearchUpdater,
    options?: SearchChangeOptions,
  ) => void;
}

const EMPTY_LINK_ID = '00000000-0000-4000-8000-000000000000';

export function LinksPage({
  pendingOnly,
  search,
  onSearchChange,
}: LinksPageProps) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchDraft, setSearchDraft] = useState({
    source: search.q,
    value: search.q ?? '',
  });
  const searchValue =
    searchDraft.source === search.q ? searchDraft.value : (search.q ?? '');
  const debouncedSearch = useDebouncedValue(searchValue);
  const taxonomyQuery = useTaxonomy();
  const linksQuery = useQuery({
    ...adminLinksControllerListOptions({
      query: createLinksQuery(search, pendingOnly),
    }),
    placeholderData: keepPreviousData,
  });
  const detailQuery = useQuery({
    ...adminLinksControllerFindOneOptions({
      path: { id: search.linkId ?? EMPTY_LINK_ID },
    }),
    enabled: Boolean(search.linkId),
  });
  const updateMutation = useMutation(adminLinksControllerUpdateMutation());
  const batchMutation = useMutation(adminLinksControllerBatchMutation());
  const archiveMutation = useMutation(adminLinksControllerArchiveMutation());
  const restoreMutation = useMutation(adminLinksControllerRestoreMutation());
  useApiErrorToast(linksQuery.error);
  useApiErrorToast(taxonomyQuery.error);
  useApiErrorToast(detailQuery.error);
  const mutationPending =
    updateMutation.isPending ||
    batchMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending;
  const links = linksQuery.data?.items ?? [];
  const pagination = linksQuery.data?.pagination;
  const selectedLinks = links.filter((link) => selectedIds.has(link.id));

  useEffect(() => {
    const nextQuery = debouncedSearch.trim() || undefined;
    if (nextQuery !== search.q) {
      onSearchChange((current) => ({ ...current, page: 1, q: nextQuery }), {
        replace: true,
      });
    }
  }, [debouncedSearch, onSearchChange, search.q]);

  useEffect(() => {
    if (pagination && search.page > pagination.totalPages) {
      onSearchChange(
        (current) => ({ ...current, page: pagination.totalPages }),
        { replace: true },
      );
    }
  }, [onSearchChange, pagination, search.page]);

  function changeSearch(next: LinksSearch) {
    setSelectedIds(new Set());
    onSearchChange(() => next);
  }

  function resetFilters() {
    setSelectedIds(new Set());
    setSearchDraft({ source: search.q, value: '' });
    onSearchChange(() => ({ page: 1, sort: 'newest' }));
  }

  async function applyPatch(patch: BatchLinkPatchDto) {
    if (Object.keys(patch).length === 0) {
      toast.info('没有选择需要批量修改的字段');
      return;
    }
    try {
      const result = await batchMutation.mutateAsync({
        body: { ids: [...selectedIds], patch },
      });
      await invalidateLinks(queryClient);
      if (result.updatedIds.length > 0) {
        toast.success(`已更新 ${result.updatedIds.length} 条链接`);
      }
      if (result.skipped.length > 0) {
        toast.warning(
          `${result.skipped.length} 条未更新：${result.skipped[0]?.message ?? '字段不完整'}`,
        );
      }
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  async function completeSelected() {
    await applyPatch({ status: 'organized' });
  }

  async function saveLink(body: UpdateLinkDto) {
    const id = search.linkId;
    if (!id) {
      return;
    }
    await updateMutation.mutateAsync({ body, path: { id } });
    await invalidateLinks(queryClient, id);
  }

  async function archiveLink() {
    const id = search.linkId;
    if (!id) {
      return;
    }
    await archiveMutation.mutateAsync({ path: { id } });
    await invalidateLinks(queryClient, id);
  }

  async function restoreLink() {
    const id = search.linkId;
    if (!id) {
      return;
    }
    await restoreMutation.mutateAsync({ path: { id } });
    await invalidateLinks(queryClient, id);
  }

  return (
    <section aria-labelledby="review-heading" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2
            id="review-heading"
            className="text-xl font-semibold tracking-tight sm:text-2xl"
          >
            {pendingOnly ? '待整理队列' : '全部链接'}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {pendingOnly
              ? '补充项目、用途和分类后标记完成。'
              : '检索并维护服务端保存的链接。'}
          </p>
        </div>
        <Badge variant="outline">{pagination?.total ?? 0} 条结果</Badge>
      </div>

      <LinkFiltersBar
        filters={search}
        searchValue={searchValue}
        taxonomy={taxonomyQuery.taxonomy}
        showStatus={!pendingOnly}
        resultCount={pagination?.total ?? 0}
        onChange={changeSearch}
        onReset={resetFilters}
        onSearchValueChange={(value) => {
          setSelectedIds(new Set());
          setSearchDraft({ source: search.q, value });
        }}
      />
      <BulkActions
        isPending={mutationPending}
        selectedLinks={selectedLinks}
        taxonomy={taxonomyQuery.taxonomy}
        onClear={() => setSelectedIds(new Set())}
        onApply={(patch) => void applyPatch(patch)}
        onComplete={() => void completeSelected()}
      />
      <div id="link-results" className="scroll-mt-36">
        {linksQuery.isPending ? (
          <PageSkeleton rows={6} />
        ) : (
          <LinkList
            links={links}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            onOpenLink={(linkId) =>
              onSearchChange((current) => ({ ...current, linkId }))
            }
            onResetFilters={resetFilters}
          />
        )}
      </div>
      <LinkPagination
        page={pagination?.page ?? search.page}
        pageCount={pagination?.totalPages ?? 1}
        total={pagination?.total ?? 0}
        onPageChange={(page) => {
          setSelectedIds(new Set());
          onSearchChange((current) => ({ ...current, page }));
        }}
      />

      {detailQuery.data ? (
        <LinkEditSheet
          key={detailQuery.data.id}
          isPending={mutationPending}
          link={detailQuery.data}
          taxonomy={taxonomyQuery.taxonomy}
          onArchive={archiveLink}
          onRestore={restoreLink}
          onSave={saveLink}
          onOpenChange={(open) => {
            if (!open) {
              onSearchChange((current) => ({
                ...current,
                linkId: undefined,
              }));
            }
          }}
        />
      ) : null}
    </section>
  );
}
