import { TenantStorefront } from "@/components/storefront/tenant-storefront";
import { getTenantStoreData } from "@/lib/tenants";

export default function HomePage() {
  const store = getTenantStoreData("rubi");

  if (!store) {
    return null;
  }

  return <TenantStorefront {...store} />;
}
