# Plan de trabajo de modificaciones (Front4)

Fuente: `c:\Users\samue\OneDrive\Escritorio\Proyectos\Modificaciones.mb`

## Objetivo
Implementar todas las modificaciones solicitadas con una secuencia que minimice retrabajo, riesgos funcionales y bloqueos entre módulos.

## Alcance
- Clientes
- Servicios
- Paquetes
- Compras
- Devoluciones
- Barberos
- Horarios
- Proveedores
- Empresa
- Departamento (datalist/API)

## Fase 0 - Preparación (0.5 día)
- Inventariar pantallas/componentes afectados por cada punto del listado.
- Definir regla global para registros inactivos (comportamiento de lectura y bloqueo).
- Crear tablero de tareas por módulo (1 ticket por cambio).
- Confirmar si `datalist` de departamento será local o por API.

## Fase 1 - Reglas transversales y datos críticos (Alta prioridad, 2-3 días)
1. Registros inactivos (aplica a todos los módulos donde corresponda):
- No permitir editar.
- No permitir realizar acciones.
- Tratarlo como historial (solo lectura).

2. Módulo de compras:
- Ajustar el listado para que las nuevas compras aparezcan correctamente.

3. Módulo de devoluciones:
- Agrupar por clientes.
- Mostrar total del saldo a favor.

## Fase 2 - Cambios de modelo/formulario (Alta prioridad, 2 días)
1. Clientes:
- Agregar campo `Saldo`.

2. Proveedores:
- Cambiar campo `Dirección` por `Representante legal`.
- Eliminar campo  `Estado`.

3. Empresa:
- Hacer obligatoria la sección de información adicional.

4. Departamento:
- Implementar `datalist` o integrar API para autocompletado.

## Fase 3 - Unificación de interfaces y UX (Media prioridad, 2 días)
1. Servicios y paquetes:
- Unificar la ventana de detalle para que sea igual a la usada en clientes.

2. Paquetes:
- Bajar la posición de los botones de precio y descuento (ajuste UI).

3. Horarios:
- Indicar claramente a qué semana corresponde cada elemento.

## Fase 4 - Módulo barberos (Media/Alta prioridad, 1-2 días)
1. Corregir `datalist`.
2. Arreglar subida de imágenes.
3. Permitir búsqueda por:
- Especialidad.
- Estado (activo/inactivo).

## Fase 5 - QA y cierre (1-2 días)
- Pruebas funcionales por módulo.
- Pruebas de regresión en flujos críticos (alta, edición, consulta, listados).
- Validación visual de cambios UI (paquetes, detalle unificado, horarios).
- Verificación de bloqueos por inactividad en todos los módulos aplicables.
- Cierre con checklist de aceptación de negocio.

## Backlog priorizado
### P1 (crítico)
- Regla global de inactivos (bloqueo + historial).
- Compras: nuevas compras visibles.
- Devoluciones: agrupación por clientes + total saldo a favor.
- Clientes: campo `Saldo`.

### P2 (alto)
- Proveedores: cambios de campos y validaciones asociadas.
- Empresa: obligatoriedad de información adicional.
- Unificación detalle servicios/paquetes con clientes.
- Barberos: datalist y subida de imágenes.

### P3 (medio)
- Búsquedas avanzadas en barberos.
- Ajuste UI en paquetes (posición botones).
- Horarios: semana por elemento.
- Departamento: datalist/API.

## Dependencias clave
- Definir primero la regla de inactivos, porque impacta múltiples módulos.
- Ejecutar cambios de campos antes de ajustes visuales finales para evitar retrabajo.
- Confirmar disponibilidad de API antes de implementar `datalist` remoto en departamento.

## Criterios de aceptación mínimos
- Cada cambio es visible y funcional en interfaz.
- No existen acciones habilitadas para registros inactivos.
- Formularios validan obligatorios y guardan correctamente.
- Búsquedas y filtros retornan resultados esperados.
- No se rompe funcionalidad existente en módulos no intervenidos.

## Estimación total sugerida
8 a 11 días hábiles (sin contar esperas externas como definición de API o cambios de negocio adicionales).

## Próximo paso recomendado
Convertir este plan en sprint semanal con responsables por módulo y estimación en horas por tarea.
