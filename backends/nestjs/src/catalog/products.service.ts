import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import { slugify } from '../common/utils/slug';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProductDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: ProductQueryDto) {
    const productIds = query.categoryId
      ? (
          await this.prisma.productCategory.findMany({
            where: { tenantId, categoryId: query.categoryId },
            select: { productId: true },
          })
        ).map((item) => item.productId)
      : undefined;
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      status: query.status,
      id: productIds ? { in: productIds } : undefined,
      OR: query.search
        ? [
            { name: { contains: query.search } },
            { slug: { contains: query.search } },
            { description: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const [variants, imageLinks, categoryLinks] = await Promise.all([
      this.prisma.productVariant.findMany({
        where: { tenantId, productId: id, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.productImage.findMany({
        where: { tenantId, productId: id },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.productCategory.findMany({
        where: { tenantId, productId: id },
      }),
    ]);
    const [assets, categories] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          tenantId,
          id: { in: imageLinks.map((item) => item.mediaAssetId) },
          status: 'ACTIVE',
        },
      }),
      this.prisma.category.findMany({
        where: {
          tenantId,
          id: { in: categoryLinks.map((item) => item.categoryId) },
          deletedAt: null,
        },
      }),
    ]);
    return {
      ...product,
      variants,
      categories,
      images: imageLinks.map((link) => ({
        ...link,
        asset: assets.find((asset) => asset.id === link.mediaAssetId),
      })),
    };
  }

  async create(tenantId: string, dto: CreateProductDto) {
    await this.assertCategories(tenantId, dto.categoryIds);
    const id = crypto.randomUUID();
    await this.prisma.$transaction(async (tx) => {
      await tx.product.create({
        data: {
          id,
          tenantId,
          name: dto.name.trim(),
          slug: dto.slug ? slugify(dto.slug) : slugify(dto.name),
          description: dto.description,
          status: dto.status,
          sellingMode: dto.sellingMode,
          seoTitle: dto.seoTitle,
          seoDescription: dto.seoDescription,
          publishedAt: dto.status === 'PUBLISHED' ? new Date() : undefined,
        },
      });
      if (dto.categoryIds?.length) {
        await tx.productCategory.createMany({
          data: dto.categoryIds.map((categoryId, index) => ({
            tenantId,
            productId: id,
            categoryId,
            isPrimary: index === 0,
            sortOrder: index,
          })),
        });
      }
      const variants = dto.variants?.length
        ? dto.variants
        : [{ name: 'Default', isDefault: true }];
      await tx.productVariant.createMany({
        data: variants.map((variant, index) => ({
          id: crypto.randomUUID(),
          tenantId,
          productId: id,
          ...variant,
          name: variant.name.trim(),
          isDefault: variant.isDefault ?? index === 0,
        })),
      });
    });
    return this.findOne(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(tenantId, id);
    await this.assertCategories(tenantId, dto.categoryIds);
    const { categoryIds, variants: _variants, ...data } = dto;
    void _variants;
    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...data,
          name: dto.name?.trim(),
          slug: dto.slug ? slugify(dto.slug) : undefined,
          publishedAt:
            dto.status === 'PUBLISHED' && !existing.publishedAt
              ? new Date()
              : dto.status && dto.status !== 'PUBLISHED'
                ? null
                : undefined,
        },
      });
      if (categoryIds) {
        await tx.productCategory.deleteMany({
          where: { tenantId, productId: id },
        });
        if (categoryIds.length) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId, index) => ({
              tenantId,
              productId: id,
              categoryId,
              isPrimary: index === 0,
              sortOrder: index,
            })),
          });
        }
      }
    });
    return this.findOne(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.$transaction([
      this.prisma.product.update({
        where: { id },
        data: { deletedAt: new Date(), status: 'ARCHIVED' },
      }),
      this.prisma.productVariant.updateMany({
        where: { tenantId, productId: id },
        data: { deletedAt: new Date(), enabled: false },
      }),
    ]);
    return { id, deleted: true };
  }

  private async assertCategories(
    tenantId: string,
    ids?: string[],
  ): Promise<void> {
    if (!ids?.length) return;
    const count = await this.prisma.category.count({
      where: { tenantId, id: { in: ids }, deletedAt: null },
    });
    if (count !== ids.length)
      throw new NotFoundException(
        'Una o más categorías no pertenecen al tenant',
      );
  }
}
