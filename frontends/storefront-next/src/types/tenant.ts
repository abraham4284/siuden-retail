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
  borderRadius: string;
  announcementEnabled: boolean;
  announcementText: string | null;
  announcementUrl: string | null;
};

export type StorefrontSettings = {
  isPublished: boolean;
  contactFormEnabled: boolean;
  showPrices: boolean;
  defaultCatalogSort: "FEATURED" | "NEWEST" | "PRICE_ASC" | "PRICE_DESC" | "NAME_ASC";
  catalogColumnsDesktop: 2 | 3 | 4;
};

export type StoreContactChannel = {
  type: "WHATSAPP" | "FACEBOOK" | "INSTAGRAM" | "OTHER";
  value: string;
  url: string;
  enabled: boolean;
  sortOrder: number;
};

export type TenantStorefrontContent = {
  account?: {
    enabled: boolean;
  };
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
  defaultCurrency: string;
  timeZone: string;
  contactEmail: string | null;
  phone: string | null;
  addressLine: string | null;
  addressNumber: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string;
  enabled: boolean;
  settings: StorefrontSettings;
  theme: TenantTheme;
  contactChannels: StoreContactChannel[];
  storefront: TenantStorefrontContent;
};
