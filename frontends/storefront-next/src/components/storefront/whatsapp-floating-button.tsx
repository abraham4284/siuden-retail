import { getWhatsappUrl } from "@/lib/contact";
import type { TenantConfig } from "@/types/tenant";
import { WhatsappIcon } from "./icons";

type WhatsappFloatingButtonProps = {
  tenant: TenantConfig;
};

export function WhatsappFloatingButton({ tenant }: WhatsappFloatingButtonProps) {
  const whatsappUrl = getWhatsappUrl(
    tenant.whatsapp,
    `Hola ${tenant.shortName}, quisiera hacer una consulta.`,
  );

  if (!whatsappUrl) {
    return null;
  }

  return (
    <a
      aria-label="Consultar por WhatsApp"
      className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[var(--store-primary)] text-white shadow-[0_10px_28px_var(--store-shadow-strong)] transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 sm:bottom-7 sm:right-7"
      href={whatsappUrl}
      rel="noreferrer"
      target="_blank"
    >
      <WhatsappIcon className="size-6" />
    </a>
  );
}
