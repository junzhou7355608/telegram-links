import {
  webApiControllerFindOneOptions,
  webApiControllerListOptions,
  webApiControllerOverviewOptions,
} from '@/api/@tanstack/react-query.gen';
import type { LinkResponseDto } from '@/api/types.gen';
import { LinkCard } from '@/components/features/link-card';
import { LinkDetailSheet } from '@/components/features/link-detail-sheet';
import { LinkPagination } from '@/components/features/link-pagination';
import { LinkToolbar } from '@/components/features/link-toolbar';
import {
  ApiErrorState,
  LinkCardGridSkeleton,
  PageSkeleton,
} from '@/components/layouts/api-state';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { formatLatestSync } from '@/lib/link-display';
import { createWebLinksQuery } from '@/lib/web-api';
import { defaultWebLinksSearch, type WebLinksSearch } from '@/lib/web-search';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import {
  keepPreviousData,
  useQuery,
} from '@tanstack/react-query';
import { SearchX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EMPTY_LINK_ID = '00000000-0000-4000-8000-000000000000';

interface LinksPageProps {
  search: WebLinksSearch;
  onSearchChange: (
    updater: (previous: WebLinksSearch) => WebLinksSearch,
    options?: { replace?: boolean },
  ) => void;
}

export function LinksPage({ search, onSearchChange }: LinksPageProps) {
  const [searchDraft, setSearchDraft] = useState({
    source: search.q,
    value: search.q ?? '',
  });
  const searchValue =
    searchDraft.source === search.q ? searchDraft.value : (search.q ?? '');
  const debouncedSearch = useDebouncedValue(searchValue);
  const overviewQuery = useQuery(webApiControllerOverviewOptions());
  const linksQuery = useQuery({
    ...webApiControllerListOptions({
      query: createWebLinksQuery(search),
    }),
    placeholderData: keepPreviousData,
  });
  const detailQuery = useQuery({
    ...webApiControllerFindOneOptions({
      path: { id: search.linkId ?? EMPTY_LINK_ID },
    }),
    enabled: Boolean(search.linkId),
  });
  const links = linksQuery.data?.items ?? [];
  const pagination = linksQuery.data?.pagination;

  useEffect(() => {
    const nextQuery = debouncedSearch.trim() || undefined;
    if (nextQuery !== search.q) {
      onSearchChange(
        (previous) => ({
          ...previous,
          linkId: undefined,
          page: 1,
          q: nextQuery,
        }),
        { replace: true },
      );
    }
  }, [debouncedSearch, onSearchChange, search.q]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    if (
      parameters.has('projectId') ||
      parameters.has('environment') ||
      parameters.has('status') ||
      parameters.get('view') === 'pending'
    ) {
      onSearchChange((previous) => ({ ...previous }), { replace: true });
    }
  }, [onSearchChange]);

  useEffect(() => {
    if (pagination && search.page > pagination.totalPages) {
      onSearchChange(
        (previous) => ({ ...previous, page: pagination.totalPages }),
        { replace: true },
      );
    }
  }, [onSearchChange, pagination, search.page]);

  function updateSearch(
    updater: (previous: WebLinksSearch) => WebLinksSearch,
    options?: { replace?: boolean },
  ) {
    onSearchChange(updater, options);
  }

  function resetFilters() {
    setSearchDraft({ source: search.q, value: '' });
    onSearchChange(() => defaultWebLinksSearch);
  }

  function selectLink(link: LinkResponseDto) {
    updateSearch((previous) => ({ ...previous, linkId: link.id }));
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败', { description: '请检查浏览器的剪贴板权限。' });
    }
  }

  return (
    <>
      <section
        id="link-results"
        aria-labelledby="link-results-title"
        className="scroll-mt-16 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
      >
        <div className="mx-auto grid max-w-[1480px] gap-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1
                id="link-results-title"
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                链接
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                浏览已经整理完成的分类、标签、用途和 Telegram 来源。
              </p>
            </div>
            <Badge variant="outline">
              {pagination ? `${pagination.total} 条结果` : '正在读取'}
            </Badge>
          </div>

          {overviewQuery.error ? (
            <ApiErrorState
              error={overviewQuery.error}
              onRetry={() => void overviewQuery.refetch()}
            />
          ) : overviewQuery.data ? (
            <LinkToolbar
              search={search}
              searchValue={searchValue}
              overview={overviewQuery.data}
              resultCount={pagination?.total ?? 0}
              onSearchChange={updateSearch}
              onSearchValueChange={(value) =>
                setSearchDraft({ source: search.q, value })
              }
              onReset={resetFilters}
            />
          ) : (
            <PageSkeleton rows={1} />
          )}

          <div
            className="flex items-center justify-between gap-4 border-t pt-4 text-sm"
            aria-live="polite"
          >
            <p>
              找到 <span className="font-medium">{pagination?.total ?? '—'}</span>{' '}
              条链接
            </p>
            <p className="text-xs text-muted-foreground">
              最近同步：
              {formatLatestSync(overviewQuery.data?.latestSync?.finishedAt)}
            </p>
          </div>

          {linksQuery.error ? (
            <ApiErrorState
              error={linksQuery.error}
              onRetry={() => void linksQuery.refetch()}
            />
          ) : linksQuery.isPending ? (
            <LinkCardGridSkeleton />
          ) : links.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {links.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onSelect={selectLink}
                    onCopy={(item) => void copyUrl(item.url)}
                  />
                ))}
              </div>

              <LinkPagination
                page={pagination?.page ?? search.page}
                pageCount={pagination?.totalPages ?? 1}
                onPageChange={(nextPage) =>
                  updateSearch((previous) => ({
                    ...previous,
                    linkId: undefined,
                    page: nextPage,
                  }))
                }
              />
            </>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                <SearchX className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-medium">没有找到匹配的链接</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                尝试修改搜索词，或者重置分类和标签筛选。
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                重置筛选
              </Button>
            </div>
          )}
        </div>
      </section>

      <LinkDetailSheet
        error={detailQuery.error}
        isPending={detailQuery.isPending && Boolean(search.linkId)}
        link={detailQuery.data}
        open={Boolean(search.linkId)}
        onCopyUrl={(url) => void copyUrl(url)}
        onRetry={() => void detailQuery.refetch()}
        onOpenChange={(open) => {
          if (!open) {
            updateSearch((previous) => ({
              ...previous,
              linkId: undefined,
            }), { replace: true });
          }
        }}
      />
    </>
  );
}
