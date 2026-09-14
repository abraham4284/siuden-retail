import type { TenantConfig } from "@/types/tenant";

export const rubiTenant: TenantConfig = {
  id: "rubi-id",
  slug: "rubi",
  name: "Rubí Joyería",
  shortName: "Rubí",
  defaultCurrency: "ARS",
  timeZone: "America/Argentina/Tucuman",
  contactEmail: "rubi.joyeria803@gmail.com",
  phone: "3816776136",
  addressLine: "Mendoza",
  addressNumber: "803",
  city: "San Miguel de Tucumán",
  province: "Tucumán",
  postalCode: null,
  countryCode: "AR",
  enabled: true,
  settings: {
    isPublished: true,
    contactFormEnabled: true,
    showPrices: true,
    defaultCatalogSort: "FEATURED",
    catalogColumnsDesktop: 4,
  },
  theme: {
    primaryColor: "#74263A",
    secondaryColor: "#312A2B",
    accentColor: "#B39155",
    backgroundColor: "#F8F6F1",
    surfaceColor: "#FFFFFF",
    textColor: "#292526",
    mutedTextColor: "#706869",
    headingFont: 'Merriweather, Georgia, "Times New Roman", serif',
    bodyFont: 'Lora, Georgia, "Times New Roman", serif',
    borderRadius: "0rem",
    announcementEnabled: true,
    announcementText: "ENVÍO GRATIS a todo San Miguel de Tucumán",
    announcementUrl: "https://www.instagram.com/rubijoyerias",
  },
  contactChannels: [
    {
      type: "WHATSAPP",
      value: "3816776136",
      url: "https://wa.me/5493816776136",
      enabled: true,
      sortOrder: 0,
    },
    {
      type: "INSTAGRAM",
      value: "rubijoyerias",
      url: "https://www.instagram.com/rubijoyerias",
      enabled: true,
      sortOrder: 1,
    },
    {
      type: "FACEBOOK",
      value: "rubijoyerias",
      url: "https://www.facebook.com/rubijoyerias",
      enabled: true,
      sortOrder: 2,
    },
    {
      type: "OTHER",
      value: "@rubijoyerias",
      url: "https://www.tiktok.com/@rubijoyerias",
      enabled: true,
      sortOrder: 3,
    },
  ],
  storefront: {
    account: {
      enabled: true,
    },
    hero: {
      eyebrow: "Selección Rubí · Tucumán",
      title: "Joyas que acompañan tu historia",
      description:
        "Piezas elegidas con dedicación y una atención cercana para ayudarte a encontrar eso que querés recordar siempre.",
      imageUrl: "/images/tenants/rubi/hero/coleccion-rubi.webp",
      imageAlt: "Collar y aros dorados con piedras color rubí sobre una base de piedra clara",
    },
    benefits: [
      {
        icon: "care",
        title: "Atención personalizada",
        description: "Te acompañamos a elegir.",
      },
      {
        icon: "pickup",
        title: "Retiro en San Miguel de Tucumán",
        description: "Coordiná tu retiro en la ciudad.",
      },
      {
        icon: "financing",
        title: "Consultá financiación",
        description: "Opciones para cada compra.",
      },
      {
        icon: "security",
        title: "Compra segura",
        description: "Cuidamos cada detalle.",
      },
    ],
    whatsapp: {
      title: "¿Buscás una pieza especial?",
      description:
        "Contanos qué tenés en mente. Te ayudamos a encontrar una joya para regalar, celebrar o acompañarte todos los días.",
      message: "Hola Rubí, estoy buscando una pieza especial. ¿Me pueden asesorar?",
    },
    footerDescription:
      "Joyas seleccionadas y atención personalizada desde San Miguel de Tucumán.",
  },
};
