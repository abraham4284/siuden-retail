# Siuden Retail · Administrador

SPA administrativa de Siuden Retail para el comercio Rubí Joyería. El prototipo reúne dashboard, catálogo, inventario, clientes, ventas, punto de venta y configuración del comercio con una API simulada persistente.

## Stack

- React, Vite y TypeScript estricto.
- React Router y TanStack Query.
- Zustand únicamente para el borrador compartido del POS.
- React Hook Form y Zod.
- Tailwind CSS, componentes estilo shadcn/Radix UI y Lucide React.

## Instalación y ejecución

Desde `frontends/admin-react/`:

```bash
npm install
npm run dev
```

Comprobaciones y compilación:

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

`npm run build` genera la SPA estática en `dist/`. `npm run preview` sirve esa compilación localmente.

## Acceso de demostración

```text
Email: admin@rubi.local
Contraseña: demo123
```

Estas credenciales son exclusivamente ficticias y no representan acceso al sistema anterior ni a servicios reales.

## Datos simulados y persistencia

El repositorio mock guarda el estado en `localStorage` bajo la clave `siuden-retail:admin:mock-database`. Productos, categorías, inventario, clientes ficticios, ventas y configuración permanecen al actualizar la página.

Para volver al seed inicial, abrí el menú de usuario en la barra superior y elegí **Restablecer datos de demostración**. La versión y el contenido inicial están en `src/mocks/seed.ts`; al cambiar su forma debe incrementarse `MOCK_DATA_VERSION`.

## Arquitectura de datos

El flujo de lectura y mutación es:

```text
Componente React
→ hook de TanStack Query (`src/hooks/use-services.ts`)
→ contratos (`src/services/contracts.ts`)
→ composición de servicios (`src/services/index.ts`)
→ repositorio mock (`src/services/mock-repository.ts`)
→ seed persistente (`src/mocks/seed.ts`)
```

Las pantallas no importan datos simulados directamente. Las query keys comerciales incluyen el tenant obtenido de la sesión.

### Sustitución futura por NestJS

Para conectar `api.siuden.com`, implementá un adaptador `Services` en `src/services/http-services.ts` usando los contratos existentes y reemplazá la instancia exportada como `services` en `src/services/index.ts`. Los componentes y `src/hooks/use-services.ts` no deberían necesitar cambios. `src/services/mock-repository.ts` y `src/mocks/seed.ts` pueden conservarse para demo y desarrollo local.

La autenticación HTTP debe restaurarse mediante `GET /api/auth/me` y cookie segura `HttpOnly`; no se deben guardar bearer tokens en `localStorage`.

## Variables de entorno

Copiá `.env.example` como `.env.local` y ajustá:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_USE_MOCKS=true
```

El prototipo actual usa mocks. En la integración HTTP, `VITE_API_BASE_URL` define la base de NestJS y `VITE_USE_MOCKS=false` debe seleccionar el adaptador HTTP desde `src/services/index.ts`.

## Fallback de SPA

`public/_redirects` incluye:

```text
/* /index.html 200
```

El hosting debe aplicar una reescritura equivalente para que rutas como `/products`, `/inventory` o `/pos` funcionen al actualizar directamente.
