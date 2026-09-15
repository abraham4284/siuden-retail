import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { slugify } from '../common/utils/slug';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const categories = await this.prisma.category.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.prisma.productCategory.groupBy({
      by: ['categoryId'],
      where: { tenantId },
      _count: { productId: true },
    });
    return categories.map((category) => ({
      ...category,
      productCount:
        counts.find((item) => item.categoryId === category.id)?._count
          .productId ?? 0,
      externalMappings: [],
    }));
  }

  async findOne(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    if (dto.parentId) await this.findOne(tenantId, dto.parentId);
    return this.prisma.category.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        name: dto.name.trim(),
        slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
        description: dto.description,
        parentId: dto.parentId,
        sortOrder: dto.sortOrder,
        isVisible: dto.isVisible,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.findOne(tenantId, id);
    if (dto.parentId === id)
      throw new NotFoundException('Una categoría no puede ser su propio padre');
    if (dto.parentId) await this.findOne(tenantId, dto.parentId);
    return this.prisma.category.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name?.trim(),
        slug: dto.slug ? slugify(dto.slug) : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isVisible: false },
    });
  }
}
