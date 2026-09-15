# Administración React

Estas reglas aplican exclusivamente a `frontends/admin-react/`.

## Alcance y forma de trabajo

- Continuar sobre el estado existente: no regenerar la aplicación, reiniciar la implementación ni borrar cambios válidos.
- No modificar `storefront-next`, backends, Docker, MySQL ni scripts de base de datos desde tareas de este frontend.
- Revisar `git status` y `git diff` antes de editar; preservar cambios ajenos o no relacionados.
- No crear commits, ramas, tags ni hacer push automáticamente. Solo hacerlo cuando el usuario lo solicite explícitamente.
- Antes de finalizar cambios, ejecutar lint, comprobación TypeScript y build; probar visualmente los flujos afectados en desktop y mobile.

## Tecnologías obligatorias

- React, Vite y TypeScript estricto.
- React Router para rutas y protección de navegación.
- TanStack Query para sesión y datos remotos.
- Axios es el cliente HTTP obligatorio. Centralizar `baseURL`, `withCredentials` y la normalización de errores en `src/services/http-services.ts`; no usar `fetch` directamente en componentes, hooks ni servicios.
- Zustand únicamente para el borrador compartido del POS.
- React Hook Form y Zod para formularios y validación.
- Tailwind CSS, componentes estilo shadcn/Radix UI y Lucide React.
- Mantener la API mock detrás de contratos reemplazables posteriormente por NestJS.
- Los componentes no deben leer ni modificar directamente los datos mock.

## Sesión y tenant

- La arquitectura es `Account 1:N Tenant`; el MVP de Rubí opera con una cuenta y un tenant.
- Obtener siempre el tenant activo desde la sesión autenticada.
- No mostrar un selector de tenant ni aceptar un `tenantId` editable desde la interfaz.
- No usar un encabezado `X-Tenant-Id` editable ni confiar en un tenant enviado libremente por el cliente.
- Todas las query keys comerciales deben incluir el `tenantId` obtenido de la sesión.

## Reglas de dominio

- `ProductVariant` es la unidad vendible; el stock no vive dentro de la variante.
- Obtener existencias desde `InventoryBalance` y modificarlas mediante movimientos trazables.
- Una venta confirmada crea un único movimiento `SALE`, con una línea `StockMovementItem` por línea vendida.
- Cancelar una venta crea un movimiento compensatorio `SALE_REVERSAL`; nunca borrar la venta ni sus movimientos históricos.
- Representar “Consumidor final” con `customerId = null`.
- No implementar todavía pagos, carrito público, pedidos online, reservas, envíos, facturación, compras, dominios ni suscripciones.

## Calidad de interfaz

- Mantener estados de carga, error y vacío, confirmaciones para acciones sensibles y diseño responsive.
- Conservar navegación accesible, etiquetas de formularios y tablas con desplazamiento contenido sin provocar overflow global.
