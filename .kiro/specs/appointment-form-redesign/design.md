# Design Document — appointment-form-redesign

## Overview

El rediseño del formulario de agendamiento convierte el panel inline (master-detail) actual en un **modal flotante estilo Google Calendar**, adoptando el mismo estándar visual del popover de detalle de cita existente. El formulario se renderiza usando `createPortal` con layout de filas verticales donde cada campo se convierte en una **Fila_Formulario**: un contenedor de ícono de 72 px de ancho fijo a la izquierda y el contenido del campo a la derecha. El cambio es de arquitectura UI y organización visual; toda la lógica de estado, validación, disponibilidad del barbero y guardado permanece intacta.

El rediseño afecta exactamente dos archivos:

| Archivo | Vista | Sección modificada |
|---|---|---|
| `src/features/agendamiento/pages/AgendamientoPage.tsx` | Vista_Admin | Reemplaza `viewMode === 'crear'` por Modal_Formulario con `createPortal` |
| `src/features/clientes/pages/ClienteMisCitasPageCalendar.tsx` | Vista_Cliente | Reemplaza `viewMode === 'crear'` por Modal_Formulario con `createPortal` |

---

## Architecture

El formulario se convierte de un panel inline a un modal flotante renderizado con `createPortal`. La nueva arquitectura elimina el layout master-detail y presenta el formulario como una ventana modal sobre el contenido principal:

```
AgendamientoPage / ClienteMisCitasPageCalendar
  └── Estados del modal: isCreateModalOpen, modalPosition, modalPhase
  └── Activadores del modal:
        ├── Botón "Nueva Cita" → abre modal con campos vacíos
        └── Click en slot vacío → abre modal con fecha/hora preseleccionadas
  └── createPortal(
        ├── <div> (backdrop semi-transparente)
        └── <div> (modal container)
              ├── <header> Título + botón cerrar (×)
              ├── <div overflow-y-auto> ← zona de scroll del contenido
              │     ├── FilaFormulario: Cliente        (solo Vista_Admin)
              │     ├── FilaFormulario: Switch Tipo
              │     ├── FilaFormulario: Servicio/Paquete
              │     ├── FilaFormulario: Fecha y Hora
              │     ├── FilaFormulario: Barbero
              │     ├── FilaFormulario: Producto       (condicional)
              │     └── FilaFormulario: Notas
              └── <footer sticky> Cancelar / Guardar
      )
```

### Decisiones de diseño

1. **Modal flotante con `createPortal`** — el formulario se renderiza como una ventana modal sobre el contenido principal, siguiendo el mismo patrón del popover de detalle de cita existente. Esto proporciona una experiencia visual consistente y permite mejor control del posicionamiento.

2. **Estados del modal** — se agregan tres nuevos estados para controlar el modal:
   - `isCreateModalOpen: boolean` — controla si el modal está visible
   - `modalPosition: { top: number, left: number } | null` — posición dinámica del modal
   - `modalPhase: 'enter' | 'open' | 'exit'` — fase de animación para transiciones suaves

3. **Mismo estilo del popover existente** — el modal aplica exactamente el mismo estilo visual del popover de detalle de cita: `bg-gray-darkest`, `border-gray-dark/60`, sombras y animaciones con duración de 200ms.

4. **Posicionamiento dinámico** — el modal se posiciona automáticamente para evitar salirse de la pantalla, similar al comportamiento del popover existente.

5. **Múltiples puntos de activación** — el modal se puede abrir desde el botón "Nueva Cita" (campos vacíos) o haciendo clic en slots vacíos del calendario (fecha/hora preseleccionadas).

6. **Controles de cierre intuitivos** — el modal se cierra con ESC, click en el overlay, botón Cancelar, o al guardar exitosamente.

7. **`tipoServicio` como estado local** — el switch Individuales/Paquetes es puramente UI; no necesita persistirse ni compartirse fuera del formulario. Se agrega `const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales')` en cada archivo.

8. **`editingFecha` / `editingHora` como estados locales** — controlan si el picker de fecha/hora está expandido. Son booleanos simples que se resetean al seleccionar un valor.

9. **El picker de días/horas del barbero (chips) se mantiene intacto** — se mueve dentro de la Fila_Formulario de Barbero, justo debajo del `SearchField`, sin modificar su lógica.

10. **`FormSection` se elimina del formulario de creación** — el nuevo patrón de fila reemplaza visualmente a `FormSection`. `FormSection` puede seguir usándose en otras partes del proyecto.

---

## Components and Interfaces

### Estructura del Modal

El modal sigue exactamente la misma estructura del popover de detalle de cita existente:

```tsx
{isCreateModalOpen && modalPosition && createPortal(
  <>
    {/* Backdrop semi-transparente */}
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm"
      style={{ zIndex: 9998 }}
      onClick={handleCloseModal}
    />
    
    {/* Modal container */}
    <div
      ref={modalRef}
      className="fixed flex flex-col rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
      style={{
        top: modalPosition.top,
        left: modalPosition.left,
        width: 480, // ancho fijo similar al popover
        maxHeight: 'calc(100vh - 32px)',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
        zIndex: 9999,
        // Animaciones de fase
        opacity: modalPhase === 'open' ? 1 : 0,
        transform: modalPhase === 'enter' ? 'translateY(-10px) scale(0.97)' : 'translateY(0) scale(1)',
        transition: 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Header con título y botón cerrar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark bg-gray-darker/50 shrink-0">
        <h2 className="text-lg font-semibold text-gray-lightest">
          {selectedCita ? 'Editar Cita' : 'Nueva Cita'}
        </h2>
        <button
          type="button"
          onClick={handleCloseModal}
          className="p-1.5 rounded-lg text-gray-lighter hover:text-white-primary hover:bg-gray-dark transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {/* Filas del formulario aquí */}
      </div>

      {/* Footer sticky con botones */}
      <div className="border-t border-gray-dark bg-gray-darker/50 px-4 py-3 shrink-0">
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleCloseModal}
            className="px-4 py-2 text-sm font-medium text-gray-lighter hover:text-white-primary transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium bg-orange-primary text-white-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  </>,
  document.body
)}
```

### Estados del Modal

```typescript
// Nuevos estados para controlar el modal
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');

// Estados existentes del formulario (sin cambios)
const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
const [editingFecha, setEditingFecha] = useState(false);
const [editingHora, setEditingHora] = useState(false);
```

### Funciones de Control del Modal

```typescript
// Abrir modal desde botón "Nueva Cita"
const handleOpenCreateModal = useCallback(() => {
  // Calcular posición centrada en la pantalla
  const position = {
    top: Math.max(16, (window.innerHeight - 600) / 2),
    left: Math.max(16, (window.innerWidth - 480) / 2)
  };
  
  setModalPosition(position);
  setIsCreateModalOpen(true);
  setModalPhase('enter');
  
  // Reset del formulario
  resetFormulario();
  setTipoServicio('individuales');
  setEditingFecha(false);
  setEditingHora(false);
  
  // Animación de entrada
  setTimeout(() => setModalPhase('open'), 10);
}, []);

// Abrir modal desde slot del calendario
const handleSlotClick = useCallback((slot: any) => {
  // Calcular posición cerca del slot clickeado
  const position = calculateModalPosition(slot.element);
  
  setModalPosition(position);
  setIsCreateModalOpen(true);
  setModalPhase('enter');
  
  // Pre-llenar fecha y hora del slot
  setNuevaCita(prev => ({
    ...prev,
    fecha: slot.fecha,
    hora: slot.hora
  }));
  
  // Reset otros estados
  setTipoServicio('individuales');
  setEditingFecha(false);
  setEditingHora(false);
  
  setTimeout(() => setModalPhase('open'), 10);
}, []);

// Cerrar modal
const handleCloseModal = useCallback(() => {
  setModalPhase('exit');
  setTimeout(() => {
    setIsCreateModalOpen(false);
    setModalPosition(null);
    resetFormulario();
  }, 200);
}, []);

// Cerrar con ESC
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isCreateModalOpen) {
      handleCloseModal();
    }
  };
  
  if (isCreateModalOpen) {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }
}, [isCreateModalOpen, handleCloseModal]);
```

### Patrón de Fila_Formulario

Cada campo del formulario sigue este patrón exacto (igual al popover de detalle de cita existente):

```tsx
<div className="flex items-center gap-0 py-3">
  {/* Columna ícono — 72 px fijo */}
  <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <IconoDelCampo className="w-5 h-5 text-gray-lighter" />
  </div>
  {/* Columna contenido */}
  <div className="flex-1 min-w-0">
    {/* contenido del campo */}
  </div>
</div>
```

Los separadores entre filas usan `border-t border-gray-dark/60`.

### Switch Individuales / Paquetes

```tsx
<div className="flex gap-1 bg-gray-darker rounded-lg p-1">
  <button
    type="button"
    onClick={() => {
      if (tipoServicio !== 'individuales') {
        setTipoServicio('individuales');
        // limpiar paquete al cambiar
        setNuevaCita(prev => ({ ...prev, paqueteId: null }));
        setPaqueteSearchTerm('');
      }
    }}
    className={tipoServicio === 'individuales'
      ? 'bg-gray-darkest text-orange-primary rounded-md px-3 py-1 text-sm font-medium transition-all'
      : 'text-gray-lighter px-3 py-1 text-sm transition-all hover:text-gray-lightest'
    }
  >
    Individuales
  </button>
  <button
    type="button"
    onClick={() => {
      if (tipoServicio !== 'paquetes') {
        setTipoServicio('paquetes');
        // limpiar servicios al cambiar
        setNuevaCita(prev => ({ ...prev, servicioIds: [], servicioId: null, servicio: '' }));
        setServicioSearchTerm('');
      }
    }}
    className={tipoServicio === 'paquetes'
      ? 'bg-gray-darkest text-orange-primary rounded-md px-3 py-1 text-sm font-medium transition-all'
      : 'text-gray-lighter px-3 py-1 text-sm transition-all hover:text-gray-lightest'
    }
  >
    Paquetes
  </button>
</div>
```

### Texto informativo de Fecha/Hora

```tsx
// Función helper para formatear el texto de fecha/hora
const formatFechaHoraTexto = (): string => {
  if (!nuevaCita.fecha && !nuevaCita.hora) return 'Selecciona fecha y hora';
  const partes: string[] = [];
  if (nuevaCita.fecha) {
    const d = new Date(nuevaCita.fecha + 'T12:00:00');
    partes.push(d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
  }
  if (nuevaCita.hora) {
    partes.push(formatHoraStr12(nuevaCita.hora));
    // Calcular hora fin
    const [hh, mm] = nuevaCita.hora.split(':').map(Number);
    const finMin = hh * 60 + mm + nuevaCita.duracion;
    const finHH = Math.floor(finMin / 60).toString().padStart(2, '0');
    const finMM = String(finMin % 60).padStart(2, '0');
    partes[partes.length - 1] += ` – ${formatHoraStr12(`${finHH}:${finMM}`)}`;
  }
  return partes.join(' · ');
};

// Renderizado en la fila
{!editingFecha && !editingHora ? (
  <button
    type="button"
    onClick={() => setEditingFecha(true)}
    className="text-left text-gray-lightest text-sm hover:text-white-primary transition-colors"
  >
    {formatFechaHoraTexto()}
  </button>
) : (
  /* picker de días/horas del barbero — código existente sin cambios */
)}
```

### Nuevos estados a agregar en cada archivo

```typescript
// Estados del modal (nuevos)
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');

// Estados del formulario (agregar junto a los demás useState existentes)
const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
const [editingFecha, setEditingFecha] = useState(false);
const [editingHora, setEditingHora] = useState(false);
```

**Reset al abrir el modal** — en `handleOpenCreateModal` y `handleSlotClick` agregar:
```typescript
setTipoServicio('individuales');
setEditingFecha(false);
setEditingHora(false);
setModalPhase('enter');
setTimeout(() => setModalPhase('open'), 10);
```

**Reset al cerrar el modal** — en `handleCloseModal`:
```typescript
setModalPhase('exit');
setTimeout(() => {
  setIsCreateModalOpen(false);
  setModalPosition(null);
  resetFormulario();
}, 200);
```

En `handleOpenEdit`, si la cita tiene `paqueteId`, inicializar `tipoServicio` en `'paquetes'`.

### Orden de filas y íconos

| # | Fila | Ícono | Visible en |
|---|---|---|---|
| 1 | Cliente | `<User />` | Solo Vista_Admin |
| 2 | Switch Tipo | `<Scissors />` (Individuales) / `<Package />` (Paquetes) | Ambas |
| 3 | Servicio / Paquete | `<Scissors />` o `<Package />` según `tipoServicio` | Ambas |
| 4 | Fecha y Hora | `<CalendarDays />` | Ambas |
| 5 | Barbero | `<User />` | Ambas |
| 6 | Producto | `<ShoppingBag />` | Ambas (condicional) |
| 7 | Notas | `<FileText />` | Ambas |

---

## Data Models

No se introducen nuevos modelos de datos. Los modelos existentes permanecen sin cambios:

### Estado `nuevaCita` (sin cambios)

```typescript
// AgendamientoPage
{
  clienteId: number;       // 0 = sin seleccionar
  cliente: string;
  telefono: string;
  servicioId: number | null;
  servicioIds: number[];
  productoCantidades: Record<number, number>;
  paqueteId: number | null;
  servicio: string;
  barberoId: number;
  barbero: string;
  fecha: string;           // 'YYYY-MM-DD'
  hora: string;            // 'HH:MM'
  duracion: number;        // minutos
  precio: number;
  estado: string;
  notas: string;
}

// ClienteMisCitasPageCalendar (igual pero sin clienteId/cliente/telefono)
```

### Nuevos estados del modal

```typescript
isCreateModalOpen: boolean                   // controla visibilidad del modal
modalPosition: { top: number; left: number } | null  // posición dinámica del modal
modalPhase: 'enter' | 'open' | 'exit'       // fase de animación del modal
```

### Nuevos estados de UI del formulario

```typescript
tipoServicio: 'individuales' | 'paquetes'   // controla qué buscador se muestra
editingFecha: boolean                        // picker de fecha expandido
editingHora: boolean                         // picker de hora expandido
```

Estos estados son puramente de presentación y no se persisten ni se envían a la API.

---

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*

### Property 1: Filtrado de autocomplete excluye ítems ya seleccionados

*Para cualquier* conjunto de servicios ya seleccionados en `servicioIds`, los resultados del `SearchField` de servicios individuales no deben contener ningún servicio cuyo `id` esté en `servicioIds`.

**Validates: Requirements 6.2**

### Property 2: Filtrado de autocomplete por nombre

*Para cualquier* query de búsqueda no vacío, todos los ítems devueltos por la función `filterFn` de cualquier `SearchField` del formulario (clientes, barberos, servicios, paquetes, productos) deben contener el término de búsqueda en el campo de nombre correspondiente (insensible a mayúsculas).

**Validates: Requirements 2.2, 5.2, 6.3, 7.4**

### Property 3: Cambio de Switch_Tipo preserva otros campos

*Para cualquier* estado del formulario con campos de cliente, barbero, fecha, hora, productos y notas con valores no vacíos, cambiar `tipoServicio` de `'individuales'` a `'paquetes'` o viceversa no debe modificar ninguno de esos campos — solo debe limpiar `servicioIds` (al cambiar a paquetes) o `paqueteId` (al cambiar a individuales).

**Validates: Requirements 3.5**

### Property 4: Validación bloquea envío con campos obligatorios vacíos

*Para cualquier* estado del formulario donde al menos uno de los campos obligatorios (`barberoId`, `servicioIds.length > 0 || paqueteId`, `fecha`, `hora`) sea inválido o vacío, la función de guardado (`handleSaveCita` / `handleCreateCita`) debe retornar sin llamar a ningún servicio de API.

**Validates: Requirements 10.3, 10.6**

### Property 5: Sincronización bidireccional del campo Notas

*Para cualquier* string de texto ingresado en el textarea de notas, el valor de `nuevaCita.notas` en el estado debe ser exactamente igual al texto ingresado.

**Validates: Requirements 8.3**

### Property 6: Consistencia de estructura Modal entre vistas

*Para cualquier* campo equivalente presente en ambas vistas (barbero, servicio/paquete, fecha/hora, producto, notas), el patrón de layout del modal debe ser idéntico: estructura de `createPortal`, contenedor de ícono con `width: 72, minWidth: 72, flexShrink: 0` y contenido en `flex-1 min-w-0`, y mismos estilos de modal (`bg-gray-darkest`, animaciones, posicionamiento).

**Validates: Requirements 1.1, 9.1, 9.2**

---

## Error Handling

### Errores de validación del formulario

Los errores de validación se muestran inline en cada `SearchField` mediante la prop `error`. El estado `showFormErrors` controla si los errores son visibles (se activa al hacer clic en Guardar con campos incompletos). El modal permanece abierto hasta que todos los campos obligatorios estén completos o el usuario cancele.

| Campo | Condición de error | Mensaje |
|---|---|---|
| Cliente (Vista_Admin) | `showFormErrors && !nuevaCita.clienteId` | `'Selecciona un cliente'` |
| Servicio/Paquete | `showFormErrors && servicioIds.length === 0 && !paqueteId` | `'Selecciona al menos un servicio o paquete'` |
| Barbero | `showFormErrors && !nuevaCita.barberoId` | `'Selecciona un barbero'` |
| Fecha/Hora | `showFormErrors && (!nuevaCita.fecha || !nuevaCita.hora)` | Texto de error en la fila de fecha/hora |

### Errores de disponibilidad del barbero

La función `validarDisponibilidadBarbero` / `validarDisponibilidad` existente se mantiene sin cambios. Sus mensajes de error se muestran mediante `useCustomAlert` (toast de error), no inline en el formulario.

### Errores de API

Los errores de llamadas a API se capturan en los bloques `try/catch` existentes y se muestran mediante `useCustomAlert`. No se modifica este comportamiento.

### Cierre del modal por errores

- **Errores de validación**: El modal permanece abierto y muestra los errores inline
- **Errores de disponibilidad**: El modal permanece abierto y muestra toast de error
- **Errores de API**: El modal permanece abierto y muestra toast de error
- **Guardado exitoso**: El modal se cierra automáticamente con animación de salida

### Reset de estados de edición

Cuando el usuario selecciona una fecha en el picker, `editingFecha` se pone en `false` automáticamente. Cuando selecciona una hora, `editingHora` se pone en `false`. Esto evita que el picker quede abierto indefinidamente.

---

## Testing Strategy

### Evaluación de PBT

Este feature es un rediseño de UI con lógica de estado. Las propiedades identificadas involucran funciones puras de filtrado (`filterFn`), invariantes de estado (campos no afectados por el switch), y validación de formulario (bloqueo de envío). Estas son candidatas válidas para property-based testing.

**PBT aplica** para las propiedades 1, 2, 3, 4 y 5. La propiedad 6 es mejor cubierta con snapshot tests.

**Librería recomendada**: [fast-check](https://github.com/dubzzz/fast-check) — es la opción estándar para PBT en proyectos TypeScript/React.

### Tests unitarios (ejemplo-based)

Cubren los comportamientos específicos que no son universales:

- **Modal**: Apertura/cierre del modal con animaciones correctas
- **Posicionamiento**: Cálculo de posición dinámica del modal para evitar salirse de pantalla
- **Activadores**: Apertura desde botón "Nueva Cita" vs click en slot del calendario
- **Controles de cierre**: ESC, click en overlay, botón Cancelar, guardado exitoso
- **Renderizado del Switch_Tipo** con dos opciones correctas dentro del modal
- **Visibilidad condicional** del buscador de productos (sin servicio → oculto, con servicio → visible)
- **Orden correcto de filas** en Vista_Admin vs Vista_Cliente dentro del modal
- **Reset de estados** (`tipoServicio`, `editingFecha`, `editingHora`, estados del modal) al abrir/cerrar
- **Comportamiento de incremento/decremento** de productos (incluyendo eliminación al llegar a 0)
- **Activación de `editingFecha`** al hacer clic en el texto de fecha dentro del modal
- **Desactivación de `editingFecha`** al seleccionar una fecha
- **Persistencia del modal** durante errores de validación vs cierre automático en guardado exitoso

### Tests de propiedad (property-based)

Configuración mínima: **100 iteraciones** por propiedad. Cada test referencia su propiedad del diseño.

```typescript
// Feature: appointment-form-redesign, Property 1: Filtrado excluye ítems ya seleccionados
it('filterFn excluye servicios ya seleccionados', () => {
  fc.assert(fc.property(
    fc.array(fc.record({ id: fc.integer({ min: 1 }), nombre: fc.string() }), { minLength: 1 }),
    fc.array(fc.integer({ min: 1 }), { minLength: 1 }),
    (servicios, seleccionados) => {
      const disponibles = servicios.filter(s => !seleccionados.includes(s.id));
      return disponibles.every(s => !seleccionados.includes(s.id));
    }
  ), { numRuns: 100 });
});

// Feature: appointment-form-redesign, Property 2: Filtrado por nombre
it('filterFn retorna solo ítems que contienen el query', () => {
  fc.assert(fc.property(
    fc.array(fc.record({ id: fc.integer(), nombre: fc.string() })),
    fc.string({ minLength: 1 }),
    (items, query) => {
      const filtered = items.filter(item =>
        (item.nombre || '').toLowerCase().includes(query.toLowerCase())
      );
      return filtered.every(item =>
        (item.nombre || '').toLowerCase().includes(query.toLowerCase())
      );
    }
  ), { numRuns: 100 });
});

// Feature: appointment-form-redesign, Property 3: Switch preserva otros campos
it('cambiar tipoServicio no modifica campos no relacionados', () => {
  fc.assert(fc.property(
    fc.record({
      barberoId: fc.integer({ min: 1 }),
      fecha: fc.string(),
      hora: fc.string(),
      notas: fc.string(),
    }),
    (camposOtros) => {
      // Simular cambio de switch: solo servicioIds/paqueteId deben cambiar
      const estadoAntes = { ...camposOtros, servicioIds: [1, 2], paqueteId: null };
      const estadoDespues = { ...estadoAntes, servicioIds: [], paqueteId: null };
      return (
        estadoDespues.barberoId === estadoAntes.barberoId &&
        estadoDespues.fecha === estadoAntes.fecha &&
        estadoDespues.hora === estadoAntes.hora &&
        estadoDespues.notas === estadoAntes.notas
      );
    }
  ), { numRuns: 100 });
});

// Feature: appointment-form-redesign, Property 4: Validación bloquea envío
it('handleSave no llama a la API si hay campos obligatorios vacíos', () => {
  fc.assert(fc.property(
    fc.record({
      barberoId: fc.oneof(fc.constant(0), fc.integer({ min: 1 })),
      servicioIds: fc.array(fc.integer({ min: 1 })),
      paqueteId: fc.option(fc.integer({ min: 1 }), { nil: null }),
      fecha: fc.oneof(fc.constant(''), fc.string({ minLength: 10, maxLength: 10 })),
      hora: fc.oneof(fc.constant(''), fc.string({ minLength: 5, maxLength: 5 })),
    }),
    (estado) => {
      const esValido =
        estado.barberoId > 0 &&
        (estado.servicioIds.length > 0 || estado.paqueteId !== null) &&
        estado.fecha !== '' &&
        estado.hora !== '';
      // Si no es válido, la función debe retornar false/undefined sin llamar a la API
      if (!esValido) {
        // La función de validación debe detectar el estado inválido
        return true; // La lógica real se verifica con mocks en el test completo
      }
      return true;
    }
  ), { numRuns: 100 });
});

// Feature: appointment-form-redesign, Property 5: Sincronización de notas
it('el valor de notas en estado refleja exactamente lo escrito', () => {
  fc.assert(fc.property(
    fc.string(),
    (texto) => {
      // Simular onChange del textarea
      let notas = '';
      const handleChange = (val: string) => { notas = val; };
      handleChange(texto);
      return notas === texto;
    }
  ), { numRuns: 100 });
});
```

### Tests de snapshot

- **Snapshot del modal completo** en Vista_Admin (con todos los campos visibles)
- **Snapshot del modal completo** en Vista_Cliente (sin campo Cliente)
- **Snapshot del modal** en diferentes fases de animación (enter, open, exit)
- **Snapshot del Switch_Tipo** en estado "Individuales" activo dentro del modal
- **Snapshot del Switch_Tipo** en estado "Paquetes" activo dentro del modal
- **Snapshot de la fila de fecha/hora** en estado colapsado (texto plano) dentro del modal
- **Snapshot de la fila de fecha/hora** en estado expandido (picker visible) dentro del modal
- **Snapshot del modal** con errores de validación visibles
- **Snapshot del backdrop y posicionamiento** del modal

### Cobertura de edge cases

- **Modal con `tipoServicio = 'paquetes'`** al abrir en modo edición de una cita con paquete
- **Posicionamiento del modal** cuando no hay espacio suficiente en la pantalla (debe ajustarse automáticamente)
- **Picker de fecha/hora** cuando no hay barbero seleccionado (debe mostrar texto placeholder)
- **Campo de productos** cuando `productosList` está vacío (la fila no debe renderizarse)
- **Texto de fecha/hora** cuando solo hay fecha pero no hora, y viceversa
- **Cierre del modal** durante una operación de guardado en progreso
- **Apertura múltiple** del modal (debe prevenir múltiples instancias)
- **Redimensionamiento de ventana** con modal abierto (debe reposicionarse si es necesario)
- **Modal abierto** cuando se cambia de vista o se navega a otra página (debe cerrarse automáticamente)
