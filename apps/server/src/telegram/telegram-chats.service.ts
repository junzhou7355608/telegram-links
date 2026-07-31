import { Injectable, NotFoundException } from '@nestjs/common';
import { TelegramChatType } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { paginationMeta } from '../common/pagination.dto';
import { TelegramAuthService } from './telegram-auth.service';
import { type GatewayChatType, TelegramGateway } from './telegram.gateway';

const ACCOUNT_ID = 'default';

function toChatType(value: GatewayChatType): TelegramChatType {
  const mapping: Record<GatewayChatType, TelegramChatType> = {
    channel: TelegramChatType.CHANNEL,
    group: TelegramChatType.GROUP,
    private: TelegramChatType.PRIVATE,
    saved: TelegramChatType.SAVED,
  };
  return mapping[value];
}

@Injectable()
export class TelegramChatsService {
  constructor(
    private readonly auth: TelegramAuthService,
    private readonly gateway: TelegramGateway,
    private readonly prisma: PrismaService,
  ) {}

  async refresh() {
    this.auth.requireAuthorized();
    const dialogs = await this.gateway.getDialogs();
    await this.prisma.$transaction(async (transaction) => {
      await transaction.telegramChat.updateMany({
        data: { isAvailable: false },
        where: { accountId: ACCOUNT_ID },
      });
      for (const dialog of dialogs) {
        await transaction.telegramChat.upsert({
          create: {
            accountId: ACCOUNT_ID,
            isAvailable: true,
            telegramPeerId: dialog.telegramPeerId,
            title: dialog.title,
            type: toChatType(dialog.type),
            username: dialog.username,
          },
          update: {
            isAvailable: true,
            title: dialog.title,
            type: toChatType(dialog.type),
            username: dialog.username,
          },
          where: {
            accountId_telegramPeerId: {
              accountId: ACCOUNT_ID,
              telegramPeerId: dialog.telegramPeerId,
            },
          },
        });
      }
    });
    return { count: dialogs.length, refreshedAt: new Date().toISOString() };
  }

  async list(input: {
    page: number;
    pageSize: number;
    query?: string;
    type?: string;
  }) {
    const where = {
      accountId: ACCOUNT_ID,
      ...(input.query
        ? {
            OR: [
              {
                title: { contains: input.query, mode: 'insensitive' as const },
              },
              {
                username: {
                  contains: input.query,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(input.type
        ? { type: input.type.toUpperCase() as TelegramChatType }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.telegramChat.findMany({
        orderBy: [{ isEnabled: 'desc' }, { title: 'asc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        where,
      }),
      this.prisma.telegramChat.count({ where }),
    ]);
    return {
      items: items.map((chat) => ({
        ...chat,
        type: chat.type.toLowerCase(),
      })),
      pagination: paginationMeta(input.page, input.pageSize, total),
    };
  }

  async setEnabled(id: string, isEnabled: boolean) {
    const exists = await this.prisma.telegramChat.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException({
        code: 'CHAT_NOT_FOUND',
        message: '未找到 Telegram 聊天。',
      });
    }
    const chat = await this.prisma.telegramChat.update({
      data: { isEnabled },
      where: { id },
    });
    return { ...chat, type: chat.type.toLowerCase() };
  }
}
