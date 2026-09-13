# Rubí Joyería — Storefront

Página pública multi-tenant construida con Next.js, TypeScript y Tailwind CSS. En esta primera iteración, `/` y `/rubi/` renderizan la tienda de Rubí con un read model local alineado con el dominio del administrador.

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

La identidad, configuración pública, tema y canales del tenant viven en `src/config/tenants/`. Las categorías, productos, variantes y balances simulados viven en `src/data/tenants/`.

`src/lib/tenants.ts` actúa como adaptador público: filtra categorías visibles y productos publicados, conserva solo variantes habilitadas, calcula disponibilidad desde balances separados y aplica la configuración de precios y orden del catálogo. Cuando se integre NestJS, ese adaptador debe consumir el endpoint público por `tenantSlug` sin trasladar autenticación ni `tenantId` editable al navegador.
