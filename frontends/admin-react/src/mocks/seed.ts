import {
  RUBI_BRAND_CONTENT,
  RUBI_CATEGORY_CONTENT,
  RUBI_PRODUCT_CONTENT,
} from "@/content/rubi";
import type {
  Account,
  AccountMember,
  Category,
  Customer,
  InventoryBalance,
  MediaAsset,
  Product,
  Role,
  Sale,
  StockLocation,
  StockMovementRecord,
  StoreContactChannel,
  StoreProfile,
  StoreTheme,
  StorefrontSettings,
  Tenant,
  User,
} from "@/domain/types";

export const MOCK_DATA_VERSION = 3;
export const MOCK_STORAGE_KEY = "siuden-retail:admin:mock-database";

export const DEMO_CREDENTIALS = {
  email: "admin@rubi.local",
  password: "demo123",
} as const;

export const RUBI_ACCOUNT_ID = "11111111-1111-4111-8111-111111111111";
export const RUBI_TENANT_ID = "22222222-2222-4222-8222-222222222222";
export const RUBI_ADMIN_USER_ID = "10000000-0000-4000-8000-000000000001";
export const RUBI_ADMIN_MEMBER_ID = "10000000-0000-4000-8000-000000000002";
export const RUBI_ADMIN_ROLE_ID = "40000000-0000-4000-8000-000000000002";
export const RUBI_STOCK_LOCATION_ID = "90000000-0000-4000-8000-000000000001";

export interface DocumentSequenceState {
  tenantId: string;
  nextSale: number;
  nextMovement: number;
}

export interface MockDatabase {
  version: number;
  sessionUserId: string | null;
  accounts: Account[];
  users: User[];
  roles: Role[];
  accountMembers: AccountMember[];
  tenants: Tenant[];
  mediaAssets: MediaAsset[];
  storeProfiles: StoreProfile[];
  storefrontSettings: StorefrontSettings[];
  storeThemes: StoreTheme[];
  storeContactChannels: StoreContactChannel[];
  categories: Category[];
  products: Product[];
  stockLocations: StockLocation[];
  inventoryBalances: InventoryBalance[];
  stockMovements: StockMovementRecord[];
  customers: Customer[];
  sales: Sale[];
  documentSequences: DocumentSequenceState[];
}

const ALL_PERMISSIONS: Role["permissions"] = [
  "store.read",
  "store.update",
  "store.theme.update",
  "products.read",
  "products.write",
  "categories.write",
  "inventory.read",
  "inventory.adjust",
  "customers.read",
  "customers.write",
  "sales.read",
  "sales.create",
  "sales.cancel",
  "pos.use",
  "orders.manage",
  "users.manage",
  "roles.manage",
];

const CATEGORY_IDS: Record<string, string> = {
  general: "a0000000-0000-4000-8000-000000000001",
  "oro-18kt": "a0000000-0000-4000-8000-000000000002",
  plata: "a0000000-0000-4000-8000-000000000003",
  "oro-18kt-anillos": "a0000000-0000-4000-8000-000000000011",
  "oro-18kt-pulseras": "a0000000-0000-4000-8000-000000000012",
  "oro-18kt-dijes": "a0000000-0000-4000-8000-000000000013",
  "oro-18kt-cadenas": "a0000000-0000-4000-8000-000000000014",
  "oro-18kt-aros": "a0000000-0000-4000-8000-000000000015",
  "oro-18kt-alianzas": "a0000000-0000-4000-8000-000000000016",
  "oro-18kt-abridores": "a0000000-0000-4000-8000-000000000017",
  "plata-anillos": "a0000000-0000-4000-8000-000000000021",
  "plata-anillos-iniciales": "a0000000-0000-4000-8000-000000000022",
  "plata-anillos-plata-y-oro": "a0000000-0000-4000-8000-000000000023",
  "plata-anillos-hombre": "a0000000-0000-4000-8000-000000000024",
  "plata-anillos-bulgari": "a0000000-0000-4000-8000-000000000025",
  "plata-anillos-piedras": "a0000000-0000-4000-8000-000000000026",
  "plata-anillos-frutilla": "a0000000-0000-4000-8000-000000000027",
  "plata-anillos-san-benito": "a0000000-0000-4000-8000-000000000028",
  "plata-dijes": "a0000000-0000-4000-8000-000000000029",
  acero: "a0000000-0000-4000-8000-000000000031",
  relojes: "a0000000-0000-4000-8000-000000000032",
  outlet: "a0000000-0000-4000-8000-000000000033",
};

function indexedId(prefix: string, index: number): string {
  const firstGroup = prefix.padEnd(8, "0").slice(0, 8);
  return `${firstGroup}-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
}

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

function categorySeed(now: string): Category[] {
  const idByKey = new Map(Object.entries(CATEGORY_IDS));

  return RUBI_CATEGORY_CONTENT.map((category) => ({
    id: idByKey.get(category.key) ?? indexedId("af", RUBI_CATEGORY_CONTENT.indexOf(category)),
    tenantId: RUBI_TENANT_ID,
    parentId: category.parentKey ? (idByKey.get(category.parentKey) ?? null) : null,
    name: category.name,
    // SQL requires a tenant-wide unique slug; content keys retain the full path.
    slug: category.key,
    description: undefined,
    isVisible: true,
    sortOrder: category.sortOrder,
    productCount: 0,
    externalMappings: [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }));
}

function catalogSeed(now: string, categories: Category[]): {
  products: Product[];
  mediaAssets: MediaAsset[];
  inventoryBalances: InventoryBalance[];
} {
  const categoryByKey = new Map(
    RUBI_CATEGORY_CONTENT.map((category) => [category.key, categories.find((item) => item.slug === category.key)] as const),
  );
  const assetByUrl = new Map<string, MediaAsset>();
  const stockLevels = [3, 7, 0, 2, 12, 1, 4, 5];

  const products = RUBI_PRODUCT_CONTENT.map((content, index): Product => {
    let asset = assetByUrl.get(content.imageUrl);
    if (!asset) {
      const filename = content.imageUrl.split("/").at(-1) ?? `catalogo-${index + 1}.webp`;
      asset = {
        id: indexedId("c2", assetByUrl.size),
        tenantId: RUBI_TENANT_ID,
        storageKey: content.imageUrl.replace(/^\//, ""),
        originalName: filename,
        mimeType: "image/webp",
        sizeBytes: 0,
        width: null,
        height: null,
        altText: content.imageAlt,
        checksumSha256: null,
        status: "ACTIVE",
        url: content.imageUrl,
        createdAt: now,
        deletedAt: null,
      };
      assetByUrl.set(content.imageUrl, asset);
    }

    const productId = indexedId("b0", index);
    const variantId = indexedId("b1", index);
    const assignments = content.categoryPath.flatMap((categoryKey, categoryIndex) => {
      const category = categoryByKey.get(categoryKey);
      if (!category) return [];
      return [
        {
          categoryId: category.id,
          isPrimary: categoryIndex === content.categoryPath.length - 1,
          sortOrder: categoryIndex,
        },
      ];
    });

    return {
      id: productId,
      tenantId: RUBI_TENANT_ID,
      name: content.name,
      slug: content.slug,
      description: content.description,
      status: content.published ? "PUBLISHED" : "DRAFT",
      sellingMode: "DIRECT",
      seoTitle: content.name,
      seoDescription: content.description,
      categoryAssignments: assignments,
      options: [],
      images: [
        {
          id: indexedId("b3", index),
          tenantId: RUBI_TENANT_ID,
          productId,
          productVariantId: null,
          mediaAssetId: asset.id,
          url: asset.url,
          altText: asset.altText,
          sortOrder: 0,
          isPrimary: true,
        },
      ],
      variants: [
        {
          id: variantId,
          tenantId: RUBI_TENANT_ID,
          productId,
          name: "Default",
          sku: content.sku,
          barcode: null,
          price: content.price,
          compareAtPrice: null,
          cost: null,
          selectedOptionValueIds: [],
          dimensions: {},
          trackInventory: true,
          allowBackorder: false,
          isDefault: true,
          enabled: true,
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      ],
      publishedAt: content.published ? now : null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
  });

  const inventoryBalances = products.map((product, index): InventoryBalance => ({
    id: indexedId("d0", index),
    tenantId: RUBI_TENANT_ID,
    stockLocationId: RUBI_STOCK_LOCATION_ID,
    productVariantId: product.variants[0]!.id,
    onHand: stockLevels[index] ?? 0,
    reserved: 0,
    lowStockThreshold: index % 3 === 0 ? 3 : 2,
    updatedAt: now,
  }));

  return { products, mediaAssets: [...assetByUrl.values()], inventoryBalances };
}

function customerSeed(now: string): Customer[] {
  return [
    {
      id: "e0000000-0000-4000-8000-000000000001",
      tenantId: RUBI_TENANT_ID,
      userId: null,
      customerGroupId: null,
      source: "ADMIN",
      kind: "INDIVIDUAL",
      firstName: "Ana",
      lastName: "Ejemplo",
      businessName: null,
      email: "ana.ejemplo@example.com",
      phone: "+54 9 381 555 0101",
      documentType: "DNI",
      documentNumber: "00000001",
      taxCondition: "Consumidor final",
      notes: "Cliente ficticio para demostración.",
      addresses: [
        {
          id: "e1000000-0000-4000-8000-000000000001",
          addressType: "HOME",
          label: "Casa de prueba",
          street: "Calle Ficticia",
          number: "123",
          floor: null,
          apartment: null,
          city: "San Miguel de Tucumán",
          province: "Tucumán",
          postalCode: "4000",
          countryCode: "AR",
          isDefault: true,
        },
      ],
      status: "ACTIVE",
      blockedAt: null,
      salesCount: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: "e0000000-0000-4000-8000-000000000002",
      tenantId: RUBI_TENANT_ID,
      userId: null,
      customerGroupId: null,
      source: "POS",
      kind: "BUSINESS",
      firstName: null,
      lastName: null,
      businessName: "Comercio Ficticio SRL",
      email: "compras@comercio-ficticio.example",
      phone: "+54 9 381 555 0102",
      documentType: "CUIT",
      documentNumber: "30-00000000-1",
      taxCondition: "Responsable inscripto",
      notes: "Empresa ficticia para demostración.",
      addresses: [],
      status: "ACTIVE",
      blockedAt: null,
      salesCount: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
    {
      id: "e0000000-0000-4000-8000-000000000003",
      tenantId: RUBI_TENANT_ID,
      userId: null,
      customerGroupId: null,
      source: "IMPORT",
      kind: "INDIVIDUAL",
      firstName: "Martín",
      lastName: "Prueba",
      businessName: null,
      email: "martin.prueba@example.com",
      phone: "+54 9 381 555 0103",
      documentType: null,
      documentNumber: null,
      taxCondition: null,
      notes: "Identidad ficticia.",
      addresses: [],
      status: "BLOCKED",
      blockedAt: now,
      salesCount: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    },
  ];
}

export function createMockSeed(): MockDatabase {
  const now = new Date().toISOString();
  const categories = categorySeed(now);
  const { products, mediaAssets, inventoryBalances } = catalogSeed(now, categories);
  const customers = customerSeed(now);
  const saleProductA = products[0]!;
  const saleProductB = products[1]!;
  const soldAt = isoMinutesAgo(25);
  const saleId = "f0000000-0000-4000-8000-000000000001";
  const saleItems = [saleProductA, saleProductB].map((product, index) => {
    const variant = product.variants[0]!;
    const unitPrice = variant.price ?? 0;
    return {
      id: indexedId("f1", index),
      productVariantId: variant.id,
      productNameSnapshot: product.name,
      variantNameSnapshot: variant.name,
      skuSnapshot: variant.sku,
      quantity: 1,
      unitPrice,
      discountAmount: 0,
      lineTotal: unitPrice,
    };
  });
  const subtotal = saleItems.reduce((total, item) => total + item.lineTotal, 0);

  const sales: Sale[] = [
    {
      id: saleId,
      tenantId: RUBI_TENANT_ID,
      saleNumber: "V-000001",
      channel: "POS",
      status: "CONFIRMED",
      paymentStatus: "UNPAID",
      customerId: customers[0]!.id,
      sourceOrderId: null,
      stockLocationId: RUBI_STOCK_LOCATION_ID,
      customerNameSnapshot: "Ana Ejemplo",
      customerDocumentSnapshot: "DNI 00000001",
      items: saleItems,
      subtotal,
      discountTotal: 0,
      total: subtotal,
      currency: "ARS",
      notes: "Venta ficticia de demostración.",
      soldAt,
      createdByUserId: RUBI_ADMIN_USER_ID,
      createdByName: "Administración Rubí",
      confirmedAt: soldAt,
      cancelledAt: null,
      createdAt: soldAt,
      updatedAt: soldAt,
    },
  ];

  // Current balances are post-sale; the INITIAL ledger records the prior stock.
  const initialMovementId = "f2000000-0000-4000-8000-000000000001";
  const saleMovementId = "f2000000-0000-4000-8000-000000000002";
  const soldVariantIds = new Set(saleItems.flatMap((item) => (item.productVariantId ? [item.productVariantId] : [])));
  const initialItems = inventoryBalances.flatMap((balance, index) => {
    const quantityDelta = balance.onHand + (soldVariantIds.has(balance.productVariantId) ? 1 : 0);
    return quantityDelta === 0
      ? []
      : [
          {
            id: indexedId("f3", index),
            tenantId: RUBI_TENANT_ID,
            stockMovementId: initialMovementId,
            productVariantId: balance.productVariantId,
            quantityDelta,
            unitCost: null,
            createdAt: isoMinutesAgo(120),
          },
        ];
  });
  const saleMovementItems = saleItems.flatMap((item, index) =>
    item.productVariantId
      ? [
          {
            id: indexedId("f4", index),
            tenantId: RUBI_TENANT_ID,
            stockMovementId: saleMovementId,
            productVariantId: item.productVariantId,
            quantityDelta: -item.quantity,
            unitCost: null,
            createdAt: soldAt,
          },
        ]
      : [],
  );

  const stockMovements: StockMovementRecord[] = [
    {
      id: initialMovementId,
      tenantId: RUBI_TENANT_ID,
      movementNumber: "M-00000001",
      stockLocationId: RUBI_STOCK_LOCATION_ID,
      movementType: "INITIAL",
      status: "POSTED",
      saleId: null,
      orderId: null,
      purchaseId: null,
      reversalOfId: null,
      reason: "Carga inicial ficticia de demostración",
      occurredAt: isoMinutesAgo(120),
      createdByUserId: RUBI_ADMIN_USER_ID,
      createdAt: isoMinutesAgo(120),
      items: initialItems,
    },
    {
      id: saleMovementId,
      tenantId: RUBI_TENANT_ID,
      movementNumber: "M-00000002",
      stockLocationId: RUBI_STOCK_LOCATION_ID,
      movementType: "SALE",
      status: "POSTED",
      saleId,
      orderId: null,
      purchaseId: null,
      reversalOfId: null,
      reason: "Venta ficticia V-000001",
      occurredAt: soldAt,
      createdByUserId: RUBI_ADMIN_USER_ID,
      createdAt: soldAt,
      items: saleMovementItems,
    },
  ];

  const accounts: Account[] = [
    { id: RUBI_ACCOUNT_ID, name: RUBI_BRAND_CONTENT.accountName, status: "ACTIVE" },
  ];
  const users: User[] = [
    {
      id: RUBI_ADMIN_USER_ID,
      email: DEMO_CREDENTIALS.email,
      displayName: "Administración Rubí",
      status: "ACTIVE",
    },
  ];
  const roles: Role[] = [
    {
      id: RUBI_ADMIN_ROLE_ID,
      accountId: RUBI_ACCOUNT_ID,
      code: "ADMIN",
      name: "Administrador",
      description: "Administra la tienda y su operación",
      isSystem: true,
      permissions: [...ALL_PERMISSIONS],
    },
  ];
  const accountMembers: AccountMember[] = [
    {
      id: RUBI_ADMIN_MEMBER_ID,
      accountId: RUBI_ACCOUNT_ID,
      userId: RUBI_ADMIN_USER_ID,
      roleId: RUBI_ADMIN_ROLE_ID,
      status: "ACTIVE",
      joinedAt: now,
    },
  ];
  const tenants: Tenant[] = [
    {
      id: RUBI_TENANT_ID,
      accountId: RUBI_ACCOUNT_ID,
      name: RUBI_BRAND_CONTENT.tenant.name,
      slug: RUBI_BRAND_CONTENT.tenant.slug,
      status: "ACTIVE",
      defaultCurrency: RUBI_BRAND_CONTENT.tenant.defaultCurrency,
      timeZone: RUBI_BRAND_CONTENT.tenant.timeZone,
      enabled: RUBI_BRAND_CONTENT.tenant.enabled,
      enabledFeatures: ["CATALOG", "INVENTORY", "CUSTOMERS", "SALES", "POS"],
    },
  ];

  const storeProfiles: StoreProfile[] = [
    { tenantId: RUBI_TENANT_ID, ...RUBI_BRAND_CONTENT.storeProfile },
  ];
  const storefrontSettings: StorefrontSettings[] = [
    {
      tenantId: RUBI_TENANT_ID,
      isPublished: RUBI_BRAND_CONTENT.storefrontSettings.isPublished,
      contactFormEnabled: RUBI_BRAND_CONTENT.storefrontSettings.contactFormEnabled,
      showPrices: RUBI_BRAND_CONTENT.storefrontSettings.showPrices,
      allowNegativeStock: RUBI_BRAND_CONTENT.storefrontSettings.allowNegativeStock,
      defaultCatalogSort: RUBI_BRAND_CONTENT.storefrontSettings.defaultCatalogSort,
      catalogColumnsDesktop: RUBI_BRAND_CONTENT.storefrontSettings.catalogColumnsDesktop,
    },
  ];
  const storeThemes: StoreTheme[] = [
    {
      tenantId: RUBI_TENANT_ID,
      logoAssetId: null,
      faviconAssetId: null,
      logoUrl: RUBI_BRAND_CONTENT.theme.logoUrl,
      faviconUrl: RUBI_BRAND_CONTENT.theme.faviconUrl,
      primaryColor: RUBI_BRAND_CONTENT.theme.primaryColor,
      secondaryColor: RUBI_BRAND_CONTENT.theme.secondaryColor,
      backgroundColor: RUBI_BRAND_CONTENT.theme.backgroundColor,
      textColor: RUBI_BRAND_CONTENT.theme.textColor,
      headingFont: RUBI_BRAND_CONTENT.theme.headingFont,
      bodyFont: RUBI_BRAND_CONTENT.theme.bodyFont,
      borderRadius: RUBI_BRAND_CONTENT.theme.borderRadius,
      announcementEnabled: RUBI_BRAND_CONTENT.theme.announcementEnabled,
      announcementText: RUBI_BRAND_CONTENT.theme.announcementText,
      announcementUrl: RUBI_BRAND_CONTENT.theme.announcementUrl,
    },
  ];
  const storeContactChannels: StoreContactChannel[] = RUBI_BRAND_CONTENT.contactChannels.map((channel, index) => ({
    id: indexedId("c4", index),
    tenantId: RUBI_TENANT_ID,
    channelType: channel.channelType,
    value: channel.value,
    url: channel.url,
    enabled: channel.enabled,
    sortOrder: channel.sortOrder,
  }));
  const stockLocations: StockLocation[] = [
    {
      id: RUBI_STOCK_LOCATION_ID,
      tenantId: RUBI_TENANT_ID,
      name: "Local principal",
      code: "MAIN",
      isDefault: true,
      enabled: true,
      addressLine: RUBI_BRAND_CONTENT.storeProfile.addressLine,
      addressNumber: RUBI_BRAND_CONTENT.storeProfile.addressNumber,
      city: RUBI_BRAND_CONTENT.storeProfile.city,
      province: RUBI_BRAND_CONTENT.storeProfile.province,
    },
  ];

  return {
    version: MOCK_DATA_VERSION,
    sessionUserId: null,
    accounts,
    users,
    roles,
    accountMembers,
    tenants,
    mediaAssets,
    storeProfiles,
    storefrontSettings,
    storeThemes,
    storeContactChannels,
    categories,
    products,
    stockLocations,
    inventoryBalances,
    stockMovements,
    customers,
    sales,
    documentSequences: [{ tenantId: RUBI_TENANT_ID, nextSale: 2, nextMovement: 3 }],
  };
}
