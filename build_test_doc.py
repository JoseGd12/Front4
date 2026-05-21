#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def shade_cell(cell, color):
    """Shade cell with background color"""
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:fill'), color)
    cell._element.get_or_add_tcPr().append(shading_elm)

def add_header_style(cell, text):
    """Add header style to cell"""
    shade_cell(cell, 'D3D3D3')
    cell.text = text
    if cell.paragraphs:
        for run in cell.paragraphs[0].runs:
            run.bold = True
            run.font.size = Pt(11)

# Create document
doc = Document()
doc.margins.top = Inches(0.75)
doc.margins.bottom = Inches(0.75)
doc.margins.left = Inches(0.75)
doc.margins.right = Inches(0.75)

# Title
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_run = title.add_run('PRUEBAS DE CAJA NEGRA - MODULO DE REGISTRO')
title_run.bold = True
title_run.font.size = Pt(16)

# Metadata
metadata = doc.add_paragraph()
metadata.add_run('Proyecto: ').bold = True
metadata.add_run('Front4 - Sistema de Barberia\n')
metadata.add_run('Modulo: ').bold = True
metadata.add_run('Registro de Usuarios\n')
metadata.add_run('Fecha: ').bold = True
metadata.add_run('2026-05-20\n')
metadata.add_run('Tecnicas: ').bold = True
metadata.add_run('Particion de Equivalencia + Valores Limites\n')

# PARTE 1
doc.add_heading('PARTE 1: PLANIFICACION', level=1)

doc.add_heading('1.1 Objetivo General', level=2)
doc.add_paragraph(
    'Validar que el modulo de registro de usuarios funciona correctamente mediante pruebas '
    'de caja negra, asegurando validaciones de campos, mensajes de error apropiados y '
    'restricciones de duplicados.'
)

doc.add_heading('1.2 Alcance', level=2)
table = doc.add_table(rows=3, cols=2)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Dentro del Alcance'
table.rows[0].cells[1].text = 'Fuera del Alcance'
table.rows[1].cells[0].text = (
    'Validacion de campos obligatorios\n'
    'Mensajes de error informativos\n'
    'Restriccion: Usuario duplicado\n'
    'Creacion con rol Cliente\n'
    'Restriccion: Formato email valido\n'
    'Restriccion: Contrasena minimo 8 caracteres'
)
table.rows[1].cells[1].text = (
    'Login con credenciales creadas\n'
    'Recuperacion de contrasena\n'
    'Confirmacion por email\n'
    'Integracion con redes sociales\n'
    'Verificacion de telefono'
)

doc.add_heading('1.3 Funcion Bajo Prueba', level=2)
doc.add_paragraph('POST /api/Auth/register\nregisterUser(data: RegistroRequest) -> Promise<RegistroResponse>')

doc.add_heading('1.4 Criterios de Exito', level=2)
for item in [
    'Usuario creado exitosamente con datos validos',
    'Error apropiado cuando campo obligatorio falta',
    'Error cuando email o documento ya existen',
    'Validacion de formato email',
    'Validacion de contrasena minimo 8 caracteres',
    'Usuario creado con rol=CLIENT en BD'
]:
    doc.add_paragraph(item, style='List Bullet')

# PARTE 2
doc.add_heading('PARTE 2: DISENO DE CASOS DE PRUEBA', level=1)

doc.add_heading('2.1 Matriz de Particion de Equivalencia', level=2)

partition_table = doc.add_table(rows=1, cols=6)
partition_table.style = 'Light Grid Accent 1'
header_cells = partition_table.rows[0].cells
for i, header in enumerate(['ID', 'Campo', 'Clase Equivalencia', 'Entrada Ejemplo', 'Salida Esperada', 'Tipo']):
    add_header_style(header_cells[i], header)

partition_data = [
    ['RE-P1', 'Nombre', 'Nombre valido', 'Juan', 'Usuario creado', 'Valida'],
    ['RE-P2', 'Nombre', 'Nombre vacio', '""', 'Error: campo requerido', 'Invalida'],
    ['RE-P3', 'Nombre', 'Nombre muy largo (>100)', 'A*101', 'Error o truncado', 'Borde'],
    ['RE-P4', 'Email', 'Email valido', 'juan@example.com', 'Usuario creado', 'Valida'],
    ['RE-P5', 'Email', 'Email sin @', 'juanexample.com', 'Error: formato invalido', 'Invalida'],
    ['RE-P6', 'Email', 'Email sin dominio', 'juan@', 'Error: formato invalido', 'Invalida'],
    ['RE-P7', 'Email', 'Email duplicado', 'existente@test.com', 'Error: ya existe', 'Restriccion'],
    ['RE-P8', 'Documento', 'Documento valido', '123456789', 'Usuario creado', 'Valida'],
    ['RE-P9', 'Documento', 'Documento vacio', '""', 'Error: requerido', 'Invalida'],
    ['RE-P10', 'Documento', 'Documento duplicado', '[Existente]', 'Error: duplicado', 'Restriccion'],
    ['RE-P11', 'Contrasena', 'Contrasena valida', 'Pass1234', 'Usuario creado', 'Valida'],
    ['RE-P12', 'Contrasena', 'Contrasena < 8', 'Pass123', 'Error: min 8', 'Invalida'],
    ['RE-P13', 'Contrasena', 'Contrasena vacia', '""', 'Error: requerida', 'Invalida'],
    ['RE-P14', 'Conf. Contrasena', 'Coincide', '[mismo]', 'Usuario creado', 'Valida'],
    ['RE-P15', 'Conf. Contrasena', 'No coincide', 'Pass1234 vs Pass123', 'Error: no coinciden', 'Invalida'],
    ['RE-P16', 'Terminos', 'Terminos aceptados', 'true', 'Usuario creado', 'Valida'],
    ['RE-P17', 'Terminos', 'Terminos rechazados', 'false', 'Error: debe aceptar', 'Invalida'],
]

for row_data in partition_data:
    row = partition_table.add_row()
    for i, cell_text in enumerate(row.cells):
        cell_text.text = row_data[i]

doc.add_heading('2.2 Matriz de Valores Limites', level=2)

boundary_table = doc.add_table(rows=1, cols=6)
boundary_table.style = 'Light Grid Accent 1'
header_cells = boundary_table.rows[0].cells
for i, header in enumerate(['ID', 'Parametro', 'Valor Limite', 'Entrada', 'Salida Esperada', 'Observacion']):
    add_header_style(header_cells[i], header)

boundary_data = [
    ['RE-L1', 'Nombre', 'Minimo (1 char)', 'A', 'Aceptado', 'Nombre valido'],
    ['RE-L2', 'Nombre', 'Maximo (100 chars)', 'A*100', 'Aceptado', 'Limite superior'],
    ['RE-L3', 'Nombre', 'Sobre maximo (101)', 'A*101', 'Rechazado/truncado', 'Validar rechazo'],
    ['RE-L4', 'Email', 'Minimo valido', 'a@b.co', 'Aceptado', '6 caracteres'],
    ['RE-L5', 'Email', 'Maximo (254 chars)', '[Email 254]', 'Aceptado', 'RFC 5321'],
    ['RE-L6', 'Email', 'Sobre maximo (255)', '[Email 255]', 'Rechazado', 'Validar limite'],
    ['RE-L7', 'Documento', 'Minimo (1 digit)', '1', 'Aceptado', 'Un digito'],
    ['RE-L8', 'Documento', 'Maximo (20 chars)', '12345678901234567890', 'Aceptado', '20 caracteres'],
    ['RE-L9', 'Documento', 'Sobre maximo (21)', '123456789012345678901', 'Rechazado', 'Validar limite'],
    ['RE-L10', 'Contrasena', 'Exactamente 8', 'Pass1234', 'Aceptado', 'Minimo exacto'],
    ['RE-L11', 'Contrasena', 'Menos de 8 (7)', 'Pass123', 'Rechazado', 'Un char menos'],
    ['RE-L12', 'Contrasena', 'Muy larga (100)', 'P*100', 'Aceptado', 'Sin maximo'],
    ['RE-L13', 'Telefono', 'Vacio (opcional)', '""', 'Aceptado', 'Campo opcional'],
    ['RE-L14', 'Telefono', 'Minimo (1 char)', '1', 'Aceptado', 'Un digito'],
    ['RE-L15', 'Telefono', 'Formato valido', '+57 3001234567', 'Aceptado', 'Con formato'],
]

for row_data in boundary_data:
    row = boundary_table.add_row()
    for i, cell_text in enumerate(row.cells):
        cell_text.text = row_data[i]

# PARTE 3 - CASOS ESPECIFICOS
doc.add_page_break()
doc.add_heading('PARTE 3: ESPECIFICACION DETALLADA DE CASOS', level=1)

def add_test_case(doc, case_id, titulo, tipo, pre, entrada, pasos, resultado, prioridad):
    doc.add_heading('CASO {}: {}'.format(case_id, titulo), level=2)

    table = doc.add_table(rows=11, cols=2)
    table.style = 'Light Grid Accent 1'

    rows = [
        ('ID Caso', case_id),
        ('Tipo Prueba', tipo),
        ('Prioridad', prioridad),
        ('Precondiciones', pre),
        ('ENTRADA', entrada),
        ('PASOS EJECUCION', pasos),
        ('RESULTADO ESPERADO', resultado),
        ('Fecha Ejecucion', '___/___/______'),
        ('Ejecutado por', '________________'),
        ('Resultado', 'PASO / FALLO / BLOQUEADO'),
        ('Notas/Evidencia', '_______________________________________________'),
    ]

    for idx, (label, value) in enumerate(rows):
        shade_cell(table.rows[idx].cells[0], 'D3D3D3')
        table.rows[idx].cells[0].text = label
        table.rows[idx].cells[0].paragraphs[0].runs[0].bold = True
        table.rows[idx].cells[1].text = str(value)

    doc.add_paragraph()

# Casos
add_test_case(doc, 'RE-P1-A', 'Registro Exitoso con Datos Validos', 'Particion - Valida',
    'Base de datos accesible. Email y documento no existen. API disponible.',
    'Nombre: Juan | Apellido: Perez | Email: juan.perez@example.com | Documento: 123456789 | Telefono: 3001234567 | Contrasena: SecurePass123 | ConfirmContrasena: SecurePass123 | aceptaTerminos: true',
    '1. Llenar todos los campos\n2. Click en Crear Cuenta\n3. Esperar respuesta\n4. Verificar usuario en BD',
    'Usuario creado con ID asignado. Nombre, apellido, email, documento correctos. Rol: CLIENT. Estado: Activo. Redirige a login.',
    'Alta')

add_test_case(doc, 'RE-P2-A', 'Nombre Vacio (Campo Obligatorio)', 'Particion - Invalida',
    'Formulario cargado. Otros campos validos.',
    'Nombre: "" (vacio) | Apellido: Perez | Email: test@example.com | Documento: 987654321 | Contrasena: Pass1234 | ConfirmContrasena: Pass1234 | aceptaTerminos: true',
    '1. Dejar nombre vacio\n2. Llenar resto\n3. Click Crear Cuenta\n4. Capturar error',
    'Mensaje: "El nombre es obligatorio" o similar. Usuario NO creado. Campo enfocado/destacado.',
    'Alta')

add_test_case(doc, 'RE-P4-A', 'Email Valido (Formato Correcto)', 'Particion - Valida',
    'Email no existe en BD. BD accesible. Otros datos validos.',
    'Email: usuario.valido@dominio.com | Nombre: Juan | Apellido: Garcia | Documento: 555555555 | Contrasena: ValidPass123 | ConfirmContrasena: ValidPass123 | aceptaTerminos: true',
    '1. Ingresar email correcto\n2. Llenar resto\n3. Click Crear Cuenta\n4. Validar creacion',
    'Usuario creado con email registrado. Sin errores. Acceso siguiente paso.',
    'Alta')

add_test_case(doc, 'RE-P5-A', 'Email Invalido (Sin @)', 'Particion - Invalida',
    'Formulario cargado. Validacion activa.',
    'Email: usuariosindominio.com (sin @) | Nombre: Juan | Apellido: Lopez | Documento: 666666666 | Contrasena: Pass1234 | ConfirmContrasena: Pass1234 | aceptaTerminos: true',
    '1. Ingresar email sin @\n2. Intentar crear cuenta\n3. Capturar validacion',
    'Error: "Email no valido" o "Formato incorrecto". Campo marcado rojo. Usuario NO creado.',
    'Alta')

add_test_case(doc, 'RE-P7-A', 'Email Duplicado (Ya Existe)', 'Particion - Restriccion',
    'Email admin@barberia.com existe en BD. BD accesible. Validacion servidor activa.',
    'Email: admin@barberia.com | Nombre: Pedro | Apellido: Martinez | Documento: 777777777 | Contrasena: NewPass123 | ConfirmContrasena: NewPass123 | aceptaTerminos: true',
    '1. Ingresar email existente\n2. Completar formulario\n3. Click Crear Cuenta\n4. Esperar validacion',
    'Error: "Este email ya esta registrado" o "Ya existe". Usuario NO creado. Sugerencia recuperar cuenta.',
    'Alta')

add_test_case(doc, 'RE-P11-A', 'Contrasena Valida (>=8 caracteres)', 'Particion - Valida',
    'Otros datos validos. Campos requeridos llenos.',
    'Contrasena: MySecurePass123 | ConfirmContrasena: MySecurePass123 | Nombre: Maria | Apellido: Garcia | Email: maria@example.com | Documento: 888888888 | aceptaTerminos: true',
    '1. Ingresar contrasena 15 caracteres\n2. Confirmar igual\n3. Llenar resto\n4. Crear cuenta',
    'Usuario creado. Contrasena guardada (hash). Sin validaciones fortaleza.',
    'Alta')

add_test_case(doc, 'RE-P12-A', 'Contrasena Muy Corta (<8 caracteres)', 'Particion - Invalida',
    'Formulario cargado. Validacion activa.',
    'Contrasena: Pass12 (7 caracteres) | ConfirmContrasena: Pass12 | Nombre: Carlos | Apellido: Ruiz | Email: carlos@example.com | Documento: 999999999 | aceptaTerminos: true',
    '1. Ingresar contrasena 7 caracteres\n2. Intentar crear cuenta\n3. Capturar validacion',
    'Error: "Contrasena debe tener minimo 8 caracteres". Campo marcado. Usuario NO creado.',
    'Alta')

add_test_case(doc, 'RE-P15-A', 'Contrasenas No Coinciden', 'Particion - Invalida',
    'Formulario cargado. Validacion coincidencia activa.',
    'Contrasena: SecurePass123 | ConfirmContrasena: SecurePass124 (diferente) | Nombre: Ana | Apellido: Sanchez | Email: ana@example.com | Documento: 444444444 | aceptaTerminos: true',
    '1. Ingresar contrasena\n2. Confirmar diferente\n3. Intentar crear\n4. Capturar error',
    'Error: "Las contrasenas no coinciden" o "Confirmacion incorrecta". Ambos campos marcados. Usuario NO creado.',
    'Alta')

add_test_case(doc, 'RE-P17-A', 'Terminos Rechazados (false)', 'Particion - Invalida',
    'Formulario cargado. Checkbox sin marcar.',
    'aceptaTerminos: false (checkbox sin marcar) | Nombre: Fernando | Apellido: Lopez | Email: fernando@example.com | Documento: 666222111 | Contrasena: NoTerms1234 | ConfirmContrasena: NoTerms1234',
    '1. Dejar checkbox sin marcar\n2. Llenar campos\n3. Intentar crear\n4. Capturar validacion',
    'Error: "Debe aceptar terminos" o similar. Checkbox enfocado. Usuario NO creado.',
    'Alta')

add_test_case(doc, 'RE-L10-A', 'Contrasena Exactamente 8 Caracteres', 'Valores Limites - Minimo',
    'Formulario cargado. Validacion minimo 8.',
    'Contrasena: Pass1234 (exactamente 8) | ConfirmContrasena: Pass1234 | Nombre: Lucas | Apellido: Martin | Email: lucas@example.com | Documento: 333333333 | aceptaTerminos: true',
    '1. Ingresar exactamente 8 caracteres\n2. Confirmar igual\n3. Crear cuenta\n4. Verificar aceptacion',
    'Usuario creado exitosamente. Contrasena aceptada. Sin error. Pasa limite minimo.',
    'Alta')

add_test_case(doc, 'RE-L11-A', 'Contrasena 7 Caracteres (Bajo Minimo)', 'Valores Limites - Debajo',
    'Formulario cargado. Validacion activa.',
    'Contrasena: Pass123 (7 caracteres) | ConfirmContrasena: Pass123 | Nombre: David | Apellido: Lopez | Email: david@example.com | Documento: 444444444 | aceptaTerminos: true',
    '1. Ingresar 7 caracteres\n2. Intentar crear\n3. Capturar error exacto',
    'Error mostrado. "Minimo 8 caracteres" o similar. Usuario NO creado. Campo enfocado.',
    'Alta')

# Resumen
doc.add_page_break()
doc.add_heading('RESUMEN EJECUTABLE', level=1)

doc.add_heading('Checklist de Ejecucion', level=2)
doc.add_paragraph('Casos de Particion de Equivalencia (12):', style='List Bullet')
for i in range(1, 13):
    doc.add_paragraph('RE-P{} Case', style='List Bullet 2')

doc.add_paragraph('Casos de Valores Limites (5):', style='List Bullet')
for i in range(1, 6):
    doc.add_paragraph('RE-L{} Case', style='List Bullet 2')

doc.add_heading('Contadores', level=2)
table = doc.add_table(rows=4, cols=3)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Tipo'
table.rows[0].cells[1].text = 'Cantidad'
table.rows[0].cells[2].text = '%'
table.rows[1].cells[0].text = 'Particion Equivalencia'
table.rows[1].cells[1].text = '12'
table.rows[1].cells[2].text = '70.6%'
table.rows[2].cells[0].text = 'Valores Limites'
table.rows[2].cells[1].text = '5'
table.rows[2].cells[2].text = '29.4%'
table.rows[3].cells[0].text = 'TOTAL'
table.rows[3].cells[1].text = '17'
table.rows[3].cells[2].text = '100%'

doc.add_heading('Cierre de Ejecucion', level=2)
table = doc.add_table(rows=7, cols=2)
table.style = 'Light Grid Accent 1'
table.rows[0].cells[0].text = 'Fecha Inicio'
table.rows[0].cells[1].text = '___/___/______'
table.rows[1].cells[0].text = 'Fecha Cierre'
table.rows[1].cells[1].text = '___/___/______'
table.rows[2].cells[0].text = 'Ejecutado por'
table.rows[2].cells[1].text = '_________________________________'
table.rows[3].cells[0].text = 'Casos Pasados'
table.rows[3].cells[1].text = '___ de 17 ( __% )'
table.rows[4].cells[0].text = 'Casos Fallidos'
table.rows[4].cells[1].text = '___ de 17 ( __% )'
table.rows[5].cells[0].text = 'Casos Bloqueados'
table.rows[5].cells[1].text = '___ de 17 ( __% )'
table.rows[6].cells[0].text = 'Aprobado por'
table.rows[6].cells[1].text = '_________________________________'

# Save
doc.save('PRUEBAS_REGISTRO_CAJA_NEGRA.docx')
print("Documento Word creado: PRUEBAS_REGISTRO_CAJA_NEGRA.docx")
