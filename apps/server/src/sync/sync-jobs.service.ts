import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  OrganizationStatus,
  Prisma,
  SyncJobChatStatus,
  SyncJobStatus,
  SyncRangeMode,
  SyncStage,
} from '../generated/prisma/client';
import {
  normalizeHttpUrl,
  sanitizeTelegramHttpUrlCandidate,
} from '../common/link-values';
import { paginationMeta } from '../common/pagination.dto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { TelegramAuthService } from '../telegram/telegram-auth.service';
import { TelegramChatsService } from '../telegram/telegram-chats.service';
import {
  type GatewayMessage,
  type MessageRange,
  TelegramGateway,
} from '../telegram/telegram.gateway';

const syncJobInclude = {
  chats: true,
} satisfies Prisma.SyncJobInclude;

type SyncJobRecord = Prisma.SyncJobGetPayload<{
  include: typeof syncJobInclude;
}>;

export type SyncRangeValue =
  | 'sinceLast'
  | 'last7Days'
  | 'custom'
  | 'allHistory';

export interface CreateSyncJobInput {
  chatIds: string[];
  defaultCategoryId?: string;
  defaultTagIds?: string[];
  rangeFrom?: Date;
  rangeMode: SyncRangeValue;
  rangeTo?: Date;
}

function toRangeMode(value: SyncRangeValue): SyncRangeMode {
  const values: Record<SyncRangeValue, SyncRangeMode> = {
    allHistory: SyncRangeMode.ALL_HISTORY,
    custom: SyncRangeMode.CUSTOM,
    last7Days: SyncRangeMode.LAST_7_DAYS,
    sinceLast: SyncRangeMode.SINCE_LAST,
  };
  return values[value];
}

function enumValue(value: string | null): string | null {
  if (!value) {
    return null;
  }
  return value
    .toLowerCase()
    .replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

@Injectable()
export class SyncJobsService implements OnModuleInit {
  private readonly logger = new Logger(SyncJobsService.name);
  private creating = false;
  private runningJobId: string | null = null;

  constructor(
    private readonly auth: TelegramAuthService,
    private readonly chats: TelegramChatsService,
    private readonly gateway: TelegramGateway,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.syncJob.updateMany({
      data: {
        error: 'Server restarted before the task completed.',
        finishedAt: new Date(),
        status: SyncJobStatus.INTERRUPTED,
      },
      where: { status: { in: [SyncJobStatus.QUEUED, SyncJobStatus.RUNNING] } },
    });
  }

  async create(input: CreateSyncJobInput) {
    this.auth.requireAuthorized();
    if (this.creating) {
      throw this.activeJobConflict();
    }
    this.creating = true;
    try {
      const active = await this.prisma.syncJob.findFirst({
        where: {
          status: { in: [SyncJobStatus.QUEUED, SyncJobStatus.RUNNING] },
        },
      });
      if (active || this.runningJobId) {
        throw this.activeJobConflict();
      }
      this.validateRange(input);
      await this.validateDefaults(input);
      const chatIds = [...new Set(input.chatIds)];
      const chats = await this.prisma.telegramChat.findMany({
        where: { id: { in: chatIds }, isAvailable: true },
      });
      if (chats.length === 0 || chats.length !== chatIds.length) {
        throw new BadRequestException({
          code: 'INVALID_SYNC_CHATS',
          message: '请至少选择一个可用的 Telegram 聊天。',
        });
      }

      const job = await this.prisma.syncJob.create({
        data: {
          chats: {
            create: chats.map((chat) => ({
              chatId: chat.id,
              chatTitle: chat.title,
            })),
          },
          defaultCategoryId: input.defaultCategoryId,
          defaultTagIds: [...new Set(input.defaultTagIds ?? [])],
          rangeFrom: input.rangeFrom,
          rangeMode: toRangeMode(input.rangeMode),
          rangeTo: input.rangeTo,
        },
        include: syncJobInclude,
      });
      queueMicrotask(() => void this.run(job.id));
      return this.toResponse(job);
    } finally {
      this.creating = false;
    }
  }

  async list(page: number, pageSize: number) {
    const [items, total] = await Promise.all([
      this.prisma.syncJob.findMany({
        include: syncJobInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.syncJob.count(),
    ]);
    return {
      items: items.map((job) => this.toResponse(job)),
      pagination: paginationMeta(page, pageSize, total),
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.syncJob.findUnique({
      include: syncJobInclude,
      where: { id },
    });
    if (!job) {
      throw new NotFoundException({
        code: 'SYNC_JOB_NOT_FOUND',
        message: '未找到同步任务。',
      });
    }
    return this.toResponse(job);
  }

  private async run(id: string): Promise<void> {
    this.runningJobId = id;
    try {
      await this.prisma.syncJob.update({
        data: {
          progress: 5,
          stage: SyncStage.CONNECTING,
          startedAt: new Date(),
          status: SyncJobStatus.RUNNING,
        },
        where: { id },
      });
      await this.chats.refresh();
      const job = await this.prisma.syncJob.findUniqueOrThrow({
        include: { chats: { include: { chat: true } } },
        where: { id },
      });
      await this.prisma.syncJob.update({
        data: { progress: 10, stage: SyncStage.READING },
        where: { id },
      });
      let completed = 0;
      for (const jobChat of job.chats) {
        await this.runChat(job, jobChat);
        completed += 1;
        await this.prisma.syncJob.update({
          data: {
            progress: 10 + Math.round((completed / job.chats.length) * 80),
            stage: SyncStage.EXTRACTING,
          },
          where: { id },
        });
      }
      await this.prisma.syncJob.update({
        data: { progress: 95, stage: SyncStage.DEDUPLICATING },
        where: { id },
      });
      await this.finish(id);
    } catch (error) {
      this.logger.error(`同步任务 ${id} 失败：${this.errorMessage(error)}`);
      await this.prisma.syncJob.update({
        data: {
          error: this.errorMessage(error),
          finishedAt: new Date(),
          progress: 100,
          status: SyncJobStatus.FAILED,
        },
        where: { id },
      });
    } finally {
      this.runningJobId = null;
    }
  }

  private async runChat(
    job: {
      defaultCategoryId: string | null;
      defaultTagIds: unknown;
      id: string;
      rangeFrom: Date | null;
      rangeMode: SyncRangeMode;
      rangeTo: Date | null;
    },
    jobChat: {
      chat: {
        id: string;
        lastSyncedMessageId: number | null;
        telegramPeerId: string;
      };
      id: string;
    },
  ): Promise<void> {
    const startedAt = new Date();
    const counters = {
      duplicateCount: 0,
      foundCount: 0,
      messageCount: 0,
      newCount: 0,
    };
    let maxMessageId = jobChat.chat.lastSyncedMessageId ?? 0;
    await this.prisma.syncJobChat.update({
      data: { startedAt, status: SyncJobChatStatus.RUNNING },
      where: { id: jobChat.id },
    });

    try {
      const range = this.messageRange(job, jobChat.chat.lastSyncedMessageId);
      for await (const message of this.gateway.getMessages(
        jobChat.chat.telegramPeerId,
        range,
      )) {
        counters.messageCount += 1;
        maxMessageId = Math.max(maxMessageId, message.messageId);
        const result = await this.persistMessage(job, jobChat.chat, message);
        counters.foundCount += result.foundCount;
        counters.newCount += result.newCount;
        counters.duplicateCount += result.duplicateCount;
      }
      await this.prisma.$transaction(async (transaction) => {
        await transaction.syncJobChat.update({
          data: {
            ...counters,
            finishedAt: new Date(),
            maxProcessedMessageId: maxMessageId || null,
            status: SyncJobChatStatus.SUCCEEDED,
          },
          where: { id: jobChat.id },
        });
        await transaction.telegramChat.update({
          data: {
            lastSyncedAt: new Date(),
            lastSyncedMessageId: maxMessageId || undefined,
          },
          where: { id: jobChat.chat.id },
        });
      });
    } catch (error) {
      await this.prisma.syncJobChat.update({
        data: {
          ...counters,
          error: this.errorMessage(error),
          finishedAt: new Date(),
          status: SyncJobChatStatus.FAILED,
        },
        where: { id: jobChat.id },
      });
    }
  }

  private async persistMessage(
    job: {
      defaultCategoryId: string | null;
      defaultTagIds: unknown;
      id: string;
    },
    chat: { id: string },
    message: GatewayMessage,
  ) {
    type UrlValue = {
      domain: string;
      normalizedUrl: string;
      rawUrl: string;
      url: string;
    };
    const domains = new Map<
      string,
      { primary: UrlValue; variants: Map<string, UrlValue> }
    >();
    for (const rawUrl of message.urls) {
      const sanitizedRawUrl = sanitizeTelegramHttpUrlCandidate(rawUrl);
      const normalized = sanitizedRawUrl
        ? normalizeHttpUrl(sanitizedRawUrl)
        : null;
      if (!normalized) {
        continue;
      }
      const value = { ...normalized, rawUrl: sanitizedRawUrl };
      const current = domains.get(normalized.domain);
      if (current) {
        current.primary = value;
        current.variants.set(normalized.normalizedUrl, value);
      } else {
        domains.set(normalized.domain, {
          primary: value,
          variants: new Map([[normalized.normalizedUrl, value]]),
        });
      }
    }
    if (domains.size === 0) {
      return { duplicateCount: 0, foundCount: 0, newCount: 0 };
    }

    return this.prisma.$transaction(async (transaction) => {
      const storedMessage = await transaction.telegramMessage.upsert({
        create: {
          chatId: chat.id,
          messageUrl: message.messageUrl,
          senderName: message.senderName,
          senderTelegramId: message.senderTelegramId,
          sentAt: message.sentAt,
          telegramMessageId: message.messageId,
          text: message.text,
        },
        update: {
          messageUrl: message.messageUrl,
          senderName: message.senderName,
          senderTelegramId: message.senderTelegramId,
          sentAt: message.sentAt,
          text: message.text,
        },
        where: {
          chatId_telegramMessageId: {
            chatId: chat.id,
            telegramMessageId: message.messageId,
          },
        },
      });
      const defaultTagIds = this.defaultTagIds(job.defaultTagIds);
      let newCount = 0;
      let duplicateCount = 0;

      for (const { primary, variants } of domains.values()) {
        let link = await transaction.link.findUnique({
          include: { tags: true },
          where: { domain: primary.domain },
        });
        if (!link) {
          link = await transaction.link.create({
            include: { tags: true },
            data: {
              categoryId: job.defaultCategoryId,
              domain: primary.domain,
              firstDiscoveredAt: message.sentAt,
              normalizedUrl: primary.normalizedUrl,
              status: OrganizationStatus.PENDING,
              tags: {
                create: defaultTagIds.map((tagId) => ({ tagId })),
              },
              title: primary.domain,
              url: primary.url,
            },
          });
          newCount += 1;
        } else {
          duplicateCount += 1;
          if (
            link.archivedAt === null &&
            link.status === OrganizationStatus.PENDING &&
            (job.defaultCategoryId || defaultTagIds.length > 0)
          ) {
            const tagIds = [
              ...new Set([
                ...link.tags.map(({ tagId }) => tagId),
                ...defaultTagIds,
              ]),
            ];
            link = await transaction.link.update({
              include: { tags: true },
              data: {
                categoryId: link.categoryId ?? job.defaultCategoryId,
                tags: defaultTagIds.length
                  ? {
                      create: tagIds.map((tagId) => ({ tagId })),
                      deleteMany: {},
                    }
                  : undefined,
              },
              where: { id: link.id },
            });
          }
        }

        for (const value of variants.values()) {
          await transaction.linkSource.upsert({
            create: {
              linkId: link.id,
              messageId: storedMessage.id,
              normalizedUrl: value.normalizedUrl,
              rawUrl: value.rawUrl,
              syncJobId: job.id,
            },
            update: { rawUrl: value.rawUrl },
            where: {
              linkId_messageId_normalizedUrl: {
                linkId: link.id,
                messageId: storedMessage.id,
                normalizedUrl: value.normalizedUrl,
              },
            },
          });
        }
        const newerSource = await transaction.linkSource.findFirst({
          select: { id: true },
          where: {
            linkId: link.id,
            message: { sentAt: { gt: message.sentAt } },
          },
        });
        if (!newerSource) {
          await transaction.link.update({
            data: {
              normalizedUrl: primary.normalizedUrl,
              url: primary.url,
            },
            where: { id: link.id },
          });
        }
      }
      return { duplicateCount, foundCount: domains.size, newCount };
    });
  }

  private async finish(id: string): Promise<void> {
    const chats = await this.prisma.syncJobChat.findMany({
      where: { syncJobId: id },
    });
    const succeeded = chats.filter(
      (chat) => chat.status === SyncJobChatStatus.SUCCEEDED,
    ).length;
    const status =
      succeeded === chats.length
        ? SyncJobStatus.SUCCEEDED
        : succeeded === 0
          ? SyncJobStatus.FAILED
          : SyncJobStatus.PARTIALLY_SUCCEEDED;
    await this.prisma.syncJob.update({
      data: {
        duplicateCount: chats.reduce(
          (sum, chat) => sum + chat.duplicateCount,
          0,
        ),
        finishedAt: new Date(),
        foundCount: chats.reduce((sum, chat) => sum + chat.foundCount, 0),
        messageCount: chats.reduce((sum, chat) => sum + chat.messageCount, 0),
        newCount: chats.reduce((sum, chat) => sum + chat.newCount, 0),
        progress: 100,
        stage: SyncStage.SAVING,
        status,
      },
      where: { id },
    });
  }

  private messageRange(
    job: {
      rangeFrom: Date | null;
      rangeMode: SyncRangeMode;
      rangeTo: Date | null;
    },
    lastMessageId: number | null,
  ): MessageRange {
    if (job.rangeMode === SyncRangeMode.ALL_HISTORY) {
      return {};
    }
    if (job.rangeMode === SyncRangeMode.CUSTOM) {
      return {
        from: job.rangeFrom ?? undefined,
        to: job.rangeTo ?? undefined,
      };
    }
    if (job.rangeMode === SyncRangeMode.SINCE_LAST && lastMessageId) {
      return { minId: lastMessageId };
    }
    return { from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
  }

  private validateRange(input: CreateSyncJobInput): void {
    if (
      input.rangeMode === 'custom' &&
      (!input.rangeFrom || !input.rangeTo || input.rangeFrom > input.rangeTo)
    ) {
      throw new BadRequestException({
        code: 'INVALID_SYNC_RANGE',
        message: '自定义同步范围需要有效的起止时间。',
      });
    }
  }

  private async validateDefaults(input: CreateSyncJobInput): Promise<void> {
    const tagIds = [...new Set(input.defaultTagIds ?? [])];
    const [categoryCount, tagCount] = await Promise.all([
      input.defaultCategoryId
        ? this.prisma.category.count({ where: { id: input.defaultCategoryId } })
        : Promise.resolve(1),
      this.prisma.tag.count({ where: { id: { in: tagIds } } }),
    ]);
    if (categoryCount !== 1 || tagCount !== tagIds.length) {
      throw new BadRequestException({
        code: 'INVALID_SYNC_DEFAULTS',
        message: '同步任务引用了不存在的分类或标签。',
      });
    }
  }

  private defaultTagIds(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private toResponse(job: SyncJobRecord) {
    return {
      chats: job.chats.map((chat) => ({
        chatId: chat.chatId,
        chatTitle: chat.chatTitle,
        duplicateCount: chat.duplicateCount,
        error: chat.error,
        finishedAt: chat.finishedAt?.toISOString() ?? null,
        foundCount: chat.foundCount,
        id: chat.id,
        maxProcessedMessageId: chat.maxProcessedMessageId,
        messageCount: chat.messageCount,
        newCount: chat.newCount,
        startedAt: chat.startedAt?.toISOString() ?? null,
        status: enumValue(chat.status),
      })),
      createdAt: job.createdAt.toISOString(),
      defaultCategoryId: job.defaultCategoryId,
      defaultTagIds: this.defaultTagIds(job.defaultTagIds),
      duplicateCount: job.duplicateCount,
      error: job.error,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      foundCount: job.foundCount,
      id: job.id,
      messageCount: job.messageCount,
      newCount: job.newCount,
      progress: job.progress,
      rangeFrom: job.rangeFrom?.toISOString() ?? null,
      rangeMode: enumValue(job.rangeMode),
      rangeTo: job.rangeTo?.toISOString() ?? null,
      stage: enumValue(job.stage),
      startedAt: job.startedAt?.toISOString() ?? null,
      status: enumValue(job.status),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  private activeJobConflict() {
    return new ConflictException({
      code: 'SYNC_JOB_ACTIVE',
      message: '已有同步任务正在运行。',
    });
  }

  private errorMessage(error: unknown): string {
    const value = error as { errorMessage?: string; message?: string };
    return value.errorMessage ?? value.message ?? 'Unknown sync error';
  }
}
