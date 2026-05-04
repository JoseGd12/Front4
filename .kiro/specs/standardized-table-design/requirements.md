# Requirements Document

## Introduction

Este feature estandariza el diseño visual de todas las tablas de datos en la aplicación, tomando como referencia el módulo de devoluciones (`DevolucionesPage.tsx`). El objetivo es crear un sistema de diseño consistente que unifique tipografía, colores, badges de estado, espaciado, separadores, contador de registros y controles de búsqueda/filtro en todos los módulos que presentan tablas: ventas, devoluciones, clientes, productos, inventario, servicios, paquetes, agendamiento, horarios y administración.

El sistema de diseño se implementará mediante un componente `StandardTable` reutilizable y/o clases CSS globales en `globals.css`, aprovechando los tokens de diseño ya definidos en la paleta oscura del proyecto (negro/gris/naranja cobrizo).

## Glossary

- **StandardTable**: Componente React reutilizable que encapsula el diseño estándar de tabla para todos los módulos.
- **TableHeaderSection**: Componente compartido existente en `src/shared/components/ui/table-header-section.tsx` que contiene buscador, filtro y contador.
- **Design_Token**: Variable CSS definida en `src/styles/globals.css` que representa un valor de diseño (color, espaciado, tipografía).
- **Status_Badge**: Elemento visual (pill/badge) que muestra el estado de un registro (ej. Completada, Anulada, Activo, Cancelada).
- **Table_Header**: Fila de encabezados (`<thead>`) de una tabla que contiene los nombres de las columnas (`<th>`).
- **Table_Row**: Fila de datos (`<tr>`) dentro del cuerpo de la tabla (`<tbody>`).
- **Table_Cell**: Celda de datos (`<td>`) dentro de una fila de la tabla.
- **Record_Counter**: Elemento de texto que muestra la cantidad de registros visibles vs. el total.
- **Search_Input**: Campo de texto para filtrar registros por búsqueda libre.
- **Filter_Select**: Elemento `<select>` o componente Select para filtrar registros por categoría o estado.
- **DM_Sans**: Fuente tipográfica Google Fonts usada como estándar en el módulo de devoluciones.
- **gray-lightest**: Token de color `#d0d0d0` / `--gray-lightest` definido en `globals.css`.
- **black-secondary**: Token de color `#111111` / `--black-secondary` definido en `globals.css`.
- **Status_Green**: Color desaturado `#7aab8a` para estados positivos (Completada, Activo).
- **Status_Red**: Color desaturado `#b07070` para estados negativos (Anulada, Cancelada).

---

## Requirements

### Requirement 1: Tipografía estándar con DM Sans

**User Story:** Como desarrollador, quiero que todas las tablas usen la fuente DM Sans, para que la interfaz tenga una tipografía consistente en todos los módulos.

#### Acceptance Criteria

1. THE StandardTable SHALL aplicar la fuente `'DM Sans', 'Segoe UI', sans-serif` a todos los elementos de texto dentro de la tabla (encabezados, celdas, badges, contadores).
2. WHEN el componente StandardTable se renderiza, THE StandardTable SHALL cargar la fuente DM Sans desde Google Fonts si no está ya disponible en el documento.
3. THE TableHeaderSection SHALL aplicar la misma familia tipográfica `'DM Sans', 'Segoe UI', sans-serif` a los controles de búsqueda y filtro cuando se usa junto a StandardTable.

---

### Requirement 2: Color gris para información de celdas

**User Story:** Como diseñador, quiero que el texto de las celdas de datos use el color `#d0d0d0` (gray-lightest), para que la información no compita visualmente con los encabezados y elementos de acción.

#### Acceptance Criteria

1. THE StandardTable SHALL aplicar el color `var(--gray-lightest)` (`#d0d0d0`) al texto de todas las Table_Cell de datos.
2. THE StandardTable SHALL aplicar el color `var(--white-primary)` (`#ffffff`) al texto de la primera columna o columna de identificador principal de cada Table_Row, para mantener jerarquía visual.
3. IF una Table_Cell contiene un Status_Badge, THEN THE StandardTable SHALL delegar el color al propio Status_Badge y no sobreescribir su color de texto.
4. THE Table_Header SHALL aplicar el color `var(--gray-lightest)` a los textos de los encabezados (`<th>`), con `font-weight: 700` y `text-transform: uppercase`.

---

### Requirement 3: Badges de estado con colores desaturados

**User Story:** Como diseñador, quiero que los badges de estado usen colores desaturados en lugar de los verdes y rojos saturados de Tailwind, para que el diseño sea más elegante y coherente con la paleta oscura del sistema.

#### Acceptance Criteria

1. THE StandardTable SHALL renderizar los Status_Badge de estado positivo (Completada, Activo, Pagado, Disponible) con color de fondo `#7aab8a` (Status_Green) y texto `#212020` (black-primary).
2. THE StandardTable SHALL renderizar los Status_Badge de estado negativo (Anulada, Cancelada, Inactivo, Rechazado) con color de fondo `#b07070` (Status_Red) y texto `#212020` (black-primary).
3. THE StandardTable SHALL renderizar los Status_Badge de estado neutro o pendiente (Pendiente, En proceso, Parcial) con color de fondo `#4a4a4a` y texto `#f3f4f6`.
4. WHEN un módulo usa clases Tailwind `green-400` o `red-400` para badges de estado, THE StandardTable SHALL reemplazar esos colores con Status_Green y Status_Red respectivamente.
5. THE Status_Badge SHALL tener `border-radius: 9999px`, `font-size: 11px`, `font-weight: 700`, y un ancho mínimo de `5rem` para mantener consistencia visual entre módulos.

---

### Requirement 4: Espaciado simétrico en encabezados de tabla

**User Story:** Como diseñador, quiero que los encabezados de columna tengan padding simétrico y alineación centrada, para que la tabla se vea ordenada y profesional.

#### Acceptance Criteria

1. THE Table_Header SHALL aplicar `padding: 13px 16px` a todos los elementos `<th>`.
2. THE Table_Header SHALL aplicar `text-align: center` a todos los `<th>` excepto al primero, que SHALL tener `text-align: left` con `padding-left: 20px`.
3. THE Table_Header SHALL aplicar `letter-spacing: 0.06em` y `text-transform: uppercase` a todos los textos de `<th>`.
4. THE Table_Header SHALL aplicar `font-size: 11px` a todos los textos de `<th>` para diferenciarlos visualmente del contenido de las celdas.
5. THE Table_Header SHALL aplicar `white-space: nowrap` a todos los `<th>` para evitar que los encabezados se partan en múltiples líneas.

---

### Requirement 5: Líneas separadoras de ancho completo

**User Story:** Como diseñador, quiero que las líneas divisoras entre filas se extiendan hasta el borde del contenedor de la tabla, para que el diseño se vea limpio y sin cortes visuales.

#### Acceptance Criteria

1. THE StandardTable SHALL aplicar `border-bottom: 1px solid var(--gray-darker)` a cada Table_Row, extendiéndose al 100% del ancho del contenedor.
2. THE StandardTable SHALL usar `border-collapse: collapse` en el elemento `<table>` para eliminar espacios entre bordes de celdas.
3. THE StandardTable SHALL asegurarse de que el contenedor de la tabla tenga `overflow: hidden` o `overflow-x: auto` sin márgenes laterales internos que corten los separadores.
4. IF una Table_Row es la última del tbody, THEN THE StandardTable SHALL omitir el `border-bottom` de esa fila para evitar duplicación con el borde del contenedor.
5. THE Table_Header SHALL aplicar `border-bottom: 1px solid var(--gray-darker)` como separador entre encabezados y el primer Table_Row de datos.

---

### Requirement 6: Contador de registros en esquina superior derecha

**User Story:** Como usuario, quiero ver la cantidad de registros mostrados en la esquina superior derecha del contenedor de la tabla, para identificar rápidamente cuántos resultados hay sin tener que desplazarme.

#### Acceptance Criteria

1. THE TableHeaderSection SHALL posicionar el Record_Counter en el extremo derecho de la barra de herramientas de la tabla (`margin-left: auto` o `justify-content: space-between`).
2. THE Record_Counter SHALL mostrar el texto en formato `"X de Y registros"` o `"Mostrando X de Y"`, donde X es el número de registros visibles y Y es el total.
3. THE Record_Counter SHALL aplicar el color `var(--gray-lightest)` y `font-size: 13px`.
4. WHEN el valor de `recordsPlacement` en TableHeaderSection es `"right"` (valor por defecto), THE TableHeaderSection SHALL renderizar el Record_Counter en el contenedor derecho de la barra.
5. THE TableHeaderSection SHALL mantener el Record_Counter visible en pantallas pequeñas, permitiendo que la barra de herramientas haga wrap sin ocultar el contador.

---

### Requirement 7: Fondo negro para controles de búsqueda y filtro

**User Story:** Como diseñador, quiero que el Search_Input y el Filter_Select tengan fondo negro (`#111111`), para que sean consistentes con el diseño del módulo de devoluciones y se integren mejor con la paleta oscura.

#### Acceptance Criteria

1. THE Search_Input SHALL aplicar `background-color: var(--black-secondary)` (`#111111`) como color de fondo.
2. THE Filter_Select SHALL aplicar `background-color: var(--black-secondary)` (`#111111`) como color de fondo.
3. THE Search_Input SHALL aplicar `border: 1px solid var(--gray-darker)` y `border-radius: 8px`.
4. THE Filter_Select SHALL aplicar `border: 1px solid var(--gray-darker)` y `border-radius: 8px`.
5. WHEN el Search_Input recibe foco, THE Search_Input SHALL cambiar el borde a `border-color: var(--orange-primary)` para indicar el estado activo.
6. WHEN el Filter_Select recibe foco, THE Filter_Select SHALL cambiar el borde a `border-color: var(--orange-primary)` para indicar el estado activo.
7. THE Search_Input SHALL mostrar el placeholder con color `var(--gray-dark)` (`#3a3a3a`) para diferenciarlo del texto ingresado.
8. THE TableHeaderSection SHALL actualizar la clase `elegante-input` existente en `globals.css` o proveer una variante `elegante-input-dark` que aplique el fondo `black-secondary` en lugar del `search-filter-bg` actual (`#333232`).

---

### Requirement 8: Componente StandardTable reutilizable

**User Story:** Como desarrollador, quiero un componente StandardTable centralizado, para poder aplicar el diseño estándar a todos los módulos sin duplicar estilos.

#### Acceptance Criteria

1. THE StandardTable SHALL exportarse desde `src/shared/components/ui/standard-table.tsx` como un componente React con TypeScript.
2. THE StandardTable SHALL aceptar las siguientes props: `columns` (definición de columnas), `data` (array de registros), `loading` (estado de carga), `emptyMessage` (mensaje vacío opcional).
3. THE StandardTable SHALL ser compatible con el componente TableHeaderSection existente, permitiendo que se use como wrapper o de forma independiente.
4. THE StandardTable SHALL aplicar automáticamente todos los estilos definidos en los Requisitos 1 al 7 sin necesidad de clases adicionales en los módulos consumidores.
5. WHEN `loading` es `true`, THE StandardTable SHALL renderizar el componente TableLoadingStateRow existente en lugar de las filas de datos.
6. WHEN `data` está vacío y `loading` es `false`, THE StandardTable SHALL renderizar el componente TableEmptyStateRow existente con el `emptyMessage` proporcionado.
7. THE StandardTable SHALL exponer subcomponentes tipados: `StandardTable.Header`, `StandardTable.Body`, `StandardTable.Row`, `StandardTable.Cell`, `StandardTable.StatusBadge` para uso flexible en módulos con estructuras de tabla complejas.

---

### Requirement 9: Compatibilidad con módulos existentes

**User Story:** Como desarrollador, quiero que el sistema de diseño estándar sea compatible con los módulos existentes, para poder migrar cada módulo de forma incremental sin romper funcionalidad.

#### Acceptance Criteria

1. THE StandardTable SHALL ser retrocompatible con los módulos que usan el componente `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead` y `TableCell` de `src/shared/components/ui/table.tsx`.
2. WHEN un módulo migra a StandardTable, THE StandardTable SHALL mantener toda la funcionalidad existente (paginación, ordenamiento, acciones por fila, expansión de filas).
3. THE StandardTable SHALL documentar en comentarios JSDoc los props requeridos y opcionales para facilitar la adopción en los módulos: ventas, clientes, productos, inventario, servicios, paquetes, agendamiento, horarios y administración.
4. IF un módulo tiene una estructura de tabla personalizada (como filas expandibles en DevolucionesPage), THEN THE StandardTable SHALL permitir el uso de los subcomponentes individuales (`StandardTable.Row`, `StandardTable.Cell`) sin requerir el componente completo.
5. THE StandardTable SHALL incluir tokens CSS adicionales en `globals.css` para `--status-green: #7aab8a` y `--status-red: #b07070` que puedan usarse directamente en módulos que no migren al componente completo.
