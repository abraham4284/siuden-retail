import { lazy, Suspense } from "react";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Navigate, Route, Routes } from "react-router-dom";
import { CapabilityRoute, ProtectedRoute } from "@/app/route-guards";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";

const LoginPage = lazy(() => import("@/pages/login-page").then((module) => ({ default: module.LoginPage })));
const AccountsPage = lazy(() => import("@/pages/accounts-page").then((module) => ({ default: module.AccountsPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })));
const CategoriesPage = lazy(() => import("@/pages/categories-page").then((module) => ({ default: module.CategoriesPage })));
const CustomersPage = lazy(() => import("@/pages/customers-pages").then((module) => ({ default: module.CustomersPage })));
const CustomerDetailPage = lazy(() => import("@/pages/customers-pages").then((module) => ({ default: module.CustomerDetailPage })));
const InventoryPage = lazy(() => import("@/pages/inventory-pages").then((module) => ({ default: module.InventoryPage })));
const StockMovementsPage = lazy(() => import("@/pages/inventory-pages").then((module) => ({ default: module.StockMovementsPage })));
const PosPage = lazy(() => import("@/pages/pos-page").then((module) => ({ default: module.PosPage })));
const ProductsPage = lazy(() => import("@/pages/products-pages").then((module) => ({ default: module.ProductsPage })));
const ProductFormPage = lazy(() => import("@/pages/products-pages").then((module) => ({ default: module.ProductFormPage })));
const PriceAdjustmentPage = lazy(() => import("@/pages/products-pages").then((module) => ({ default: module.PriceAdjustmentPage })));
const SalesPage = lazy(() => import("@/pages/sales-pages").then((module) => ({ default: module.SalesPage })));
const SaleDetailPage = lazy(() => import("@/pages/sales-pages").then((module) => ({ default: module.SaleDetailPage })));
const ManualSalePage = lazy(() => import("@/pages/sales-pages").then((module) => ({ default: module.ManualSalePage })));
const StoreSettingsPage = lazy(() => import("@/pages/settings-pages").then((module) => ({ default: module.StoreSettingsPage })));
const ContactSettingsPage = lazy(() => import("@/pages/settings-pages").then((module) => ({ default: module.ContactSettingsPage })));

function NotFoundPage() {
  return (
    <div className="grid min-h-[65vh] place-items-center">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-muted text-muted-foreground"><FileQuestion className="size-5" /></span>
        <h1 className="mt-4 text-2xl font-semibold">No encontramos esta página</h1>
        <p className="mt-2 text-sm text-muted-foreground">La dirección puede haber cambiado o no estar disponible para tu cuenta.</p>
        <Button className="mt-5" asChild><a href="/dashboard"><ArrowLeft />Volver al dashboard</a></Button>
      </div>
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Cargando módulo…</div>}>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route element={<CapabilityRoute permission="accounts.manage" />}>
            <Route path="accounts" element={<AccountsPage />} />
          </Route>

          <Route element={<CapabilityRoute feature="CATALOG" permission="products.read" />}>
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:productId/edit" element={<ProductFormPage />} />
          </Route>
          <Route element={<CapabilityRoute feature="CATALOG" permission="products.write" />}>
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/price-adjustment" element={<PriceAdjustmentPage />} />
          </Route>
          <Route element={<CapabilityRoute feature="CATALOG" permission="categories.write" />}>
            <Route path="categories" element={<CategoriesPage />} />
          </Route>

          <Route element={<CapabilityRoute feature="INVENTORY" permission="inventory.read" />}>
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="inventory/movements" element={<StockMovementsPage />} />
          </Route>

          <Route element={<CapabilityRoute feature="CUSTOMERS" permission="customers.read" />}>
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
          </Route>

          <Route element={<CapabilityRoute feature="SALES" permission="sales.read" />}>
            <Route path="sales" element={<SalesPage />} />
            <Route path="sales/:saleId" element={<SaleDetailPage />} />
          </Route>
          <Route element={<CapabilityRoute feature="SALES" permission="sales.create" />}>
            <Route path="sales/new" element={<ManualSalePage />} />
          </Route>
          <Route element={<CapabilityRoute feature="POS" permission="pos.use" />}>
            <Route path="pos" element={<PosPage />} />
          </Route>

          <Route element={<CapabilityRoute permission="store.read" />}>
            <Route path="settings/store" element={<StoreSettingsPage />} />
            <Route path="settings/contact" element={<ContactSettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
