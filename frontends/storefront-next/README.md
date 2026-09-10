# Rubí Joyería — Storefront

Página pública multi-tenant construida con Next.js, TypeScript y Tailwind CSS. En esta primera iteración, `/` y `/rubi/` renderizan la tienda de Rubí con datos locales.

## Desarrollo

```bash
pnpm install
npm run dev
```

Abrí `http://localhost:3000/rubi/`.

## Exportación estática

```bash
npm run build
```

La compilación genera el sitio estático en `out/`, incluida la ruta `out/rubi/index.html`. No necesita un servidor Next.js en producción.

La identidad del tenant vive en `src/config/tenants/`, mientras que categorías y productos simulados viven en `src/data/tenants/`.
