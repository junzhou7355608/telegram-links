import type { AiClassificationContext } from './ai.gateway';
import type { GatewayMessage } from '../telegram/telegram.gateway';

function enumValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

export function buildAiContext(
  chat: { title: string; type: string },
  message: GatewayMessage,
): AiClassificationContext {
  const toContextMessage = (
    value: { sentAt: Date; senderName?: string; text: string },
    maxLength: number,
    relation: 'current' | 'next' | 'previous' | 'reply',
  ) => ({
    relation,
    sentAt: value.sentAt.toISOString(),
    senderName: value.senderName ?? null,
    text: value.text.slice(0, maxLength),
  });
  return {
    chat: { name: chat.title, type: enumValue(chat.type) },
    current: toContextMessage(message, 4096, 'current'),
    forwardSource: message.context.forwardSource ?? null,
    neighbors: [
      ...message.context.previous.map((value) =>
        toContextMessage(value, 1000, 'previous'),
      ),
      ...(message.context.next
        ? [toContextMessage(message.context.next, 1000, 'next')]
        : []),
    ],
    reply: message.context.reply
      ? toContextMessage(message.context.reply, 1000, 'reply')
      : null,
  };
}
