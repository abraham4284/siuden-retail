import { TenantStorefront } from "@/components/storefront/tenant-storefront";
import { getTenantStoreData } from "@/lib/tenants";

export default async function HomePage() {
  const store = await getTenantStoreData("rubi");

  if (!store) {
    return null;
  }

  return <TenantStorefront {...store} basePath="" />;
}
