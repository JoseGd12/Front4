$ErrorActionPreference = "Stop"

$docPath = "C:\Users\josed\OneDrive\Escritorio\front4v2\Front4\PRUEBAS_REGISTRO_CAJA_NEGRA.docx"

# Eliminar archivo anterior
if (Test-Path $docPath) {
    Remove-Item $docPath -Force
}

# Crear aplicación Word
$word = New-Object -ComObject Word.Application
$word.Visible = $false

# Crear documento
$doc = $word.Documents.Add()

# Funciones auxiliares
function AddParagraph {
    param(
        [string]$text,
        [bool]$bold = $false,
        [int]$size = 11,
        [string]$alignment = "Left"
    )
    $para = $doc.Content.Paragraphs.Add()
    $para.Range.Text = $text
    $para.Range.Font.Size = $size
    $para.Range.Font.Bold = $bold
    $para.Alignment = switch($alignment) {
        "Center" { 1 }
        "Right" { 2 }
        default { 0 }
    }
    return $para
}

function AddTable {
    param(
        [int]$rows,
        [int]$cols
    )
    $range = $doc.Content.Paragraphs.Add().Range
    $table = $doc.Tables.Add($range, $rows, $cols)
    $table.Borders.Enable = $true
    return $table
}

function SetCellText {
    param(
        $table,
        [int]$row,
        [int]$col,
        [string]$text,
        [bool]$bold = $false
    )
    $cell = $table.Cell($row, $col)
    $cell.Range.Text = $text
    $cell.Range.Font.Bold = $bold
    $cell.Range.ParagraphFormat.Alignment = 0
}

function SetCellTextCenter {
    param(
        $table,
        [int]$row,
        [int]$col,
        [string]$text,
        [bool]$bold = $false
    )
    $cell = $table.Cell($row, $col)
    $cell.Range.Text = $text
    $cell.Range.Font.Bold = $bold
    $cell.Range.ParagraphFormat.Alignment = 1
}

# TÍTULO
AddParagraph "PRUEBAS DE CAJA NEGRA - MÓDULO DE REGISTRO" $true 14 "Center"
AddParagraph ""

# METADATA
AddParagraph "INFORMACIÓN DEL DOCUMENTO" $true 12
$metaTable = AddTable 6 2
SetCellText $metaTable 1 1 "Proyecto" $true
SetCellText $metaTable 1 2 "Front4"
SetCellText $metaTable 2 1 "Módulo" $true
SetCellText $metaTable 2 2 "Registro Caja Negra"
SetCellText $metaTable 3 1 "Fecha" $true
SetCellText $metaTable 3 2 "2026-05-20"
SetCellText $metaTable 4 1 "Técnicas" $true
SetCellText $metaTable 4 2 "Partición de Equivalencia + Valores Límites"
SetCellText $metaTable 5 1 "Versión" $true
SetCellText $metaTable 5 2 "1.0"
SetCellText $metaTable 6 1 "Autor" $true
SetCellText $metaTable 6 2 "QA Team"

AddParagraph ""

# PARTE 1: PLANIFICACIÓN
AddParagraph "PARTE 1: PLANIFICACIÓN" $true 13

# 1.1 Objetivo
AddParagraph "1.1 Objetivo General" $true 11
AddParagraph "Validar que el módulo de Registro de usuarios funciona correctamente según especificaciones, mediante técnicas de prueba de caja negra (Partición de Equivalencia y Valores Límites). Se verificará que el sistema acepte datos válidos, rechace datos inválidos, valide restricciones de unicidad (email y documento) y cree usuarios con rol CLIENT en la base de datos."

AddParagraph ""

# 1.2 Alcance
AddParagraph "1.2 Alcance de la Prueba" $true 11
$scopeTable = AddTable 3 2
SetCellText $scopeTable 1 1 "DENTRO DEL ALCANCE" $true
SetCellText $scopeTable 1 2 "FUERA DEL ALCANCE" $true
SetCellText $scopeTable 2 1 "Validación campos obligatorios; Mensajes de error informativos; Restricción de duplicados email; Restricción de duplicados documento; Creación usuario con rol CLIENT; Validación formato email; Validación contraseña mín 8 caracteres; Validación caracteres especiales"
SetCellText $scopeTable 2 2 "Login con credenciales creadas; Recuperación de contraseña; Confirmación por email; Integración con redes sociales; Verificación de teléfono; Autenticación multifactor"

AddParagraph ""

# 1.3 Función bajo prueba
AddParagraph "1.3 Función bajo Prueba" $true 11
AddParagraph "Registro de Usuario - Creación de cuenta en el sistema Front4."

AddParagraph ""

# 1.4 Criterios de Éxito
AddParagraph "1.4 Criterios de Éxito" $true 11
$critTable = AddTable 2 2
SetCellText $critTable 1 1 "Criterio" $true
SetCellText $critTable 1 2 "Descripción" $true
SetCellText $critTable 2 1 "Usuario creado exitosamente; Error apropiado cuando falta campo obligatorio; Error cuando email o documento duplicados; Validación formato email; Validación contraseña mayor o igual a 8 caracteres; Usuario insertado en BD con rol CLIENT"
SetCellText $critTable 2 2 "Datos válidos genera usuario creado en BD; Campos vacíos genera error descriptivo; Duplicados genera error de restricción; Email inválido genera rechazo; Contraseña corta genera rechazo; Verificar rol en tabla de usuarios"

AddParagraph ""
AddParagraph ""

# PARTE 2: DISEÑO
AddParagraph "PARTE 2: DISEÑO DE PRUEBAS" $true 13

# 2.1 Matriz de Partición de Equivalencia
AddParagraph "2.1 Matriz de Partición de Equivalencia" $true 11
$partTable = AddTable 18 5
SetCellTextCenter $partTable 1 1 "ID" $true
SetCellTextCenter $partTable 1 2 "Campo" $true
SetCellTextCenter $partTable 1 3 "Clase Válida" $true
SetCellTextCenter $partTable 1 4 "Clase Inválida" $true
SetCellTextCenter $partTable 1 5 "Resultado Esperado" $true

# Filas de datos
$partData = @(
    @("RE-P1", "Datos Completos", "Nombre + Apellido + Email + Documento + Contraseña válidos", "N/A", "Usuario creado exitosamente"),
    @("RE-P2", "Nombre", "Texto válido 3-50 caracteres", "Vacío o caracteres especiales", "Error o Aceptado depende validación"),
    @("RE-P3", "Apellido", "Texto válido 3-50 caracteres", "Vacío", "Error o Aceptado"),
    @("RE-P4", "Email", "Formato válido user@domain.com", "Formato inválido sin @ dominio incompleto", "Aceptado o Rechazado"),
    @("RE-P5", "Email Duplicado", "Email único en BD", "Email ya registrado", "Rechazado - Restricción"),
    @("RE-P6", "Documento", "Documento único números", "Documento duplicado", "Rechazado - Restricción"),
    @("RE-P7", "Contraseña Corta", "Mayor o igual a 8 caracteres", "Menor a 8 caracteres", "Rechazado"),
    @("RE-P8", "Contraseña Válida", "8+ caracteres con variedad", "Solo números o solo letras", "Aceptado o Rechazado"),
    @("RE-P9", "Confirmación Contraseña", "Coincide con contraseña", "No coincide", "Rechazado"),
    @("RE-P10", "Teléfono", "Números válidos o vacío", "Caracteres especiales no permitidos", "Aceptado o Rechazado"),
    @("RE-P11", "Términos y Condiciones", "Aceptado checkbox", "No aceptado", "Rechazado"),
    @("RE-P12", "Combinación Válida", "Todos campos obligatorios llenos correctamente", "Al menos un campo vacío", "Rechazado"),
    @("RE-P13", "Caracteres Especiales Nombre", "Sin caracteres especiales", "Con caracteres especiales @#$%", "Rechazado o Aceptado"),
    @("RE-P14", "Espacios en Blanco", "Sin espacios en email documento", "Con espacios", "Rechazado o Aceptado"),
    @("RE-P15", "Case Sensitivity Email", "Email en minúsculas", "Email en MAYÚSCULAS", "Validación normalizada"),
    @("RE-P16", "Rol de Usuario", "Usuario creado con rol CLIENT", "Rol no asignado o rol incorrecto", "Error de base de datos"),
    @("RE-P17", "Base de Datos", "Usuario insertado correctamente", "No se inserta o datos corruptos", "Verificar en BD")
)

$row = 2
foreach ($data in $partData) {
    SetCellTextCenter $partTable $row 1 $data[0]
    SetCellText $partTable $row 2 $data[1]
    SetCellText $partTable $row 3 $data[2]
    SetCellText $partTable $row 4 $data[3]
    SetCellText $partTable $row 5 $data[4]
    $row++
}

AddParagraph ""
AddParagraph ""

# 2.2 Matriz de Valores Límites
AddParagraph "2.2 Matriz de Valores Límites" $true 11
$limitTable = AddTable 16 5
SetCellTextCenter $limitTable 1 1 "ID" $true
SetCellTextCenter $limitTable 1 2 "Campo" $true
SetCellTextCenter $limitTable 1 3 "Valor" $true
SetCellTextCenter $limitTable 1 4 "Clasificación" $true
SetCellTextCenter $limitTable 1 5 "Resultado Esperado" $true

# Filas de límites
$limitData = @(
    @("RE-L1", "Email Longitud", "Mínimo válido: 5 caracteres a@b.co", "Límite válido", "Aceptado"),
    @("RE-L2", "Email Longitud", "Bajo mínimo: 4 caracteres", "Límite inválido", "Rechazado"),
    @("RE-L3", "Email Longitud", "Máximo RFC 5321: 254 caracteres", "Límite válido", "Aceptado"),
    @("RE-L4", "Email Longitud", "Sobre máximo: 255 caracteres", "Límite inválido", "Rechazado"),
    @("RE-L5", "Nombre Longitud", "Mínimo: 1 carácter", "Límite válido", "Aceptado o Rechazado"),
    @("RE-L6", "Nombre Longitud", "Máximo: 50 caracteres", "Límite válido", "Aceptado"),
    @("RE-L7", "Nombre Longitud", "Sobre máximo: 51 caracteres", "Límite inválido", "Rechazado"),
    @("RE-L8", "Documento Longitud", "Mínimo: 8 ej: 12345678", "Límite válido", "Aceptado"),
    @("RE-L9", "Documento Longitud", "Máximo: 20 caracteres", "Límite válido", "Aceptado"),
    @("RE-L10", "Documento Longitud", "Sobre máximo: 21 caracteres", "Límite inválido", "Rechazado"),
    @("RE-L11", "Contraseña Longitud", "Mínimo requerido: 8 caracteres", "Límite válido", "Aceptado"),
    @("RE-L12", "Contraseña Longitud", "Bajo mínimo: 7 caracteres", "Límite inválido", "Rechazado"),
    @("RE-L13", "Contraseña Longitud", "Máximo: Sin límite especificado", "Límite válido", "Aceptado"),
    @("RE-L14", "Apellido Longitud", "Mínimo: 1 carácter", "Límite válido", "Aceptado o Rechazado"),
    @("RE-L15", "Apellido Longitud", "Máximo: 50 caracteres", "Límite válido", "Aceptado")
)

$row = 2
foreach ($data in $limitData) {
    SetCellTextCenter $limitTable $row 1 $data[0]
    SetCellText $limitTable $row 2 $data[1]
    SetCellText $limitTable $row 3 $data[2]
    SetCellTextCenter $limitTable $row 4 $data[3]
    SetCellText $limitTable $row 5 $data[4]
    $row++
}

AddParagraph ""
AddParagraph ""

# PARTE 3: ESPECIFICACIÓN DETALLADA
AddParagraph "PARTE 3: ESPECIFICACIÓN DETALLADA DE CASOS DE PRUEBA" $true 13

AddParagraph ""
AddParagraph "CASO: RE-P1-A - Registro Exitoso con Datos Válidos" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P1-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Válida"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Ningún usuario registrado con email test@example.com y documento 12345678"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Nombre: Juan, Apellido: Pérez, Email: test@example.com, Documento: 12345678, Contraseña: Pass1234, Confirmación: Pass1234, Términos: Aceptado"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ir a formulario de registro; 2. Llenar todos los campos con datos válidos; 3. Aceptar términos y condiciones; 4. Clic en botón Registrarse"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Usuario creado exitosamente. Aparece mensaje Registro completado. Usuario insertado en BD con rol CLIENT"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-P2-A - Nombre Campo Vacío" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P2-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Inválida"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Formulario de registro abierto y accesible"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Nombre: vacío, Apellido: García, Email: test2@example.com, Documento: 87654321, Contraseña: Pass1234, Confirmación: Pass1234"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Dejar campo Nombre en blanco; 2. Llenar resto de campos; 3. Clic en Registrarse"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Sistema rechaza registro. Muestra error El nombre es obligatorio o equivalente"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-P5-A - Email Duplicado" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P5-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Restricción"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Email existing@test.com ya registrado en la BD"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Intento de registro con Email: existing@test.com, resto de datos válidos"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ir a registro; 2. Ingresar email duplicado; 3. Llenar resto de campos con datos válidos; 4. Clic en Registrarse"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Registro rechazado. Mensaje El email ya está registrado o similar"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-P7-A - Contraseña Menor que 8 Caracteres" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P7-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Inválida"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Formulario de registro abierto"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Nombre: Pedro, Apellido: López, Email: pedro@test.com, Documento: 11111111, Contraseña: Pass12, Confirmación: Pass12"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Llenar formulario con contraseña de 6 caracteres; 2. Clic en Registrarse"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Sistema rechaza. Muestra error Contraseña debe tener al menos 8 caracteres"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-L10-A - Documento Exactamente 8 Caracteres Límite Válido" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-L10-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Borde"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "MEDIA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Documento 12345678 no está registrado"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Nombre: Ana, Apellido: Martín, Email: ana@test.com, Documento: 12345678 exactamente 8 caracteres, Contraseña: ValidPass1"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ingresar documento con exactamente 8 caracteres; 2. Completar resto de datos; 3. Enviar"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Registro acepta documento. Usuario creado exitosamente"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-L11-A - Documento 7 Caracteres Bajo Límite" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-L11-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Borde"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "MEDIA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Validación de longitud de documento activa"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Documento: 1234567 exactamente 7 caracteres, resto datos válidos"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ingresar documento con 7 caracteres; 2. Intentar registrar"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Sistema rechaza documento. Error Documento debe tener al menos 8 caracteres"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-P4-A - Email Válido Formato Correcto" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P4-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Válida"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Email user.name+tag@example.co.uk no registrado"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Email: user.name+tag@example.co.uk"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ingresar email con formato válido; 2. Completar resto de campos; 3. Enviar"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Email aceptado. Registro procesa correctamente"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph "CASO: RE-P12-A - Contraseña No Coincide con Confirmación" $true 11
$tcTable = AddTable 10 2
SetCellText $tcTable 1 1 "ID" $true
SetCellText $tcTable 1 2 "RE-P12-A"
SetCellText $tcTable 2 1 "Tipo" $true
SetCellText $tcTable 2 2 "Inválida"
SetCellText $tcTable 3 1 "Prioridad" $true
SetCellText $tcTable 3 2 "ALTA"
SetCellText $tcTable 4 1 "Precondiciones" $true
SetCellText $tcTable 4 2 "Formulario con campo de confirmación de contraseña"
SetCellText $tcTable 5 1 "Entrada" $true
SetCellText $tcTable 5 2 "Contraseña: SecurePass1, Confirmación: SecurePass2 diferente"
SetCellText $tcTable 6 1 "Pasos" $true
SetCellText $tcTable 6 2 "1. Ingresar contraseña; 2. Ingresar confirmación diferente; 3. Clic Registrarse"
SetCellText $tcTable 7 1 "Resultado Esperado" $true
SetCellText $tcTable 7 2 "Registro rechazado. Error Las contraseñas no coinciden"
SetCellText $tcTable 8 1 "Resultado Actual" $true
SetCellText $tcTable 8 2 "[ ] PASÓ  [ ] FALLÓ  [ ] BLOQUEADO"
SetCellText $tcTable 9 1 "Fecha Ejecución" $true
SetCellText $tcTable 9 2 "___/___/______"
SetCellText $tcTable 10 1 "Ejecutado por" $true
SetCellText $tcTable 10 2 "_____________________________"

AddParagraph ""
AddParagraph ""

# RESUMEN EJECUTABLE
AddParagraph "RESUMEN EJECUTABLE" $true 13

# Tabla de contadores
AddParagraph "Contadores de Ejecución" $true 11
$counterTable = AddTable 5 2
SetCellText $counterTable 1 1 "Métrica" $true
SetCellText $counterTable 1 2 "Valor" $true
SetCellText $counterTable 2 1 "Total Casos Partición de Equivalencia" $true
SetCellText $counterTable 2 2 "17"
SetCellText $counterTable 3 1 "Total Casos Valores Límites" $true
SetCellText $counterTable 3 2 "15"
SetCellText $counterTable 4 1 "Total Casos de Prueba" $true
SetCellText $counterTable 4 2 "32"
SetCellText $counterTable 5 1 "Casos Disponibles para Ejecución" $true
SetCellText $counterTable 5 2 "8 mostrados en detalle"

AddParagraph ""

# Tabla de cierre
AddParagraph "Cierre de Ejecución" $true 11
$closureTable = AddTable 4 2
SetCellText $closureTable 1 1 "Casos Pasados" $true
SetCellText $closureTable 1 2 "___ de 32 ( __% )"
SetCellText $closureTable 2 1 "Casos Fallidos" $true
SetCellText $closureTable 2 2 "___ de 32 ( __% )"
SetCellText $closureTable 3 1 "Casos Bloqueados" $true
SetCellText $closureTable 3 2 "___ de 32 ( __% )"
SetCellText $closureTable 4 1 "Aprobado por" $true
SetCellText $closureTable 4 2 "_____________________________"

AddParagraph ""
AddParagraph "Documento generado: 2026-05-20"

# Guardar documento
$doc.SaveAs($docPath)
$doc.Close()
$word.Quit()

Write-Host ""
Write-Host "Completado"
Write-Host "Ubicacion: $docPath"
Write-Host "Estructura: Planificación + Diseño matrices + 8 Casos + Resumen"
