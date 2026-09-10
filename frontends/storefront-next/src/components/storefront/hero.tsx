import Image from "next/image";
import { getWhatsappUrl } from "@/lib/contact";
import type { TenantConfig } from "@/types/tenant";
import { ArrowRightIcon, WhatsappIcon } from "./icons";

type HeroProps = {
  tenant: TenantConfig;
};

export function Hero({ tenant }: HeroProps) {
  const whatsappUrl = getWhatsappUrl(
    tenant.whatsapp,
    tenant.storefront.whatsapp.message,
  );

  return (
    <section className="store-container scroll-mt-32 py-5 sm:py-8 lg:py-12" id="inicio">
      <div className="hero-grid relative overflow-hidden bg-[var(--store-surface)]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 sm:py-16 lg:-mr-16 lg:px-14 lg:py-20 xl:-mr-24 xl:px-16">
          <p className="section-kicker">{tenant.storefront.hero.eyebrow}</p>
          <h1 className="mt-5 max-w-[11ch] font-[family-name:var(--store-heading-font)] text-[clamp(3rem,6vw,6.5rem)] font-normal leading-[0.9] tracking-[-0.045em] text-[var(--store-text)]">
            {tenant.storefront.hero.title}
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[var(--store-muted)] sm:text-lg sm:leading-8">
            {tenant.storefront.hero.description}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3 sm:gap-4">
            <a className="primary-button" href="#productos">
              Ver colección <ArrowRightIcon className="size-4" />
            </a>
            {whatsappUrl ? (
              <a className="secondary-button" href={whatsappUrl} rel="noreferrer" target="_blank">
                <WhatsappIcon className="size-4" /> Consultar por WhatsApp
              </a>
            ) : (
              <span aria-disabled="true" className="secondary-button is-disabled" title="WhatsApp estará disponible próximamente">
                <WhatsappIcon className="size-4" /> Consultar por WhatsApp
              </span>
            )}
          </div>
          <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--store-muted)]">
            <span className="h-px w-9 bg-[var(--store-accent)]" />
            Atención personalizada
          </div>
        </div>

        <figure className="relative min-h-[26rem] overflow-hidden sm:min-h-[34rem] lg:min-h-[43rem]">
          <Image
            alt={tenant.storefront.hero.imageAlt}
            className="object-cover object-center transition-transform duration-700 motion-safe:hover:scale-[1.015] lg:object-[58%_center]"
            fill
            loading="eager"
            sizes="(max-width: 1024px) 100vw, 58vw"
            src={tenant.storefront.hero.imageUrl}
          />
          <figcaption className="absolute bottom-5 right-5 bg-[color:rgb(255_255_255_/_0.88)] px-4 py-2 text-xs uppercase tracking-[0.18em] text-[var(--store-secondary)] backdrop-blur-sm sm:bottom-7 sm:right-7">
            Curaduría · {tenant.shortName}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
