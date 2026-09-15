import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { paginated, paginationArgs } from '../common/dto/pagination.dto';
import {
  applyStockDelta,
  nextDocumentNumber,
} from '../inventory/inventory.utils';
import { PrismaService } from '../prisma/prisma.service';
import { CancelSaleDto, CreateSaleDto, SaleQueryDto } from './dto/sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: SaleQueryDto) {
    const where: Prisma.SaleWhereInput = {
      tenantId,
      status: query.status,
      channel: query.channel,
      customerId: query.customerId,
      soldAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? new Date(query.to) : undefined,
            }
          : undefined,
      stockLocationId: query.stockLocationId,
      OR: query.search
        ? [
            { saleNumber: { contains: query.search } },
            { customerNameSnapshot: { contains: query.search } },
            { customerDocumentSnapshot: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { soldAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);
    return paginated(await this.views(tenantId, data), total, query);
  }

  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return (await this.views(tenantId, [sale]))[0];
  }

  async create(tenantId: string, userId: string, dto: CreateSaleDto) {
    if (!dto.items.length)
      throw new BadRequestException('La venta debe incluir al menos un ítem');
    const uniqueVariantIds = [
      ...new Set(dto.items.map((item) => item.productVariantId)),
    ];
    if (uniqueVariantIds.length !== dto.items.length)
      throw new BadRequestException('No se puede repetir una variante');
    const [location, tenant, settings, variants, customer] = await Promise.all([
      this.prisma.stockLocation.findFirst({
        where: { id: dto.stockLocationId, tenantId, enabled: true },
      }),
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.storefrontSetting.findUnique({ where: { tenantId } }),
      this.prisma.productVariant.findMany({
        where: {
          tenantId,
          id: { in: uniqueVariantIds },
          enabled: true,
          deletedAt: null,
        },
      }),
      dto.customerId
        ? this.prisma.customer.findFirst({
            where: { id: dto.customerId, tenantId, deletedAt: null },
          })
        : Promise.resolve(null),
    ]);
    if (!location)
      throw new NotFoundException('Ubicación de stock no encontrada');
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    if (dto.customerId && !customer)
      throw new NotFoundException('Cliente no encontrado');
    if (variants.length !== uniqueVariantIds.length)
      throw new NotFoundException(
        'Una o más variantes no pertenecen al tenant',
      );
    const products = await this.prisma.product.findMany({
      where: {
        tenantId,
        id: { in: variants.map((variant) => variant.productId) },
        deletedAt: null,
      },
    });

    const lines = dto.items.map((item) => {
      const variant = variants.find(
        (candidate) => candidate.id === item.productVariantId,
      )!;
      const product = products.find(
        (candidate) => candidate.id === variant.productId,
      );
      const unitPrice =
        item.unitPrice === undefined
          ? variant.price
          : new Prisma.Decimal(item.unitPrice);
      if (unitPrice === null)
        throw new BadRequestException(
          `La variante ${variant.id} no tiene precio`,
        );
      const discount = new Prisma.Decimal(item.discountAmount ?? 0);
      const lineTotal = unitPrice.mul(item.quantity).sub(discount);
      if (lineTotal.isNegative())
        throw new BadRequestException(
          'El descuento no puede superar el importe del ítem',
        );
      return { item, variant, product, unitPrice, discount, lineTotal };
    });
    const subtotal = lines.reduce(
      (sum, line) => sum.add(line.unitPrice.mul(line.item.quantity)),
      new Prisma.Decimal(0),
    );
    const discountTotal = lines.reduce(
      (sum, line) => sum.add(line.discount),
      new Prisma.Decimal(0),
    );
    const total = subtotal.sub(discountTotal);
    const saleId = crypto.randomUUID();

    let movementId = '';
    await this.prisma.$transaction(
      async (tx) => {
        const saleNumber = await nextDocumentNumber(tx, tenantId, 'SALE');
        const movementNumber = await nextDocumentNumber(
          tx,
          tenantId,
          'STOCK_MOVEMENT',
        );
        const now = new Date();
        await tx.sale.create({
          data: {
            id: saleId,
            tenantId,
            saleNumber,
            customerId: customer?.id,
            stockLocationId: dto.stockLocationId,
            channel: dto.channel ?? 'MANUAL',
            status: 'CONFIRMED',
            customerNameSnapshot: customer
              ? (customer.businessName ??
                [customer.firstName, customer.lastName]
                  .filter(Boolean)
                  .join(' '))
              : null,
            customerDocumentSnapshot: customer?.documentNumber,
            subtotal,
            discountTotal,
            total,
            currency: dto.currency?.toUpperCase() ?? tenant.defaultCurrency,
            notes: dto.notes,
            soldAt: now,
            confirmedAt: now,
            createdByUserId: userId,
          },
        });
        movementId = crypto.randomUUID();
        await tx.stockMovement.create({
          data: {
            id: movementId,
            tenantId,
            movementNumber,
            stockLocationId: dto.stockLocationId,
            movementType: 'SALE',
            saleId,
            occurredAt: now,
            createdByUserId: userId,
          },
        });
        for (const line of lines) {
          await tx.saleItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              saleId,
              productVariantId: line.variant.id,
              productNameSnapshot: line.product?.name ?? 'Producto',
              variantNameSnapshot: line.variant.name,
              skuSnapshot: line.variant.sku,
              quantity: line.item.quantity,
              unitPrice: line.unitPrice,
              discountAmount: line.discount,
              lineTotal: line.lineTotal,
            },
          });
          const delta = new Prisma.Decimal(line.item.quantity).negated();
          await applyStockDelta(
            tx,
            tenantId,
            dto.stockLocationId,
            line.variant.id,
            delta,
            (settings?.allowNegativeStock ?? false) ||
              line.variant.allowBackorder,
          );
          await tx.stockMovementItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              stockMovementId: movementId,
              productVariantId: line.variant.id,
              quantityDelta: delta,
              unitCost: line.variant.cost,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      sale: await this.findOne(tenantId, saleId),
      movement: await this.prisma.stockMovement.findUniqueOrThrow({
        where: { id: movementId },
      }),
    };
  }

  async cancel(
    tenantId: string,
    userId: string,
    id: string,
    dto: CancelSaleDto,
  ) {
    const sale = await this.prisma.sale.findFirst({ where: { id, tenantId } });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (sale.status !== 'CONFIRMED')
      throw new BadRequestException(
        'Solo se puede anular una venta confirmada',
      );
    let reversalId = '';
    await this.prisma.$transaction(
      async (tx) => {
        const original = await tx.stockMovement.findFirst({
          where: {
            tenantId,
            saleId: id,
            movementType: 'SALE',
            status: 'POSTED',
          },
        });
        if (!original)
          throw new BadRequestException(
            'La venta no tiene un movimiento de stock vigente',
          );
        const originalItems = await tx.stockMovementItem.findMany({
          where: { tenantId, stockMovementId: original.id },
        });
        const movementNumber = await nextDocumentNumber(
          tx,
          tenantId,
          'STOCK_MOVEMENT',
        );
        reversalId = crypto.randomUUID();
        await tx.stockMovement.create({
          data: {
            id: reversalId,
            tenantId,
            movementNumber,
            stockLocationId: sale.stockLocationId,
            movementType: 'SALE_REVERSAL',
            saleId: id,
            reversalOfId: original.id,
            reason: dto.reason,
            occurredAt: new Date(),
            createdByUserId: userId,
          },
        });
        for (const item of originalItems) {
          const delta = item.quantityDelta.negated();
          await applyStockDelta(
            tx,
            tenantId,
            sale.stockLocationId,
            item.productVariantId,
            delta,
            true,
          );
          await tx.stockMovementItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              stockMovementId: reversalId,
              productVariantId: item.productVariantId,
              quantityDelta: delta,
              unitCost: item.unitCost,
            },
          });
        }
        await tx.stockMovement.update({
          where: { id: original.id },
          data: { status: 'REVERSED' },
        });
        await tx.sale.update({
          where: { id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return {
      sale: await this.findOne(tenantId, id),
      reversalMovement: await this.prisma.stockMovement.findUniqueOrThrow({
        where: { id: reversalId },
      }),
    };
  }

  private async views(
    tenantId: string,
    sales: Array<
      { id: string; createdByUserId: string | null } & Record<string, unknown>
    >,
  ) {
    const items = await this.prisma.saleItem.findMany({
      where: { tenantId, saleId: { in: sales.map((sale) => sale.id) } },
    });
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: sales.flatMap((sale) =>
            sale.createdByUserId ? [sale.createdByUserId] : [],
          ),
        },
      },
      select: { id: true, displayName: true },
    });
    return sales.map((sale) => ({
      ...sale,
      createdByName:
        users.find((user) => user.id === sale.createdByUserId)?.displayName ??
        null,
      items: items.filter((item) => item.saleId === sale.id),
    }));
  }
}
