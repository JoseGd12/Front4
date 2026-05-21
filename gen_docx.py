#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def shade_cell(cell, color):
    shading_elm = OxmlElement('w:shd')
    shading_elm.set(qn('w:fill'), color)
    cell._element.get_or_add_tcPr().append(shading_elm)

doc = Document()
doc.margins.top = Inches(0.75)
doc.margins.bottom = Inches(0.75)
doc.margins.left = Inches(0.75)
doc.margins.right = Inches(0.75)

# TITULO
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_run = title.add_run('PRUEBAS DE CAJA NEGRA - MODULO DE REGISTRO')
title_run.bold = True
title_run.font.size = Pt(16)

# METADATA
meta = doc.add_paragraph()
meta.add_run('Proyecto: ').bold = True
meta.add_run('Front4 - Sistema de Barberia\n')
meta.add_run('Modulo: ').bold = True
meta.add_run('Registro de Usuarios\n')
meta.add_run('Fecha: ').bold = True
meta.add_run('2026-05-20\n')
meta.add_run('Tecnicas: ').bold = True
meta.add_run('Particion de Equivalencia + Valores Limites\n')

# PARTE 1
doc.add_heading('PARTE 1: PLANIFICACION', level=1)

doc.add_heading('1.1 Objetivo General', level=2)
doc.add_paragraph('Validar que el modulo de registro de usuarios funciona correctamente mediante pruebas de caja negra, asegurando validaciones de campos, mensajes de error apropiados y restricciones de duplicados.')

doc.add_heading('1.2 Alcance', level=2)
t = doc.add_table(rows=2, cols=2)
t.style = 'Light Grid Accent 1'
t.rows[0].cells[0].text = 'DENTRO DEL ALCANCE'
t.rows[0].cells[1].text = 'FUERA DEL ALCANCE'
t.rows[1].cells[0].text = 'Validacion campos obligatorios\nMensajes error informativos\nRestriccion usuario duplicado\nCreacion con rol Cliente\nValidacion formato email\nValidacion contrasena minimo 8'
t.rows[1].cells[1].text = 'Login con credenciales\nRecuperacion contrasena\nConfirmacion por email\nIntegracion redes sociales\nVerificacion telefono'

doc.add_heading('1.3 Funcion Bajo Prueba', level=2)
doc.add_paragraph('POST /api/Auth/register\nregisterUser(data: RegistroRequest) -> Promise<RegistroResponse>')

doc.add_heading('1.4 Criterios de Exito', level=2)
for item in ['Usuario creado exitosamente con datos validos', 'Error apropiado cuando campo obligatorio falta', 'Error cuando email o documento ya existen', 'Validacion formato email', 'Validacion contrasena minimo 8 caracteres', 'Usuario creado con rol=CLIENT en BD']:
    doc.add_paragraph(item, style='List Bullet')

# PARTE 2
doc.add_page_break()
doc.add_heading('PARTE 2: DISENO DE CASOS', level=1)

doc.add_heading('2.1 Matriz Particion Equivalencia', level=2)
t = doc.add_table(rows=1, cols=6)
t.style = 'Light Grid Accent 1'
for i, h in enumerate(['ID', 'Campo', 'Clase Equivalencia', 'Entrada', 'Salida Esperada', 'Tipo']):
    shade_cell(t.rows[0].cells[i], 'D3D3D3')
    t.rows[0].cells[i].text = h

datos = [
    ['RE-P1', 'Nombre', 'Nombre valido', 'Juan', 'Usuario creado', 'Valida'],
    ['RE-P2', 'Nombre', 'Nombre vacio', '""', 'Error requerido', 'Invalida'],
    ['RE-P3', 'Nombre', 'Muy largo >100', 'A*101', 'Error/truncado', 'Borde'],
    ['RE-P4', 'Email', 'Email valido', 'juan@example.com', 'Usuario creado', 'Valida'],
    ['RE-P5', 'Email', 'Sin @', 'juanexample.com', 'Error formato', 'Invalida'],
    ['RE-P7', 'Email', 'Duplicado', 'admin@barberia.com', 'Error existe', 'Restriccion'],
    ['RE-P10', 'Documento', 'Duplicado', '[Existente]', 'Error duplicado', 'Restriccion'],
    ['RE-P11', 'Contrasena', 'Valida >=8', 'Pass1234', 'Usuario creado', 'Valida'],
    ['RE-P12', 'Contrasena', '<8 chars', 'Pass123', 'Error minimo 8', 'Invalida'],
    ['RE-P15', 'Confirmacion', 'No coincide', 'Pass1 vs Pass2', 'Error no coinciden', 'Invalida'],
    ['RE-P17', 'Terminos', 'Rechazados', 'false', 'Error aceptar', 'Invalida'],
]

for row in datos:
    r = t.add_row()
    for i, cell in enumerate(r.cells):
        cell.text = row[i]

doc.add_heading('2.2 Matriz Valores Limites', level=2)
t = doc.add_table(rows=1, cols=5)
t.style = 'Light Grid Accent 1'
for i, h in enumerate(['ID', 'Parametro', 'Limite', 'Entrada', 'Salida Esperada']):
    shade_cell(t.rows[0].cells[i], 'D3D3D3')
    t.rows[0].cells[i].text = h

limites = [
    ['RE-L1', 'Nombre', 'Minimo 1', 'A', 'Aceptado/Error'],
    ['RE-L2', 'Nombre', 'Maximo 100', 'A*100', 'Aceptado'],
    ['RE-L4', 'Email', 'Minimo valido', 'a@b.co', 'Aceptado'],
    ['RE-L10', 'Contrasena', 'Exactamente 8', 'Pass1234', 'Aceptado'],
    ['RE-L11', 'Contrasena', 'Menos 7', 'Pass123', 'Rechazado'],
]

for row in limites:
    r = t.add_row()
    for i, cell in enumerate(r.cells):
        cell.text = row[i]

# PARTE 3
doc.add_page_break()
doc.add_heading('PARTE 3: ESPECIFICACION DETALLADA', level=1)

def add_case(id, titulo, tipo, pre, entrada, pasos, resultado, prioridad):
    doc.add_heading('CASO {}: {}'.format(id, titulo), level=2)
    t = doc.add_table(rows=11, cols=2)
    t.style = 'Light Grid Accent 1'

    rows = [
        ('ID Caso', id),
        ('Tipo Prueba', tipo),
        ('Prioridad', prioridad),
        ('Precondiciones', pre),
        ('ENTRADA', entrada),
        ('PASOS EJECUCION', pasos),
        ('RESULTADO ESPERADO', resultado),
        ('Fecha Ejecucion', '___/___/______'),
        ('Ejecutado por', '_____________________'),
        ('Resultado', 'PASO / FALLO / BLOQUEADO'),
        ('Notas/Evidencia', '_________________________________________________'),
    ]

    for idx, (label, value) in enumerate(rows):
        shade_cell(t.rows[idx].cells[0], 'D3D3D3')
        t.rows[idx].cells[0].text = label
        t.rows[idx].cells[0].paragraphs[0].runs[0].bold = True
        t.rows[idx].cells[1].text = str(value)

    doc.add_paragraph()

# CASOS
add_case('RE-P1-A', 'Registro Exitoso Datos Validos', 'Particion - Valida',
    'BD accesible. Email y documento no existen. API disponible.',
    'Nombre: Juan | Apellido: Perez | Email: juan.perez@example.com | Documento: 123456789 | Contrasena: SecurePass123 | Confirmacion: SecurePass123 | aceptaTerminos: true',
    '1. Llenar campos\n2. Click Crear Cuenta\n3. Esperar respuesta\n4. Verificar BD',
    'Usuario creado con ID. Nombre, apellido, email, documento correctos. Rol: CLIENT. Estado: Activo. Redirecciona login.',
    'Alta')

add_case('RE-P2-A', 'Nombre Vacio Campo Obligatorio', 'Particion - Invalida',
    'Formulario cargado. Otros campos validos.',
    'Nombre: "" (vacio) | Apellido: Perez | Email: test@example.com | Documento: 987654321 | Contrasena: Pass1234 | Confirmacion: Pass1234 | aceptaTerminos: true',
    '1. Dejar nombre vacio\n2. Llenar resto\n3. Click Crear Cuenta\n4. Capturar error',
    'Mensaje: "El nombre es obligatorio". Usuario NO creado. Campo enfocado/rojo.',
    'Alta')

add_case('RE-P4-A', 'Email Valido Formato Correcto', 'Particion - Valida',
    'Email no existe en BD. BD accesible. Otros datos validos.',
    'Email: usuario.valido@dominio.com | Nombre: Juan | Apellido: Garcia | Documento: 555555555 | Contrasena: ValidPass123 | Confirmacion: ValidPass123 | aceptaTerminos: true',
    '1. Ingresar email correcto\n2. Llenar resto\n3. Click Crear Cuenta\n4. Validar creacion',
    'Usuario creado con email registrado. Sin errores. Acceso siguiente paso.',
    'Alta')

add_case('RE-P5-A', 'Email Invalido Sin @', 'Particion - Invalida',
    'Formulario cargado. Validacion activa.',
    'Email: usuariosindominio.com (sin @) | Nombre: Juan | Apellido: Lopez | Documento: 666666666 | Contrasena: Pass1234 | Confirmacion: Pass1234 | aceptaTerminos: true',
    '1. Ingresar email sin @\n2. Intentar crear\n3. Capturar validacion',
    'Error: "Email no valido". Campo rojo. Usuario NO creado.',
    'Alta')

add_case('RE-P7-A', 'Email Duplicado Ya Existe', 'Particion - Restriccion',
    'Email admin@barberia.com existe en BD. Validacion servidor activa.',
    'Email: admin@barberia.com (existente) | Nombre: Pedro | Apellido: Martinez | Documento: 777777777 | Contrasena: NewPass123 | Confirmacion: NewPass123 | aceptaTerminos: true',
    '1. Ingresar email existente\n2. Completar formulario\n3. Click Crear Cuenta\n4. Esperar validacion servidor',
    'Error: "Este email ya esta registrado". Usuario NO creado. Sugerencia recuperar cuenta.',
    'Alta')

add_case('RE-P10-A', 'Documento Duplicado Ya Existe', 'Particion - Restriccion',
    'Documento 123456789 existe en BD. Validacion servidor activa.',
    'Documento: 123456789 (existente) | Nombre: Patricia | Apellido: Rivera | Email: patricia.nueva@example.com | Contrasena: NewDoc789 | Confirmacion: NewDoc789 | aceptaTerminos: true',
    '1. Ingresar documento existente\n2. Email diferente\n3. Crear cuenta\n4. Capturar error',
    'Error: "Este documento ya esta registrado". Usuario NO creado. Sugerencia ya tiene cuenta.',
    'Alta')

add_case('RE-P11-A', 'Contrasena Valida 8 Caracteres', 'Particion - Valida',
    'Otros datos validos. Campos requeridos llenos.',
    'Contrasena: MySecurePass123 | Confirmacion: MySecurePass123 | Nombre: Maria | Apellido: Garcia | Email: maria@example.com | Documento: 888888888 | aceptaTerminos: true',
    '1. Ingresar contrasena 15 caracteres\n2. Confirmar igual\n3. Llenar resto\n4. Crear cuenta',
    'Usuario creado exitosamente. Contrasena guardada hash. Sin validaciones fortaleza.',
    'Alta')

add_case('RE-P12-A', 'Contrasena Muy Corta <8 Caracteres', 'Particion - Invalida',
    'Formulario cargado. Validacion activa.',
    'Contrasena: Pass12 (7 caracteres) | Confirmacion: Pass12 | Nombre: Carlos | Apellido: Ruiz | Email: carlos@example.com | Documento: 999999999 | aceptaTerminos: true',
    '1. Ingresar contrasena 7 caracteres\n2. Intentar crear\n3. Capturar validacion',
    'Error: "Contrasena debe tener minimo 8 caracteres". Campo marcado. Usuario NO creado.',
    'Alta')

add_case('RE-P15-A', 'Contrasenas No Coinciden', 'Particion - Invalida',
    'Formulario cargado. Validacion coincidencia activa.',
    'Contrasena: SecurePass123 | Confirmacion: SecurePass124 (diferente) | Nombre: Ana | Apellido: Sanchez | Email: ana@example.com | Documento: 444444444 | aceptaTerminos: true',
    '1. Ingresar contrasena\n2. Confirmar diferente\n3. Intentar crear\n4. Capturar error',
    'Error: "Las contrasenas no coinciden". Ambos campos marcados. Usuario NO creado.',
    'Alta')

add_case('RE-P17-A', 'Terminos Rechazados False', 'Particion - Invalida',
    'Formulario cargado. Checkbox sin marcar.',
    'aceptaTerminos: false (sin marcar) | Nombre: Fernando | Apellido: Lopez | Email: fernando@example.com | Documento: 666222111 | Contrasena: NoTerms1234 | Confirmacion: NoTerms1234',
    '1. Dejar checkbox sin marcar\n2. Llenar campos\n3. Intentar crear\n4. Capturar validacion',
    'Error: "Debe aceptar terminos y condiciones". Checkbox enfocado. Usuario NO creado.',
    'Alta')

add_case('RE-L10-A', 'Contrasena Exactamente 8 Caracteres Minimo Exacto', 'Valores Limites - Minimo',
    'Formulario cargado. Validacion minimo 8.',
    'Contrasena: Pass1234 (exactamente 8) | Confirmacion: Pass1234 | Nombre: Lucas | Apellido: Martin | Email: lucas@example.com | Documento: 333333333 | aceptaTerminos: true',
    '1. Ingresar exactamente 8 caracteres\n2. Confirmar igual\n3. Crear cuenta\n4. Verificar aceptacion',
    'Usuario creado exitosamente. Contrasena aceptada sin error. Validacion pasa limite minimo.',
    'Alta')

add_case('RE-L11-A', 'Contrasena 7 Caracteres Bajo Minimo', 'Valores Limites - Debajo',
    'Formulario cargado. Validacion activa.',
    'Contrasena: Pass123 (7 caracteres) | Confirmacion: Pass123 | Nombre: David | Apellido: Lopez | Email: david@example.com | Documento: 444444444 | aceptaTerminos: true',
    '1. Ingresar 7 caracteres\n2. Intentar crear\n3. Capturar error exacto',
    'Error mostrado: "Minimo 8 caracteres". Usuario NO creado. Campo enfocado.',
    'Alta')

# RESUMEN
doc.add_page_break()
doc.add_heading('RESUMEN EJECUTABLE', level=1)

doc.add_heading('Checklist Ejecucion', level=2)
doc.add_paragraph('PARTICION EQUIVALENCIA (12)', style='List Bullet')
for i in range(1, 13):
    doc.add_paragraph('RE-P Case', style='List Bullet 2')

doc.add_paragraph('VALORES LIMITES (5)', style='List Bullet')
for i in range(1, 6):
    doc.add_paragraph('RE-L Case', style='List Bullet 2')

doc.add_heading('Contadores', level=2)
t = doc.add_table(rows=4, cols=3)
t.style = 'Light Grid Accent 1'
t.rows[0].cells[0].text = 'Tipo'
t.rows[0].cells[1].text = 'Cantidad'
t.rows[0].cells[2].text = '%'
t.rows[1].cells[0].text = 'Particion Equivalencia'
t.rows[1].cells[1].text = '12'
t.rows[1].cells[2].text = '70.6%'
t.rows[2].cells[0].text = 'Valores Limites'
t.rows[2].cells[1].text = '5'
t.rows[2].cells[2].text = '29.4%'
t.rows[3].cells[0].text = 'TOTAL'
t.rows[3].cells[1].text = '17'
t.rows[3].cells[2].text = '100%'

doc.add_heading('Cierre Ejecucion', level=2)
t = doc.add_table(rows=7, cols=2)
t.style = 'Light Grid Accent 1'
t.rows[0].cells[0].text = 'Fecha Inicio'
t.rows[0].cells[1].text = '___/___/______'
t.rows[1].cells[0].text = 'Fecha Cierre'
t.rows[1].cells[1].text = '___/___/______'
t.rows[2].cells[0].text = 'Ejecutado por'
t.rows[2].cells[1].text = '_________________________________'
t.rows[3].cells[0].text = 'Casos Pasados'
t.rows[3].cells[1].text = '___ de 17 ( __% )'
t.rows[4].cells[0].text = 'Casos Fallidos'
t.rows[4].cells[1].text = '___ de 17 ( __% )'
t.rows[5].cells[0].text = 'Casos Bloqueados'
t.rows[5].cells[1].text = '___ de 17 ( __% )'
t.rows[6].cells[0].text = 'Aprobado por'
t.rows[6].cells[1].text = '_________________________________'

doc.save('PRUEBAS_REGISTRO_CAJA_NEGRA.docx')
print('DOCX creado: PRUEBAS_REGISTRO_CAJA_NEGRA.docx')
