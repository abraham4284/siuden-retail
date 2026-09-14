import type { CSSProperties } from "react";
import type { TenantConfig } from "@/types/tenant";

export type ThemeStyles = CSSProperties & Record<`--store-${string}`, string>;

export const getStorefrontThemeStyles = (tenant: TenantConfig): ThemeStyles => ({
  "--store-primary": tenant.theme.primaryColor,
  "--store-secondary": tenant.theme.secondaryColor,
  "--store-accent": tenant.theme.accentColor,
  "--store-background": tenant.theme.backgroundColor,
  "--store-surface": tenant.theme.surfaceColor,
  "--store-text": tenant.theme.textColor,
  "--store-muted": tenant.theme.mutedTextColor,
  "--store-heading-font": tenant.theme.headingFont,
  "--store-body-font": tenant.theme.bodyFont,
  "--store-radius": tenant.theme.borderRadius,
  "--store-catalog-columns": String(tenant.settings.catalogColumnsDesktop),
  "--store-hairline": `color-mix(in srgb, ${tenant.theme.textColor} 12%, transparent)`,
  "--store-shadow": `color-mix(in srgb, ${tenant.theme.textColor} 12%, transparent)`,
  "--store-shadow-strong": `color-mix(in srgb, ${tenant.theme.textColor} 20%, transparent)`,
  "--store-backdrop": `color-mix(in srgb, ${tenant.theme.textColor} 38%, transparent)`,
});
