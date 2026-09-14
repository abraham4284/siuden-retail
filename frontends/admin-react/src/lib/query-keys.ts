export const queryKeys = {
  session: ["session"] as const,
  accounts: (filters: unknown = {}) => ["accounts", filters] as const,
  dashboard: (tenantId: string) => ["dashboard", tenantId] as const,
  products: (tenantId: string, filters: unknown = {}) =>
    ["products", tenantId, filters] as const,
  product: (tenantId: string, productId: string) =>
    ["product", tenantId, productId] as const,
  categories: (tenantId: string) => ["categories", tenantId] as const,
  inventory: (tenantId: string, filters: unknown = {}) =>
    ["inventory", tenantId, filters] as const,
  stockMovements: (tenantId: string, filters: unknown = {}) =>
    ["stock-movements", tenantId, filters] as const,
  customers: (tenantId: string, filters: unknown = {}) =>
    ["customers", tenantId, filters] as const,
  customer: (tenantId: string, customerId: string) =>
    ["customer", tenantId, customerId] as const,
  sales: (tenantId: string, filters: unknown = {}) =>
    ["sales", tenantId, filters] as const,
  sale: (tenantId: string, saleId: string) =>
    ["sale", tenantId, saleId] as const,
  storeProfile: (tenantId: string) => ["store-profile", tenantId] as const,
  storefrontSettings: (tenantId: string) =>
    ["storefront-settings", tenantId] as const,
  storeTheme: (tenantId: string) => ["store-theme", tenantId] as const,
  storeContactChannels: (tenantId: string) =>
    ["store-contact-channels", tenantId] as const,
};

export const tenantQueryPrefixes = {
  dashboard: ["dashboard"] as const,
  products: ["products"] as const,
  inventory: ["inventory"] as const,
  stockMovements: ["stock-movements"] as const,
  customers: ["customers"] as const,
  sales: ["sales"] as const,
};
