import { useMemo, useState, type ReactNode } from "react";
import { Ban, Eye, Plus, Printer, ReceiptText, RotateCcw, ShoppingBag } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { CatalogFilters, CatalogPicker, SaleCart, type ComposerLine } from "@/components/sales/sale-composer";
import { SaleReceiptDialog } from "@/components/sales/sale-receipt";
import { EmptyState, PageHeader, QueryState, SearchInput, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Sale, SaleChannel, SaleStatus } from "@/domain/types";
import { useSellableCatalog } from "@/hooks/use-sellable-catalog";
import {
  useCategoriesQuery,
  useCustomersQuery,
  usePermission,
  useSaleMutations,
  useSaleQuery,
  useSalesQuery,
} from "@/hooks/use-services";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";

const channelLabel: Record<SaleChannel, string> = {
  POS: "Punto de venta",
  MANUAL: "Manual",
  ONLINE: "Online",
};

function customerName(sale: Sale) {
  return sale.customerNameSnapshot ?? "Consumidor final";
}

export function SalesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SaleStatus | "ALL">("ALL");
  const [channel, setChannel] = useState<SaleChannel | "ALL">("ALL");
  const canCreate = usePermission("sales.create");
  const canCancel = usePermission("sales.cancel");
  const sales = useSalesQuery({ search: search || undefined, status, channel, pageSize: 100 });
  const actions = useSaleMutations();

  const cancel = async (sale: Sale) => {
    if (!window.confirm(`¿Cancelar la venta ${sale.saleNumber}? El stock se reintegrará con un movimiento compensatorio.`)) return;
    await actions.cancel.mutateAsync({ saleId: sale.id, reason: "Cancelación solicitada desde el administrador" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas"
        description="Consultá comprobantes, canales y estados sin mezclar el registro de cobro."
        actions={canCreate && <Button asChild><Link to="/sales/new"><Plus />Nueva venta</Link></Button>}
      />
      <Card><CardContent className="grid gap-3 pt-5 md:grid-cols-[1fr_210px_210px]">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número o cliente…" />
        <Select aria-label="Filtrar estado" value={status} onChange={(event) => setStatus(event.target.value as SaleStatus | "ALL")}>
          <option value="ALL">Todos los estados</option><option value="CONFIRMED">Confirmadas</option><option value="CANCELLED">Canceladas</option><option value="DRAFT">Borradores</option>
        </Select>
        <Select aria-label="Filtrar canal" value={channel} onChange={(event) => setChannel(event.target.value as SaleChannel | "ALL")}>
          <option value="ALL">Todos los canales</option><option value="POS">Punto de venta</option><option value="MANUAL">Manual</option><option value="ONLINE">Online</option>
        </Select>
      </CardContent></Card>
      <QueryState isLoading={sales.isPending} isError={sales.isError} error={sales.error} onRetry={() => sales.refetch()} isEmpty={sales.data?.items.length === 0} emptyFallback={<EmptyState icon={ReceiptText} title="Todavía no hay ventas" description="Creá una venta manual o abrí el punto de venta." action={<Button asChild><Link to="/sales/new">Crear primera venta</Link></Button>} />}>
        <Card className="overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Número</TableHead><TableHead>Fecha</TableHead><TableHead>Cliente</TableHead><TableHead>Canal</TableHead><TableHead>Unidades</TableHead><TableHead>Total</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
            <TableBody>
              {sales.data?.items.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-semibold"><Link className="hover:text-primary hover:underline" to={`/sales/${sale.id}`}>{sale.saleNumber}</Link></TableCell>
                  <TableCell>{formatDateTime(sale.soldAt ?? sale.createdAt)}</TableCell>
                  <TableCell>{customerName(sale)}</TableCell>
                  <TableCell>{channelLabel[sale.channel]}</TableCell>
                  <TableCell>{formatNumber(sale.items.reduce((sum, item) => sum + item.quantity, 0))}</TableCell>
                  <TableCell className="font-semibold tabular-nums">{formatCurrency(sale.total, { currency: sale.currency })}</TableCell>
                  <TableCell><StatusBadge status={sale.status} /></TableCell>
                  <TableCell><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" asChild><Link to={`/sales/${sale.id}`} aria-label={`Ver ${sale.saleNumber}`}><Eye /></Link></Button>{canCancel && sale.status === "CONFIRMED" && <Button size="icon-sm" variant="ghost" className="text-red-600" onClick={() => cancel(sale)} disabled={actions.cancel.isPending} aria-label={`Cancelar ${sale.saleNumber}`}><Ban /></Button>}</div></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </QueryState>
    </div>
  );
}

export function SaleDetailPage() {
  const { saleId } = useParams();
  const sale = useSaleQuery(saleId);
  const actions = useSaleMutations();
  const canCancel = usePermission("sales.cancel");

  const cancel = async () => {
    if (!sale.data || !window.confirm(`¿Cancelar ${sale.data.saleNumber}? Esta acción creará un movimiento SALE_REVERSAL.`)) return;
    await actions.cancel.mutateAsync({ saleId: sale.data.id, reason: "Cancelación desde el detalle de venta" });
    await sale.refetch();
  };

  return (
    <div className="space-y-6 print:p-0">
      <PageHeader title={sale.data?.saleNumber ?? "Detalle de venta"} description="Comprobante histórico con snapshots de producto y precio." actions={<><Button variant="outline" onClick={() => window.print()}><Printer />Imprimir</Button>{canCancel && sale.data?.status === "CONFIRMED" && <Button variant="destructive" onClick={cancel} disabled={actions.cancel.isPending}><RotateCcw />{actions.cancel.isPending ? "Cancelando…" : "Cancelar venta"}</Button>}</>} />
      <QueryState isLoading={sale.isPending} isError={sale.isError} error={sale.error} onRetry={() => sale.refetch()}>
        {sale.data && (
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader><CardTitle>Artículos</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {sale.data.items.map((item) => <div key={item.id} className="flex items-start justify-between gap-4 rounded-lg border p-4"><div><p className="font-medium">{item.productNameSnapshot}</p><p className="mt-1 text-sm text-muted-foreground">{item.variantNameSnapshot ?? "Variante eliminada"}{item.skuSnapshot ? ` · ${item.skuSnapshot}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p></div><p className="font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</p></div>)}
                <div className="flex items-center justify-between border-t pt-4 text-lg font-bold"><span>Total</span><span>{formatCurrency(sale.data.total, { currency: sale.data.currency })}</span></div>
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card><CardHeader><CardTitle>Información</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
                <Detail label="Estado" value={<StatusBadge status={sale.data.status} />} />
                <Detail label="Pago" value={<StatusBadge status={sale.data.paymentStatus} />} />
                <Detail label="Cliente" value={customerName(sale.data)} />
                <Detail label="Canal" value={channelLabel[sale.data.channel]} />
                <Detail label="Fecha" value={formatDateTime(sale.data.soldAt ?? sale.data.createdAt)} />
                <Detail label="Registrada por" value={sale.data.createdByName ?? "Sistema"} />
              </CardContent></Card>
              {sale.data.notes && <Card><CardHeader><CardTitle>Notas</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{sale.data.notes}</p></CardContent></Card>}
            </div>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

export function ManualSalePage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [lines, setLines] = useState<ComposerLine[]>([]);
  const [receipt, setReceipt] = useState<Sale | null>(null);
  const categories = useCategoriesQuery();
  const customers = useCustomersQuery({ status: "ACTIVE", pageSize: 200 });
  const catalog = useSellableCatalog(search, categoryId);
  const actions = useSaleMutations();
  const quantities = useMemo(() => Object.fromEntries(lines.map((line) => [line.variantId, line.quantity])), [lines]);

  const add = (item: ReturnType<typeof useSellableCatalog>["items"][number]) => {
    if (item.price === null) return;
    const maxAvailable = item.trackInventory ? item.available : 9999;
    setLines((current) => {
      const existing = current.find((line) => line.variantId === item.variantId);
      if (existing) {
        if (existing.quantity >= maxAvailable) return current;
        return current.map((line) => line.variantId === item.variantId ? { ...line, quantity: line.quantity + 1 } : line);
      }
      if (maxAvailable < 1) return current;
      return [...current, { variantId: item.variantId, productName: item.productName, variantName: item.variantName, sku: item.sku, imageUrl: item.imageUrl, unitPrice: item.price as number, quantity: 1, maxAvailable }];
    });
  };

  const confirm = async () => {
    const result = await actions.confirm.mutateAsync({
      channel: "MANUAL",
      customerId,
      items: lines.map((line) => ({ productVariantId: line.variantId, quantity: line.quantity, unitPrice: line.unitPrice })),
    });
    setLines([]);
    setCustomerId(null);
    setReceipt(result.sale);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Nueva venta manual" description="Registrá una venta local con el mismo comando transaccional que usa el POS." actions={<Button variant="outline" asChild><Link to="/sales">Volver a ventas</Link></Button>} />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
        <Card><CardContent className="space-y-5 pt-5"><CatalogFilters search={search} onSearch={setSearch} categoryId={categoryId} onCategory={setCategoryId} categories={categories.data ?? []} /><CatalogPicker items={catalog.items} isPending={catalog.isPending} isError={catalog.isError} error={catalog.error} onRetry={catalog.refetch} quantities={quantities} onAdd={add} /></CardContent></Card>
        <div className="xl:sticky xl:top-20 xl:h-[calc(100vh-6.5rem)]"><SaleCart lines={lines} customers={customers.data?.items ?? []} customerId={customerId} onCustomer={setCustomerId} onQuantity={(variantId, quantity) => setLines((current) => current.map((line) => line.variantId === variantId && quantity >= 1 && quantity <= line.maxAvailable ? { ...line, quantity } : line))} onRemove={(variantId) => setLines((current) => current.filter((line) => line.variantId !== variantId))} onClear={() => { if (window.confirm("¿Vaciar la venta manual?")) setLines([]); }} onConfirm={confirm} confirming={actions.confirm.isPending} confirmLabel="Registrar venta" /></div>
      </div>
      <SaleReceiptDialog sale={receipt} open={Boolean(receipt)} onOpenChange={(open) => !open && setReceipt(null)} />
    </div>
  );
}

export function SalesEmptyIllustration() {
  return <div className="grid place-items-center"><ShoppingBag className="size-8 text-muted-foreground" /></div>;
}
