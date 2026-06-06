# Implementation Plan: appointment-form-redesign

## Overview

Rediseño del formulario de agendamiento en dos archivos (`AgendamientoPage.tsx` y `ClienteMisCitasPageCalendar.tsx`) para convertir el panel inline (master-detail) en un **modal flotante estilo Google Calendar** usando `createPortal`. El modal adopta el layout de filas verticales (Fila_Formulario: ícono 72px + contenido) y el mismo estilo visual del popover de detalle de cita existente. El cambio es de arquitectura UI y organización visual; toda la lógica de estado, validación y guardado permanece intacta.

**CAMBIO CRÍTICO**: El formulario debe convertirse de un panel inline (master-detail) a un modal flotante estilo Google Calendar, igual que el popover de detalle de cita existente, usando `createPortal` para renderizado fuera del DOM principal.

## Tasks

- [x] 1. Agregar estados del modal y UI en AgendamientoPage
  - [x] 1.1 Agregar estados del modal (`isCreateModalOpen`, `modalPosition`, `modalPhase`) y estados de UI (`tipoServicio`, `editingFecha`, `editingHora`) como `useState` junto a los demás estados del formulario en `AgendamientoPage.tsx`
    - Declarar `const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)`
    - Declarar `const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null)`
    - Declarar `const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter')`
    - Declarar `const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales')`
    - Declarar `const [editingFecha, setEditingFecha] = useState(false)`
    - Declarar `const [editingHora, setEditingHora] = useState(false)`
    - _Requirements: 1.1, 1.6, 2.7, 3.1, 4.3_

  - [x] 1.2 Implementar funciones de control del modal (`handleOpenCreateModal`, `handleSlotClick`, `handleCloseModal`) en `AgendamientoPage.tsx`
    - `handleOpenCreateModal`: calcular posición centrada, abrir modal, resetear formulario, inicializar animación
    - `handleSlotClick`: calcular posición cerca del slot, abrir modal con fecha/hora preseleccionadas, resetear otros estados
    - `handleCloseModal`: iniciar animación de salida, cerrar modal después de 200ms, resetear estados
    - Agregar listener de ESC para cerrar modal
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 1.3 Implementar la función helper `formatFechaHoraTexto` en `AgendamientoPage.tsx`
    - Retorna `'Selecciona fecha y hora'` si no hay fecha ni hora
    - Formatea la fecha con `toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })`
    - Formatea la hora de inicio y fin usando `formatHoraStr12` y la duración de `nuevaCita.duracion`
    - _Requirements: 6.2_

- [ ] 2. Implementar el Modal_Formulario con createPortal en AgendamientoPage
  - [x] 2.1 Reemplazar la sección `viewMode === 'crear'` en `AgendamientoPage.tsx` con el Modal_Formulario usando `createPortal`
    - Eliminar el layout master-detail existente (`<aside>` y `<section>`)
    - Implementar `createPortal` con backdrop semi-transparente y modal container
    - Aplicar el mismo estilo del popover existente: `bg-gray-darkest`, `border-gray-dark/60`, sombras, animaciones
    - Estructura: header (título + botón cerrar) + contenido scrollable + footer sticky (botones)
    - _Requirements: 1.1, 1.2, 1.5, 1.7, 3.3, 3.4_

  - [x] 2.2 Implementar Fila_Formulario de Cliente dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Contenedor `<div className="flex items-center gap-0 py-3">` con ícono `<User />` en columna de 72px
    - Reutilizar el `SearchField` de cliente existente en la columna de contenido
    - Agregar separador `border-t border-gray-dark/60` debajo de la fila
    - _Requirements: 1.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 2.3 Implementar Fila_Formulario del Switch_Tipo dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<Scissors />` o `<Package />` según `tipoServicio` en columna de 72px
    - Renderizar el Switch_Tipo con los botones "Individuales" / "Paquetes" según el diseño
    - Al cambiar a "Paquetes": `setTipoServicio('paquetes')` y limpiar `servicioIds`, `servicioId`, `servicio`
    - Al cambiar a "Individuales": `setTipoServicio('individuales')` y limpiar `paqueteId`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 2.4 Implementar Fila_Formulario de Servicio/Paquete dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<Scissors />` (individuales) o `<Package />` (paquetes) en columna de 72px
    - Cuando `tipoServicio === 'individuales'`: mostrar `SearchField` de servicios con `Tags_Removibles` y filtro que excluye `servicioIds`
    - Cuando `tipoServicio === 'paquetes'`: mostrar `SearchField` de paquetes con `Tag_Removible` del paquete seleccionado
    - Mantener mensajes de error con `showFormErrors`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 2.5 Implementar Fila_Formulario de Fecha y Hora dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<CalendarDays />` en columna de 72px
    - Cuando `!editingFecha && !editingHora`: mostrar botón con texto de `formatFechaHoraTexto()` que activa `setEditingFecha(true)`
    - Cuando `editingFecha || editingHora`: mostrar el picker de días/horas del barbero existente (chips horizontales) sin modificar su lógica
    - Al seleccionar fecha: `setEditingFecha(false)`; al seleccionar hora: `setEditingHora(false)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [x] 2.6 Implementar Fila_Formulario de Barbero dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<User />` en columna de 72px
    - Reutilizar el `SearchField` de barbero existente con foto y nombre en resultados
    - Mantener la lógica de `Disponibilidad_Barbero` sin cambios
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 2.7 Implementar Fila_Formulario de Producto dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<ShoppingBag />` en columna de 72px
    - Cuando no hay servicio ni paquete seleccionado: mostrar texto informativo en lugar del buscador
    - Cuando hay servicio o paquete: mostrar `SearchField` de productos con controles de cantidad (incremento/decremento/eliminación)
    - Al decrementar a 0: eliminar el producto de `productoCantidades`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

  - [x] 2.8 Implementar Fila_Formulario de Notas dentro del Modal_Formulario en `AgendamientoPage.tsx`
    - Ícono `<FileText />` en columna de 72px
    - Textarea con `value={nuevaCita.notas}` y `onChange` que actualiza el estado en tiempo real
    - Placeholder: `"Agregar notas o instrucciones especiales..."`
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [ ]* 2.9 Escribir property test — Property 1: Filtrado excluye ítems ya seleccionados
    - **Property 1: Filtrado de autocomplete excluye ítems ya seleccionados**
    - **Validates: Requirements 6.2**
    - Usar `fast-check`: generar array de servicios y array de `servicioIds` seleccionados; verificar que `filterFn` no retorna ningún servicio cuyo `id` esté en `servicioIds`

  - [ ]* 2.10 Escribir property test — Property 3: Switch_Tipo preserva otros campos
    - **Property 3: Cambio de Switch_Tipo preserva otros campos**
    - **Validates: Requirements 3.5**
    - Usar `fast-check`: generar estado con `barberoId`, `fecha`, `hora`, `notas` no vacíos; simular cambio de `tipoServicio`; verificar que esos campos no cambian

- [x] 3. Checkpoint — AgendamientoPage Modal
  - Verificar que el Modal_Formulario se renderiza correctamente usando `createPortal` con el mismo estilo del popover existente.
  - Verificar que el modal se abre desde el botón "Nueva Cita" y desde clicks en slots vacíos del calendario.
  - Verificar que el modal se cierra con ESC, click en overlay, botón Cancelar, y guardado exitoso.
  - Verificar que todas las filas del formulario se renderizan en el orden correcto dentro del modal (Cliente → Switch → Servicio/Paquete → Fecha/Hora → Barbero → Producto → Notas).
  - Verificar que las animaciones de entrada y salida funcionan correctamente (200ms de duración).
  - Asegurarse de que todos los tests pasen; consultar al usuario si surgen dudas.

- [x] 4. Agregar estados del modal y UI en ClienteMisCitasPageCalendar
  - [x] 4.1 Agregar estados del modal (`isCreateModalOpen`, `modalPosition`, `modalPhase`) y estados de UI (`tipoServicio`, `editingFecha`, `editingHora`) como `useState` en `ClienteMisCitasPageCalendar.tsx`
    - Mismas declaraciones que en la tarea 1.1
    - _Requirements: 1.1, 1.6, 2.7, 3.1, 4.3, 11.6_

  - [x] 4.2 Implementar funciones de control del modal en `ClienteMisCitasPageCalendar.tsx`
    - Equivalente a la tarea 1.2 pero en los handlers correspondientes de este archivo
    - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 11.6_

  - [x] 4.3 Implementar la función helper `formatFechaHoraTexto` en `ClienteMisCitasPageCalendar.tsx`
    - Misma lógica que en la tarea 1.3
    - _Requirements: 6.2, 11.1_

- [x] 5. Implementar el Modal_Formulario con createPortal en ClienteMisCitasPageCalendar
  - [x] 5.1 Reemplazar la sección `viewMode === 'crear'` en `ClienteMisCitasPageCalendar.tsx` con el Modal_Formulario usando `createPortal`
    - Misma estructura base que en la tarea 2.1
    - Omitir la Fila_Formulario de Cliente (el cliente es el usuario autenticado)
    - _Requirements: 1.1, 1.2, 1.5, 1.7, 11.3, 11.6_

  - [x] 5.2 Implementar Fila_Formulario del Switch_Tipo dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento y apariencia que en la tarea 2.3
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 11.4_

  - [x] 5.3 Implementar Fila_Formulario de Servicio/Paquete dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento que en la tarea 2.4
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 11.1_

  - [x] 5.4 Implementar Fila_Formulario de Fecha y Hora dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento que en la tarea 2.5
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 11.1_

  - [x] 5.5 Implementar Fila_Formulario de Barbero dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento que en la tarea 2.6
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 11.5_

  - [x] 5.6 Implementar Fila_Formulario de Producto dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento que en la tarea 2.7
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 11.1_

  - [x] 5.7 Implementar Fila_Formulario de Notas dentro del Modal_Formulario en `ClienteMisCitasPageCalendar.tsx`
    - Mismo comportamiento que en la tarea 2.8
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 11.1_

  - [ ]* 5.8 Escribir property test — Property 2: Filtrado por nombre
    - **Property 2: Filtrado de autocomplete por nombre**
    - **Validates: Requirements 2.2, 5.2, 6.3, 7.4**
    - Usar `fast-check`: generar array de ítems con `nombre` y un query no vacío; verificar que todos los resultados de `filterFn` contienen el query (insensible a mayúsculas)

  - [ ]* 5.9 Escribir property test — Property 4: Validación bloquea envío con campos obligatorios vacíos
    - **Property 4: Validación bloquea envío con campos obligatorios vacíos**
    - **Validates: Requirements 10.3, 10.6**
    - Usar `fast-check`: generar estados con combinaciones de `barberoId`, `servicioIds`, `paqueteId`, `fecha`, `hora` donde al menos uno sea inválido; verificar que la función de validación retorna `false` sin llamar a la API

  - [ ]* 5.10 Escribir property test — Property 5: Sincronización bidireccional del campo Notas
    - **Property 5: Sincronización bidireccional del campo Notas**
    - **Validates: Requirements 8.3**
    - Usar `fast-check`: generar strings arbitrarios; simular `onChange` del textarea; verificar que `nuevaCita.notas` es exactamente igual al texto ingresado

- [x] 6. Checkpoint final — Verificar consistencia del modal entre vistas
  - Verificar que Vista_Admin y Vista_Cliente aplican el mismo patrón de Modal_Formulario con `createPortal` y estructura idéntica.
  - Verificar que ambos modales usan el mismo estilo del popover existente: `bg-gray-darkest`, `border-gray-dark/60`, sombras, animaciones.
  - Verificar que ambos modales aplican el mismo patrón de Fila_Formulario (ícono 72px + contenido) para todos los campos equivalentes.
  - Verificar que los controles de apertura/cierre funcionan igual en ambas vistas (ESC, overlay, botones, animaciones).
  - Verificar que el posicionamiento dinámico funciona correctamente en ambas vistas.
  - Verificar que los tokens de color son consistentes en ambas vistas.
  - Asegurarse de que todos los tests pasen; consultar al usuario si surgen dudas.

## Notes

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido.
- Cada tarea referencia los requisitos específicos para trazabilidad.
- Los checkpoints aseguran validación incremental antes de continuar.
- Las propiedades 1, 2, 3, 4 y 5 del diseño aplican para PBT con `fast-check`; la propiedad 6 se cubre con snapshot tests (no incluida como tarea de código separada).
- **CAMBIO CRÍTICO**: El formulario se convierte de panel inline (master-detail) a modal flotante usando `createPortal` con el mismo estilo del popover existente.
- **Arquitectura modal**: Usar `createPortal` en lugar de `viewMode === 'crear'` para renderizar el formulario como modal flotante.
- **Estados del modal**: Se agregan `isCreateModalOpen`, `modalPosition`, `modalPhase` para controlar apertura, posición y animaciones.
- **Funciones de control**: `handleOpenCreateModal`, `handleSlotClick`, `handleCloseModal` gestionan el ciclo de vida del modal.
- **Estructura del modal**: Header + contenido scrollable + footer sticky, igual que el popover de detalle de cita existente.
- **Activación del modal**: Botón "Nueva Cita" y clicks en slots vacíos abren el modal con posicionamiento dinámico.
- **Cierre del modal**: ESC, click fuera, Cancelar, Guardar exitoso cierran el modal con animación de salida de 200ms.
- **Estilo consistente**: El modal aplica exactamente el mismo estilo del popover de detalle de cita existente (`bg-gray-darkest`, `border-gray-dark/60`, sombras, animaciones).
- **Patrón Fila_Formulario**: Cada campo usa ícono de 72px + contenido, sin extraer componente separado.
- No se extrae ningún componente `FilaFormulario` — el patrón se repite inline en ambos archivos según la decisión de diseño.
- `FormSection` se elimina del formulario de creación en ambos archivos; puede seguir usándose en otras partes del proyecto.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "4.1", "4.2", "4.3"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.6", "5.2", "5.5"] },
    { "id": 3, "tasks": ["2.4", "2.5", "2.7", "2.8", "5.3", "5.4", "5.6", "5.7"] },
    { "id": 4, "tasks": ["3", "6"] },
    { "id": 5, "tasks": ["2.9", "2.10", "5.8", "5.9", "5.10"] }
  ]
}
```
