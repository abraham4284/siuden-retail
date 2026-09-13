export type StoreCategory = {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isVisible: boolean;
  sortOrder: number;
};

export type StoreProductVariant = {
  id: string;
  name: string;
  sku: string | null;
  price: number | null;
  compareAtPrice: number | null;
  enabled: boolean;
  trackInventory: boolean;
  allowBackorder: boolean;
  available: number;
};

export type StoreProduct = {
  id: string;
  tenantId: string;
  primaryCategoryId: string | null;
  categoryIds: string[];
  name: string;
  slug: string;
  description?: string;
  material?: string;
  status: "PUBLISHED";
  sellingMode: "DIRECT" | "INQUIRY_ONLY";
  price: number | null;
  compareAtPrice: number | null;
  imageUrls: string[];
  variants: StoreProductVariant[];
  featured: boolean;
  isNew: boolean;
  stockStatus: "available" | "low-stock" | "out-of-stock";
};

export type CatalogProductRecord = Omit<
  StoreProduct,
  "status" | "price" | "compareAtPrice" | "stockStatus" | "variants"
> & {
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  variants: Array<Omit<StoreProductVariant, "available">>;
};

export type InventoryBalanceRecord = {
  tenantId: string;
  productVariantId: string;
  onHand: number;
  reserved: number;
  lowStockThreshold: number | null;
};
