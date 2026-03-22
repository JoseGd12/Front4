const fs = require('fs');
const files = [
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/ventas/pages/VentasPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/ventas/pages/DevolucionesPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/servicios/pages/ServiciosPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/productos/pages/ProductosPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/paquetes/pages/PaquetesPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/inventario/pages/ProveedoresPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/inventario/pages/EntregaInsumosPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/inventario/pages/ComprasPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/inventario/pages/CategoriasPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/horarios/pages/HorariosPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/clientes/pages/ClientesPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/administracion/pages/UsersPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/administracion/pages/RolesPage.tsx',
  'C:/Users/samue/OneDrive/Escritorio/PRoyectos/Front4/src/features/administracion/pages/BarberosPage.tsx'
];

let replacedCount = 0;
for (let file of files) {
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      const regex1 = /<div[^>]*>\s*<span[^>]*>Filas por página:?<\/span>[\s\S]*?<\/Select>\s*<\/div>/g;
      const regex2 = /<div[^>]*>\s*<label[^>]*>Filas por página:?<\/label>[\s\S]*?<\/Select>\s*<\/div>/g;
      
      let changed = false;
      if (regex1.test(content)) {
          content = content.replace(regex1, '');
          changed = true;
      }
      if (regex2.test(content)) {
          content = content.replace(regex2, '');
          changed = true;
      }
      if (content.indexOf("Filas por página") !== -1) {
          // generic fallback to remove 4 lines before and after if it couldn't match Select
          const lines = content.split('\n');
          const newLines = [];
          let skipUntil = -1;
          for (let i = 0; i < lines.length; i++) {
              if (i < skipUntil) continue;
              if (lines[i].includes('Filas por página')) {
                  // Find the previous <div that starts it
                  let startIdx = i;
                  while(startIdx > 0 && !lines[startIdx].includes('<div')) { startIdx--; }
                  let endIdx = i;
                  while(endIdx < lines.length && !lines[endIdx].includes('</Select>')) { endIdx++; }
                  // skip until end of the closing div
                  endIdx++;
                  if (lines[endIdx] && lines[endIdx].includes('</div>')) {
                      endIdx++;
                  }
                  
                  // pop items up to startIdx
                  while (newLines.length > startIdx) newLines.pop();
                  skipUntil = endIdx;
                  changed = true;
                  continue;
              }
              newLines.push(lines[i]);
          }
          if (changed) content = newLines.join('\n');
      }

      if (changed) {
          fs.writeFileSync(file, content);
          console.log('Updated: ' + file.split('/').pop());
          replacedCount++;
      } else {
          console.log('No match or already removed: ' + file.split('/').pop());
      }
  } else {
      console.log('Not found: ' + file.split('/').pop());
  }
}
console.log('Total files updated this round:', replacedCount);
