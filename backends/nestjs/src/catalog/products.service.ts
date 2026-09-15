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
    return paginated(
      await Promise.all(
        data.map((product) => this.findOne(tenantId, product.id)),
      ),
      total,
      query,
    );
  }

  async findOne(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    const [variants, imageLinks, categoryLinks, options] = await Promise.all([
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
      this.prisma.productOption.findMany({
        where: { tenantId, productId: id },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    const [assets, optionValues, variantOptionValues] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where: {
          tenantId,
          id: { in: imageLinks.map((item) => item.mediaAssetId) },
          status: 'ACTIVE',
        },
      }),
      this.prisma.productOptionValue.findMany({
        where: {
          tenantId,
          productOptionId: { in: options.map((item) => item.id) },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.productVariantOptionValue.findMany({
        where: {
          tenantId,
          productVariantId: { in: variants.map((item) => item.id) },
        },
      }),
    ]);
    return {
      ...product,
      variants: variants.map((variant) => ({
        ...variant,
        dimensions: {
          weightKg: variant.weightKg,
          heightCm: variant.heightCm,
          widthCm: variant.widthCm,
          depthCm: variant.depthCm,
        },
        selectedOptionValueIds: variantOptionValues
          .filter((item) => item.productVariantId === variant.id)
          .map((item) => item.productOptionValueId),
      })),
      categoryAssignments: categoryLinks.map(
        ({ categoryId, isPrimary, sortOrder }) => ({
          categoryId,
          isPrimary,
          sortOrder,
        }),
      ),
      options: options.map((option) => ({
        ...option,
        values: optionValues.filter(
          (value) => value.productOptionId === option.id,
        ),
      })),
      images: imageLinks.map((link) => ({
        ...link,
        url: (() => {
          const asset = assets.find((item) => item.id === link.mediaAssetId);
          return asset ? `/${asset.storageKey.replace(/^\/+/, '')}` : '';
        })(),
        altText:
          assets.find((asset) => asset.id === link.mediaAssetId)?.altText ??
          null,
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
      const optionIdMap = new Map<string, string>();
      const valueIdMap = new Map<string, string>();
      for (const [optionIndex, option] of (dto.options ?? []).entries()) {
        const optionId = option.id ?? crypto.randomUUID();
        if (option.id) optionIdMap.set(option.id, optionId);
        await tx.productOption.create({
          data: {
            id: optionId,
            tenantId,
            productId: id,
            name: option.name.trim(),
            sortOrder: option.sortOrder ?? optionIndex,
          },
        });
        for (const [valueIndex, value] of option.values.entries()) {
          const valueId = value.id ?? crypto.randomUUID();
          if (value.id) valueIdMap.set(value.id, valueId);
          await tx.productOptionValue.create({
            data: {
              id: valueId,
              tenantId,
              productOptionId: optionId,
              value: value.value.trim(),
              sortOrder: value.sortOrder ?? valueIndex,
            },
          });
        }
      }
      const variantRows = variants.map((variant, index) => ({
        id: variant.id ?? crypto.randomUUID(),
        tenantId,
        productId: id,
        name: variant.name.trim(),
        sku: variant.sku,
        barcode: variant.barcode,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        cost: variant.cost,
        weightKg: variant.weightKg,
        heightCm: variant.heightCm,
        widthCm: variant.widthCm,
        depthCm: variant.depthCm,
        trackInventory: variant.trackInventory,
        allowBackorder: variant.allowBackorder,
        isDefault: variant.isDefault ?? index === 0,
        enabled: variant.enabled,
        sortOrder: variant.sortOrder,
      }));
      await tx.productVariant.createMany({ data: variantRows });
      for (const [index, variant] of variants.entries()) {
        for (const draftValueId of variant.selectedOptionValueIds ?? []) {
          await tx.productVariantOptionValue.create({
            data: {
              tenantId,
              productVariantId: variantRows[index].id,
              productOptionValueId:
                valueIdMap.get(draftValueId) ?? draftValueId,
            },
          });
        }
      }
    });
    return this.findOne(tenantId, id);
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.findOne(tenantId, id);
    await this.assertCategories(tenantId, dto.categoryIds);
    const { categoryIds, variants, options, ...data } = dto;
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
      if (options) {
        await tx.productVariantOptionValue.deleteMany({
          where: {
            tenantId,
            productVariantId: { in: existing.variants.map((item) => item.id) },
          },
        });
        await tx.productOptionValue.deleteMany({
          where: {
            tenantId,
            productOptionId: { in: existing.options.map((item) => item.id) },
          },
        });
        await tx.productOption.deleteMany({
          where: { tenantId, productId: id },
        });
        const valueIdMap = new Map<string, string>();
        for (const [optionIndex, option] of options.entries()) {
          const optionId = option.id ?? crypto.randomUUID();
          await tx.productOption.create({
            data: {
              id: optionId,
              tenantId,
              productId: id,
              name: option.name.trim(),
              sortOrder: option.sortOrder ?? optionIndex,
            },
          });
          for (const [valueIndex, value] of option.values.entries()) {
            const valueId = value.id ?? crypto.randomUUID();
            if (value.id) valueIdMap.set(value.id, valueId);
            await tx.productOptionValue.create({
              data: {
                id: valueId,
                tenantId,
                productOptionId: optionId,
                value: value.value.trim(),
                sortOrder: value.sortOrder ?? valueIndex,
              },
            });
          }
        }
        if (variants) {
          const incomingIds = variants.flatMap((variant) =>
            variant.id ? [variant.id] : [],
          );
          await tx.productVariant.updateMany({
            where: { tenantId, productId: id, id: { notIn: incomingIds } },
            data: { enabled: false, deletedAt: new Date() },
          });
          for (const [index, variant] of variants.entries()) {
            const variantId = variant.id ?? crypto.randomUUID();
            const {
              selectedOptionValueIds,
              id: _variantId,
              ...variantData
            } = variant;
            void _variantId;
            await tx.productVariant.upsert({
              where: { id: variantId },
              create: {
                id: variantId,
                tenantId,
                productId: id,
                ...variantData,
                name: variant.name.trim(),
                isDefault: variant.isDefault ?? index === 0,
              },
              update: {
                ...variantData,
                name: variant.name.trim(),
                deletedAt: null,
              },
            });
            for (const draftValueId of selectedOptionValueIds ?? []) {
              await tx.productVariantOptionValue.create({
                data: {
                  tenantId,
                  productVariantId: variantId,
                  productOptionValueId:
                    valueIdMap.get(draftValueId) ?? draftValueId,
                },
              });
            }
          }
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
