# Requirements Document

## Introduction

Este documento describe los requisitos para el rediseño del formulario de agendamiento de citas en la aplicación de barbería. El formulario existe en dos contextos: la vista de administración (`AgendamientoPage.tsx`) y la vista del cliente (`ClienteMisCitasPageCalendar.tsx`). El rediseño convierte el formulario de un panel inline (master-detail) a un modal flotante estilo Google Calendar, adoptando el mismo estándar visual del popover de detalle de cita ya existente en el proyecto, reorganizando los campos actuales en un layout de filas con ícono + contenido, y consolidando los buscadores de servicios y paquetes bajo un switch de dos opciones.

## Glossary

- **Modal_Formulario**: El formulario flotante de creación/edición de citas, renderizado como modal usando `createPortal` con el mismo estilo del popover existente.
- **Vista_Admin**: La vista de agendamiento accesible por administradores (`AgendamientoPage.tsx`).
- **Vista_Cliente**: La vista de agendamiento accesible por clientes (`ClienteMisCitasPageCalendar.tsx`).
- **Fila_Formulario**: Unidad visual del formulario compuesta por un ícono a la izquierda (72px de ancho fijo) y el contenido a la derecha.
- **Switch_Tipo**: El toggle de dos opciones "Individuales" / "Paquetes" que determina qué buscador de servicios se muestra.
- **Buscador_Autocomplete**: Campo de búsqueda con lista desplegable de resultados filtrados en tiempo real.
- **Tag_Removible**: Elemento visual tipo píldora que representa un ítem seleccionado y puede eliminarse con un botón "×".
- **Picker_Fecha_Hora**: Componente que muestra fecha y hora como texto informativo hasta que el usuario hace clic para activar la edición.
- **Disponibilidad_Barbero**: La lógica existente que calcula días y horas libres de un barbero según sus horarios configurados y citas existentes.
- **Estado_Modal**: Estados de control del modal (`isCreateModalOpen`, `modalPosition`, `modalPhase`) que gestionan la apertura, posición y animaciones del modal.

---

## Requirements

### Requirement 1: Arquitectura Modal Flotante

**User Story:** Como usuario (admin o cliente), quiero que el formulario de agendamiento se abra como un modal flotante estilo Google Calendar, para tener una experiencia visual consistente con el popover de detalle de cita existente.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL renderizarse usando `createPortal` para aparecer como una ventana flotante sobre el contenido principal.
2. THE Modal_Formulario SHALL aplicar el mismo estilo visual del popover existente: `bg-gray-darkest`, `border-gray-dark/60`, sombras y bordes redondeados.
3. WHEN el usuario hace clic en el botón "Nueva Cita", THE Vista_Admin SHALL abrir el Modal_Formulario con `isCreateModalOpen: true`.
4. WHEN el usuario hace clic en un slot vacío del calendario, THE Vista_Admin SHALL abrir el Modal_Formulario con la fecha y hora del slot seleccionado.
5. WHEN el Modal_Formulario está abierto, THE Vista_Admin SHALL mostrar un overlay semi-transparente detrás del modal.
6. THE Modal_Formulario SHALL posicionarse dinámicamente usando `modalPosition` para evitar salirse de la pantalla.
7. THE Modal_Formulario SHALL implementar las mismas fases de animación del popover existente: `enter`, `open`, `exit` con duración de 200ms.

---

### Requirement 2: Controles de Apertura y Cierre del Modal

**User Story:** Como usuario (admin o cliente), quiero poder abrir el modal desde múltiples puntos de entrada y cerrarlo de forma intuitiva, para tener control completo sobre la interfaz.

#### Acceptance Criteria

1. WHEN el usuario hace clic en el botón "Nueva Cita" en la barra de herramientas, THE Modal_Formulario SHALL abrirse con campos vacíos y fecha/hora automática.
2. WHEN el usuario hace clic en un slot vacío del calendario, THE Modal_Formulario SHALL abrirse con la fecha y hora del slot preseleccionadas.
3. WHEN el usuario presiona la tecla ESC mientras el Modal_Formulario está abierto, THE Modal_Formulario SHALL cerrarse sin guardar cambios.
4. WHEN el usuario hace clic en el overlay (área fuera del modal), THE Modal_Formulario SHALL cerrarse sin guardar cambios.
5. WHEN el usuario hace clic en el botón "Cancelar" del Modal_Formulario, THE Modal_Formulario SHALL cerrarse sin guardar cambios.
6. WHEN el usuario hace clic en el botón "Guardar" del Modal_Formulario con datos válidos, THE Modal_Formulario SHALL guardar la cita y cerrarse.
7. WHEN el Modal_Formulario se cierra, THE Vista_Admin SHALL restablecer todos los estados del formulario (`nuevaCita`, `showFormErrors`, términos de búsqueda) a sus valores iniciales.

---

### Requirement 3: Layout Visual del Modal

**User Story:** Como usuario (admin o cliente), quiero que el modal tenga un diseño consistente con el popover de detalle de cita existente, para que la experiencia visual sea coherente en toda la aplicación.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL renderizar cada campo como una Fila_Formulario con un ícono a la izquierda en un contenedor de 72px de ancho fijo y el contenido del campo a la derecha.
2. THE Modal_Formulario SHALL aplicar `bg-gray-darkest` como color de fondo del modal.
3. THE Modal_Formulario SHALL aplicar `border-gray-dark/60` como color de borde en los separadores entre secciones.
4. THE Modal_Formulario SHALL mostrar los valores de los campos con la clase `text-gray-lightest` y las etiquetas con `text-gray-lighter`.
5. THE Modal_Formulario SHALL incluir un header con título "Nueva Cita" o "Editar Cita" y un botón de cierre (×) en la esquina superior derecha.
6. THE Modal_Formulario SHALL renderizar separadores sutiles entre las secciones del formulario.
7. THE Modal_Formulario SHALL tener un ancho máximo apropiado y altura adaptativa según el contenido, con scroll interno si es necesario.

---

### Requirement 4: Campo Cliente (Vista Admin)

**User Story:** Como administrador, quiero buscar y seleccionar un cliente mediante un autocomplete al inicio del formulario modal, para identificar claramente a quién pertenece la cita.

#### Acceptance Criteria

1. THE Vista_Admin SHALL mostrar el campo Cliente como la primera Fila_Formulario del Modal_Formulario, con un ícono de usuario a la izquierda.
2. WHEN el administrador escribe en el campo Cliente, THE Buscador_Autocomplete SHALL filtrar la lista de clientes por nombre o teléfono en tiempo real.
3. WHEN el Buscador_Autocomplete muestra resultados de clientes, THE Vista_Admin SHALL renderizar en cada resultado la foto de perfil, el nombre y el teléfono del cliente.
4. WHEN el administrador selecciona un cliente, THE Vista_Admin SHALL mostrar el nombre del cliente como texto en el campo y almacenar el `clienteId` en el estado de la cita.
5. WHEN el administrador limpia la selección del cliente, THE Vista_Admin SHALL restablecer `clienteId` a 0 y vaciar el campo de búsqueda.
6. IF el administrador intenta guardar la cita sin haber seleccionado un cliente, THEN THE Vista_Admin SHALL mostrar el mensaje de error "Selecciona un cliente" en el campo Cliente y bloquear el cierre del modal.

---

### Requirement 5: Switch Individuales / Paquetes

**User Story:** Como usuario (admin o cliente), quiero un switch visual de dos opciones para alternar entre buscar servicios individuales o paquetes dentro del modal, para simplificar la selección del tipo de servicio.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar el Switch_Tipo como una Fila_Formulario con dos opciones: "Individuales" y "Paquetes".
2. THE Switch_Tipo SHALL tener apariencia visual similar a las tabs de Google Calendar (Evento / Tarea / Agenda), con la opción activa resaltada.
3. WHEN el usuario selecciona "Individuales" en el Switch_Tipo, THE Modal_Formulario SHALL mostrar el Buscador_Autocomplete de servicios individuales en la sección de servicio/paquete.
4. WHEN el usuario selecciona "Paquetes" en el Switch_Tipo, THE Modal_Formulario SHALL mostrar el Buscador_Autocomplete de paquetes en la sección de servicio/paquete.
5. WHEN el usuario cambia la opción del Switch_Tipo, THE Modal_Formulario SHALL mantener sin cambios todos los demás campos del formulario (cliente, barbero, fecha, hora, productos, notas).
6. WHEN el usuario cambia el Switch_Tipo de "Individuales" a "Paquetes", THE Modal_Formulario SHALL limpiar los servicios individuales seleccionados previamente.
7. WHEN el usuario cambia el Switch_Tipo de "Paquetes" a "Individuales", THE Modal_Formulario SHALL limpiar el paquete seleccionado previamente y cualquier servicio individual que pudiera estar en estado no seleccionado.

---

### Requirement 6: Campo Fecha y Hora con Edición Inline

**User Story:** Como usuario (admin o cliente), quiero ver la fecha y hora de la cita como texto informativo dentro del modal y poder editarlos haciendo clic, para tener una experiencia de edición fluida similar a Google Calendar.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar la fecha y hora como una Fila_Formulario con un ícono de calendario a la izquierda.
2. WHILE no se ha activado la edición, THE Modal_Formulario SHALL mostrar la fecha y hora como texto plano sin bordes de input (ej: "Lunes, 14 de julio · 10:00 AM – 11:00 AM").
3. WHEN el usuario hace clic sobre el texto de fecha, THE Modal_Formulario SHALL activar el modo edición del picker de fecha. WHEN el usuario hace clic sobre el texto de hora, THE Modal_Formulario SHALL activar el modo edición del picker de hora.
4. WHEN el usuario selecciona una fecha en el modo edición, THE Modal_Formulario SHALL actualizar el texto informativo con la nueva fecha y desactivar el modo edición del picker de fecha.
5. WHEN el usuario selecciona una hora en el modo edición, THE Modal_Formulario SHALL actualizar el texto informativo con la nueva hora y desactivar el modo edición del picker de hora.
6. THE Modal_Formulario SHALL mantener la lógica existente de Disponibilidad_Barbero para filtrar los días y horas disponibles según el barbero seleccionado.
7. THE Modal_Formulario SHALL mantener el picker interactivo de días disponibles del barbero (chips horizontales con días y horas libres) que ya existe en la Vista_Admin.
8. IF el usuario intenta guardar la cita sin haber seleccionado fecha u hora, THEN THE Modal_Formulario SHALL mostrar el mensaje de error correspondiente en la Fila_Formulario de fecha y hora y bloquear el cierre del modal.

---

### Requirement 7: Campo Agregar Barbero

**User Story:** Como usuario (admin o cliente), quiero buscar y seleccionar un barbero mediante un autocomplete dentro del modal, para asignar la cita al profesional deseado.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar el campo Barbero como una Fila_Formulario con un ícono de persona a la izquierda.
2. WHEN el usuario escribe en el campo Barbero, THE Buscador_Autocomplete SHALL filtrar la lista de barberos por nombre en tiempo real.
3. WHEN el Buscador_Autocomplete muestra resultados de barberos, THE Modal_Formulario SHALL renderizar en cada resultado la foto de perfil y el nombre del barbero.
4. WHEN el usuario selecciona un barbero, THE Modal_Formulario SHALL almacenar el `barberoId` y el nombre del barbero en el estado de la cita.
5. WHEN el usuario limpia la selección del barbero, THE Modal_Formulario SHALL restablecer `barberoId` a 0 y vaciar el campo de búsqueda.
6. IF el usuario intenta guardar la cita sin haber seleccionado un barbero, THEN THE Modal_Formulario SHALL mostrar el mensaje de error "Selecciona un barbero" en el campo Barbero y bloquear el cierre del modal.
7. THE Modal_Formulario SHALL mantener la lógica existente de Disponibilidad_Barbero activa al seleccionar un barbero.

---

### Requirement 8: Campo Agregar Servicio / Paquete

**User Story:** Como usuario (admin o cliente), quiero buscar y seleccionar servicios individuales o paquetes según el Switch_Tipo activo dentro del modal, para definir qué tratamientos incluirá la cita.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar el campo de servicio/paquete como una Fila_Formulario con un ícono de tijeras (servicios) o paquete (paquetes) a la izquierda.
2. WHILE el Switch_Tipo está en "Individuales", THE Buscador_Autocomplete SHALL mostrar servicios individuales filtrados por nombre, excluyendo los ya seleccionados.
3. WHILE el Switch_Tipo está en "Paquetes", THE Buscador_Autocomplete SHALL mostrar paquetes filtrados por nombre.
4. WHEN el usuario selecciona un servicio individual, THE Modal_Formulario SHALL agregar el servicio a la lista de seleccionados y mostrarlo como Tag_Removible con nombre y precio.
5. WHEN el usuario hace clic en el botón "×" de un Tag_Removible de servicio, THE Modal_Formulario SHALL eliminar ese servicio de la lista de seleccionados.
6. WHEN el usuario selecciona un paquete, THE Modal_Formulario SHALL mostrar el paquete seleccionado como Tag_Removible con nombre y precio.
7. WHEN el usuario hace clic en el botón "×" del Tag_Removible de paquete, THE Modal_Formulario SHALL eliminar el paquete seleccionado y limpiar el campo de búsqueda.
8. IF el usuario intenta guardar la cita sin haber seleccionado al menos un servicio o un paquete, THEN THE Modal_Formulario SHALL mostrar el mensaje de error "Selecciona al menos un servicio o paquete" y bloquear el cierre del modal.

---

### Requirement 9: Campo Agregar Producto

**User Story:** Como usuario (admin o cliente), quiero buscar y agregar productos adicionales a la cita dentro del modal, para incluir artículos de venta junto con el servicio.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar el campo Producto como una Fila_Formulario con un ícono de bolsa de compras a la izquierda.
2. WHILE no hay ningún servicio ni paquete seleccionado, THE Modal_Formulario SHALL ocultar el Buscador_Autocomplete de productos y mostrar un texto informativo indicando que primero se debe seleccionar un servicio o paquete.
3. WHEN hay al menos un servicio o paquete seleccionado, THE Modal_Formulario SHALL mostrar el Buscador_Autocomplete de productos.
4. WHEN el usuario escribe en el campo Producto y el Buscador_Autocomplete está visible, THE Buscador_Autocomplete SHALL filtrar la lista de productos por nombre en tiempo real.
5. WHEN el usuario selecciona un producto, THE Modal_Formulario SHALL agregar el producto con cantidad 1 y mostrarlo con controles de incremento/decremento y botón de eliminación.
6. WHEN el usuario hace clic en el botón de incremento de un producto, THE Modal_Formulario SHALL aumentar la cantidad del producto en 1.
7. WHEN el usuario hace clic en el botón de decremento de un producto con cantidad mayor a 1, THE Modal_Formulario SHALL disminuir la cantidad del producto en 1.
8. WHEN el usuario hace clic en el botón de decremento de un producto con cantidad igual a 1, THE Modal_Formulario SHALL eliminar el producto de la lista de seleccionados.
9. WHEN el usuario hace clic en el botón de eliminación de un producto, THE Modal_Formulario SHALL eliminar el producto de la lista de seleccionados independientemente de su cantidad.

---

### Requirement 10: Campo Agregar Notas

**User Story:** Como usuario (admin o cliente), quiero agregar notas adicionales a la cita dentro del modal, para comunicar instrucciones o preferencias especiales al barbero.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL mostrar el campo Notas como una Fila_Formulario con un ícono de nota/descripción a la izquierda.
2. THE Modal_Formulario SHALL renderizar el campo Notas como un textarea de texto libre.
3. WHEN el usuario escribe en el campo Notas, THE Modal_Formulario SHALL actualizar el valor de notas en el estado de la cita en tiempo real.
4. THE Modal_Formulario SHALL mostrar un placeholder descriptivo en el campo Notas cuando esté vacío (ej: "Agregar notas o instrucciones especiales...").

---

### Requirement 11: Consistencia entre Vista Admin y Vista Cliente

**User Story:** Como desarrollador, quiero que ambas vistas del formulario modal (admin y cliente) compartan el mismo estándar visual y de comportamiento, para reducir la duplicación de código y mantener la coherencia de la aplicación.

#### Acceptance Criteria

1. THE Vista_Admin y THE Vista_Cliente SHALL aplicar el mismo sistema de Modal_Formulario con Fila_Formulario (ícono 72px + contenido) para todos los campos equivalentes.
2. THE Vista_Admin y THE Vista_Cliente SHALL usar los mismos tokens de color: `bg-gray-darkest`, `border-gray-dark/60`, `text-gray-lightest`, `text-gray-lighter`.
3. THE Vista_Admin SHALL incluir el campo Cliente como primera fila del modal, mientras que THE Vista_Cliente SHALL omitir dicho campo (el cliente es el usuario autenticado).
4. THE Vista_Admin y THE Vista_Cliente SHALL implementar el Switch_Tipo con el mismo comportamiento y apariencia visual dentro del modal.
5. THE Vista_Admin y THE Vista_Cliente SHALL mantener sus respectivas lógicas de validación de disponibilidad del barbero sin modificaciones funcionales.
6. THE Vista_Admin y THE Vista_Cliente SHALL usar los mismos Estados_Modal (`isCreateModalOpen`, `modalPosition`, `modalPhase`) para controlar la apertura y cierre del modal.

---

### Requirement 12: Validación y Guardado del Modal

**User Story:** Como usuario (admin o cliente), quiero que el modal valide los campos obligatorios antes de guardar y cerrarse, para evitar crear citas incompletas.

#### Acceptance Criteria

1. THE Modal_Formulario SHALL considerar como campos obligatorios: barbero, al menos un servicio o paquete, fecha y hora.
2. THE Vista_Admin SHALL considerar adicionalmente el campo cliente como obligatorio.
3. WHEN el usuario hace clic en el botón "Guardar" con campos obligatorios vacíos, THE Modal_Formulario SHALL mostrar mensajes de error en cada campo incompleto y bloquear el cierre del modal.
4. WHEN todos los campos obligatorios están completos en la Vista_Admin (cliente, barbero, servicio/paquete, fecha y hora), THE Vista_Admin SHALL habilitar el guardado, ejecutar la lógica existente y cerrar el modal.
5. WHEN todos los campos obligatorios están completos en la Vista_Cliente (barbero, servicio/paquete, fecha y hora), THE Vista_Cliente SHALL habilitar el guardado, ejecutar la lógica existente y cerrar el modal.
6. THE Modal_Formulario SHALL mantener la lógica de guardado existente (llamadas a API, manejo de estado, notificaciones) sin modificaciones funcionales.
7. IF la validación detecta campos incompletos, THEN THE Modal_Formulario SHALL permanecer abierto hasta que todos los campos obligatorios estén completos o el usuario cancele la operación.
