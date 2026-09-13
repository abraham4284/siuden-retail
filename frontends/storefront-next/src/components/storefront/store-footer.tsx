import { getContactUrl } from "@/lib/contact";
import type { StoreCategory } from "@/types/storefront";
import type { TenantConfig } from "@/types/tenant";
import { InstagramIcon, MapPinIcon, WhatsappIcon } from "./icons";

type StoreFooterProps = {
  categories: StoreCategory[];
  tenant: TenantConfig;
};

export function StoreFooter({ categories, tenant }: StoreFooterProps) {
  const instagramUrl = getContactUrl(tenant, "INSTAGRAM");
  const brandInitial = tenant.shortName.trim().charAt(0).toLocaleUpperCase("es");
  const whatsappUrl = getContactUrl(tenant, "WHATSAPP");
  const additionalChannels = tenant.contactChannels.filter(
    (channel) => channel.enabled && channel.type !== "INSTAGRAM" && channel.type !== "WHATSAPP",
  );

  return (
    <footer className="bg-[var(--store-secondary)] text-white">
      <div className="store-container grid gap-12 py-14 sm:grid-cols-2 sm:py-16 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.2fr] lg:gap-10 lg:py-20">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full border border-[var(--store-accent)] font-[family-name:var(--store-heading-font)] text-xl italic">{brandInitial}</span>
            <span className="font-[family-name:var(--store-heading-font)] text-3xl tracking-[0.08em]">{tenant.shortName}</span>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-white/65">
            {tenant.storefront.footerDescription}
          </p>
        </div>

        <div>
          <h2 className="footer-heading">Navegación</h2>
          <nav aria-label="Navegación del pie" className="mt-5 flex flex-col gap-3 text-sm text-white/70">
            <a className="footer-link" href="#inicio">Inicio</a>
            <a className="footer-link" href="#productos">Productos</a>
            <a className="footer-link" href="#novedades">Novedades</a>
            <a className="footer-link" href="#contacto">Contacto</a>
          </nav>
        </div>

        <div>
          <h2 className="footer-heading">Categorías</h2>
          <nav aria-label="Categorías del pie" className="mt-5 flex flex-col gap-3 text-sm text-white/70">
            {categories.map((category) => (
              <a className="footer-link" href={`#categoria-${category.slug}`} key={category.id}>
                {category.name}
              </a>
            ))}
          </nav>
        </div>

        <div>
          <h2 className="footer-heading">Encontranos</h2>
          <p className="mt-5 flex items-start gap-3 text-sm leading-6 text-white/70">
            <MapPinIcon className="mt-0.5 size-4 shrink-0 text-[var(--store-accent)]" /> {[tenant.addressLine, tenant.addressNumber, tenant.city, tenant.province].filter(Boolean).join(", ")}
          </p>
          <div className="mt-6 flex items-center gap-3">
            {instagramUrl ? (
              <a aria-label="Instagram" className="footer-icon" href={instagramUrl} rel="noreferrer" target="_blank">
                <InstagramIcon className="size-[1.15rem]" />
              </a>
            ) : (
              <span aria-label="Instagram próximamente" className="footer-icon is-disabled" role="img">
                <InstagramIcon className="size-[1.15rem]" />
              </span>
            )}
            {whatsappUrl ? (
              <a aria-label="WhatsApp" className="footer-icon" href={whatsappUrl} rel="noreferrer" target="_blank">
                <WhatsappIcon className="size-[1.15rem]" />
              </a>
            ) : (
              <span aria-label="WhatsApp próximamente" className="footer-icon is-disabled" role="img">
                <WhatsappIcon className="size-[1.15rem]" />
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/70">
            {additionalChannels.map((channel) => (
              <a className="footer-link" href={channel.url} key={`${channel.type}-${channel.sortOrder}`} rel="noreferrer" target="_blank">
                {channel.type === "FACEBOOK" ? "Facebook" : channel.value}
              </a>
            ))}
            {tenant.contactEmail ? <a className="footer-link" href={`mailto:${tenant.contactEmail}`}>{tenant.contactEmail}</a> : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="store-container flex flex-col gap-2 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {tenant.name}. Todos los derechos reservados.</p>
          <p>Información comercial y canales de contacto sujetos a confirmación.</p>
        </div>
      </div>
    </footer>
  );
}
