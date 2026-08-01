import type { BatchLinkPatchDto, LinkResponseDto } from '@/api/types.gen';
import { BulkActions } from '@/components/features/bulk-actions';
import { LinkEditSheet } from '@/components/features/link-edit-sheet';
import { LinkFiltersBar } from '@/components/features/link-filters';
import { LinkList } from '@/components/features/link-list';
import { LinkPagination } from '@/components/features/link-pagination';
import { useDemoAdmin } from '@/components/providers/demo-admin-context';
import type { LinksSearch } from '@/lib/admin-search';
import { PAGE_SIZE } from '@/lib/admin-store';
import { Badge } from '@repo/ui/components/badge';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type SearchUpdater = (current: LinksSearch) => LinksSearch;

interface LinksPageProps {
  pendingOnly: boolean;
  search: LinksSearch;
  onSearchChange: (updater: SearchUpdater) => void;
}

function filterLinks(
  links: LinkResponseDto[],
  pendingOnly: boolean,
  search: LinksSearch,
) {
  const query = search.q?.toLocaleLowerCase() ?? '';
  return links
    .filter((link) => (search.includeArchived ? true : !link.archivedAt))
    .filter((link) => (pendingOnly ? link.status === 'pending' : true))
    .filter((link) =>
      search.projectId === 'unassigned'
        ? link.project === null
        : search.projectId
          ? link.project?.id === search.projectId
          : true,
    )
    .filter((link) =>
      search.categoryId ? link.category?.id === search.categoryId : true,
    )
    .filter((link) =>
      search.environment ? link.environment === search.environment : true,
    )
    .filter((link) =>
      search.sourceChatId
        ? link.latestSource?.chatId === search.sourceChatId
        : true,
    )
    .filter((link) =>
      !pendingOnly && search.status ? link.status === search.status : true,
    )
    .filter((link) =>
      search.tagIds?.length
        ? search.tagIds.every((tagId) =>
            link.tags.some((tag) => tag.id === tagId),
          )
        : true,
    )
    .filter((link) => {
      if (!query) {
        return true;
      }
      return [
        link.title,
        link.url,
        link.domain,
        link.project?.name,
        link.purpose,
        link.category?.name,
        ...link.tags.map((tag) => tag.name),
        link.latestSource?.chatName,
        link.latestSource?.messagePreview,
      ]
        .filter(Boolean)
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    })
    .toSorted((first, second) => {
      if (search.sort === 'title') {
        return (first.title || first.url).localeCompare(
          second.title || second.url,
          'zh-CN',
        );
      }
      const direction = search.sort === 'oldest' ? 1 : -1;
      return direction * first.createdAt.localeCompare(second.createdAt);
    });
}

export function LinksPage({
  pendingOnly,
  search,
  onSearchChange,
}: LinksPageProps) {
  const { applyBulkPatch, completeLinks, saveLink, store } = useDemoAdmin();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const filteredLinks = filterLinks(store.links, pendingOnly, search);
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const safePage = Math.min(search.page, pageCount);
  const visibleLinks = filteredLinks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedLinks = store.links.filter((link) => selectedIds.has(link.id));
  const editingLink =
    store.links.find((link) => link.id === search.linkId) ?? null;

  useEffect(() => {
    if (search.page > pageCount) {
      onSearchChange((current) => ({ ...current, page: pageCount }));
    }
  }, [onSearchChange, pageCount, search.page]);

  function changeSearch(next: LinksSearch) {
    setSelectedIds(new Set());
    onSearchChange(() => next);
  }

  function resetFilters() {
    setSelectedIds(new Set());
    onSearchChange(() => ({ page: 1, sort: 'newest' }));
  }

  function applyPatch(patch: BatchLinkPatchDto) {
    if (Object.keys(patch).length === 0) {
      toast.info('没有选择需要批量修改的字段');
      return;
    }
    applyBulkPatch(selectedIds, patch);
    toast.success(`已更新 ${selectedIds.size} 条链接`);
    setSelectedIds(new Set());
  }

  function completeSelected() {
    const result = completeLinks(selectedIds);
    if (result.completed > 0) {
      toast.success(`已完成 ${result.completed} 条链接`);
    }
    if (result.skipped > 0) {
      toast.warning(`${result.skipped} 条缺少必填信息，仍保留在待整理队列`);
    }
    setSelectedIds(new Set());
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
              : '检索并维护本地演示链接的整理状态。'}
          </p>
        </div>
        <Badge variant="outline">{filteredLinks.length} 条结果</Badge>
      </div>
      <LinkFiltersBar
        filters={search}
        links={store.links}
        taxonomy={store.taxonomy}
        showStatus={!pendingOnly}
        resultCount={filteredLinks.length}
        onChange={changeSearch}
        onReset={resetFilters}
      />
      <BulkActions
        selectedLinks={selectedLinks}
        taxonomy={store.taxonomy}
        onClear={() => setSelectedIds(new Set())}
        onApply={applyPatch}
        onComplete={completeSelected}
      />
      <div id="link-results" className="scroll-mt-36">
        <LinkList
          links={visibleLinks}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onOpenLink={(linkId) =>
            onSearchChange((current) => ({ ...current, linkId }))
          }
          onResetFilters={resetFilters}
        />
      </div>
      <LinkPagination
        page={safePage}
        pageCount={pageCount}
        total={filteredLinks.length}
        onPageChange={(page) => {
          setSelectedIds(new Set());
          onSearchChange((current) => ({ ...current, page }));
        }}
      />
      {editingLink ? (
        <LinkEditSheet
          key={editingLink.id}
          link={editingLink}
          taxonomy={store.taxonomy}
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
