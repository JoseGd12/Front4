# Fix definitivo: transferencia de stock al cambiar uso de producto

## Resumen del problema

Cuando se cambia un producto a `solo_venta`, el frontend envía correctamente la intención de consolidar stock (`stockInsumos -> stockVentas`), pero el endpoint `PUT /api/Productos/{id}` responde `200` sin persistir los cambios en base de datos.

## Evidencia reproducible

1. Consultar producto:

```bash
GET /api/Productos/{id}
```

2. Enviar actualización con transferencia:

```bash
PUT /api/Productos/{id}
Content-Type: application/json

{
  "id": 13,
  "nombre": "Minoxidil 5%",
  "descripcion": "",
  "marca": "",
  "precioVenta": 9000,
  "precioCompra": 9000,
  "stockVentas": 3,
  "stockInsumos": 0,
  "categoriaId": 2,
  "estado": true,
  "imagenProduc": "https://res.cloudinary.com/..."
}
```

3. Consultar nuevamente:

```bash
GET /api/Productos/{id}
```

Si el valor vuelve a `stockVentas=0, stockInsumos=3`, el backend no está persistiendo.

## Qué corregir en backend (ASP.NET + EF Core)

Implementar el `PUT` con este patrón:

```csharp
[HttpPut("{id:int}")]
public async Task<IActionResult> PutProducto(int id, [FromBody] Producto input)
{
    if (input == null || id != input.Id) return BadRequest("Payload inválido");

    var entity = await _db.Productos.FirstOrDefaultAsync(x => x.Id == id);
    if (entity == null) return NotFound();

    entity.Nombre = input.Nombre?.Trim() ?? entity.Nombre;
    entity.Descripcion = input.Descripcion ?? "";
    entity.Marca = input.Marca ?? "";
    entity.PrecioVenta = input.PrecioVenta;
    entity.PrecioCompra = input.PrecioCompra;
    entity.StockVentas = input.StockVentas;
    entity.StockInsumos = input.StockInsumos;
    entity.StockTotal = entity.StockVentas + entity.StockInsumos;
    entity.CategoriaId = input.CategoriaId;
    entity.Estado = input.Estado;
    entity.ImagenProduc = input.ImagenProduc ?? entity.ImagenProduc;

    await _db.SaveChangesAsync();

    return Ok(new
    {
        entity.Id,
        entity.StockVentas,
        entity.StockInsumos,
        entity.StockTotal
    });
}
```

## Checklist de diagnóstico si aún no guarda

- Verificar que el endpoint no esté usando `AsNoTracking()` para actualizar.
- Verificar que no exista un `mapper` que pise `StockVentas/StockInsumos` con valores anteriores.
- Verificar que no haya trigger SQL que restaure valores.
- Verificar que el modelo `Producto` realmente tenga columnas mapeadas a `StockVentas` y `StockInsumos`.
- Verificar que el `DbContext` usado en `PUT` sea el mismo que guarda (sin transacción descartada).
- Agregar log antes y después de `SaveChangesAsync()` con los valores de stock.

## Prueba de aceptación (obligatoria)

Caso: producto con `stockVentas=0`, `stockInsumos=3`.

1. `PUT` enviando `stockVentas=3` y `stockInsumos=0`.
2. `GET` inmediato debe devolver exactamente `3/0`.
3. Reiniciar API y repetir `GET` debe seguir en `3/0`.

Si no pasa este caso, el fix no está completo.

## Estado del frontend

El frontend ya está preparado para este escenario:

- Ya no maquilla visualmente la transferencia.
- Valida persistencia real post-`PUT`.
- Si backend no persiste, muestra error explícito.

Archivos relevantes:

- [ProductosPage.tsx](file:///c:/Users/josed/OneDrive/Escritorio/front4/Front4/src/features/productos/pages/ProductosPage.tsx)
- [productos.ts](file:///c:/Users/josed/OneDrive/Escritorio/front4/Front4/src/features/productos/services/productos.ts)
