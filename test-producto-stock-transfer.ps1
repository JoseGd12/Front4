param(
  [string]$BaseUrl = "https://manitobarbershop.up.railway.app",
  [int]$ProductoId = 13
)

$before = Invoke-RestMethod -Uri "$BaseUrl/api/Productos/$ProductoId" -Method Get
$targetVentas = [int]$before.stockVentas + [int]$before.stockInsumos
$payload = @{
  id = [int]$before.id
  nombre = "$($before.nombre)"
  descripcion = "$($before.descripcion)"
  marca = "$($before.marca)"
  precioVenta = [decimal]$before.precioVenta
  precioCompra = [decimal]$before.precioCompra
  stockVentas = $targetVentas
  stockInsumos = 0
  categoriaId = [int]$before.categoriaId
  estado = [bool]$before.estado
  imagenProduc = "$($before.imagenProduc)"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BaseUrl/api/Productos/$ProductoId" -Method Put -ContentType "application/json" -Body $payload | Out-Null
$after = Invoke-RestMethod -Uri "$BaseUrl/api/Productos/$ProductoId" -Method Get

$result = [PSCustomObject]@{
  productoId = $ProductoId
  before_stockVentas = [int]$before.stockVentas
  before_stockInsumos = [int]$before.stockInsumos
  sent_stockVentas = $targetVentas
  sent_stockInsumos = 0
  after_stockVentas = [int]$after.stockVentas
  after_stockInsumos = [int]$after.stockInsumos
  persisted = ([int]$after.stockVentas -eq $targetVentas -and [int]$after.stockInsumos -eq 0)
}

$result | Format-List
if (-not $result.persisted) { exit 2 }
