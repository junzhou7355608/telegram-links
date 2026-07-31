import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import {
  fromLinkEnvironment,
  fromOrganizationStatus,
  LinkSortValue,
  LinkViewValue,
  requireHttpUrl,
  toLinkEnvironment,
  toOrganizationStatus,
  type LinkEnvironmentValue,
  type OrganizationStatusValue,
} from '../common/link-values';
import { paginationMeta } from '../common/pagination.dto';

const linkInclude = {
  category: true,
  project: true,
  sources: {
    include: { message: { include: { chat: true } } },
  },
  tags: { include: { tag: true } },
} satisfies Prisma.LinkInclude;

type LinkRecord = Prisma.LinkGetPayload<{ include: typeof linkInclude }>;

export interface LinkListInput {
  categoryId?: string;
  environment?: LinkEnvironmentValue;
  includeArchived?: boolean;
  page: number;
  pageSize: number;
  projectId?: string;
  query?: string;
  sort?: LinkSortValue;
  sourceChatId?: string;
  status?: OrganizationStatusValue;
  tagIds?: string[];
  view?: LinkViewValue;
}

export interface UpdateLinkInput {
  categoryId?: string | null;
  environment?: LinkEnvironmentValue;
  isFavorite?: boolean;
  projectId?: string | null;
  purpose?: string | null;
  status?: OrganizationStatusValue;
  tagIds?: string[];
  title?: string;
  url?: string;
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
      where: { id, ...(webOnly ? { archivedAt: null } : {}) },
    });
    if (!link) {
      throw new NotFoundException({
        code: 'LINK_NOT_FOUND',
        message: '未找到链接。',
      });
    }
    return this.toResponse(link, true);
  }

  async webOverview() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const active = { archivedAt: null };
    const [total, pending, favorites, recent, latestJob, projects, categories] =
      await Promise.all([
        this.prisma.link.count({ where: active }),
        this.prisma.link.count({
          where: { ...active, status: OrganizationStatus.PENDING },
        }),
        this.prisma.link.count({ where: { ...active, isFavorite: true } }),
        this.prisma.link.count({
          where: { ...active, createdAt: { gte: sevenDaysAgo } },
        }),
        this.prisma.syncJob.findFirst({
          orderBy: { createdAt: 'desc' },
          select: { finishedAt: true, status: true },
        }),
        this.prisma.project.findMany({
          include: {
            _count: {
              select: { links: { where: { archivedAt: null } } },
            },
          },
          orderBy: { name: 'asc' },
        }),
        this.prisma.category.findMany({
          include: {
            _count: {
              select: { links: { where: { archivedAt: null } } },
            },
          },
          orderBy: { name: 'asc' },
        }),
      ]);
    return {
      counts: { favorites, pending, recent, total },
      latestSync: latestJob
        ? {
            finishedAt: latestJob.finishedAt,
            status: latestJob.status.toLowerCase(),
          }
        : null,
      projects: projects.map((project) => ({
        count: project._count.links,
        id: project.id,
        name: project.name,
      })),
      categories: categories.map((category) => ({
        count: category._count.links,
        id: category.id,
        name: category.name,
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
        ? { ...latestJob, status: latestJob.status.toLowerCase() }
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
    if (normalized && normalized.normalizedUrl !== current.normalizedUrl) {
      const conflict = await this.prisma.link.findUnique({
        where: { normalizedUrl: normalized.normalizedUrl },
      });
      if (conflict) {
        throw new ConflictException({
          code: 'LINK_URL_CONFLICT',
          message: '标准化后的 URL 已存在。',
        });
      }
    }

    const next = {
      categoryId:
        input.categoryId === undefined ? current.categoryId : input.categoryId,
      projectId:
        input.projectId === undefined ? current.projectId : input.projectId,
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
    await this.assertTaxonomy(next.projectId, next.categoryId, input.tagIds);

    await this.prisma.link.update({
      data: {
        categoryId: next.categoryId,
        domain: normalized?.domain,
        environment: input.environment
          ? toLinkEnvironment(input.environment)
          : undefined,
        isFavorite: input.isFavorite,
        normalizedUrl: normalized?.normalizedUrl,
        projectId: next.projectId,
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
    const skipped: { id: string; reason: string }[] = [];
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
        if (error instanceof BadRequestException) {
          skipped.push({ id, reason: error.message });
        } else if (error instanceof NotFoundException) {
          skipped.push({ id, reason: '未找到链接。' });
        } else {
          throw error;
        }
      }
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
      ...(input.projectId === 'unassigned'
        ? { projectId: null }
        : input.projectId
          ? { projectId: input.projectId }
          : {}),
      ...(input.environment
        ? { environment: toLinkEnvironment(input.environment) }
        : {}),
      ...(input.status
        ? { status: toOrganizationStatus(input.status) }
        : view === LinkViewValue.Pending
          ? { status: OrganizationStatus.PENDING }
          : {}),
      ...(view === LinkViewValue.Favorites ? { isFavorite: true } : {}),
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
                project: { name: { contains: query, mode: 'insensitive' } },
              },
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
        capturedAt: source.message.sentAt,
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
      archivedAt: link.archivedAt,
      category: link.category
        ? { id: link.category.id, name: link.category.name }
        : null,
      createdAt: link.createdAt,
      domain: link.domain,
      environment: fromLinkEnvironment(link.environment),
      firstDiscoveredAt: link.firstDiscoveredAt,
      id: link.id,
      isFavorite: link.isFavorite,
      latestSource: sources[0] ?? null,
      project: link.project
        ? { id: link.project.id, name: link.project.name }
        : null,
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
      updatedAt: link.updatedAt,
      url: link.url,
    };
  }

  private assertCanOrganize(input: {
    categoryId: string | null;
    projectId: string | null;
    purpose: string | null;
    title: string;
    url: string;
  }): void {
    if (
      !input.title ||
      !input.projectId ||
      !input.purpose ||
      !input.categoryId ||
      !requireHttpUrl(input.url)
    ) {
      throw new BadRequestException({
        code: 'LINK_INCOMPLETE',
        message: '完成整理需要标题、URL、项目、用途和分类。',
      });
    }
  }

  private async assertTaxonomy(
    projectId: string | null,
    categoryId: string | null,
    tagIds?: string[],
  ): Promise<void> {
    const [projects, categories, tags] = await Promise.all([
      projectId
        ? this.prisma.project.count({ where: { id: projectId } })
        : Promise.resolve(1),
      categoryId
        ? this.prisma.category.count({ where: { id: categoryId } })
        : Promise.resolve(1),
      tagIds
        ? this.prisma.tag.count({ where: { id: { in: [...new Set(tagIds)] } } })
        : Promise.resolve(0),
    ]);
    if (
      projects !== 1 ||
      categories !== 1 ||
      (tagIds && tags !== new Set(tagIds).size)
    ) {
      throw new BadRequestException({
        code: 'INVALID_TAXONOMY_REFERENCE',
        message: '项目、分类或标签不存在。',
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
}
