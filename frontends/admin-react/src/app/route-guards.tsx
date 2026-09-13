import { LoaderCircle, LockKeyhole } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePermission, useSessionQuery, useTenantFeature } from "@/hooks/use-services";
import type { PermissionCode, TenantFeatureCode } from "@/domain/types";

export function ProtectedRoute() {
  const session = useSessionQuery();
  const location = useLocation();

  if (session.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-5 animate-spin text-primary" aria-hidden="true" />
          Restaurando tu sesión…
        </div>
      </main>
    );
  }

  if (session.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 p-4">
        <Card className="max-w-md">
          <CardContent className="space-y-4 pt-6 text-center">
            <p className="font-semibold">No pudimos restaurar la sesión</p>
            <p className="text-sm text-muted-foreground">Revisá la conexión e intentá nuevamente.</p>
            <Button onClick={() => session.refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export function CapabilityRoute({
  permission,
  feature,
}: {
  permission?: PermissionCode;
  feature?: TenantFeatureCode;
}) {
  const hasPermission = usePermission(permission ?? "store.read");
  const hasFeature = useTenantFeature(feature ?? "CATALOG");
  const allowed = (permission ? hasPermission : true) && (feature ? hasFeature : true);

  if (!allowed) {
    return (
      <div className="grid min-h-[60vh] place-items-center p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
            <LockKeyhole className="size-5" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-semibold">Acceso no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu rol o el plan del comercio no habilitan esta sección.
          </p>
          <Button className="mt-5" variant="outline" asChild>
            <a href="/dashboard">Volver al dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
