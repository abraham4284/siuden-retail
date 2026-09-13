export type ISODateString = string;

export type UserRole = "OWNER" | "ADMIN" | "SELLER" | "STOCK_MANAGER";

export type AccountStatus = "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
export type UserStatus = "PENDING" | "ACTIVE" | "BLOCKED" | "DISABLED";
export type AccountMemberStatus = "INVITED" | "ACTIVE" | "BLOCKED";
export type TenantStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export type PermissionCode =
  | "store.read"
  | "store.update"
  | "store.theme.update"
  | "products.read"
  | "products.write"
  | "categories.write"
  | "inventory.read"
  | "inventory.adjust"
  | "customers.read"
  | "customers.write"
  | "sales.read"
  | "sales.create"
  | "sales.cancel"
  | "pos.use"
  | "orders.manage"
  | "users.manage"
  | "roles.manage";

export type TenantFeatureCode =
  | "CATALOG"
  | "INVENTORY"
  | "CUSTOMERS"
  | "SALES"
  | "POS"
  | "PURCHASES"
  | "ONLINE_ORDERS"
  | "ONLINE_PAYMENTS"
  | "SHIPPING"
  | "INVOICING";

export interface Account {
  id: string;
  name: string;
  status: AccountStatus;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
}

export interface Role {
  id: string;
  accountId: string;
  code: UserRole;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: PermissionCode[];
}

export interface AccountMember {
  id: string;
  accountId: string;
  userId: string;
  roleId: string;
  status: AccountMemberStatus;
  joinedAt: ISODateString | null;
}

export interface Tenant {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  status: TenantStatus;
  defaultCurrency: string;
  timeZone: string;
  enabled: boolean;
  enabledFeatures: TenantFeatureCode[];
}

export interface AuthSession {
  user: Pick<User, "id" | "email" | "displayName">;
  account: Account;
  membership: {
    id: string;
    role: UserRole;
    status: AccountMemberStatus;
    permissions: PermissionCode[];
  };
  tenant: Pick<
    Tenant,
    | "id"
    | "accountId"
    | "slug"
    | "name"
    | "status"
    | "defaultCurrency"
    | "timeZone"
    | "enabled"
    | "enabledFeatures"
  > & {
    logoUrl?: string;
    primaryColor: string;
  };
}

export interface MediaAsset {
  id: string;
  tenantId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  checksumSha256: string | null;
  status: "ACTIVE" | "DELETED";
  url: string;
  createdAt: ISODateString;
  deletedAt: ISODateString | null;
}

export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SellingMode = "DIRECT" | "INQUIRY_ONLY";

export interface ProductImage {
  id: string;
  tenantId: string;
  productId: string;
  productVariantId: string | null;
  mediaAssetId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductOptionValue {
  id: string;
  tenantId: string;
  productOptionId: string;
  value: string;
  sortOrder: number;
}

export interface ProductOption {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  sortOrder: number;
  values: ProductOptionValue[];
}

export interface ProductDimensions {
  weightKg?: number;
  heightCm?: number;
  widthCm?: number;
  depthCm?: number;
}

export interface ProductVariant {
  id: string;
  tenantId: string;
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number | null;
  compareAtPrice: number | null;
  cost: number | null;
  selectedOptionValueIds: string[];
  dimensions: ProductDimensions;
  trackInventory: boolean;
  allowBackorder: boolean;
  isDefault: boolean;
  enabled: boolean;
  sortOrder: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface ProductCategoryAssignment {
  categoryId: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  sellingMode: SellingMode;
  seoTitle: string | null;
  seoDescription: string | null;
  categoryAssignments: ProductCategoryAssignment[];
  options: ProductOption[];
  images: ProductImage[];
  variants: ProductVariant[];
  publishedAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export type ExternalCategoryProvider = "GOOGLE_SHOPPING" | "META" | "OTHER";

export interface CategoryExternalMapping {
  provider: ExternalCategoryProvider;
  externalCategoryId: string;
}

export interface Category {
  id: string;
  tenantId: string;
  parentId: string | null;
  name: string;
  slug: string;
  description?: string;
  isVisible: boolean;
  sortOrder: number;
  productCount: number;
  externalMappings?: CategoryExternalMapping[];
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export interface StockLocation {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  isDefault: boolean;
  enabled: boolean;
  addressLine?: string | null;
  addressNumber?: string | null;
  city?: string | null;
  province?: string | null;
}

export interface InventoryBalance {
  id: string;
  tenantId: string;
  stockLocationId: string;
  productVariantId: string;
  onHand: number;
  reserved: number;
  lowStockThreshold: number | null;
  updatedAt: ISODateString;
}

export type InventoryStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED";

export interface InventoryItem {
  tenantId: string;
  stockLocationId: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  imageUrl: string | null;
  categoryNames: string[];
  onHand: number;
  reserved: number;
  available: number;
  lowStockThreshold: number | null;
  trackInventory: boolean;
  status: InventoryStatus;
}

export type StockMovementType =
  | "INITIAL"
  | "MANUAL_IN"
  | "MANUAL_OUT"
  | "ADJUSTMENT"
  | "SALE"
  | "SALE_REVERSAL"
  | "PURCHASE"
  | "PURCHASE_RETURN"
  | "CUSTOMER_RETURN";

export type StockMovementStatus = "POSTED" | "REVERSED";

export interface StockMovementItemRecord {
  id: string;
  tenantId: string;
  stockMovementId: string;
  productVariantId: string;
  quantityDelta: number;
  unitCost: number | null;
  createdAt: ISODateString;
}

export interface StockMovementRecord {
  id: string;
  tenantId: string;
  movementNumber: string;
  stockLocationId: string;
  movementType: StockMovementType;
  status: StockMovementStatus;
  saleId: string | null;
  orderId: string | null;
  purchaseId: string | null;
  reversalOfId: string | null;
  reason: string | null;
  occurredAt: ISODateString;
  createdByUserId: string | null;
  createdAt: ISODateString;
  items: StockMovementItemRecord[];
}

export interface StockMovementItem {
  id: string;
  productVariantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  quantityDelta: number;
  unitCost: number | null;
}

export interface StockMovement {
  id: string;
  tenantId: string;
  movementNumber: string;
  stockLocationId: string;
  type: StockMovementType;
  status: StockMovementStatus;
  saleId: string | null;
  orderId: string | null;
  purchaseId: string | null;
  reversalOfId: string | null;
  reason: string | null;
  occurredAt: ISODateString;
  createdBy: {
    id: string;
    displayName: string;
  } | null;
  items: StockMovementItem[];
  createdAt: ISODateString;
}

export type CustomerSource = "STOREFRONT" | "POS" | "ADMIN" | "IMPORT";
export type CustomerKind = "INDIVIDUAL" | "BUSINESS";
export type CustomerStatus = "ACTIVE" | "BLOCKED" | "ARCHIVED";
export type CustomerAddressType = "HOME" | "BILLING" | "SHIPPING" | "OTHER";

export interface CustomerAddress {
  id: string;
  addressType: CustomerAddressType;
  label: string | null;
  street: string;
  number: string | null;
  floor: string | null;
  apartment: string | null;
  city: string;
  province: string;
  postalCode: string | null;
  countryCode: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  tenantId: string;
  userId: string | null;
  customerGroupId: string | null;
  source: CustomerSource;
  kind: CustomerKind;
  firstName: string | null;
  lastName: string | null;
  businessName: string | null;
  email: string | null;
  phone: string | null;
  documentType: string | null;
  documentNumber: string | null;
  taxCondition: string | null;
  notes: string | null;
  addresses: CustomerAddress[];
  status: CustomerStatus;
  blockedAt: ISODateString | null;
  salesCount: number;
  totalSpent: number;
  createdAt: ISODateString;
  updatedAt: ISODateString;
  deletedAt: ISODateString | null;
}

export type SaleChannel = "POS" | "MANUAL" | "ONLINE";
export type SaleStatus = "DRAFT" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
export type SalePaymentStatus = "UNPAID" | "PENDING" | "PARTIAL" | "PAID" | "REFUNDED";

export interface SaleItem {
  id: string;
  productVariantId: string | null;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  tenantId: string;
  saleNumber: string;
  channel: SaleChannel;
  status: SaleStatus;
  paymentStatus: SalePaymentStatus;
  customerId: string | null;
  sourceOrderId: string | null;
  stockLocationId: string;
  customerNameSnapshot: string | null;
  customerDocumentSnapshot: string | null;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  notes: string | null;
  soldAt: ISODateString | null;
  createdByUserId: string | null;
  createdByName: string | null;
  confirmedAt: ISODateString | null;
  cancelledAt: ISODateString | null;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

export interface StoreProfile {
  tenantId: string;
  brandName: string;
  contactEmail: string | null;
  phone: string | null;
  addressLine: string | null;
  addressNumber: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
}

export type DefaultCatalogSort = "FEATURED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "NAME_ASC";

export interface StorefrontSettings {
  tenantId: string;
  isPublished: boolean;
  contactFormEnabled: boolean;
  showPrices: boolean;
  allowNegativeStock: boolean;
  defaultCatalogSort: DefaultCatalogSort;
  catalogColumnsDesktop: number;
}

export interface StoreTheme {
  tenantId: string;
  logoAssetId: string | null;
  faviconAssetId: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  headingFont: string;
  bodyFont: string;
  borderRadius: string;
  announcementEnabled: boolean;
  announcementText: string | null;
  announcementUrl: string | null;
}

export type StoreContactChannelType = "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "MESSENGER" | "EMAIL" | "OTHER";

export interface StoreContactChannel {
  id: string;
  tenantId: string;
  channelType: StoreContactChannelType;
  value: string | null;
  url: string | null;
  enabled: boolean;
  sortOrder: number;
}

export interface DashboardSummary {
  publishedProducts: number;
  variants: number;
  availableUnits: number;
  lowStockItems: number;
  salesToday: number;
  totalSoldToday: number;
  currency: string;
  lowStockProducts: InventoryItem[];
  recentMovements: StockMovement[];
  recentSales: Sale[];
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
