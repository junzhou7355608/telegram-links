import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

export type TaxonomyKind = 'projects' | 'categories' | 'tags';

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN');
}

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(kind: TaxonomyKind) {
    if (kind === 'projects') {
      const items = await this.prisma.project.findMany({
        include: { _count: { select: { links: true } } },
        orderBy: { name: 'asc' },
      });
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        referenceCount: item._count.links,
      }));
    }
    if (kind === 'categories') {
      const items = await this.prisma.category.findMany({
        include: { _count: { select: { links: true } } },
        orderBy: { name: 'asc' },
      });
      return items.map((item) => ({
        id: item.id,
        name: item.name,
        referenceCount: item._count.links,
      }));
    }
    const items = await this.prisma.tag.findMany({
      include: { _count: { select: { links: true } } },
      orderBy: { name: 'asc' },
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
    if (kind === 'projects') {
      return this.prisma.project.create({ data: { name, normalizedName } });
    }
    if (kind === 'categories') {
      return this.prisma.category.create({ data: { name, normalizedName } });
    }
    return this.prisma.tag.create({ data: { name, normalizedName } });
  }

  async rename(kind: TaxonomyKind, id: string, value: string) {
    await this.ensureExists(kind, id);
    const name = this.requireName(value);
    const normalizedName = normalizeName(name);
    await this.ensureUnique(kind, normalizedName, id);
    if (kind === 'projects') {
      return this.prisma.project.update({
        data: { name, normalizedName },
        where: { id },
      });
    }
    if (kind === 'categories') {
      return this.prisma.category.update({
        data: { name, normalizedName },
        where: { id },
      });
    }
    return this.prisma.tag.update({
      data: { name, normalizedName },
      where: { id },
    });
  }

  async remove(kind: TaxonomyKind, id: string): Promise<void> {
    await this.ensureExists(kind, id);
    const references =
      kind === 'projects'
        ? await this.prisma.link.count({ where: { projectId: id } })
        : kind === 'categories'
          ? await this.prisma.link.count({ where: { categoryId: id } })
          : await this.prisma.linkTag.count({ where: { tagId: id } });
    if (references > 0) {
      throw new ConflictException({
        code: 'TAXONOMY_IN_USE',
        message: `该条目仍被 ${references} 条链接引用。`,
      });
    }
    if (kind === 'projects') {
      await this.prisma.project.delete({ where: { id } });
    } else if (kind === 'categories') {
      await this.prisma.category.delete({ where: { id } });
    } else {
      await this.prisma.tag.delete({ where: { id } });
    }
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
      kind === 'projects'
        ? await this.prisma.project.count({ where })
        : kind === 'categories'
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
      kind === 'projects'
        ? await this.prisma.project.count({ where: { id } })
        : kind === 'categories'
          ? await this.prisma.category.count({ where: { id } })
          : await this.prisma.tag.count({ where: { id } });
    if (count === 0) {
      throw new NotFoundException({
        code: 'TAXONOMY_NOT_FOUND',
        message: '未找到基础资料条目。',
      });
    }
  }
}
