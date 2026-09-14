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
    const where: Prisma.InventoryBalanceWhereInput = {
      tenantId,
      stockLocationId: query.stockLocationId,
      productVariantId: query.productVariantId,
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
    return paginated(
      data.map((balance) => ({
        ...balance,
        available: balance.onHand.sub(balance.reserved),
        variant: variants.find(
          (variant) => variant.id === balance.productVariantId,
        ),
      })),
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
    return paginated(
      data.map((movement) => ({
        ...movement,
        items: items.filter((item) => item.stockMovementId === movement.id),
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
    return this.prisma.stockMovement.findUnique({ where: { id: movementId } });
  }
}
