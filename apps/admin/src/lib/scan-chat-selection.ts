import type { TelegramChatScanOptionResponseDto } from '@/api/types.gen';

export function resolveScanChatIds(
  chats: TelegramChatScanOptionResponseDto[],
  selection: string[] | null,
): string[] {
  return selection ?? chats.map((chat) => chat.id);
}

export function toggleScanChat(
  chatIds: string[],
  selection: string[] | null,
  chatId: string,
): string[] {
  const next = new Set(selection ?? chatIds);
  if (next.has(chatId)) {
    next.delete(chatId);
  } else {
    next.add(chatId);
  }
  return [...next];
}

export function filterScanChats(
  chats: TelegramChatScanOptionResponseDto[],
  query: string,
): TelegramChatScanOptionResponseDto[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  if (!normalizedQuery) return chats;
  return chats.filter((chat) =>
    [chat.title, chat.username ?? '', chat.telegramPeerId].some((value) =>
      value.toLocaleLowerCase('zh-CN').includes(normalizedQuery),
    ),
  );
}
