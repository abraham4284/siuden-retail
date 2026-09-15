# Rubí Joyería — Storefront

Página pública multi-tenant construida con Next.js, TypeScript y Tailwind CSS. `/` y `/rubi/` consultan el catálogo público de NestJS por `tenantSlug`. Las categorías conservan rutas jerárquicas —por ejemplo, `/oro-18kt/pulseras/` y `/rubi/oro-18kt/pulseras/`— con catálogo, orden y paginación en el cliente.

El encabezado incluye creación de cuenta e inicio de sesión de clientes, accesibles también mediante `#register-modal` y `#login-modal`. Ambos formularios consumen `/api/v1/storefront/auth`, restauran la sesión mediante cookie `HttpOnly` y vinculan el usuario con `customers.user_id` dentro del tenant actual. Estas identidades no reciben roles administrativos.

Configurar `NEXT_PUBLIC_API_BASE_URL` usando `.env.example`; en desarrollo apunta a `http://localhost:3001/api/v1`.

## Desarrollo

```bash
pnpm install
npm run dev
```

Abrí `http://localhost:3000/rubi/` o `http://127.0.0.1:3000/`. Ambos orígenes admiten HMR durante el desarrollo.

## Producción

```bash
npm run build
```

La compilación genera la aplicación Next.js en `.next/`. En producción requiere el servidor Next para consultar la API en cada solicitud y reflejar cambios sin recompilar.

El contenido editorial vive en `src/config/tenants/`. La identidad editable, configuración pública, tema, canales, categorías, productos, variantes y existencias provienen de NestJS.

`src/lib/tenants.ts` actúa como adaptador público sobre `GET /api/v1/storefront/catalog/:tenantSlug`, sin trasladar autenticación ni un `tenantId` editable al navegador.
