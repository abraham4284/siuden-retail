import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DocumentType, Prisma } from '@prisma/client';

export function formatDocumentNumber(
  prefix: string,
  value: bigint,
  padding: number,
): string {
  return `${prefix}${value.toString().padStart(padding, '0')}`;
}

export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  documentType: DocumentType,
): Promise<string> {
  const rows = await tx.$queryRaw<
    Array<{ id: string; prefix: string; next_value: bigint; padding: number }>
  >`
    SELECT id, prefix, next_value, padding
    FROM document_sequences
    WHERE tenant_id = ${tenantId} AND document_type = ${documentType}
    FOR UPDATE
  `;
  const sequence = rows[0];
  if (!sequence)
    throw new NotFoundException(
      `No existe la secuencia ${documentType} para el tenant`,
    );
  await tx.documentSequence.update({
    where: { id: sequence.id },
    data: { nextValue: { increment: 1 } },
  });
  return formatDocumentNumber(
    sequence.prefix,
    sequence.next_value,
    sequence.padding,
  );
}

export async function applyStockDelta(
  tx: Prisma.TransactionClient,
  tenantId: string,
  stockLocationId: string,
  productVariantId: string,
  quantityDelta: Prisma.Decimal,
  allowNegative: boolean,
): Promise<void> {
  const rows = await tx.$queryRaw<
    Array<{ id: string; on_hand: Prisma.Decimal }>
  >`
    SELECT id, on_hand
    FROM inventory_balances
    WHERE tenant_id = ${tenantId}
      AND stock_location_id = ${stockLocationId}
      AND product_variant_id = ${productVariantId}
    FOR UPDATE
  `;
  const current = rows[0];
  const newBalance = (current?.on_hand ?? new Prisma.Decimal(0)).add(
    quantityDelta,
  );
  if (!allowNegative && newBalance.isNegative()) {
    throw new BadRequestException(
      `Stock insuficiente para la variante ${productVariantId}`,
    );
  }
  if (current) {
    await tx.inventoryBalance.update({
      where: { id: current.id },
      data: { onHand: newBalance },
    });
  } else {
    await tx.inventoryBalance.create({
      data: {
        id: crypto.randomUUID(),
        tenantId,
        stockLocationId,
        productVariantId,
        onHand: newBalance,
      },
    });
  }
}
