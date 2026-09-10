"use client";

import { useEffect, useRef } from "react";
import { getInstagramUrl, getWhatsappUrl } from "@/lib/contact";
import type { StoreCategory } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
import { CloseIcon, InstagramIcon, WhatsappIcon } from "./icons";

type MobileMenuProps = {
  categories: StoreCategory[];
  isOpen: boolean;
  onClose: () => void;
  tenant: TenantConfig;
};

export function MobileMenu({ categories, isOpen, onClose, tenant }: MobileMenuProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const instagramUrl = getInstagramUrl(tenant.instagram);
  const whatsappUrl = getWhatsappUrl(
    tenant.whatsapp,
    `Hola ${tenant.shortName}, quisiera hacer una consulta.`,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", keepFocusInside);

    return () => {
      document.removeEventListener("keydown", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  return (
    <div
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={`fixed inset-0 z-50 lg:hidden ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <button
        aria-label="Cerrar menú"
        className={`absolute inset-0 bg-[var(--store-backdrop)] transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-label="Menú de navegación"
        aria-modal="true"
        className={`absolute right-0 top-0 flex h-full w-[min(88vw,25rem)] flex-col bg-[var(--store-surface)] px-7 pb-8 pt-6 shadow-[-12px_0_40px_var(--store-shadow)] transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        ref={panelRef}
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-[var(--store-hairline)] pb-5">
          <span className="font-[family-name:var(--store-heading-font)] text-2xl tracking-[0.08em]">
            {tenant.shortName}
          </span>
          <button
            aria-label="Cerrar menú"
            className="grid size-11 place-items-center text-[var(--store-text)]"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <CloseIcon />
          </button>
        </div>

        <nav aria-label="Navegación móvil" className="flex flex-col gap-5 py-8 text-lg">
          <a href="#inicio" onClick={onClose}>Inicio</a>
          <a href="#productos" onClick={onClose}>Productos</a>
          <a href="#categorias" onClick={onClose}>Categorías</a>
          <a href="#contacto" onClick={onClose}>Contacto</a>
        </nav>

        <div className="border-t border-[var(--store-hairline)] pt-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--store-muted)]">
            Explorar por categoría
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {categories.map((category) => (
              <a key={category.id} href={`#categoria-${category.slug}`} onClick={onClose}>
                {category.name}
              </a>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-3 border-t border-[var(--store-hairline)] pt-6">
          {instagramUrl ? (
            <a aria-label="Instagram" className="icon-action grid" href={instagramUrl} rel="noreferrer" target="_blank">
              <InstagramIcon />
            </a>
          ) : (
            <span aria-label="Instagram próximamente" className="icon-action is-disabled grid" role="img">
              <InstagramIcon />
            </span>
          )}
          {whatsappUrl ? (
            <a aria-label="WhatsApp" className="icon-action grid" href={whatsappUrl} rel="noreferrer" target="_blank">
              <WhatsappIcon />
            </a>
          ) : (
            <span aria-label="WhatsApp próximamente" className="icon-action is-disabled grid" role="img">
              <WhatsappIcon />
            </span>
          )}
          {!instagramUrl && !whatsappUrl ? (
            <span className="ml-2 text-sm text-[var(--store-muted)]">Canales de atención próximamente</span>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
