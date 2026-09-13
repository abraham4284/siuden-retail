import { useDeferredValue, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserX,
  UsersRound,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, CustomerKind, CustomerSource, CustomerStatus } from "@/domain/types";
import {
  useCustomerMutations,
  useCustomerQuery,
  useCustomersQuery,
  usePermission,
  useSalesQuery,
} from "@/hooks/use-services";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { CreateCustomerInput } from "@/services/contracts";

const optionalEmail = z.union([z.literal(""), z.email("Ingresá un email válido.")]);

const customerFormSchema = z
  .object({
    kind: z.enum(["INDIVIDUAL", "BUSINESS"]),
    firstName: z.string().trim().max(100, "Usá hasta 100 caracteres."),
    lastName: z.string().trim().max(100, "Usá hasta 100 caracteres."),
    businessName: z.string().trim().max(200, "Usá hasta 200 caracteres."),
    email: optionalEmail,
    phone: z
      .string()
      .trim()
      .max(40, "Usá hasta 40 caracteres.")
      .refine(
        (value) => value === "" || /^[+\d\s().-]+$/.test(value),
        "Ingresá un teléfono válido.",
      ),
    documentType: z.string(),
    documentNumber: z.string().trim().max(40, "Usá hasta 40 caracteres."),
    notes: z.string().trim().max(1000, "Usá hasta 1000 caracteres."),
  })
  .superRefine((values, context) => {
    if (values.kind === "INDIVIDUAL" && !values.firstName && !values.lastName) {
      context.addIssue({
        code: "custom",
        message: "Ingresá al menos el nombre o el apellido.",
        path: ["firstName"],
      });
    }
    if (values.kind === "BUSINESS" && !values.businessName) {
      context.addIssue({
        code: "custom",
        message: "Ingresá la razón social.",
        path: ["businessName"],
      });
    }
    if (Boolean(values.documentType) !== Boolean(values.documentNumber)) {
      context.addIssue({
        code: "custom",
        message: "Completá el tipo y el número de documento juntos.",
        path: values.documentType ? ["documentNumber"] : ["documentType"],
      });
    }
  });

type CustomerFormValues = z.infer<typeof customerFormSchema>;

const sourceLabels: Record<CustomerSource, string> = {
  STOREFRONT: "Tienda online",
  POS: "Punto de venta",
  ADMIN: "Administrador",
  IMPORT: "Importación",
};

const kindLabels: Record<CustomerKind, string> = {
  INDIVIDUAL: "Persona",
  BUSINESS: "Empresa",
};

function customerName(customer: Customer): string {
  if (customer.kind === "BUSINESS" && customer.businessName) {
    return customer.businessName;
  }
  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return name || customer.businessName || "Cliente sin nombre";
}

function customerInitials(customer: Customer): string {
  return customerName(customer)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("es-AR") ?? "")
    .join("");
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function formValues(customer?: Customer): CustomerFormValues {
  return {
    kind: customer?.kind ?? "INDIVIDUAL",
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    businessName: customer?.businessName ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    documentType: customer?.documentType ?? "",
    documentNumber: customer?.documentNumber ?? "",
    notes: customer?.notes ?? "",
  };
}

function customerInput(values: CustomerFormValues, customer?: Customer): CreateCustomerInput {
  return {
    source: customer?.source ?? "ADMIN",
    kind: values.kind,
    firstName: values.kind === "INDIVIDUAL" ? nullable(values.firstName) : null,
    lastName: values.kind === "INDIVIDUAL" ? nullable(values.lastName) : null,
    businessName: values.kind === "BUSINESS" ? nullable(values.businessName) : null,
    email: nullable(values.email),
    phone: nullable(values.phone),
    documentType: nullable(values.documentType),
    documentNumber: nullable(values.documentNumber),
    notes: nullable(values.notes),
  };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-destructive" role="alert">
      {message}
    </p>
  );
}

type CustomerFormProps = {
  customer?: Customer;
  pending: boolean;
  submitLabel: string;
  onSubmit: (input: CreateCustomerInput) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

function CustomerForm({
  customer,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  onDirtyChange,
}: CustomerFormProps) {
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: formValues(customer),
  });
  const kind = useWatch({ control: form.control, name: "kind" });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(customerInput(values, customer));
    } catch {
      // Mutation hooks surface the error and the mounted form intentionally keeps its values.
    }
  });

  const cancel = () => {
    if (isDirty && !window.confirm("¿Descartar los cambios sin guardar?")) return;
    onCancel();
  };

  return (
    <form className="space-y-5" onSubmit={submit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="customer-kind">Tipo de cliente</Label>
        <Select id="customer-kind" {...form.register("kind")}>
          <option value="INDIVIDUAL">Persona</option>
          <option value="BUSINESS">Empresa</option>
        </Select>
      </div>

      {kind === "INDIVIDUAL" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-first-name">Nombre</Label>
            <Input
              id="customer-first-name"
              autoComplete="given-name"
              aria-invalid={Boolean(form.formState.errors.firstName)}
              aria-describedby={form.formState.errors.firstName ? "customer-first-name-error" : undefined}
              {...form.register("firstName")}
            />
            <FieldError
              id="customer-first-name-error"
              message={form.formState.errors.firstName?.message}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-last-name">Apellido</Label>
            <Input
              id="customer-last-name"
              autoComplete="family-name"
              aria-invalid={Boolean(form.formState.errors.lastName)}
              aria-describedby={form.formState.errors.lastName ? "customer-last-name-error" : undefined}
              {...form.register("lastName")}
            />
            <FieldError
              id="customer-last-name-error"
              message={form.formState.errors.lastName?.message}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="customer-business-name">Razón social</Label>
          <Input
            id="customer-business-name"
            autoComplete="organization"
            aria-invalid={Boolean(form.formState.errors.businessName)}
            aria-describedby={form.formState.errors.businessName ? "customer-business-error" : undefined}
            {...form.register("businessName")}
          />
          <FieldError
            id="customer-business-error"
            message={form.formState.errors.businessName?.message}
          />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-email">Email</Label>
          <Input
            id="customer-email"
            type="email"
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            aria-invalid={Boolean(form.formState.errors.email)}
            aria-describedby={form.formState.errors.email ? "customer-email-error" : undefined}
            {...form.register("email")}
          />
          <FieldError id="customer-email-error" message={form.formState.errors.email?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">Teléfono</Label>
          <Input
            id="customer-phone"
            type="tel"
            autoComplete="tel"
            placeholder="+54 381 555 0101"
            aria-invalid={Boolean(form.formState.errors.phone)}
            aria-describedby={form.formState.errors.phone ? "customer-phone-error" : undefined}
            {...form.register("phone")}
          />
          <FieldError id="customer-phone-error" message={form.formState.errors.phone?.message} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="customer-document-type">Tipo de documento</Label>
          <Select
            id="customer-document-type"
            aria-invalid={Boolean(form.formState.errors.documentType)}
            aria-describedby={form.formState.errors.documentType ? "customer-document-type-error" : undefined}
            {...form.register("documentType")}
          >
            <option value="">Sin documento</option>
            <option value="DNI">DNI</option>
            <option value="CUIT">CUIT</option>
            <option value="PASSPORT">Pasaporte</option>
            <option value="OTHER">Otro</option>
          </Select>
          <FieldError
            id="customer-document-type-error"
            message={form.formState.errors.documentType?.message}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-document-number">Número</Label>
          <Input
            id="customer-document-number"
            inputMode="numeric"
            aria-invalid={Boolean(form.formState.errors.documentNumber)}
            aria-describedby={form.formState.errors.documentNumber ? "customer-document-number-error" : undefined}
            {...form.register("documentNumber")}
          />
          <FieldError
            id="customer-document-number-error"
            message={form.formState.errors.documentNumber?.message}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer-notes">Notas internas</Label>
        <Textarea
          id="customer-notes"
          rows={3}
          placeholder="Preferencias o información útil para el equipo…"
          aria-invalid={Boolean(form.formState.errors.notes)}
          aria-describedby={form.formState.errors.notes ? "customer-notes-error" : undefined}
          {...form.register("notes")}
        />
        <FieldError id="customer-notes-error" message={form.formState.errors.notes?.message} />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : null}
          {pending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PrivacyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50/70 p-4 text-sm text-sky-950">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-sky-700" aria-hidden="true" />
      <div>
        <p className="font-semibold">Datos de demostración</p>
        <p className="mt-0.5 leading-6 text-sky-800">
          Los clientes y sus operaciones son identidades ficticias creadas para probar el administrador.
        </p>
      </div>
    </div>
  );
}

export function CustomersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CustomerStatus | "ALL">("ALL");
  const [kind, setKind] = useState<CustomerKind | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDirty, setCreateDirty] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const canWrite = usePermission("customers.write");
  const customers = useCustomersQuery({
    search: deferredSearch || undefined,
    status,
    kind,
    page,
    pageSize: 12,
  });
  const mutations = useCustomerMutations();
  const result = customers.data;
  const hasFilters = Boolean(search) || status !== "ALL" || kind !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setStatus("ALL");
    setKind("ALL");
    setPage(1);
  };

  const requestCreateOpen = (open: boolean) => {
    if (!open && createDirty && !window.confirm("¿Descartar los datos del cliente sin guardar?")) {
      return;
    }
    setCreateOpen(open);
    if (!open) setCreateDirty(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Consultá la actividad y mantené actualizados los datos de contacto."
        actions={
          canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus /> Nuevo cliente
            </Button>
          ) : null
        }
      />

      <PrivacyNotice />

      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_220px_220px_auto]">
            <div className="relative">
              <UsersRound
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="pl-9"
                placeholder="Buscar por nombre, email o teléfono…"
                aria-label="Buscar clientes"
              />
            </div>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as CustomerStatus | "ALL");
                setPage(1);
              }}
              aria-label="Filtrar por estado"
            >
              <option value="ALL">Todos los estados</option>
              <option value="ACTIVE">Activos</option>
              <option value="BLOCKED">Bloqueados</option>
              <option value="ARCHIVED">Archivados</option>
            </Select>
            <Select
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as CustomerKind | "ALL");
                setPage(1);
              }}
              aria-label="Filtrar por tipo"
            >
              <option value="ALL">Personas y empresas</option>
              <option value="INDIVIDUAL">Personas</option>
              <option value="BUSINESS">Empresas</option>
            </Select>
            {hasFilters ? (
              <Button variant="ghost" onClick={clearFilters}>
                Limpiar
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <QueryState
        isLoading={customers.isLoading}
        isError={customers.isError}
        error={customers.error}
        onRetry={() => void customers.refetch()}
        isEmpty={Boolean(result && result.items.length === 0)}
        emptyFallback={
          <EmptyState
            title={hasFilters ? "No encontramos clientes" : "Todavía no hay clientes"}
            description={
              hasFilters
                ? "Probá con otros filtros o revisá el texto de búsqueda."
                : "Creá el primer cliente ficticio para comenzar la demostración."
            }
            icon={UsersRound}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : canWrite ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus /> Nuevo cliente
                </Button>
              ) : null
            }
          />
        }
      >
        {result ? (
          <>
            <Card className="hidden overflow-hidden md:block">
              <Table className="min-w-[860px]" scrollLabel="Listado de clientes">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead className="text-right">Ventas</TableHead>
                    <TableHead className="text-right">Total gastado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.items.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                            {customerInitials(customer)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="font-semibold hover:text-primary hover:underline"
                            >
                              {customerName(customer)}
                            </Link>
                            <p className="text-xs text-muted-foreground">{kindLabels[customer.kind]}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p>{customer.email ?? "Sin email"}</p>
                        <p className="text-xs text-muted-foreground">
                          {customer.phone ?? "Sin teléfono"}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sourceLabels[customer.source]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(customer.salesCount, 0)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={customer.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" asChild>
                          <Link
                            to={`/customers/${customer.id}`}
                            aria-label={`Ver cliente ${customerName(customer)}`}
                          >
                            <ArrowRight />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="grid gap-3 md:hidden">
              {result.items.map((customer) => (
                <Link
                  key={customer.id}
                  to={`/customers/${customer.id}`}
                  className="rounded-lg border bg-card p-4 shadow-soft transition-colors hover:border-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {customerInitials(customer)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{customerName(customer)}</p>
                          <p className="text-xs text-muted-foreground">
                            {kindLabels[customer.kind]} · {sourceLabels[customer.source]}
                          </p>
                        </div>
                        <StatusBadge status={customer.status} />
                      </div>
                      <p className="mt-3 truncate text-sm text-muted-foreground">
                        {customer.email ?? customer.phone ?? "Sin datos de contacto"}
                      </p>
                      <div className="mt-3 flex justify-between border-t pt-3 text-sm">
                        <span className="text-muted-foreground">
                          {customer.salesCount} ventas
                        </span>
                        <span className="font-semibold">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {result.totalPages > 1 ? (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Página {result.page} de {result.totalPages} · {result.total} clientes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ArrowLeft /> Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={result.page >= result.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Siguiente <ArrowRight />
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </QueryState>

      <Dialog open={createOpen} onOpenChange={requestCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
            <DialogDescription>
              Creá una identidad ficticia para usar en ventas de demostración.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            pending={mutations.create.isPending}
            submitLabel="Crear cliente"
            onDirtyChange={setCreateDirty}
            onCancel={() => {
              setCreateDirty(false);
              setCreateOpen(false);
            }}
            onSubmit={async (input) => {
              await mutations.create.mutateAsync(input);
              setCreateDirty(false);
              setCreateOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CustomerInformation({ customer }: { customer: Customer }) {
  const contactRows = [
    { label: "Email", value: customer.email, icon: Mail },
    { label: "Teléfono", value: customer.phone, icon: Phone },
    {
      label: "Documento",
      value:
        customer.documentType && customer.documentNumber
          ? `${customer.documentType} ${customer.documentNumber}`
          : null,
      icon: UserRound,
    },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Datos del cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactRows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-0.5 text-sm">{value ?? "Sin informar"}</p>
              </div>
            </div>
          ))}
          <div className="border-t pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Notas internas
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
              {customer.notes ?? "No hay notas para este cliente."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direcciones</CardTitle>
        </CardHeader>
        <CardContent>
          {customer.addresses.length === 0 ? (
            <EmptyState
              compact
              className="min-h-44 border-0 bg-muted/35"
              title="Sin direcciones cargadas"
              description="Este cliente todavía no tiene una dirección asociada."
              icon={MapPin}
            />
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((address) => (
                <div key={address.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {address.label ?? (address.isDefault ? "Dirección principal" : "Dirección")}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {address.street} {address.number ?? "s/n"}
                        {address.floor ? `, piso ${address.floor}` : ""}
                        {address.apartment ? `, depto. ${address.apartment}` : ""}
                        <br />
                        {address.city}, {address.province}
                        {address.postalCode ? ` (${address.postalCode})` : ""}
                      </p>
                    </div>
                    {address.isDefault ? <StatusBadge status="ACTIVE" label="Principal" /> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerSalesHistory({ customerId }: { customerId: string }) {
  const sales = useSalesQuery({ customerId, pageSize: 10 });
  const items = sales.data?.items ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Historial de ventas</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Operaciones vinculadas a este cliente ficticio.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/sales?customerId=${customerId}`}>
            Ver todas <ArrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <QueryState
          isLoading={sales.isLoading}
          isError={sales.isError}
          error={sales.error}
          onRetry={() => void sales.refetch()}
          isEmpty={Boolean(sales.data && items.length === 0)}
          loadingFallback={<div className="px-5 pb-5 text-sm text-muted-foreground">Cargando ventas…</div>}
          emptyFallback={
            <EmptyState
              compact
              className="m-5 mt-0 min-h-40 border-0 bg-muted/35"
              title="Sin ventas asociadas"
              description="Podés seleccionar este cliente al registrar una nueva venta."
              icon={ReceiptText}
            />
          }
        >
          <Table className="min-w-[720px]" scrollLabel="Ventas del cliente">
            <TableHeader>
              <TableRow>
                <TableHead>Venta</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(sale.soldAt ?? sale.createdAt)}
                  </TableCell>
                  <TableCell>{sale.channel === "POS" ? "Punto de venta" : "Manual"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(
                      sale.items.reduce((total, item) => total + item.quantity, 0),
                    )}
                  </TableCell>
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
        </QueryState>
      </CardContent>
    </Card>
  );
}

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const customerQuery = useCustomerQuery(customerId);
  const mutations = useCustomerMutations(customerId);
  const canWrite = usePermission("customers.write");
  const [editing, setEditing] = useState(false);
  const customer = customerQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer ? customerName(customer) : "Detalle del cliente"}
        description={
          customer
            ? `${kindLabels[customer.kind]} · Alta ${formatDate(customer.createdAt)}`
            : "Información y actividad del cliente."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/customers">
                <ArrowLeft /> Volver
              </Link>
            </Button>
            {customer && canWrite && !editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant={customer.status === "BLOCKED" ? "outline" : "destructive"}>
                      {customer.status === "BLOCKED" ? <UserCheck /> : <UserX />}
                      {customer.status === "BLOCKED" ? "Desbloquear" : "Bloquear"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {customer.status === "BLOCKED" ? "¿Desbloquear cliente?" : "¿Bloquear cliente?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {customer.status === "BLOCKED"
                          ? "El cliente volverá a quedar disponible para las operaciones del comercio."
                          : "El historial se conservará, pero el cliente quedará marcado como bloqueado."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={mutations.setStatus.isPending}>
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        disabled={mutations.setStatus.isPending}
                        className={buttonVariants({
                          variant: customer.status === "BLOCKED" ? "default" : "destructive",
                        })}
                        onClick={() =>
                          mutations.setStatus.mutate(
                            customer.status === "BLOCKED" ? "ACTIVE" : "BLOCKED",
                          )
                        }
                      >
                        {mutations.setStatus.isPending ? "Guardando…" : "Confirmar"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : null}
          </div>
        }
      />

      <QueryState
        isLoading={customerQuery.isLoading}
        isError={customerQuery.isError}
        error={customerQuery.error}
        onRetry={() => void customerQuery.refetch()}
        isEmpty={!customer}
        emptyFallback={
          <EmptyState
            title="Cliente no disponible"
            description="Volvé al listado para seleccionar otro cliente."
            icon={UserRound}
            action={
              <Button variant="outline" asChild>
                <Link to="/customers">Volver a clientes</Link>
              </Button>
            }
          />
        }
      >
        {customer ? (
          <div className="space-y-6">
            <PrivacyNotice />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Estado"
                value={<StatusBadge status={customer.status} />}
                icon={customer.status === "BLOCKED" ? UserX : UserCheck}
                tone={customer.status === "BLOCKED" ? "danger" : "success"}
              />
              <StatCard
                label="Ventas confirmadas"
                value={formatNumber(customer.salesCount, 0)}
                icon={ReceiptText}
              />
              <StatCard
                label="Total gastado"
                value={formatCurrency(customer.totalSpent)}
                icon={CircleDollarSign}
                tone="success"
              />
              <StatCard
                label="Cliente desde"
                value={formatDate(customer.createdAt)}
                icon={CalendarDays}
              />
            </div>

            {editing ? (
              <Card>
                <CardHeader>
                  <CardTitle>Editar cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <CustomerForm
                    key={customer.id}
                    customer={customer}
                    pending={mutations.update.isPending}
                    submitLabel="Guardar cambios"
                    onCancel={() => setEditing(false)}
                    onSubmit={async (input) => {
                      await mutations.update.mutateAsync(input);
                      setEditing(false);
                    }}
                  />
                </CardContent>
              </Card>
            ) : (
              <CustomerInformation customer={customer} />
            )}

            <CustomerSalesHistory customerId={customer.id} />

            <Card>
              <CardContent className="flex flex-col gap-3 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Origen: <strong className="font-medium text-foreground">{sourceLabels[customer.source]}</strong>
                </span>
                <span>
                  Última actualización: {formatDateTime(customer.updatedAt)}
                </span>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </QueryState>
    </div>
  );
}
