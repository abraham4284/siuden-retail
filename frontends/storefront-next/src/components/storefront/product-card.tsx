import Image from "next/image";
import { formatPrice } from "@/lib/currency";
import type { StoreProduct } from "@/types/storefront";
import { ChevronDownIcon } from "./icons";

const stockLabels: Record<StoreProduct["stockStatus"], string> = {
  available: "Disponible",
  "low-stock": "Últimas unidades",
  "out-of-stock": "Sin stock",
};

type ProductCardProps = {
  imageVariant?: number;
  product: StoreProduct;
  showPrices: boolean;
};

export function ProductCard({ imageVariant = 0, product, showPrices }: ProductCardProps) {
  const stockLabel = stockLabels[product.stockStatus];
  const priceLabel =
    product.sellingMode === "INQUIRY_ONLY" || !showPrices || product.price === null
      ? "Consultar precio"
      : `${product.variants.length > 1 ? "Desde " : ""}${formatPrice(product.price)}`;

  return (
    <article className="product-card scroll-mt-32" id={`producto-${product.slug}`}>
      <div className="product-image-wrap group relative aspect-[4/5] overflow-hidden bg-[var(--store-surface)]">
        <Image
          alt={`${product.name} en ${product.material ?? "joyería"}`}
          className={`product-image product-image-${imageVariant % 4} object-cover`}
          fill
          sizes="(max-width: 419px) 100vw, (max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
          src={product.imageUrls[0]}
        />
        {product.isNew ? (
          <span className="absolute left-3 top-3 bg-[var(--store-surface)] px-2.5 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[var(--store-primary)] sm:left-4 sm:top-4">
            Nuevo
          </span>
        ) : null}
      </div>

      <div className="pt-4 sm:pt-5">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--store-muted)]">{product.material}</p>
            <h3 className="mt-1 font-[family-name:var(--store-heading-font)] text-xl leading-tight sm:text-2xl">
              {product.name}
            </h3>
          </div>
          <span className={`stock-label stock-${product.stockStatus}`}>{stockLabel}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium sm:text-base">
          <span className="tabular-nums">{priceLabel}</span>
          {showPrices && product.compareAtPrice !== null && product.price !== null && product.compareAtPrice > product.price ? (
            <span className="text-xs font-normal tabular-nums text-[var(--store-muted)] line-through">{formatPrice(product.compareAtPrice)}</span>
          ) : null}
          {product.variants.length > 1 ? (
            <span className="text-xs font-normal text-[var(--store-muted)]">{product.variants.length} variantes</span>
          ) : null}
        </div>
        {product.description || product.variants.length > 1 ? (
          <details className="product-details mt-3 border-t border-[var(--store-hairline)] pt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium underline-offset-4 hover:text-[var(--store-primary)] hover:underline">
              Ver detalle <ChevronDownIcon className="size-4 shrink-0 transition-transform" />
            </summary>
            {product.description ? <p className="pb-2 pt-1 text-sm leading-6 text-[var(--store-muted)]">{product.description}</p> : null}
            {product.variants.length > 1 ? (
              <ul className="space-y-1 pb-2 pt-1 text-sm text-[var(--store-muted)]">
                {product.variants.map((variant) => (
                  <li className="flex justify-between gap-3" key={variant.id}>
                    <span>{variant.name}</span>
                    <span>{Number.isFinite(variant.available) ? `${variant.available} disponibles` : "Disponible"}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </details>
        ) : null}
      </div>
    </article>
  );
}
