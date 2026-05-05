# Implementation Plan: Standardized Table Design

## Overview

Implementación incremental del sistema de diseño estándar para tablas. La estrategia es:
1. **Fase 0** — Cambios globales (tokens CSS, `elegante-input-dark`, `StandardTable`, actualización de `TableHeaderSection`).
2. **Fases 1–10** — Migración módulo a módulo, de menor a mayor complejidad.
3. **Tests** — Property-based tests con `fast-check` para las 8 propiedades del diseño, más tests de ejemplo con Vitest + RTL.

Cada tarea es atómica y verificable de forma independiente. Las sub-tareas marcadas con `*` son opcionales.

---

## Tasks

- [x] 1. Agregar tokens CSS y clases estándar en globals.css
  - Agregar variables CSS `--status-green: #7aab8a` y `--status-red: #b07070` al bloque `:root` en `src/styles/globals.css`
  - Agregar `--color-status-green` y `--color-status-red` al bloque `@theme inline`
  - Agregar la clase `.elegante-input-dark` con fondo `var(--black-secondary)`, borde `var(--gray-darker)`, border-radius `8px`, y estados `:focus` y `::placeholder`
  - Agregar las clases `.std-table`, `.std-thead`, `.std-thead th`, `.std-thead th:first-child`, `.std-tbody tr`, `.std-tbody tr:last-child`, `.std-tbody tr:hover`, `.std-td`, `.std-td-primary`
  - Agregar las clases `.std-badge`, `.std-badge-positive`, `.std-badge-negative`, `.std-badge-neutral`
  - _Requirements: 1.1, 2.1, 2.2, 2.4, 3.1, 3.2, 3.3, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 9.5_

- [x] 2. Actualizar TableHeaderSection con prop `variant`
  - Leer el archivo `src/shared/components/ui/table-header-section.tsx` para entender la estructura actual
  - Agregar `variant?: "default" | "dark"` a `TableHeaderSectionProps`
  - Cuando `variant="dark"`, aplicar la clase `elegante-input-dark` al `Input` de búsqueda y al `SelectTrigger` del filtro en lugar de `elegante-input`
  - Mantener `variant="default"` como comportamiento por defecto para no romper módulos existentes
  - _Requirements: 1.3, 7.1, 7.2, 7.5, 7.6, 7.8, 9.1_

- [x] 3. Crear la función utilitaria `resolveStatusVariant`
  - Crear el archivo `src/shared/components/ui/standard-table.tsx` (o un archivo utilitario separado si se prefiere)
  - Implementar la función pura `resolveStatusVariant(status: string): StatusVariant` con los arrays `POSITIVE` y `NEGATIVE` definidos en el diseño
  - La función debe normalizar el input con `.toLowerCase().trim()` antes de comparar
  - Retornar `"neutral"` como fallback para strings no reconocidos
  - Exportar la función para uso en módulos que no migren al componente completo
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.5_

  - [ ]* 3.1 Escribir tests de ejemplo para `resolveStatusVariant`
    - Verificar que cada string positivo retorna `"positive"` (Completada, Activo, Pagado, Disponible, Aprobado)
    - Verificar que cada string negativo retorna `"negative"` (Anulada, Cancelada, Inactivo, Rechazado)
    - Verificar que strings desconocidos retornan `"neutral"`
    - Archivo: `src/shared/components/ui/__tests__/resolve-status-variant.test.ts`
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 3.2 Escribir property test para `resolveStatusVariant` (Property 8)
    - **Property 8: resolveStatusVariant es determinista y exhaustiva**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Usar `fc.string()` para verificar que el resultado siempre es uno de `"positive" | "negative" | "neutral"`
    - Usar `fc.constantFrom(...POSITIVE_STATUSES)` para verificar que strings positivos en cualquier capitalización retornan `"positive"`
    - Usar `fc.constantFrom(...NEGATIVE_STATUSES)` para verificar que strings negativos en cualquier capitalización retornan `"negative"`
    - Verificar determinismo: mismo input → mismo output (llamar dos veces con el mismo string)
    - Archivo: `src/shared/components/ui/__tests__/resolve-status-variant.property.test.ts`
    - Mínimo 100 iteraciones (`numRuns: 100`)

- [x] 4. Implementar `StandardTable.StatusBadge`
  - En `src/shared/components/ui/standard-table.tsx`, implementar el subcomponente `StatusBadge`
  - Aceptar props `variant: StatusVariant` y `label: string`
  - Aplicar clases `std-badge` más la variante correspondiente (`std-badge-positive`, `std-badge-negative`, `std-badge-neutral`)
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

  - [ ]* 4.1 Escribir property test para `StatusBadge` — estilos invariantes (Property 1)
    - **Property 1: StatusBadge siempre aplica estilos invariantes**
    - **Validates: Requirements 3.5**
    - Usar `fc.constantFrom("positive", "negative", "neutral")` como arbitrario de variante
    - Usar `fc.string({ minLength: 1 })` como arbitrario de label
    - Verificar que el elemento renderizado tiene la clase `std-badge` para cualquier combinación de inputs
    - Archivo: `src/shared/components/ui/__tests__/status-badge.property.test.tsx`
    - Mínimo 100 iteraciones

  - [ ]* 4.2 Escribir property test para `StatusBadge` — colores positivos (Property 2)
    - **Property 2: StatusBadge positivo siempre usa Status_Green**
    - **Validates: Requirements 3.1**
    - Usar `fc.constantFrom("positive")` como variante y `fc.string({ minLength: 1 })` como label
    - Verificar que el elemento tiene la clase `std-badge-positive` (que aplica `background: var(--status-green)`)
    - Archivo: `src/shared/components/ui/__tests__/status-badge.property.test.tsx` (mismo archivo, test adicional)
    - Mínimo 100 iteraciones

  - [ ]* 4.3 Escribir property test para `StatusBadge` — colores negativos (Property 3)
    - **Property 3: StatusBadge negativo siempre usa Status_Red**
    - **Validates: Requirements 3.2**
    - Usar `fc.constantFrom("negative")` como variante y `fc.string({ minLength: 1 })` como label
    - Verificar que el elemento tiene la clase `std-badge-negative` (que aplica `background: var(--status-red)`)
    - Archivo: `src/shared/components/ui/__tests__/status-badge.property.test.tsx` (mismo archivo, test adicional)
    - Mínimo 100 iteraciones

- [x] 5. Implementar subcomponentes de estructura de `StandardTable`
  - Implementar `StandardTable.Header` (`<thead className="std-thead">`)
  - Implementar `StandardTable.HeadCell` (`<th>` con clases estándar, acepta prop `align?`)
  - Implementar `StandardTable.Body` (`<tbody className="std-tbody">`)
  - Implementar `StandardTable.Row` (`<tr>` con border-bottom y hover via clase `std-tbody`)
  - Implementar `StandardTable.Cell` (`<td className="std-td">`, acepta prop `align?`)
  - Implementar `StandardTable.PrimaryCell` (`<td className="std-td-primary">`)
  - Todos los subcomponentes deben aceptar `children` y `className` para extensibilidad
  - _Requirements: 8.7, 9.1, 9.2, 9.4_

  - [ ]* 5.1 Escribir property test para encabezados — estilos invariantes (Property 4)
    - **Property 4: Encabezados de tabla aplican estilos invariantes para cualquier definición de columnas**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**
    - Usar `fc.array(fc.record({ key: fc.string(), header: fc.string({ minLength: 1 }) }), { minLength: 1 })` como arbitrario de columnas
    - Renderizar `StandardTable.Header` con los `HeadCell` generados y verificar que todos tienen la clase `std-thead` aplicada
    - Archivo: `src/shared/components/ui/__tests__/standard-table.property.test.tsx`
    - Mínimo 100 iteraciones

  - [ ]* 5.2 Escribir property test para alineación de columnas (Property 5)
    - **Property 5: Primera columna izquierda, resto centradas**
    - **Validates: Requirements 4.2**
    - Usar `fc.array(fc.record({ key: fc.string(), header: fc.string({ minLength: 1 }) }), { minLength: 2 })` para garantizar al menos 2 columnas
    - Verificar que el primer `<th>` tiene `text-align: left` (clase `std-thead th:first-child`) y los demás tienen `text-align: center`
    - Archivo: `src/shared/components/ui/__tests__/standard-table.property.test.tsx` (mismo archivo)
    - Mínimo 100 iteraciones

- [x] 6. Implementar el componente principal `StandardTable` con API de props
  - Implementar `StandardTable` con props `columns: ColumnDef<T>[]`, `data: T[]`, `loading?: boolean`, `emptyMessage?: string`, `emptyTitle?: string`, `onReload?: () => void`, `className?: string`, `rowKey?: keyof T | ((row: T) => string)`
  - Renderizar `<table className="std-table">` con `StandardTable.Header`, `StandardTable.Body` y las filas generadas a partir de `columns` y `data`
  - Cuando `loading=true`, renderizar `TableLoadingStateRow` en lugar de las filas de datos
  - Cuando `data` está vacío y `loading=false`, renderizar `TableEmptyStateRow` con `emptyMessage`
  - Usar `rowKey` para la prop `key` de React; si no se provee, usar el índice como fallback
  - Adjuntar todos los subcomponentes como propiedades estáticas: `StandardTable.Header`, `StandardTable.HeadCell`, `StandardTable.Body`, `StandardTable.Row`, `StandardTable.Cell`, `StandardTable.PrimaryCell`, `StandardTable.StatusBadge`
  - Exportar `StandardTable` como export nombrado y default desde el archivo
  - Agregar JSDoc a todos los props
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.3_

  - [ ]* 6.1 Escribir property test para `loading=true` (Property 7)
    - **Property 7: loading=true siempre muestra estado de carga, independientemente de los datos**
    - **Validates: Requirements 8.5**
    - Usar `fc.array(fc.record({ id: fc.uuid(), name: fc.string() }))` para generar arrays de datos de cualquier tamaño (incluyendo vacío)
    - Verificar que cuando `loading=true`, el componente renderiza `TableLoadingStateRow` y no renderiza filas de datos
    - Archivo: `src/shared/components/ui/__tests__/standard-table.property.test.tsx` (mismo archivo)
    - Mínimo 100 iteraciones

  - [ ]* 6.2 Escribir property test para border-bottom de filas (Property 6)
    - **Property 6: Todas las filas excepto la última tienen border-bottom**
    - **Validates: Requirements 5.1, 5.4**
    - Usar `fc.array(fc.record({ id: fc.uuid(), name: fc.string() }), { minLength: 1 })` para generar arrays no vacíos
    - Verificar que todos los `<tr>` del `<tbody>` excepto el último tienen la clase que aplica `border-bottom`, y el último no la tiene (via CSS `tr:last-child { border-bottom: none }`)
    - Archivo: `src/shared/components/ui/__tests__/standard-table.property.test.tsx` (mismo archivo)
    - Mínimo 100 iteraciones

  - [ ]* 6.3 Escribir tests de ejemplo para `StandardTable`
    - Verificar renderizado con `loading=true` (muestra skeleton, no filas)
    - Verificar renderizado con `data=[]` y `loading=false` (muestra empty state)
    - Verificar renderizado con datos válidos (muestra filas correctas)
    - Verificar que `emptyMessage` se pasa a `TableEmptyStateRow`
    - Verificar que los subcomponentes están disponibles como propiedades estáticas
    - Archivo: `src/shared/components/ui/__tests__/standard-table.test.tsx`
    - _Requirements: 8.5, 8.6, 8.7_

- [x] 7. Checkpoint — Verificar Fase 0 completa
  - Asegurarse de que todos los tests de la Fase 0 pasan (`npx vitest run src/shared/components/ui/__tests__/`)
  - Verificar que `globals.css` compila sin errores (ejecutar el build del proyecto)
  - Verificar que `TableHeaderSection` con `variant="dark"` aplica `elegante-input-dark` correctamente
  - Verificar que `StandardTable` se puede importar desde `src/shared/components/ui/standard-table.tsx`
  - Preguntar al usuario si hay dudas antes de continuar con la migración de módulos.

- [x] 8. Fase 1 — Migrar `ClientesPage.tsx`
  - [x] 8.1 Leer `ClientesPage.tsx` e identificar la estructura de tabla actual (componentes usados, badges de estado, TableHeaderSection)
    - _Requirements: 9.1, 9.2_
  - [x] 8.2 Reemplazar la tabla existente por `StandardTable` con la API de props (`columns` + `data`)
    - Definir el array `columns: ColumnDef<Cliente>[]` con las columnas actuales
    - Marcar la columna de identificador principal con `primary: true` o usar `StandardTable.PrimaryCell`
    - Pasar `loading` y `emptyMessage` al componente
    - _Requirements: 8.2, 8.4, 9.2_
  - [x] 8.3 Reemplazar badges de estado por `StandardTable.StatusBadge` usando `resolveStatusVariant`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 8.4 Agregar `variant="dark"` al `TableHeaderSection` de `ClientesPage`
    - _Requirements: 7.1, 7.2, 1.3_
  - [x] 8.5 Eliminar estilos inline y clases Tailwind de color redundantes en `ClientesPage`
    - _Requirements: 9.2_
  - [ ]* 8.6 Escribir test de integración para `ClientesPage` migrada
    - Verificar que el módulo renderiza sin errores con datos mock
    - Verificar que búsqueda y filtros siguen funcionando
    - _Requirements: 9.2_

- [x] 9. Fase 2 — Migrar `ProductosPage.tsx`
  - [x] 9.1 Leer `ProductosPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [x] 9.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [x] 9.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 9.4 Agregar `variant="dark"` al `TableHeaderSection` de `ProductosPage`
    - _Requirements: 7.1, 7.2_
  - [x] 9.5 Eliminar estilos redundantes en `ProductosPage`
    - _Requirements: 9.2_
  - [ ]* 9.6 Escribir test de integración para `ProductosPage` migrada
    - _Requirements: 9.2_

- [x] 10. Fase 3 — Migrar `ServiciosPage.tsx`
  - [x] 10.1 Leer `ServiciosPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [x] 10.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [x] 10.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 10.4 Agregar `variant="dark"` al `TableHeaderSection` de `ServiciosPage`
    - _Requirements: 7.1, 7.2_
  - [x] 10.5 Eliminar estilos redundantes en `ServiciosPage`
    - _Requirements: 9.2_
  - [ ]* 10.6 Escribir test de integración para `ServiciosPage` migrada
    - _Requirements: 9.2_

- [ ] 11. Fase 4 — Migrar `PaquetesPage.tsx`
  - [x] 11.1 Leer `PaquetesPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [x] 11.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [x] 11.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 11.4 Agregar `variant="dark"` al `TableHeaderSection` de `PaquetesPage`
    - _Requirements: 7.1, 7.2_
  - [x] 11.5 Eliminar estilos redundantes en `PaquetesPage`
    - _Requirements: 9.2_
  - [ ]* 11.6 Escribir test de integración para `PaquetesPage` migrada
    - _Requirements: 9.2_

- [x] 12. Checkpoint — Verificar Fases 1–4
  - Asegurarse de que los 4 módulos simples renderizan correctamente con el nuevo diseño
  - Verificar visualmente que los badges de estado usan los colores desaturados correctos
  - Verificar que los inputs de búsqueda tienen fondo negro (`#111111`)
  - Preguntar al usuario si hay dudas antes de continuar con módulos de complejidad media.

- [-] 13. Fase 5 — Migrar `VentasPage.tsx`
  - [x] 13.1 Leer `VentasPage.tsx` e identificar la estructura de tabla actual (paginación, badges, filtros)
    - _Requirements: 9.1, 9.2_
  - [ ] 13.2 Reemplazar la tabla por `StandardTable` con API de props, preservando la lógica de paginación
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 13.3 Reemplazar badges de estado por `StandardTable.StatusBadge` usando `resolveStatusVariant`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ] 13.4 Agregar `variant="dark"` al `TableHeaderSection` de `VentasPage`
    - _Requirements: 7.1, 7.2_
  - [ ] 13.5 Verificar que la paginación sigue funcionando correctamente después de la migración
    - _Requirements: 9.2_
  - [ ] 13.6 Eliminar estilos redundantes en `VentasPage`
    - _Requirements: 9.2_
  - [ ]* 13.7 Escribir test de integración para `VentasPage` migrada
    - Verificar paginación, búsqueda, filtros y badges de estado
    - _Requirements: 9.2_

- [ ] 14. Fase 6 — Migrar `CategoriasPage.tsx` (Inventario)
  - [ ] 14.1 Leer `CategoriasPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [ ] 14.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 14.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 14.4 Agregar `variant="dark"` al `TableHeaderSection` de `CategoriasPage`
    - _Requirements: 7.1, 7.2_
  - [ ] 14.5 Eliminar estilos redundantes en `CategoriasPage`
    - _Requirements: 9.2_
  - [ ]* 14.6 Escribir test de integración para `CategoriasPage` migrada
    - _Requirements: 9.2_

- [ ] 15. Fase 7 — Migrar `ProveedoresPage.tsx` (Inventario)
  - [ ] 15.1 Leer `ProveedoresPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [ ] 15.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 15.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 15.4 Agregar `variant="dark"` al `TableHeaderSection` de `ProveedoresPage`
    - _Requirements: 7.1, 7.2_
  - [ ] 15.5 Eliminar estilos redundantes en `ProveedoresPage`
    - _Requirements: 9.2_
  - [ ]* 15.6 Escribir test de integración para `ProveedoresPage` migrada
    - _Requirements: 9.2_

- [ ] 16. Fase 8 — Migrar `ComprasPage.tsx` (Inventario)
  - [ ] 16.1 Leer `ComprasPage.tsx` e identificar la estructura de tabla actual
    - _Requirements: 9.1_
  - [ ] 16.2 Reemplazar la tabla por `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 16.3 Reemplazar badges de estado por `StandardTable.StatusBadge`
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 16.4 Agregar `variant="dark"` al `TableHeaderSection` de `ComprasPage`
    - _Requirements: 7.1, 7.2_
  - [ ] 16.5 Eliminar estilos redundantes en `ComprasPage`
    - _Requirements: 9.2_
  - [ ]* 16.6 Escribir test de integración para `ComprasPage` migrada
    - _Requirements: 9.2_

- [ ] 17. Checkpoint — Verificar Fases 5–8
  - Asegurarse de que los módulos de inventario y ventas renderizan correctamente
  - Verificar que la paginación de `VentasPage` sigue funcionando
  - Preguntar al usuario si hay dudas antes de continuar con administración y agendamiento.

- [ ] 18. Fase 9 — Migrar módulos de Administración (`BarberosPage.tsx`, `UsersPage.tsx`, `RolesPage.tsx`)
  - [ ] 18.1 Leer los tres archivos e identificar la estructura de tabla actual en cada uno
    - _Requirements: 9.1_
  - [ ] 18.2 Migrar `BarberosPage.tsx` a `StandardTable` con API de props
    - Reemplazar badges de estado, agregar `variant="dark"` al `TableHeaderSection`
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 18.3 Migrar `UsersPage.tsx` a `StandardTable` con API de props
    - Reemplazar badges de estado, agregar `variant="dark"` al `TableHeaderSection`
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 18.4 Migrar `RolesPage.tsx` a `StandardTable` con API de props
    - Reemplazar badges de estado, agregar `variant="dark"` al `TableHeaderSection`
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 18.5 Eliminar estilos redundantes en los tres archivos
    - _Requirements: 9.2_
  - [ ]* 18.6 Escribir tests de integración para los módulos de administración migrados
    - _Requirements: 9.2_

- [ ] 19. Fase 10 — Migrar páginas de Agendamiento y Horarios
  - [ ] 19.1 Leer los archivos de agendamiento e identificar la estructura de tabla actual (posibles vistas de calendario o tablas complejas)
    - _Requirements: 9.1, 9.4_
  - [ ] 19.2 Para tablas simples: migrar a `StandardTable` con API de props
    - _Requirements: 8.2, 8.4, 9.2_
  - [ ] 19.3 Para tablas con estructura compleja (filas agrupadas, expandibles): usar subcomponentes directamente (`StandardTable.Row`, `StandardTable.Cell`, `StandardTable.PrimaryCell`) con las clases `std-table`, `std-thead`, `std-tbody`
    - _Requirements: 9.4_
  - [ ] 19.4 Reemplazar badges de estado por `StandardTable.StatusBadge` en todos los archivos de agendamiento
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ] 19.5 Agregar `variant="dark"` a los `TableHeaderSection` de los módulos de agendamiento
    - _Requirements: 7.1, 7.2_
  - [ ] 19.6 Eliminar estilos redundantes en los archivos de agendamiento
    - _Requirements: 9.2_
  - [ ]* 19.7 Escribir tests de integración para los módulos de agendamiento migrados
    - _Requirements: 9.2_

- [ ] 20. Final checkpoint — Verificar sistema completo
  - Ejecutar todos los tests del proyecto (`npx vitest run`)
  - Verificar que todos los módulos migrados renderizan correctamente
  - Verificar que `DevolucionesPage.tsx` (referencia de diseño) sigue funcionando sin cambios
  - Verificar que los tokens CSS `--status-green` y `--status-red` están disponibles globalmente para módulos que no migraron al componente completo
  - Asegurarse de que todos los tests pasan, preguntar al usuario si hay dudas.

---

## Notes

- Las sub-tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los checkpoints garantizan validación incremental antes de continuar con la siguiente fase
- Los property tests usan `fast-check` con mínimo 100 iteraciones (`numRuns: 100`)
- Los tests de propiedad verifican invariantes universales; los tests de ejemplo verifican comportamientos específicos
- `DevolucionesPage.tsx` es la referencia de diseño y no requiere migración (ya tiene el diseño correcto)
- Durante la migración, un módulo puede estar en estado mixto sin generar errores
