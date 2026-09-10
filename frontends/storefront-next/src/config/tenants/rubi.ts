import type { TenantConfig } from "@/types/tenant";

export const rubiTenant: TenantConfig = {
  id: "rubi-id",
  slug: "rubi",
  name: "Rubí Joyería",
  shortName: "Rubí",
  announcement: "ENVÍO GRATIS EN SAN MIGUEL DE TUCUMÁN",
  whatsapp: "",
  instagram: "",
  email: "",
  location: "San Miguel de Tucumán, Argentina",
  enabled: true,
  theme: {
    primaryColor: "#74263A",
    secondaryColor: "#312A2B",
    accentColor: "#B39155",
    backgroundColor: "#F8F6F1",
    surfaceColor: "#FFFFFF",
    textColor: "#292526",
    mutedTextColor: "#706869",
    headingFont: '"Iowan Old Style", "Baskerville", "Times New Roman", serif',
    bodyFont: '"Avenir Next", "Segoe UI", Arial, sans-serif',
  },
  storefront: {
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
