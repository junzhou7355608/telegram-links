import type { LinkResponseDto } from '@/api/types.gen';
import { LinkCard } from '@/components/features/link-card';
import { LinkDetailSheet } from '@/components/features/link-detail-sheet';
import { LinkPagination } from '@/components/features/link-pagination';
import { LinkTable } from '@/components/features/link-table';
import { LinkToolbar } from '@/components/features/link-toolbar';
import {
  createPaginatedLinksFixture,
  demoRecentSince,
  linkDetailFixtures,
  linkFixtures,
  webOverviewFixture,
} from '@/data/links';
import { displayLinkTitle, formatLatestSync } from '@/lib/link-display';
import { filterAndSortLinks } from '@/lib/web-links';
import { defaultWebLinksSearch, type WebLinksSearch } from '@/lib/web-search';
import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { SearchX } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

const PAGE_SIZE = 8;

interface LinksPageProps {
  search: WebLinksSearch;
  onSearchChange: (
    updater: (previous: WebLinksSearch) => WebLinksSearch,
    options?: { replace?: boolean },
  ) => void;
}

export function LinksPage({ search, onSearchChange }: LinksPageProps) {
  const filteredLinks = useMemo(
    () => filterAndSortLinks(linkFixtures, search, demoRecentSince),
    [search],
  );
  const page = createPaginatedLinksFixture(
    filteredLinks,
    search.page,
    PAGE_SIZE,
  );
  const selectedLink = search.linkId
    ? (linkDetailFixtures.get(search.linkId) ?? null)
    : null;

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    if (parameters.has('projectId') || parameters.has('environment')) {
      onSearchChange((previous) => ({ ...previous }), { replace: true });
    }
  }, [onSearchChange]);

  useEffect(() => {
    if (page.pagination.page !== search.page) {
      onSearchChange(
        (previous) => ({ ...previous, page: page.pagination.page }),
        { replace: true },
      );
    }
  }, [onSearchChange, page.pagination.page, search.page]);

  function updateSearch(
    updater: (previous: WebLinksSearch) => WebLinksSearch,
    options?: { replace?: boolean },
  ) {
    onSearchChange(updater, options);
  }

  function resetFilters() {
    onSearchChange(() => defaultWebLinksSearch);
  }

  function selectLink(link: LinkResponseDto) {
    updateSearch((previous) => ({ ...previous, linkId: link.id }));
  }

  async function copyLink(link: LinkResponseDto) {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('链接已复制', { description: link.domain });
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
                快速确认链接的分类、用途、标签，以及它来自哪条消息。
              </p>
            </div>
            <Badge variant="outline" className="shrink-0">
              演示数据
            </Badge>
          </div>

          <LinkToolbar
            search={search}
            overview={webOverviewFixture}
            resultCount={filteredLinks.length}
            onSearchChange={updateSearch}
            onReset={resetFilters}
          />

          <div
            className="flex items-center justify-between gap-4 border-t pt-4 text-sm"
            aria-live="polite"
          >
            <p>
              找到 <span className="font-medium">{filteredLinks.length}</span>{' '}
              条链接
            </p>
            <p className="text-xs text-muted-foreground">
              最近同步：
              {formatLatestSync(webOverviewFixture.latestSync?.finishedAt)}
            </p>
          </div>

          {page.items.length > 0 ? (
            <>
              <div className="grid gap-3 md:hidden">
                {page.items.map((link) => (
                  <LinkCard
                    key={link.id}
                    link={link}
                    onSelect={selectLink}
                    onCopy={copyLink}
                  />
                ))}
              </div>

              <div className="hidden md:block">
                <LinkTable
                  links={page.items}
                  onSelect={selectLink}
                  onCopy={copyLink}
                />
              </div>

              <LinkPagination
                page={page.pagination.page}
                pageCount={page.pagination.totalPages}
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
                尝试修改搜索词，或者重置分类和整理状态筛选。
              </p>
              <Button variant="outline" className="mt-4" onClick={resetFilters}>
                重置筛选
              </Button>
            </div>
          )}
        </div>
      </section>

      <LinkDetailSheet
        link={selectedLink}
        onOpenChange={(open) => {
          if (!open) {
            updateSearch((previous) => ({ ...previous, linkId: undefined }), {
              replace: true,
            });
          }
        }}
        onCopy={copyLink}
        title={selectedLink ? displayLinkTitle(selectedLink) : undefined}
      />
    </>
  );
}
