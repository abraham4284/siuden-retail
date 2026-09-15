import { tenants } from "@/config/tenants";
import type { StoreCategory, StoreProduct } from "@/types/storefront";
import type { StorefrontSettings, TenantConfig } from "@/types/tenant";

export const getTenantBySlug = (tenantSlug: string) =>
  tenants.find(
    (tenant) => tenant.slug === tenantSlug && tenant.enabled && tenant.settings.isPublished,
  );

type ApiCatalog = {
  tenant: {
    id: string; slug: string; name: string; defaultCurrency: string; timeZone: string; enabled: boolean;
    profile: { brandName: string; contactEmail: string | null; phone: string | null; addressLine: string | null; addressNumber: string | null; city: string | null; province: string | null; postalCode: string | null; countryCode: string } | null;
    settings: StorefrontSettings;
    theme: Partial<TenantConfig["theme"]> | null;
    contacts: Array<{ channelType: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "OTHER"; value: string | null; url: string | null; enabled: boolean; sortOrder: number }>;
  };
  categories: StoreCategory[];
  products: Array<Omit<StoreProduct, "status" | "price" | "compareAtPrice" | "stockStatus"> & { status: string }>;
};

const toStoreProduct = (record: ApiCatalog["products"][number]): StoreProduct | null => {
  if (record.status !== "PUBLISHED") return null;
  const variants = record.variants.filter((variant) => variant.enabled);

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
    return (
      variant.available > 0 &&
      variant.available <= 2
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

export const getTenantStoreData = async (tenantSlug: string) => {
  const configuredTenant = getTenantBySlug(tenantSlug);

  if (!configuredTenant) {
    return undefined;
  }
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1").replace(/\/$/, "");
  try {
    const response = await fetch(`${baseUrl}/storefront/catalog/${encodeURIComponent(tenantSlug)}`, { cache: "no-store" });
    if (!response.ok) return undefined;
    const api = await response.json() as ApiCatalog;
    const tenant = {
      ...configuredTenant,
      id: api.tenant.id,
      name: api.tenant.profile?.brandName ?? api.tenant.name,
      defaultCurrency: api.tenant.defaultCurrency,
      timeZone: api.tenant.timeZone,
      enabled: api.tenant.enabled,
      contactEmail: api.tenant.profile?.contactEmail ?? null,
      phone: api.tenant.profile?.phone ?? null,
      addressLine: api.tenant.profile?.addressLine ?? null,
      addressNumber: api.tenant.profile?.addressNumber ?? null,
      city: api.tenant.profile?.city ?? null,
      province: api.tenant.profile?.province ?? null,
      postalCode: api.tenant.profile?.postalCode ?? null,
      countryCode: api.tenant.profile?.countryCode ?? "AR",
      settings: api.tenant.settings,
      theme: { ...configuredTenant.theme, ...(api.tenant.theme ?? {}) },
      contactChannels: api.tenant.contacts.flatMap((channel) => channel.value && channel.url ? [{ type: channel.channelType, value: channel.value, url: channel.url, enabled: channel.enabled, sortOrder: channel.sortOrder }] : []),
    };
    const products = api.products
      .map(toStoreProduct)
      .filter((product): product is StoreProduct => product !== null);
    const allCategories = api.categories
      .filter((category) => category.isVisible)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return {
      tenant,
      allCategories,
      categories: allCategories.filter((category) => category.parentId === null),
      products: sortProducts(products, tenant.settings),
    };
  } catch {
    return undefined;
  }
};
