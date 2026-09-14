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
import { CreatePurchaseDto, PurchaseQueryDto } from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query: PurchaseQueryDto) {
    const where: Prisma.PurchaseWhereInput = {
      tenantId,
      status: query.status,
      supplierId: query.supplierId,
      stockLocationId: query.stockLocationId,
      OR: query.search
        ? [
            { purchaseNumber: { contains: query.search } },
            { documentNumber: { contains: query.search } },
          ]
        : undefined,
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        ...paginationArgs(query),
        orderBy: { purchasedAt: 'desc' },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(tenantId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    const items = await this.prisma.purchaseItem.findMany({
      where: { tenantId, purchaseId: id },
    });
    return { ...purchase, items };
  }

  async create(tenantId: string, userId: string, dto: CreatePurchaseDto) {
    if (!dto.items.length)
      throw new BadRequestException('La compra debe incluir al menos un ítem');
    const variantIds = [
      ...new Set(dto.items.map((item) => item.productVariantId)),
    ];
    if (variantIds.length !== dto.items.length)
      throw new BadRequestException('No se puede repetir una variante');
    const [tenant, location, supplier, variants] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: tenantId } }),
      this.prisma.stockLocation.findFirst({
        where: { id: dto.stockLocationId, tenantId, enabled: true },
      }),
      dto.supplierId
        ? this.prisma.supplier.findFirst({
            where: { id: dto.supplierId, tenantId, deletedAt: null },
          })
        : Promise.resolve(null),
      this.prisma.productVariant.findMany({
        where: { tenantId, id: { in: variantIds }, deletedAt: null },
      }),
    ]);
    if (!tenant || !location)
      throw new NotFoundException('Tenant o ubicación de stock no encontrado');
    if (dto.supplierId && !supplier)
      throw new NotFoundException('Proveedor no encontrado');
    if (variants.length !== variantIds.length)
      throw new NotFoundException(
        'Una o más variantes no pertenecen al tenant',
      );

    const lines = dto.items.map((item) => {
      const variant = variants.find(
        (candidate) => candidate.id === item.productVariantId,
      )!;
      const unitCost = new Prisma.Decimal(item.unitCost);
      const discount = new Prisma.Decimal(item.discountAmount ?? 0);
      const lineTotal = unitCost.mul(item.quantity).sub(discount);
      if (lineTotal.isNegative())
        throw new BadRequestException(
          'El descuento no puede superar el importe del ítem',
        );
      return { item, variant, unitCost, discount, lineTotal };
    });
    const subtotal = lines.reduce(
      (sum, line) => sum.add(line.unitCost.mul(line.item.quantity)),
      new Prisma.Decimal(0),
    );
    const discountTotal = lines.reduce(
      (sum, line) => sum.add(line.discount),
      new Prisma.Decimal(0),
    );
    const purchaseId = crypto.randomUUID();
    await this.prisma.$transaction(
      async (tx) => {
        const purchaseNumber = await nextDocumentNumber(
          tx,
          tenantId,
          'PURCHASE',
        );
        await tx.purchase.create({
          data: {
            id: purchaseId,
            tenantId,
            purchaseNumber,
            supplierId: supplier?.id,
            stockLocationId: location.id,
            documentType: dto.documentType,
            documentNumber: dto.documentNumber,
            status: 'ORDERED',
            subtotal,
            discountTotal,
            total: subtotal.sub(discountTotal),
            currency: dto.currency?.toUpperCase() ?? tenant.defaultCurrency,
            notes: dto.notes,
            purchasedAt: new Date(),
            createdByUserId: userId,
          },
        });
        await tx.purchaseItem.createMany({
          data: lines.map((line) => ({
            id: crypto.randomUUID(),
            tenantId,
            purchaseId,
            productVariantId: line.variant.id,
            descriptionSnapshot: `${line.variant.name}${line.variant.sku ? ` (${line.variant.sku})` : ''}`,
            orderedQuantity: line.item.quantity,
            unitCost: line.unitCost,
            discountAmount: line.discount,
            lineTotal: line.lineTotal,
          })),
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(tenantId, purchaseId);
  }

  async receive(tenantId: string, userId: string, id: string) {
    const purchase = await this.prisma.purchase.findFirst({
      where: { id, tenantId },
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    if (!['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'].includes(purchase.status)) {
      throw new BadRequestException('La compra no admite nuevas recepciones');
    }
    const items = await this.prisma.purchaseItem.findMany({
      where: { tenantId, purchaseId: id },
    });
    const pending = items
      .map((item) => ({
        item,
        quantity: item.orderedQuantity.sub(item.receivedQuantity),
      }))
      .filter((line) => line.quantity.isPositive());
    if (!pending.length)
      throw new BadRequestException('La compra no tiene cantidades pendientes');

    await this.prisma.$transaction(
      async (tx) => {
        const movementNumber = await nextDocumentNumber(
          tx,
          tenantId,
          'STOCK_MOVEMENT',
        );
        const movementId = crypto.randomUUID();
        await tx.stockMovement.create({
          data: {
            id: movementId,
            tenantId,
            movementNumber,
            stockLocationId: purchase.stockLocationId,
            movementType: 'PURCHASE',
            purchaseId: purchase.id,
            occurredAt: new Date(),
            createdByUserId: userId,
          },
        });
        for (const line of pending) {
          await applyStockDelta(
            tx,
            tenantId,
            purchase.stockLocationId,
            line.item.productVariantId,
            line.quantity,
            true,
          );
          await tx.stockMovementItem.create({
            data: {
              id: crypto.randomUUID(),
              tenantId,
              stockMovementId: movementId,
              productVariantId: line.item.productVariantId,
              quantityDelta: line.quantity,
              unitCost: line.item.unitCost,
            },
          });
          await tx.purchaseItem.update({
            where: { id: line.item.id },
            data: { receivedQuantity: line.item.orderedQuantity },
          });
        }
        await tx.purchase.update({
          where: { id },
          data: { status: 'RECEIVED', receivedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return this.findOne(tenantId, id);
  }
}
