"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getCategoryHref, getCategoryTree, type CategoryNode } from "@/lib/categories";
import { getContactUrl } from "@/lib/contact";
import { formatPrice } from "@/lib/currency";
import {
  getStorefrontSession,
  logoutStorefrontCustomer,
  type StorefrontSession,
} from "@/lib/storefront-auth";
import type { StoreCategory, StoreProduct } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
import {
  ChevronDownIcon,
  CloseIcon,
  InstagramIcon,
  MenuIcon,
  SearchIcon,
  WhatsappIcon,
} from "./icons";
import { AuthModal, type AuthView } from "./auth-modal";
import { MobileMenu } from "./mobile-menu";

type StoreHeaderProps = {
  allCategories: StoreCategory[];
  basePath?: string;
  products: StoreProduct[];
  tenant: TenantConfig;
};

type CategoryMenuItemsProps = {
  allCategories: StoreCategory[];
  basePath: string;
  nodes: CategoryNode[];
};

function CategoryMenuItems({ allCategories, basePath, nodes }: CategoryMenuItemsProps) {
  return nodes.map((node) => (
    <div className="group/category-item relative" key={node.id}>
      <Link
        className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--store-background)] hover:text-[var(--store-primary)]"
        href={getCategoryHref(node, allCategories, basePath)}
      >
        {node.name}
        {node.children.length > 0 ? <ChevronDownIcon className="size-4 -rotate-90" /> : null}
      </Link>
      {node.children.length > 0 ? (
        <div className="absolute left-full top-0 z-10 hidden min-w-56 border-l border-[var(--store-hairline)] bg-[var(--store-surface)] p-2 shadow-[0_18px_45px_var(--store-shadow)] group-hover/category-item:block group-focus-within/category-item:block">
          <CategoryMenuItems allCategories={allCategories} basePath={basePath} nodes={node.children} />
        </div>
      ) : null}
    </div>
  ));
}

export function StoreHeader({ allCategories, basePath = "", products, tenant }: StoreHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [authView, setAuthView] = useState<AuthView | null>(null);
  const [customerSession, setCustomerSession] = useState<StorefrontSession | null>(null);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const instagramUrl = getContactUrl(tenant, "INSTAGRAM");
  const brandInitial = tenant.shortName.trim().charAt(0).toLocaleUpperCase("es");
  const whatsappUrl = getContactUrl(tenant, "WHATSAPP");
  const categoryTree = useMemo(() => getCategoryTree(allCategories), [allCategories]);
  const homeHref = basePath ? `${basePath}/` : "/";

  const results = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");

    if (!normalizedQuery) {
      return products.slice(0, 4);
    }

    return products
      .filter((product) =>
        [product.name, product.material, product.description]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("es").includes(normalizedQuery)),
      )
      .slice(0, 6);
  }, [products, query]);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    const syncAuthViewWithHash = () => {
      if (window.location.hash === "#register-modal") setAuthView("register");
      if (window.location.hash === "#login-modal") setAuthView("login");
    };

    syncAuthViewWithHash();
    window.addEventListener("hashchange", syncAuthViewWithHash);
    return () => window.removeEventListener("hashchange", syncAuthViewWithHash);
  }, []);

  useEffect(() => {
    if (!tenant.storefront.account?.enabled) return;
    let active = true;
    void getStorefrontSession().then((session) => {
      if (active && (!session || session.tenant.slug === tenant.slug)) {
        setCustomerSession(session);
      }
    });
    return () => {
      active = false;
    };
  }, [tenant.slug, tenant.storefront.account?.enabled]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);

        if (isSearchOpen) {
          setIsSearchOpen(false);
          setQuery("");
          requestAnimationFrame(() => searchTriggerRef.current?.focus());
        }
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isSearchOpen]);

  const closeSearch = (restoreFocus = true) => {
    setIsSearchOpen(false);
    setQuery("");

    if (restoreFocus) {
      requestAnimationFrame(() => searchTriggerRef.current?.focus());
    }
  };

  const openAuth = (view: AuthView) => {
    setIsMenuOpen(false);
    closeSearch(false);
    setAuthView(view);
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${view}-modal`);
  };

  const closeAuth = () => {
    setAuthView(null);

    if (["#register-modal", "#login-modal"].includes(window.location.hash)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  };

  return (
    <>
      <header className="store-header sticky top-0 z-40 border-b border-[var(--store-hairline)] backdrop-blur-md">
        {tenant.storefront.account?.enabled ? (
          <div className="border-b border-[var(--store-hairline)] bg-[var(--store-surface)]/80">
            <div className="store-container flex min-h-9 items-center justify-end gap-2 text-xs text-[var(--store-muted)] sm:justify-start sm:text-sm">
              {customerSession ? (
                <>
                  <span>Hola, {customerSession.customer.firstName ?? customerSession.user.displayName}</span>
                  <span aria-hidden="true">|</span>
                  <button
                    className="transition-colors hover:text-[var(--store-primary)] hover:underline"
                    onClick={async () => {
                      await logoutStorefrontCustomer();
                      setCustomerSession(null);
                    }}
                    type="button"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <button className="transition-colors hover:text-[var(--store-primary)] hover:underline" onClick={() => openAuth("register")} type="button">
                    Crear cuenta
                  </button>
                  <span aria-hidden="true">|</span>
                  <button className="transition-colors hover:text-[var(--store-primary)] hover:underline" onClick={() => openAuth("login")} type="button">
                    Iniciar sesión
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
        <div className="store-container flex h-[4.75rem] items-center justify-between gap-6 lg:h-24">
          <Link
            aria-label={`${tenant.name}, inicio`}
            className="group flex shrink-0 items-center gap-3"
            href={`${homeHref}#inicio`}
          >
            <span className="grid size-9 place-items-center rounded-full border border-[var(--store-accent)] font-[family-name:var(--store-heading-font)] text-xl italic text-[var(--store-primary)] transition-colors group-hover:bg-[var(--store-primary)] group-hover:text-white">
              {brandInitial}
            </span>
            <span className="font-[family-name:var(--store-heading-font)] text-[1.65rem] tracking-[0.08em] sm:text-[1.8rem]">
              {tenant.shortName}
            </span>
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-8 text-sm lg:flex xl:gap-10">
            <Link className="nav-link" href={`${homeHref}#inicio`}>Inicio</Link>
            <Link className="nav-link" href={`${homeHref}#productos`}>Productos</Link>
            <details className="category-menu relative">
              <summary className="nav-link flex cursor-pointer list-none items-center gap-1.5">
                Categorías <ChevronDownIcon className="size-4" />
              </summary>
              <div className="absolute left-1/2 top-[calc(100%+1.5rem)] w-56 -translate-x-1/2 bg-[var(--store-surface)] p-2 shadow-[0_18px_45px_var(--store-shadow)]">
                <CategoryMenuItems allCategories={allCategories} basePath={basePath} nodes={categoryTree} />
              </div>
            </details>
            <Link className="nav-link" href={`${homeHref}#contacto`}>Contacto</Link>
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              aria-expanded={isSearchOpen}
              aria-label={isSearchOpen ? "Cerrar búsqueda" : "Buscar productos"}
              className="icon-action grid"
              onClick={() => {
                if (isSearchOpen) {
                  closeSearch(false);
                } else {
                  setIsMenuOpen(false);
                  setIsSearchOpen(true);
                }
              }}
              ref={searchTriggerRef}
              type="button"
            >
              {isSearchOpen ? <CloseIcon /> : <SearchIcon />}
            </button>
            {instagramUrl ? (
              <a aria-label="Instagram" className="icon-action hidden sm:grid" href={instagramUrl} rel="noreferrer" target="_blank">
                <InstagramIcon />
              </a>
            ) : (
              <span aria-label="Instagram próximamente" className="icon-action is-disabled hidden sm:grid" role="img">
                <InstagramIcon />
              </span>
            )}
            {whatsappUrl ? (
              <a aria-label="WhatsApp" className="icon-action hidden sm:grid" href={whatsappUrl} rel="noreferrer" target="_blank">
                <WhatsappIcon />
              </a>
            ) : (
              <span aria-label="WhatsApp próximamente" className="icon-action is-disabled hidden sm:grid" role="img">
                <WhatsappIcon />
              </span>
            )}
            <button
              aria-expanded={isMenuOpen}
              aria-label="Abrir menú"
              className="icon-action grid lg:hidden"
              onClick={() => {
                closeSearch(false);
                setIsMenuOpen(true);
              }}
              type="button"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        <div
          aria-hidden={!isSearchOpen}
          inert={!isSearchOpen}
          className={`absolute left-0 top-full w-full overflow-hidden bg-[var(--store-surface)] shadow-[0_18px_45px_var(--store-shadow)] transition-[max-height,opacity] duration-300 ${isSearchOpen ? "max-h-[36rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}
        >
          <div className="store-container py-6 sm:py-8">
            <label className="sr-only" htmlFor="store-search">Buscar en la tienda</label>
            <div className="flex items-center gap-3 border-b border-[var(--store-text)] pb-3">
              <SearchIcon className="shrink-0" />
              <input
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[var(--store-muted)]"
                id="store-search"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar anillos, plata, relojes…"
                ref={searchInputRef}
                type="search"
                value={query}
              />
              <button className="text-sm underline-offset-4 hover:underline" onClick={() => closeSearch()} type="button">
                Cerrar
              </button>
            </div>
            <p className="mb-3 mt-5 text-xs font-medium uppercase tracking-[0.16em] text-[var(--store-muted)]">
              {query ? `${results.length} resultados` : "Sugerencias"}
            </p>
            {results.length > 0 ? (
              <div className="grid gap-x-8 sm:grid-cols-2">
                {results.map((product) => (
                  <Link
                    className="flex items-center justify-between gap-4 border-b border-[var(--store-hairline)] py-3 hover:text-[var(--store-primary)]"
                    href={`${homeHref}#producto-${product.slug}`}
                    key={product.id}
                    onClick={() => closeSearch()}
                  >
                    <span>
                      <span className="block text-sm font-medium">{product.name}</span>
                      <span className="block text-xs text-[var(--store-muted)]">{product.material}</span>
                    </span>
                    <span className="shrink-0 text-sm">
                      {tenant.settings.showPrices && product.price !== null && product.sellingMode === "DIRECT"
                        ? `${product.variants.length > 1 ? "Desde " : ""}${formatPrice(product.price)}`
                        : "Consultar"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p aria-live="polite" className="py-4 text-sm text-[var(--store-muted)]">
                No encontramos productos con ese nombre. Probá con otra palabra.
              </p>
            )}
          </div>
        </div>
      </header>

      <MobileMenu
        allCategories={allCategories}
        basePath={basePath}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        tenant={tenant}
      />
      {authView ? (
        <AuthModal
          onAuthenticated={setCustomerSession}
          onClose={closeAuth}
          onViewChange={openAuth}
          tenantSlug={tenant.slug}
          view={authView}
        />
      ) : null}
    </>
  );
}
