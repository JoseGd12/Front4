# PRUEBAS DE CAJA NEGRA - DOCUMENTACIÓN COMPLETA

**Proyecto:** Front4 - Sistema de barbería  
**Fecha:** 2026-05-20  
**Equipo de Testing:** QA  
**Versión:** 1.0

---

## PARTE 1: PLANIFICACIÓN

### 1.1 Objetivo General
Validar funcionamiento correcto de 4 módulos críticos mediante pruebas de caja negra:
- **Módulo Login:** Validación de política de contraseñas
- **Módulo Productos:** CRUD y gestión de stock
- **Módulo Ventas:** Creación y consulta de ventas
- **Módulo Agendamientos:** Gestión de citas

### 1.2 Alcance
- Solo interfaces públicas de servicios
- Casos de equivalencia + valores límites
- 2 técnicas por módulo mínimo
- Enfoque en entrada/salida, no implementación interna

### 1.3 Funciones a Probar

#### Login
- `checkPasswordPolicy(user)` - Validar estado de contraseña

#### Productos
- `createProducto(data)` - Crear producto
- `updateProducto(id, data)` - Actualizar producto
- `updateStock(id, stockVentas, stockInsumos)` - Gestionar stock

#### Ventas
- `createVenta(ventaData)` - Registrar venta
- `getVentaById(id)` - Recuperar venta
- `getVentasByFecha(inicio, fin)` - Filtro por rango de fechas

#### Agendamientos
- `createAgendamiento(data)` - Agendar cita
- `updateAgendamiento(id, data)` - Modificar cita
- `deleteAgendamiento(id)` - Cancelar cita

### 1.4 Criterios de Éxito
✓ Cada caso ejecuta sin excepciones no esperadas  
✓ Salida coincide especificación del servicio  
✓ Bordes se comportan sin datos corruptos  

---

## PARTE 2: DISEÑO

### 2.1 MÓDULO: LOGIN

#### Función Bajo Prueba
```typescript
checkPasswordPolicy(user: User | null): Promise<'OK' | 'FIRST_LOGIN' | 'EXPIRED' | null>
```

#### Matriz de Casos - Partición de Equivalencia

| ID | Clase Equivalencia | Entrada | Salida Esperada | Tipo |
|----|-------------------|---------|-----------------|------|
| L1 | Usuario nulo | `null` | `null` | Límite |
| L2 | Primer login (flag obligatorio) | User + `requiresPasswordChange=true` | `'FIRST_LOGIN'` | Equivalencia |
| L3 | Password expirado (>90 días) | User + password antiguo | `'EXPIRED'` | Equivalencia |
| L4 | Password vigente (<90 días) | User + password reciente | `'OK'` | Equivalencia |
| L5 | Sin claim passwordUpdatedAt | User + sin claim | `'OK'` | Borde |

#### Matriz de Casos - Valores Límites

| ID | Parámetro | Caso Límite | Entrada | Salida Esperada |
|----|-----------|-------------|---------|-----------------|
| LB1 | Días desde último cambio | Exactamente 90 días | `Date.now() - (90 * 24 * 3600 * 1000)` | `'EXPIRED'` |
| LB2 | Días desde último cambio | 89 días (un menos) | `Date.now() - (89 * 24 * 3600 * 1000)` | `'OK'` |
| LB3 | Días desde último cambio | 91 días (uno más) | `Date.now() - (91 * 24 * 3600 * 1000)` | `'EXPIRED'` |
| LB4 | Token epoch | Valor 0 (1970-01-01) | `0` | `'EXPIRED'` |
| LB5 | Token epoch | Valor timestamp actual | `Math.floor(Date.now()/1000)` | `'OK'` |

---

### 2.2 MÓDULO: PRODUCTOS

#### Funciones Bajo Prueba
```typescript
createProducto(data): Promise<ApiProducto>
updateProducto(id, data): Promise<ApiProducto>
updateStock(id, stockVentas, stockInsumos): Promise<ApiProducto>
```

#### Matriz de Casos - Partición de Equivalencia (Create)

| ID | Clase Equivalencia | Entrada | Validación |
|----|-------------------|---------|-----------|
| P1 | Datos mínimos válidos | `{nombre, stockVentas, stockInsumos}` | Producto creado |
| P2 | Con categoría válida | `{nombre, categoriaId=1, stockVentas}` | Categoría asignada |
| P3 | Sin nombre (inválido) | `{nombre='', stockVentas}` | Rechazado o vacío |
| P4 | Con precios negativos | `{nombre, precioVenta=-100}` | Validar rechazo |
| P5 | Stock inicial cero | `{nombre, stockVentas=0, stockInsumos=0}` | Permitido (producto sin stock) |
| P6 | Stock muy alto | `{nombre, stockVentas=999999}` | Permitido |

#### Matriz de Casos - Valores Límites (Stock Update)

| ID | Parámetro | Valor Límite | Entrada | Resultado |
|----|-----------|--------------|---------|-----------|
| PB1 | Stock ventas | Mínimo | `updateStock(1, 0, 0)` | Stock = 0 |
| PB2 | Stock ventas | Máximo teórico | `updateStock(1, 2147483647, 0)` | Aceptado o error controlado |
| PB3 | Stock negativo (inválido) | `-1` | `updateStock(1, -100, 0)` | Rechazado o cero |
| PB4 | Producto no existe | ID inválido | `updateStock(99999, 10, 10)` | Error "no encontrado" |
| PB5 | Transferencia total (ventas→insumos) | `stockVentas + stockInsumos` | Transferir todo | Stock se redistribuye |

#### Matriz de Casos - Partición de Equivalencia (Update)

| ID | Escenario | Cambios | Validación |
|----|-----------|---------|-----------|
| PU1 | Actualizar nombre | Nombre válido nuevo | Persistido |
| PU2 | Cambiar categoría | Categoría existente | ID actualizado |
| PU3 | Consolidar stock | `consolidarStockEnVentas=true` | Stock insumos→ventas |
| PU4 | Desactivar producto | `activo=false` | Estado persiste |

---

### 2.3 MÓDULO: VENTAS

#### Función Bajo Prueba
```typescript
createVenta(ventaData): Promise<Venta>
getVentaById(id): Promise<Venta | null>
getVentasByFecha(inicio, fin): Promise<Venta[]>
```

#### Matriz de Casos - Partición de Equivalencia (Create)

| ID | Clase Equivalencia | Entrada Crítica | Validación |
|----|-------------------|-----------------|-----------|
| V1 | Venta con productos válidos | `{productosDetalle: [{id, cantidad, precio}], usuarioId}` | Creada con detalles |
| V2 | Venta con servicios válidos | `{serviciosDetalle: [{id: 'SERV-1', precio}], barberoId, usuarioId}` | Creada con servicios |
| V3 | Venta sin detalles | `{productosDetalle: [], serviciosDetalle: []}` | Error (vacía) |
| V4 | Sin usuario responsable | `{usuarioId: null}` | Error requerido |
| V5 | Cliente opcional | `{clienteId: null}` | Permitido (venta invitado) |
| V6 | Montos negativos | `{subtotal: -100}` | Rechazado o validado |
| V7 | Descuento > subtotal | `{subtotal: 100, descuento: 200}` | Validar comportamiento |

#### Matriz de Casos - Valores Límites (Montos)

| ID | Parámetro | Límite | Entrada | Salida |
|----|-----------|--------|---------|--------|
| VB1 | Subtotal | Mínimo | `subtotal=0.01` | Total válido |
| VB2 | Subtotal | Máximo | `subtotal=999999999` | Aceptado |
| VB3 | IVA | Mínimo | `iva=0` | Total = subtotal - descuento |
| VB4 | Descuento | Máximo (100%) | `descuento = subtotal` | Total = 0 |
| VB5 | Cantidad producto | Mínimo | `cantidad=1` | Registrado |
| VB6 | Cantidad producto | Máximo | `cantidad=99999` | Aceptado |

#### Matriz de Casos - Partición de Equivalencia (GetById)

| ID | Escenario | ID | Validación |
|----|-----------|-----|-----------|
| VG1 | Venta existente | ID válido | Datos completos |
| VG2 | Venta no existe | ID inválido | `null` |
| VG3 | ID negativo | `-1` | `null` o error |

#### Matriz de Casos - Partición de Equivalencia (GetByFecha)

| ID | Rango de Fechas | Inicio | Fin | Validación |
|----|-----------------|--------|-----|-----------|
| VF1 | Rango válido | 2026-01-01 | 2026-01-31 | Ventas en período |
| VF2 | Sin ventas en rango | 2026-06-01 | 2026-06-30 | Array vacío |
| VF3 | Inicio > fin | 2026-02-01 | 2026-01-01 | Vacío o error |
| VF4 | Fechas iguales | 2026-01-15 | 2026-01-15 | Ventas del día |

---

### 2.4 MÓDULO: AGENDAMIENTOS

#### Función Bajo Prueba
```typescript
createAgendamiento(data): Promise<Agendamiento>
updateAgendamiento(id, data): Promise<Agendamiento>
deleteAgendamiento(id): Promise<void>
```

#### Matriz de Casos - Partición de Equivalencia (Create)

| ID | Clase Equivalencia | Entrada | Validación |
|----|-------------------|---------|-----------|
| A1 | Cita válida con servicio | `{clienteId, barberoId, servicioId, fecha, hora, duracion}` | Creada |
| A2 | Cita con múltiples servicios | `{servicioIds: [1,2,3]}` | Asignados todos |
| A3 | Cita con productos | `{productos: [{productoId, cantidad}]}` | Registrados |
| A4 | Sin barbero (solo producto) | `{barberoId=null, productos}` | Validar si válido |
| A5 | Duración extrema | `{duracion=1}` | Permitido |
| A6 | Duración muy larga | `{duracion=480}` | Permitido (8 horas) |
| A7 | Precio negativo | `{precio=-100}` | Rechazado |
| A8 | Sin cliente | `{clienteId=null}` | Validar requerimiento |

#### Matriz de Casos - Valores Límites (Fecha y Hora)

| ID | Parámetro | Límite | Entrada | Validación |
|----|-----------|--------|---------|-----------|
| AB1 | Fecha | Hoy | `fecha = HOY` | Permitido |
| AB2 | Fecha | Pasada | `fecha = AYER` | Rechazado o permitido |
| AB3 | Hora | Mínima (00:00) | `hora = '00:00'` | Válida |
| AB4 | Hora | Máxima (23:59) | `hora = '23:59'` | Válida |
| AB5 | Hora | Inválida (24:00) | `hora = '24:00'` | Rechazado |
| AB6 | Hora | Inválida (25:00) | `hora = '25:00'` | Rechazado |
| AB7 | Duración | Mínima | `duracion=1` (minuto) | Permitido |
| AB8 | Duración | Máxima teórica | `duracion=1440` (24h) | Permitido o rechazado |

#### Matriz de Casos - Partición de Equivalencia (Delete)

| ID | Escenario | ID | Validación |
|----|-----------|-----|-----------|
| AD1 | Cita existente | ID válido | Eliminada |
| AD2 | Cita no existe | ID inválido | Silencioso o error |
| AD3 | ID negativo | `-1` | Validar respuesta |

#### Matriz de Casos - Partición de Equivalencia (Update)

| ID | Cambio | Datos | Validación |
|----|--------|-------|-----------|
| AU1 | Cambiar hora | `hora = '14:00'` | Actualizada |
| AU2 | Cambiar barbero | `barberoId = 5` | Asignado |
| AU3 | Agregar servicio | `servicioIds.push(new)` | Añadido |
| AU4 | Cambiar estado | `estado = 'Completado'` | Persistido |

---

## PARTE 3: EJECUCIÓN (ESPECIFICACIÓN DE CASOS EJECUTABLES)

### 3.1 PLANTILLA DE EJECUCIÓN

```
CASO DE PRUEBA: [ID]
─────────────────────────────────────────────────────────────
Módulo:          [MODULE]
Función:         [FUNCTION]
Tipo:            [Equivalencia | Límite]
Prioridad:       [Alta | Media | Baja]

PRECONDICIONES:
  □ [Prerequisito 1]
  □ [Prerequisito 2]

ENTRADA:
  Parámetro 1: [valor]
  Parámetro 2: [valor]
  ...

PASOS:
  1. [Acción 1]
  2. [Acción 2]
  3. [Acción 3]

RESULTADO ESPERADO:
  - [Salida esperada 1]
  - [Salida esperada 2]

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Pantalla capturada
  [ ] Logs del navegador
  [ ] Respuesta JSON
  [ ] Otro: _______________________________________________
```

---

### 3.2 CASOS ESPECÍFICOS PARA EJECUCIÓN

---

## LOGIN

### CASO: L1-CheckPassword-UsuarioNulo
```
CASO DE PRUEBA: L1
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Límite
Prioridad:       Alta

PRECONDICIONES:
  □ Sistema debe estar inicializado
  □ No requiere autenticación previa

ENTRADA:
  user: null

PASOS:
  1. Llamar checkPasswordPolicy(null)
  2. Capturar resultado

RESULTADO ESPERADO:
  - Retorna: null
  - Sin excepciones lanzadas

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log del resultado
```

### CASO: L2-CheckPassword-PrimerLogin
```
CASO DE PRUEBA: L2
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado en Firebase
  □ Token contiene claim: requiresPasswordChange = true

ENTRADA:
  user: User (Firebase user object)
  claims.requiresPasswordChange: true

PASOS:
  1. Obtener token actualizado del usuario
  2. Verificar que claims.requiresPasswordChange exista
  3. Llamar checkPasswordPolicy(user)
  4. Capturar respuesta

RESULTADO ESPERADO:
  - Retorna: 'FIRST_LOGIN'
  - Sin excepciones

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log: claims
  [ ] Console log: resultado
```

### CASO: LB1-CheckPassword-Exactamente90Dias
```
CASO DE PRUEBA: LB1
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Límite (valores límite - 90 días)
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Token debe tener passwordUpdatedAt como epoch timestamp
  □ No tener requiresPasswordChange flag

ENTRADA:
  user: User (Firebase user object)
  claims.passwordUpdatedAt: Epoch hace exactamente 90 días
    = Math.floor((Date.now() - (90 * 24 * 3600 * 1000))/1000)

PASOS:
  1. Calcular timestamp de hace exactamente 90 días
  2. Simular o actualizar claim en Firebase
  3. Llamar checkPasswordPolicy(user)
  4. Capturar respuesta

RESULTADO ESPERADO:
  - Retorna: 'EXPIRED'
  - Comparación usa > (no >=)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Nota: Confirmar que el código usa > no >= para 90 días
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Timestamp calculado
  [ ] Console log: daysPassed
```

### CASO: LB2-CheckPassword-89Dias
```
CASO DE PRUEBA: LB2
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Límite (un día antes del borde)
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Token con passwordUpdatedAt como epoch
  □ Sin requiresPasswordChange

ENTRADA:
  user: User
  claims.passwordUpdatedAt: Epoch hace 89 días (1 día menos)
    = Math.floor((Date.now() - (89 * 24 * 3600 * 1000))/1000)

PASOS:
  1. Calcular timestamp de hace 89 días
  2. Actualizar claim
  3. Llamar checkPasswordPolicy(user)
  4. Capturar resultado

RESULTADO ESPERADO:
  - Retorna: 'OK'
  - Aún vigente (no ha alcanzado 90)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log: daysPassed
```

### CASO: L3-CheckPassword-PasswordExpirado
```
CASO DE PRUEBA: L3
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ passwordUpdatedAt debe ser antiguo (>90 días)
  □ Sin requiresPasswordChange

ENTRADA:
  user: User
  claims.passwordUpdatedAt: Epoch de hace 120 días (bien pasado)

PASOS:
  1. Establecer fecha antigua (ej: 120 días atrás)
  2. Actualizar token
  3. Llamar checkPasswordPolicy(user)
  4. Capturar respuesta

RESULTADO ESPERADO:
  - Retorna: 'EXPIRED'
  - Contraseña requiere cambio

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log: daysPassed > 90
```

### CASO: L4-CheckPassword-PasswordVigente
```
CASO DE PRUEBA: L4
─────────────────────────────────────────────────────────────
Módulo:          Login
Función:         checkPasswordPolicy(user)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado recientemente
  □ passwordUpdatedAt reciente (<90 días)
  □ Sin requiresPasswordChange

ENTRADA:
  user: User
  claims.passwordUpdatedAt: Epoch de hace 30 días

PASOS:
  1. Establecer fecha reciente (ej: 30 días atrás)
  2. Obtener token actualizado
  3. Llamar checkPasswordPolicy(user)
  4. Capturar respuesta

RESULTADO ESPERADO:
  - Retorna: 'OK'
  - Contraseña vigente

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log: daysPassed < 90
```

---

## PRODUCTOS

### CASO: P1-CreateProducto-DatosMinimos
```
CASO DE PRUEBA: P1
─────────────────────────────────────────────────────────────
Módulo:          Productos
Función:         createProducto(data)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado con token válido
  □ API accesible en /api/Productos
  □ Sin productos previos con el mismo nombre

ENTRADA:
  data: {
    nombre: "Champú Anti-Caída",
    stockVentas: 10,
    stockInsumos: 5,
    precio: 25000,
    activo: true
  }

PASOS:
  1. Llamar productoService.createProducto(data)
  2. Esperar respuesta
  3. Capturar objeto retornado

RESULTADO ESPERADO:
  - Retorna: ApiProducto con id asignado
  - nombre = "Champú Anti-Caída"
  - stockVentas = 10
  - stockInsumos = 5
  - activo = true
  - Sin errores

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Console log: respuesta JSON
  [ ] ID del producto creado: _______
```

### CASO: P5-CreateProducto-StockCero
```
CASO DE PRUEBA: P5
─────────────────────────────────────────────────────────────
Módulo:          Productos
Función:         createProducto(data)
Tipo:            Equivalencia (borde de stock)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado
  □ API disponible

ENTRADA:
  data: {
    nombre: "Producto Sin Stock",
    stockVentas: 0,
    stockInsumos: 0,
    precio: 50000
  }

PASOS:
  1. Llamar createProducto con stock = 0
  2. Capturar respuesta
  3. Validar persistencia

RESULTADO ESPERADO:
  - Producto creado exitosamente
  - stockVentas = 0
  - stockInsumos = 0
  - cantidad total = 0
  - Sin rechazos (se permite stock cero)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID creado: _______
```

### CASO: PB1-UpdateStock-Minimo
```
CASO DE PRUEBA: PB1
─────────────────────────────────────────────────────────────
Módulo:          Productos
Función:         updateStock(id, stockVentas, stockInsumos)
Tipo:            Límite (mínimo)
Prioridad:       Alta

PRECONDICIONES:
  □ Producto existente con id conocido
  □ Usuario autenticado

ENTRADA:
  id: [ID de producto existente]
  stockVentas: 0
  stockInsumos: 0

PASOS:
  1. Llamar updateStock(id, 0, 0)
  2. Capturar respuesta
  3. Verificar producto actualizado

RESULTADO ESPERADO:
  - Actualización exitosa
  - stockVentas = 0
  - stockInsumos = 0
  - cantidad = 0
  - Sin errores

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID producto: ___________
  [ ] Resultado stock: 0
```

### CASO: PB3-UpdateStock-Negativo
```
CASO DE PRUEBA: PB3
─────────────────────────────────────────────────────────────
Módulo:          Productos
Función:         updateStock(id, stockVentas, stockInsumos)
Tipo:            Límite (valor inválido)
Prioridad:       Alta

PRECONDICIONES:
  □ Producto existente
  □ Usuario autenticado

ENTRADA:
  id: [ID de producto]
  stockVentas: -100
  stockInsumos: 0

PASOS:
  1. Intentar updateStock(id, -100, 0)
  2. Capturar respuesta/error
  3. Verificar comportamiento

RESULTADO ESPERADO:
  Opción A: Rechaza con error (preferible)
  Opción B: Convierte a 0 automáticamente
  Opción C: Permite negativo (inesperado)
  
  Capturar cual ocurre: ☐ A  ☐ B  ☐ C

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento observado: ___________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Mensaje de error (si aplica)
  [ ] Stock final en BD
```

---

## VENTAS

### CASO: V1-CreateVenta-ConProductos
```
CASO DE PRUEBA: V1
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         createVenta(ventaData)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado (obtenido usuarioId)
  □ Productos existentes en BD
  □ Cliente registrado (opcional pero recomendado)

ENTRADA:
  ventaData: {
    clienteId: 1,
    usuarioId: 5,
    clienteDocumento: "1234567890",
    fecha: "2026-05-20",
    estado: "Completada",
    metodoPago: "Efectivo",
    productosDetalle: [
      { id: 3, nombre: "Gel fijador", cantidad: 2, precio: 15000 },
      { id: 5, nombre: "Champú", cantidad: 1, precio: 25000 }
    ],
    serviciosDetalle: [],
    subtotal: 55000,
    iva: 10450,
    descuento: 0,
    total: 65450,
    garantiaMeses: 0
  }

PASOS:
  1. Preparar datos de venta
  2. Llamar createVenta(ventaData)
  3. Capturar respuesta
  4. Validar detalles

RESULTADO ESPERADO:
  - Venta creada con id asignado
  - numeroRecibo generado (REC-YYYY-NNNNNN)
  - productosDetalle sincronizado
  - total calculado correctamente
  - Sin excepciones

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID venta creada: _______
  [ ] numeroRecibo: ________________
```

### CASO: V3-CreateVenta-SinDetalles
```
CASO DE PRUEBA: V3
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         createVenta(ventaData)
Tipo:            Equivalencia (caso inválido)
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado

ENTRADA:
  ventaData: {
    clienteId: 1,
    usuarioId: 5,
    fecha: "2026-05-20",
    productosDetalle: [],
    serviciosDetalle: [],
    subtotal: 0,
    iva: 0,
    descuento: 0,
    total: 0,
    garantiaMeses: 0
  }

PASOS:
  1. Intentar crear venta sin detalles
  2. Capturar respuesta/error

RESULTADO ESPERADO:
  - Error lanzado o capturado
  - Mensaje: "debe tener al menos un producto o servicio"
  - Venta NO creada

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Mensaje de error: ________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Error message capturado
```

### CASO: VB4-CreateVenta-DescuentoMaximo
```
CASO DE PRUEBA: VB4
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         createVenta(ventaData)
Tipo:            Límite (descuento = 100%)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado
  □ Producto disponible

ENTRADA:
  ventaData: {
    clienteId: 1,
    usuarioId: 5,
    productosDetalle: [{ id: 1, cantidad: 1, precio: 50000 }],
    serviciosDetalle: [],
    subtotal: 50000,
    iva: 9500,
    descuento: 50000,  // Descuento = subtotal (100%)
    total: 9500,        // total = iva solamente
    garantiaMeses: 0
  }

PASOS:
  1. Crear venta con descuento = subtotal
  2. Capturar respuesta
  3. Validar cálculos

RESULTADO ESPERADO:
  - Venta creada (si es permitido)
  - total = iva
  - Mensaje de alerta (si aplica)
  Ó
  - Rechazada con validación

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Total final: ___________
```

### CASO: VG1-GetVentaById-Existente
```
CASO DE PRUEBA: VG1
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         getVentaById(id)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Venta con id conocido debe existir en BD

ENTRADA:
  id: [ID de venta existente - debe ser validado previamente]

PASOS:
  1. Obtener ID de venta existente
  2. Llamar getVentaById(id)
  3. Capturar objeto Venta

RESULTADO ESPERADO:
  - Retorna objeto Venta completo
  - Contiene: id, cliente, productos, servicios, total
  - Datos coinciden con BD
  - Sin excepciones

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID consultado: ________
  [ ] Cliente: ________________________
  [ ] Total: ___________
```

### CASO: VG2-GetVentaById-NoExiste
```
CASO DE PRUEBA: VG2
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         getVentaById(id)
Tipo:            Equivalencia (caso no encontrado)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado

ENTRADA:
  id: 99999 (ID que no existe)

PASOS:
  1. Llamar getVentaById(99999)
  2. Capturar respuesta

RESULTADO ESPERADO:
  - Retorna: null
  - Sin excepciones lanzadas
  - Manejo graceful

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Retorno confirmado: null
```

### CASO: VF1-GetVentasByFecha-RangoValido
```
CASO DE PRUEBA: VF1
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         getVentasByFecha(inicio, fin)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Existen ventas en el rango de fechas
  □ Fechas en BD son conocidas

ENTRADA:
  inicio: "2026-05-01"
  fin: "2026-05-31"

PASOS:
  1. Llamar getVentasByFecha("2026-05-01", "2026-05-31")
  2. Capturar array de Ventas
  3. Validar fechas dentro del rango

RESULTADO ESPERADO:
  - Retorna array de Ventas
  - Todas las ventas tienen fecha >= inicio y <= fin
  - Sin excepciones
  - Cantidad = ventas esperadas

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Cantidad de ventas retornadas: ________
  [ ] Primer fecha: _______________
  [ ] Última fecha: _______________
```

### CASO: VF3-GetVentasByFecha-InicioMayorFin
```
CASO DE PRUEBA: VF3
─────────────────────────────────────────────────────────────
Módulo:          Ventas
Función:         getVentasByFecha(inicio, fin)
Tipo:            Límite (fecha invertida)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado

ENTRADA:
  inicio: "2026-05-31"
  fin: "2026-05-01"  (fin < inicio)

PASOS:
  1. Llamar getVentasByFecha("2026-05-31", "2026-05-01")
  2. Capturar respuesta

RESULTADO ESPERADO:
  Opción A: Retorna array vacío []
  Opción B: Intercambia fechas internamente
  Opción C: Lanza error
  
  Capturar: ☐ A  ☐ B  ☐ C

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Resultado obtenido
```

---

## AGENDAMIENTOS

### CASO: A1-CreateAgendamiento-Valida
```
CASO DE PRUEBA: A1
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Cliente registrado
  □ Barbero registrado
  □ Servicio registrado

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "14:00",
    duracion: 60,
    precio: 35000,
    estado: "Pendiente",
    notas: "Cliente preferencias especiales"
  }

PASOS:
  1. Preparar datos válidos
  2. Llamar createAgendamiento(data)
  3. Capturar objeto Agendamiento
  4. Validar campos

RESULTADO ESPERADO:
  - Agendamiento creado con id
  - Todos los campos asignados
  - Estado = "Pendiente"
  - Sin errores

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID agendamiento: ________
  [ ] hora perseguida: ___________
  [ ] barbero asignado: ___________
```

### CASO: A7-CreateAgendamiento-PrecioNegativo
```
CASO DE PRUEBA: A7
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Equivalencia (entrada inválida)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado
  □ Datos base válidos

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "14:00",
    duracion: 60,
    precio: -35000,  // Precio negativo
    estado: "Pendiente",
    notas: ""
  }

PASOS:
  1. Intentar crear agendamiento con precio negativo
  2. Capturar respuesta/error

RESULTADO ESPERADO:
  - Error lanzado o rechazado
  - Mensaje de validación
  - Agendamiento NO creado
  Ó
  - Convierte a positivo (validar cual)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Error message (si aplica)
```

### CASO: AB1-CreateAgendamiento-FechaHoy
```
CASO DE PRUEBA: AB1
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Límite (fecha hoy)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado
  □ Datos válidos excepto fecha

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-20",  // HOY
    hora: "14:00",
    duracion: 60,
    precio: 35000,
    estado: "Pendiente",
    notas: ""
  }

PASOS:
  1. Obtener fecha actual del sistema
  2. Usarla como fecha de agendamiento
  3. Llamar createAgendamiento(data)
  4. Capturar respuesta

RESULTADO ESPERADO:
  - Agendamiento creado (permitido hoy)
  - Ó rechazado (si no permite hoy)
  
  Capturar: ☐ Permitido  ☐ Rechazado

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Resultado
```

### CASO: AB3-CreateAgendamiento-HoraMinima
```
CASO DE PRUEBA: AB3
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Límite (hora mínima: 00:00)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado
  □ Otros datos válidos

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "00:00",  // Mínima
    duracion: 60,
    precio: 35000,
    estado: "Pendiente",
    notas: ""
  }

PASOS:
  1. Crear agendamiento con hora 00:00
  2. Capturar respuesta
  3. Validar persistencia

RESULTADO ESPERADO:
  - Agendamiento creado (permitido)
  - hora = "00:00"
  - Sin errores

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Hora persistida: 00:00
```

### CASO: AB5-CreateAgendamiento-HoraInvalida24
```
CASO DE PRUEBA: AB5
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Límite (hora inválida: 24:00)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "24:00",  // Inválida
    duracion: 60,
    precio: 35000,
    estado: "Pendiente",
    notas: ""
  }

PASOS:
  1. Intentar crear agendamiento con hora 24:00
  2. Capturar respuesta/error

RESULTADO ESPERADO:
  - Rechazado con validación
  - Mensaje de error "hora inválida" o similar
  - Agendamiento NO creado
  Ó
  - Aceptado (validar comportamiento)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Error capturado
```

### CASO: AB7-CreateAgendamiento-DuracionMinima
```
CASO DE PRUEBA: AB7
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         createAgendamiento(data)
Tipo:            Límite (duración mínima: 1 minuto)
Prioridad:       Baja

PRECONDICIONES:
  □ Usuario autenticado
  □ Datos válidos excepto duración

ENTRADA:
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "14:00",
    duracion: 1,  // 1 minuto
    precio: 35000,
    estado: "Pendiente",
    notas: ""
  }

PASOS:
  1. Crear agendamiento con duracion = 1
  2. Capturar respuesta
  3. Validar persistencia

RESULTADO ESPERADO:
  - Agendamiento creado
  - duracion = 1 minuto
  - Sin errores (poco realista pero válido)

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Duración persistida: 1
```

### CASO: AD1-DeleteAgendamiento-Valida
```
CASO DE PRUEBA: AD1
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         deleteAgendamiento(id)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Agendamiento existente (id conocido)
  □ Permitir eliminación en estado actual

ENTRADA:
  id: [ID de agendamiento existente]

PASOS:
  1. Obtener ID de agendamiento válido
  2. Llamar deleteAgendamiento(id)
  3. Capturar respuesta
  4. Verificar eliminación en BD (getAgendamientoById)

RESULTADO ESPERADO:
  - deleteAgendamiento retorna Promise sin error
  - getAgendamientoById retorna null después
  - Sin excepciones

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID eliminado: ________
  [ ] Verificación post-delete: null ✓
```

### CASO: AD2-DeleteAgendamiento-NoExiste
```
CASO DE PRUEBA: AD2
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         deleteAgendamiento(id)
Tipo:            Equivalencia (no encontrado)
Prioridad:       Media

PRECONDICIONES:
  □ Usuario autenticado

ENTRADA:
  id: 99999 (ID que no existe)

PASOS:
  1. Llamar deleteAgendamiento(99999)
  2. Capturar respuesta/error

RESULTADO ESPERADO:
  Opción A: Retorna sin error (silencioso)
  Opción B: Lanza error 404
  
  Capturar: ☐ A  ☐ B

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  Comportamiento: ___________________________________________
  ___________________________________________________________
  
EVIDENCIA:
  [ ] Respuesta observada
```

### CASO: AU1-UpdateAgendamiento-CambiarHora
```
CASO DE PRUEBA: AU1
─────────────────────────────────────────────────────────────
Módulo:          Agendamientos
Función:         updateAgendamiento(id, data)
Tipo:            Equivalencia
Prioridad:       Alta

PRECONDICIONES:
  □ Usuario autenticado
  □ Agendamiento existente (id conocido)
  □ Debe estar en estado editable

ENTRADA:
  id: [ID agendamiento existente]
  data: {
    clienteId: 2,
    barberoId: 3,
    servicioId: 5,
    fecha: "2026-05-25",
    hora: "16:30",  // Hora nueva
    duracion: 60,
    precio: 35000,
    estado: "Pendiente",
    notas: "Hora modificada"
  }

PASOS:
  1. Obtener agendamiento actual
  2. Cambiar hora a "16:30"
  3. Llamar updateAgendamiento(id, data)
  4. Verificar cambio perseguido

RESULTADO ESPERADO:
  - Actualización exitosa
  - hora = "16:30"
  - Otros campos sin cambios
  - Sin errores

EJECUCIÓN:
  Fecha:         ___/___/______
  Ejecutado por: ________________
  Resultado:     ☐ PASÓ  ☐ FALLÓ  ☐ BLOQUEADO
  
NOTAS:
  ___________________________________________________________
  
EVIDENCIA:
  [ ] ID actualizado: ________
  [ ] Hora nueva: 16:30
```

---

## RESUMEN EJECUTABLE

### Contador de Casos por Módulo

| Módulo | Equivalencia | Límites | Total |
|--------|--------------|---------|-------|
| Login | 2 | 3 | 5 |
| Productos | 2 | 3 | 5 |
| Ventas | 3 | 2 | 5 |
| Agendamientos | 3 | 4 | 7 |
| **TOTAL** | **10** | **12** | **22** |

### Checklist de Ejecución

**MÓDULO LOGIN**
- [ ] L1: Usuario nulo
- [ ] L2: Primer login
- [ ] L3: Password expirado
- [ ] L4: Password vigente
- [ ] LB1: Exactamente 90 días
- [ ] LB2: 89 días
- [ ] LB3: 91 días
- [ ] L5: Sin claim (si aplica)

**MÓDULO PRODUCTOS**
- [ ] P1: Crear con datos mínimos
- [ ] P2: Con categoría
- [ ] P3: Sin nombre
- [ ] P4: Precios negativos
- [ ] P5: Stock cero
- [ ] P6: Stock alto
- [ ] PB1: Update stock mínimo (0)
- [ ] PB2: Update stock máximo
- [ ] PB3: Stock negativo
- [ ] PB4: Producto no existe
- [ ] PB5: Transferencia total

**MÓDULO VENTAS**
- [ ] V1: Crear con productos
- [ ] V2: Con servicios
- [ ] V3: Sin detalles (error)
- [ ] V4: Sin usuario (error)
- [ ] V5: Cliente opcional
- [ ] V6: Montos negativos
- [ ] V7: Descuento > subtotal
- [ ] VB1: Subtotal mínimo
- [ ] VB2: Subtotal máximo
- [ ] VB4: Descuento 100%
- [ ] VG1: GetById existente
- [ ] VG2: GetById no existe
- [ ] VF1: GetByFecha rango válido
- [ ] VF2: GetByFecha sin ventas
- [ ] VF3: GetByFecha inicio > fin
- [ ] VF4: GetByFecha mismo día

**MÓDULO AGENDAMIENTOS**
- [ ] A1: Crear válida
- [ ] A2: Múltiples servicios
- [ ] A3: Con productos
- [ ] A7: Precio negativo
- [ ] AB1: Fecha hoy
- [ ] AB3: Hora mínima (00:00)
- [ ] AB4: Hora máxima (23:59)
- [ ] AB5: Hora inválida (24:00)
- [ ] AB6: Hora inválida (25:00)
- [ ] AB7: Duración mínima
- [ ] AB8: Duración máxima
- [ ] AD1: Delete válida
- [ ] AD2: Delete no existe
- [ ] AU1: Update hora

---

## INFORME FINAL

### Cierre de Ejecución

**Fecha de Inicio:** ___/___/______  
**Fecha de Cierre:** ___/___/______  
**Ejecutado por:** ________________  

**Resultados Globales**

| Estado | Cantidad | % |
|--------|----------|-----|
| PASÓ | ____ | ___% |
| FALLÓ | ____ | ___% |
| BLOQUEADO | ____ | ___% |

**Casos Críticos Fallidos (si aplica)**

1. ________________________________________________________
2. ________________________________________________________
3. ________________________________________________________

**Recomendaciones**

- [ ] Todos los casos pasaron - Listo para producción
- [ ] Fallos menores - Documentados, no bloquean
- [ ] Fallos críticos - REQUIERE CORRECCIÓN antes de release

**Aprobado por:** ________________  
**Fecha:** ___/___/______  

---

