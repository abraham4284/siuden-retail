import type { CatalogProductRecord, InventoryBalanceRecord } from "@/types/storefront";

const TENANT_ID = "rubi-id";
const GOLD_IMAGE = "/images/tenants/rubi/products/joyas-oro.webp";
const SILVER_IMAGE = "/images/tenants/rubi/products/plata-y-reloj.webp";
const HERO_IMAGE = "/images/tenants/rubi/hero/coleccion-rubi.webp";

type ProductSeed = {
  slug: string;
  name: string;
  price: number;
  material: string;
  categorySlugs: string[];
  imageUrl: string;
  featured: boolean;
  isNew?: boolean;
};

const product = ({
  slug,
  name,
  price,
  material,
  categorySlugs,
  imageUrl,
  featured,
  isNew = false,
}: ProductSeed): CatalogProductRecord => ({
  id: `rubi-product-${slug}`,
  tenantId: TENANT_ID,
  primaryCategoryId: `rubi-cat-${categorySlugs.at(-1)}`,
  categoryIds: categorySlugs.map((categorySlug) => `rubi-cat-${categorySlug}`),
  name,
  slug,
  material,
  status: "PUBLISHED",
  sellingMode: "DIRECT",
  imageUrls: [imageUrl],
  variants: [
    {
      id: `rubi-variant-${slug}`,
      name: "Default",
      sku: null,
      price,
      compareAtPrice: null,
      enabled: true,
      trackInventory: true,
      allowBackorder: false,
    },
  ],
  featured,
  isNew,
});

export const rubiProductRecords: CatalogProductRecord[] = [
  product({ slug: "ag-1-7-a-roseta", name: "AG1,7 (A) Roseta", price: 605_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-anillos"], imageUrl: GOLD_IMAGE, featured: true }),
  product({ slug: "as-13", name: "AS13", price: 20_000, material: "Plata", categorySlugs: ["plata", "plata-anillos", "plata-anillos-san-benito"], imageUrl: SILVER_IMAGE, featured: true }),
  product({ slug: "as-24", name: "AS24", price: 36_000, material: "Plata", categorySlugs: ["plata", "plata-anillos", "plata-anillos-san-benito"], imageUrl: SILVER_IMAGE, featured: true }),
  product({ slug: "pg-5-9-roca", name: "PG5.9 (Roca)", price: 2_000_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: true }),
  product({ slug: "pg-1-8-dep", name: "PG1,8 (DEP)", price: 630_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-1-8-d", name: "PG1,8 (D)", price: 630_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-6-3-d", name: "PG6,3 (D)", price: 2_000_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-4-6-d", name: "PG4,6 (D)", price: 1_560_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-4-4-d", name: "PG4,4 (D)", price: 1_500_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-1-4-m-bolitas", name: "PG1,4 (M) Bolitas", price: 490_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "pg-1-4-m-piedritas", name: "PG1,4 (M) Piedritas", price: 490_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-pulseras"], imageUrl: GOLD_IMAGE, featured: false }),
  product({ slug: "dg-0-5-acc", name: "DG0,5 (acc)", price: 175_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-dijes"], imageUrl: HERO_IMAGE, featured: false, isNew: true }),
  product({ slug: "dg-0-3-mz", name: "DG0,3 (Mz)", price: 110_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-dijes"], imageUrl: HERO_IMAGE, featured: false, isNew: true }),
  product({ slug: "dg-0-3-g", name: "DG0,3 (G)", price: 110_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-dijes"], imageUrl: HERO_IMAGE, featured: false, isNew: true }),
  product({ slug: "hg-1-1-ga", name: "HG1,1 (Ga)", price: 385_000, material: "Oro 18K", categorySlugs: ["oro-18kt", "oro-18kt-aros"], imageUrl: HERO_IMAGE, featured: false, isNew: true }),
];

const balance = (
  productSlug: string,
  onHand: number,
  lowStockThreshold: number,
): InventoryBalanceRecord => ({
  tenantId: TENANT_ID,
  productVariantId: `rubi-variant-${productSlug}`,
  onHand,
  reserved: 0,
  lowStockThreshold,
});

export const rubiInventoryBalances: InventoryBalanceRecord[] = [
  balance("ag-1-7-a-roseta", 4, 3),
  balance("as-13", 8, 3),
  balance("as-24", 0, 2),
  balance("pg-5-9-roca", 2, 3),
  balance("pg-1-8-dep", 7, 3),
  balance("pg-1-8-d", 5, 3),
  balance("pg-6-3-d", 2, 2),
  balance("pg-4-6-d", 3, 2),
  balance("pg-4-4-d", 4, 2),
  balance("pg-1-4-m-bolitas", 6, 2),
  balance("pg-1-4-m-piedritas", 5, 2),
  balance("dg-0-5-acc", 12, 2),
  balance("dg-0-3-mz", 1, 2),
  balance("dg-0-3-g", 4, 2),
  balance("hg-1-1-ga", 5, 2),
];
