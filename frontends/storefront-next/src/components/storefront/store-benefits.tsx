import { CardIcon, HeartIcon, MapPinIcon, ShieldIcon } from "./icons";
import type { TenantStorefrontContent } from "@/types/tenant";

const benefitIcons = {
  care: HeartIcon,
  pickup: MapPinIcon,
  financing: CardIcon,
  security: ShieldIcon,
};

type StoreBenefitsProps = {
  benefits: TenantStorefrontContent["benefits"];
  tenantName: string;
};

export function StoreBenefits({ benefits, tenantName }: StoreBenefitsProps) {
  return (
    <section aria-label={`Beneficios de comprar en ${tenantName}`} className="border-y border-[var(--store-hairline)] bg-[var(--store-surface)]">
      <div className="store-container grid grid-cols-1 divide-y divide-[var(--store-hairline)] py-2 min-[440px]:grid-cols-2 min-[440px]:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {benefits.map(({ description, icon, title }) => {
          const Icon = benefitIcons[icon];

          return (
          <div className="flex items-start gap-4 px-2 py-7 min-[440px]:px-5 lg:px-7 lg:py-9" key={title}>
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--store-accent)] text-[var(--store-primary)]">
              <Icon className="size-[1.15rem]" />
            </span>
            <span>
              <strong className="block text-sm font-medium">{title}</strong>
              <span className="mt-1 block text-sm leading-5 text-[var(--store-muted)]">{description}</span>
            </span>
          </div>
          );
        })}
      </div>
    </section>
  );
}
