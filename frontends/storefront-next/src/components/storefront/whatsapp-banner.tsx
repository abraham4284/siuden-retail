import { getWhatsappUrl } from "@/lib/contact";
import type { TenantConfig } from "@/types/tenant";
import { ArrowRightIcon, WhatsappIcon } from "./icons";

type WhatsappBannerProps = {
  tenant: TenantConfig;
};

export function WhatsappBanner({ tenant }: WhatsappBannerProps) {
  const whatsappUrl = getWhatsappUrl(
    tenant.whatsapp,
    tenant.storefront.whatsapp.message,
  );

  return (
    <section className="store-container py-16 sm:py-20 lg:py-28" id="contacto">
      <div className="relative overflow-hidden bg-[var(--store-primary)] px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex lg:items-center lg:justify-between lg:gap-12 lg:px-16 lg:py-20">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-white/75">
            <WhatsappIcon className="size-5" /> Atención cercana
          </div>
          <h2 className="font-[family-name:var(--store-heading-font)] text-[clamp(2.5rem,5vw,4.7rem)] leading-[0.96] tracking-[-0.035em]">
            {tenant.storefront.whatsapp.title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg">
            {tenant.storefront.whatsapp.description}
          </p>
        </div>

        <div className="relative z-10 mt-9 shrink-0 lg:mt-0">
          {whatsappUrl ? (
            <a className="light-button" href={whatsappUrl} rel="noreferrer" target="_blank">
              Escribinos por WhatsApp <ArrowRightIcon className="size-4" />
            </a>
          ) : (
            <span aria-disabled="true" className="light-button is-disabled" title="El número de WhatsApp todavía no está configurado">
              Escribinos por WhatsApp <ArrowRightIcon className="size-4" />
            </span>
          )}
          {!whatsappUrl ? (
            <p className="mt-3 text-sm text-white/65">Canal disponible próximamente.</p>
          ) : null}
        </div>

        <span aria-hidden="true" className="absolute -right-12 -top-14 size-44 rounded-full border border-white/15 sm:size-64" />
        <span aria-hidden="true" className="absolute -bottom-24 right-20 size-52 rounded-full border border-white/10 sm:size-72" />
      </div>
    </section>
  );
}
