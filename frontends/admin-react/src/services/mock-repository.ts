import type {
  AuthSession,
  Category,
  Customer,
  CustomerAddress,
  CustomerStatus,
  DashboardSummary,
  InventoryBalance,
  InventoryItem,
  InventoryStatus,
  MediaAsset,
  PaginatedResult,
  PermissionCode,
  Product,
  ProductImage,
  ProductOption,
  ProductStatus,
  ProductVariant,
  Sale,
  StockLocation,
  StockMovement,
  StockMovementItem,
  StockMovementRecord,
  StoreContactChannel,
  StoreProfile,
  StoreTheme,
  StorefrontSettings,
  Tenant,
  TenantFeatureCode,
  User,
} from "@/domain/types";
import {
  createMockSeed,
  DEMO_CREDENTIALS,
  MOCK_DATA_VERSION,
  MOCK_STORAGE_KEY,
  type MockDatabase,
} from "@/mocks/seed";
import type {
  BulkPriceAdjustmentInput,
  BulkPriceAdjustmentResult,
  CancelSaleInput,
  CancelSaleResult,
  CategoryFilters,
  CategoryOrderInput,
  ConfirmSaleInput,
  ConfirmSaleResult,
  CreateCategoryInput,
  CreateCustomerInput,
  CreateProductInput,
  CustomerFilters,
  InventoryAdjustmentInput,
  InventoryAdjustmentResult,
  InventoryFilters,
  LoginInput,
  PriceAdjustmentPreviewItem,
  ProductCoreInput,
  ProductFilters,
  ProductImageInput,
  ProductMutationResult,
  ProductOptionInput,
  ProductVariantInput,
  SaleFilters,
  ServiceErrorCode,
  StockMovementFilters,
  StoreContactChannelInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateProductInput,
  UpdateStorefrontSettingsInput,
  UpdateStoreProfileInput,
  UpdateStoreThemeInput,
} from "@/services/contracts";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PRODUCT_IMAGES = 20;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class MockServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly fieldErrors?: Readonly<Record<string, string>>;

  constructor(code: ServiceErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "MockServiceError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

interface TenantContext {
  session: AuthSession;
  tenant: Tenant;
  tenantId: string;
  user: User;
}

interface ProductBuildResult {
  product: Product;
  variantDraftIdMap: Map<string, string>;
}

function fail(code: ServiceErrorCode, message: string, fieldErrors?: Record<string, string>): never {
  throw new MockServiceError(code, message, fieldErrors);
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMockDatabase(value: unknown): value is MockDatabase {
  if (!isRecord(value) || value.version !== MOCK_DATA_VERSION) return false;
  return (
    (value.sessionUserId === null || typeof value.sessionUserId === "string") &&
    Array.isArray(value.accounts) &&
    Array.isArray(value.users) &&
    Array.isArray(value.roles) &&
    Array.isArray(value.accountMembers) &&
    Array.isArray(value.tenants) &&
    Array.isArray(value.mediaAssets) &&
    Array.isArray(value.storeProfiles) &&
    Array.isArray(value.storefrontSettings) &&
    Array.isArray(value.storeThemes) &&
    Array.isArray(value.storeContactChannels) &&
    Array.isArray(value.products) &&
    Array.isArray(value.categories) &&
    Array.isArray(value.stockLocations) &&
    Array.isArray(value.inventoryBalances) &&
    Array.isArray(value.stockMovements) &&
    Array.isArray(value.customers) &&
    Array.isArray(value.sales) &&
    Array.isArray(value.documentSequences)
  );
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-AR");
}

function nullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function slugify(value: string): string {
  return normalizeSearch(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function numeric(value: number, field: string, options?: { positive?: boolean; nullable?: boolean }): number {
  if (!Number.isFinite(value)) {
    fail("VALIDATION", `${field} debe ser un número válido.`, { [field]: "Ingresá un número válido." });
  }
  if (options?.positive ? value <= 0 : value < 0) {
    fail("VALIDATION", `${field} no puede ser negativo.`, {
      [field]: options?.positive ? "Debe ser mayor que cero." : "No puede ser negativo.",
    });
  }
  return value;
}

function newId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const random = Math.random().toString(16).slice(2).padEnd(12, "0").slice(0, 12);
  const time = Date.now().toString(16).padStart(12, "0").slice(-12);
  return `${time.slice(0, 8)}-${time.slice(8, 12)}-4000-8000-${random}`;
}

function paginate<T>(items: T[], pageInput?: number, pageSizeInput?: number): PaginatedResult<T> {
  const page = Math.max(1, Math.floor(pageInput ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSizeInput ?? DEFAULT_PAGE_SIZE)));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export class MockRepository {
  private state: MockDatabase;
  private mutationQueue: Promise<void> = Promise.resolve();
  private readonly delayMs: number;

  constructor(delayMs = 90) {
    this.delayMs = Math.max(0, delayMs);
    this.state = this.loadState();
  }

  async adoptSession(session: AuthSession): Promise<void> {
    await this.mutate((state) => {
      const accountIndex = state.accounts.findIndex((item) => item.id === session.account.id);
      if (accountIndex >= 0) state.accounts[accountIndex] = session.account;
      else state.accounts.push(session.account);

      const user = { ...session.user, status: "ACTIVE" as const };
      const userIndex = state.users.findIndex((item) => item.id === user.id);
      if (userIndex >= 0) state.users[userIndex] = user;
      else state.users.push(user);

      const tenantIndex = state.tenants.findIndex((item) => item.id === session.tenant.id);
      const tenant = { ...session.tenant } as Tenant;
      if (tenantIndex >= 0) state.tenants[tenantIndex] = tenant;
      else state.tenants.push(tenant);

      const roleId = `http-role-${session.account.id}-${session.membership.role}`;
      const role = {
        id: roleId,
        accountId: session.account.id,
        code: session.membership.role,
        name: session.membership.role,
        description: "Rol provisto por la API NestJS",
        isSystem: true,
        permissions: session.membership.permissions,
      };
      const roleIndex = state.roles.findIndex((item) => item.id === roleId);
      if (roleIndex >= 0) state.roles[roleIndex] = role;
      else state.roles.push(role);

      const membership = {
        id: session.membership.id,
        accountId: session.account.id,
        userId: session.user.id,
        roleId,
        status: session.membership.status,
        joinedAt: new Date().toISOString(),
      };
      const membershipIndex = state.accountMembers.findIndex(
        (item) => item.accountId === session.account.id && item.userId === session.user.id,
      );
      if (membershipIndex >= 0) state.accountMembers[membershipIndex] = membership;
      else state.accountMembers.push(membership);
      state.sessionUserId = session.user.id;
    });
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.mutate((state) => {
      const email = input.email.trim().toLocaleLowerCase();
      if (email !== DEMO_CREDENTIALS.email || input.password !== DEMO_CREDENTIALS.password) {
        fail("INVALID_CREDENTIALS", "El email o la contraseña no son correctos.");
      }

      const user = state.users.find((candidate) => candidate.email.toLocaleLowerCase() === email);
      if (!user || user.status !== "ACTIVE") {
        fail("INVALID_CREDENTIALS", "El email o la contraseña no son correctos.");
      }

      state.sessionUserId = user.id;
      return this.contextForUser(state, user.id).session;
    });
  }

  async me(): Promise<AuthSession | null> {
    return this.read((state) => {
      if (!state.sessionUserId) return null;
      try {
        return this.contextForUser(state, state.sessionUserId).session;
      } catch {
        return null;
      }
    });
  }

  async logout(): Promise<void> {
    await this.mutate((state) => {
      state.sessionUserId = null;
    });
  }

  async getDashboard(): Promise<DashboardSummary> {
    return this.read((state) => {
      const context = this.requireContext(state);
      const products = state.products.filter(
        (product) => product.tenantId === context.tenantId && product.deletedAt === null,
      );
      const inventory = this.inventoryItems(state, context.tenantId, {});
      const sales = state.sales.filter((sale) => sale.tenantId === context.tenantId);
      const today = this.localDateKey(new Date(), context.tenant.timeZone);
      const salesToday = sales.filter(
        (sale) =>
          sale.status === "CONFIRMED" &&
          sale.soldAt !== null &&
          this.localDateKey(new Date(sale.soldAt), context.tenant.timeZone) === today,
      );

      return {
        publishedProducts: products.filter((product) => product.status === "PUBLISHED").length,
        variants: products.reduce(
          (total, product) => total + product.variants.filter((variant) => variant.deletedAt === null).length,
          0,
        ),
        availableUnits: inventory
          .filter((item) => item.trackInventory)
          .reduce((total, item) => total + item.available, 0),
        lowStockItems: inventory.filter((item) => item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK")
          .length,
        salesToday: salesToday.length,
        totalSoldToday: roundMoney(salesToday.reduce((total, sale) => total + sale.total, 0)),
        currency: context.tenant.defaultCurrency,
        lowStockProducts: inventory
          .filter((item) => item.status === "LOW_STOCK" || item.status === "OUT_OF_STOCK")
          .slice(0, 6),
        recentMovements: state.stockMovements
          .filter((movement) => movement.tenantId === context.tenantId)
          .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
          .slice(0, 6)
          .map((movement) => this.movementView(state, movement)),
        recentSales: sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      };
    });
  }

  async listProducts(filters: ProductFilters = {}): Promise<PaginatedResult<Product>> {
    return this.read((state) => {
      const context = this.requireContext(state, "products.read", "CATALOG");
      let products = state.products
        .filter((product) => product.tenantId === context.tenantId && product.deletedAt === null)
        .map((product) => this.productView(state, product));

      if (filters.search?.trim()) {
        const search = normalizeSearch(filters.search);
        products = products.filter(
          (product) =>
            normalizeSearch(product.name).includes(search) ||
            product.variants.some((variant) => normalizeSearch(variant.sku ?? "").includes(search)),
        );
      }
      if (filters.categoryId) {
        products = products.filter((product) =>
          product.categoryAssignments.some((assignment) => assignment.categoryId === filters.categoryId),
        );
      }
      if (filters.status && filters.status !== "ALL") {
        products = products.filter((product) => product.status === filters.status);
      }
      if (filters.stock && filters.stock !== "ALL") {
        products = products.filter((product) => {
          const statuses = this.inventoryItems(state, context.tenantId, {}).filter(
            (item) => item.productId === product.id,
          );
          return statuses.some((item) => item.status === filters.stock);
        });
      }

      const priceOf = (product: Product): number => {
        const prices = product.variants.flatMap((variant) =>
          variant.enabled && variant.price !== null ? [variant.price] : [],
        );
        return prices.length > 0 ? Math.min(...prices) : Number.POSITIVE_INFINITY;
      };
      switch (filters.sort) {
        case "OLDEST":
          products.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          break;
        case "NAME_ASC":
          products.sort((a, b) => a.name.localeCompare(b.name, "es"));
          break;
        case "NAME_DESC":
          products.sort((a, b) => b.name.localeCompare(a.name, "es"));
          break;
        case "PRICE_ASC":
          products.sort((a, b) => priceOf(a) - priceOf(b));
          break;
        case "PRICE_DESC":
          products.sort((a, b) => priceOf(b) - priceOf(a));
          break;
        case "NEWEST":
        default:
          products.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
      return paginate(products, filters.page, filters.pageSize);
    });
  }

  async getProduct(productId: string): Promise<Product> {
    return this.read((state) => {
      const context = this.requireContext(state, "products.read", "CATALOG");
      return this.productView(state, this.findProduct(state, context.tenantId, productId));
    });
  }

  async createProduct(input: CreateProductInput): Promise<ProductMutationResult> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      const built = this.buildProduct(state, context, input);
      state.products.push(built.product);

      const initialMovement = this.applyInitialInventory(state, context, built, input);
      return {
        product: this.productView(state, built.product),
        initialMovement: initialMovement ? this.movementView(state, initialMovement) : null,
      };
    });
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      const existing = this.findProduct(state, context.tenantId, productId);
      const built = this.buildProduct(state, context, input, existing);
      const index = state.products.findIndex((product) => product.id === existing.id);
      state.products[index] = built.product;
      return this.productView(state, built.product);
    });
  }

  async duplicateProduct(productId: string): Promise<Product> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      const source = this.productView(state, this.findProduct(state, context.tenantId, productId));
      const optionValueMap = new Map<string, string>();
      const options: ProductOptionInput[] = source.options.map((option) => ({
        name: option.name,
        sortOrder: option.sortOrder,
        values: option.values.map((value) => {
          const draftId = newId();
          optionValueMap.set(value.id, draftId);
          return { id: draftId, value: value.value, sortOrder: value.sortOrder };
        }),
      }));
      const variantDraftIds = new Map<string, string>();
      const variants: ProductVariantInput[] = source.variants.map((variant) => {
        const draftId = newId();
        variantDraftIds.set(variant.id, draftId);
        return {
          id: draftId,
          name: variant.name,
          sku: null,
          barcode: null,
          price: variant.price,
          compareAtPrice: variant.compareAtPrice,
          cost: variant.cost,
          selectedOptionValueIds: variant.selectedOptionValueIds.map(
            (valueId) => optionValueMap.get(valueId) ?? valueId,
          ),
          dimensions: variant.dimensions,
          trackInventory: variant.trackInventory,
          allowBackorder: variant.allowBackorder,
          isDefault: variant.isDefault,
          enabled: variant.enabled,
          sortOrder: variant.sortOrder,
        };
      });
      const baseSlug = `${source.slug}-copia`;
      const duplicateInput: CreateProductInput = {
        name: `${source.name} (copia)`,
        slug: this.availableSlug(state.products, context.tenantId, baseSlug),
        description: source.description,
        status: "DRAFT",
        sellingMode: source.sellingMode,
        seoTitle: source.seoTitle,
        seoDescription: source.seoDescription,
        categoryAssignments: source.categoryAssignments,
        options,
        images: source.images.map((image) => ({
          mediaAssetId: image.mediaAssetId,
          productVariantId: image.productVariantId
            ? (variantDraftIds.get(image.productVariantId) ?? null)
            : null,
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary,
        })),
        variants,
      };
      const built = this.buildProduct(state, context, duplicateInput);
      state.products.push(built.product);
      return this.productView(state, built.product);
    });
  }

  async setProductStatus(productId: string, status: ProductStatus): Promise<Product> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      const product = this.findProduct(state, context.tenantId, productId);
      if (status === "PUBLISHED") this.validateProductForPublication(product);
      const now = new Date().toISOString();
      product.status = status;
      product.publishedAt = status === "PUBLISHED" ? (product.publishedAt ?? now) : null;
      product.updatedAt = now;
      return this.productView(state, product);
    });
  }

  async archiveProduct(productId: string): Promise<Product> {
    return this.setProductStatus(productId, "ARCHIVED");
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      const product = this.findProduct(state, context.tenantId, productId);
      const now = new Date().toISOString();
      product.status = "ARCHIVED";
      product.deletedAt = now;
      product.updatedAt = now;
      product.variants.forEach((variant) => {
        variant.enabled = false;
        variant.deletedAt = variant.deletedAt ?? now;
        variant.updatedAt = now;
      });
    });
  }

  async previewPriceAdjustment(input: BulkPriceAdjustmentInput): Promise<BulkPriceAdjustmentResult> {
    return this.read((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      return this.priceAdjustment(state, context.tenantId, input, false);
    });
  }

  async bulkPriceAdjustment(input: BulkPriceAdjustmentInput): Promise<BulkPriceAdjustmentResult> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "products.write", "CATALOG");
      return this.priceAdjustment(state, context.tenantId, input, true);
    });
  }

  async listCategories(filters: CategoryFilters = {}): Promise<Category[]> {
    return this.read((state) => {
      const context = this.requireContext(state, "products.read", "CATALOG");
      return state.categories
        .filter(
          (category) =>
            category.tenantId === context.tenantId &&
            category.deletedAt === null &&
            (filters.includeHidden || category.isVisible),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "es"))
        .map((category) => this.categoryView(state, category));
    });
  }

  async createCategory(input: CreateCategoryInput): Promise<Category> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "categories.write", "CATALOG");
      const now = new Date().toISOString();
      const name = input.name.trim();
      if (!name) fail("VALIDATION", "El nombre de la categoría es obligatorio.", { name: "Ingresá un nombre." });
      if (input.parentId) this.findCategory(state, context.tenantId, input.parentId);
      const requestedSlug = nullableText(input.slug) ?? slugify(name);
      if (!requestedSlug) fail("VALIDATION", "No se pudo generar un slug válido.", { slug: "Ingresá un slug válido." });
      this.assertUniqueCategorySlug(state, context.tenantId, requestedSlug);

      const category: Category = {
        id: newId(),
        tenantId: context.tenantId,
        parentId: input.parentId ?? null,
        name,
        slug: requestedSlug,
        description: nullableText(input.description) ?? undefined,
        isVisible: input.isVisible ?? true,
        sortOrder: Math.max(0, Math.floor(input.sortOrder ?? this.nextCategoryOrder(state, context.tenantId, input.parentId ?? null))),
        productCount: 0,
        externalMappings: [],
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      state.categories.push(category);
      return this.categoryView(state, category);
    });
  }

  async updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<Category> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "categories.write", "CATALOG");
      const category = this.findCategory(state, context.tenantId, categoryId);
      const nextParentId = input.parentId === undefined ? category.parentId : input.parentId;
      if (nextParentId) this.findCategory(state, context.tenantId, nextParentId);
      this.assertNoCategoryCycle(state, category.id, nextParentId);

      if (input.name !== undefined) {
        const name = input.name.trim();
        if (!name) fail("VALIDATION", "El nombre de la categoría es obligatorio.", { name: "Ingresá un nombre." });
        category.name = name;
      }
      if (input.slug !== undefined) {
        const slug = slugify(input.slug);
        if (!slug) fail("VALIDATION", "El slug no es válido.", { slug: "Ingresá un slug válido." });
        this.assertUniqueCategorySlug(state, context.tenantId, slug, category.id);
        category.slug = slug;
      }
      if (input.description !== undefined) category.description = nullableText(input.description) ?? undefined;
      if (input.isVisible !== undefined) category.isVisible = input.isVisible;
      if (input.sortOrder !== undefined) category.sortOrder = Math.max(0, Math.floor(input.sortOrder));
      category.parentId = nextParentId ?? null;
      category.updatedAt = new Date().toISOString();
      return this.categoryView(state, category);
    });
  }

  async deleteCategory(categoryId: string): Promise<void> {
    await this.mutate((state) => {
      const context = this.requireContext(state, "categories.write", "CATALOG");
      const category = this.findCategory(state, context.tenantId, categoryId);
      const hasChildren = state.categories.some(
        (candidate) => candidate.tenantId === context.tenantId && candidate.deletedAt === null && candidate.parentId === category.id,
      );
      const hasProducts = state.products.some(
        (product) =>
          product.tenantId === context.tenantId &&
          product.deletedAt === null &&
          product.categoryAssignments.some((assignment) => assignment.categoryId === category.id),
      );
      if (hasChildren) fail("CONFLICT", "La categoría tiene subcategorías. Reubicalas antes de eliminarla.");
      if (hasProducts) fail("CONFLICT", "La categoría tiene productos. Reasignalos antes de eliminarla.");
      category.isVisible = false;
      category.deletedAt = new Date().toISOString();
      category.updatedAt = category.deletedAt;
    });
  }

  async reorderCategories(input: CategoryOrderInput[]): Promise<Category[]> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "categories.write", "CATALOG");
      const ids = new Set(input.map((entry) => entry.id));
      if (ids.size !== input.length) fail("VALIDATION", "La lista de categorías contiene elementos repetidos.");

      input.forEach((entry) => {
        this.findCategory(state, context.tenantId, entry.id);
        if (entry.parentId) this.findCategory(state, context.tenantId, entry.parentId);
      });
      const parentOverrides = new Map(input.map((entry) => [entry.id, entry.parentId] as const));
      input.forEach((entry) => this.assertNoCategoryCycle(state, entry.id, entry.parentId, parentOverrides));

      const now = new Date().toISOString();
      input.forEach((entry) => {
        const category = this.findCategory(state, context.tenantId, entry.id);
        category.parentId = entry.parentId;
        category.sortOrder = Math.max(0, Math.floor(entry.sortOrder));
        category.updatedAt = now;
      });
      return state.categories
        .filter((category) => category.tenantId === context.tenantId && category.deletedAt === null)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((category) => this.categoryView(state, category));
    });
  }

  async listStockLocations(): Promise<StockLocation[]> {
    return this.read((state) => {
      const context = this.requireContext(state, "inventory.read", "INVENTORY");
      return state.stockLocations.filter(
        (location) => location.tenantId === context.tenantId && location.enabled,
      );
    });
  }

  async listInventory(filters: InventoryFilters = {}): Promise<PaginatedResult<InventoryItem>> {
    return this.read((state) => {
      const context = this.requireContext(state, "inventory.read", "INVENTORY");
      return paginate(this.inventoryItems(state, context.tenantId, filters), filters.page, filters.pageSize);
    });
  }

  async listStockMovements(filters: StockMovementFilters = {}): Promise<PaginatedResult<StockMovement>> {
    return this.read((state) => {
      const context = this.requireContext(state, "inventory.read", "INVENTORY");
      let movements = state.stockMovements
        .filter((movement) => movement.tenantId === context.tenantId)
        .map((movement) => this.movementView(state, movement));
      if (filters.search?.trim()) {
        const search = normalizeSearch(filters.search);
        movements = movements.filter(
          (movement) =>
            normalizeSearch(movement.movementNumber).includes(search) ||
            normalizeSearch(movement.reason ?? "").includes(search) ||
            movement.items.some(
              (item) =>
                normalizeSearch(item.productName).includes(search) || normalizeSearch(item.sku ?? "").includes(search),
            ),
        );
      }
      if (filters.stockLocationId) {
        movements = movements.filter((movement) => movement.stockLocationId === filters.stockLocationId);
      }
      if (filters.type && filters.type !== "ALL") movements = movements.filter((movement) => movement.type === filters.type);
      if (filters.from) movements = movements.filter((movement) => movement.occurredAt >= filters.from!);
      if (filters.to) movements = movements.filter((movement) => movement.occurredAt <= filters.to!);
      movements.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      return paginate(movements, filters.page, filters.pageSize);
    });
  }

  async adjustInventory(input: InventoryAdjustmentInput): Promise<InventoryAdjustmentResult> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "inventory.adjust", "INVENTORY");
      if (input.items.length === 0) fail("VALIDATION", "Agregá al menos una variante al ajuste.");
      const reason = nullableText(input.reason);
      if ((input.type === "ADJUSTMENT" || input.type === "MANUAL_OUT") && !reason) {
        fail("VALIDATION", "El motivo es obligatorio para ajustes y salidas manuales.", { reason: "Ingresá un motivo." });
      }
      const location = this.resolveLocation(state, context.tenantId, input.stockLocationId);
      const duplicateIds = new Set<string>();
      input.items.forEach((item) => {
        if (duplicateIds.has(item.productVariantId)) fail("CONFLICT", "Una variante no puede repetirse en el mismo ajuste.");
        duplicateIds.add(item.productVariantId);
      });
      const settings = this.findSettings(state, context.tenantId);
      const now = new Date().toISOString();
      const movementId = newId();

      const movementItems = input.items.map((item) => {
        if (!Number.isFinite(item.quantityDelta) || item.quantityDelta === 0) {
          fail("VALIDATION", "Cada cantidad debe ser distinta de cero.");
        }
        if (input.type === "MANUAL_IN" && item.quantityDelta < 0) {
          fail("VALIDATION", "Una entrada manual debe tener cantidad positiva.");
        }
        if (input.type === "MANUAL_OUT" && item.quantityDelta > 0) {
          fail("VALIDATION", "Una salida manual debe tener cantidad negativa.");
        }
        const variant = this.findVariant(state, context.tenantId, item.productVariantId).variant;
        if (!variant.trackInventory) fail("VALIDATION", `${variant.name} no controla inventario.`);
        if (item.unitCost !== undefined && item.unitCost !== null) numeric(item.unitCost, "unitCost");
        if (item.lowStockThreshold !== undefined && item.lowStockThreshold !== null) {
          numeric(item.lowStockThreshold, "lowStockThreshold");
        }
        const balance = this.ensureBalance(state, context.tenantId, location.id, variant.id, now);
        const resultingOnHand = balance.onHand + item.quantityDelta;
        if (!settings.allowNegativeStock && resultingOnHand - balance.reserved < 0) {
          fail("INSUFFICIENT_STOCK", `El ajuste dejaría stock negativo para ${variant.name}.`);
        }
        balance.onHand = resultingOnHand;
        if (item.lowStockThreshold !== undefined) balance.lowStockThreshold = item.lowStockThreshold;
        balance.updatedAt = now;
        return {
          id: newId(),
          tenantId: context.tenantId,
          stockMovementId: movementId,
          productVariantId: variant.id,
          quantityDelta: item.quantityDelta,
          unitCost: item.unitCost ?? null,
          createdAt: now,
        };
      });
      const movement: StockMovementRecord = {
        id: movementId,
        tenantId: context.tenantId,
        movementNumber: this.nextMovementNumber(state, context.tenantId),
        stockLocationId: location.id,
        movementType: input.type,
        status: "POSTED",
        saleId: null,
        orderId: null,
        purchaseId: null,
        reversalOfId: null,
        reason,
        occurredAt: now,
        createdByUserId: context.user.id,
        createdAt: now,
        items: movementItems,
      };
      state.stockMovements.push(movement);
      return {
        movement: this.movementView(state, movement),
        inventory: this.inventoryItems(state, context.tenantId, { stockLocationId: location.id }),
      };
    });
  }

  async listCustomers(filters: CustomerFilters = {}): Promise<PaginatedResult<Customer>> {
    return this.read((state) => {
      const context = this.requireContext(state, "customers.read", "CUSTOMERS");
      let customers = state.customers
        .filter((customer) => customer.tenantId === context.tenantId && customer.deletedAt === null)
        .map((customer) => this.customerView(state, customer));
      if (filters.search?.trim()) {
        const search = normalizeSearch(filters.search);
        customers = customers.filter((customer) =>
          [customer.firstName, customer.lastName, customer.businessName, customer.email, customer.phone]
            .filter((value): value is string => value !== null)
            .some((value) => normalizeSearch(value).includes(search)),
        );
      }
      if (filters.status && filters.status !== "ALL") customers = customers.filter((customer) => customer.status === filters.status);
      if (filters.kind && filters.kind !== "ALL") customers = customers.filter((customer) => customer.kind === filters.kind);
      if (filters.source && filters.source !== "ALL") customers = customers.filter((customer) => customer.source === filters.source);
      customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return paginate(customers, filters.page, filters.pageSize);
    });
  }

  async getCustomer(customerId: string): Promise<Customer> {
    return this.read((state) => {
      const context = this.requireContext(state, "customers.read", "CUSTOMERS");
      return this.customerView(state, this.findCustomer(state, context.tenantId, customerId));
    });
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "customers.write", "CUSTOMERS");
      const customer = this.buildCustomer(state, context.tenantId, input);
      state.customers.push(customer);
      return this.customerView(state, customer);
    });
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<Customer> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "customers.write", "CUSTOMERS");
      const existing = this.findCustomer(state, context.tenantId, customerId);
      const customer = this.buildCustomer(state, context.tenantId, input, existing);
      const index = state.customers.findIndex((candidate) => candidate.id === existing.id);
      state.customers[index] = customer;
      return this.customerView(state, customer);
    });
  }

  async setCustomerStatus(customerId: string, status: CustomerStatus): Promise<Customer> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "customers.write", "CUSTOMERS");
      const customer = this.findCustomer(state, context.tenantId, customerId);
      const now = new Date().toISOString();
      customer.status = status;
      customer.blockedAt = status === "BLOCKED" ? now : null;
      customer.updatedAt = now;
      return this.customerView(state, customer);
    });
  }

  async listSales(filters: SaleFilters = {}): Promise<PaginatedResult<Sale>> {
    return this.read((state) => {
      const context = this.requireContext(state, "sales.read", "SALES");
      let sales = state.sales.filter((sale) => sale.tenantId === context.tenantId);
      if (filters.search?.trim()) {
        const search = normalizeSearch(filters.search);
        sales = sales.filter(
          (sale) =>
            normalizeSearch(sale.saleNumber).includes(search) ||
            normalizeSearch(sale.customerNameSnapshot ?? "Consumidor final").includes(search) ||
            sale.items.some(
              (item) =>
                normalizeSearch(item.productNameSnapshot).includes(search) ||
                normalizeSearch(item.skuSnapshot ?? "").includes(search),
            ),
        );
      }
      if (filters.status && filters.status !== "ALL") sales = sales.filter((sale) => sale.status === filters.status);
      if (filters.channel && filters.channel !== "ALL") sales = sales.filter((sale) => sale.channel === filters.channel);
      if (filters.customerId) sales = sales.filter((sale) => sale.customerId === filters.customerId);
      if (filters.from) sales = sales.filter((sale) => (sale.soldAt ?? sale.createdAt) >= filters.from!);
      if (filters.to) sales = sales.filter((sale) => (sale.soldAt ?? sale.createdAt) <= filters.to!);
      sales.sort((a, b) => (b.soldAt ?? b.createdAt).localeCompare(a.soldAt ?? a.createdAt));
      return paginate(sales, filters.page, filters.pageSize);
    });
  }

  async getSale(saleId: string): Promise<Sale> {
    return this.read((state) => {
      const context = this.requireContext(state, "sales.read", "SALES");
      return this.findSale(state, context.tenantId, saleId);
    });
  }

  async confirmSale(input: ConfirmSaleInput): Promise<ConfirmSaleResult> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "sales.create", "SALES");
      if (input.channel === "POS" && !context.session.membership.permissions.includes("pos.use")) {
        fail("FORBIDDEN", "No tenés permiso para usar el punto de venta.");
      }
      if (input.items.length === 0) fail("VALIDATION", "La venta debe incluir al menos un artículo.");
      const seenVariants = new Set<string>();
      input.items.forEach((item) => {
        if (seenVariants.has(item.productVariantId)) {
          fail("CONFLICT", "Consolidá las cantidades de una variante en una sola línea.");
        }
        seenVariants.add(item.productVariantId);
      });
      const location = this.resolveLocation(state, context.tenantId, input.stockLocationId);
      const customer = input.customerId ? this.findCustomer(state, context.tenantId, input.customerId) : null;
      if (customer && customer.status !== "ACTIVE") fail("VALIDATION", "El cliente seleccionado no está activo.");
      const now = new Date().toISOString();
      const saleId = newId();
      const movementId = newId();

      // Validate and calculate every line before changing a balance.
      const prepared = input.items.map((item) => {
        numeric(item.quantity, "quantity", { positive: true });
        const { product, variant } = this.findVariant(state, context.tenantId, item.productVariantId);
        if (product.status === "ARCHIVED" || !variant.enabled || variant.deletedAt !== null) {
          fail("VALIDATION", `${product.name} — ${variant.name} no está disponible para vender.`);
        }
        const unitPrice = item.unitPrice ?? variant.price;
        if (unitPrice === null || !Number.isFinite(unitPrice) || unitPrice < 0) {
          fail("VALIDATION", `La variante ${variant.name} no tiene un precio válido.`);
        }
        const discountAmount = item.discountAmount ?? 0;
        numeric(discountAmount, "discountAmount");
        const gross = roundMoney(unitPrice * item.quantity);
        if (discountAmount > gross) fail("VALIDATION", "El descuento no puede superar el importe de la línea.");
        const balance = variant.trackInventory
          ? this.ensureBalance(state, context.tenantId, location.id, variant.id, now)
          : null;
        if (balance && balance.onHand - balance.reserved < item.quantity) {
          fail("INSUFFICIENT_STOCK", `No hay stock suficiente de ${product.name} — ${variant.name}.`);
        }
        return {
          product,
          variant,
          balance,
          quantity: item.quantity,
          unitPrice: roundMoney(unitPrice),
          discountAmount: roundMoney(discountAmount),
          lineTotal: roundMoney(gross - discountAmount),
        };
      });

      const saleItems = prepared.map((line) => ({
        id: newId(),
        productVariantId: line.variant.id,
        productNameSnapshot: line.product.name,
        variantNameSnapshot: line.variant.name,
        skuSnapshot: line.variant.sku,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        lineTotal: line.lineTotal,
      }));
      const subtotal = roundMoney(prepared.reduce((total, line) => total + line.unitPrice * line.quantity, 0));
      const discountTotal = roundMoney(prepared.reduce((total, line) => total + line.discountAmount, 0));
      const total = roundMoney(subtotal - discountTotal);
      const customerName = customer ? this.customerDisplayName(customer) : null;
      const customerDocument = customer?.documentNumber
        ? [customer.documentType, customer.documentNumber].filter(Boolean).join(" ")
        : null;
      const sale: Sale = {
        id: saleId,
        tenantId: context.tenantId,
        saleNumber: this.nextSaleNumber(state, context.tenantId),
        channel: input.channel,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        customerId: customer?.id ?? null,
        sourceOrderId: null,
        stockLocationId: location.id,
        customerNameSnapshot: customerName,
        customerDocumentSnapshot: customerDocument,
        items: saleItems,
        subtotal,
        discountTotal,
        total,
        currency: context.tenant.defaultCurrency,
        notes: nullableText(input.notes),
        soldAt: now,
        createdByUserId: context.user.id,
        createdByName: context.user.displayName,
        confirmedAt: now,
        cancelledAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const movement: StockMovementRecord = {
        id: movementId,
        tenantId: context.tenantId,
        movementNumber: this.nextMovementNumber(state, context.tenantId),
        stockLocationId: location.id,
        movementType: "SALE",
        status: "POSTED",
        saleId: sale.id,
        orderId: null,
        purchaseId: null,
        reversalOfId: null,
        reason: `Venta ${sale.saleNumber}`,
        occurredAt: now,
        createdByUserId: context.user.id,
        createdAt: now,
        items: prepared.map((line) => ({
          id: newId(),
          tenantId: context.tenantId,
          stockMovementId: movementId,
          productVariantId: line.variant.id,
          quantityDelta: -line.quantity,
          unitCost: line.variant.cost,
          createdAt: now,
        })),
      };

      // All checks passed: apply sale, its one movement header, and balances together.
      prepared.forEach((line) => {
        if (line.balance) {
          line.balance.onHand -= line.quantity;
          line.balance.updatedAt = now;
        }
      });
      state.sales.push(sale);
      state.stockMovements.push(movement);
      return { sale, movement: this.movementView(state, movement) };
    });
  }

  async cancelSale(saleId: string, input: CancelSaleInput = {}): Promise<CancelSaleResult> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "sales.cancel", "SALES");
      const sale = this.findSale(state, context.tenantId, saleId);
      if (sale.status === "CANCELLED") fail("ALREADY_CANCELLED", "La venta ya fue cancelada.");
      if (sale.status !== "CONFIRMED") fail("CONFLICT", "Solo se puede cancelar una venta confirmada.");
      const originalMovement = state.stockMovements.find(
        (movement) =>
          movement.tenantId === context.tenantId && movement.saleId === sale.id && movement.movementType === "SALE",
      );
      if (!originalMovement) fail("CONFLICT", "No se encontró el movimiento de stock original de la venta.");
      if (
        originalMovement.status === "REVERSED" ||
        state.stockMovements.some(
          (movement) => movement.tenantId === context.tenantId && movement.reversalOfId === originalMovement.id,
        )
      ) {
        fail("ALREADY_CANCELLED", "La venta ya posee una reversión de inventario.");
      }

      const now = new Date().toISOString();
      const reversalId = newId();
      const reversalItems = originalMovement.items.map((item) => {
        const balance = this.ensureBalance(
          state,
          context.tenantId,
          originalMovement.stockLocationId,
          item.productVariantId,
          now,
        );
        balance.onHand -= item.quantityDelta;
        balance.updatedAt = now;
        return {
          id: newId(),
          tenantId: context.tenantId,
          stockMovementId: reversalId,
          productVariantId: item.productVariantId,
          quantityDelta: -item.quantityDelta,
          unitCost: item.unitCost,
          createdAt: now,
        };
      });
      const reversal: StockMovementRecord = {
        id: reversalId,
        tenantId: context.tenantId,
        movementNumber: this.nextMovementNumber(state, context.tenantId),
        stockLocationId: originalMovement.stockLocationId,
        movementType: "SALE_REVERSAL",
        status: "POSTED",
        saleId: sale.id,
        orderId: null,
        purchaseId: null,
        reversalOfId: originalMovement.id,
        reason: nullableText(input.reason) ?? `Cancelación de ${sale.saleNumber}`,
        occurredAt: now,
        createdByUserId: context.user.id,
        createdAt: now,
        items: reversalItems,
      };
      originalMovement.status = "REVERSED";
      sale.status = "CANCELLED";
      sale.cancelledAt = now;
      sale.updatedAt = now;
      state.stockMovements.push(reversal);
      return { sale, reversalMovement: this.movementView(state, reversal) };
    });
  }

  async getStoreProfile(): Promise<StoreProfile> {
    return this.read((state) => {
      const context = this.requireContext(state, "store.read");
      return this.findProfile(state, context.tenantId);
    });
  }

  async updateStoreProfile(input: UpdateStoreProfileInput): Promise<StoreProfile> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "store.update");
      const profile = this.findProfile(state, context.tenantId);
      const brandName = input.brandName.trim();
      if (!brandName) fail("VALIDATION", "El nombre comercial es obligatorio.", { brandName: "Ingresá un nombre." });
      Object.assign(profile, {
        ...input,
        brandName,
        contactEmail: nullableText(input.contactEmail),
        phone: nullableText(input.phone),
        addressLine: nullableText(input.addressLine),
        addressNumber: nullableText(input.addressNumber),
        city: nullableText(input.city),
        province: nullableText(input.province),
        postalCode: nullableText(input.postalCode),
        countryCode: input.countryCode.trim().toUpperCase() || "AR",
      });
      return profile;
    });
  }

  async getStoreSettings(): Promise<StorefrontSettings> {
    return this.read((state) => {
      const context = this.requireContext(state, "store.read");
      return this.findSettings(state, context.tenantId);
    });
  }

  async updateStoreSettings(input: UpdateStorefrontSettingsInput): Promise<StorefrontSettings> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "store.update");
      if (!Number.isInteger(input.catalogColumnsDesktop) || input.catalogColumnsDesktop < 1 || input.catalogColumnsDesktop > 6) {
        fail("VALIDATION", "Las columnas del catálogo deben estar entre 1 y 6.", {
          catalogColumnsDesktop: "Elegí un valor entre 1 y 6.",
        });
      }
      const settings = this.findSettings(state, context.tenantId);
      Object.assign(settings, input);
      return settings;
    });
  }

  async getStoreTheme(): Promise<StoreTheme> {
    return this.read((state) => {
      const context = this.requireContext(state, "store.read");
      return this.themeView(state, this.findTheme(state, context.tenantId));
    });
  }

  async updateStoreTheme(input: UpdateStoreThemeInput): Promise<StoreTheme> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "store.theme.update");
      [input.primaryColor, input.secondaryColor, input.backgroundColor, input.textColor].forEach((color) => {
        if (!/^#[0-9a-f]{6}$/i.test(color)) fail("VALIDATION", `${color} no es un color hexadecimal válido.`);
      });
      const logo = input.logoAssetId ? this.findAsset(state, context.tenantId, input.logoAssetId) : null;
      const favicon = input.faviconAssetId ? this.findAsset(state, context.tenantId, input.faviconAssetId) : null;
      const theme = this.findTheme(state, context.tenantId);
      Object.assign(theme, {
        ...input,
        headingFont: input.headingFont.trim() || "Merriweather",
        bodyFont: input.bodyFont.trim() || "Lora",
        borderRadius: input.borderRadius.trim() || "NONE",
        announcementText: nullableText(input.announcementText),
        announcementUrl: nullableText(input.announcementUrl),
        logoUrl: logo?.url ?? null,
        faviconUrl: favicon?.url ?? null,
      });
      return this.themeView(state, theme);
    });
  }

  async getStoreContactChannels(): Promise<StoreContactChannel[]> {
    return this.read((state) => {
      const context = this.requireContext(state, "store.read");
      return state.storeContactChannels
        .filter((channel) => channel.tenantId === context.tenantId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  async updateStoreContactChannels(input: StoreContactChannelInput[]): Promise<StoreContactChannel[]> {
    return this.mutate((state) => {
      const context = this.requireContext(state, "store.update");
      const types = new Set(input.map((channel) => channel.channelType));
      if (types.size !== input.length) fail("CONFLICT", "Solo puede existir un canal de cada tipo.");
      const existing = state.storeContactChannels.filter((channel) => channel.tenantId === context.tenantId);
      const channels: StoreContactChannel[] = input.map((channel, index) => ({
        id:
          (channel.id && existing.some((candidate) => candidate.id === channel.id) ? channel.id : undefined) ?? newId(),
        tenantId: context.tenantId,
        channelType: channel.channelType,
        value: nullableText(channel.value),
        url: nullableText(channel.url),
        enabled: channel.enabled,
        sortOrder: Math.max(0, Math.floor(channel.sortOrder ?? index)),
      }));
      state.storeContactChannels = [
        ...state.storeContactChannels.filter((channel) => channel.tenantId !== context.tenantId),
        ...channels,
      ];
      return channels.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  async resetDemo(): Promise<void> {
    await this.mutate((state) => {
      const wasAuthenticated = state.sessionUserId !== null;
      const fresh = createMockSeed();
      if (wasAuthenticated) fresh.sessionUserId = fresh.users[0]?.id ?? null;
      Object.assign(state, fresh);
    });
  }

  private loadState(): MockDatabase {
    const storage = this.getStorage();
    if (storage) {
      try {
        const raw = storage.getItem(MOCK_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isMockDatabase(parsed)) return parsed;
        }
      } catch {
        // A corrupt or inaccessible browser store should never make the demo unusable.
      }
    }
    const seed = createMockSeed();
    if (storage) {
      try {
        storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seed));
      } catch {
        // Keep the in-memory repository working when storage is unavailable or full.
      }
    }
    return seed;
  }

  private getStorage(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }

  private persist(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(MOCK_STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Local previews can continue in memory if quota or privacy settings reject storage.
    }
  }

  private async pause(): Promise<void> {
    if (this.delayMs === 0) return;
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, this.delayMs));
  }

  private async read<T>(operation: (state: MockDatabase) => T): Promise<T> {
    await this.mutationQueue;
    await this.pause();
    return clone(operation(this.state));
  }

  private mutate<T>(operation: (draft: MockDatabase) => T): Promise<T> {
    const pending = this.mutationQueue.then(async () => {
      await this.pause();
      const draft = clone(this.state);
      const result = operation(draft);
      draft.version = MOCK_DATA_VERSION;
      this.state = draft;
      this.persist();
      return clone(result);
    });
    this.mutationQueue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  private contextForUser(state: MockDatabase, userId: string): TenantContext {
    const user = state.users.find((candidate) => candidate.id === userId);
    if (!user || user.status !== "ACTIVE") fail("AUTH_REQUIRED", "La sesión ya no está disponible.");
    const membership = state.accountMembers.find(
      (candidate) => candidate.userId === user.id && candidate.status === "ACTIVE",
    );
    if (!membership) fail("ACCOUNT_UNAVAILABLE", "No hay una membresía activa para esta cuenta.");
    const account = state.accounts.find((candidate) => candidate.id === membership.accountId);
    if (!account || (account.status !== "ACTIVE" && account.status !== "TRIAL")) {
      fail("ACCOUNT_UNAVAILABLE", "La cuenta no está habilitada.");
    }
    const role = state.roles.find(
      (candidate) => candidate.id === membership.roleId && candidate.accountId === account.id,
    );
    if (!role) fail("ACCOUNT_UNAVAILABLE", "La membresía no tiene un rol válido.");
    const tenant = state.tenants.find(
      (candidate) =>
        candidate.accountId === account.id && candidate.enabled && candidate.status === "ACTIVE",
    );
    if (!tenant) fail("ACCOUNT_UNAVAILABLE", "No hay un comercio activo para esta cuenta.");
    const theme = state.storeThemes.find((candidate) => candidate.tenantId === tenant.id);
    const profile = state.storeProfiles.find((candidate) => candidate.tenantId === tenant.id);
    const logoUrl = theme ? this.themeView(state, theme).logoUrl : null;
    const session: AuthSession = {
      user: { id: user.id, email: user.email, displayName: user.displayName },
      account,
      membership: {
        id: membership.id,
        role: role.code,
        status: membership.status,
        permissions: [...role.permissions],
      },
      tenant: {
        id: tenant.id,
        accountId: tenant.accountId,
        slug: tenant.slug,
        name: profile?.brandName ?? tenant.name,
        status: tenant.status,
        defaultCurrency: tenant.defaultCurrency,
        timeZone: tenant.timeZone,
        enabled: tenant.enabled,
        enabledFeatures: [...tenant.enabledFeatures],
        ...(logoUrl ? { logoUrl } : {}),
        primaryColor: theme?.primaryColor ?? "#74263A",
      },
    };
    return { session, tenant, tenantId: tenant.id, user };
  }

  private requireContext(
    state: MockDatabase,
    permission?: PermissionCode,
    feature?: TenantFeatureCode,
  ): TenantContext {
    if (!state.sessionUserId) fail("AUTH_REQUIRED", "Iniciá sesión para continuar.");
    const context = this.contextForUser(state, state.sessionUserId);
    if (permission && !context.session.membership.permissions.includes(permission)) {
      fail("FORBIDDEN", "No tenés permiso para realizar esta acción.");
    }
    if (feature && !context.tenant.enabledFeatures.includes(feature)) {
      fail("FORBIDDEN", "Esta funcionalidad no está habilitada para el comercio.");
    }
    return context;
  }

  private localDateKey(date: Date, timeZone: string): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }

  private findProduct(state: MockDatabase, tenantId: string, productId: string): Product {
    const product = state.products.find(
      (candidate) => candidate.id === productId && candidate.tenantId === tenantId && candidate.deletedAt === null,
    );
    if (!product) fail("NOT_FOUND", "No se encontró el producto.");
    return product;
  }

  private productView(state: MockDatabase, product: Product): Product {
    return {
      ...product,
      variants: product.variants.filter((variant) => variant.deletedAt === null),
      images: product.images.map((image) => {
        const asset = state.mediaAssets.find(
          (candidate) => candidate.id === image.mediaAssetId && candidate.tenantId === product.tenantId,
        );
        return {
          ...image,
          url: asset?.url ?? image.url,
          altText: asset?.altText ?? image.altText,
        };
      }),
    };
  }

  private findCategory(state: MockDatabase, tenantId: string, categoryId: string): Category {
    const category = state.categories.find(
      (candidate) => candidate.id === categoryId && candidate.tenantId === tenantId && candidate.deletedAt === null,
    );
    if (!category) fail("NOT_FOUND", "No se encontró la categoría.");
    return category;
  }

  private categoryView(state: MockDatabase, category: Category): Category {
    const productCount = state.products.filter(
      (product) =>
        product.tenantId === category.tenantId &&
        product.deletedAt === null &&
        product.categoryAssignments.some((assignment) => assignment.categoryId === category.id),
    ).length;
    return { ...category, productCount };
  }

  private findVariant(
    state: MockDatabase,
    tenantId: string,
    variantId: string,
  ): { product: Product; variant: ProductVariant } {
    for (const product of state.products) {
      if (product.tenantId !== tenantId) continue;
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (variant) return { product, variant };
    }
    fail("NOT_FOUND", "No se encontró la variante.");
  }

  private findCustomer(state: MockDatabase, tenantId: string, customerId: string): Customer {
    const customer = state.customers.find(
      (candidate) => candidate.id === customerId && candidate.tenantId === tenantId && candidate.deletedAt === null,
    );
    if (!customer) fail("NOT_FOUND", "No se encontró el cliente.");
    return customer;
  }

  private findSale(state: MockDatabase, tenantId: string, saleId: string): Sale {
    const sale = state.sales.find((candidate) => candidate.id === saleId && candidate.tenantId === tenantId);
    if (!sale) fail("NOT_FOUND", "No se encontró la venta.");
    return sale;
  }

  private findProfile(state: MockDatabase, tenantId: string): StoreProfile {
    const profile = state.storeProfiles.find((candidate) => candidate.tenantId === tenantId);
    if (!profile) fail("NOT_FOUND", "No se encontró el perfil del comercio.");
    return profile;
  }

  private findSettings(state: MockDatabase, tenantId: string): StorefrontSettings {
    const settings = state.storefrontSettings.find((candidate) => candidate.tenantId === tenantId);
    if (!settings) fail("NOT_FOUND", "No se encontró la configuración del comercio.");
    return settings;
  }

  private findTheme(state: MockDatabase, tenantId: string): StoreTheme {
    const theme = state.storeThemes.find((candidate) => candidate.tenantId === tenantId);
    if (!theme) fail("NOT_FOUND", "No se encontró el tema del comercio.");
    return theme;
  }

  private findAsset(state: MockDatabase, tenantId: string, assetId: string): MediaAsset {
    const asset = state.mediaAssets.find(
      (candidate) => candidate.id === assetId && candidate.tenantId === tenantId && candidate.status === "ACTIVE",
    );
    if (!asset) fail("NOT_FOUND", "No se encontró el recurso multimedia.");
    return asset;
  }

  private themeView(state: MockDatabase, theme: StoreTheme): StoreTheme {
    const logo = theme.logoAssetId
      ? state.mediaAssets.find(
          (asset) => asset.id === theme.logoAssetId && asset.tenantId === theme.tenantId && asset.status === "ACTIVE",
        )
      : null;
    const favicon = theme.faviconAssetId
      ? state.mediaAssets.find(
          (asset) => asset.id === theme.faviconAssetId && asset.tenantId === theme.tenantId && asset.status === "ACTIVE",
        )
      : null;
    return { ...theme, logoUrl: logo?.url ?? theme.logoUrl, faviconUrl: favicon?.url ?? theme.faviconUrl };
  }

  private movementView(state: MockDatabase, movement: StockMovementRecord): StockMovement {
    const creator = movement.createdByUserId
      ? state.users.find((user) => user.id === movement.createdByUserId)
      : null;
    const items: StockMovementItem[] = movement.items.map((item) => {
      const match = this.variantMatch(state, movement.tenantId, item.productVariantId);
      return {
        id: item.id,
        productVariantId: item.productVariantId,
        productName: match?.product.name ?? "Producto no disponible",
        variantName: match?.variant.name ?? "Variante no disponible",
        sku: match?.variant.sku ?? null,
        quantityDelta: item.quantityDelta,
        unitCost: item.unitCost,
      };
    });
    return {
      id: movement.id,
      tenantId: movement.tenantId,
      movementNumber: movement.movementNumber,
      stockLocationId: movement.stockLocationId,
      type: movement.movementType,
      status: movement.status,
      saleId: movement.saleId,
      orderId: movement.orderId,
      purchaseId: movement.purchaseId,
      reversalOfId: movement.reversalOfId,
      reason: movement.reason,
      occurredAt: movement.occurredAt,
      createdBy: creator ? { id: creator.id, displayName: creator.displayName } : null,
      items,
      createdAt: movement.createdAt,
    };
  }

  private variantMatch(
    state: MockDatabase,
    tenantId: string,
    variantId: string,
  ): { product: Product; variant: ProductVariant } | null {
    for (const product of state.products) {
      if (product.tenantId !== tenantId) continue;
      const variant = product.variants.find((candidate) => candidate.id === variantId);
      if (variant) return { product, variant };
    }
    return null;
  }

  private inventoryItems(state: MockDatabase, tenantId: string, filters: InventoryFilters): InventoryItem[] {
    const locations = state.stockLocations.filter(
      (location) =>
        location.tenantId === tenantId && location.enabled && (!filters.stockLocationId || location.id === filters.stockLocationId),
    );
    const categories = new Map(
      state.categories
        .filter((category) => category.tenantId === tenantId && category.deletedAt === null)
        .map((category) => [category.id, category.name] as const),
    );
    const items: InventoryItem[] = [];
    state.products
      .filter((product) => product.tenantId === tenantId && product.deletedAt === null)
      .forEach((product) => {
        const productCategories = product.categoryAssignments.flatMap((assignment) => {
          const name = categories.get(assignment.categoryId);
          return name ? [name] : [];
        });
        const primaryImage = [...product.images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder)[0];
        product.variants
          .filter((variant) => variant.deletedAt === null)
          .forEach((variant) => {
            locations.forEach((location) => {
              const balance = state.inventoryBalances.find(
                (candidate) =>
                  candidate.tenantId === tenantId &&
                  candidate.stockLocationId === location.id &&
                  candidate.productVariantId === variant.id,
              );
              const onHand = balance?.onHand ?? 0;
              const reserved = balance?.reserved ?? 0;
              const available = onHand - reserved;
              const threshold = balance?.lowStockThreshold ?? null;
              const status: InventoryStatus = !variant.trackInventory
                ? "NOT_TRACKED"
                : available <= 0
                  ? "OUT_OF_STOCK"
                  : threshold !== null && available <= threshold
                    ? "LOW_STOCK"
                    : "IN_STOCK";
              const image =
                product.images.find((candidate) => candidate.productVariantId === variant.id && candidate.isPrimary) ??
                product.images.find((candidate) => candidate.productVariantId === variant.id) ??
                primaryImage;
              const asset = image
                ? state.mediaAssets.find((candidate) => candidate.id === image.mediaAssetId && candidate.tenantId === tenantId)
                : null;
              items.push({
                tenantId,
                stockLocationId: location.id,
                productId: product.id,
                variantId: variant.id,
                productName: product.name,
                variantName: variant.name,
                sku: variant.sku,
                imageUrl: asset?.url ?? image?.url ?? null,
                categoryNames: productCategories,
                onHand,
                reserved,
                available,
                lowStockThreshold: threshold,
                trackInventory: variant.trackInventory,
                status,
              });
            });
          });
      });

    let result = items;
    if (filters.search?.trim()) {
      const search = normalizeSearch(filters.search);
      result = result.filter(
        (item) =>
          normalizeSearch(item.productName).includes(search) ||
          normalizeSearch(item.variantName).includes(search) ||
          normalizeSearch(item.sku ?? "").includes(search),
      );
    }
    if (filters.categoryId) {
      const matchingProductIds = new Set(
        state.products
          .filter(
            (product) =>
              product.tenantId === tenantId &&
              product.categoryAssignments.some((assignment) => assignment.categoryId === filters.categoryId),
          )
          .map((product) => product.id),
      );
      result = result.filter((item) => matchingProductIds.has(item.productId));
    }
    if (filters.status && filters.status !== "ALL") result = result.filter((item) => item.status === filters.status);
    return result.sort((a, b) => a.productName.localeCompare(b.productName, "es") || a.variantName.localeCompare(b.variantName, "es"));
  }

  private ensureBalance(
    state: MockDatabase,
    tenantId: string,
    stockLocationId: string,
    productVariantId: string,
    now: string,
  ): InventoryBalance {
    let balance = state.inventoryBalances.find(
      (candidate) =>
        candidate.tenantId === tenantId &&
        candidate.stockLocationId === stockLocationId &&
        candidate.productVariantId === productVariantId,
    );
    if (!balance) {
      balance = {
        id: newId(),
        tenantId,
        stockLocationId,
        productVariantId,
        onHand: 0,
        reserved: 0,
        lowStockThreshold: null,
        updatedAt: now,
      };
      state.inventoryBalances.push(balance);
    }
    return balance;
  }

  private resolveLocation(state: MockDatabase, tenantId: string, requestedId?: string): StockLocation {
    const location = requestedId
      ? state.stockLocations.find(
          (candidate) => candidate.id === requestedId && candidate.tenantId === tenantId && candidate.enabled,
        )
      : state.stockLocations.find((candidate) => candidate.tenantId === tenantId && candidate.enabled && candidate.isDefault);
    if (!location) fail("NOT_FOUND", "No se encontró una ubicación de stock habilitada.");
    return location;
  }

  private sequence(state: MockDatabase, tenantId: string) {
    let sequence = state.documentSequences.find((candidate) => candidate.tenantId === tenantId);
    if (!sequence) {
      sequence = { tenantId, nextSale: 1, nextMovement: 1 };
      state.documentSequences.push(sequence);
    }
    return sequence;
  }

  private nextSaleNumber(state: MockDatabase, tenantId: string): string {
    const sequence = this.sequence(state, tenantId);
    const value = sequence.nextSale;
    sequence.nextSale += 1;
    return `V-${String(value).padStart(6, "0")}`;
  }

  private nextMovementNumber(state: MockDatabase, tenantId: string): string {
    const sequence = this.sequence(state, tenantId);
    const value = sequence.nextMovement;
    sequence.nextMovement += 1;
    return `M-${String(value).padStart(8, "0")}`;
  }

  private customerDisplayName(customer: Customer): string {
    return (
      nullableText(customer.businessName) ??
      nullableText([customer.firstName, customer.lastName].filter(Boolean).join(" ")) ??
      "Cliente sin nombre"
    );
  }

  private customerView(state: MockDatabase, customer: Customer): Customer {
    const completedSales = state.sales.filter(
      (sale) => sale.tenantId === customer.tenantId && sale.customerId === customer.id && sale.status === "CONFIRMED",
    );
    return {
      ...customer,
      salesCount: completedSales.length,
      totalSpent: roundMoney(completedSales.reduce((total, sale) => total + sale.total, 0)),
    };
  }

  private buildCustomer(
    state: MockDatabase,
    tenantId: string,
    input: CreateCustomerInput | UpdateCustomerInput,
    existing?: Customer,
  ): Customer {
    const firstName = input.firstName === undefined && existing ? existing.firstName : nullableText(input.firstName);
    const lastName = input.lastName === undefined && existing ? existing.lastName : nullableText(input.lastName);
    const businessName =
      input.businessName === undefined && existing ? existing.businessName : nullableText(input.businessName);
    if (!firstName && !lastName && !businessName) {
      fail("VALIDATION", "Ingresá un nombre, apellido o razón social.", { firstName: "Ingresá al menos un nombre." });
    }
    const kind = input.kind ?? existing?.kind ?? "INDIVIDUAL";
    if (kind === "BUSINESS" && !businessName) {
      fail("VALIDATION", "La razón social es obligatoria para una empresa.", { businessName: "Ingresá la razón social." });
    }
    const documentType =
      input.documentType === undefined && existing ? existing.documentType : nullableText(input.documentType);
    const documentNumber =
      input.documentNumber === undefined && existing ? existing.documentNumber : nullableText(input.documentNumber);
    if ((documentType && !documentNumber) || (!documentType && documentNumber)) {
      fail("VALIDATION", "Completá el tipo y número de documento juntos.");
    }
    if (
      documentType &&
      documentNumber &&
      state.customers.some(
        (candidate) =>
          candidate.tenantId === tenantId &&
          candidate.id !== existing?.id &&
          normalizeSearch(candidate.documentType ?? "") === normalizeSearch(documentType) &&
          normalizeSearch(candidate.documentNumber ?? "") === normalizeSearch(documentNumber),
      )
    ) {
      fail("CONFLICT", "Ya existe un cliente con ese documento.", { documentNumber: "El documento ya está registrado." });
    }
    const userId = input.userId === undefined && existing ? existing.userId : (input.userId ?? null);
    if (
      userId &&
      state.customers.some(
        (candidate) => candidate.tenantId === tenantId && candidate.id !== existing?.id && candidate.userId === userId,
      )
    ) {
      fail("CONFLICT", "Ese usuario ya está asociado a otro cliente del comercio.");
    }
    const addressesInput = input.addresses ?? existing?.addresses ?? [];
    if (addressesInput.filter((address) => address.isDefault).length > 1) {
      fail("VALIDATION", "Solo puede haber una dirección predeterminada.");
    }
    const existingAddressIds = new Set(existing?.addresses.map((address) => address.id) ?? []);
    const addresses: CustomerAddress[] = addressesInput.map((address) => {
      const street = address.street.trim();
      const city = address.city.trim();
      const province = address.province.trim();
      if (!street || !city || !province) {
        fail("VALIDATION", "Calle, ciudad y provincia son obligatorias en cada dirección.");
      }
      return {
        id: address.id && existingAddressIds.has(address.id) ? address.id : newId(),
        addressType: address.addressType,
        label: nullableText(address.label),
        street,
        number: nullableText(address.number),
        floor: nullableText(address.floor),
        apartment: nullableText(address.apartment),
        city,
        province,
        postalCode: nullableText(address.postalCode),
        countryCode: address.countryCode.trim().toUpperCase() || "AR",
        isDefault: address.isDefault,
      };
    });
    const now = new Date().toISOString();
    return {
      id: existing?.id ?? newId(),
      tenantId,
      userId,
      customerGroupId:
        input.customerGroupId === undefined && existing ? existing.customerGroupId : (input.customerGroupId ?? null),
      source: input.source ?? existing?.source ?? "ADMIN",
      kind,
      firstName,
      lastName,
      businessName,
      email: input.email === undefined && existing ? existing.email : nullableText(input.email),
      phone: input.phone === undefined && existing ? existing.phone : nullableText(input.phone),
      documentType,
      documentNumber,
      taxCondition:
        input.taxCondition === undefined && existing ? existing.taxCondition : nullableText(input.taxCondition),
      notes: input.notes === undefined && existing ? existing.notes : nullableText(input.notes),
      addresses,
      status: existing?.status ?? "ACTIVE",
      blockedAt: existing?.blockedAt ?? null,
      salesCount: existing?.salesCount ?? 0,
      totalSpent: existing?.totalSpent ?? 0,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: existing?.deletedAt ?? null,
    };
  }

  private assertUniqueCategorySlug(
    state: MockDatabase,
    tenantId: string,
    slug: string,
    excludeId?: string,
  ): void {
    if (
      state.categories.some(
        (category) =>
          category.tenantId === tenantId && category.id !== excludeId && normalizeSearch(category.slug) === normalizeSearch(slug),
      )
    ) {
      fail("CONFLICT", "Ya existe una categoría con ese slug.", { slug: "El slug ya está en uso." });
    }
  }

  private nextCategoryOrder(state: MockDatabase, tenantId: string, parentId: string | null): number {
    const siblings = state.categories.filter(
      (category) => category.tenantId === tenantId && category.deletedAt === null && category.parentId === parentId,
    );
    return siblings.length === 0 ? 0 : Math.max(...siblings.map((category) => category.sortOrder)) + 1;
  }

  private assertNoCategoryCycle(
    state: MockDatabase,
    categoryId: string,
    proposedParentId: string | null,
    overrides: ReadonlyMap<string, string | null> = new Map(),
  ): void {
    if (!proposedParentId) return;
    if (proposedParentId === categoryId) fail("VALIDATION", "Una categoría no puede ser su propio padre.");
    const visited = new Set<string>([categoryId]);
    let currentId: string | null = proposedParentId;
    while (currentId) {
      if (visited.has(currentId)) fail("VALIDATION", "La categoría no puede depender de uno de sus descendientes.");
      visited.add(currentId);
      const category = state.categories.find((candidate) => candidate.id === currentId);
      if (!category) break;
      currentId = overrides.has(category.id) ? (overrides.get(category.id) ?? null) : category.parentId;
    }
  }

  private buildProduct(
    state: MockDatabase,
    context: TenantContext,
    input: ProductCoreInput,
    existing?: Product,
  ): ProductBuildResult {
    const now = new Date().toISOString();
    const name = input.name.trim();
    if (!name) fail("VALIDATION", "El nombre del producto es obligatorio.", { name: "Ingresá un nombre." });
    const rawSlug = nullableText(input.slug) ?? slugify(name);
    const slug = slugify(rawSlug);
    if (!slug) fail("VALIDATION", "El slug del producto no es válido.", { slug: "Ingresá un slug válido." });
    if (
      state.products.some(
        (product) =>
          product.tenantId === context.tenantId &&
          product.id !== existing?.id &&
          normalizeSearch(product.slug) === normalizeSearch(slug),
      )
    ) {
      fail("CONFLICT", "Ya existe un producto con ese slug.", { slug: "El slug ya está en uso." });
    }

    if (input.categoryAssignments.length === 0) {
      fail("VALIDATION", "Seleccioná al menos una categoría.", { categoryAssignments: "Elegí una categoría principal." });
    }
    const categoryIds = new Set(input.categoryAssignments.map((assignment) => assignment.categoryId));
    if (categoryIds.size !== input.categoryAssignments.length) fail("CONFLICT", "Una categoría no puede asignarse dos veces.");
    input.categoryAssignments.forEach((assignment) => this.findCategory(state, context.tenantId, assignment.categoryId));
    if (input.categoryAssignments.filter((assignment) => assignment.isPrimary).length !== 1) {
      fail("VALIDATION", "Debe existir exactamente una categoría principal.");
    }
    const categoryAssignments = input.categoryAssignments.map((assignment) => ({
      ...assignment,
      sortOrder: Math.max(0, Math.floor(assignment.sortOrder)),
    }));

    const existingOptions = existing?.options ?? [];
    const existingOptionIds = new Set(existingOptions.map((option) => option.id));
    const existingValues = existingOptions.flatMap((option) => option.values);
    const existingValueIds = new Set(existingValues.map((value) => value.id));
    const optionInputs = input.options ?? existingOptions.map((option) => ({
      id: option.id,
      name: option.name,
      sortOrder: option.sortOrder,
      values: option.values.map((value) => ({ id: value.id, value: value.value, sortOrder: value.sortOrder })),
    }));
    const optionNames = new Set<string>();
    const valueDraftIdMap = new Map<string, string>();
    const options: ProductOption[] = optionInputs.map((optionInput, optionIndex) => {
      const optionName = optionInput.name.trim();
      if (!optionName) fail("VALIDATION", "Cada opción necesita un nombre.");
      const normalizedName = normalizeSearch(optionName);
      if (optionNames.has(normalizedName)) fail("CONFLICT", `La opción ${optionName} está repetida.`);
      optionNames.add(normalizedName);
      const optionId = optionInput.id && existingOptionIds.has(optionInput.id) ? optionInput.id : newId();
      const valuesSeen = new Set<string>();
      const values = optionInput.values.map((valueInput, valueIndex) => {
        const value = valueInput.value.trim();
        if (!value) fail("VALIDATION", `La opción ${optionName} contiene un valor vacío.`);
        const normalizedValue = normalizeSearch(value);
        if (valuesSeen.has(normalizedValue)) fail("CONFLICT", `${value} está repetido dentro de ${optionName}.`);
        valuesSeen.add(normalizedValue);
        const valueId = valueInput.id && existingValueIds.has(valueInput.id) ? valueInput.id : newId();
        if (valueInput.id) valueDraftIdMap.set(valueInput.id, valueId);
        valueDraftIdMap.set(valueId, valueId);
        return {
          id: valueId,
          tenantId: context.tenantId,
          productOptionId: optionId,
          value,
          sortOrder: Math.max(0, Math.floor(valueInput.sortOrder ?? valueIndex)),
        };
      });
      if (values.length === 0) fail("VALIDATION", `La opción ${optionName} necesita al menos un valor.`);
      return {
        id: optionId,
        tenantId: context.tenantId,
        productId: existing?.id ?? "",
        name: optionName,
        sortOrder: Math.max(0, Math.floor(optionInput.sortOrder ?? optionIndex)),
        values,
      };
    });

    if (input.variants.length === 0) fail("VALIDATION", "Todo producto debe tener al menos una variante.");
    const existingVariantIds = new Set(existing?.variants.map((variant) => variant.id) ?? []);
    const variantDraftIdMap = new Map<string, string>();
    const variants: ProductVariant[] = input.variants.map((variantInput, variantIndex) => {
      const variantId = variantInput.id && existingVariantIds.has(variantInput.id) ? variantInput.id : newId();
      if (variantInput.id) variantDraftIdMap.set(variantInput.id, variantId);
      variantDraftIdMap.set(variantId, variantId);
      variantDraftIdMap.set(`@index:${variantIndex}`, variantId);
      const previous = existing?.variants.find((variant) => variant.id === variantId);
      const dimensions = { ...(variantInput.dimensions ?? {}) };
      Object.entries(dimensions).forEach(([field, value]) => {
        if (value !== undefined) numeric(value, field);
      });
      const price = variantInput.price ?? null;
      const compareAtPrice = variantInput.compareAtPrice ?? null;
      const cost = variantInput.cost ?? null;
      if (price !== null) numeric(price, "price");
      if (compareAtPrice !== null) numeric(compareAtPrice, "compareAtPrice");
      if (cost !== null) numeric(cost, "cost");
      if (price !== null && compareAtPrice !== null && compareAtPrice < price) {
        fail("VALIDATION", "El precio de comparación debe ser mayor o igual que el precio actual.");
      }
      if (input.sellingMode === "DIRECT" && (price === null || !Number.isFinite(price))) {
        fail("VALIDATION", "Cada variante vendible necesita un precio.");
      }
      const selectedOptionValueIds = (variantInput.selectedOptionValueIds ?? []).map(
        (draftId) => valueDraftIdMap.get(draftId) ?? draftId,
      );
      if (new Set(selectedOptionValueIds).size !== selectedOptionValueIds.length) {
        fail("CONFLICT", "Una variante no puede repetir un valor de opción.");
      }
      return {
        id: variantId,
        tenantId: context.tenantId,
        productId: existing?.id ?? "",
        name: variantInput.name.trim() || (options.length === 0 ? "Default" : `Variante ${variantIndex + 1}`),
        sku: nullableText(variantInput.sku),
        barcode: nullableText(variantInput.barcode),
        price,
        compareAtPrice,
        cost,
        selectedOptionValueIds,
        dimensions,
        trackInventory: variantInput.trackInventory ?? true,
        allowBackorder: variantInput.allowBackorder ?? false,
        isDefault: options.length === 0 ? true : (variantInput.isDefault ?? false),
        enabled: variantInput.enabled ?? true,
        sortOrder: Math.max(0, Math.floor(variantInput.sortOrder ?? variantIndex)),
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
        deletedAt: null,
      };
    });

    if (options.length === 0 && variants.length !== 1) {
      fail("VALIDATION", "Un producto simple debe tener exactamente una variante predeterminada.");
    }
    if (options.length > 0 && variants.filter((variant) => variant.isDefault).length > 1) {
      fail("VALIDATION", "Solo una variante puede ser predeterminada.");
    }
    const valueToOption = new Map(options.flatMap((option) => option.values.map((value) => [value.id, option.id] as const)));
    const combinations = new Set<string>();
    variants.forEach((variant) => {
      if (options.length === 0 && variant.selectedOptionValueIds.length !== 0) {
        fail("VALIDATION", "Una variante simple no puede tener valores de opción.");
      }
      if (options.length > 0) {
        if (variant.selectedOptionValueIds.length !== options.length) {
          fail("VALIDATION", `${variant.name} debe seleccionar un valor para cada opción.`);
        }
        const selectedOptions = variant.selectedOptionValueIds.map((valueId) => valueToOption.get(valueId));
        if (selectedOptions.some((optionId) => optionId === undefined) || new Set(selectedOptions).size !== options.length) {
          fail("VALIDATION", `${variant.name} contiene una combinación de opciones inválida.`);
        }
        const combination = [...variant.selectedOptionValueIds].sort().join("|");
        if (combinations.has(combination)) fail("CONFLICT", "No se permiten combinaciones de variantes duplicadas.");
        combinations.add(combination);
      }
    });
    this.assertUniqueVariantIdentifiers(state, context.tenantId, variants, existing?.id);

    const productId = existing?.id ?? newId();
    options.forEach((option) => {
      option.productId = productId;
    });
    variants.forEach((variant) => {
      variant.productId = productId;
    });
    const retainedDeletedVariants = (existing?.variants ?? [])
      .filter((variant) => !variants.some((candidate) => candidate.id === variant.id))
      .map((variant) => ({ ...variant, enabled: false, deletedAt: variant.deletedAt ?? now, updatedAt: now }));
    const images = this.buildProductImages(state, context.tenantId, productId, input.images, existing, variantDraftIdMap, now);
    const status = input.status ?? existing?.status ?? "DRAFT";
    const product: Product = {
      id: productId,
      tenantId: context.tenantId,
      name,
      slug,
      description: nullableText(input.description),
      status,
      sellingMode: input.sellingMode,
      seoTitle: nullableText(input.seoTitle),
      seoDescription: nullableText(input.seoDescription),
      categoryAssignments,
      options,
      images,
      variants: [...variants, ...retainedDeletedVariants],
      publishedAt: status === "PUBLISHED" ? (existing?.publishedAt ?? now) : null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      deletedAt: null,
    };
    if (status === "PUBLISHED") this.validateProductForPublication(product);
    return { product, variantDraftIdMap };
  }

  private assertUniqueVariantIdentifiers(
    state: MockDatabase,
    tenantId: string,
    variants: ProductVariant[],
    productIdToReplace?: string,
  ): void {
    const incomingIds = new Set(variants.map((variant) => variant.id));
    const tenantVariants = state.products.flatMap((product) => {
      if (product.tenantId !== tenantId) return [];
      if (product.id !== productIdToReplace) return product.variants;
      return product.variants.filter((variant) => !incomingIds.has(variant.id));
    });
    const seenSkus = new Set<string>();
    const seenBarcodes = new Set<string>();
    variants.forEach((variant) => {
      if (variant.sku) {
        const sku = normalizeSearch(variant.sku);
        if (seenSkus.has(sku) || tenantVariants.some((candidate) => normalizeSearch(candidate.sku ?? "") === sku)) {
          fail("CONFLICT", `El SKU ${variant.sku} ya está en uso.`, { sku: "El SKU debe ser único por comercio." });
        }
        seenSkus.add(sku);
      }
      if (variant.barcode) {
        const barcode = normalizeSearch(variant.barcode);
        if (
          seenBarcodes.has(barcode) ||
          tenantVariants.some((candidate) => normalizeSearch(candidate.barcode ?? "") === barcode)
        ) {
          fail("CONFLICT", `El código de barras ${variant.barcode} ya está en uso.`);
        }
        seenBarcodes.add(barcode);
      }
    });
  }

  private buildProductImages(
    state: MockDatabase,
    tenantId: string,
    productId: string,
    suppliedImages: ProductImageInput[] | undefined,
    existing: Product | undefined,
    variantDraftIdMap: ReadonlyMap<string, string>,
    now: string,
  ): ProductImage[] {
    const imageInputs: ProductImageInput[] =
      suppliedImages ??
      existing?.images.map((image): ProductImageInput => ({
        id: image.id,
        productVariantId: image.productVariantId,
        mediaAssetId: image.mediaAssetId,
        url: image.url,
        altText: image.altText,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary,
      })) ??
      [];
    if (imageInputs.length > MAX_PRODUCT_IMAGES) {
      fail("VALIDATION", `Podés cargar hasta ${MAX_PRODUCT_IMAGES} imágenes por producto.`);
    }
    if (imageInputs.filter((image) => image.isPrimary).length > 1) {
      fail("VALIDATION", "Solo una imagen puede ser principal.");
    }
    const existingImageIds = new Set(existing?.images.map((image) => image.id) ?? []);
    return imageInputs.map((imageInput, index) => {
      let asset: MediaAsset;
      if (imageInput.mediaAssetId) {
        asset = this.findAsset(state, tenantId, imageInput.mediaAssetId);
        if (imageInput.altText !== undefined) asset.altText = nullableText(imageInput.altText);
      } else {
        const inferredMime = this.inferImageMimeType(imageInput);
        if (!ALLOWED_IMAGE_MIME_TYPES.has(inferredMime)) {
          fail("VALIDATION", "Las imágenes deben ser JPG, JPEG, PNG o WebP.");
        }
        const sizeBytes = imageInput.sizeBytes ?? 0;
        if (!Number.isFinite(sizeBytes) || sizeBytes < 0 || sizeBytes > MAX_IMAGE_SIZE_BYTES) {
          fail("VALIDATION", "La imagen supera el tamaño máximo permitido de 10 MB.");
        }
        const assetId = newId();
        const originalName = imageInput.originalName?.trim() || imageInput.url.split("/").at(-1) || "imagen.webp";
        asset = {
          id: assetId,
          tenantId,
          storageKey: `mock/${tenantId}/${assetId}/${originalName}`,
          originalName,
          mimeType: inferredMime,
          sizeBytes,
          width: imageInput.width ?? null,
          height: imageInput.height ?? null,
          altText: nullableText(imageInput.altText),
          checksumSha256: null,
          status: "ACTIVE",
          url: imageInput.url,
          createdAt: now,
          deletedAt: null,
        };
        state.mediaAssets.push(asset);
      }
      const rawVariantId = imageInput.productVariantId ?? null;
      const productVariantId = rawVariantId ? (variantDraftIdMap.get(rawVariantId) ?? rawVariantId) : null;
      if (productVariantId && ![...variantDraftIdMap.values()].includes(productVariantId)) {
        fail("VALIDATION", "La imagen hace referencia a una variante inválida.");
      }
      return {
        id: imageInput.id && existingImageIds.has(imageInput.id) ? imageInput.id : newId(),
        tenantId,
        productId,
        productVariantId,
        mediaAssetId: asset.id,
        url: asset.url,
        altText: asset.altText,
        sortOrder: Math.max(0, Math.floor(imageInput.sortOrder ?? index)),
        isPrimary: imageInputs.some((image) => image.isPrimary) ? (imageInput.isPrimary ?? false) : index === 0,
      };
    });
  }

  private inferImageMimeType(input: ProductImageInput): string {
    const explicit = input.mimeType?.toLocaleLowerCase();
    if (explicit === "image/jpg") return "image/jpeg";
    if (explicit) return explicit;
    const source = `${input.originalName ?? ""} ${input.url.split(/[?#]/)[0] ?? ""}`.toLocaleLowerCase();
    if (/\.jpe?g(?:\s|$)/.test(source) || input.url.startsWith("data:image/jpeg")) return "image/jpeg";
    if (/\.png(?:\s|$)/.test(source) || input.url.startsWith("data:image/png")) return "image/png";
    if (/\.webp(?:\s|$)/.test(source) || input.url.startsWith("data:image/webp")) return "image/webp";
    return "application/octet-stream";
  }

  private validateProductForPublication(product: Product): void {
    const variants = product.variants.filter((variant) => variant.deletedAt === null);
    if (variants.length === 0) fail("VALIDATION", "El producto necesita al menos una variante para publicarse.");
    if (product.categoryAssignments.filter((assignment) => assignment.isPrimary).length !== 1) {
      fail("VALIDATION", "El producto necesita una categoría principal para publicarse.");
    }
    if (
      product.sellingMode === "DIRECT" &&
      variants.some((variant) => variant.enabled && (variant.price === null || variant.price < 0))
    ) {
      fail("VALIDATION", "Todas las variantes habilitadas necesitan un precio válido.");
    }
  }

  private availableSlug(products: Product[], tenantId: string, requested: string): string {
    const base = slugify(requested) || "producto";
    let candidate = base;
    let suffix = 2;
    while (
      products.some(
        (product) => product.tenantId === tenantId && normalizeSearch(product.slug) === normalizeSearch(candidate),
      )
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  private applyInitialInventory(
    state: MockDatabase,
    context: TenantContext,
    built: ProductBuildResult,
    input: CreateProductInput,
  ): StockMovementRecord | null {
    const entries = input.initialInventory ?? [];
    if (entries.length === 0) return null;
    const now = new Date().toISOString();
    const settings = this.findSettings(state, context.tenantId);
    const movementId = newId();
    const usedKeys = new Set<string>();
    const movementItems: StockMovementRecord["items"] = [];
    entries.forEach((entry) => {
      numeric(entry.onHand, "onHand");
      if (entry.lowStockThreshold !== undefined && entry.lowStockThreshold !== null) {
        numeric(entry.lowStockThreshold, "lowStockThreshold");
      }
      const mappedId = entry.variantId
        ? built.variantDraftIdMap.get(entry.variantId)
        : entry.variantIndex !== undefined
          ? built.variantDraftIdMap.get(`@index:${entry.variantIndex}`)
          : built.product.variants.length === 1
            ? built.product.variants[0]?.id
            : undefined;
      if (!mappedId) fail("VALIDATION", "No se pudo asociar el stock inicial con una variante.");
      const variant = built.product.variants.find((candidate) => candidate.id === mappedId && candidate.deletedAt === null);
      if (!variant) fail("VALIDATION", "El stock inicial referencia una variante inválida.");
      if (!variant.trackInventory && entry.onHand !== 0) fail("VALIDATION", `${variant.name} no controla inventario.`);
      const location = this.resolveLocation(state, context.tenantId, entry.stockLocationId);
      const key = `${location.id}:${variant.id}`;
      if (usedKeys.has(key)) fail("CONFLICT", "El stock inicial de una variante y ubicación está repetido.");
      usedKeys.add(key);
      const balance = this.ensureBalance(state, context.tenantId, location.id, variant.id, now);
      if (balance.onHand !== 0 || balance.reserved !== 0) fail("CONFLICT", "La variante ya posee un saldo de inventario.");
      if (!settings.allowNegativeStock && entry.onHand < 0) fail("INSUFFICIENT_STOCK", "El stock inicial no puede ser negativo.");
      balance.onHand = entry.onHand;
      balance.lowStockThreshold = entry.lowStockThreshold ?? null;
      balance.updatedAt = now;
      if (entry.onHand !== 0) {
        movementItems.push({
          id: newId(),
          tenantId: context.tenantId,
          stockMovementId: movementId,
          productVariantId: variant.id,
          quantityDelta: entry.onHand,
          unitCost: variant.cost,
          createdAt: now,
        });
      }
    });
    if (movementItems.length === 0) return null;
    const locationIds = new Set(
      entries.map((entry) => this.resolveLocation(state, context.tenantId, entry.stockLocationId).id),
    );
    if (locationIds.size !== 1) {
      fail("VALIDATION", "Una carga inicial debe generar un movimiento por ubicación.");
    }
    const movement: StockMovementRecord = {
      id: movementId,
      tenantId: context.tenantId,
      movementNumber: this.nextMovementNumber(state, context.tenantId),
      stockLocationId: [...locationIds][0]!,
      movementType: "INITIAL",
      status: "POSTED",
      saleId: null,
      orderId: null,
      purchaseId: null,
      reversalOfId: null,
      reason: `Stock inicial de ${built.product.name}`,
      occurredAt: now,
      createdByUserId: context.user.id,
      createdAt: now,
      items: movementItems,
    };
    state.stockMovements.push(movement);
    return movement;
  }

  private priceAdjustment(
    state: MockDatabase,
    tenantId: string,
    input: BulkPriceAdjustmentInput,
    apply: boolean,
  ): BulkPriceAdjustmentResult {
    if (!Number.isFinite(input.percentage) || input.percentage < -100) {
      fail("VALIDATION", "El porcentaje debe ser un número mayor o igual a -100.", {
        percentage: "Ingresá un porcentaje válido.",
      });
    }
    const adjustPrice = input.adjustPrice ?? true;
    const adjustCompareAtPrice = input.adjustCompareAtPrice ?? false;
    if (!adjustPrice && !adjustCompareAtPrice) fail("VALIDATION", "Seleccioná al menos un precio para actualizar.");
    const selectedIds = input.filters?.productIds ? new Set(input.filters.productIds) : null;
    const multiplier = 1 + input.percentage / 100;
    const now = new Date().toISOString();
    const affectedProductIds = new Set<string>();
    const preview: PriceAdjustmentPreviewItem[] = [];

    state.products
      .filter(
        (product) =>
          product.tenantId === tenantId &&
          product.deletedAt === null &&
          product.status !== "ARCHIVED" &&
          (!selectedIds || selectedIds.has(product.id)) &&
          (!input.filters?.categoryId ||
            product.categoryAssignments.some((assignment) => assignment.categoryId === input.filters?.categoryId)),
      )
      .forEach((product) => {
        product.variants
          .filter((variant) => variant.deletedAt === null && variant.enabled)
          .forEach((variant) => {
            const nextPrice = adjustPrice && variant.price !== null ? roundMoney(variant.price * multiplier) : variant.price;
            const nextCompare =
              adjustCompareAtPrice && variant.compareAtPrice !== null
                ? roundMoney(variant.compareAtPrice * multiplier)
                : variant.compareAtPrice;
            if ((nextPrice !== null && nextPrice < 0) || (nextCompare !== null && nextCompare < 0)) {
              fail("VALIDATION", "La operación produciría un precio negativo.");
            }
            if (nextPrice !== null && nextCompare !== null && nextCompare < nextPrice) {
              fail(
                "VALIDATION",
                `El ajuste dejaría el precio de comparación de ${product.name} por debajo del precio actual.`,
              );
            }
            if (nextPrice === variant.price && nextCompare === variant.compareAtPrice) return;
            preview.push({
              productId: product.id,
              productName: product.name,
              variantId: variant.id,
              variantName: variant.name,
              previousPrice: variant.price,
              nextPrice,
              previousCompareAtPrice: variant.compareAtPrice,
              nextCompareAtPrice: nextCompare,
            });
            affectedProductIds.add(product.id);
            if (apply) {
              variant.price = nextPrice;
              variant.compareAtPrice = nextCompare;
              variant.updatedAt = now;
              product.updatedAt = now;
            }
          });
      });
    return {
      affectedProducts: affectedProductIds.size,
      affectedVariants: preview.length,
      preview: preview.slice(0, 10),
    };
  }
}
