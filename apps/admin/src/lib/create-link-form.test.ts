import { describe, expect, it } from 'vitest';
import { createLinkSubmission, type CreateLinkDraft } from './create-link-form';

const draft: CreateLinkDraft = {
  categoryId: '',
  purpose: '  稍后阅读  ',
  tagIds: ['00000000-0000-4000-8000-000000000201'],
  title: '  示例链接  ',
  url: '  https://example.com/docs  ',
};

describe('createLinkSubmission', () => {
  it('builds a pending draft without requiring a category', () => {
    expect(createLinkSubmission(draft, 'pending')).toEqual({
      body: {
        categoryId: null,
        purpose: '稍后阅读',
        status: 'pending',
        tagIds: draft.tagIds,
        title: '示例链接',
        url: 'https://example.com/docs',
      },
    });
  });

  it('builds an organized link when a category is selected', () => {
    expect(
      createLinkSubmission(
        {
          ...draft,
          categoryId: '00000000-0000-4000-8000-000000000101',
        },
        'organized',
      ),
    ).toMatchObject({
      body: {
        categoryId: '00000000-0000-4000-8000-000000000101',
        status: 'organized',
      },
    });
  });

  it('rejects missing titles, invalid URLs and organized links without a category', () => {
    expect(createLinkSubmission({ ...draft, title: ' ' }, 'pending')).toEqual({
      error: '请输入链接标题。',
    });
    expect(
      createLinkSubmission({ ...draft, url: 'invalid' }, 'pending'),
    ).toEqual({ error: 'URL 必须是有效的 HTTP 或 HTTPS 地址。' });
    expect(createLinkSubmission(draft, 'organized')).toEqual({
      error: '完成整理前，请选择分类。',
    });
  });
});
