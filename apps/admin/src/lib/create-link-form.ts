import type { CreateLinkDto } from '@/api/types.gen';
import { isValidHttpUrl } from '@/lib/admin-display';

export interface CreateLinkDraft {
  categoryId: string;
  purpose: string;
  tagIds: string[];
  title: string;
  url: string;
}

type CreateLinkStatus = NonNullable<CreateLinkDto['status']>;

export type CreateLinkSubmission = { body: CreateLinkDto } | { error: string };

export function createLinkSubmission(
  draft: CreateLinkDraft,
  status: CreateLinkStatus,
): CreateLinkSubmission {
  const body: CreateLinkDto = {
    categoryId: draft.categoryId || null,
    purpose: draft.purpose.trim() || null,
    status,
    tagIds: draft.tagIds,
    title: draft.title.trim(),
    url: draft.url.trim(),
  };

  if (!body.title) {
    return { error: '请输入链接标题。' };
  }
  if (!isValidHttpUrl(body.url)) {
    return { error: 'URL 必须是有效的 HTTP 或 HTTPS 地址。' };
  }
  if (status === 'organized' && !body.categoryId) {
    return { error: '完成整理前，请选择分类。' };
  }
  return { body };
}
