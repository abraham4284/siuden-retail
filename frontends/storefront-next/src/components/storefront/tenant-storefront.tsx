import type { CSSProperties } from "react";
import type { StoreCategory, StoreProduct } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
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
  categories: StoreCategory[];
  products: StoreProduct[];
  tenant: TenantConfig;
};

type ThemeStyles = CSSProperties & Record<`--store-${string}`, string>;

export function TenantStorefront({ categories, products, tenant }: TenantStorefrontProps) {
  const featuredProducts = products.filter((product) => product.featured);
  const newProducts = products.filter((product) => product.isNew && !product.featured);
  const themeStyles: ThemeStyles = {
    "--store-primary": tenant.theme.primaryColor,
    "--store-secondary": tenant.theme.secondaryColor,
    "--store-accent": tenant.theme.accentColor,
    "--store-background": tenant.theme.backgroundColor,
    "--store-surface": tenant.theme.surfaceColor,
    "--store-text": tenant.theme.textColor,
    "--store-muted": tenant.theme.mutedTextColor,
    "--store-heading-font": tenant.theme.headingFont,
    "--store-body-font": tenant.theme.bodyFont,
    "--store-hairline": `color-mix(in srgb, ${tenant.theme.textColor} 12%, transparent)`,
    "--store-shadow": `color-mix(in srgb, ${tenant.theme.textColor} 12%, transparent)`,
    "--store-shadow-strong": `color-mix(in srgb, ${tenant.theme.textColor} 20%, transparent)`,
    "--store-backdrop": `color-mix(in srgb, ${tenant.theme.textColor} 38%, transparent)`,
  };

  return (
    <div className="storefront-root" style={themeStyles}>
      <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
      <AnnouncementBar message={tenant.announcement} />
      <StoreHeader categories={categories} products={products} tenant={tenant} />
      <main id="contenido-principal">
        <Hero tenant={tenant} />
        <CategoryGrid categories={categories} tenantName={tenant.name} />
        <div className="bg-[var(--store-surface)]">
          <ProductGrid eyebrow="Elegidos para vos" id="productos" products={featuredProducts} title="Productos destacados" />
        </div>
        <StoreBenefits benefits={tenant.storefront.benefits} tenantName={tenant.shortName} />
        <ProductGrid eyebrow="Recién llegados" id="novedades" products={newProducts} title="Novedades" />
        <WhatsappBanner tenant={tenant} />
      </main>
      <StoreFooter categories={categories} tenant={tenant} />
      <WhatsappFloatingButton tenant={tenant} />
    </div>
  );
}
