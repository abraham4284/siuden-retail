import type { StoreProduct } from "@/types/storefront";
import { ArrowRightIcon } from "./icons";
import { ProductCard } from "./product-card";
import { SectionHeading } from "./section-heading";

type ProductGridProps = {
  eyebrow: string;
  id?: string;
  products: StoreProduct[];
  showPrices: boolean;
  title: string;
};

export function ProductGrid({ eyebrow, id, products, showPrices, title }: ProductGridProps) {
  return (
    <section className="store-container scroll-mt-32 py-16 sm:py-20 lg:py-28" id={id}>
      <SectionHeading
        action={
          <a className="hidden items-center gap-2 text-sm font-medium underline-offset-4 hover:text-[var(--store-primary)] hover:underline sm:flex" href="#categorias">
            Ver categorías <ArrowRightIcon className="size-4" />
          </a>
        }
        eyebrow={eyebrow}
        title={title}
      />
      <div className="product-grid grid grid-cols-1 gap-x-3 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 sm:gap-y-12 md:grid-cols-3 xl:gap-x-7">
        {products.map((product, index) => (
          <ProductCard imageVariant={index} key={product.id} product={product} showPrices={showPrices} />
        ))}
      </div>
    </section>
  );
}
