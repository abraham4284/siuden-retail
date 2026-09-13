import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TenantStorefront } from "@/components/storefront/tenant-storefront";
import { tenants } from "@/config/tenants";
import { getTenantStoreData } from "@/lib/tenants";

type TenantPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return tenants
    .filter((tenant) => tenant.enabled)
    .map((tenant) => ({ tenantSlug: tenant.slug }));
}

export async function generateMetadata({ params }: TenantPageProps): Promise<Metadata> {
  const { tenantSlug } = await params;
  const store = getTenantStoreData(tenantSlug);

  if (!store) {
    return {};
  }

  return {
    title: { absolute: store.tenant.name },
    description: `Joyas seleccionadas y atención personalizada en ${store.tenant.city ?? "Argentina"}.`,
  };
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenantSlug } = await params;
  const store = getTenantStoreData(tenantSlug);

  if (!store) {
    notFound();
  }

  return <TenantStorefront {...store} />;
}
