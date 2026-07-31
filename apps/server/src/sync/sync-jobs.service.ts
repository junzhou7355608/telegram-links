import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  LinkEnvironment,
  OrganizationStatus,
  SyncJobChatStatus,
  SyncJobStatus,
  SyncRangeMode,
  SyncStage,
} from '../generated/prisma/client';
import { normalizeHttpUrl } from '../common/link-values';
import { paginationMeta } from '../common/pagination.dto';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { TelegramAuthService } from '../telegram/telegram-auth.service';
import { TelegramChatsService } from '../telegram/telegram-chats.service';
import {
  type GatewayMessage,
  type MessageRange,
  TelegramGateway,
} from '../telegram/telegram.gateway';

export type SyncRangeValue =
  | 'sinceLast'
  | 'last7Days'
  | 'custom'
  | 'allHistory';

export interface CreateSyncJobInput {
  chatIds?: string[];
  defaultCategoryId?: string;
  defaultProjectId?: string;
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
      const chats = await this.prisma.telegramChat.findMany({
        where: input.chatIds?.length
          ? { id: { in: [...new Set(input.chatIds)] }, isAvailable: true }
          : { isAvailable: true, isEnabled: true },
      });
      const expectedCount = input.chatIds
        ? new Set(input.chatIds).size
        : chats.length;
      if (chats.length === 0 || chats.length !== expectedCount) {
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
          defaultProjectId: input.defaultProjectId,
          defaultTagIds: [...new Set(input.defaultTagIds ?? [])],
          rangeFrom: input.rangeFrom,
          rangeMode: toRangeMode(input.rangeMode),
          rangeTo: input.rangeTo,
        },
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
        include: { chats: true },
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
      include: { chats: true },
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
      defaultProjectId: string | null;
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
        title: string;
        type: string;
        username: string | null;
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
      defaultProjectId: string | null;
      defaultTagIds: unknown;
      id: string;
    },
    chat: {
      id: string;
    },
    message: GatewayMessage,
  ) {
    const urls = new Map<
      string,
      { domain: string; normalizedUrl: string; rawUrl: string; url: string }
    >();
    for (const rawUrl of message.urls) {
      const normalized = normalizeHttpUrl(rawUrl);
      if (normalized) {
        urls.set(normalized.normalizedUrl, { ...normalized, rawUrl });
      }
    }
    if (urls.size === 0) {
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
      let newCount = 0;
      let duplicateCount = 0;
      for (const value of urls.values()) {
        let link = await transaction.link.findUnique({
          where: { normalizedUrl: value.normalizedUrl },
        });
        if (!link) {
          link = await transaction.link.create({
            data: {
              categoryId: job.defaultCategoryId,
              domain: value.domain,
              environment: LinkEnvironment.UNKNOWN,
              firstDiscoveredAt: message.sentAt,
              normalizedUrl: value.normalizedUrl,
              projectId: job.defaultProjectId,
              status: OrganizationStatus.PENDING,
              tags: {
                create: this.defaultTagIds(job.defaultTagIds).map((tagId) => ({
                  tagId,
                })),
              },
              title: value.domain,
              url: value.url,
            },
          });
          newCount += 1;
        } else {
          duplicateCount += 1;
        }
        await transaction.linkSource.upsert({
          create: {
            linkId: link.id,
            messageId: storedMessage.id,
            rawUrl: value.rawUrl,
            syncJobId: job.id,
          },
          update: { rawUrl: value.rawUrl },
          where: {
            linkId_messageId: { linkId: link.id, messageId: storedMessage.id },
          },
        });
      }
      return {
        duplicateCount,
        foundCount: urls.size,
        newCount,
      };
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
    const [projectCount, categoryCount, tagCount] = await Promise.all([
      input.defaultProjectId
        ? this.prisma.project.count({ where: { id: input.defaultProjectId } })
        : Promise.resolve(1),
      input.defaultCategoryId
        ? this.prisma.category.count({ where: { id: input.defaultCategoryId } })
        : Promise.resolve(1),
      this.prisma.tag.count({ where: { id: { in: tagIds } } }),
    ]);
    if (
      projectCount !== 1 ||
      categoryCount !== 1 ||
      tagCount !== tagIds.length
    ) {
      throw new BadRequestException({
        code: 'INVALID_SYNC_DEFAULTS',
        message: '同步任务引用了不存在的项目、分类或标签。',
      });
    }
  }

  private defaultTagIds(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private toResponse(job: {
    chats?: Array<Record<string, unknown>>;
    createdAt: Date;
    defaultCategoryId: string | null;
    defaultProjectId: string | null;
    defaultTagIds: unknown;
    duplicateCount: number;
    error: string | null;
    finishedAt: Date | null;
    foundCount: number;
    id: string;
    messageCount: number;
    newCount: number;
    progress: number;
    rangeFrom: Date | null;
    rangeMode: string;
    rangeTo: Date | null;
    stage: string | null;
    startedAt: Date | null;
    status: string;
    updatedAt: Date;
  }) {
    return {
      ...job,
      rangeMode: enumValue(job.rangeMode),
      stage: enumValue(job.stage),
      status: enumValue(job.status),
      chats: job.chats?.map((chat) => ({
        ...chat,
        status:
          typeof chat['status'] === 'string'
            ? enumValue(chat['status'])
            : chat['status'],
      })),
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
