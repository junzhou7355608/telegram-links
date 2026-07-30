import { Badge } from '@repo/ui/components/badge';
import { Button } from '@repo/ui/components/button';
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar';
import { SearchX } from 'lucide-react';
import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import { AppSidebar, type LinkView } from '@/components/app-sidebar';
import { LinkCard } from '@/components/link-card';
import { LinkDetailSheet } from '@/components/link-detail-sheet';
import { LinkPagination } from '@/components/link-pagination';
import { LinkTable } from '@/components/link-table';
import { LinkToolbar, type LinkFilters } from '@/components/link-toolbar';
import { WorkspaceHeader } from '@/components/workspace-header';
import {
  isRecentLink,
  telegramLinks,
  type LinkCategory,
  type TelegramLinkMock,
} from '@/data/links';

const PAGE_SIZE = 8;
const FAVORITES_STORAGE_KEY = 'telegram-links:favorites:v1';

const defaultFilters: LinkFilters = {
  query: '',
  view: 'all',
  project: 'all',
  category: 'all',
  environment: 'all',
  status: 'all',
  sort: 'newest',
};

const knownLinkIds = new Set(telegramLinks.map((link) => link.id));
const defaultFavoriteIds = telegramLinks
  .filter((link) => link.isFavorite)
  .map((link) => link.id);
const projects = Array.from(
  new Set(
    telegramLinks
      .map((link) => link.project)
      .filter((project): project is string => Boolean(project)),
  ),
).sort((left, right) => left.localeCompare(right, 'zh-CN'));

function loadFavoriteIds() {
  try {
    const storedValue = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!storedValue) {
      return new Set(defaultFavoriteIds);
    }

    const parsedValue = JSON.parse(storedValue) as {
      version?: unknown;
      ids?: unknown;
    };
    if (parsedValue.version !== 1 || !Array.isArray(parsedValue.ids)) {
      return new Set(defaultFavoriteIds);
    }

    return new Set(
      parsedValue.ids.filter(
        (id): id is string => typeof id === 'string' && knownLinkIds.has(id),
      ),
    );
  } catch {
    return new Set(defaultFavoriteIds);
  }
}

function saveFavoriteIds(favoriteIds: ReadonlySet<string>) {
  try {
    window.localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify({ version: 1, ids: [...favoriteIds] }),
    );
  } catch {
    toast.error('收藏状态未能保存', {
      description: '浏览器当前不允许访问本地存储。',
    });
  }
}

function matchesView(
  link: TelegramLinkMock,
  view: LinkView,
  favoriteIds: ReadonlySet<string>,
) {
  if (view === 'recent') {
    return isRecentLink(link);
  }
  if (view === 'favorites') {
    return favoriteIds.has(link.id);
  }
  if (view === 'pending') {
    return link.status === 'pending';
  }

  return true;
}

export function LinkWorkspace() {
  const [filters, setFilters] = useState<LinkFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState(loadFavoriteIds);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(filters.query.trim().toLowerCase());

  const links = useMemo(
    () =>
      telegramLinks.map((link) => ({
        ...link,
        isFavorite: favoriteIds.has(link.id),
      })),
    [favoriteIds],
  );

  const filteredLinks = useMemo(() => {
    const matchingLinks = links.filter((link) => {
      if (!matchesView(link, filters.view, favoriteIds)) {
        return false;
      }
      if (
        filters.project !== 'all' &&
        (filters.project === 'unassigned'
          ? link.project !== null
          : link.project !== filters.project)
      ) {
        return false;
      }
      if (filters.category !== 'all' && link.category !== filters.category) {
        return false;
      }
      if (
        filters.environment !== 'all' &&
        link.environment !== filters.environment
      ) {
        return false;
      }
      if (filters.status !== 'all' && link.status !== filters.status) {
        return false;
      }
      if (!deferredQuery) {
        return true;
      }

      const searchableText = [
        link.title,
        link.url,
        link.domain,
        link.project,
        link.purpose,
        ...link.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(deferredQuery);
    });

    return matchingLinks.toSorted((left, right) => {
      if (filters.sort === 'title') {
        return left.title.localeCompare(right.title, 'zh-CN');
      }

      const difference =
        Date.parse(right.source.capturedAt) -
        Date.parse(left.source.capturedAt);
      return filters.sort === 'oldest' ? -difference : difference;
    });
  }, [deferredQuery, favoriteIds, filters, links]);

  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleLinks = filteredLinks.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedLink = links.find((link) => link.id === selectedLinkId) ?? null;
  const pendingCount = links.filter((link) => link.status === 'pending').length;

  function updateFilters(nextFilters: LinkFilters) {
    setFilters(nextFilters);
    setPage(1);
  }

  function selectView(view: LinkView) {
    updateFilters({
      ...filters,
      view,
      project: 'all',
      category: 'all',
    });
  }

  function selectProject(project: string) {
    updateFilters({
      ...filters,
      view: 'all',
      project,
      category: 'all',
    });
  }

  function selectCategory(category: LinkCategory) {
    updateFilters({
      ...filters,
      view: 'all',
      project: 'all',
      category,
    });
  }

  function resetFilters() {
    setFilters(defaultFilters);
    setPage(1);
  }

  async function copyLink(link: TelegramLinkMock) {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('链接已复制', {
        description: link.domain,
      });
    } catch {
      toast.error('复制失败', {
        description: '请检查浏览器的剪贴板权限。',
      });
    }
  }

  function toggleFavorite(link: TelegramLinkMock) {
    const nextFavoriteIds = new Set(favoriteIds);
    if (nextFavoriteIds.has(link.id)) {
      nextFavoriteIds.delete(link.id);
      toast('已取消收藏', { description: link.title });
    } else {
      nextFavoriteIds.add(link.id);
      toast.success('已添加到收藏', { description: link.title });
    }

    setFavoriteIds(nextFavoriteIds);
    saveFavoriteIds(nextFavoriteIds);
    if (filters.view === 'favorites') {
      setPage(1);
    }
  }

  return (
    <SidebarProvider style={{ '--sidebar-width': '15rem' } as CSSProperties}>
      <AppSidebar
        links={links}
        favoriteIds={favoriteIds}
        selectedView={filters.view}
        selectedProject={filters.project}
        selectedCategory={filters.category}
        onSelectView={selectView}
        onSelectProject={selectProject}
        onSelectCategory={selectCategory}
      />

      <SidebarInset className="min-w-0">
        <WorkspaceHeader
          totalCount={links.length}
          pendingCount={pendingCount}
        />

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
                  快速确认链接属于哪个项目、用于什么环境，以及它来自哪条消息。
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                演示数据
              </Badge>
            </div>

            <LinkToolbar
              filters={filters}
              projects={projects}
              resultCount={filteredLinks.length}
              onFiltersChange={updateFilters}
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
                最近同步：今天 09:42
              </p>
            </div>

            {visibleLinks.length > 0 ? (
              <>
                <div className="grid gap-3 md:hidden">
                  {visibleLinks.map((link) => (
                    <LinkCard
                      key={link.id}
                      link={link}
                      onSelect={(selectedLink) =>
                        setSelectedLinkId(selectedLink.id)
                      }
                      onCopy={copyLink}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>

                <div className="hidden md:block">
                  <LinkTable
                    links={visibleLinks}
                    onSelect={(link) => setSelectedLinkId(link.id)}
                    onCopy={copyLink}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>

                <LinkPagination
                  page={currentPage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                />
              </>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-lg bg-muted">
                  <SearchX className="size-5" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-medium">没有找到匹配的链接</h2>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  尝试修改搜索词，或者重置项目、环境和整理状态筛选。
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={resetFilters}
                >
                  重置筛选
                </Button>
              </div>
            )}
          </div>
        </section>
      </SidebarInset>

      <LinkDetailSheet
        link={selectedLink}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLinkId(null);
          }
        }}
        onCopy={copyLink}
        onToggleFavorite={toggleFavorite}
      />
    </SidebarProvider>
  );
}
