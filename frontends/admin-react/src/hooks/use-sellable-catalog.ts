import { useMemo } from "react";
import { useInventoryQuery, useProductsQuery } from "@/hooks/use-services";

export type SellableCatalogItem = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  price: number | null;
  imageUrl: string | null;
  available: number;
  trackInventory: boolean;
  categoryIds: string[];
  categoryNames: string[];
};

export function useSellableCatalog(search = "", categoryId = "") {
  const products = useProductsQuery({ search: search || undefined, pageSize: 200, status: "PUBLISHED" });
  const inventory = useInventoryQuery({ search: search || undefined, categoryId: categoryId || undefined, pageSize: 200 });

  const items = useMemo(() => {
    if (!products.data || !inventory.data) return [];
    const balances = new Map(inventory.data.items.map((item) => [item.variantId, item] as const));
    return products.data.items.flatMap((product) =>
      product.variants
        .filter((variant) => variant.enabled)
        .flatMap((variant): SellableCatalogItem[] => {
          const balance = balances.get(variant.id);
          if (!balance) return [];
          if (categoryId && !product.categoryAssignments.some((assignment) => assignment.categoryId === categoryId)) return [];
          return [{
            productId: product.id,
            variantId: variant.id,
            productName: product.name,
            variantName: variant.name,
            sku: variant.sku,
            price: variant.price,
            imageUrl: product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? null,
            available: balance.available,
            trackInventory: balance.trackInventory,
            categoryIds: product.categoryAssignments.map((assignment) => assignment.categoryId),
            categoryNames: balance.categoryNames,
          }];
        }),
    );
  }, [categoryId, inventory.data, products.data]);

  return {
    items,
    isPending: products.isPending || inventory.isPending,
    isError: products.isError || inventory.isError,
    error: products.error ?? inventory.error,
    refetch: async () => {
      await Promise.all([products.refetch(), inventory.refetch()]);
    },
  };
}
