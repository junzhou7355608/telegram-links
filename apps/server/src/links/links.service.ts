import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  fromOrganizationStatus,
  LinkSortValue,
  LinkViewValue,
  requireHttpUrl,
  toOrganizationStatus,
  WebLinkViewValue,
  OrganizationStatusValue,
} from '../common/link-values';
import { paginationMeta } from '../common/pagination.dto';

const linkInclude = {
  category: true,
  sources: {
    include: { message: { include: { chat: true } } },
  },
  tags: { include: { tag: true } },
} satisfies Prisma.LinkInclude;

type LinkRecord = Prisma.LinkGetPayload<{ include: typeof linkInclude }>;

function enumValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/_([a-z])/gu, (_, letter: string) => letter.toUpperCase());
}

export interface LinkListInput {
  categoryId?: string;
  includeArchived?: boolean;
  page: number;
  pageSize: number;
  query?: string;
  sort?: LinkSortValue;
  sourceChatId?: string;
  status?: OrganizationStatusValue;
  tagIds?: string[];
  view?: LinkViewValue | WebLinkViewValue;
}

export interface UpdateLinkInput {
  categoryId?: string | null;
  purpose?: string | null;
  status?: OrganizationStatusValue;
  tagIds?: string[];
  title?: string;
  url?: string;
}

export interface CreateLinkInput {
  categoryId?: string | null;
  purpose?: string | null;
  status?: OrganizationStatusValue;
  tagIds?: string[];
  title: string;
  url: string;
}

export interface BatchUpdateLinkInput extends UpdateLinkInput {
  addTagIds?: string[];
}

@Injectable()
export class LinksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: LinkListInput, webOnly = false) {
    const where = this.buildWhere(input, webOnly);
    const orderBy: Prisma.LinkOrderByWithRelationInput[] =
      input.sort === LinkSortValue.Title
        ? [{ title: 'asc' }]
        : [
            {
              createdAt: input.sort === LinkSortValue.Oldest ? 'asc' : 'desc',
            },
          ];
    const [items, total] = await Promise.all([
      this.prisma.link.findMany({
        include: linkInclude,
        orderBy,
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
        where,
      }),
      this.prisma.link.count({ where }),
    ]);

    return {
      items: items.map((link) => this.toResponse(link, false)),
      pagination: paginationMeta(input.page, input.pageSize, total),
    };
  }

  async findOne(id: string, webOnly = false) {
    const link = await this.prisma.link.findFirst({
      include: linkInclude,
      where: {
        id,
        ...(webOnly
          ? { archivedAt: null, status: OrganizationStatus.ORGANIZED }
          : {}),
      },
    });
    if (!link) {
      throw new NotFoundException({
        code: 'LINK_NOT_FOUND',
        message: '未找到链接。',
      });
    }
    return this.toResponse(link, true);
  }

  async create(input: CreateLinkInput) {
    const normalized = requireHttpUrl(input.url);
    const title = input.title.trim();
    if (!title) {
      throw new BadRequestException({
        code: 'LINK_TITLE_REQUIRED',
        message: '请输入链接标题。',
      });
    }

    const next = {
      categoryId: input.categoryId ?? null,
      purpose: input.purpose?.trim() || null,
      status: toOrganizationStatus(
        input.status ?? OrganizationStatusValue.Pending,
      ),
      title,
      url: normalized.url,
    };
    if (next.status === OrganizationStatus.ORGANIZED) {
      this.assertCanOrganize(next);
    }
    await this.assertTaxonomy(next.categoryId, input.tagIds);

    const existing = await this.prisma.link.findUnique({
      select: { id: true },
      where: { domain: normalized.domain },
    });
    if (existing) {
      throw this.linkDomainConflict();
    }

    try {
      const created = await this.prisma.link.create({
        data: {
          categoryId: next.categoryId,
          domain: normalized.domain,
          normalizedUrl: normalized.normalizedUrl,
          purpose: next.purpose,
          status: next.status,
          tags: input.tagIds
            ? { create: input.tagIds.map((tagId) => ({ tagId })) }
            : undefined,
          title: next.title,
          url: next.url,
        },
        select: { id: true },
      });
      return this.findOne(created.id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.linkDomainConflict();
      }
      throw error;
    }
  }

  async webOverview() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const active = {
      archivedAt: null,
      status: OrganizationStatus.ORGANIZED,
    };
    const [total, recent, latestJob, categories, tags] = await Promise.all([
      this.prisma.link.count({ where: active }),
      this.prisma.link.count({
        where: { ...active, createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.syncJob.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { finishedAt: true, status: true },
      }),
      this.prisma.category.findMany({
        include: {
          _count: {
            select: { links: { where: active } },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.tag.findMany({
        include: {
          _count: {
            select: { links: { where: { link: active } } },
          },
        },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      counts: { recent, total },
      latestSync: latestJob
        ? {
            finishedAt: latestJob.finishedAt?.toISOString() ?? null,
            status: enumValue(latestJob.status),
          }
        : null,
      categories: categories.map((category) => ({
        count: category._count.links,
        id: category.id,
        name: category.name,
      })),
      tags: tags.map((tag) => ({
        count: tag._count.links,
        id: tag.id,
        name: tag.name,
      })),
    };
  }

  async adminOverview() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [total, pending, todayAdded, archived, latestJob] = await Promise.all(
      [
        this.prisma.link.count({ where: { archivedAt: null } }),
        this.prisma.link.count({
          where: { archivedAt: null, status: OrganizationStatus.PENDING },
        }),
        this.prisma.link.count({
          where: { archivedAt: null, createdAt: { gte: startOfDay } },
        }),
        this.prisma.link.count({ where: { archivedAt: { not: null } } }),
        this.prisma.syncJob.findFirst({
          orderBy: { createdAt: 'desc' },
          select: {
            createdAt: true,
            finishedAt: true,
            id: true,
            status: true,
          },
        }),
      ],
    );
    return {
      archived,
      latestSync: latestJob
        ? {
            createdAt: latestJob.createdAt.toISOString(),
            finishedAt: latestJob.finishedAt?.toISOString() ?? null,
            id: latestJob.id,
            status: enumValue(latestJob.status),
          }
        : null,
      pending,
      todayAdded,
      total,
    };
  }

  async update(id: string, input: UpdateLinkInput) {
    const current = await this.prisma.link.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException({
        code: 'LINK_NOT_FOUND',
        message: '未找到链接。',
      });
    }

    const normalized = input.url ? requireHttpUrl(input.url) : null;
    if (normalized && normalized.domain !== current.domain) {
      const conflict = await this.prisma.link.findUnique({
        where: { domain: normalized.domain },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'LINK_DOMAIN_CONFLICT',
          message: '该域名已存在。',
        });
      }
    }

    const next = {
      categoryId:
        input.categoryId === undefined ? current.categoryId : input.categoryId,
      purpose:
        input.purpose === undefined
          ? current.purpose
          : input.purpose?.trim() || null,
      status: input.status
        ? toOrganizationStatus(input.status)
        : current.status,
      title: input.title === undefined ? current.title : input.title.trim(),
      url: normalized?.url ?? current.url,
    };
    if (next.status === OrganizationStatus.ORGANIZED) {
      this.assertCanOrganize(next);
    }
    await this.assertTaxonomy(next.categoryId, input.tagIds);

    await this.prisma.link.update({
      data: {
        categoryId: next.categoryId,
        domain: normalized?.domain,
        normalizedUrl: normalized?.normalizedUrl,
        purpose: next.purpose,
        status: next.status,
        tags: input.tagIds
          ? {
              create: input.tagIds.map((tagId) => ({ tagId })),
              deleteMany: {},
            }
          : undefined,
        title: next.title,
        url: next.url,
      },
      where: { id },
    });
    return this.findOne(id);
  }

  async batchUpdate(ids: string[], input: BatchUpdateLinkInput) {
    if (Object.keys(input).length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_BATCH_PATCH',
        message: '请至少提供一个批量修改字段。',
      });
    }
    const updatedIds: string[] = [];
    const skipped: { code: string; id: string; message: string }[] = [];
    for (const id of [...new Set(ids)]) {
      try {
        const { addTagIds, ...patch } = input;
        if (addTagIds) {
          const currentTags = await this.prisma.linkTag.findMany({
            select: { tagId: true },
            where: { linkId: id },
          });
          patch.tagIds = [
            ...new Set([
              ...currentTags.map((item) => item.tagId),
              ...addTagIds,
            ]),
          ];
        }
        await this.update(id, patch);
        updatedIds.push(id);
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          skipped.push({ id, ...this.exceptionDetails(error) });
        } else {
          throw error;
        }
      }
    }
    return { skipped, updatedIds };
  }

  async batchArchive(ids: string[]) {
    const uniqueIds = [...new Set(ids)];
    const links = await this.prisma.link.findMany({
      select: { archivedAt: true, id: true },
      where: { id: { in: uniqueIds } },
    });
    const linksById = new Map(links.map((link) => [link.id, link]));
    const updatedIds: string[] = [];
    const skipped: { code: string; id: string; message: string }[] = [];

    for (const id of uniqueIds) {
      const link = linksById.get(id);
      if (!link) {
        skipped.push({
          code: 'LINK_NOT_FOUND',
          id,
          message: '未找到链接。',
        });
      } else if (link.archivedAt) {
        skipped.push({
          code: 'LINK_ALREADY_ARCHIVED',
          id,
          message: '链接已经归档。',
        });
      } else {
        updatedIds.push(id);
      }
    }

    if (updatedIds.length > 0) {
      await this.prisma.link.updateMany({
        data: { archivedAt: new Date() },
        where: { id: { in: updatedIds }, archivedAt: null },
      });
    }

    return { skipped, updatedIds };
  }

  async archive(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.link.update({
      data: { archivedAt: new Date() },
      where: { id },
    });
  }

  async restore(id: string) {
    await this.ensureExists(id);
    await this.prisma.link.update({
      data: { archivedAt: null },
      where: { id },
    });
    return this.findOne(id);
  }

  private buildWhere(
    input: LinkListInput,
    webOnly: boolean,
  ): Prisma.LinkWhereInput {
    const query = input.query?.trim();
    const view = input.view ?? LinkViewValue.All;
    return {
      ...(webOnly || !input.includeArchived ? { archivedAt: null } : {}),
      ...(input.categoryId ? { categoryId: input.categoryId } : {}),
      ...(webOnly
        ? { status: OrganizationStatus.ORGANIZED }
        : input.status
          ? { status: toOrganizationStatus(input.status) }
          : view === LinkViewValue.Pending
            ? { status: OrganizationStatus.PENDING }
            : {}),
      ...(view === LinkViewValue.Recent
        ? { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
        : {}),
      ...(input.sourceChatId
        ? {
            sources: {
              some: { message: { chatId: input.sourceChatId } },
            },
          }
        : {}),
      ...(input.tagIds?.length
        ? { tags: { some: { tagId: { in: input.tagIds } } } }
        : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { url: { contains: query, mode: 'insensitive' } },
              { domain: { contains: query, mode: 'insensitive' } },
              { purpose: { contains: query, mode: 'insensitive' } },
              {
                category: { name: { contains: query, mode: 'insensitive' } },
              },
              {
                tags: {
                  some: {
                    tag: { name: { contains: query, mode: 'insensitive' } },
                  },
                },
              },
              {
                sources: {
                  some: {
                    message: {
                      OR: [
                        { text: { contains: query, mode: 'insensitive' } },
                        {
                          chat: {
                            title: { contains: query, mode: 'insensitive' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  private toResponse(link: LinkRecord, includeAllSources: boolean) {
    const sources = link.sources
      .toSorted(
        (left, right) =>
          right.message.sentAt.getTime() - left.message.sentAt.getTime(),
      )
      .map((source) => ({
        capturedAt: source.message.sentAt.toISOString(),
        chatId: source.message.chatId,
        chatName: source.message.chat.title,
        id: source.id,
        messageId: source.message.telegramMessageId,
        messagePreview: source.message.text.slice(0, 240),
        messageText: includeAllSources ? source.message.text : undefined,
        messageUrl: source.message.messageUrl,
        rawUrl: source.rawUrl,
        senderName: source.message.senderName,
      }));
    return {
      archivedAt: link.archivedAt?.toISOString() ?? null,
      category: link.category
        ? { id: link.category.id, name: link.category.name }
        : null,
      createdAt: link.createdAt.toISOString(),
      domain: link.domain,
      firstDiscoveredAt: link.firstDiscoveredAt.toISOString(),
      id: link.id,
      latestSource: sources[0] ?? null,
      purpose: link.purpose,
      sourceCount: sources.length,
      sources: includeAllSources ? sources : undefined,
      status: fromOrganizationStatus(link.status),
      tags: link.tags
        .map(({ tag }) => ({ id: tag.id, name: tag.name }))
        .toSorted((left, right) =>
          left.name.localeCompare(right.name, 'zh-CN'),
        ),
      title: link.title,
      updatedAt: link.updatedAt.toISOString(),
      url: link.url,
    };
  }

  private assertCanOrganize(input: {
    categoryId: string | null;
    title: string;
    url: string;
  }): void {
    if (!input.title || !input.categoryId || !requireHttpUrl(input.url)) {
      throw new BadRequestException({
        code: 'LINK_INCOMPLETE',
        message: '完成整理需要标题、URL 和分类。',
      });
    }
  }

  private linkDomainConflict(): ConflictException {
    return new ConflictException({
      code: 'LINK_DOMAIN_CONFLICT',
      message: '该域名已存在。',
    });
  }

  private async assertTaxonomy(
    categoryId: string | null,
    tagIds?: string[],
  ): Promise<void> {
    const [categories, tags] = await Promise.all([
      categoryId
        ? this.prisma.category.count({ where: { id: categoryId } })
        : Promise.resolve(1),
      tagIds
        ? this.prisma.tag.count({ where: { id: { in: [...new Set(tagIds)] } } })
        : Promise.resolve(0),
    ]);
    if (categories !== 1 || (tagIds && tags !== new Set(tagIds).size)) {
      throw new BadRequestException({
        code: 'INVALID_TAXONOMY_REFERENCE',
        message: '分类或标签不存在。',
      });
    }
  }

  private async ensureExists(id: string): Promise<void> {
    if ((await this.prisma.link.count({ where: { id } })) === 0) {
      throw new NotFoundException({
        code: 'LINK_NOT_FOUND',
        message: '未找到链接。',
      });
    }
  }

  private exceptionDetails(error: HttpException): {
    code: string;
    message: string;
  } {
    const response: unknown = error.getResponse();
    if (typeof response === 'object' && response !== null) {
      const value = response as { code?: unknown; message?: unknown };
      return {
        code:
          typeof value.code === 'string' ? value.code : 'LINK_UPDATE_FAILED',
        message:
          typeof value.message === 'string' ? value.message : error.message,
      };
    }
    return { code: 'LINK_UPDATE_FAILED', message: error.message };
  }
}
