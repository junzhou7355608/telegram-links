import { initialAdminStore } from '@/data/mock-data';
import type {
  AdminStoreV1,
  LinkEnvironment,
  ManagedLinkMock,
  OrganizationStatus,
  ScanStage,
} from '@/types/admin';

export const ADMIN_STORE_KEY = 'telegram-links-admin:v1';
export const PAGE_SIZE = 8;

export const environmentLabels: Record<LinkEnvironment, string> = {
  production: '正式',
  test: '测试',
  development: '开发',
  unknown: '未知',
};

export const statusLabels: Record<OrganizationStatus, string> = {
  pending: '待整理',
  organized: '已整理',
};

export const scanStageLabels: Record<ScanStage, string> = {
  connecting: '连接 Telegram',
  reading: '读取消息',
  extracting: '提取链接',
  deduplicating: '检查重复',
  saving: '保存结果',
};

export function createInitialAdminStore(): AdminStoreV1 {
  return structuredClone(initialAdminStore);
}

export function loadAdminStore(): AdminStoreV1 {
  try {
    const raw = window.localStorage.getItem(ADMIN_STORE_KEY);
    if (!raw) {
      return createInitialAdminStore();
    }

    const parsed = JSON.parse(raw) as Partial<AdminStoreV1>;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.links) ||
      !Array.isArray(parsed.jobs) ||
      !parsed.taxonomy ||
      !Array.isArray(parsed.taxonomy.projects) ||
      !Array.isArray(parsed.taxonomy.categories) ||
      !Array.isArray(parsed.taxonomy.tags)
    ) {
      return createInitialAdminStore();
    }

    return parsed as AdminStoreV1;
  } catch {
    return createInitialAdminStore();
  }
}

export function saveAdminStore(store: AdminStoreV1) {
  window.localStorage.setItem(ADMIN_STORE_KEY, JSON.stringify(store));
}

export function normalizeUrl(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== '/') {
      url.pathname = url.pathname.replace(/\/+$/, '');
    }
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getDomain(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

export function canCompleteLink(link: ManagedLinkMock) {
  return Boolean(
    link.title.trim() &&
    isValidHttpUrl(link.url) &&
    link.project.trim() &&
    link.purpose.trim() &&
    link.category.trim(),
  );
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

export function formatDuration(value?: number) {
  if (value === undefined) {
    return '—';
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(1)} 秒`;
}
