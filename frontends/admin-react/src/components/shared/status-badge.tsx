import { Badge, type BadgeProps } from "@/components/ui/badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Activo", variant: "success" },
  ARCHIVED: { label: "Archivado", variant: "neutral" },
  BLOCKED: { label: "Bloqueado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
  CONFIRMED: { label: "Confirmada", variant: "success" },
  DRAFT: { label: "Borrador", variant: "neutral" },
  ENABLED: { label: "Habilitado", variant: "success" },
  IN_STOCK: { label: "Con stock", variant: "success" },
  INVITED: { label: "Invitado", variant: "info" },
  LOW_STOCK: { label: "Stock bajo", variant: "warning" },
  NOT_TRACKED: { label: "Sin seguimiento", variant: "neutral" },
  OUT_OF_STOCK: { label: "Sin stock", variant: "destructive" },
  PAID: { label: "Pagada", variant: "success" },
  PARTIAL: { label: "Pago parcial", variant: "warning" },
  PENDING: { label: "Pendiente", variant: "warning" },
  POSTED: { label: "Registrado", variant: "success" },
  PUBLISHED: { label: "Publicado", variant: "success" },
  REFUNDED: { label: "Reintegrada", variant: "info" },
  REVERSED: { label: "Revertido", variant: "neutral" },
  SUSPENDED: { label: "Suspendido", variant: "warning" },
  TRIAL: { label: "Prueba", variant: "info" },
  UNPAID: { label: "Sin cobrar", variant: "neutral" },
};

function humanizeStatus(status: string): string {
  return status
    .toLocaleLowerCase("es-AR")
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toLocaleUpperCase("es-AR"));
}

type StatusBadgeProps = Omit<BadgeProps, "children" | "variant"> & {
  status: string;
  label?: string;
  variant?: BadgeVariant;
};

function StatusBadge({ status, label, variant, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status.toLocaleUpperCase("en-US")];
  return (
    <Badge variant={variant ?? config?.variant ?? "outline"} {...props}>
      {label ?? config?.label ?? humanizeStatus(status)}
    </Badge>
  );
}

export { StatusBadge, type StatusBadgeProps };
