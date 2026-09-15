import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateStockMovementDto,
  MovementQueryDto,
  StockQueryDto,
} from './dto/inventory.dto';
import { applyStockDelta, nextDocumentNumber } from './inventory.utils';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async balances(tenantId: string, query: StockQueryDto) {
    const matchingVariants =
      query.search || query.categoryId
        ? await this.prisma.productVariant.findMany({
            where: {
              tenantId,
              deletedAt: null,
              OR: query.search
                ? [
                    { name: { contains: query.search } },
                    { sku: { contains: query.search } },
                  ]
                : undefined,
              productId: query.categoryId
                ? {
                    in: (
                      await this.prisma.productCategory.findMany({
                        where: { tenantId, categoryId: query.categoryId },
                        select: { productId: true },
                      })
                    ).map((item) => item.productId),
                  }
                : undefined,
            },
            select: { id: true },
          })
        : undefined;
    const where: Prisma.InventoryBalanceWhereInput = {
      tenantId,
      stockLocationId: query.stockLocationId,
      productVariantId:
        query.productVariantId ??
        (matchingVariants
          ? { in: matchingVariants.map((item) => item.id) }
          : undefined),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryBalance.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        id: { in: data.map((item) => item.productVariantId) },
      },
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: variants.map((item) => item.productId) } },
    });
    const assignments = await this.prisma.productCategory.findMany({
      where: { tenantId, productId: { in: products.map((item) => item.id) } },
    });
    const categories = await this.prisma.category.findMany({
      where: {
        tenantId,
        id: { in: assignments.map((item) => item.categoryId) },
      },
    });
    return paginated(
      data
        .map((balance) => {
          const variant = variants.find(
            (item) => item.id === balance.productVariantId,
          );
          const product = products.find(
            (item) => item.id === variant?.productId,
          );
          const available = balance.onHand.sub(balance.reserved);
          const threshold = balance.lowStockThreshold;
          return {
            tenantId,
            stockLocationId: balance.stockLocationId,
            productId: product?.id ?? '',
            variantId: balance.productVariantId,
            productName: product?.name ?? 'Producto',
            variantName: variant?.name ?? 'Variante',
            sku: variant?.sku ?? null,
            imageUrl: null,
            categoryNames: assignments
              .filter((item) => item.productId === product?.id)
              .map(
                (item) =>
                  categories.find((category) => category.id === item.categoryId)
                    ?.name,
              )
              .filter(Boolean),
            onHand: balance.onHand,
            reserved: balance.reserved,
            available,
            lowStockThreshold: threshold,
            trackInventory: variant?.trackInventory ?? true,
            status: !variant?.trackInventory
              ? 'NOT_TRACKED'
              : available.lte(0)
                ? 'OUT_OF_STOCK'
                : threshold && available.lte(threshold)
                  ? 'LOW_STOCK'
                  : 'IN_STOCK',
          };
        })
        .filter(
          (item) =>
            !query.status ||
            query.status === 'ALL' ||
            item.status === query.status,
        ),
      total,
      query,
    );
  }

  locations(tenantId: string) {
    return this.prisma.stockLocation.findMany({
      where: { tenantId, enabled: true },
      orderBy: { name: 'asc' },
    });
  }

  async movements(tenantId: string, query: MovementQueryDto) {
    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      stockLocationId: query.stockLocationId,
      movementType: query.movementType,
      occurredAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
      OR: query.search
        ? [
            { movementNumber: { contains: query.search } },
            { reason: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    const items = await this.prisma.stockMovementItem.findMany({
      where: {
        tenantId,
        stockMovementId: { in: data.map((movement) => movement.id) },
      },
    });
    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        id: { in: items.map((item) => item.productVariantId) },
      },
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: variants.map((item) => item.productId) } },
    });
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: data.flatMap((item) =>
            item.createdByUserId ? [item.createdByUserId] : [],
          ),
        },
      },
      select: { id: true, displayName: true },
    });
    return paginated(
      data.map((movement) => ({
        ...movement,
        type: movement.movementType,
        createdBy:
          users.find((user) => user.id === movement.createdByUserId) ?? null,
        items: items
          .filter((item) => item.stockMovementId === movement.id)
          .map((item) => {
            const variant = variants.find(
              (candidate) => candidate.id === item.productVariantId,
            );
            const product = products.find(
              (candidate) => candidate.id === variant?.productId,
            );
            return {
              ...item,
              productName: product?.name ?? 'Producto',
              variantName: variant?.name ?? 'Variante',
              sku: variant?.sku ?? null,
            };
          }),
      })),
      total,
      query,
    );
  }

  async createMovement(
    tenantId: string,
    userId: string,
    dto: CreateStockMovementDto,
  ) {
    if (!dto.items.length)
      throw new BadRequestException(
        'El movimiento debe incluir al menos un ítem',
      );
    const location = await this.prisma.stockLocation.findFirst({
      where: { id: dto.stockLocationId, tenantId, enabled: true },
    });
    if (!location)
      throw new NotFoundException('Ubicación de stock no encontrada');
    const variantIds = [
      ...new Set(dto.items.map((item) => item.productVariantId)),
    ];
    if (variantIds.length !== dto.items.length)
      throw new BadRequestException('No se puede repetir una variante');
    const variantCount = await this.prisma.productVariant.count({
      where: {
        tenantId,
        id: { in: variantIds },
        deletedAt: null,
        enabled: true,
      },
    });
    if (variantCount !== variantIds.length)
      throw new NotFoundException(
        'Una o más variantes no pertenecen al tenant',
      );
    for (const item of dto.items) {
      if (item.quantityDelta === 0)
        throw new BadRequestException(
          'La variación de stock no puede ser cero',
        );
      if (dto.movementType === 'MANUAL_IN' && item.quantityDelta < 0) {
        throw new BadRequestException(
          'MANUAL_IN requiere cantidades positivas',
        );
      }
      if (dto.movementType === 'MANUAL_OUT' && item.quantityDelta > 0) {
        throw new BadRequestException(
          'MANUAL_OUT requiere cantidades negativas',
        );
      }
    }
    const settings = await this.prisma.storefrontSetting.findUnique({
      where: { tenantId },
    });
    const movementId = crypto.randomUUID();
    await this.prisma.$transaction(
      async (tx) => {
        const movementNumber = await nextDocumentNumber(
          tx,
          tenantId,
          'STOCK_MOVEMENT',
        );
        await tx.stockMovement.create({
          data: {
            id: movementId,
            tenantId,
            movementNumber,
            stockLocationId: dto.stockLocationId,
            movementType: dto.movementType,
            reason: dto.reason,
            occurredAt: new Date(),
            createdByUserId: userId,
          },
        });
        for (const item of dto.items) {
          const delta = new Prisma.Decimal(item.quantityDelta);
          await applyStockDelta(
            tx,
            tenantId,
            dto.stockLocationId,
            item.productVariantId,
            delta,
            settings?.allowNegativeStock ?? false,
          );
          if (item.lowStockThreshold !== undefined) {
            await tx.inventoryBalance.update({
              where: {
                tenantId_stockLocationId_productVariantId: {
                  tenantId,
                  stockLocationId: dto.stockLocationId,
                  productVariantId: item.productVariantId,
                },
              },
              data: { lowStockThreshold: item.lowStockThreshold },
            });
          }
          await tx.stockMovementItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              stockMovementId: movementId,
              productVariantId: item.productVariantId,
              quantityDelta: delta,
              unitCost: item.unitCost,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id: movementId },
    });
    const inventory = await this.balances(tenantId, {
      page: 1,
      limit: 100,
      stockLocationId: dto.stockLocationId,
    });
    return { movement, inventory: inventory.data };
  }
}
