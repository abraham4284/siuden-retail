import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Gem, LoaderCircle, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorMessage, useLoginMutation, useSessionQuery } from "@/hooks/use-services";

const loginSchema = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(1, "Ingresá tu contraseña."),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const session = useSessionQuery();
  const login = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "admin@rubi.local", password: "" },
  });

  if (session.data) return <Navigate to="/dashboard" replace />;

  const submit = form.handleSubmit(async (values) => {
    await login.mutateAsync(values);
    const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";
    navigate(destination, { replace: true });
  });

  return (
    <main className="relative flex min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_15%_15%,rgba(148,43,69,.45),transparent_36%),radial-gradient(circle_at_85%_85%,rgba(255,255,255,.09),transparent_34%)]" />
      <section className="relative hidden w-[48%] flex-col justify-between p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-sm font-semibold tracking-wide">
          <span className="grid size-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Gem className="size-5" aria-hidden="true" />
          </span>
          SIUDEN <span className="font-normal text-white/65">Retail</span>
        </div>
        <div className="max-w-lg pb-10">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.22em] text-rose-200">Tu comercio, en orden</p>
          <h1 className="text-balance text-5xl font-semibold leading-[1.08] tracking-tight">
            Gestioná Rubí con una vista clara de cada movimiento.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-300">
            Catálogo, inventario, clientes y ventas conectados en un mismo lugar.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
          Sesión protegida y aislada por comercio
        </div>
      </section>

      <section className="relative flex flex-1 items-center justify-center bg-slate-50 px-5 py-10 lg:rounded-l-[2rem]">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Gem className="size-5" aria-hidden="true" />
            </span>
            <span className="font-semibold tracking-wide">SIUDEN <span className="font-normal text-muted-foreground">Retail</span></span>
          </div>
          <Card className="border-0 shadow-soft sm:border">
            <CardHeader className="space-y-2 pb-5">
              <div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <span className="text-lg font-bold">R</span>
              </div>
              <CardTitle className="text-2xl">Ingresá a tu comercio</CardTitle>
              <CardDescription>Usá tu cuenta para administrar Rubí Joyería.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={submit} noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(form.formState.errors.email)}
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive" role="alert">{form.formState.errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="pr-11"
                      aria-invalid={Boolean(form.formState.errors.password)}
                      {...form.register("password")}
                    />
                    <button
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive" role="alert">{form.formState.errors.password.message}</p>
                  )}
                </div>

                {login.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
                    {errorMessage(login.error)}
                  </div>
                )}

                <Button className="w-full" size="lg" type="submit" disabled={login.isPending}>
                  {login.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
                  {login.isPending ? "Ingresando…" : "Ingresar"}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                La sesión se conecta de forma segura con la API de Siuden Retail.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
