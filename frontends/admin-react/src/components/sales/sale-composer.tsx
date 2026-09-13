import { Minus, PackageOpen, Plus, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import { EmptyState, QueryState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { Customer } from "@/domain/types";
import type { SellableCatalogItem } from "@/hooks/use-sellable-catalog";
import { formatCurrency, formatNumber } from "@/lib/format";

export type ComposerLine = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  maxAvailable: number;
};

export function CatalogPicker({
  items,
  isPending,
  isError,
  error,
  onRetry,
  onAdd,
  quantities,
}: {
  items: SellableCatalogItem[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  onAdd: (item: SellableCatalogItem) => void;
  quantities: Record<string, number>;
}) {
  return (
    <QueryState
      isLoading={isPending}
      isError={isError}
      error={error}
      onRetry={onRetry}
      isEmpty={items.length === 0}
      emptyFallback={<EmptyState compact icon={PackageOpen} title="No encontramos variantes" description="Probá con otra búsqueda o categoría." />}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const selected = quantities[item.variantId] ?? 0;
          const canAdd = item.price !== null && (!item.trackInventory || selected < item.available);
          return (
            <article key={item.variantId} className="group overflow-hidden rounded-xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt="" className="size-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                ) : (
                  <div className="grid size-full place-items-center"><ShoppingBag className="size-6 text-muted-foreground" /></div>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <p className="line-clamp-1 text-sm font-semibold">{item.productName}</p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{item.variantName}{item.sku ? ` · ${item.sku}` : ""}</p>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="font-semibold tabular-nums">{item.price === null ? "Consultar" : formatCurrency(item.price)}</p>
                    <p className={item.available <= 0 ? "text-xs text-red-600" : item.available <= 3 ? "text-xs text-amber-600" : "text-xs text-muted-foreground"}>
                      {item.trackInventory ? `${formatNumber(item.available)} disponibles` : "Stock sin seguimiento"}
                    </p>
                  </div>
                  <Button size="icon-sm" onClick={() => onAdd(item)} disabled={!canAdd} aria-label={`Agregar ${item.productName}`}>
                    <Plus />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </QueryState>
  );
}

export function CatalogFilters({
  search,
  onSearch,
  categoryId,
  onCategory,
  categories,
}: {
  search: string;
  onSearch: (value: string) => void;
  categoryId: string;
  onCategory: (value: string) => void;
  categories: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9 pr-9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Buscar por nombre o SKU…" aria-label="Buscar productos" />
        {search && <button type="button" className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded hover:bg-muted" onClick={() => onSearch("")} aria-label="Limpiar búsqueda"><X className="size-3.5" /></button>}
      </div>
      <Select value={categoryId} onChange={(event) => onCategory(event.target.value)} aria-label="Filtrar por categoría">
        <option value="">Todas las categorías</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
      </Select>
    </div>
  );
}

export function SaleCart({
  lines,
  customers,
  customerId,
  onCustomer,
  onQuantity,
  onRemove,
  onClear,
  onConfirm,
  confirming,
  confirmLabel = "Confirmar venta",
}: {
  lines: ComposerLine[];
  customers: Customer[];
  customerId: string | null;
  onCustomer: (value: string | null) => void;
  onQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onClear: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmLabel?: string;
}) {
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <div className="flex h-full min-h-[520px] flex-col rounded-xl border bg-white shadow-soft">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div><h2 className="font-semibold">Comprobante</h2><p className="text-xs text-muted-foreground">{units} {units === 1 ? "unidad" : "unidades"}</p></div>
          {lines.length > 0 && <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClear}><Trash2 />Vaciar</Button>}
        </div>
        <div className="mt-4">
          <label htmlFor="sale-customer" className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground"><UserRound className="size-3.5" /> Cliente opcional</label>
          <Select id="sale-customer" value={customerId ?? ""} onChange={(event) => onCustomer(event.target.value || null)}>
            <option value="">Consumidor final</option>
            {customers.filter((customer) => customer.status === "ACTIVE").map((customer) => {
              const name = customer.businessName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
              return <option key={customer.id} value={customer.id}>{name}</option>;
            })}
          </Select>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <div className="grid h-full min-h-60 place-items-center text-center"><div><span className="mx-auto grid size-11 place-items-center rounded-full bg-muted"><ShoppingBag className="size-5 text-muted-foreground" /></span><p className="mt-3 text-sm font-medium">El comprobante está vacío</p><p className="mt-1 text-xs text-muted-foreground">Agregá productos desde el catálogo.</p></div></div>
        ) : lines.map((line) => (
          <div key={line.variantId} className="rounded-lg border p-3">
            <div className="flex gap-3">
              <div className="size-10 shrink-0 overflow-hidden rounded bg-muted">{line.imageUrl && <img src={line.imageUrl} alt="" className="size-full object-cover" />}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.productName}</p><p className="truncate text-xs text-muted-foreground">{line.variantName}{line.sku ? ` · ${line.sku}` : ""}</p></div>
              <Button variant="ghost" size="icon-sm" onClick={() => onRemove(line.variantId)} aria-label={`Quitar ${line.productName}`}><X /></Button>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center rounded-md border">
                <button type="button" className="grid size-8 place-items-center text-muted-foreground hover:bg-muted disabled:opacity-40" onClick={() => onQuantity(line.variantId, line.quantity - 1)} disabled={line.quantity <= 1} aria-label="Restar unidad"><Minus className="size-3.5" /></button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                <button type="button" className="grid size-8 place-items-center text-muted-foreground hover:bg-muted disabled:opacity-40" onClick={() => onQuantity(line.variantId, line.quantity + 1)} disabled={line.quantity >= line.maxAvailable} aria-label="Sumar unidad"><Plus className="size-3.5" /></button>
              </div>
              <div className="text-right"><p className="text-sm font-semibold tabular-nums">{formatCurrency(line.unitPrice * line.quantity)}</p><p className="text-[11px] text-muted-foreground">{formatCurrency(line.unitPrice)} c/u</p></div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3 border-t p-4">
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">{formatCurrency(total)}</span></div>
        <div className="flex items-center justify-between border-t pt-3"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums">{formatCurrency(total)}</span></div>
        <Button className="w-full" size="lg" onClick={onConfirm} disabled={lines.length === 0 || confirming}>{confirming ? "Confirmando…" : confirmLabel}</Button>
        <p className="text-center text-[11px] leading-4 text-muted-foreground">La venta se registra sin cobro en esta etapa y descuenta stock al confirmarse.</p>
      </div>
    </div>
  );
}
