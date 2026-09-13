import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, ClipboardList, SlidersHorizontal, Warehouse } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { EmptyState, PageHeader, QueryState, SearchInput, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { InventoryItem, StockMovementType } from "@/domain/types";
import {
  useCategoriesQuery,
  useInventoryAdjustmentMutation,
  useInventoryQuery,
  useMovementsQuery,
  usePermission,
} from "@/hooks/use-services";
import { formatDateTime, formatNumber } from "@/lib/format";

const adjustmentSchema = z.object({
  type: z.enum(["MANUAL_IN", "MANUAL_OUT", "ADJUSTMENT", "CUSTOMER_RETURN"]),
  amount: z.coerce.number().refine((value) => value !== 0, "Ingresá una cantidad distinta de cero."),
  reason: z.string().trim().min(3, "Explicá brevemente el motivo."),
  lowStockThreshold: z.union([z.coerce.number().min(0), z.literal("")]).optional(),
});

type AdjustmentValues = z.input<typeof adjustmentSchema>;

const movementLabels: Record<StockMovementType, string> = {
  INITIAL: "Stock inicial",
  MANUAL_IN: "Ingreso manual",
  MANUAL_OUT: "Salida manual",
  ADJUSTMENT: "Ajuste",
  SALE: "Venta",
  SALE_REVERSAL: "Cancelación de venta",
  PURCHASE: "Compra",
  PURCHASE_RETURN: "Devolución de compra",
  CUSTOMER_RETURN: "Devolución de cliente",
};

function quantityDelta(type: AdjustmentValues["type"], amount: number): number {
  if (type === "MANUAL_OUT") return -Math.abs(amount);
  if (type === "MANUAL_IN" || type === "CUSTOMER_RETURN") return Math.abs(amount);
  return amount;
}

function StockAdjustmentDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const adjustment = useInventoryAdjustmentMutation();
  const form = useForm<AdjustmentValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { type: "ADJUSTMENT", amount: 1, reason: "", lowStockThreshold: "" },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({
        type: "ADJUSTMENT",
        amount: 1,
        reason: "",
        lowStockThreshold: item.lowStockThreshold ?? "",
      });
    }
  }, [form, item, open]);

  const type = useWatch({ control: form.control, name: "type" });
  const amount = Number(useWatch({ control: form.control, name: "amount" })) || 0;
  const delta = quantityDelta(type, amount);
  const resulting = (item?.onHand ?? 0) + delta;

  const submit = form.handleSubmit(async (raw) => {
    if (!item) return;
    const values = adjustmentSchema.parse(raw);
    await adjustment.mutateAsync({
      stockLocationId: item.stockLocationId,
      type: values.type,
      reason: values.reason,
      items: [
        {
          productVariantId: item.variantId,
          quantityDelta: quantityDelta(values.type, values.amount),
          lowStockThreshold:
            values.lowStockThreshold === "" || values.lowStockThreshold === undefined
              ? null
              : values.lowStockThreshold,
        },
      ],
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !adjustment.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {item ? `${item.productName} · ${item.variantName}` : "Seleccioná una variante."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="movement-type">Tipo de movimiento</Label>
              <Select id="movement-type" {...form.register("type")}>
                <option value="ADJUSTMENT">Ajuste de diferencia</option>
                <option value="MANUAL_IN">Ingreso manual</option>
                <option value="MANUAL_OUT">Salida manual</option>
                <option value="CUSTOMER_RETURN">Devolución de cliente</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="movement-amount">{type === "ADJUSTMENT" ? "Diferencia (+ / -)" : "Cantidad"}</Label>
              <Input id="movement-amount" type="number" step="1" {...form.register("amount")} />
              {form.formState.errors.amount && <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-center text-sm">
            <div><p className="text-xs text-muted-foreground">Actual</p><p className="mt-1 font-semibold">{formatNumber(item?.onHand)}</p></div>
            <div><p className="text-xs text-muted-foreground">Cambio</p><p className={delta >= 0 ? "mt-1 font-semibold text-emerald-600" : "mt-1 font-semibold text-red-600"}>{delta > 0 ? "+" : ""}{formatNumber(delta)}</p></div>
            <div><p className="text-xs text-muted-foreground">Resultante</p><p className={resulting < 0 ? "mt-1 font-semibold text-red-600" : "mt-1 font-semibold"}>{formatNumber(resulting)}</p></div>
          </div>
          {resulting < 0 && <p className="text-sm text-destructive" role="alert">El movimiento dejaría el stock en negativo.</p>}
          <div className="space-y-2">
            <Label htmlFor="threshold">Umbral de stock bajo</Label>
            <Input id="threshold" type="number" min="0" step="1" placeholder="Sin umbral" {...form.register("lowStockThreshold")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="movement-reason">Motivo</Label>
            <Textarea id="movement-reason" placeholder="Ej.: conteo físico del local" {...form.register("reason")} />
            {form.formState.errors.reason && <p className="text-xs text-destructive">{form.formState.errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={adjustment.isPending}>Cancelar</Button>
            <Button type="submit" disabled={adjustment.isPending || resulting < 0}>
              {adjustment.isPending ? "Registrando…" : "Registrar movimiento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InventoryPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [categoryId, setCategoryId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const canAdjust = usePermission("inventory.adjust");
  const categories = useCategoriesQuery();
  const inventory = useInventoryQuery({
    search: search || undefined,
    status: status as "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "NOT_TRACKED",
    categoryId: categoryId || undefined,
    pageSize: 100,
  });
  const requestedVariantId = searchParams.get("variant");
  const selected =
    inventory.data?.items.find((item) => item.variantId === (selectedId ?? requestedVariantId)) ?? null;

  const closeAdjustment = () => {
    setSelectedId(null);
    if (requestedVariantId) {
      const next = new URLSearchParams(searchParams);
      next.delete("variant");
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Existencias"
        description="Consultá el saldo disponible por variante y registrá ajustes trazables."
        actions={<Button variant="outline" asChild><Link to="/inventory/movements"><ClipboardList />Ver movimientos</Link></Button>}
      />
      <Card>
        <CardContent className="grid gap-3 pt-5 md:grid-cols-[minmax(240px,1fr)_220px_220px]">
          <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar producto o SKU…" />
          <Select aria-label="Filtrar por categoría" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Todas las categorías</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </Select>
          <Select aria-label="Filtrar por estado de stock" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Todos los estados</option>
            <option value="IN_STOCK">Con stock</option>
            <option value="LOW_STOCK">Stock bajo</option>
            <option value="OUT_OF_STOCK">Sin stock</option>
            <option value="NOT_TRACKED">Sin seguimiento</option>
          </Select>
        </CardContent>
      </Card>

      <QueryState
        isLoading={inventory.isPending}
        isError={inventory.isError}
        error={inventory.error}
        onRetry={() => inventory.refetch()}
        isEmpty={inventory.data?.items.length === 0}
        emptyFallback={<EmptyState icon={Warehouse} title="No encontramos existencias" description="Probá cambiando los filtros o creá un producto con seguimiento de stock." />}
      >
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead>SKU</TableHead>
                <TableHead className="text-right">Físico</TableHead><TableHead className="text-right">Reservado</TableHead>
                <TableHead className="text-right">Disponible</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.data?.items.map((item) => (
                <TableRow key={`${item.stockLocationId}-${item.variantId}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <Warehouse className="m-3 size-4 text-muted-foreground" />}
                      </div>
                      <div><p className="font-medium">{item.productName}</p><p className="text-xs text-muted-foreground">{item.variantName}</p></div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-44 truncate">{item.categoryNames.join(" · ") || "Sin categoría"}</TableCell>
                  <TableCell className="font-mono text-xs">{item.sku ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatNumber(item.onHand)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatNumber(item.reserved)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatNumber(item.available)}</TableCell>
                  <TableCell><StatusBadge status={item.status} /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" disabled={!canAdjust || !item.trackInventory} onClick={() => setSelectedId(item.variantId)}><SlidersHorizontal />Ajustar</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </QueryState>
      <StockAdjustmentDialog item={selected} open={Boolean(selected)} onOpenChange={(open) => !open && closeAdjustment()} />
    </div>
  );
}

export function StockMovementsPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const movements = useMovementsQuery({
    search: search || undefined,
    type: type as StockMovementType | "ALL",
    pageSize: 100,
  });
  const totals = useMemo(
    () => movements.data?.items.map((movement) => movement.items.reduce((sum, item) => sum + item.quantityDelta, 0)) ?? [],
    [movements.data],
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Movimientos de stock" description="Historial inmutable de ingresos, egresos, ventas y reversiones." actions={<Button variant="outline" asChild><Link to="/inventory"><Warehouse />Ver existencias</Link></Button>} />
      <Card><CardContent className="grid gap-3 pt-5 md:grid-cols-[1fr_260px]">
        <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar número, producto o SKU…" />
        <Select aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="ALL">Todos los movimientos</option>
          {Object.entries(movementLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
      </CardContent></Card>
      <QueryState isLoading={movements.isPending} isError={movements.isError} error={movements.error} onRetry={() => movements.refetch()} isEmpty={movements.data?.items.length === 0} emptyFallback={<EmptyState icon={ClipboardList} title="Todavía no hay movimientos" description="Los stocks iniciales, ajustes y ventas aparecerán acá." />}>
        <div className="space-y-3">
          {movements.data?.items.map((movement, index) => {
            const total = totals[index] ?? 0;
            return (
              <Card key={movement.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={total >= 0 ? "grid size-9 place-items-center rounded-full bg-emerald-50 text-emerald-600" : "grid size-9 place-items-center rounded-full bg-red-50 text-red-600"}>
                        {total >= 0 ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                      </span>
                      <div><CardTitle className="text-base">{movement.movementNumber} · {movementLabels[movement.type]}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(movement.occurredAt)} · {movement.createdBy?.displayName ?? "Sistema"}</p></div>
                    </div>
                    <div className="flex items-center gap-2"><StatusBadge status={movement.status} /><span className={total >= 0 ? "font-semibold tabular-nums text-emerald-600" : "font-semibold tabular-nums text-red-600"}>{total > 0 ? "+" : ""}{formatNumber(total)}</span></div>
                  </div>
                </CardHeader>
                <CardContent>
                  {movement.reason && <p className="mb-3 text-sm text-muted-foreground">Motivo: {movement.reason}</p>}
                  <div className="rounded-lg border">
                    {movement.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 border-b px-3 py-2.5 text-sm last:border-0">
                        <span><span className="font-medium">{item.productName}</span><span className="ml-2 text-muted-foreground">{item.variantName}{item.sku ? ` · ${item.sku}` : ""}</span></span>
                        <span className={item.quantityDelta > 0 ? "font-semibold tabular-nums text-emerald-600" : "font-semibold tabular-nums text-red-600"}>{item.quantityDelta > 0 ? "+" : ""}{formatNumber(item.quantityDelta)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </QueryState>
    </div>
  );
}
