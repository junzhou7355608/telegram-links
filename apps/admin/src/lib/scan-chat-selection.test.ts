import type { TelegramChatScanOptionResponseDto } from '@/api/types.gen';
import {
  filterScanChats,
  resolveScanChatIds,
  toggleScanChat,
} from '@/lib/scan-chat-selection';
import { describe, expect, it } from 'vitest';

const chats: TelegramChatScanOptionResponseDto[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    telegramPeerId: '-1001',
    title: '研发协作群',
    type: 'group',
    username: 'Dev_Team',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    telegramPeerId: '42',
    title: 'Jun Chow',
    type: 'saved',
    username: null,
  },
];

describe('scan chat selection', () => {
  it('selects every available chat by default and preserves an explicit clear', () => {
    expect(resolveScanChatIds(chats, null)).toEqual(chats.map(({ id }) => id));
    expect(resolveScanChatIds(chats, [])).toEqual([]);
  });

  it('materializes the default selection before toggling a chat', () => {
    expect(
      toggleScanChat(
        chats.map(({ id }) => id),
        null,
        chats[0]!.id,
      ),
    ).toEqual([chats[1]!.id]);
  });

  it('filters without changing the selected chat set', () => {
    expect(filterScanChats(chats, 'dev_team')).toEqual([chats[0]]);
    expect(filterScanChats(chats, '42')).toEqual([chats[1]]);
  });
});
