import Link from "next/link";
import {
  getCategoryAndDescendantIds,
  getCategoryHref,
  getCategoryTrail,
} from "@/lib/categories";
import { getStorefrontThemeStyles } from "@/lib/storefront-theme";
import type { StoreCategory, StoreProduct } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
import { AnnouncementBar } from "./announcement-bar";
import { CategoryProductGrid } from "./category-product-grid";
import { StoreFooter } from "./store-footer";
import { StoreHeader } from "./store-header";
import { WhatsappFloatingButton } from "./whatsapp-floating-button";

type CategoryStorefrontProps = {
  allCategories: StoreCategory[];
  basePath?: string;
  categories: StoreCategory[];
  category: StoreCategory;
  products: StoreProduct[];
  tenant: TenantConfig;
};

export function CategoryStorefront({
  allCategories,
  basePath = "",
  categories,
  category,
  products,
  tenant,
}: CategoryStorefrontProps) {
  const themeStyles = getStorefrontThemeStyles(tenant);
  const categoryIds = getCategoryAndDescendantIds(category, allCategories);
  const categoryProducts = products.filter((product) =>
    product.categoryIds.some((categoryId) => categoryIds.has(categoryId)),
  );
  const categoryTrail = getCategoryTrail(category, allCategories);
  const childCategories = allCategories.filter((candidate) => candidate.parentId === category.id);
  const homeHref = basePath ? `${basePath}/` : "/";

  return (
    <div className="storefront-root" style={themeStyles}>
      <a className="skip-link" href="#contenido-principal">Saltar al contenido</a>
      <AnnouncementBar
        href={tenant.theme.announcementUrl}
        message={tenant.theme.announcementEnabled ? tenant.theme.announcementText ?? undefined : undefined}
      />
      <StoreHeader allCategories={allCategories} basePath={basePath} products={products} tenant={tenant} />
      <main className="store-container py-12 sm:py-16 lg:py-20" id="contenido-principal">
        <nav aria-label="Ruta de navegación" className="flex flex-wrap items-center gap-2 text-sm text-[var(--store-muted)]">
          <Link className="hover:text-[var(--store-primary)] hover:underline" href={homeHref}>Inicio</Link>
          {categoryTrail.map((item, index) => (
            <span className="flex items-center gap-2" key={item.id}>
              <span aria-hidden="true">/</span>
              {index === categoryTrail.length - 1 ? (
                <span aria-current="page" className="text-[var(--store-text)]">{item.name}</span>
              ) : (
                <Link className="hover:text-[var(--store-primary)] hover:underline" href={getCategoryHref(item, allCategories, basePath)}>
                  {item.name}
                </Link>
              )}
            </span>
          ))}
        </nav>

        <header className="pb-10 pt-8 sm:pb-14 sm:pt-10">
          <p className="section-kicker">Catálogo {tenant.shortName}</p>
          <h1 className="mt-3 max-w-none font-[family-name:var(--store-heading-font)] text-4xl font-normal tracking-[-0.03em] sm:text-5xl lg:text-6xl">
            {category.name}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--store-muted)] sm:text-base">
            Explorá las piezas disponibles en {category.name}. Podés ordenar el catálogo y recorrerlo por páginas.
          </p>
          {childCategories.length > 0 ? (
            <nav aria-label={`Subcategorías de ${category.name}`} className="mt-7 flex flex-wrap gap-2">
              {childCategories.map((child) => (
                <Link
                  className="border border-[var(--store-hairline)] bg-[var(--store-surface)] px-4 py-2 text-sm transition-colors hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]"
                  href={getCategoryHref(child, allCategories, basePath)}
                  key={child.id}
                >
                  {child.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <CategoryProductGrid products={categoryProducts} showPrices={tenant.settings.showPrices} />
      </main>
      <StoreFooter allCategories={allCategories} basePath={basePath} categories={categories} tenant={tenant} />
      <WhatsappFloatingButton tenant={tenant} />
    </div>
  );
}
