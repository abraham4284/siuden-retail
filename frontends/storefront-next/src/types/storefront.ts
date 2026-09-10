export type StoreCategory = {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  imageUrl: string;
  enabled: boolean;
  displayOrder: number;
};

export type StoreProduct = {
  id: string;
  tenantId: string;
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  material?: string;
  price: number;
  imageUrls: string[];
  featured: boolean;
  isNew: boolean;
  stockStatus: "available" | "low-stock" | "out-of-stock";
};
