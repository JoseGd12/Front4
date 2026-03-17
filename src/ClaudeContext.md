Context
El formulario "Registrar Nueva Venta" actualmente vive como un Dialog (modal) dentro de VentasPage.tsx (lineas ~1889-2718 de un archivo de 3275 lineas). Toda la logica de estado, calculos, busqueda y submission esta en el mismo archivo. El objetivo es reemplazar el modal por una vista independiente con layout master-detail (70/30), creando componentes reutilizables y mejorando la usabilidad.
La navegacion del sistema usa activePage state en Dashboard.tsx (no React Router), por lo que la nueva vista se integra como un nuevo case en el switch de renderContent().
Archivos criticos a modificar

src/features/ventas/pages/VentasPage.tsx — Remover dialog, agregar boton que navega a nueva vista
src/features/dashboard/components/Dashboard.tsx — Agregar case "RegistrarVenta" en renderContent, pasar setActivePage como prop

Archivos nuevos a crear
Componentes reutilizables (src/shared/components/ui/)

SearchField.tsx — Campo de busqueda con dropdown de resultados filtrados en tiempo real. Props: placeholder, items, onSelect, renderItem, value, onClear, error.
FormSection.tsx — Wrapper para agrupar campos con titulo e icono. Props: title, icon, children.

Vista y componentes de venta (src/features/ventas/)

pages/RegistrarVentaPage.tsx — Vista principal master-detail. Contiene:

Layout 2 columnas (70/30) con responsive stack en mobile
Todo el estado del formulario (migrado desde VentasPage)
Toda la logica de calculos, validaciones, submission (migrada)
Boton "Volver" para regresar a VentasPage


components/DetailPanel.tsx — Panel de resumen dinamico (columna derecha). Props: cliente, fecha, tipoVenta, productos, servicios, subtotalProductos, subtotalServicios, descuentoPorcentaje, descuentoMonto, iva, saldoUsado, total. Se actualiza en tiempo real.
components/LineItem.tsx — Componente para mostrar un producto/servicio agregado en el resumen y en las listas. Props: nombre, cantidad, precioUnitario, subtotal, imagen, onRemove, tipo ('producto'|'servicio'), barbero?.

Estrategia de implementacion
Paso 1: Crear componentes reutilizables

FormSection — wrapper simple con titulo, icono, y children
SearchField — campo de busqueda con dropdown generico (reusa logica existente de clientSearch, productSearch, serviceSearch)

Paso 2: Crear LineItem y DetailPanel

LineItem — tarjeta compacta de item agregado con nombre, cantidad, precio, subtotal, boton eliminar
DetailPanel — panel sticky con fondo diferenciado que muestra resumen completo de la venta, con animaciones suaves al agregar/remover items

Paso 3: Crear RegistrarVentaPage

Migrar todo el estado del formulario desde VentasPage (lineas 378-451: nuevaVenta, productoSeleccionado, servicioSeleccionado, etc.)
Migrar funciones de calculo (calcularSubtotal, calcularDescuento, calcularIva, calcularTotal, calcularSaldoAFavorUsado)
Migrar handlers (agregarProducto, eliminarProducto, agregarServicio, eliminarServicio, handleCreateVenta, etc.)
Migrar la carga de datos (cargarVentas y datos relacionados) — recibir callback onVentaCreated para recargar en VentasPage
Layout: grid lg:grid-cols-[7fr_3fr] con grid-cols-1 en mobile
Columna izquierda: formulario organizado en FormSections
Columna derecha: DetailPanel sticky

Paso 4: Integrar en Dashboard

Agregar case "RegistrarVenta": return <RegistrarVentaPage onBack={() => setActivePage("Ventas")} />; en renderContent()
Importar RegistrarVentaPage en Dashboard

Paso 5: Modificar VentasPage

Remover todo el Dialog y su contenido (lineas ~1889-2718)
Remover estados/funciones que solo el formulario usaba
Cambiar boton "Nueva Venta" para que llame onNavigate?.("RegistrarVenta") o reciba setActivePage como prop
Mantener la tabla de ventas, filtros, y detalle de venta existentes

Secciones del formulario (columna izquierda)

Info Basica: Numero de Venta (read-only), Fecha (read-only)
Cliente: SearchField para buscar por nombre/documento, mostrar cliente seleccionado
Configuracion: Tipo de Venta (dropdown), Metodo de Pago (dropdown requerido), Porcentaje Descuento, Garantia
Productos: SearchField producto, campo cantidad, boton "Agregar", lista de productos agregados con LineItem
Servicios: SearchField servicio, campo barbero (SearchField), boton "Agregar", lista de servicios con LineItem

Panel de resumen (columna derecha)

Fondo bg-gray-dark/50 con borde izquierdo
Sticky (sticky top-4)
Secciones: Cliente, Tipo, Fecha | Lista productos | Lista servicios | Resumen financiero (subtotales, descuento, total)
Animacion transition-all al agregar/remover items

Datos y funciones reutilizadas

ventaService.createVenta() — src/features/ventas/services/ventaService.ts
productoService.adjustStock() — src/features/productos/services/productos.ts
servicioService.getServicios() — src/features/servicios/services/servicioService.ts
clientesService.getClientes() — src/features/clientes/services/clientesService.ts
apiService.getUsuarios(), getPaquetes() — src/shared/services/api.ts
devolucionService — src/features/ventas/services/devolucionService.ts
formatCurrency, formatDate, normalizeSearchText — reutilizar desde VentasPage (extraer a utils si se necesita)
Clases CSS: elegante-card, elegante-button-primary, elegante-input, etc.
Componentes UI: Input, Select, Label, Button, Checkbox de src/shared/components/ui/