import type { ComponentType } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  PackageSearch,
  ReceiptText,
  ShoppingBasket,
  Tags,
} from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardSummary, StockMovementType } from "@/domain/types";
import {
  useDashboardQuery,
  usePermission,
  useTenantFeature,
} from "@/hooks/use-services";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

const movementLabels: Record<StockMovementType, string> = {
  INITIAL: "Stock inicial",
  MANUAL_IN: "Ingreso manual",
  MANUAL_OUT: "Salida manual",
  ADJUSTMENT: "Ajuste",
  SALE: "Venta",
  SALE_REVERSAL: "Anulación de venta",
  PURCHASE: "Compra",
  PURCHASE_RETURN: "Devolución de compra",
  CUSTOMER_RETURN: "Devolución de cliente",
};

type QuickAction = {
  label: string;
  description: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  visible: boolean;
};

function DashboardContent({ data }: { data: DashboardSummary }) {
  const canCreateProducts = usePermission("products.write");
  const canAdjustInventory = usePermission("inventory.adjust");
  const canCreateSales = usePermission("sales.create");
  const canUsePos = usePermission("pos.use");
  const hasCatalog = useTenantFeature("CATALOG");
  const hasInventory = useTenantFeature("INVENTORY");
  const hasSales = useTenantFeature("SALES");
  const hasPos = useTenantFeature("POS");

  const quickActions: QuickAction[] = [
    {
      label: "Nuevo producto",
      description: "Sumá una pieza al catálogo",
      to: "/products/new",
      icon: PackagePlus,
      visible: canCreateProducts && hasCatalog,
    },
    {
      label: "Ajustar stock",
      description: "Registrá un ingreso o una salida",
      to: "/inventory",
      icon: Boxes,
      visible: canAdjustInventory && hasInventory,
    },
    {
      label: "Nueva venta",
      description: "Creá una venta manual",
      to: "/sales/new",
      icon: ReceiptText,
      visible: canCreateSales && hasSales,
    },
    {
      label: "Abrir POS",
      description: "Iniciá una venta rápida",
      to: "/pos",
      icon: ShoppingBasket,
      visible: canUsePos && hasPos,
    },
  ];

  return (
    <div className="space-y-6">
      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
        aria-label="Resumen del comercio"
      >
        <StatCard
          label="Productos publicados"
          value={formatNumber(data.publishedProducts, 0)}
          icon={PackageSearch}
        />
        <StatCard label="Variantes" value={formatNumber(data.variants, 0)} icon={Tags} />
        <StatCard
          label="Unidades disponibles"
          value={formatNumber(data.availableUnits)}
          icon={Boxes}
          tone="success"
        />
        <StatCard
          label="Con stock bajo"
          value={formatNumber(data.lowStockItems, 0)}
          icon={AlertTriangle}
          tone={data.lowStockItems > 0 ? "warning" : "success"}
          hint={data.lowStockItems > 0 ? "Requieren atención" : "Todo en orden"}
        />
        <StatCard
          label="Ventas de hoy"
          value={formatNumber(data.salesToday, 0)}
          icon={ReceiptText}
          tone="success"
        />
        <StatCard
          label="Vendido hoy"
          value={formatCurrency(data.totalSoldToday, { currency: data.currency })}
          icon={CircleDollarSign}
          tone="success"
        />
      </section>

      <section aria-labelledby="quick-actions-title">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="quick-actions-title" className="text-base font-semibold">
            Accesos rápidos
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickActions
            .filter((action) => action.visible)
            .map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-4 shadow-soft transition-colors hover:border-primary/25 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{action.label}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {action.description}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,.85fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Productos con stock bajo</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Variantes que alcanzaron su umbral de reposición.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventory">
                Ver inventario <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {data.lowStockProducts.length === 0 ? (
              <EmptyState
                compact
                className="m-5 mt-0 min-h-44 border-0 bg-muted/35"
                title="No hay alertas de stock"
                description="Todas las variantes controladas están por encima de su umbral."
                icon={Boxes}
              />
            ) : (
              <Table className="min-w-[660px]" scrollLabel="Productos con stock bajo">
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Disponible</TableHead>
                    <TableHead className="text-right">Umbral</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockProducts.slice(0, 6).map((item) => (
                    <TableRow key={`${item.stockLocationId}-${item.variantId}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="size-10 rounded-md border object-cover"
                            />
                          ) : (
                            <span className="grid size-10 place-items-center rounded-md bg-muted text-muted-foreground">
                              <PackageSearch className="size-4" aria-hidden="true" />
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.productName}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {item.variantName}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.sku ?? "—"}</TableCell>
                      <TableCell className="text-right font-semibold text-red-700">
                        {formatNumber(item.available)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(item.lowStockThreshold)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Últimos movimientos</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Entradas y salidas recientes de inventario.
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/inventory/movements">
                Ver todos <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentMovements.length === 0 ? (
              <EmptyState
                compact
                className="min-h-44 border-0 bg-muted/35"
                title="Todavía no hay movimientos"
                description="Los ingresos, ajustes y ventas aparecerán acá."
                icon={Boxes}
              />
            ) : (
              <div className="divide-y">
                {data.recentMovements.slice(0, 5).map((movement) => {
                  const delta = movement.items.reduce(
                    (total, item) => total + item.quantityDelta,
                    0,
                  );
                  const PositiveIcon = delta >= 0 ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <div key={movement.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <span
                        className={
                          delta >= 0
                            ? "grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"
                            : "grid size-9 shrink-0 place-items-center rounded-full bg-amber-50 text-amber-700"
                        }
                      >
                        <PositiveIcon className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {movementLabels[movement.type]}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {movement.movementNumber} · {formatDateTime(movement.occurredAt)}
                        </p>
                      </div>
                      <span
                        className={
                          delta >= 0
                            ? "text-sm font-semibold tabular-nums text-emerald-700"
                            : "text-sm font-semibold tabular-nums text-amber-700"
                        }
                      >
                        {delta > 0 ? "+" : ""}
                        {formatNumber(delta)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Últimas ventas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Actividad comercial registrada recientemente.
            </p>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/sales">
              Ver historial <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {data.recentSales.length === 0 ? (
            <EmptyState
              compact
              className="m-5 mt-0 min-h-44 border-0 bg-muted/35"
              title="Todavía no hay ventas"
              description="La actividad del POS y de ventas manuales aparecerá acá."
              icon={ReceiptText}
            />
          ) : (
            <Table className="min-w-[720px]" scrollLabel="Últimas ventas">
              <TableHeader>
                <TableRow>
                  <TableHead>Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentSales.slice(0, 6).map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(sale.soldAt ?? sale.createdAt)}
                    </TableCell>
                    <TableCell>{sale.customerNameSnapshot ?? "Consumidor final"}</TableCell>
                    <TableCell>
                      <StatusBadge status={sale.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrency(sale.total, { currency: sale.currency })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link to={`/sales/${sale.id}`} aria-label={`Ver venta ${sale.saleNumber}`}>
                          <ArrowRight />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardPage() {
  const dashboard = useDashboardQuery();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Una vista rápida del catálogo, el inventario y las ventas de Rubí Joyería."
      />
      <QueryState
        isLoading={dashboard.isLoading}
        isError={dashboard.isError}
        error={dashboard.error}
        onRetry={() => void dashboard.refetch()}
        isEmpty={!dashboard.data}
        emptyFallback={
          <EmptyState
            title="No hay información para mostrar"
            description="Restablecé los datos de demostración o intentá nuevamente."
          />
        }
      >
        {dashboard.data ? <DashboardContent data={dashboard.data} /> : null}
      </QueryState>
    </div>
  );
}
