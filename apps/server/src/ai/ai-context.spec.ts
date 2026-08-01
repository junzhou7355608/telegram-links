import { buildAiContext } from './ai-context';

describe('buildAiContext', () => {
  it('keeps context order and applies per-message limits', () => {
    const context = buildAiContext(
      { title: '研发群', type: 'GROUP' },
      {
        context: {
          forwardSource: '转发来源',
          next: {
            sentAt: new Date('2026-08-01T00:04:00.000Z'),
            text: `后${'c'.repeat(1200)}`,
          },
          previous: [
            {
              sentAt: new Date('2026-08-01T00:01:00.000Z'),
              text: `前一${'a'.repeat(1200)}`,
            },
            {
              sentAt: new Date('2026-08-01T00:02:00.000Z'),
              text: '前二',
            },
          ],
          reply: {
            sentAt: new Date('2026-08-01T00:00:00.000Z'),
            text: `引用${'d'.repeat(1200)}`,
          },
        },
        messageId: 1,
        sentAt: new Date('2026-08-01T00:03:00.000Z'),
        text: `当前${'b'.repeat(5000)}`,
        urls: ['https://example.com'],
      },
    );

    expect(context.chat).toEqual({ name: '研发群', type: 'group' });
    expect(context.current.text).toHaveLength(4096);
    expect(context.neighbors.map(({ relation }) => relation)).toEqual([
      'previous',
      'previous',
      'next',
    ]);
    expect(context.neighbors.map(({ text }) => text.slice(0, 2))).toEqual([
      '前一',
      '前二',
      '后c',
    ]);
    expect(context.neighbors[0]?.text).toHaveLength(1000);
    expect(context.reply?.text).toHaveLength(1000);
    expect(context.forwardSource).toBe('转发来源');
  });
});
