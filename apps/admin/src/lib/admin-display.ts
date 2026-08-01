import type { LinkResponseDto, SyncJobResponseDto } from '@/api/types.gen';

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

export function isActiveSyncJob(job?: SyncJobResponseDto | null): boolean {
  return job?.status === 'queued' || job?.status === 'running';
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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
