import 'dotenv/config';

import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_TENANT_ID = '22222222-2222-4222-8222-222222222222';
const DEFAULT_LOCATION_ID = '90000000-0000-4000-8000-000000000001';

const categories = [
  ['a0000000-0000-4000-8000-000000000001', 'general', 'General', null, 0],
  ['a0000000-0000-4000-8000-000000000002', 'oro-18kt', 'Oro 18kt', null, 1],
  ['a0000000-0000-4000-8000-000000000011', 'oro-18kt-anillos', 'Anillos', 'a0000000-0000-4000-8000-000000000002', 0],
  ['a0000000-0000-4000-8000-000000000012', 'oro-18kt-pulseras', 'Pulseras', 'a0000000-0000-4000-8000-000000000002', 1],
  ['a0000000-0000-4000-8000-000000000013', 'oro-18kt-dijes', 'Dijes', 'a0000000-0000-4000-8000-000000000002', 2],
  ['a0000000-0000-4000-8000-000000000015', 'oro-18kt-aros', 'Aros', 'a0000000-0000-4000-8000-000000000002', 4],
  ['a0000000-0000-4000-8000-000000000003', 'plata', 'Plata', null, 2],
  ['a0000000-0000-4000-8000-000000000021', 'plata-anillos', 'Anillos', 'a0000000-0000-4000-8000-000000000003', 0],
  ['a0000000-0000-4000-8000-000000000028', 'plata-anillos-san-benito', 'San Benito', 'a0000000-0000-4000-8000-000000000021', 0],
] as const;

const products = [
  ['b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 'AG1,7 (A) Roseta', 'ag-1-7-a-roseta', 'RUBI-ORO-001', 605000, 'a0000000-0000-4000-8000-000000000011', 3],
  ['b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000002', 'AS13', 'as-13', 'RUBI-PLATA-013', 20000, 'a0000000-0000-4000-8000-000000000028', 7],
  ['b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000003', 'AS24', 'as-24', 'RUBI-PLATA-024', 36000, 'a0000000-0000-4000-8000-000000000028', 0],
  ['b0000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000004', 'PG5.9 (Roca)', 'pg-5-9-roca', 'RUBI-ORO-059', 2000000, 'a0000000-0000-4000-8000-000000000012', 2],
  ['b0000000-0000-4000-8000-000000000005', 'b1000000-0000-4000-8000-000000000005', 'DG0,5 (acc)', 'dg-0-5-acc', 'RUBI-ORO-005', 175000, 'a0000000-0000-4000-8000-000000000013', 12],
  ['b0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-000000000006', 'DG0,3 (Mz)', 'dg-0-3-mz', 'RUBI-ORO-003-MZ', 110000, 'a0000000-0000-4000-8000-000000000013', 1],
  ['b0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-000000000007', 'DG0,3 (G)', 'dg-0-3-g', 'RUBI-ORO-003-G', 110000, 'a0000000-0000-4000-8000-000000000013', 4],
  ['b0000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-000000000008', 'HG1,1 (Ga)', 'hg-1-1-ga', 'RUBI-ORO-011-GA', 385000, 'a0000000-0000-4000-8000-000000000015', 5],
] as const;

async function main(): Promise<void> {
  const tenantId = process.env.SEED_CATALOG_TENANT_ID?.trim() || DEFAULT_TENANT_ID;
  const locationId = process.env.SEED_CATALOG_LOCATION_ID?.trim() || DEFAULT_LOCATION_ID;
  const [tenant, location] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.stockLocation.findFirst({ where: { id: locationId, tenantId, enabled: true } }),
  ]);
  if (!tenant) throw new Error(`No existe el tenant ${tenantId}; ejecutá primero prisma:seed.`);
  if (!location) throw new Error(`No existe la ubicación ${locationId} para el tenant ${tenantId}.`);

  for (const [id, slug, name, parentId, sortOrder] of categories) {
    await prisma.category.upsert({
      where: { tenantId_slug: { tenantId, slug } },
      create: { id, tenantId, slug, name, parentId, sortOrder, isVisible: true },
      update: { name, parentId, sortOrder, isVisible: true, deletedAt: null },
    });
  }

  const catalogAssets = {
    gold: await prisma.mediaAsset.upsert({
      where: {
        tenantId_storageKey: {
          tenantId,
          storageKey: 'images/tenants/rubi/products/joyas-oro.webp',
        },
      },
      create: {
        id: 'c2000000-0000-4000-8000-000000000001',
        tenantId,
        storageKey: 'images/tenants/rubi/products/joyas-oro.webp',
        originalName: 'joyas-oro.webp',
        mimeType: 'image/webp',
        sizeBytes: 0,
        altText: 'Joyas de oro de Rubí',
      },
      update: { status: 'ACTIVE', deletedAt: null },
    }),
    silver: await prisma.mediaAsset.upsert({
      where: {
        tenantId_storageKey: {
          tenantId,
          storageKey: 'images/tenants/rubi/products/plata-y-reloj.webp',
        },
      },
      create: {
        id: 'c2000000-0000-4000-8000-000000000002',
        tenantId,
        storageKey: 'images/tenants/rubi/products/plata-y-reloj.webp',
        originalName: 'plata-y-reloj.webp',
        mimeType: 'image/webp',
        sizeBytes: 0,
        altText: 'Joyas de plata de Rubí',
      },
      update: { status: 'ACTIVE', deletedAt: null },
    }),
    hero: await prisma.mediaAsset.upsert({
      where: {
        tenantId_storageKey: {
          tenantId,
          storageKey: 'images/tenants/rubi/hero/coleccion-rubi.webp',
        },
      },
      create: {
        id: 'c2000000-0000-4000-8000-000000000003',
        tenantId,
        storageKey: 'images/tenants/rubi/hero/coleccion-rubi.webp',
        originalName: 'coleccion-rubi.webp',
        mimeType: 'image/webp',
        sizeBytes: 0,
        altText: 'Colección de joyas Rubí',
      },
      update: { status: 'ACTIVE', deletedAt: null },
    }),
  };

  for (const [productId, variantId, name, slug, sku, price, categoryId, stock] of products) {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.upsert({
        where: { tenantId_slug: { tenantId, slug } },
        create: { id: productId, tenantId, name, slug, status: 'PUBLISHED', sellingMode: 'DIRECT', seoTitle: name, publishedAt: new Date() },
        update: { name, status: 'PUBLISHED', sellingMode: 'DIRECT', seoTitle: name, deletedAt: null },
      });
      await tx.productCategory.upsert({
        where: { productId_categoryId: { productId: product.id, categoryId } },
        create: { tenantId, productId: product.id, categoryId, isPrimary: true },
        update: { isPrimary: true },
      });
      const variant = await tx.productVariant.upsert({
        where: { tenantId_sku: { tenantId, sku } },
        create: { id: variantId, tenantId, productId: product.id, name: 'Default', sku, price: new Prisma.Decimal(price), trackInventory: true, isDefault: true },
        update: { name: 'Default', sku, price: new Prisma.Decimal(price), trackInventory: true, isDefault: true, enabled: true, deletedAt: null },
      });
      const asset = categoryId.startsWith('a0000000-0000-4000-8000-00000000002')
        ? catalogAssets.silver
        : categoryId === 'a0000000-0000-4000-8000-000000000011' ||
            categoryId === 'a0000000-0000-4000-8000-000000000012'
          ? catalogAssets.gold
          : catalogAssets.hero;
      await tx.productImage.upsert({
        where: { id: productId.replace(/^b0/, 'b3') },
        create: {
          id: productId.replace(/^b0/, 'b3'),
          tenantId,
          productId: product.id,
          mediaAssetId: asset.id,
          isPrimary: true,
        },
        update: { mediaAssetId: asset.id, isPrimary: true },
      });
      await tx.inventoryBalance.upsert({
        where: { tenantId_stockLocationId_productVariantId: { tenantId, stockLocationId: locationId, productVariantId: variant.id } },
        create: { id: crypto.randomUUID(), tenantId, stockLocationId: locationId, productVariantId: variant.id, onHand: stock, reserved: 0, lowStockThreshold: 2 },
        update: { lowStockThreshold: 2 },
      });
    });
  }
  console.info(`Catálogo inicial completado para ${tenant.name}: ${products.length} productos.`);
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
