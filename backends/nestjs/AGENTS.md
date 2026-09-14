# Siuden Retail — Backend NestJS

## Alcance

- Trabajar únicamente dentro de `backends/nestjs`.
- No modificar los frontends, `backends/dotnet`, la estructura raíz ni el SQL de la base salvo pedido explícito.
- Inspeccionar los archivos existentes antes de editar y preservar todo lo que funciona.

## Base de datos y Prisma

- MySQL 8 ya fue inicializado completamente con `database/init/001_initial_schema-siuden-retail-mysql8-schema.sql`.
- Usar pnpm 11 (`packageManager` en `package.json`); no mezclar `npm install` con el `node_modules` generado por pnpm.
- Si Windows no expone `pnpm` y Corepack no tiene permisos, usar `npx --yes pnpm@11.19.0 <comando>`.
- Ese SQL es la baseline y la fuente de verdad de la estructura física.
- No ejecutar `prisma migrate dev`, `prisma migrate reset`, `prisma db push` ni crear migraciones retrospectivas por defecto.
- Usar `pnpm prisma:validate` y `pnpm prisma:generate` después de cambiar `prisma/schema.prisma`.
- Antes de modificar el schema Prisma, contrastar nombres, tipos, precisión, enums, índices y nulabilidad con el SQL.
- Para introspección, usar `prisma db pull` solo sobre una copia y revisar el diff; no reemplazar el schema vigente sin revisión.
- El seed debe ser idempotente. Nunca incluir contraseñas o secretos reales en Git.
- El seed es un bootstrap explícito: no se ejecuta al iniciar la API y no debe resetear contraseñas salvo con `SEED_ADMIN_RESET_PASSWORD=true`.

## Seguridad multi-tenant

- Obtener `tenantId` exclusivamente del usuario autenticado; nunca confiar en un tenant recibido por body, query o header.
- Toda consulta y mutación sobre datos operativos debe filtrar por `tenantId`.
- Verificar que IDs relacionados pertenezcan al mismo tenant antes de escribir.
- Proteger endpoints administrativos con JWT y el permiso específico mediante `@Permissions()`.
- No incluir `passwordHash`, secretos ni credenciales en respuestas o logs.

## Reglas de dominio

- Los movimientos de stock publicados son inmutables: revertirlos con un movimiento opuesto, nunca borrarlos.
- Ventas, anulaciones y recepciones de compras deben actualizar documento, ítems, ledger y saldos en una única transacción.
- Mantener bloqueo de secuencias y saldos, y aislamiento `SERIALIZABLE` en operaciones críticas.
- Respetar borrado lógico donde existan `deletedAt`, estados archivados o deshabilitados.
- No permitir stock negativo salvo configuración del tenant o `allowBackorder` de la variante.

## Convenciones y verificación

- Mantener TypeScript estricto, módulos NestJS por dominio, DTOs con `class-validator` y errores HTTP consistentes.
- Agregar paginación, búsqueda y filtros a los listados que puedan crecer.
- Documentar endpoints nuevos en Swagger y actualizar `README.md` cuando cambie el contrato.
- Antes de finalizar ejecutar: `pnpm prisma:validate`, `pnpm prisma:generate`, `pnpm lint`, `pnpm build` y `pnpm test --runInBand`.
- Si no hay credenciales MySQL, no inventarlas: dejar constancia de que seed y pruebas de integración quedaron pendientes.
