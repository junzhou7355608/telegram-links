import { AdminSidebar } from '@/components/admin-sidebar';
import { BulkActions, type BulkPatch } from '@/components/bulk-actions';
import { LinkEditSheet } from '@/components/link-edit-sheet';
import { LinkFiltersBar } from '@/components/link-filters';
import { LinkList } from '@/components/link-list';
import { LinkPagination } from '@/components/link-pagination';
import { ScanDialog } from '@/components/scan-dialog';
import { ScanJobsView } from '@/components/scan-jobs-view';
import { TaxonomyView, type TaxonomyKind } from '@/components/taxonomy-view';
import { WorkspaceHeader } from '@/components/workspace-header';
import { scanCandidates, telegramChats } from '@/data/mock-data';
import {
  PAGE_SIZE,
  canCompleteLink,
  formatDateTime,
  loadAdminStore,
  normalizeUrl,
  saveAdminStore,
  scanStageLabels,
} from '@/lib/admin-store';
import type {
  AdminStoreV1,
  AdminView,
  LinkFilters,
  ManagedLinkMock,
  ScanConfiguration,
  ScanJobMock,
  ScanStage,
} from '@/types/admin';
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Badge } from '@repo/ui/components/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Progress } from '@repo/ui/components/progress';
import { SidebarInset, SidebarProvider } from '@repo/ui/components/sidebar';
import {
  Activity,
  CheckCircle2,
  Database,
  Inbox,
  LoaderCircle,
  Plus,
} from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';

const initialFilters: LinkFilters = {
  query: '',
  project: 'all',
  category: 'all',
  environment: 'all',
  sourceChat: 'all',
  status: 'all',
};

const SIDEBAR_COOKIE_NAME = 'sidebar_state';

function loadSidebarDefaultOpen() {
  const sidebarCookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${SIDEBAR_COOKIE_NAME}=`));

  return sidebarCookie?.split('=')[1] !== 'false';
}

const stageTimeline: {
  delay: number;
  stage: ScanStage;
  progress: number;
}[] = [
  { delay: 700, stage: 'reading', progress: 24 },
  { delay: 1_400, stage: 'extracting', progress: 52 },
  { delay: 2_100, stage: 'deduplicating', progress: 74 },
  { delay: 2_800, stage: 'saving', progress: 91 },
];

function rangeLabel(configuration: ScanConfiguration) {
  if (configuration.rangeMode === 'since-last') {
    return '从上次扫描';
  }
  if (configuration.rangeMode === 'last-7-days') {
    return '最近 7 天';
  }
  return `${configuration.startDate} 至 ${configuration.endDate}`;
}

function filterLinks(
  links: ManagedLinkMock[],
  view: AdminView,
  filters: LinkFilters,
) {
  const query = filters.query.trim().toLocaleLowerCase();
  return links
    .filter((link) => (view === 'pending' ? link.status === 'pending' : true))
    .filter((link) =>
      filters.project === 'all' ? true : link.project === filters.project,
    )
    .filter((link) =>
      filters.category === 'all' ? true : link.category === filters.category,
    )
    .filter((link) =>
      filters.environment === 'all'
        ? true
        : link.environment === filters.environment,
    )
    .filter((link) =>
      filters.sourceChat === 'all'
        ? true
        : link.source.chatName === filters.sourceChat,
    )
    .filter((link) =>
      view !== 'all' || filters.status === 'all'
        ? true
        : link.status === filters.status,
    )
    .filter((link) => {
      if (!query) {
        return true;
      }
      return [
        link.title,
        link.url,
        link.domain,
        link.project,
        link.purpose,
        link.category,
        ...link.tags,
        link.source.chatName,
        link.source.messagePreview,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query);
    })
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Inbox;
}) {
  return (
    <Card size="sm">
      <CardHeader className="grid-cols-[1fr_auto]">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" />
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

export function AdminWorkspace() {
  const [sidebarDefaultOpen] = useState(loadSidebarDefaultOpen);
  const [store, setStore] = useState<AdminStoreV1>(loadAdminStore);
  const storeRef = useRef(store);
  const timersRef = useRef<number[]>([]);
  const [view, setView] = useState<AdminView>('pending');
  const [filters, setFilters] = useState<LinkFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [runningJob, setRunningJob] = useState<ScanJobMock | null>(null);

  useEffect(() => {
    saveAdminStore(store);
    storeRef.current = store;
  }, [store]);

  useEffect(
    () => () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
    },
    [],
  );

  const pendingCount = store.links.filter(
    (link) => link.status === 'pending',
  ).length;
  const today = new Date().toLocaleDateString('en-CA');
  const todayCount = store.links.filter(
    (link) => new Date(link.createdAt).toLocaleDateString('en-CA') === today,
  ).length;
  const filteredLinks = filterLinks(store.links, view, filters);
  const pageCount = Math.max(1, Math.ceil(filteredLinks.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visibleLinks = filteredLinks.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const selectedLinks = store.links.filter((link) => selectedIds.has(link.id));
  const editingLink =
    store.links.find((link) => link.id === editingLinkId) ?? null;
  const latestJob = store.jobs[0];
  const latestScanLabel = runningJob
    ? scanStageLabels[runningJob.stage ?? 'connecting']
    : latestJob
      ? `${latestJob.status === 'success' ? '成功' : '失败'} · ${formatDateTime(latestJob.startedAt)}`
      : '尚未扫描';

  function updateStore(next: AdminStoreV1) {
    storeRef.current = next;
    setStore(next);
  }

  function changeView(nextView: AdminView) {
    setView(nextView);
    setPage(1);
    setSelectedIds(new Set());
    setFilters(initialFilters);
  }

  function changeFilters(nextFilters: LinkFilters) {
    setFilters(nextFilters);
    setPage(1);
    setSelectedIds(new Set());
  }

  function resetFilters() {
    changeFilters(initialFilters);
  }

  function saveLink(link: ManagedLinkMock) {
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((item) =>
        item.id === link.id ? link : item,
      ),
    });
    setEditingLinkId(null);
  }

  function applyBulkPatch(patch: BulkPatch) {
    if (Object.keys(patch).length === 0) {
      toast.info('没有选择需要批量修改的字段');
      return;
    }
    const now = new Date().toISOString();
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((link) => {
        if (!selectedIds.has(link.id)) {
          return link;
        }
        return {
          ...link,
          project: patch.project ?? link.project,
          category: patch.category ?? link.category,
          environment: patch.environment ?? link.environment,
          tags: patch.tags
            ? [...new Set([...link.tags, ...patch.tags])]
            : link.tags,
          updatedAt: now,
        };
      }),
    });
    toast.success(`已更新 ${selectedIds.size} 条链接`);
    setSelectedIds(new Set());
  }

  function completeSelected() {
    const eligibleIds = new Set(
      selectedLinks.filter(canCompleteLink).map((link) => link.id),
    );
    const skipped = selectedLinks.length - eligibleIds.size;
    const now = new Date().toISOString();
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((link) =>
        eligibleIds.has(link.id)
          ? { ...link, status: 'organized', updatedAt: now }
          : link,
      ),
    });
    if (eligibleIds.size > 0) {
      toast.success(`已完成 ${eligibleIds.size} 条链接`);
    }
    if (skipped > 0) {
      toast.warning(`${skipped} 条缺少必填信息，仍保留在待整理队列`);
    }
    setSelectedIds(new Set());
  }

  function startScan(configuration: ScanConfiguration) {
    if (runningJob) {
      toast.warning('已有扫描任务正在运行');
      return;
    }

    const startedAt = new Date();
    const id = `scan-${startedAt.getTime()}`;
    const chatNames = telegramChats
      .filter((chat) => configuration.chatIds.includes(chat.id))
      .map((chat) => chat.name);
    const baseJob: ScanJobMock = {
      id,
      status: 'running',
      stage: 'connecting',
      progress: 8,
      chatNames,
      rangeLabel: rangeLabel(configuration),
      startedAt: startedAt.toISOString(),
      messageCount: 0,
      foundCount: 0,
      newCount: 0,
      duplicateCount: 0,
    };

    setRunningJob(baseJob);
    toast.info('模拟扫描已开始，可继续整理其他链接');

    stageTimeline.forEach((step) => {
      const timer = window.setTimeout(() => {
        setRunningJob((current) =>
          current?.id === id
            ? { ...current, stage: step.stage, progress: step.progress }
            : current,
        );
      }, step.delay);
      timersRef.current.push(timer);
    });

    const finishTimer = window.setTimeout(() => {
      const currentStore = storeRef.current;
      const candidates = scanCandidates.filter((candidate) =>
        configuration.chatIds.includes(candidate.source.chatId),
      );
      const existingUrls = new Set(
        currentStore.links.map((link) => normalizeUrl(link.url)),
      );
      const uniqueCandidates = candidates.filter(
        (candidate) => !existingUrls.has(normalizeUrl(candidate.url)),
      );
      const now = new Date();
      const newLinks: ManagedLinkMock[] = uniqueCandidates.map(
        (candidate, index) => {
          const url = normalizeUrl(candidate.url);
          return {
            id: `${id}-link-${index + 1}`,
            title: candidate.title,
            url,
            domain: new URL(url).hostname,
            project: configuration.defaultProject || candidate.project,
            purpose: candidate.purpose,
            environment: candidate.environment,
            category: configuration.defaultCategory || candidate.category,
            tags: [
              ...new Set([...candidate.tags, ...configuration.defaultTags]),
            ],
            status: 'pending',
            source: candidate.source,
            scanJobId: id,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
        },
      );
      const completedJob: ScanJobMock = {
        ...baseJob,
        status: 'success',
        progress: 100,
        stage: 'saving',
        finishedAt: now.toISOString(),
        messageCount: configuration.chatIds.length * 42,
        foundCount: candidates.length,
        newCount: newLinks.length,
        duplicateCount: candidates.length - newLinks.length,
        durationMs: now.getTime() - startedAt.getTime(),
      };

      updateStore({
        ...currentStore,
        links: [...newLinks, ...currentStore.links],
        jobs: [completedJob, ...currentStore.jobs],
      });
      setRunningJob(null);
      setView('pending');
      setFilters(initialFilters);
      setPage(1);
      setSelectedIds(new Set());
      toast.success(
        `扫描完成：新增 ${newLinks.length} 条，跳过 ${completedJob.duplicateCount} 条重复`,
      );
    }, 3_500);
    timersRef.current.push(finishTimer);
  }

  function addTaxonomy(kind: TaxonomyKind, value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      return '名称不能为空。';
    }
    if (
      storeRef.current.taxonomy[kind].some(
        (item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      )
    ) {
      return '已存在同名条目。';
    }
    updateStore({
      ...storeRef.current,
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: [...storeRef.current.taxonomy[kind], trimmed],
      },
    });
    return null;
  }

  function renameTaxonomy(
    kind: TaxonomyKind,
    oldValue: string,
    newValue: string,
  ) {
    const trimmed = newValue.trim();
    if (!trimmed) {
      return '名称不能为空。';
    }
    if (
      storeRef.current.taxonomy[kind].some(
        (item) =>
          item !== oldValue &&
          item.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
      )
    ) {
      return '已存在同名条目。';
    }
    if (oldValue === trimmed) {
      return null;
    }

    const links = storeRef.current.links.map((link) => {
      if (kind === 'projects' && link.project === oldValue) {
        return { ...link, project: trimmed };
      }
      if (kind === 'categories' && link.category === oldValue) {
        return { ...link, category: trimmed };
      }
      if (kind === 'tags' && link.tags.includes(oldValue)) {
        return {
          ...link,
          tags: link.tags.map((tag) => (tag === oldValue ? trimmed : tag)),
        };
      }
      return link;
    });
    updateStore({
      ...storeRef.current,
      links,
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: storeRef.current.taxonomy[kind].map((item) =>
          item === oldValue ? trimmed : item,
        ),
      },
    });
    return null;
  }

  function deleteTaxonomy(kind: TaxonomyKind, value: string) {
    updateStore({
      ...storeRef.current,
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: storeRef.current.taxonomy[kind].filter(
          (item) => item !== value,
        ),
      },
    });
  }

  return (
    <SidebarProvider
      defaultOpen={sidebarDefaultOpen}
      style={{ '--sidebar-width': '15rem' } as CSSProperties}
    >
      <AdminSidebar
        activeView={view}
        pendingCount={pendingCount}
        totalCount={store.links.length}
        jobCount={store.jobs.length}
        onViewChange={changeView}
      />
      <SidebarInset className="min-w-0">
        <WorkspaceHeader
          latestScanLabel={latestScanLabel}
          running={runningJob !== null}
          onStartScan={() => setScanDialogOpen(true)}
        />

        <main
          id="admin-content"
          className="scroll-mt-16 px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          <div className="mx-auto grid min-w-0 max-w-[1480px] gap-5 [&>*]:min-w-0">
            <section
              aria-label="工作台概览"
              className="grid grid-cols-2 gap-3 xl:grid-cols-4"
            >
              <StatCard
                label="待整理"
                value={pendingCount}
                detail="需要补充项目与用途"
                icon={Inbox}
              />
              <StatCard
                label="今日新增"
                value={todayCount}
                detail="来自本地扫描演示"
                icon={Plus}
              />
              <StatCard
                label="链接总数"
                value={store.links.length}
                detail={`${store.links.length - pendingCount} 条已整理`}
                icon={Database}
              />
              <StatCard
                label="最近扫描"
                value={
                  runningJob
                    ? `${runningJob.progress}%`
                    : latestJob?.status === 'failed'
                      ? '失败'
                      : '成功'
                }
                detail={
                  runningJob
                    ? scanStageLabels[runningJob.stage ?? 'connecting']
                    : latestJob
                      ? formatDateTime(latestJob.startedAt)
                      : '尚无记录'
                }
                icon={runningJob ? Activity : CheckCircle2}
              />
            </section>

            {runningJob ? (
              <Alert>
                <LoaderCircle className="animate-spin" />
                <AlertTitle>
                  正在{scanStageLabels[runningJob.stage ?? 'connecting']}
                </AlertTitle>
                <AlertDescription className="flex items-center gap-3">
                  <Progress
                    value={runningJob.progress}
                    className="max-w-md flex-1"
                  />
                  <span className="font-mono text-xs">
                    {runningJob.progress}%
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}

            {view === 'jobs' ? (
              <ScanJobsView jobs={store.jobs} runningJob={runningJob} />
            ) : view === 'taxonomy' ? (
              <TaxonomyView
                taxonomy={store.taxonomy}
                links={store.links}
                onAdd={addTaxonomy}
                onRename={renameTaxonomy}
                onDelete={deleteTaxonomy}
              />
            ) : (
              <section aria-labelledby="review-heading" className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2
                      id="review-heading"
                      className="text-xl font-semibold tracking-tight sm:text-2xl"
                    >
                      {view === 'pending' ? '待整理队列' : '全部链接'}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {view === 'pending'
                        ? '补充项目、用途和分类后标记完成。'
                        : '检索并维护本地演示链接的整理状态。'}
                    </p>
                  </div>
                  <Badge variant="outline">{filteredLinks.length} 条结果</Badge>
                </div>
                <LinkFiltersBar
                  filters={filters}
                  links={store.links}
                  taxonomy={store.taxonomy}
                  showStatus={view === 'all'}
                  resultCount={filteredLinks.length}
                  onChange={changeFilters}
                  onReset={resetFilters}
                />
                <BulkActions
                  selectedLinks={selectedLinks}
                  taxonomy={store.taxonomy}
                  onClear={() => setSelectedIds(new Set())}
                  onApply={applyBulkPatch}
                  onComplete={completeSelected}
                />
                <div id="link-results">
                  <LinkList
                    links={visibleLinks}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onOpenLink={(link) => setEditingLinkId(link.id)}
                    onResetFilters={resetFilters}
                  />
                </div>
                <LinkPagination
                  page={safePage}
                  pageCount={pageCount}
                  total={filteredLinks.length}
                  onPageChange={(nextPage) => {
                    setPage(nextPage);
                    setSelectedIds(new Set());
                  }}
                />
              </section>
            )}
          </div>
        </main>
      </SidebarInset>

      <ScanDialog
        open={scanDialogOpen}
        taxonomy={store.taxonomy}
        onOpenChange={setScanDialogOpen}
        onSubmit={startScan}
      />
      {editingLink ? (
        <LinkEditSheet
          key={editingLink.id}
          link={editingLink}
          taxonomy={store.taxonomy}
          onOpenChange={(open) => {
            if (!open) {
              setEditingLinkId(null);
            }
          }}
          onSave={saveLink}
        />
      ) : null}
    </SidebarProvider>
  );
}
