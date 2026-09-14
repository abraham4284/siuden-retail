import Image from "next/image";
import Link from "next/link";
import { getCategoryHref } from "@/lib/categories";
import type { StoreCategory } from "@/types/storefront";
import { ArrowRightIcon } from "./icons";
import { SectionHeading } from "./section-heading";

type CategoryGridProps = {
  allCategories: StoreCategory[];
  basePath?: string;
  categories: StoreCategory[];
  tenantName: string;
};

export function CategoryGrid({ allCategories, basePath = "", categories, tenantName }: CategoryGridProps) {
  return (
    <section className="store-container scroll-mt-32 py-16 sm:py-20 lg:py-28" id="categorias">
      <SectionHeading
        align="center"
        eyebrow="Encontrá tu pieza"
        title="Colecciones para cada momento"
      />
      <div className="category-grid">
        {categories.map((category, index) => (
          <Link
            aria-label={`Ver productos de ${category.name}`}
            className={`category-card group ${index === 0 ? "category-card-featured" : ""}`}
            href={getCategoryHref(category, allCategories, basePath)}
            id={`categoria-${category.slug}`}
            key={category.id}
          >
            <Image
              alt={`Colección ${category.name} de ${tenantName}`}
              className={`object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.04] ${index === 2 ? "object-left" : index === 3 ? "object-right" : "object-center"}`}
              fill
              sizes={index === 0 ? "(max-width: 767px) 100vw, 50vw" : "(max-width: 767px) 50vw, 25vw"}
              src={category.imageUrl ?? "/images/tenants/rubi/products/joyas-oro.webp"}
            />
            <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white sm:p-7">
              <span>
                <span className="block text-xs font-medium uppercase tracking-[0.18em] text-white/80">
                  Colección {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 block font-[family-name:var(--store-heading-font)] text-xl min-[440px]:text-2xl sm:text-3xl">
                  {category.name}
                </span>
              </span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full border border-white/60 transition-colors group-hover:bg-white group-hover:text-[var(--store-text)] sm:size-10">
                <ArrowRightIcon className="size-4" />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
