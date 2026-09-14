"use client";

import { useEffect, useMemo, useState } from "react";
import type { StoreProduct } from "@/types/storefront";
import { ProductCard } from "./product-card";

const PAGE_SIZE = 6;

type CatalogSort = "FEATURED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "NAME_ASC";

type CategoryProductGridProps = {
  products: StoreProduct[];
  showPrices: boolean;
};

const sortProducts = (products: StoreProduct[], sort: CatalogSort) => {
  const sorted = [...products];

  switch (sort) {
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

export function CategoryProductGrid({ products, showPrices }: CategoryProductGridProps) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<CatalogSort>("FEATURED");
  const sortedProducts = useMemo(() => sortProducts(products, sort), [products, sort]);
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / PAGE_SIZE));
  const visibleProducts = sortedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const selectPage = (nextPage: number) => {
    setPage(nextPage);
    document.getElementById("catalogo-productos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="catalogo-productos">
      <div className="mb-8 flex flex-col gap-4 border-y border-[var(--store-hairline)] py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--store-muted)]">
          {products.length === 1 ? "1 producto" : `${products.length} productos`}
        </p>
        <label className="flex items-center gap-3 text-sm">
          <span className="text-[var(--store-muted)]">Ordenar por</span>
          <select
            className="min-h-11 border border-[var(--store-hairline)] bg-[var(--store-surface)] px-3 outline-none focus:border-[var(--store-primary)]"
            onChange={(event) => {
              setSort(event.target.value as CatalogSort);
              setPage(1);
            }}
            value={sort}
          >
            <option value="FEATURED">Destacados</option>
            <option value="NEWEST">Más nuevos</option>
            <option value="PRICE_ASC">Menor precio</option>
            <option value="PRICE_DESC">Mayor precio</option>
            <option value="NAME_ASC">Nombre A–Z</option>
          </select>
        </label>
      </div>

      {visibleProducts.length > 0 ? (
        <div className="product-grid grid grid-cols-1 gap-x-3 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 xl:gap-x-7">
          {visibleProducts.map((product, index) => (
            <ProductCard imageVariant={index} key={product.id} product={product} showPrices={showPrices} />
          ))}
        </div>
      ) : (
        <div className="border border-[var(--store-hairline)] bg-[var(--store-surface)] px-6 py-16 text-center">
          <p className="font-[family-name:var(--store-heading-font)] text-2xl">Todavía no hay productos en esta categoría</p>
          <p className="mt-2 text-sm text-[var(--store-muted)]">Volvé pronto o consultanos por WhatsApp.</p>
        </div>
      )}

      <nav aria-label="Paginación del catálogo" className="mt-14 flex flex-wrap items-center justify-center gap-2">
        <button
          className="secondary-button min-w-28 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page === 1}
          onClick={() => selectPage(page - 1)}
          type="button"
        >
          Anterior
        </button>
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <button
            aria-current={pageNumber === page ? "page" : undefined}
            aria-label={`Página ${pageNumber}`}
            className={`grid size-12 place-items-center border text-sm transition-colors ${pageNumber === page ? "border-[var(--store-primary)] bg-[var(--store-primary)] text-white" : "border-[var(--store-hairline)] hover:border-[var(--store-primary)] hover:text-[var(--store-primary)]"}`}
            key={pageNumber}
            onClick={() => selectPage(pageNumber)}
            type="button"
          >
            {pageNumber}
          </button>
        ))}
        <button
          className="secondary-button min-w-28 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={page === pageCount}
          onClick={() => selectPage(page + 1)}
          type="button"
        >
          Siguiente
        </button>
      </nav>
      <p aria-live="polite" className="mt-3 text-center text-xs text-[var(--store-muted)]">
        Página {page} de {pageCount}
      </p>
    </div>
  );
}
