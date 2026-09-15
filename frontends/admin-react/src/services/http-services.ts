import type {
  AuthSession,
  PermissionCode,
  Product,
  TenantFeatureCode,
  UserRole,
} from "@/domain/types";
import type {
  AccountFilters,
  AccountWithTenants,
  BulkPriceAdjustmentInput,
  BulkPriceAdjustmentResult,
  CreateAccountInput,
  CreateProductInput,
  ProductFilters,
  Services,
  UpdateProductInput,
} from "@/services/contracts";
import axios from "axios";

type ApiErrorPayload = { message?: string[] | string };
type ApiSession = {
  user: AuthSession["user"];
  account: AuthSession["account"];
  membership: {
    id: string;
    role: string;
    status: AuthSession["membership"]["status"];
    permissions: string[];
  };
  tenant: Omit<AuthSession["tenant"], "enabledFeatures" | "primaryColor">;
};
type ApiPage<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export class HttpServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HttpServiceError";
  }
}

function enabledFeatures(permissions: string[]): TenantFeatureCode[] {
  const features: TenantFeatureCode[] = [];
  if (
    permissions.some(
      (value) => value.startsWith("products") || value.startsWith("categories"),
    )
  )
    features.push("CATALOG");
  if (permissions.some((value) => value.startsWith("inventory")))
    features.push("INVENTORY");
  if (permissions.some((value) => value.startsWith("customers")))
    features.push("CUSTOMERS");
  if (permissions.some((value) => value.startsWith("sales")))
    features.push("SALES");
  if (permissions.includes("pos.use")) features.push("POS");
  if (permissions.some((value) => value.startsWith("purchases")))
    features.push("PURCHASES");
  return features;
}

function normalizeSession(session: ApiSession): AuthSession {
  return {
    user: session.user,
    account: session.account,
    membership: {
      ...session.membership,
      role: session.membership.role as UserRole,
      permissions: session.membership.permissions as PermissionCode[],
    },
    tenant: {
      ...session.tenant,
      enabledFeatures: enabledFeatures(session.membership.permissions),
      primaryColor: "#7f2942",
    },
  };
}

function page<T>(response: ApiPage<T>) {
  return {
    items: response.data,
    total: response.meta.total,
    page: response.meta.page,
    pageSize: response.meta.limit,
    totalPages: response.meta.totalPages,
  };
}
function params(values: Record<string, unknown>): string {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "ALL"
    )
      result.set(key, String(value));
  const query = result.toString();
  return query ? `?${query}` : "";
}

function productPayload(input: CreateProductInput | UpdateProductInput) {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    status: input.status,
    sellingMode: input.sellingMode,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    categoryIds: [...input.categoryAssignments]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((item) => item.categoryId),
    options: input.options ?? [],
    variants: input.variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      sku: variant.sku ?? undefined,
      barcode: variant.barcode ?? undefined,
      price: variant.price ?? undefined,
      compareAtPrice: variant.compareAtPrice ?? undefined,
      cost: variant.cost ?? undefined,
      selectedOptionValueIds: variant.selectedOptionValueIds,
      ...variant.dimensions,
      trackInventory: variant.trackInventory,
      allowBackorder: variant.allowBackorder,
      isDefault: variant.isDefault,
      enabled: variant.enabled,
      sortOrder: variant.sortOrder,
    })),
  };
}

export function createHttpServices(): Services {
  const baseUrl = (
    import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/v1"
  ).replace(/\/$/, "");
  const api = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
  });

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    try {
      const response = await api.request<T>({
        url: path,
        method: init?.method,
        data:
          typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
      });
      return response.data;
    } catch (error) {
      if (!axios.isAxiosError<ApiErrorPayload>(error)) throw error;
      const payload = error.response?.data;
      const messages = Array.isArray(payload?.message)
        ? payload.message
        : [payload?.message];
      const status = error.response?.status ?? 0;
      throw new HttpServiceError(
        messages.filter(Boolean).join(" ") ||
          (status
            ? `La API respondió con estado ${status}.`
            : "No se pudo conectar con la API."),
        status,
      );
    }
  }

  async function syncImages(
    productId: string,
    previous: Product["images"],
    next: NonNullable<CreateProductInput["images"]>,
  ) {
    const retained = new Set(
      next.flatMap((image) => (image.id ? [image.id] : [])),
    );
    await Promise.all(
      previous
        .filter((image) => !retained.has(image.id))
        .map((image) =>
          request(`/product-images/${image.id}`, { method: "DELETE" }),
        ),
    );
    for (const image of next.filter((item) => !item.id))
      await request(`/products/${productId}/images`, {
        method: "POST",
        body: JSON.stringify({
          storageKey: image.url.startsWith("/")
            ? image.url.slice(1)
            : `uploads/${image.originalName ?? crypto.randomUUID()}`,
          originalName: image.originalName ?? "imagen",
          mimeType: image.mimeType ?? "image/webp",
          sizeBytes: image.sizeBytes ?? 0,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
          altText: image.altText ?? undefined,
          productVariantId: image.productVariantId ?? undefined,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        }),
      });
  }

  async function previewPrice(
    input: BulkPriceAdjustmentInput,
  ): Promise<BulkPriceAdjustmentResult> {
    const listed = page(
      await request<ApiPage<Product>>(
        `/products${params({ page: 1, limit: 100, categoryId: input.filters?.categoryId })}`,
      ),
    );
    const selected = listed.items.filter(
      (product) =>
        !input.filters?.productIds?.length ||
        input.filters.productIds.includes(product.id),
    );
    const preview = selected.flatMap((product) =>
      product.variants.map((variant) => ({
        productId: product.id,
        productName: product.name,
        variantId: variant.id,
        variantName: variant.name,
        previousPrice: variant.price,
        nextPrice:
          input.adjustPrice === false || variant.price === null
            ? variant.price
            : Math.round(variant.price * (1 + input.percentage / 100) * 100) /
              100,
        previousCompareAtPrice: variant.compareAtPrice,
        nextCompareAtPrice:
          !input.adjustCompareAtPrice || variant.compareAtPrice === null
            ? variant.compareAtPrice
            : Math.round(
                variant.compareAtPrice * (1 + input.percentage / 100) * 100,
              ) / 100,
      })),
    );
    return {
      affectedProducts: selected.length,
      affectedVariants: preview.length,
      preview,
    };
  }

  return {
    auth: {
      async login(input) {
        return normalizeSession(
          (
            await request<{ session: ApiSession }>("/auth/login", {
              method: "POST",
              body: JSON.stringify(input),
            })
          ).session,
        );
      },
      async me() {
        try {
          return normalizeSession(await request<ApiSession>("/auth/me"));
        } catch (error) {
          if (error instanceof HttpServiceError && error.status === 401)
            return null;
          throw error;
        }
      },
      logout: () => request<void>("/auth/logout", { method: "POST" }),
    },
    accounts: {
      async list(filters: AccountFilters = {}) {
        return page(
          await request<ApiPage<AccountWithTenants>>(
            `/accounts${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search })}`,
          ),
        );
      },
      create: (input: CreateAccountInput) =>
        request("/accounts", { method: "POST", body: JSON.stringify(input) }),
    },
    dashboard: { get: () => request("/dashboard") },
    products: {
      async list(filters: ProductFilters = {}) {
        return page(
          await request<ApiPage<Product>>(
            `/products${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search, categoryId: filters.categoryId, status: filters.status })}`,
          ),
        );
      },
      get: (id) => request(`/products/${id}`),
      async create(input) {
        let product = await request<Product>("/products", {
          method: "POST",
          body: JSON.stringify(productPayload(input)),
        });
        await syncImages(product.id, [], input.images ?? []);
        let initialMovement = null;
        const location = (
          await request<Array<{ id: string; isDefault: boolean }>>(
            "/inventory/locations",
          )
        ).find((item) => item.isDefault);
        const items = (input.initialInventory ?? []).flatMap((item) => {
          const variant = item.variantId
            ? product.variants.find((value) => value.id === item.variantId)
            : product.variants[item.variantIndex ?? -1];
          return variant &&
            (item.onHand !== 0 || item.lowStockThreshold !== null)
            ? [
                {
                  productVariantId: variant.id,
                  quantityDelta: item.onHand,
                  lowStockThreshold: item.lowStockThreshold ?? undefined,
                },
              ]
            : [];
        });
        if (items.length && location) {
          const result = await request<{ movement: null }>(
            "/inventory/movements",
            {
              method: "POST",
              body: JSON.stringify({
                stockLocationId: location.id,
                movementType: "INITIAL",
                reason: "Stock inicial del producto",
                items,
              }),
            },
          );
          initialMovement = result.movement;
        }
        product = await request(`/products/${product.id}`);
        return { product, initialMovement };
      },
      async update(id, input) {
        const previous = await request<Product>(`/products/${id}`);
        await request(`/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify(productPayload(input)),
        });
        await syncImages(id, previous.images, input.images ?? []);
        return request(`/products/${id}`);
      },
      async duplicate(id) {
        const source = await request<Product>(`/products/${id}`);
        const stamp = Date.now();
        const valueIds = new Map<string, string>();
        const options = source.options.map((option) => ({
          ...option,
          id: crypto.randomUUID(),
          values: option.values.map((value) => {
            const nextId = crypto.randomUUID();
            valueIds.set(value.id, nextId);
            return { ...value, id: nextId };
          }),
        }));
        return request("/products", {
          method: "POST",
          body: JSON.stringify(
            productPayload({
              ...source,
              name: `${source.name} (copia)`,
              slug: `${source.slug}-copia-${stamp}`,
              status: "DRAFT",
              options,
              variants: source.variants.map((variant) => ({
                ...variant,
                id: undefined,
                sku: variant.sku ? `${variant.sku}-COPY-${stamp}` : null,
                selectedOptionValueIds: variant.selectedOptionValueIds.map(
                  (valueId) => valueIds.get(valueId) ?? valueId,
                ),
              })),
            }),
          ),
        });
      },
      setStatus: (id, status) =>
        request(`/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
      archive: (id) =>
        request(`/products/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ARCHIVED" }),
        }),
      async delete(id) {
        await request(`/products/${id}`, { method: "DELETE" });
      },
      previewPriceAdjustment: previewPrice,
      async bulkPrice(input) {
        const result = await previewPrice(input);
        await Promise.all(
          result.preview.map((item) =>
            request(`/product-variants/${item.variantId}`, {
              method: "PATCH",
              body: JSON.stringify({
                price: item.nextPrice ?? undefined,
                compareAtPrice: item.nextCompareAtPrice ?? undefined,
              }),
            }),
          ),
        );
        return result;
      },
      async bulkPriceAdjustment(input) {
        return this.bulkPrice(input);
      },
    },
    categories: {
      list: () => request("/categories"),
      create: (input) =>
        request("/categories", { method: "POST", body: JSON.stringify(input) }),
      update: (id, input) =>
        request(`/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      async remove(id) {
        await request(`/categories/${id}`, { method: "DELETE" });
      },
      async delete(id) {
        await request(`/categories/${id}`, { method: "DELETE" });
      },
      reorder: (input) =>
        request("/categories/reorder", {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    inventory: {
      listLocations: () => request("/inventory/locations"),
      async list(filters = {}) {
        return page(
          await request(
            `/inventory/balances${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search, categoryId: filters.categoryId, stockLocationId: filters.stockLocationId, status: filters.status })}`,
          ),
        );
      },
      async listMovements(filters = {}) {
        return page(
          await request(
            `/inventory/movements${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search, stockLocationId: filters.stockLocationId, movementType: filters.type, from: filters.from, to: filters.to })}`,
          ),
        );
      },
      adjust: (input) =>
        request("/inventory/movements", {
          method: "POST",
          body: JSON.stringify({
            stockLocationId: input.stockLocationId,
            movementType: input.type,
            reason: input.reason,
            items: input.items,
          }),
        }),
    },
    customers: {
      async list(filters = {}) {
        return page(
          await request(
            `/customers${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search, status: filters.status, kind: filters.kind, source: filters.source })}`,
          ),
        );
      },
      get: (id) => request(`/customers/${id}`),
      create: (input) =>
        request("/customers", { method: "POST", body: JSON.stringify(input) }),
      update: (id, input) =>
        request(`/customers/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      setStatus: (id, status) =>
        request(`/customers/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }),
    },
    sales: {
      async list(filters = {}) {
        return page(
          await request(
            `/sales${params({ page: filters.page ?? 1, limit: filters.pageSize ?? 20, search: filters.search, status: filters.status, channel: filters.channel, customerId: filters.customerId, from: filters.from, to: filters.to })}`,
          ),
        );
      },
      get: (id) => request(`/sales/${id}`),
      confirm: (input) =>
        request("/sales", { method: "POST", body: JSON.stringify(input) }),
      cancel: (id, input = {}) =>
        request(`/sales/${id}/cancel`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
    },
    store: {
      getProfile: () => request("/store/profile"),
      updateProfile: (input) =>
        request("/store/profile", {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      getSettings: () => request("/store/settings"),
      updateSettings: (input) =>
        request("/store/settings", {
          method: "PUT",
          body: JSON.stringify(input),
        }),
      getTheme: () => request("/store/theme"),
      updateTheme: (input) =>
        request("/store/theme", { method: "PUT", body: JSON.stringify(input) }),
      getContactChannels: () => request("/store/contacts"),
      updateContactChannels: (items) =>
        request("/store/contacts", {
          method: "PUT",
          body: JSON.stringify({ items }),
        }),
    },
    demo: {
      async reset() {
        throw new HttpServiceError(
          "El restablecimiento demo no está disponible usando la API real.",
          409,
        );
      },
    },
  };
}
