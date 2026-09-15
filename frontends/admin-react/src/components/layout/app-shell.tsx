import { useMemo, useState, type ComponentType, type CSSProperties } from "react";
import {
  ArchiveRestore,
  Building2,
  Boxes,
  ChevronRight,
  ContactRound,
  ExternalLink,
  Gem,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Percent,
  ReceiptText,
  Settings2,
  ShoppingBasket,
  Tags,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useLogoutMutation,
  usePermission,
  useResetDemoMutation,
  useSessionQuery,
  useStoreQueries,
  useTenantFeature,
} from "@/hooks/use-services";
import type { PermissionCode, TenantFeatureCode } from "@/domain/types";

type NavigationItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  permission?: PermissionCode;
  feature?: TenantFeatureCode;
};

const navigation: Array<{ label: string; items: NavigationItem[] }> = [
  {
    label: "Plataforma",
    items: [{ label: "Cuentas", to: "/accounts", icon: Building2, permission: "accounts.manage" }],
  },
  {
    label: "Inicio",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Catálogo",
    items: [
      { label: "Productos", to: "/products", icon: PackageSearch, permission: "products.read", feature: "CATALOG" },
      { label: "Categorías", to: "/categories", icon: Tags, permission: "products.read", feature: "CATALOG" },
      { label: "Actualización de precios", to: "/products/price-adjustment", icon: Percent, permission: "products.write", feature: "CATALOG" },
    ],
  },
  {
    label: "Inventario",
    items: [
      { label: "Existencias", to: "/inventory", icon: Warehouse, permission: "inventory.read", feature: "INVENTORY" },
      { label: "Movimientos", to: "/inventory/movements", icon: Boxes, permission: "inventory.read", feature: "INVENTORY" },
    ],
  },
  {
    label: "Ventas",
    items: [
      { label: "Ventas", to: "/sales", icon: ReceiptText, permission: "sales.read", feature: "SALES" },
      { label: "Punto de venta", to: "/pos", icon: ShoppingBasket, permission: "pos.use", feature: "POS" },
      { label: "Clientes", to: "/customers", icon: UsersRound, permission: "customers.read", feature: "CUSTOMERS" },
    ],
  },
  {
    label: "Mi comercio",
    items: [
      { label: "Información y apariencia", to: "/settings/store", icon: Settings2, permission: "store.read" },
      { label: "Contacto y redes", to: "/settings/contact", icon: ContactRound, permission: "store.read" },
    ],
  },
];

const breadcrumbNames: Record<string, string> = {
  dashboard: "Dashboard",
  accounts: "Cuentas",
  products: "Productos",
  new: "Nuevo",
  edit: "Editar",
  "price-adjustment": "Actualización de precios",
  categories: "Categorías",
  inventory: "Inventario",
  movements: "Movimientos",
  customers: "Clientes",
  sales: "Ventas",
  pos: "Punto de venta",
  settings: "Mi comercio",
  store: "Información y apariencia",
  contact: "Contacto y redes",
};

function hexToHslTriplet(hex: string): string | null {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex.trim());
  if (!match) return null;
  const red = Number.parseInt(match[1]!, 16) / 255;
  const green = Number.parseInt(match[2]!, 16) / 255;
  const blue = Number.parseInt(match[3]!, 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;
  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  if (hue < 0) hue += 360;
  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

function AuthorizedNavItem({ item, collapsed, onNavigate }: { item: NavigationItem; collapsed: boolean; onNavigate?: () => void }) {
  const allowedByPermission = usePermission(item.permission ?? "store.read");
  const allowedByFeature = useTenantFeature(item.feature ?? "CATALOG");
  if ((item.permission && !allowedByPermission) || (item.feature && !allowedByFeature)) return null;

  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950",
          isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
          collapsed && "justify-center px-0",
        )
      }
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

function Sidebar({
  collapsed,
  mobile,
  onCollapse,
  onClose,
}: {
  collapsed: boolean;
  mobile?: boolean;
  onCollapse: () => void;
  onClose: () => void;
}) {
  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-slate-200 bg-white transition-[width] duration-200",
        collapsed && !mobile ? "w-[76px]" : "w-[270px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center border-b px-5", collapsed && !mobile ? "justify-center px-2" : "justify-between")}>
        <Link to="/dashboard" className="flex items-center gap-2.5" aria-label="Ir al dashboard">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Gem className="size-4.5" aria-hidden="true" />
          </span>
          {(!collapsed || mobile) && (
            <span className="text-sm font-bold tracking-wide text-slate-950">
              SIUDEN <span className="font-normal text-slate-500">Retail</span>
            </span>
          )}
        </Link>
        {mobile && (
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Cerrar navegación">
            <X />
          </Button>
        )}
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        {navigation.map((group) => (
          <div key={group.label}>
            {!collapsed || mobile ? (
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{group.label}</p>
            ) : (
              <div className="mx-auto mb-2 h-px w-7 bg-slate-200" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => (
                <AuthorizedNavItem key={item.to} item={item} collapsed={collapsed && !mobile} onNavigate={mobile ? onClose : undefined} />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {!mobile && (
        <div className="border-t p-3">
          <Button
            variant="ghost"
            className={cn("w-full text-muted-foreground", collapsed ? "px-0" : "justify-start")}
            onClick={onCollapse}
            aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
          >
            {collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /><span>Contraer menú</span></>}
          </Button>
        </div>
      )}
    </aside>
  );
}

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: session } = useSessionQuery();
  const store = useStoreQueries();
  const logout = useLogoutMutation();
  const reset = useResetDemoMutation();

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    return parts.map((part, index) => ({
      label: breadcrumbNames[part] ?? (index === parts.length - 1 ? "Detalle" : part),
      to: `/${parts.slice(0, index + 1).join("/")}`,
    }));
  }, [location.pathname]);

  const brandName = store.profile.data?.brandName ?? session?.tenant.name ?? "Rubí Joyería";
  const primaryColor = store.theme.data?.primaryColor ?? session?.tenant.primaryColor ?? "#7f2942";
  const primaryHsl = hexToHslTriplet(primaryColor) ?? "343 41% 39%";

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ "--tenant-accent": primaryColor, "--primary": primaryHsl, "--ring": primaryHsl } as CSSProperties}
    >
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} onClose={() => undefined} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="Cerrar navegación" />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            <Sidebar collapsed={false} mobile onCollapse={() => undefined} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-[270px]")}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/95 px-4 backdrop-blur sm:px-6">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir navegación">
            <Menu />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 overflow-hidden text-xs text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">Inicio</Link>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.to} className="flex min-w-0 items-center gap-1.5">
                  <ChevronRight className="size-3 shrink-0" />
                  {index === breadcrumbs.length - 1 ? (
                    <span className="truncate font-medium text-foreground">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.to} className="truncate hover:text-foreground">{crumb.label}</Link>
                  )}
                </span>
              ))}
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{brandName}</p>
          </div>

          <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
            <a href="https://rubijoyeria.empretienda.com.ar" target="_blank" rel="noreferrer">
              Ver tienda <ExternalLink />
            </a>
          </Button>

          <div className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg p-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
            >
              <span className="grid size-8 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">MR</span>
              <span className="hidden leading-tight md:block">
                <span className="block text-xs font-semibold">{session?.user.displayName ?? "Marina Rubí"}</span>
                <span className="block text-[11px] text-muted-foreground">{session?.membership.role ?? "ADMIN"}</span>
              </span>
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border bg-white p-2 shadow-xl" role="menu">
                <div className="border-b px-3 pb-3 pt-2">
                  <p className="text-sm font-semibold">{session?.user.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{session?.user.email}</p>
                </div>
                {import.meta.env.VITE_USE_MOCKS === "true" ? <button
                  className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted"
                  role="menuitem"
                  onClick={async () => {
                    if (!window.confirm("¿Restablecer todos los datos de demostración? Los cambios locales se perderán.")) return;
                    await reset.mutateAsync();
                    setAccountOpen(false);
                    navigate("/dashboard", { replace: true });
                  }}
                  disabled={reset.isPending}
                >
                  <ArchiveRestore className="size-4" />
                  {reset.isPending ? "Restableciendo…" : "Restablecer datos de demostración"}
                </button> : null}
                <a
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-muted sm:hidden"
                  href="https://rubijoyeria.empretienda.com.ar"
                  target="_blank"
                  rel="noreferrer"
                  role="menuitem"
                >
                  <ExternalLink className="size-4" /> Ver tienda
                </a>
                <button
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  role="menuitem"
                  onClick={async () => {
                    await logout.mutateAsync();
                    navigate("/login", { replace: true });
                  }}
                  disabled={logout.isPending}
                >
                  <LogOut className="size-4" /> {logout.isPending ? "Cerrando…" : "Cerrar sesión"}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 xl:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
