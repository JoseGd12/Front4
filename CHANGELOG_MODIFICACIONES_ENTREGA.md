# Changelog de Entrega - Modificaciones Front4

Fecha: 2026-04-22  
Proyecto: `Front4`  
Fuente de requerimientos: `c:\Users\samue\OneDrive\Escritorio\Proyectos\Modificaciones.mb`

## Estado general
- Implementación completada de los cambios priorizados del plan.
- `type-check` (TypeScript): OK.
- `build` de producción: OK.

## Cambios por módulo

### Clientes
- Se dejó visible el campo como `Saldo` en interfaz.
- Se aplicó bloqueo de acciones para registros inactivos (solo historial).

### Servicios
- Se bloqueó edición/acciones sobre servicios inactivos.
- Se reforzó bloqueo en UI y en handlers.

### Paquetes
- Se bloqueó edición/acciones sobre paquetes inactivos.
- Se ajustó UI: sección de `Precio` y `Porcentaje Descuento` reposicionada más abajo en el formulario.

### Compras
- Se corrigió orden de listado por recencia para mostrar nuevas compras primero.
- Se conserva caché en sesión con orden consistente.

### Devoluciones
- Listado agrupado por cliente.
- Se muestra total de saldo a favor por grupo de cliente.

### Barberos
- Se bloqueó edición/acciones sobre barberos inactivos.
- Se mejoró carga de imágenes:
  - validación de tipo de archivo,
  - validación de peso máximo (5MB),
  - estado visual de carga.
- Se añadió `datalist` para especialidad.
- Búsqueda extendida por especialidad y estado (`activo/inactivo`).

### Horarios
- Se añadió referencia explícita de semana con rango de fechas.
- En selección por días, cada elemento muestra día + fecha.

### Proveedores
- Cambio funcional: `Dirección` reemplazado por `Representante Legal`.
- Campo `Estado` retirado de formulario/listado/detalle en la vista.
- Se removió acción visual de cambio de estado en la tabla.
- Se añadió `datalist` de `Departamento` (catálogo local).
- Se mantuvo mapeo de compatibilidad `representanteLegal -> direccion` para backend.

## Ajustes técnicos adicionales (QA de cierre)
- Corrección de helper faltante en dashboard para reporte (`isCitaCompletada`).
- Ajuste de tipos en `ventaService` para compatibilidad de IDs (`number | string`).
- Corrección de props `error` en `SearchField` de ventas para cumplir tipado (`string | undefined`).

## Checklist de validación para despliegue
- Verificar flujo de creación/edición en módulos modificados.
- Confirmar bloqueo de acciones en registros inactivos (UI + comportamiento).
- Confirmar compras nuevas visibles en primeras posiciones.
- Confirmar agrupación y totales en devoluciones.
- Validar datalist de departamento y especialidad.
- Validar subida de imagen en barberos con archivo válido e inválido.
- Validar referencias de semana en horarios.
- Ejecutar `npm run type-check`.
- Ejecutar `npm run build`.

## Riesgos y notas
- El build presenta advertencias de chunking de Vite (no bloqueantes).
- Se recomienda prueba funcional con datos reales en ambiente de staging antes de producción.
