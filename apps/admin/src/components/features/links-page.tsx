import {
  adminLinksControllerCreateMutation,
  adminLinksControllerArchiveMutation,
  adminLinksControllerBatchArchiveMutation,
  adminLinksControllerBatchMutation,
  adminLinksControllerFindOneOptions,
  adminLinksControllerListOptions,
  adminLinksControllerRestoreMutation,
  adminLinksControllerUpdateMutation,
  adminTaxonomyControllerCreateMutation,
  adminTaxonomyControllerListQueryKey,
} from '@/api/@tanstack/react-query.gen';
import type {
  BatchLinkPatchDto,
  CreateLinkDto,
  TaxonomyItemResponseDto,
  UpdateLinkDto,
} from '@/api/types.gen';
import { BulkActions } from '@/components/features/bulk-actions';
import { LinkCreateSheet } from '@/components/features/link-create-sheet';
import { LinkEditSheet } from '@/components/features/link-edit-sheet';
import { LinkFiltersBar } from '@/components/features/link-filters';
import { LinkList } from '@/components/features/link-list';
import { LinkPagination } from '@/components/features/link-pagination';
import { PageSkeleton } from '@/components/layouts/api-state';
import { useApiErrorToast } from '@/hooks/use-api-error-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTaxonomy } from '@/hooks/use-taxonomy';
import {
  createLinksQuery,
  invalidateLinks,
  type TaxonomyKind,
} from '@/lib/admin-api';
import type { LinksSearch } from '@/lib/admin-search';
import { getAdminApiError } from '@/lib/api-error';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
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
  const [createOpen, setCreateOpen] = useState(false);
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
  const createMutation = useMutation(adminLinksControllerCreateMutation());
  const createTaxonomyMutation = useMutation(
    adminTaxonomyControllerCreateMutation(),
  );
  const batchMutation = useMutation(adminLinksControllerBatchMutation());
  const batchArchiveMutation = useMutation(
    adminLinksControllerBatchArchiveMutation(),
  );
  const archiveMutation = useMutation(adminLinksControllerArchiveMutation());
  const restoreMutation = useMutation(adminLinksControllerRestoreMutation());
  useApiErrorToast(linksQuery.error);
  useApiErrorToast(taxonomyQuery.error);
  useApiErrorToast(detailQuery.error);
  const mutationPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    createTaxonomyMutation.isPending ||
    batchMutation.isPending ||
    batchArchiveMutation.isPending ||
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
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.has('projectId') || parameters.has('environment')) {
      onSearchChange((current) => ({ ...current }), { replace: true });
    }
  }, [onSearchChange]);

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

  async function archiveSelected() {
    const ids = selectedLinks
      .filter((link) => !link.archivedAt)
      .map((link) => link.id);
    if (ids.length === 0) {
      return;
    }
    try {
      const result = await batchArchiveMutation.mutateAsync({ body: { ids } });
      await invalidateLinks(queryClient);
      if (result.updatedIds.length > 0) {
        toast.success(`已归档 ${result.updatedIds.length} 条链接`);
      }
      if (result.skipped.length > 0) {
        toast.warning(
          `${result.skipped.length} 条未归档：${result.skipped[0]?.message ?? '链接状态已变化'}`,
        );
      }
      setSelectedIds(new Set());
    } catch (error) {
      toast.error(getAdminApiError(error).message);
    }
  }

  async function saveLink(body: UpdateLinkDto) {
    const id = search.linkId;
    if (!id) {
      return;
    }
    await updateMutation.mutateAsync({ body, path: { id } });
    await invalidateLinks(queryClient, id);
  }

  async function createLink(body: CreateLinkDto) {
    await createMutation.mutateAsync({ body });
    await invalidateLinks(queryClient);
  }

  async function createTaxonomy(kind: TaxonomyKind, name: string) {
    const created = await createTaxonomyMutation.mutateAsync({
      body: { name },
      path: { kind },
    });
    const queryKey = adminTaxonomyControllerListQueryKey({ path: { kind } });
    queryClient.setQueryData<TaxonomyItemResponseDto[]>(
      queryKey,
      (current = []) =>
        [...current.filter((item) => item.id !== created.id), created],
    );
    void queryClient.invalidateQueries({ queryKey });
    return created;
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
              ? '补充标题与分类后标记完成。'
              : '检索并维护服务端保存的链接。'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{pagination?.total ?? 0} 条结果</Badge>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            新增链接
          </Button>
        </div>
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
        onArchive={() => void archiveSelected()}
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

      {createOpen ? (
        <LinkCreateSheet
          isPending={mutationPending}
          taxonomy={taxonomyQuery.taxonomy}
          onCreateTaxonomy={createTaxonomy}
          onOpenChange={setCreateOpen}
          onSave={createLink}
        />
      ) : null}

      {detailQuery.data ? (
        <LinkEditSheet
          key={`${detailQuery.data.id}:${detailQuery.data.updatedAt}`}
          isPending={mutationPending}
          link={detailQuery.data}
          taxonomy={taxonomyQuery.taxonomy}
          onArchive={archiveLink}
          onCreateTaxonomy={createTaxonomy}
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
