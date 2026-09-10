export type TenantTheme = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  headingFont: string;
  bodyFont: string;
};

export type TenantStorefrontContent = {
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    imageUrl: string;
    imageAlt: string;
  };
  benefits: Array<{
    icon: "care" | "pickup" | "financing" | "security";
    title: string;
    description: string;
  }>;
  whatsapp: {
    title: string;
    description: string;
    message: string;
  };
  footerDescription: string;
};

export type TenantConfig = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  logo?: string;
  announcement?: string;
  whatsapp?: string;
  instagram?: string;
  email?: string;
  location?: string;
  enabled: boolean;
  theme: TenantTheme;
  storefront: TenantStorefrontContent;
};
