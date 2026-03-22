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
for (const file of files) {
  if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      
      let changed = false;
      const lines = content.split('\n');
      const newLines = [];
      let skipTo = -1;

      for (let i = 0; i < lines.length; i++) {
          if (i <= skipTo) continue;

          if (lines[i].includes('Filas por página')) {
              // We've hit the line with "Filas por página".
              // Let's go backwards to find the exact opening `<div className="flex items-center gap-2">`
              let startIdx = i;
              while (startIdx > 0 && !(lines[startIdx].includes('<div') && lines[startIdx].includes('gap-2'))) {
                  startIdx--;
              }

              // Let's go forwards to find the closing `</Select>`
              let selectEndIdx = i;
              while (selectEndIdx < lines.length && !lines[selectEndIdx].includes('</Select>')) {
                  selectEndIdx++;
              }

              // The `</div>` for this div comes after `</Select>`. Usually the very next line if there's nothing else.
              let divEndIdx = selectEndIdx + 1;
              let indentLevel = 0;
              // A safer approach: simply remove from startIdx to divEndIdx if divEndIdx has a </div>
              while (divEndIdx < lines.length && !lines[divEndIdx].includes('</div>')) {
                  divEndIdx++;
              }

              if (startIdx >= 0 && divEndIdx < lines.length && divEndIdx - startIdx < 40) {
                 // Remove from newLines those lines we just buffered from startIdx to i-1
                 const elementsToRemove = newLines.length - startIdx;
                 if (elementsToRemove > 0) newLines.splice(newLines.length - elementsToRemove, elementsToRemove);
                 
                 skipTo = divEndIdx;
                 changed = true;
                 console.log(`Matched block in ${Math.floor(divEndIdx - startIdx)} lines`);
                 continue;
              }
          }
          newLines.push(lines[i]);
      }

      if (changed) {
          fs.writeFileSync(file, newLines.join('\n'));
          console.log('Updated: ' + file.split('/').pop());
          replacedCount++;
      } else {
          console.log('No match: ' + file.split('/').pop());
      }
  }
}
console.log('Total files safely updated:', replacedCount);
