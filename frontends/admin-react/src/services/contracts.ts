import type {
  AuthSession,
  Category,
  Customer,
  CustomerAddress,
  CustomerKind,
  CustomerSource,
  CustomerStatus,
  DashboardSummary,
  DefaultCatalogSort,
  InventoryItem,
  MediaAsset,
  PaginatedResult,
  Product,
  ProductCategoryAssignment,
  ProductDimensions,
  ProductImage,
  ProductStatus,
  Sale,
  SaleChannel,
  SellingMode,
  StockLocation,
  StockMovement,
  StockMovementType,
  StoreContactChannel,
  StoreContactChannelType,
  StoreProfile,
  StoreTheme,
  StorefrontSettings,
} from "@/domain/types";

export type ServiceErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_UNAVAILABLE"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "ALREADY_CANCELLED";

export interface PageInput {
  page?: number;
  pageSize?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ProductFilters extends PageInput {
  search?: string;
  categoryId?: string;
  status?: ProductStatus | "ALL";
  stock?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED";
  sort?: "NEWEST" | "OLDEST" | "NAME_ASC" | "NAME_DESC" | "PRICE_ASC" | "PRICE_DESC";
}

export interface ProductOptionValueInput {
  /** Existing id or a stable draft id used by selectedOptionValueIds. */
  id?: string;
  value: string;
  sortOrder?: number;
}

export interface ProductOptionInput {
  /** Existing id or a stable draft id. */
  id?: string;
  name: string;
  sortOrder?: number;
  values: ProductOptionValueInput[];
}

export interface ProductVariantInput {
  /** Existing id or a stable draft id used by initialInventory. */
  id?: string;
  name: string;
  sku?: string | null;
  barcode?: string | null;
  price?: number | null;
  compareAtPrice?: number | null;
  cost?: number | null;
  selectedOptionValueIds?: string[];
  dimensions?: ProductDimensions;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  isDefault?: boolean;
  enabled?: boolean;
  sortOrder?: number;
}

export interface ProductImageInput {
  id?: string;
  productVariantId?: string | null;
  mediaAssetId?: string;
  url: string;
  altText?: string | null;
  sortOrder?: number;
  isPrimary?: boolean;
  originalName?: string;
  mimeType?: string;
  sizeBytes?: number;
  width?: number | null;
  height?: number | null;
}

export interface ProductCoreInput {
  name: string;
  slug?: string;
  description?: string | null;
  status?: ProductStatus;
  sellingMode: SellingMode;
  seoTitle?: string | null;
  seoDescription?: string | null;
  categoryAssignments: ProductCategoryAssignment[];
  options?: ProductOptionInput[];
  images?: ProductImageInput[];
  variants: ProductVariantInput[];
}

export interface InitialInventoryInput {
  /** Resolve by a variant input id, or use variantIndex when the draft has no ids. */
  variantId?: string;
  variantIndex?: number;
  stockLocationId?: string;
  onHand: number;
  lowStockThreshold?: number | null;
}

export interface CreateProductInput extends ProductCoreInput {
  initialInventory?: InitialInventoryInput[];
}

export type UpdateProductInput = ProductCoreInput;

export interface ProductMutationResult {
  product: Product;
  initialMovement: StockMovement | null;
}

export interface PriceAdjustmentFilters {
  categoryId?: string;
  productIds?: string[];
}

export interface BulkPriceAdjustmentInput {
  filters?: PriceAdjustmentFilters;
  percentage: number;
  adjustPrice?: boolean;
  adjustCompareAtPrice?: boolean;
}

export interface PriceAdjustmentPreviewItem {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  previousPrice: number | null;
  nextPrice: number | null;
  previousCompareAtPrice: number | null;
  nextCompareAtPrice: number | null;
}

export interface BulkPriceAdjustmentResult {
  affectedProducts: number;
  affectedVariants: number;
  preview: PriceAdjustmentPreviewItem[];
}

export interface CategoryFilters {
  includeHidden?: boolean;
}

export interface CreateCategoryInput {
  parentId?: string | null;
  name: string;
  slug?: string;
  description?: string;
  sortOrder?: number;
  isVisible?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export interface CategoryOrderInput {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

export interface InventoryFilters extends PageInput {
  search?: string;
  categoryId?: string;
  stockLocationId?: string;
  status?: "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED";
}

export interface StockMovementFilters extends PageInput {
  search?: string;
  stockLocationId?: string;
  type?: StockMovementType | "ALL";
  from?: string;
  to?: string;
}

export type ManualStockMovementType = "MANUAL_IN" | "MANUAL_OUT" | "ADJUSTMENT" | "CUSTOMER_RETURN";

export interface InventoryAdjustmentItemInput {
  productVariantId: string;
  quantityDelta: number;
  unitCost?: number | null;
  lowStockThreshold?: number | null;
}

export interface InventoryAdjustmentInput {
  stockLocationId?: string;
  type: ManualStockMovementType;
  reason?: string | null;
  items: InventoryAdjustmentItemInput[];
}

export interface InventoryAdjustmentResult {
  movement: StockMovement;
  inventory: InventoryItem[];
}

export interface CustomerFilters extends PageInput {
  search?: string;
  status?: CustomerStatus | "ALL";
  kind?: CustomerKind | "ALL";
  source?: CustomerSource | "ALL";
}

export type CustomerAddressInput = Omit<CustomerAddress, "id"> & { id?: string };

export interface CustomerInput {
  userId?: string | null;
  customerGroupId?: string | null;
  source?: CustomerSource;
  kind?: CustomerKind;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
  documentType?: string | null;
  documentNumber?: string | null;
  taxCondition?: string | null;
  notes?: string | null;
  addresses?: CustomerAddressInput[];
}

export type CreateCustomerInput = CustomerInput;
export type UpdateCustomerInput = CustomerInput;

export interface SaleFilters extends PageInput {
  search?: string;
  status?: Sale["status"] | "ALL";
  channel?: SaleChannel | "ALL";
  customerId?: string;
  from?: string;
  to?: string;
}

export interface ConfirmSaleItemInput {
  productVariantId: string;
  quantity: number;
  unitPrice?: number;
  discountAmount?: number;
}

export interface ConfirmSaleInput {
  channel: Extract<SaleChannel, "POS" | "MANUAL">;
  customerId?: string | null;
  stockLocationId?: string;
  notes?: string | null;
  items: ConfirmSaleItemInput[];
}

export interface ConfirmSaleResult {
  sale: Sale;
  movement: StockMovement;
}

export interface CancelSaleInput {
  reason?: string | null;
}

export interface CancelSaleResult {
  sale: Sale;
  reversalMovement: StockMovement;
}

export type UpdateStoreProfileInput = Omit<StoreProfile, "tenantId">;
export type UpdateStorefrontSettingsInput = Omit<StorefrontSettings, "tenantId">;
export type UpdateStoreThemeInput = Omit<StoreTheme, "tenantId" | "logoUrl" | "faviconUrl">;
export type StoreContactChannelInput = Omit<StoreContactChannel, "id" | "tenantId"> & { id?: string };

export interface AuthService {
  login(input: LoginInput): Promise<AuthSession>;
  me(): Promise<AuthSession | null>;
  logout(): Promise<void>;
}

export interface DashboardService {
  get(): Promise<DashboardSummary>;
}

export interface ProductService {
  list(filters?: ProductFilters): Promise<PaginatedResult<Product>>;
  get(productId: string): Promise<Product>;
  create(input: CreateProductInput): Promise<ProductMutationResult>;
  update(productId: string, input: UpdateProductInput): Promise<Product>;
  duplicate(productId: string): Promise<Product>;
  setStatus(productId: string, status: ProductStatus): Promise<Product>;
  archive(productId: string): Promise<Product>;
  delete(productId: string): Promise<void>;
  previewPriceAdjustment(input: BulkPriceAdjustmentInput): Promise<BulkPriceAdjustmentResult>;
  bulkPrice(input: BulkPriceAdjustmentInput): Promise<BulkPriceAdjustmentResult>;
  bulkPriceAdjustment(input: BulkPriceAdjustmentInput): Promise<BulkPriceAdjustmentResult>;
}

export interface CategoryService {
  list(filters?: CategoryFilters): Promise<Category[]>;
  create(input: CreateCategoryInput): Promise<Category>;
  update(categoryId: string, input: UpdateCategoryInput): Promise<Category>;
  remove(categoryId: string): Promise<void>;
  delete(categoryId: string): Promise<void>;
  reorder(input: CategoryOrderInput[]): Promise<Category[]>;
}

export interface InventoryService {
  listLocations(): Promise<StockLocation[]>;
  list(filters?: InventoryFilters): Promise<PaginatedResult<InventoryItem>>;
  listMovements(filters?: StockMovementFilters): Promise<PaginatedResult<StockMovement>>;
  adjust(input: InventoryAdjustmentInput): Promise<InventoryAdjustmentResult>;
}

export interface CustomerService {
  list(filters?: CustomerFilters): Promise<PaginatedResult<Customer>>;
  get(customerId: string): Promise<Customer>;
  create(input: CreateCustomerInput): Promise<Customer>;
  update(customerId: string, input: UpdateCustomerInput): Promise<Customer>;
  setStatus(customerId: string, status: CustomerStatus): Promise<Customer>;
}

export interface SaleService {
  list(filters?: SaleFilters): Promise<PaginatedResult<Sale>>;
  get(saleId: string): Promise<Sale>;
  confirm(input: ConfirmSaleInput): Promise<ConfirmSaleResult>;
  cancel(saleId: string, input?: CancelSaleInput): Promise<CancelSaleResult>;
}

export interface StoreService {
  getProfile(): Promise<StoreProfile>;
  updateProfile(input: UpdateStoreProfileInput): Promise<StoreProfile>;
  getSettings(): Promise<StorefrontSettings>;
  updateSettings(input: UpdateStorefrontSettingsInput): Promise<StorefrontSettings>;
  getTheme(): Promise<StoreTheme>;
  updateTheme(input: UpdateStoreThemeInput): Promise<StoreTheme>;
  getContactChannels(): Promise<StoreContactChannel[]>;
  updateContactChannels(input: StoreContactChannelInput[]): Promise<StoreContactChannel[]>;
}

export interface DemoService {
  reset(): Promise<void>;
}

export interface Services {
  auth: AuthService;
  dashboard: DashboardService;
  products: ProductService;
  categories: CategoryService;
  inventory: InventoryService;
  customers: CustomerService;
  sales: SaleService;
  store: StoreService;
  demo: DemoService;
}

export interface UploadedMockAsset extends MediaAsset {
  transient: true;
}

export interface StorePreviewOptions {
  catalogSort: DefaultCatalogSort;
  primaryImage?: ProductImage;
  contactChannel?: StoreContactChannelType;
}
