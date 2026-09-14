import type { StoreCategory, StoreProduct } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
import { getStorefrontThemeStyles } from "@/lib/storefront-theme";
import { AnnouncementBar } from "./announcement-bar";
import { CategoryGrid } from "./category-grid";
import { Hero } from "./hero";
import { ProductGrid } from "./product-grid";
import { StoreBenefits } from "./store-benefits";
import { StoreFooter } from "./store-footer";
import { StoreHeader } from "./store-header";
import { WhatsappBanner } from "./whatsapp-banner";
import { WhatsappFloatingButton } from "./whatsapp-floating-button";

type TenantStorefrontProps = {
  allCategories: StoreCategory[];
  basePath?: string;
  categories: StoreCategory[];
  products: StoreProduct[];
  tenant: TenantConfig;
};

export function TenantStorefront({ allCategories, basePath = "", categories, products, tenant }: TenantStorefrontProps) {
  const featuredProducts = products.filter((product) => product.featured);
  const remainingProducts = products.filter((product) => !product.featured);
  const themeStyles = getStorefrontThemeStyles(tenant);

  return (
    <div className="storefront-root" style={themeStyles}>
      <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
      <AnnouncementBar
        href={tenant.theme.announcementUrl}
        message={tenant.theme.announcementEnabled ? tenant.theme.announcementText ?? undefined : undefined}
      />
      <StoreHeader allCategories={allCategories} basePath={basePath} products={products} tenant={tenant} />
      <main id="contenido-principal">
        <Hero tenant={tenant} />
        <CategoryGrid allCategories={allCategories} basePath={basePath} categories={categories} tenantName={tenant.name} />
        <div className="bg-[var(--store-surface)]">
          <ProductGrid eyebrow="Elegidos para vos" id="productos" products={featuredProducts} showPrices={tenant.settings.showPrices} title="Productos destacados" />
        </div>
        <StoreBenefits benefits={tenant.storefront.benefits} tenantName={tenant.shortName} />
        <ProductGrid eyebrow="Catálogo Rubí" id="novedades" products={remainingProducts} showPrices={tenant.settings.showPrices} title="Más piezas" />
        <WhatsappBanner tenant={tenant} />
      </main>
      <StoreFooter allCategories={allCategories} basePath={basePath} categories={categories} tenant={tenant} />
      <WhatsappFloatingButton tenant={tenant} />
    </div>
  );
}
