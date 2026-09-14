import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import { services } from "@/services";
import type {
  BulkPriceAdjustmentInput,
  AccountFilters,
  CategoryOrderInput,
  CreateCategoryInput,
  CreateAccountInput,
  CreateCustomerInput,
  CreateProductInput,
  CustomerFilters,
  InventoryAdjustmentInput,
  InventoryFilters,
  LoginInput,
  ProductFilters,
  SaleFilters,
  StockMovementFilters,
  StoreContactChannelInput,
  UpdateCategoryInput,
  UpdateCustomerInput,
  UpdateProductInput,
  UpdateStoreProfileInput,
  UpdateStoreThemeInput,
  UpdateStorefrontSettingsInput,
} from "@/services/contracts";
import type {
  CustomerStatus,
  PermissionCode,
  ProductStatus,
  TenantFeatureCode,
} from "@/domain/types";
import { usePosStore } from "@/store/pos-store";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}

export function useSessionQuery() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => services.auth.me(),
    staleTime: 30_000,
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => services.auth.login(input),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.session, session);
      usePosStore.getState().initialize(session.tenant.id);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => services.auth.logout(),
    onSuccess: () => {
      usePosStore.getState().clear();
      queryClient.clear();
      queryClient.setQueryData(queryKeys.session, null);
    },
  });
}

export function useAccountsQuery(filters: AccountFilters = {}) {
  return useQuery({
    queryKey: queryKeys.accounts(filters),
    queryFn: () => services.accounts.list(filters),
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAccountInput) => services.accounts.create(input),
    onSuccess: async (account) => {
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast.success(`Cuenta ${account.name} creada correctamente.`);
    },
  });
}

export function usePermission(permission: PermissionCode): boolean {
  const { data: session } = useSessionQuery();
  return session?.membership.permissions.includes(permission) ?? false;
}

export function useTenantFeature(feature: TenantFeatureCode): boolean {
  const { data: session } = useSessionQuery();
  return session?.tenant.enabledFeatures.includes(feature) ?? false;
}

function useTenant() {
  const session = useSessionQuery();
  return {
    ...session,
    tenantId: session.data?.tenant.id ?? "",
    enabled: Boolean(session.data?.tenant.id),
  };
}

async function invalidateProductEffects(queryClient: QueryClient, tenantId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["products", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["inventory", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] }),
  ]);
}

async function invalidateSaleEffects(queryClient: QueryClient, tenantId: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["sales", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["inventory", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["stock-movements", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["products", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["customers", tenantId] }),
    queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] }),
  ]);
}

export function useDashboardQuery() {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.dashboard(tenant.tenantId),
    queryFn: () => services.dashboard.get(),
    enabled: tenant.enabled,
  });
}

export function useProductsQuery(filters: ProductFilters = {}) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.products(tenant.tenantId, filters),
    queryFn: () => services.products.list(filters),
    enabled: tenant.enabled,
  });
}

export function useProductQuery(productId: string | undefined) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.product(tenant.tenantId, productId ?? ""),
    queryFn: () => services.products.get(productId ?? ""),
    enabled: tenant.enabled && Boolean(productId),
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: (input: CreateProductInput) => services.products.create(input),
    onSuccess: async () => {
      await invalidateProductEffects(queryClient, tenantId);
      await queryClient.invalidateQueries({ queryKey: ["stock-movements", tenantId] });
      toast.success("Producto creado");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useUpdateProductMutation(productId: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => services.products.update(productId, input),
    onSuccess: async (product) => {
      queryClient.setQueryData(queryKeys.product(tenantId, productId), product);
      await invalidateProductEffects(queryClient, tenantId);
      toast.success("Cambios guardados");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useProductActionMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const complete = async (message: string) => {
    await invalidateProductEffects(queryClient, tenantId);
    toast.success(message);
  };
  return {
    duplicate: useMutation({
      mutationFn: (productId: string) => services.products.duplicate(productId),
      onSuccess: () => complete("Producto duplicado"),
      onError: (error) => toast.error(errorMessage(error)),
    }),
    setStatus: useMutation({
      mutationFn: ({ productId, status }: { productId: string; status: ProductStatus }) =>
        services.products.setStatus(productId, status),
      onSuccess: () => complete("Estado actualizado"),
      onError: (error) => toast.error(errorMessage(error)),
    }),
    archive: useMutation({
      mutationFn: (productId: string) => services.products.delete(productId),
      onSuccess: () => complete("Producto archivado"),
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function usePriceAdjustmentMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return {
    preview: useMutation({
      mutationFn: (input: BulkPriceAdjustmentInput) =>
        services.products.previewPriceAdjustment(input),
      onError: (error) => toast.error(errorMessage(error)),
    }),
    apply: useMutation({
      mutationFn: (input: BulkPriceAdjustmentInput) =>
        services.products.bulkPriceAdjustment(input),
      onSuccess: async () => {
        await invalidateProductEffects(queryClient, tenantId);
        toast.success("Precios actualizados");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function useCategoriesQuery() {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.categories(tenant.tenantId),
    queryFn: () => services.categories.list({ includeHidden: true }),
    enabled: tenant.enabled,
  });
}

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.categories(tenantId) }),
      queryClient.invalidateQueries({ queryKey: ["products", tenantId] }),
    ]);
  return {
    create: useMutation({
      mutationFn: (input: CreateCategoryInput) => services.categories.create(input),
      onSuccess: async () => {
        await invalidate();
        toast.success("Categoría creada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
        services.categories.update(id, input),
      onSuccess: async () => {
        await invalidate();
        toast.success("Categoría actualizada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    remove: useMutation({
      mutationFn: (id: string) => services.categories.delete(id),
      onSuccess: async () => {
        await invalidate();
        toast.success("Categoría eliminada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    reorder: useMutation({
      mutationFn: (input: CategoryOrderInput[]) => services.categories.reorder(input),
      onSuccess: async () => {
        await invalidate();
        toast.success("Orden de categorías actualizado");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function useInventoryQuery(filters: InventoryFilters = {}) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.inventory(tenant.tenantId, filters),
    queryFn: () => services.inventory.list(filters),
    enabled: tenant.enabled,
  });
}

export function useStockLocationsQuery() {
  const tenant = useTenant();
  return useQuery({
    queryKey: ["stock-locations", tenant.tenantId],
    queryFn: () => services.inventory.listLocations(),
    enabled: tenant.enabled,
  });
}

export function useMovementsQuery(filters: StockMovementFilters = {}) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.stockMovements(tenant.tenantId, filters),
    queryFn: () => services.inventory.listMovements(filters),
    enabled: tenant.enabled,
  });
}

export function useInventoryAdjustmentMutation() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return useMutation({
    mutationFn: (input: InventoryAdjustmentInput) => services.inventory.adjust(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inventory", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["stock-movements", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["products", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", tenantId] }),
      ]);
      toast.success("Stock actualizado");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export function useCustomersQuery(filters: CustomerFilters = {}) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.customers(tenant.tenantId, filters),
    queryFn: () => services.customers.list(filters),
    enabled: tenant.enabled,
  });
}

export function useCustomerQuery(customerId: string | undefined) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.customer(tenant.tenantId, customerId ?? ""),
    queryFn: () => services.customers.get(customerId ?? ""),
    enabled: tenant.enabled && Boolean(customerId),
  });
}

export function useCustomerMutations(customerId?: string) {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers", tenantId] });
    if (customerId) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.customer(tenantId, customerId) });
    }
  };
  return {
    create: useMutation({
      mutationFn: (input: CreateCustomerInput) => services.customers.create(input),
      onSuccess: async () => {
        await refresh();
        toast.success("Cliente creado");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    update: useMutation({
      mutationFn: (input: UpdateCustomerInput) => {
        if (!customerId) throw new Error("Cliente inválido");
        return services.customers.update(customerId, input);
      },
      onSuccess: async () => {
        await refresh();
        toast.success("Cliente actualizado");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    setStatus: useMutation({
      mutationFn: (status: CustomerStatus) => {
        if (!customerId) throw new Error("Cliente inválido");
        return services.customers.setStatus(customerId, status);
      },
      onSuccess: async () => {
        await refresh();
        toast.success("Estado del cliente actualizado");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function useSalesQuery(filters: SaleFilters = {}) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.sales(tenant.tenantId, filters),
    queryFn: () => services.sales.list(filters),
    enabled: tenant.enabled,
  });
}

export function useSaleQuery(saleId: string | undefined) {
  const tenant = useTenant();
  return useQuery({
    queryKey: queryKeys.sale(tenant.tenantId, saleId ?? ""),
    queryFn: () => services.sales.get(saleId ?? ""),
    enabled: tenant.enabled && Boolean(saleId),
  });
}

export function useSaleMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return {
    confirm: useMutation({
      mutationFn: services.sales.confirm,
      onSuccess: async () => {
        await invalidateSaleEffects(queryClient, tenantId);
        toast.success("Venta confirmada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    cancel: useMutation({
      mutationFn: ({ saleId, reason }: { saleId: string; reason?: string }) =>
        services.sales.cancel(saleId, { reason }),
      onSuccess: async ({ sale }) => {
        queryClient.setQueryData(queryKeys.sale(tenantId, sale.id), sale);
        await invalidateSaleEffects(queryClient, tenantId);
        toast.success("Venta cancelada y stock reintegrado");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function useStoreQueries() {
  const tenant = useTenant();
  return {
    profile: useQuery({
      queryKey: queryKeys.storeProfile(tenant.tenantId),
      queryFn: services.store.getProfile,
      enabled: tenant.enabled,
    }),
    settings: useQuery({
      queryKey: queryKeys.storefrontSettings(tenant.tenantId),
      queryFn: services.store.getSettings,
      enabled: tenant.enabled,
    }),
    theme: useQuery({
      queryKey: queryKeys.storeTheme(tenant.tenantId),
      queryFn: services.store.getTheme,
      enabled: tenant.enabled,
    }),
    contacts: useQuery({
      queryKey: queryKeys.storeContactChannels(tenant.tenantId),
      queryFn: services.store.getContactChannels,
      enabled: tenant.enabled,
    }),
  };
}

export function useStoreMutations() {
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  return {
    profile: useMutation({
      mutationFn: (input: UpdateStoreProfileInput) => services.store.updateProfile(input),
      onSuccess: async (profile) => {
        queryClient.setQueryData(queryKeys.storeProfile(tenantId), profile);
        await queryClient.invalidateQueries({ queryKey: queryKeys.session });
        toast.success("Información del comercio guardada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    settings: useMutation({
      mutationFn: (input: UpdateStorefrontSettingsInput) => services.store.updateSettings(input),
      onSuccess: (settings) => {
        queryClient.setQueryData(queryKeys.storefrontSettings(tenantId), settings);
        toast.success("Preferencias de la tienda guardadas");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    theme: useMutation({
      mutationFn: (input: UpdateStoreThemeInput) => services.store.updateTheme(input),
      onSuccess: async (theme) => {
        queryClient.setQueryData(queryKeys.storeTheme(tenantId), theme);
        await queryClient.invalidateQueries({ queryKey: queryKeys.session });
        toast.success("Apariencia actualizada");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
    contacts: useMutation({
      mutationFn: (input: StoreContactChannelInput[]) =>
        services.store.updateContactChannels(input),
      onSuccess: (contacts) => {
        queryClient.setQueryData(queryKeys.storeContactChannels(tenantId), contacts);
        toast.success("Canales de contacto guardados");
      },
      onError: (error) => toast.error(errorMessage(error)),
    }),
  };
}

export function useResetDemoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: services.demo.reset,
    onSuccess: async () => {
      usePosStore.getState().clear();
      await queryClient.resetQueries();
      toast.success("Datos de demostración restablecidos");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}

export { errorMessage };
