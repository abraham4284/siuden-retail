import type { Services } from "@/services/contracts";
import { createHttpServices } from "@/services/http-services";
import { MockRepository } from "@/services/mock-repository";

export function createMockServices(delayMs = 90, repository = new MockRepository(delayMs)): Services {
  return {
    auth: {
      login: (input) => repository.login(input),
      me: () => repository.me(),
      logout: () => repository.logout(),
    },
    accounts: {
      list: async () => ({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
      create: async () => {
        throw new Error("La creación de cuentas requiere la API NestJS.");
      },
    },
    dashboard: {
      get: () => repository.getDashboard(),
    },
    products: {
      list: (filters) => repository.listProducts(filters),
      get: (productId) => repository.getProduct(productId),
      create: (input) => repository.createProduct(input),
      update: (productId, input) => repository.updateProduct(productId, input),
      duplicate: (productId) => repository.duplicateProduct(productId),
      setStatus: (productId, status) => repository.setProductStatus(productId, status),
      archive: (productId) => repository.archiveProduct(productId),
      delete: (productId) => repository.deleteProduct(productId),
      previewPriceAdjustment: (input) => repository.previewPriceAdjustment(input),
      bulkPrice: (input) => repository.bulkPriceAdjustment(input),
      bulkPriceAdjustment: (input) => repository.bulkPriceAdjustment(input),
    },
    categories: {
      list: (filters) => repository.listCategories(filters),
      create: (input) => repository.createCategory(input),
      update: (categoryId, input) => repository.updateCategory(categoryId, input),
      remove: (categoryId) => repository.deleteCategory(categoryId),
      delete: (categoryId) => repository.deleteCategory(categoryId),
      reorder: (input) => repository.reorderCategories(input),
    },
    inventory: {
      listLocations: () => repository.listStockLocations(),
      list: (filters) => repository.listInventory(filters),
      listMovements: (filters) => repository.listStockMovements(filters),
      adjust: (input) => repository.adjustInventory(input),
    },
    customers: {
      list: (filters) => repository.listCustomers(filters),
      get: (customerId) => repository.getCustomer(customerId),
      create: (input) => repository.createCustomer(input),
      update: (customerId, input) => repository.updateCustomer(customerId, input),
      setStatus: (customerId, status) => repository.setCustomerStatus(customerId, status),
    },
    sales: {
      list: (filters) => repository.listSales(filters),
      get: (saleId) => repository.getSale(saleId),
      confirm: (input) => repository.confirmSale(input),
      cancel: (saleId, input) => repository.cancelSale(saleId, input),
    },
    store: {
      getProfile: () => repository.getStoreProfile(),
      updateProfile: (input) => repository.updateStoreProfile(input),
      getSettings: () => repository.getStoreSettings(),
      updateSettings: (input) => repository.updateStoreSettings(input),
      getTheme: () => repository.getStoreTheme(),
      updateTheme: (input) => repository.updateStoreTheme(input),
      getContactChannels: () => repository.getStoreContactChannels(),
      updateContactChannels: (input) => repository.updateStoreContactChannels(input),
    },
    demo: {
      reset: () => repository.resetDemo(),
    },
  };
}

const repository = new MockRepository(90);
const mockServices = createMockServices(90, repository);
export const services = import.meta.env.VITE_USE_MOCKS === "true"
  ? mockServices
  : createHttpServices(mockServices, repository);

export { MockRepository, MockServiceError } from "@/services/mock-repository";
export { DEMO_CREDENTIALS, MOCK_DATA_VERSION, MOCK_STORAGE_KEY } from "@/mocks/seed";
export * from "@/domain/types";
export * from "@/services/contracts";
