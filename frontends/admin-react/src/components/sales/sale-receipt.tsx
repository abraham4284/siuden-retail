import { CheckCircle2, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Sale } from "@/domain/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

export function SaleReceiptDialog({ sale, open, onOpenChange }: { sale: Sale | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print:static print:max-h-none print:w-full print:max-w-none print:translate-x-0 print:translate-y-0 print:border-0 print:shadow-none">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="size-5" /></span>
            <div><DialogTitle>Venta confirmada</DialogTitle><DialogDescription>El inventario y el movimiento se actualizaron correctamente.</DialogDescription></div>
          </div>
        </DialogHeader>
        {sale && (
          <div className="rounded-xl border bg-white p-5" id="sale-receipt">
            <div className="flex items-start justify-between border-b pb-4">
              <div><p className="text-xs font-semibold tracking-[.16em] text-primary">RUBÍ JOYERÍA</p><p className="mt-1 text-sm text-muted-foreground">Comprobante interno</p></div>
              <ReceiptText className="size-6 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-b py-4 text-sm">
              <div><p className="text-xs text-muted-foreground">Venta</p><p className="mt-1 font-semibold">{sale.saleNumber}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Fecha</p><p className="mt-1 font-medium">{formatDateTime(sale.soldAt)}</p></div>
              <div><p className="text-xs text-muted-foreground">Cliente</p><p className="mt-1 font-medium">{sale.customerNameSnapshot ?? "Consumidor final"}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Canal</p><p className="mt-1 font-medium">{sale.channel === "POS" ? "Punto de venta" : "Venta manual"}</p></div>
            </div>
            <div className="divide-y py-2">
              {sale.items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div><p className="font-medium">{item.productNameSnapshot}</p><p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p></div>
                  <p className="font-semibold tabular-nums">{formatCurrency(item.lineTotal)}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t pt-4"><span className="font-semibold">Total</span><span className="text-xl font-bold tabular-nums">{formatCurrency(sale.total, { currency: sale.currency })}</span></div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">Estado de pago: sin cobrar</p>
          </div>
        )}
        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          <Button onClick={() => window.print()}><Printer />Imprimir comprobante</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
