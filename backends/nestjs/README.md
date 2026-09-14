# Backend NestJS — Siuden Retail

API administrativa multi-tenant para Rubi Joyería. Usa NestJS, Prisma y la base MySQL 8 definida en `database/init/001_initial_schema-siuden-retail-mysql8-schema.sql`.

## Preparación

1. La base existente ya tiene aplicado por completo el SQL inicial. En una instalación nueva, aplicarlo una sola vez sobre una base MySQL 8 vacía.
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL`, `JWT_SECRET` y las credenciales iniciales.
3. Instalar y generar el cliente:

   ```bash
   pnpm install
   pnpm prisma:validate
   pnpm prisma:generate
   pnpm prisma:seed
   pnpm start:dev
   ```

En Windows, si `pnpm` no aparece como comando y Corepack no tiene permisos para crear su caché, ejecutar los mismos comandos mediante el fallback local de npm:

   ```powershell
   npx --yes pnpm@11.19.0 install
   npx --yes pnpm@11.19.0 prisma:validate
   npx --yes pnpm@11.19.0 prisma:generate
   npx --yes pnpm@11.19.0 prisma:seed
   npx --yes pnpm@11.19.0 start:dev
   ```

Como alternativa permanente, abrir PowerShell como administrador y ejecutar `npm install --global pnpm@11.19.0`.

Este backend usa pnpm (`packageManager` está declarado en `package.json`) porque el lockfile y el árbol de dependencias del proyecto fueron generados con pnpm. No reutilizar ese `node_modules` con `npm i`: npm 11.9 puede fallar al deduplicar sus junctions con `Cannot read properties of null (reading 'matches')`. Si se desea cambiar a npm, primero hay que eliminar únicamente `backends/nestjs/node_modules` y generar un `package-lock.json` separado; no se deben mezclar ambos árboles.

El seed es idempotente y crea el administrador global indicado por `SEED_ADMIN_EMAIL`. Le asigna el rol de sistema `PLATFORM_ADMIN` y una membresía activa en todas las cuentas existentes, incluida Rubi. También garantiza los permisos de compras y administración de cuentas que la versión inicial del SQL todavía no incluía. La contraseña debe tener al menos 12 caracteres. El comando compila primero el seed y lo ejecuta como JavaScript para evitar problemas de carga de `tsx` en Windows.

En producción se ejecuta como un paso explícito de bootstrap después de configurar las variables de entorno; no se ejecuta al iniciar la API. Si el usuario ya existe, el seed conserva su contraseña. Para realizar un reset intencional, definir temporalmente `SEED_ADMIN_RESET_PASSWORD=true`, ejecutar el seed con una contraseña nueva y volver a dejar esa variable en `false`. La contraseña no se guarda en el SQL inicial ni debe actualizarse en texto plano directamente en MySQL: se almacena como hash bcrypt.

No debe ejecutarse `prisma migrate dev` contra la base existente: el SQL inicial es su línea base y contiene tablas futuras que esta primera API aún no consume. Para comprobar diferencias contra una instancia real puede usarse `pnpm prisma:pull` en una copia de trabajo y revisar el diff antes de conservarlo.

## Autenticación y tenancy

`POST /api/v1/auth/login` recibe `email`, `password` y opcionalmente `tenantId`. El JWT contiene la cuenta, el tenant, el rol y sus permisos; además se entrega en la cookie segura `HttpOnly` `siuden_admin_access_token` para el frontend administrativo. Un `PLATFORM_ADMIN` puede iniciar sesión indicando cualquiera de los tenants cuyas cuentas administra. `GET /api/v1/auth/me` restaura la sesión y `POST /api/v1/auth/logout` elimina la cookie. Los controladores operativos nunca aceptan un tenant libre por header o body: toman `tenantId` del token y todos los accesos operativos lo incluyen en su filtro.

Todos los endpoints salvo login y health requieren `Authorization: Bearer <token>`. Swagger está disponible en `/docs`.

## Endpoints principales

- `GET /api/v1/health`
- `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- `POST /api/v1/storefront/auth/register`, `POST /api/v1/storefront/auth/login`
- `GET /api/v1/storefront/auth/me`, `POST /api/v1/storefront/auth/logout`
- `GET|POST /api/v1/accounts`, `GET /api/v1/accounts/:id` (solo `PLATFORM_ADMIN`)
- `GET|POST /api/v1/users`, `GET|PATCH /api/v1/users/:id`
- `GET /api/v1/users/roles`, `PATCH /api/v1/users/:id/role`
- `POST /api/v1/users/:id/reset-password`
- `POST /api/v1/users/platform-admins` (solo `PLATFORM_ADMIN`)
- `GET|POST /api/v1/categories`, `GET|PATCH|DELETE /api/v1/categories/:id`
- `GET|POST /api/v1/products`, `GET|PATCH|DELETE /api/v1/products/:id`
- `POST /api/v1/products/:id/variants`, `PATCH|DELETE /api/v1/product-variants/:id`
- `POST /api/v1/products/:id/images`, `DELETE /api/v1/product-images/:id`
- `GET|POST /api/v1/customers`, `GET|PATCH|DELETE /api/v1/customers/:id`
- `GET /api/v1/inventory/locations`, `GET /api/v1/inventory/balances`
- `GET|POST /api/v1/inventory/movements`
- `GET|POST /api/v1/sales`, `GET /api/v1/sales/:id`, `POST /api/v1/sales/:id/cancel`
- `GET|POST /api/v1/suppliers`, `GET|PATCH|DELETE /api/v1/suppliers/:id`
- `GET|POST /api/v1/purchases`, `GET /api/v1/purchases/:id`, `POST /api/v1/purchases/:id/receive`

Los listados aceptan `page`, `limit` (máximo 100) y `search`; los recursos principales agregan filtros propios documentados en Swagger.

## Usuarios administrativos

No existe un registro público de administradores. `PLATFORM_ADMIN` administra la plataforma completa; `OWNER`, `ADMIN`, `SELLER` y `STOCK_MANAGER` son membresías dentro de una cuenta. Un usuario puede pertenecer a más de una cuenta, pero cada membresía tiene su propio rol y estado.

`POST /api/v1/users` crea un usuario interno o agrega a la cuenta un usuario activo ya existente. El body requiere `email`, `password`, `displayName` y `roleCode`. La contraseña solo se usa cuando se crea una identidad nueva; nunca se sobrescribe al agregar una membresía existente. Un `ADMIN` no puede asignar ni modificar `OWNER`, y solo un `PLATFORM_ADMIN` puede administrar otro usuario global.

`PATCH /api/v1/users/:id` permite cambiar `displayName` y el `memberStatus` de la cuenta actual. Bloquear una membresía no bloquea las demás cuentas del usuario. El guard JWT vuelve a comprobar usuario, tenant, membresía, rol y permisos en cada request, por lo que el bloqueo y los cambios de rol tienen efecto inmediato.

Al crear una cuenta, `POST /api/v1/accounts` garantiza los cinco roles del sistema. Puede recibir opcionalmente un propietario inicial:

```json
{
  "accountName": "Nueva joyería",
  "tenantName": "Tienda principal",
  "slug": "nueva-joyeria",
  "owner": {
    "email": "owner@example.com",
    "password": "una-clave-de-al-menos-12",
    "displayName": "Propietario"
  }
}
```

Los clientes registrados en el storefront usan un flujo separado bajo `/api/v1/storefront/auth`. El registro recibe `tenantSlug`, nombre, apellido, email, contraseña y teléfono opcional; crea la identidad compartida en `users`, la vincula mediante `customers.user_id` únicamente al tenant solicitado y entrega la cookie `HttpOnly` `siuden_storefront_access_token`. Esos clientes no reciben membresías, roles administrativos ni acceso a `admin-react`. El carrito y los pedidos online continúan como una etapa posterior.

## Correspondencia de Prisma

`prisma/schema.prisma` mapea sin renombrar físicamente las tablas operativas existentes: identidad y tenant, catálogo, imágenes, saldos, secuencias, clientes, ventas, compras, proveedores y ledger de stock. Conserva `CHAR(36)`, precisión decimal, nombres de columnas, índices únicos y enums usados por la API.

Las tablas SaaS de facturación, configuración visual avanzada, carritos y pedidos online siguen perteneciendo al SQL inicial pero se dejaron fuera del cliente de esta etapa porque la API solicitada no las utiliza. Esto es válido en Prisma y evita introducir migraciones sobre una base existente.

## Reglas transaccionales

- Una venta se confirma junto con sus ítems, el movimiento `SALE` y el descuento de saldos.
- La anulación no borra el ledger: marca el movimiento original como `REVERSED` y crea `SALE_REVERSAL`.
- Una compra creada queda `ORDERED`; `/:id/receive` recibe todo lo pendiente, registra `PURCHASE` y actualiza saldos.
- Los números documentales se toman con bloqueo de fila y las operaciones de stock usan transacciones `SERIALIZABLE`.
