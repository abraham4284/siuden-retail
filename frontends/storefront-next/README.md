# Rubí Joyería — Storefront

Página pública multi-tenant construida con Next.js, TypeScript y Tailwind CSS. `/` y `/rubi/` renderizan la tienda de Rubí con un read model local alineado con el dominio del administrador. Las categorías tienen rutas estáticas jerárquicas —por ejemplo, `/oro-18kt/pulseras/` y `/rubi/oro-18kt/pulseras/`— con catálogo, orden y paginación en el cliente.

El encabezado incluye creación de cuenta e inicio de sesión de clientes, accesibles también mediante `#register-modal` y `#login-modal`. Ambos formularios consumen `/api/v1/storefront/auth`, restauran la sesión mediante cookie `HttpOnly` y vinculan el usuario con `customers.user_id` dentro del tenant actual. Estas identidades no reciben roles administrativos.

Configurar `NEXT_PUBLIC_API_BASE_URL` usando `.env.example`; en desarrollo apunta a `http://localhost:3001/api/v1`.

## Desarrollo

```bash
pnpm install
npm run dev
```

Abrí `http://localhost:3000/rubi/` o `http://127.0.0.1:3000/`. Ambos orígenes admiten HMR durante el desarrollo.

## Exportación estática

```bash
npm run build
```

La compilación genera el sitio estático en `out/`, incluida la ruta `out/rubi/index.html`. No necesita un servidor Next.js en producción.

La identidad, configuración pública, tema y canales del tenant viven en `src/config/tenants/`. Las categorías, productos, variantes y balances simulados viven en `src/data/tenants/`.

`src/lib/tenants.ts` actúa como adaptador público: filtra categorías visibles y productos publicados, conserva solo variantes habilitadas, calcula disponibilidad desde balances separados y aplica la configuración de precios y orden del catálogo. Cuando se integre NestJS, ese adaptador debe consumir el endpoint público por `tenantSlug` sin trasladar autenticación ni `tenantId` editable al navegador.
