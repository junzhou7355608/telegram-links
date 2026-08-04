import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationStatus } from '../generated/prisma/client';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type TaxonomyKind = 'categories' | 'tags';

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(kind: TaxonomyKind) {
    if (kind === 'categories') {
      const items = await this.prisma.category.findMany({
        include: { _count: { select: { links: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        referenceCount: item._count.links,
      }));
    }
    const items = await this.prisma.tag.findMany({
      include: { _count: { select: { links: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      referenceCount: item._count.links,
    }));
  }

  async create(kind: TaxonomyKind, value: string) {
    const name = this.requireName(value);
    const normalizedName = normalizeName(name);
    await this.ensureUnique(kind, normalizedName);
    if (kind === 'categories') {
      const item = await this.prisma.$transaction(async (transaction) => {
        const aggregate = await transaction.category.aggregate({
          _max: { sortOrder: true },
        });
        return transaction.category.create({
          data: {
            name,
            normalizedName,
            sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
          },
        });
      });
      return { id: item.id, name: item.name, referenceCount: 0 };
    }
    const item = await this.prisma.$transaction(async (transaction) => {
      const aggregate = await transaction.tag.aggregate({
        _max: { sortOrder: true },
      });
      return transaction.tag.create({
        data: {
          name,
          normalizedName,
          sortOrder: (aggregate._max.sortOrder ?? -1) + 1,
        },
      });
    });
    return { id: item.id, name: item.name, referenceCount: 0 };
  }

  async reorder(kind: TaxonomyKind, ids: string[]) {
    return this.prisma.$transaction(async (transaction) => {
      if (kind === 'categories') {
        const current = await transaction.category.findMany({
          select: { id: true },
        });
        this.assertCompleteOrder(
          ids,
          current.map((item) => item.id),
        );
        await Promise.all(
          ids.map((id, sortOrder) =>
            transaction.category.update({
              data: { sortOrder },
              where: { id },
            }),
          ),
        );
        const items = await transaction.category.findMany({
          include: { _count: { select: { links: true } } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        return items.map((item) => ({
          id: item.id,
          name: item.name,
          referenceCount: item._count.links,
        }));
      }

      const current = await transaction.tag.findMany({
        select: { id: true },
      });
      this.assertCompleteOrder(
        ids,
        current.map((item) => item.id),
      );
      await Promise.all(
        ids.map((id, sortOrder) =>
          transaction.tag.update({
            data: { sortOrder },
            where: { id },
          }),
        ),
      );
      const items = await transaction.tag.findMany({
        include: { _count: { select: { links: true } } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        referenceCount: item._count.links,
      }));
    });
  }

  async rename(kind: TaxonomyKind, id: string, value: string) {
    await this.ensureExists(kind, id);
    const name = this.requireName(value);
    const normalizedName = normalizeName(name);
    await this.ensureUnique(kind, normalizedName, id);
    if (kind === 'categories') {
      const item = await this.prisma.category.update({
        data: { name, normalizedName },
        where: { id },
      });
      return {
        id: item.id,
        name: item.name,
        referenceCount: await this.referenceCount(kind, id),
      };
    }
    const item = await this.prisma.tag.update({
      data: { name, normalizedName },
      where: { id },
    });
    return {
      id: item.id,
      name: item.name,
      referenceCount: await this.referenceCount(kind, id),
    };
  }

  async remove(kind: TaxonomyKind, id: string): Promise<void> {
    await this.prisma.$transaction(async (transaction) => {
      const exists =
        kind === 'categories'
          ? await transaction.category.count({ where: { id } })
          : await transaction.tag.count({ where: { id } });
      if (exists === 0) {
        throw new NotFoundException({
          code: 'TAXONOMY_NOT_FOUND',
          message: '未找到基础资料条目。',
        });
      }

      if (kind === 'categories') {
        await transaction.link.updateMany({
          data: { archivedAt: new Date() },
          where: { archivedAt: null, categoryId: id },
        });
        await transaction.link.updateMany({
          data: {
            categoryId: null,
            status: OrganizationStatus.PENDING,
          },
          where: { categoryId: id },
        });
        await transaction.category.delete({ where: { id } });
      } else {
        await transaction.linkTag.deleteMany({ where: { tagId: id } });
        await transaction.tag.delete({ where: { id } });
      }
    });
  }

  private requireName(value: string): string {
    const name = value.trim();
    if (!name) {
      throw new BadRequestException({
        code: 'TAXONOMY_NAME_REQUIRED',
        message: '名称不能为空。',
      });
    }
    return name;
  }

  private assertCompleteOrder(ids: string[], currentIds: string[]): void {
    const received = new Set(ids);
    const current = new Set(currentIds);
    if (
      received.size !== ids.length ||
      ids.length !== currentIds.length ||
      ids.some((id) => !current.has(id)) ||
      currentIds.some((id) => !received.has(id))
    ) {
      throw new BadRequestException({
        code: 'INVALID_TAXONOMY_ORDER',
        message: '排序必须包含当前类型的全部条目且不能重复。',
      });
    }
  }

  private async ensureUnique(
    kind: TaxonomyKind,
    normalizedName: string,
    excludingId?: string,
  ): Promise<void> {
    const where = {
      normalizedName,
      ...(excludingId ? { id: { not: excludingId } } : {}),
    };
    const count =
      kind === 'categories'
        ? await this.prisma.category.count({ where })
        : await this.prisma.tag.count({ where });
    if (count > 0) {
      throw new ConflictException({
        code: 'TAXONOMY_NAME_CONFLICT',
        message: '已存在同名条目。',
      });
    }
  }

  private async ensureExists(kind: TaxonomyKind, id: string): Promise<void> {
    const count =
      kind === 'categories'
        ? await this.prisma.category.count({ where: { id } })
        : await this.prisma.tag.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException({
        code: 'TAXONOMY_NOT_FOUND',
        message: '未找到基础资料条目。',
      });
    }
  }

  private referenceCount(kind: TaxonomyKind, id: string): Promise<number> {
    if (kind === 'categories') {
      return this.prisma.link.count({ where: { categoryId: id } });
    }
    return this.prisma.linkTag.count({ where: { tagId: id } });
  }
}
