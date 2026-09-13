import { tenants } from "@/config/tenants";
import { rubiCategories } from "@/data/tenants/rubi/categories";
import { rubiInventoryBalances, rubiProductRecords } from "@/data/tenants/rubi/products";
import type { CatalogProductRecord, StoreProduct } from "@/types/storefront";
import type { StorefrontSettings } from "@/types/tenant";

export const getTenantBySlug = (tenantSlug: string) =>
  tenants.find(
    (tenant) => tenant.slug === tenantSlug && tenant.enabled && tenant.settings.isPublished,
  );

const toStoreProduct = (record: CatalogProductRecord): StoreProduct | null => {
  if (record.status !== "PUBLISHED") return null;

  const variants = record.variants
    .filter((variant) => variant.enabled)
    .map((variant) => {
      const balance = rubiInventoryBalances.find(
        (candidate) =>
          candidate.tenantId === record.tenantId &&
          candidate.productVariantId === variant.id,
      );
      const available = variant.trackInventory
        ? Math.max(0, (balance?.onHand ?? 0) - (balance?.reserved ?? 0))
        : Number.POSITIVE_INFINITY;

      return { ...variant, available };
    });

  if (variants.length === 0) return null;

  const prices = variants
    .map((variant) => variant.price)
    .filter((price): price is number => price !== null);
  const compareAtPrices = variants
    .map((variant) => variant.compareAtPrice)
    .filter((price): price is number => price !== null);
  const trackedVariants = variants.filter((variant) => variant.trackInventory);
  const canSell = variants.some(
    (variant) => !variant.trackInventory || variant.available > 0 || variant.allowBackorder,
  );
  const hasLowStock = trackedVariants.some((variant) => {
    const balance = rubiInventoryBalances.find(
      (candidate) => candidate.productVariantId === variant.id,
    );
    return (
      variant.available > 0 &&
      balance?.lowStockThreshold !== null &&
      balance?.lowStockThreshold !== undefined &&
      variant.available <= balance.lowStockThreshold
    );
  });

  return {
    ...record,
    status: "PUBLISHED",
    price: prices.length > 0 ? Math.min(...prices) : null,
    compareAtPrice: compareAtPrices.length > 0 ? Math.min(...compareAtPrices) : null,
    variants,
    stockStatus: !canSell ? "out-of-stock" : hasLowStock ? "low-stock" : "available",
  };
};

const sortProducts = (products: StoreProduct[], settings: StorefrontSettings) => {
  const sorted = [...products];

  switch (settings.defaultCatalogSort) {
    case "NEWEST":
      return sorted.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    case "PRICE_ASC":
      return sorted.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
    case "PRICE_DESC":
      return sorted.sort((a, b) => (b.price ?? Number.NEGATIVE_INFINITY) - (a.price ?? Number.NEGATIVE_INFINITY));
    case "NAME_ASC":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
    case "FEATURED":
    default:
      return sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
};

export const getTenantStoreData = (tenantSlug: string) => {
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) {
    return undefined;
  }

  if (tenant.id === "rubi-id") {
    const products = rubiProductRecords
      .filter((product) => product.tenantId === tenant.id)
      .map(toStoreProduct)
      .filter((product): product is StoreProduct => product !== null);

    return {
      tenant,
      categories: rubiCategories
        .filter(
          (category) =>
            category.tenantId === tenant.id && category.isVisible && category.parentId === null,
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
      products: sortProducts(products, tenant.settings),
    };
  }

  return { tenant, categories: [], products: [] };
};
