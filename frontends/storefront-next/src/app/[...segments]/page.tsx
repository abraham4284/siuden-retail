import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryStorefront } from "@/components/storefront/category-storefront";
import { TenantStorefront } from "@/components/storefront/tenant-storefront";
import { tenants } from "@/config/tenants";
import { findCategoryByRoute, getCategoryRouteSegments } from "@/lib/categories";
import { getTenantBySlug, getTenantStoreData } from "@/lib/tenants";

type StorefrontRouteProps = {
  params: Promise<{ segments: string[] }>;
};

const DEFAULT_TENANT_SLUG = "rubi";

const resolveRoute = (segments: string[]) => {
  const prefixedTenant = getTenantBySlug(segments[0]);

  if (prefixedTenant) {
    return {
      basePath: `/${prefixedTenant.slug}`,
      categorySegments: segments.slice(1),
      tenantSlug: prefixedTenant.slug,
    };
  }

  return {
    basePath: "",
    categorySegments: segments,
    tenantSlug: DEFAULT_TENANT_SLUG,
  };
};

export const dynamicParams = false;

export function generateStaticParams() {
  const paths: Array<{ segments: string[] }> = [];

  tenants
    .filter((tenant) => tenant.enabled && tenant.settings.isPublished)
    .forEach((tenant) => {
      const store = getTenantStoreData(tenant.slug);
      if (!store) return;

      paths.push({ segments: [tenant.slug] });
      store.allCategories.forEach((category) => {
        const categorySegments = getCategoryRouteSegments(category, store.allCategories);
        paths.push({ segments: [tenant.slug, ...categorySegments] });

        if (tenant.slug === DEFAULT_TENANT_SLUG) {
          paths.push({ segments: categorySegments });
        }
      });
    });

  return paths;
}

export async function generateMetadata({ params }: StorefrontRouteProps): Promise<Metadata> {
  const { segments } = await params;
  const route = resolveRoute(segments);
  const store = getTenantStoreData(route.tenantSlug);

  if (!store) return {};

  const category = route.categorySegments.length
    ? findCategoryByRoute(route.categorySegments, store.allCategories)
    : undefined;

  return {
    title: { absolute: category ? `${category.name} | ${store.tenant.name}` : store.tenant.name },
    description: category
      ? `Productos de ${category.name} disponibles en ${store.tenant.name}.`
      : `Joyas seleccionadas y atención personalizada en ${store.tenant.city ?? "Argentina"}.`,
  };
}

export default async function StorefrontRoute({ params }: StorefrontRouteProps) {
  const { segments } = await params;
  const route = resolveRoute(segments);
  const store = getTenantStoreData(route.tenantSlug);

  if (!store) notFound();

  if (route.categorySegments.length === 0) {
    return <TenantStorefront {...store} basePath={route.basePath} />;
  }

  const category = findCategoryByRoute(route.categorySegments, store.allCategories);
  if (!category) notFound();

  return <CategoryStorefront {...store} basePath={route.basePath} category={category} />;
}
