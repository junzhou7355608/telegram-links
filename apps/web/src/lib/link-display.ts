import type { LinkResponseDto } from '@/api/types.gen';

const capturedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function displayLinkTitle(link: LinkResponseDto): string {
  return link.title.trim() || link.domain || link.url;
}

export function formatCapturedAt(capturedAt: string | null | undefined) {
  return capturedAt ? capturedAtFormatter.format(new Date(capturedAt)) : '未知';
}

export function formatLatestSync(finishedAt: string | null | undefined) {
  return finishedAt ? formatCapturedAt(finishedAt) : '尚未同步';
}
