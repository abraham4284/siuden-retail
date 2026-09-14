import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, LoaderCircle, Plus } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { QueryState } from "@/components/shared/query-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { errorMessage, useAccountsQuery, useCreateAccountMutation } from "@/hooks/use-services";

const accountSchema = z
  .object({
    accountName: z.string().trim().min(2, "Ingresá el nombre de la cuenta.").max(150),
    tenantName: z.string().trim().min(2, "Ingresá el nombre de la tienda.").max(150),
    slug: z
      .string()
      .trim()
      .min(2, "Ingresá el slug.")
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Usá minúsculas, números y guiones."),
    defaultCurrency: z.string().regex(/^[A-Z]{3}$/, "Ingresá una moneda ISO de tres letras."),
    timeZone: z.string().trim().min(1, "Ingresá la zona horaria.").max(80),
    createOwner: z.boolean(),
    ownerEmail: z.string(),
    ownerPassword: z.string(),
    ownerDisplayName: z.string(),
  })
  .superRefine((values, context) => {
    if (!values.createOwner) return;
    if (!z.email().safeParse(values.ownerEmail).success) {
      context.addIssue({ code: "custom", path: ["ownerEmail"], message: "Ingresá un email válido." });
    }
    if (values.ownerPassword.length < 12) {
      context.addIssue({ code: "custom", path: ["ownerPassword"], message: "Usá al menos 12 caracteres." });
    }
    if (values.ownerDisplayName.trim().length < 2) {
      context.addIssue({ code: "custom", path: ["ownerDisplayName"], message: "Ingresá el nombre del propietario." });
    }
  });

type AccountFormValues = z.infer<typeof accountSchema>;

export function AccountsPage() {
  const accounts = useAccountsQuery();
  const createAccount = useCreateAccountMutation();
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      accountName: "",
      tenantName: "",
      slug: "",
      defaultCurrency: "ARS",
      timeZone: "America/Argentina/Buenos_Aires",
      createOwner: true,
      ownerEmail: "",
      ownerPassword: "",
      ownerDisplayName: "",
    },
  });
  const createOwner = useWatch({ control: form.control, name: "createOwner" });

  const submit = form.handleSubmit(async (values) => {
    await createAccount.mutateAsync({
      accountName: values.accountName,
      tenantName: values.tenantName,
      slug: values.slug,
      defaultCurrency: values.defaultCurrency,
      timeZone: values.timeZone,
      owner: values.createOwner
        ? {
            email: values.ownerEmail,
            password: values.ownerPassword,
            displayName: values.ownerDisplayName,
          }
        : undefined,
    });
    form.reset();
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Cuentas"
        description="Creá cuentas, su primera tienda y el propietario que administrará cada comercio."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Cuentas registradas</CardTitle>
            <CardDescription>Solo el administrador global puede consultar esta información.</CardDescription>
          </CardHeader>
          <CardContent>
            <QueryState
              isLoading={accounts.isPending}
              isError={accounts.isError}
              error={accounts.error}
              onRetry={() => accounts.refetch()}
              isEmpty={accounts.data?.items.length === 0}
              emptyFallback={
                <EmptyState
                  icon={Building2}
                  title="Todavía no hay cuentas"
                  description="Usá el formulario para crear la primera."
                />
              }
            >
              <div className="space-y-3">
                {accounts.data?.items.map((account) => (
                  <div key={account.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{account.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{account.id}</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {account.status}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 border-t pt-3 text-sm text-muted-foreground">
                      {account.tenants.map((tenant) => (
                        <p key={tenant.id}>
                          {tenant.name} · <span className="font-mono text-xs">{tenant.slug}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </QueryState>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nueva cuenta</CardTitle>
            <CardDescription>La API crea la cuenta, el tenant y todos los roles en una transacción.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={submit} noValidate>
              <Field label="Nombre de la cuenta" error={form.formState.errors.accountName?.message}>
                <Input {...form.register("accountName")} autoComplete="organization" />
              </Field>
              <Field label="Nombre de la tienda" error={form.formState.errors.tenantName?.message}>
                <Input {...form.register("tenantName")} />
              </Field>
              <Field label="Slug" error={form.formState.errors.slug?.message}>
                <Input {...form.register("slug")} placeholder="mi-joyeria" autoCapitalize="none" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Moneda" error={form.formState.errors.defaultCurrency?.message}>
                  <Input {...form.register("defaultCurrency")} maxLength={3} />
                </Field>
                <Field label="Zona horaria" error={form.formState.errors.timeZone?.message}>
                  <Input {...form.register("timeZone")} />
                </Field>
              </div>

              <div className="rounded-xl border bg-muted/25 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Crear propietario</p>
                    <p className="text-xs text-muted-foreground">Recibirá el rol OWNER en esta cuenta.</p>
                  </div>
                  <Switch
                    checked={createOwner}
                    onCheckedChange={(checked) => form.setValue("createOwner", checked)}
                  />
                </div>
                {createOwner && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <Field label="Nombre" error={form.formState.errors.ownerDisplayName?.message}>
                      <Input {...form.register("ownerDisplayName")} autoComplete="name" />
                    </Field>
                    <Field label="Email" error={form.formState.errors.ownerEmail?.message}>
                      <Input {...form.register("ownerEmail")} type="email" autoComplete="email" />
                    </Field>
                    <Field label="Contraseña inicial" error={form.formState.errors.ownerPassword?.message}>
                      <Input {...form.register("ownerPassword")} type="password" autoComplete="new-password" />
                    </Field>
                  </div>
                )}
              </div>

              {createAccount.error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                  {errorMessage(createAccount.error)}
                </p>
              )}
              <Button className="w-full" type="submit" disabled={createAccount.isPending}>
                {createAccount.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
                {createAccount.isPending ? "Creando cuenta…" : "Crear cuenta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </label>
  );
}
