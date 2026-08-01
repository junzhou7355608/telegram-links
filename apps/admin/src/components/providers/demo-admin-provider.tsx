import type {
  BatchLinkPatchDto,
  LinkResponseDto,
  SyncJobResponseDto,
  TaxonomyItemResponseDto,
} from '@/api/types.gen';
import {
  DemoAdminContext,
  type DemoAdminContextValue,
  type DemoScanConfiguration,
  type TaxonomyKind,
} from '@/components/providers/demo-admin-context';
import { scanCandidates, telegramChats } from '@/data/mock-data';
import {
  canCompleteLink,
  loadAdminStore,
  normalizeUrl,
  saveAdminStore,
  type AdminStoreV2,
} from '@/lib/admin-store';
import { router } from '@/lib/router';
import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { toast } from 'sonner';

const stageTimeline: Array<{
  delay: number;
  progress: number;
  stage: NonNullable<SyncJobResponseDto['stage']>;
}> = [
  { delay: 700, stage: 'reading', progress: 24 },
  { delay: 1_400, stage: 'extracting', progress: 52 },
  { delay: 2_100, stage: 'deduplicating', progress: 74 },
  { delay: 2_800, stage: 'saving', progress: 91 },
];

function refreshReferenceCounts(store: AdminStoreV2): AdminStoreV2 {
  const count = (kind: TaxonomyKind, id: string) => {
    if (kind === 'projects') {
      return store.links.filter((link) => link.project?.id === id).length;
    }
    if (kind === 'categories') {
      return store.links.filter((link) => link.category?.id === id).length;
    }
    return store.links.filter((link) => link.tags.some((tag) => tag.id === id))
      .length;
  };
  return {
    ...store,
    taxonomy: {
      categories: store.taxonomy.categories.map((item) => ({
        ...item,
        referenceCount: count('categories', item.id),
      })),
      projects: store.taxonomy.projects.map((item) => ({
        ...item,
        referenceCount: count('projects', item.id),
      })),
      tags: store.taxonomy.tags.map((item) => ({
        ...item,
        referenceCount: count('tags', item.id),
      })),
    },
  };
}

function taxonomyValue(
  store: AdminStoreV2,
  kind: TaxonomyKind,
  id?: string | null,
): TaxonomyItemResponseDto | null {
  if (!id) {
    return null;
  }
  return store.taxonomy[kind].find((item) => item.id === id) ?? null;
}

export function DemoAdminProvider({ children }: PropsWithChildren) {
  const [store, setStore] = useState(loadAdminStore);
  const [runningJob, setRunningJob] = useState<SyncJobResponseDto | null>(null);
  const storeRef = useRef(store);
  const timersRef = useRef<number[]>([]);

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

  function updateStore(next: AdminStoreV2) {
    const refreshed = refreshReferenceCounts(next);
    storeRef.current = refreshed;
    setStore(refreshed);
  }

  function saveLink(link: LinkResponseDto) {
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((item) =>
        item.id === link.id ? link : item,
      ),
    });
  }

  function applyBulkPatch(ids: ReadonlySet<string>, patch: BatchLinkPatchDto) {
    const current = storeRef.current;
    updateStore({
      ...current,
      links: current.links.map((link) => {
        if (!ids.has(link.id)) {
          return link;
        }
        const addedTags = (patch.addTagIds ?? [])
          .map((id) => taxonomyValue(current, 'tags', id))
          .filter((item): item is TaxonomyItemResponseDto => item !== null);
        const tags = patch.tagIds
          ? patch.tagIds
              .map((id) => taxonomyValue(current, 'tags', id))
              .filter((item): item is TaxonomyItemResponseDto => item !== null)
          : [...link.tags, ...addedTags].filter(
              (item, index, values) =>
                values.findIndex((value) => value.id === item.id) === index,
            );
        return {
          ...link,
          category:
            patch.categoryId === undefined
              ? link.category
              : taxonomyValue(current, 'categories', patch.categoryId),
          environment: patch.environment ?? link.environment,
          project:
            patch.projectId === undefined
              ? link.project
              : taxonomyValue(current, 'projects', patch.projectId),
          tags,
          updatedAt: new Date().toISOString(),
        };
      }),
    });
  }

  function completeLinks(ids: ReadonlySet<string>) {
    const eligibleIds = new Set(
      storeRef.current.links
        .filter((link) => ids.has(link.id) && canCompleteLink(link))
        .map((link) => link.id),
    );
    const skipped = ids.size - eligibleIds.size;
    const now = new Date().toISOString();
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((link) =>
        eligibleIds.has(link.id)
          ? { ...link, status: 'organized', updatedAt: now }
          : link,
      ),
    });
    return { completed: eligibleIds.size, skipped };
  }

  function startScan(configuration: DemoScanConfiguration) {
    if (runningJob) {
      toast.warning('已有扫描任务正在运行');
      return;
    }

    const startedAt = new Date();
    const id = crypto.randomUUID();
    const selectedChats = telegramChats.filter((chat) =>
      configuration.chatIds.includes(chat.id),
    );
    const baseJob: SyncJobResponseDto = {
      chats: selectedChats.map((chat) => ({
        chatId: chat.id,
        chatTitle: chat.title,
        duplicateCount: 0,
        error: null,
        finishedAt: null,
        foundCount: 0,
        id: crypto.randomUUID(),
        maxProcessedMessageId: null,
        messageCount: 0,
        newCount: 0,
        startedAt: null,
        status: 'pending',
      })),
      createdAt: startedAt.toISOString(),
      defaultCategoryId: configuration.defaultCategoryId ?? null,
      defaultProjectId: configuration.defaultProjectId ?? null,
      defaultTagIds: configuration.defaultTagIds,
      duplicateCount: 0,
      error: null,
      finishedAt: null,
      foundCount: 0,
      id,
      messageCount: 0,
      newCount: 0,
      progress: 8,
      rangeFrom: configuration.rangeFrom ?? null,
      rangeMode: configuration.rangeMode,
      rangeTo: configuration.rangeTo ?? null,
      stage: 'connecting',
      startedAt: startedAt.toISOString(),
      status: 'running',
      updatedAt: startedAt.toISOString(),
    };

    setRunningJob(baseJob);
    toast.info('模拟扫描已开始，可继续整理其他链接');

    stageTimeline.forEach((step) => {
      const timer = window.setTimeout(() => {
        setRunningJob((current) =>
          current?.id === id
            ? { ...current, progress: step.progress, stage: step.stage }
            : current,
        );
      }, step.delay);
      timersRef.current.push(timer);
    });

    const finishTimer = window.setTimeout(() => {
      const current = storeRef.current;
      const candidates = scanCandidates.filter((candidate) =>
        configuration.chatIds.includes(candidate.source.chatId),
      );
      const existingUrls = new Set(
        current.links.map((link) => normalizeUrl(link.url)),
      );
      const uniqueCandidates = candidates.filter(
        (candidate) => !existingUrls.has(normalizeUrl(candidate.url)),
      );
      const now = new Date();
      const project = taxonomyValue(
        current,
        'projects',
        configuration.defaultProjectId,
      );
      const category = taxonomyValue(
        current,
        'categories',
        configuration.defaultCategoryId,
      );
      const defaultTags = configuration.defaultTagIds
        .map((tagId) => taxonomyValue(current, 'tags', tagId))
        .filter((item): item is TaxonomyItemResponseDto => item !== null);
      const newLinks: LinkResponseDto[] = uniqueCandidates.map((candidate) => {
        const url = normalizeUrl(candidate.url);
        const latestSource = {
          ...candidate.source,
          id: crypto.randomUUID(),
          rawUrl: url,
        };
        return {
          archivedAt: null,
          category: category ?? candidate.category,
          createdAt: now.toISOString(),
          domain: new URL(url).hostname,
          environment: candidate.environment,
          firstDiscoveredAt: now.toISOString(),
          id: crypto.randomUUID(),
          isFavorite: false,
          latestSource,
          project: project ?? candidate.project,
          purpose: candidate.purpose,
          sourceCount: 1,
          sources: [latestSource],
          status: 'pending',
          tags: [...candidate.tags, ...defaultTags].filter(
            (item, index, values) =>
              values.findIndex((value) => value.id === item.id) === index,
          ),
          title: candidate.title,
          updatedAt: now.toISOString(),
          url,
        };
      });
      const completedJob: SyncJobResponseDto = {
        ...baseJob,
        chats: baseJob.chats.map((chat) => ({
          ...chat,
          finishedAt: now.toISOString(),
          status: 'succeeded',
        })),
        duplicateCount: candidates.length - newLinks.length,
        finishedAt: now.toISOString(),
        foundCount: candidates.length,
        messageCount: configuration.chatIds.length * 42,
        newCount: newLinks.length,
        progress: 100,
        stage: 'saving',
        status: 'succeeded',
        updatedAt: now.toISOString(),
      };

      updateStore({
        ...current,
        jobs: [completedJob, ...current.jobs],
        links: [...newLinks, ...current.links],
      });
      setRunningJob(null);
      void router.navigate({
        to: '/links/pending',
        search: { page: 1, sort: 'newest' },
      });
      toast.success(
        `扫描完成：新增 ${newLinks.length} 条，跳过 ${completedJob.duplicateCount} 条重复`,
      );
    }, 3_500);
    timersRef.current.push(finishTimer);
  }

  function addTaxonomy(kind: TaxonomyKind, value: string) {
    const name = value.trim();
    if (!name) {
      return '名称不能为空。';
    }
    if (
      storeRef.current.taxonomy[kind].some(
        (item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      return '已存在同名条目。';
    }
    updateStore({
      ...storeRef.current,
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: [
          ...storeRef.current.taxonomy[kind],
          { id: crypto.randomUUID(), name, referenceCount: 0 },
        ],
      },
    });
    return null;
  }

  function renameTaxonomy(kind: TaxonomyKind, id: string, value: string) {
    const name = value.trim();
    if (!name) {
      return '名称不能为空。';
    }
    if (
      storeRef.current.taxonomy[kind].some(
        (item) =>
          item.id !== id &&
          item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      return '已存在同名条目。';
    }
    const rename = <Item extends { id: string; name: string }>(
      item: Item,
    ): Item => (item.id === id ? { ...item, name } : item);
    updateStore({
      ...storeRef.current,
      links: storeRef.current.links.map((link) => ({
        ...link,
        category:
          kind === 'categories' && link.category
            ? rename(link.category)
            : link.category,
        project:
          kind === 'projects' && link.project
            ? rename(link.project)
            : link.project,
        tags: kind === 'tags' ? link.tags.map(rename) : link.tags,
      })),
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: storeRef.current.taxonomy[kind].map(rename),
      },
    });
    return null;
  }

  function deleteTaxonomy(kind: TaxonomyKind, id: string) {
    updateStore({
      ...storeRef.current,
      taxonomy: {
        ...storeRef.current.taxonomy,
        [kind]: storeRef.current.taxonomy[kind].filter(
          (item) => item.id !== id,
        ),
      },
    });
  }

  const value: DemoAdminContextValue = {
    addTaxonomy,
    applyBulkPatch,
    completeLinks,
    deleteTaxonomy,
    renameTaxonomy,
    runningJob,
    saveLink,
    startScan,
    store,
  };

  return (
    <DemoAdminContext.Provider value={value}>
      {children}
    </DemoAdminContext.Provider>
  );
}
