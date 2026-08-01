import type {
  LinkResponseDto,
  SyncJobResponseDto,
  TaxonomyItemResponseDto,
} from '@/api/types.gen';
import { jobs, links, taxonomy } from '@/data/mock-data';

export interface DemoTaxonomyState {
  categories: TaxonomyItemResponseDto[];
  projects: TaxonomyItemResponseDto[];
  tags: TaxonomyItemResponseDto[];
}

export interface AdminStoreV2 {
  jobs: SyncJobResponseDto[];
  links: LinkResponseDto[];
  taxonomy: DemoTaxonomyState;
  version: 2;
}

export const ADMIN_STORE_KEY = 'telegram-links-admin:v2';
export const PAGE_SIZE = 8;

export const environmentLabels: Record<LinkResponseDto['environment'], string> =
  {
    production: '正式',
    test: '测试',
    development: '开发',
    unknown: '未知',
  };

export const statusLabels: Record<LinkResponseDto['status'], string> = {
  pending: '待整理',
  organized: '已整理',
};

export const scanStageLabels: Record<
  NonNullable<SyncJobResponseDto['stage']>,
  string
> = {
  connecting: '连接 Telegram',
  reading: '读取消息',
  extracting: '提取链接',
  deduplicating: '检查重复',
  saving: '保存结果',
};

export function createInitialAdminStore(): AdminStoreV2 {
  return structuredClone({ jobs, links, taxonomy, version: 2 });
}

export function loadAdminStore(): AdminStoreV2 {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORE_KEY);
    if (!raw) {
      return createInitialAdminStore();
    }

    const parsed = JSON.parse(raw) as Partial<AdminStoreV2>;
    if (
      parsed.version !== 2 ||
      !Array.isArray(parsed.links) ||
      !Array.isArray(parsed.jobs) ||
      !parsed.taxonomy ||
      !Array.isArray(parsed.taxonomy.projects) ||
      !Array.isArray(parsed.taxonomy.categories) ||
      !Array.isArray(parsed.taxonomy.tags)
    ) {
      return createInitialAdminStore();
    }

    return parsed as AdminStoreV2;
  } catch {
    return createInitialAdminStore();
  }
}

export function saveAdminStore(store: AdminStoreV2): void {
  window.localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(store));
}

export function normalizeUrl(value: string): string {
  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/u, '');
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getDomain(value: string): string {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function canCompleteLink(link: LinkResponseDto): boolean {
  return Boolean(
    link.title.trim() &&
    isValidHttpUrl(link.url) &&
    link.project &&
    link.purpose?.trim() &&
    link.category,
  );
}

export function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDuration(
  startedAt?: string | null,
  finishedAt?: string | null,
): string {
  if (!startedAt || !finishedAt) {
    return '—';
  }
  const value = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(1)} 秒`;
}
