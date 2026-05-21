const { Document, Packer, Table, TableCell, TableRow, Paragraph, HeadingLevel, AlignmentType, VerticalAlign, BorderStyle } = require('docx');
const fs = require('fs');

const createTestTable = (title, rows) => {
  const cells = title.map(header => new TableCell({
    children: [new Paragraph({ text: header, bold: true })],
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: 'D3D3D3' }
  }));

  const tableRows = [new TableRow({ children: cells })];

  rows.forEach(row => {
    const rowCells = row.map(cell => new TableCell({
      children: [new Paragraph({ text: String(cell) })],
      verticalAlign: VerticalAlign.TOP
    }));
    tableRows.push(new TableRow({ children: rowCells }));
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: 'pct' }
  });
};

const doc = new Document({
  sections: [{
    children: [
      // Title
      new Paragraph({
        text: 'PRUEBAS DE CAJA NEGRA - MODULO DE REGISTRO',
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),

      // Metadata
      new Paragraph({
        text: 'INFORMACION DEL DOCUMENTO',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(
        ['Campo', 'Valor'],
        [
          ['Proyecto', 'Front4'],
          ['Modulo', 'Registro'],
          ['Fecha', '2026-05-20'],
          ['Tecnicas', 'Particion de Equivalencia + Valores Limites'],
          ['Version', '1.0'],
          ['Autor', 'QA Team']
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      // Part 1
      new Paragraph({
        text: 'PARTE 1: PLANIFICACION',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: '1.1 Objetivo General',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: 'Validar que el modulo de Registro de usuarios funciona correctamente. Se verificara que el sistema acepte datos validos, rechace datos invalidos, valide restricciones de unicidad y cree usuarios con rol CLIENT.',
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: '1.2 Alcance de la Prueba',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(
        ['DENTRO DEL ALCANCE', 'FUERA DEL ALCANCE'],
        [
          ['Validacion campos obligatorios; Restriccion duplicados; Rol CLIENT en BD', 'Login; Recuperacion contraseña; Redes sociales']
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: '1.3 Funcion bajo Prueba',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      new Paragraph({
        text: 'Registro de Usuario - Creacion de cuenta en Front4',
        spacing: { after: 200 }
      }),

      new Paragraph({
        text: '1.4 Criterios de Exito',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(
        ['Criterio', 'Descripcion'],
        [
          ['Usuario creado; Errores en vacios', 'Usuario en BD con rol correcto']
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 400 } }),

      // Part 2
      new Paragraph({
        text: 'PARTE 2: DISENO DE PRUEBAS',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: '2.1 Matriz de Particion de Equivalencia',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(
        ['ID', 'Campo', 'Clase Valida', 'Clase Invalida', 'Resultado'],
        [
          ['RE-P1', 'Datos Completos', 'Todos validos', 'N/A', 'Usuario creado'],
          ['RE-P2', 'Nombre', 'Texto 3-50', 'Vacio', 'Error'],
          ['RE-P3', 'Apellido', 'Texto 3-50', 'Vacio', 'Error'],
          ['RE-P4', 'Email', 'Formato valido', 'Formato invalido', 'Aceptado/Rechazado'],
          ['RE-P5', 'Email Dup', 'Email unico', 'Registrado', 'Rechazado'],
          ['RE-P6', 'Documento', 'Documento unico', 'Duplicado', 'Rechazado'],
          ['RE-P7', 'Contrasena', '8+ caracteres', '<8 caracteres', 'Rechazado'],
          ['RE-P8', 'Contrasena', '8+ variedad', 'Solo numeros', 'Aceptado/Rechazado'],
          ['RE-P9', 'Confirmacion', 'Coincide', 'No coincide', 'Rechazado'],
          ['RE-P10', 'Telefono', 'Numeros validos', 'Caracteres especiales', 'Aceptado'],
          ['RE-P11', 'Terminos', 'Aceptado', 'No aceptado', 'Rechazado'],
          ['RE-P12', 'Combinacion', 'Todos obligatorios', 'Uno vacio', 'Rechazado'],
          ['RE-P13', 'Caracteres', 'Sin especiales', 'Con especiales', 'Rechazado'],
          ['RE-P14', 'Espacios', 'Sin espacios', 'Con espacios', 'Rechazado'],
          ['RE-P15', 'Case', 'Minusculas', 'Mayusculas', 'Normalizado'],
          ['RE-P16', 'Rol', 'Rol CLIENT', 'Rol incorrecto', 'Error BD'],
          ['RE-P17', 'BD', 'Insertado OK', 'Datos corruptos', 'Verificar']
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: '2.2 Matriz de Valores Limites',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(
        ['ID', 'Campo', 'Valor', 'Clasificacion', 'Resultado'],
        [
          ['RE-L1', 'Email Longitud', 'Min: 5', 'Valido', 'Aceptado'],
          ['RE-L2', 'Email Longitud', 'Min-1: 4', 'Invalido', 'Rechazado'],
          ['RE-L3', 'Email Longitud', 'Max: 254', 'Valido', 'Aceptado'],
          ['RE-L4', 'Email Longitud', 'Max+1: 255', 'Invalido', 'Rechazado'],
          ['RE-L5', 'Nombre Longitud', 'Min: 1', 'Valido', 'Aceptado'],
          ['RE-L6', 'Nombre Longitud', 'Max: 50', 'Valido', 'Aceptado'],
          ['RE-L7', 'Nombre Longitud', 'Max+1: 51', 'Invalido', 'Rechazado'],
          ['RE-L8', 'Documento Longitud', 'Min: 8', 'Valido', 'Aceptado'],
          ['RE-L9', 'Documento Longitud', 'Max: 20', 'Valido', 'Aceptado'],
          ['RE-L10', 'Documento Longitud', 'Max+1: 21', 'Invalido', 'Rechazado'],
          ['RE-L11', 'Contrasena Longitud', 'Min: 8', 'Valido', 'Aceptado'],
          ['RE-L12', 'Contrasena Longitud', 'Min-1: 7', 'Invalido', 'Rechazado'],
          ['RE-L13', 'Contrasena Longitud', 'Max: Sin limite', 'Valido', 'Aceptado'],
          ['RE-L14', 'Apellido Longitud', 'Min: 1', 'Valido', 'Aceptado'],
          ['RE-L15', 'Apellido Longitud', 'Max: 50', 'Valido', 'Aceptado']
        ]
      ),
      new Paragraph({ text: '', spacing: { after: 400 } }),

      // Part 3
      new Paragraph({
        text: 'PARTE 3: ESPECIFICACION DETALLADA',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),

      // Test cases
      new Paragraph({
        text: 'CASO: RE-P1-A - Registro Exitoso',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P1-A'],
        ['Tipo', 'Valida'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'Datos validos, no registrados'],
        ['Entrada', 'Juan, Perez, test@example.com, 12345678, Pass1234'],
        ['Pasos', '1. Ir registro; 2. Llenar; 3. Registrarse'],
        ['Resultado Esperado', 'Usuario creado. BD con rol CLIENT'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-P2-A - Nombre Vacio',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P2-A'],
        ['Tipo', 'Invalida'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'Formulario abierto'],
        ['Entrada', 'Nombre vacio, resto valido'],
        ['Pasos', '1. Nombre vacio; 2. Registrarse'],
        ['Resultado Esperado', 'Error: Nombre obligatorio'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-P5-A - Email Duplicado',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P5-A'],
        ['Tipo', 'Restriccion'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'Email registrado'],
        ['Entrada', 'Email duplicado'],
        ['Pasos', '1. Email dup; 2. Registrarse'],
        ['Resultado Esperado', 'Error: Email registrado'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-P7-A - Contrasena Corta',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P7-A'],
        ['Tipo', 'Invalida'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'Formulario abierto'],
        ['Entrada', 'Contrasena 6 caracteres'],
        ['Pasos', '1. Contrasena corta; 2. Registrarse'],
        ['Resultado Esperado', 'Error: Minimo 8'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-L10-A - Documento 8 Caracteres',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-L10-A'],
        ['Tipo', 'Borde'],
        ['Prioridad', 'MEDIA'],
        ['Precondiciones', 'No registrado'],
        ['Entrada', 'Documento 12345678'],
        ['Pasos', '1. Doc 8 chars; 2. Registrarse'],
        ['Resultado Esperado', 'Aceptado'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-L11-A - Documento 7 Caracteres',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-L11-A'],
        ['Tipo', 'Borde'],
        ['Prioridad', 'MEDIA'],
        ['Precondiciones', 'Validacion activa'],
        ['Entrada', 'Documento 1234567'],
        ['Pasos', '1. Doc 7 chars; 2. Registrarse'],
        ['Resultado Esperado', 'Error: Minimo 8'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-P4-A - Email Valido',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P4-A'],
        ['Tipo', 'Valida'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'No registrado'],
        ['Entrada', 'user.name+tag@example.co.uk'],
        ['Pasos', '1. Email valido; 2. Registrarse'],
        ['Resultado Esperado', 'Aceptado'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'CASO: RE-P12-A - Contrasena No Coincide',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Campo', 'Valor'], [
        ['ID', 'RE-P12-A'],
        ['Tipo', 'Invalida'],
        ['Prioridad', 'ALTA'],
        ['Precondiciones', 'Confirmacion existe'],
        ['Entrada', 'SecurePass1 vs SecurePass2'],
        ['Pasos', '1. Different; 2. Registrarse'],
        ['Resultado Esperado', 'Error: No coinciden'],
        ['Resultado Actual', '[ ] PASO [ ] FALLO [ ] BLOQUEADO']
      ]),
      new Paragraph({ text: '', spacing: { after: 400 } }),

      // Summary
      new Paragraph({
        text: 'RESUMEN EJECUTABLE',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 100 }
      }),

      new Paragraph({
        text: 'Contadores',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Metrica', 'Valor'], [
        ['Total Particion', '17'],
        ['Total Limites', '15'],
        ['Total Casos', '32'],
        ['Casos Detallados', '8']
      ]),
      new Paragraph({ text: '', spacing: { after: 200 } }),

      new Paragraph({
        text: 'Cierre',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 100 }
      }),
      createTestTable(['Resultado', 'Cantidad'], [
        ['Casos Pasados', '___ de 32'],
        ['Casos Fallidos', '___ de 32'],
        ['Casos Bloqueados', '___ de 32'],
        ['Aprobado por', '_______________']
      ]),
      new Paragraph({ text: '', spacing: { after: 100 } }),
      new Paragraph({
        text: 'Documento generado: 2026-05-20'
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('PRUEBAS_REGISTRO_CAJA_NEGRA.docx', buffer);
  console.log('Documento creado correctamente');
  console.log('Archivo: PRUEBAS_REGISTRO_CAJA_NEGRA.docx');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
