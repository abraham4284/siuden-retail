import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Rubí Joyería",
    template: "%s | Rubí Joyería",
  },
  description: "Joyas seleccionadas y atención personalizada en San Miguel de Tucumán.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#74263A",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
