import { tenants } from "@/config/tenants";
import { rubiCategories } from "@/data/tenants/rubi/categories";
import { rubiProducts } from "@/data/tenants/rubi/products";

export const getTenantBySlug = (tenantSlug: string) =>
  tenants.find((tenant) => tenant.slug === tenantSlug && tenant.enabled);

export const getTenantStoreData = (tenantSlug: string) => {
  const tenant = getTenantBySlug(tenantSlug);

  if (!tenant) {
    return undefined;
  }

  if (tenant.id === "rubi-id") {
    return {
      tenant,
      categories: rubiCategories
        .filter((category) => category.tenantId === tenant.id && category.enabled)
        .sort((a, b) => a.displayOrder - b.displayOrder),
      products: rubiProducts.filter((product) => product.tenantId === tenant.id),
    };
  }

  return { tenant, categories: [], products: [] };
};
