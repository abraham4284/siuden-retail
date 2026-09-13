import type { StoreCategory } from "@/types/storefront";

const TENANT_ID = "rubi-id";
const GOLD_IMAGE = "/images/tenants/rubi/products/joyas-oro.webp";
const SILVER_IMAGE = "/images/tenants/rubi/products/plata-y-reloj.webp";

const category = (
  slug: string,
  name: string,
  parentId: string | null,
  sortOrder: number,
  imageUrl?: string,
): StoreCategory => ({
  id: `rubi-cat-${slug}`,
  tenantId: TENANT_ID,
  parentId,
  name,
  slug,
  imageUrl,
  isVisible: true,
  sortOrder,
});

export const rubiCategories: StoreCategory[] = [
  category("general", "General", null, 0, GOLD_IMAGE),
  category("oro-18kt", "Oro 18kt", null, 1, GOLD_IMAGE),
  category("oro-18kt-anillos", "Anillos", "rubi-cat-oro-18kt", 0),
  category("oro-18kt-pulseras", "Pulseras", "rubi-cat-oro-18kt", 1),
  category("oro-18kt-dijes", "Dijes", "rubi-cat-oro-18kt", 2),
  category("oro-18kt-cadenas", "Cadenas", "rubi-cat-oro-18kt", 3),
  category("oro-18kt-aros", "Aros", "rubi-cat-oro-18kt", 4),
  category("oro-18kt-alianzas", "Alianzas", "rubi-cat-oro-18kt", 5),
  category("oro-18kt-abridores", "Abridores", "rubi-cat-oro-18kt", 6),
  category("plata", "Plata", null, 2, SILVER_IMAGE),
  category("plata-anillos", "Anillos", "rubi-cat-plata", 0),
  category("plata-anillos-iniciales", "Iniciales", "rubi-cat-plata-anillos", 0),
  category("plata-anillos-plata-y-oro", "Plata y oro", "rubi-cat-plata-anillos", 1),
  category("plata-anillos-hombre", "Hombre", "rubi-cat-plata-anillos", 2),
  category("plata-anillos-bulgari", "Bulgari", "rubi-cat-plata-anillos", 3),
  category("plata-anillos-piedras", "Piedras", "rubi-cat-plata-anillos", 4),
  category("plata-anillos-frutilla", "Frutilla", "rubi-cat-plata-anillos", 5),
  category("plata-anillos-san-benito", "San Benito", "rubi-cat-plata-anillos", 6),
  category("plata-dijes", "Dijes", "rubi-cat-plata", 1),
  category("acero", "Acero", null, 3, SILVER_IMAGE),
  category("relojes", "Relojes", null, 4, SILVER_IMAGE),
  category("outlet", "Outlet", null, 5, GOLD_IMAGE),
];
