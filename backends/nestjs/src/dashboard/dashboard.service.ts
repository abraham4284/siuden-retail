import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [
      tenant,
      publishedProducts,
      variants,
      balances,
      salesToday,
      recentSales,
      recentMovements,
    ] = await Promise.all([
      this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
      this.prisma.product.count({
        where: { tenantId, status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.productVariant.count({
        where: { tenantId, enabled: true, deletedAt: null },
      }),
      this.prisma.inventoryBalance.findMany({ where: { tenantId } }),
      this.prisma.sale.findMany({
        where: { tenantId, status: 'CONFIRMED', soldAt: { gte: start } },
      }),
      this.prisma.sale.findMany({
        where: { tenantId },
        orderBy: { soldAt: 'desc' },
        take: 5,
      }),
      this.prisma.stockMovement.findMany({
        where: { tenantId },
        orderBy: { occurredAt: 'desc' },
        take: 5,
      }),
    ]);
    const availableUnits = balances.reduce(
      (sum, item) => sum.add(item.onHand.sub(item.reserved)),
      new Prisma.Decimal(0),
    );
    const totalSoldToday = salesToday.reduce(
      (sum, sale) => sum.add(sale.total),
      new Prisma.Decimal(0),
    );
    const lowStockItems = balances.filter(
      (item) =>
        item.lowStockThreshold !== null &&
        item.onHand.sub(item.reserved).lte(item.lowStockThreshold),
    );

    return {
      publishedProducts,
      variants,
      availableUnits,
      lowStockItems: lowStockItems.length,
      salesToday: salesToday.length,
      totalSoldToday,
      currency: tenant.defaultCurrency,
      lowStockProducts: await this.inventoryViews(
        tenantId,
        lowStockItems.slice(0, 5),
      ),
      recentMovements: await this.movementViews(tenantId, recentMovements),
      recentSales: await this.saleViews(tenantId, recentSales),
    };
  }

  private async inventoryViews(
    tenantId: string,
    balances: Array<{
      stockLocationId: string;
      productVariantId: string;
      onHand: Prisma.Decimal;
      reserved: Prisma.Decimal;
      lowStockThreshold: Prisma.Decimal | null;
    }>,
  ) {
    const variants = await this.prisma.productVariant.findMany({
      where: {
        tenantId,
        id: { in: balances.map((item) => item.productVariantId) },
      },
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: variants.map((item) => item.productId) } },
    });
    return balances.map((balance) => {
      const variant = variants.find(
        (item) => item.id === balance.productVariantId,
      )!;
      const product = products.find((item) => item.id === variant?.productId)!;
      const available = balance.onHand.sub(balance.reserved);
      return {
        tenantId,
        stockLocationId: balance.stockLocationId,
        productId: product?.id ?? '',
        variantId: variant?.id ?? balance.productVariantId,
        productName: product?.name ?? 'Producto',
        variantName: variant?.name ?? 'Variante',
        sku: variant?.sku ?? null,
        imageUrl: null,
        categoryNames: [],
        onHand: balance.onHand,
        reserved: balance.reserved,
        available,
        lowStockThreshold: balance.lowStockThreshold,
        trackInventory: variant?.trackInventory ?? true,
        status: available.lte(0) ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      };
    });
  }

  private async movementViews(
    tenantId: string,
    movements: Array<
      {
        id: string;
        movementType: string;
        createdByUserId: string | null;
      } & Record<string, unknown>
    >,
  ) {
    const items = await this.prisma.stockMovementItem.findMany({
      where: {
        tenantId,
        stockMovementId: { in: movements.map((item) => item.id) },
      },
    });
    const variantIds = items.map((item) => item.productVariantId);
    const variants = await this.prisma.productVariant.findMany({
      where: { tenantId, id: { in: variantIds } },
    });
    const products = await this.prisma.product.findMany({
      where: { tenantId, id: { in: variants.map((item) => item.productId) } },
    });
    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: movements.flatMap((item) =>
            item.createdByUserId ? [item.createdByUserId] : [],
          ),
        },
      },
      select: { id: true, displayName: true },
    });
    return movements.map((movement) => ({
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
    }));
  }

  private async saleViews(
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
