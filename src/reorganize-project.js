const fs = require('fs');
const path = require('path');

// Mapa de reorganización de archivos
const fileMap = {
  // AUTH FEATURE
  '/components/AuthContext.tsx': '/src/features/auth/contexts/AuthContext.tsx',
  '/components/LoginPageSimplified.tsx': '/src/features/auth/components/LoginPageSimplified.tsx',
  '/components/LoginPage.tsx': '/src/features/auth/components/LoginPage.tsx',
  '/components/LoginPageFixed.tsx': '/src/features/auth/components/LoginPageFixed.tsx',
  '/components/LoginPageNew.tsx': '/src/features/auth/components/LoginPageNew.tsx',
  '/components/LoginPageSimple.tsx': '/src/features/auth/components/LoginPageSimple.tsx',
  '/components/RegisterPage.tsx': '/src/features/auth/components/RegisterPage.tsx',
  '/components/ForgotPasswordPage.tsx': '/src/features/auth/components/ForgotPasswordPage.tsx',
  '/components/PasswordResetPage.tsx': '/src/features/auth/components/PasswordResetPage.tsx',
  '/components/PasswordResetStandalone.tsx': '/src/features/auth/components/PasswordResetStandalone.tsx',

  // DASHBOARD FEATURE
  '/components/Dashboard.tsx': '/src/features/dashboard/components/Dashboard.tsx',
  '/components/pages/DashboardPage.tsx': '/src/features/dashboard/pages/DashboardPage.tsx',

  // AGENDAMIENTO FEATURE
  '/components/pages/AgendamientoPage.tsx': '/src/features/agendamiento/pages/AgendamientoPage.tsx',
  '/components/pages/AgendamientoPageAdvanced.tsx': '/src/features/agendamiento/pages/AgendamientoPageAdvanced.tsx',
  '/components/pages/AgendamientoPageGoogleCalendar.tsx': '/src/features/agendamiento/pages/AgendamientoPageGoogleCalendar.tsx',
  '/components/pages/NuevaCitaComponent.tsx': '/src/features/agendamiento/components/NuevaCitaComponent.tsx',
  '/components/NuevaCitaCliente.tsx': '/src/features/agendamiento/components/NuevaCitaCliente.tsx',
  '/components/EmailSimulatorCita.tsx': '/src/features/agendamiento/components/EmailSimulatorCita.tsx',

  // SERVICIOS FEATURE
  '/components/pages/ServiciosPage.tsx': '/src/features/servicios/pages/ServiciosPage.tsx',
  '/components/pages/ClienteServiciosPage.tsx': '/src/features/servicios/pages/ClienteServiciosPage.tsx',

  // PRODUCTOS FEATURE
  '/components/pages/ProductosPage.tsx': '/src/features/productos/pages/ProductosPage.tsx',
  '/components/pages/ProductosPageUpdated.tsx': '/src/features/productos/pages/ProductosPageUpdated.tsx',

  // VENTAS FEATURE
  '/components/pages/VentasPage.tsx': '/src/features/ventas/pages/VentasPage.tsx',
  '/components/pages/VentasPageComplete.tsx': '/src/features/ventas/pages/VentasPageComplete.tsx',
  '/components/pages/DevolucionesPage.tsx': '/src/features/ventas/pages/DevolucionesPage.tsx',
  '/components/pages/DevolucionesPageUpdated.tsx': '/src/features/ventas/pages/DevolucionesPageUpdated.tsx',
  '/components/pages/NotasCreditoPage.tsx': '/src/features/ventas/pages/NotasCreditoPage.tsx',

  // CLIENTES FEATURE
  '/components/ClienteDashboard.tsx': '/src/features/clientes/components/ClienteDashboard.tsx',
  '/components/ClienteDashboardSimple.tsx': '/src/features/clientes/components/ClienteDashboardSimple.tsx',
  '/components/pages/ClientesPage.tsx': '/src/features/clientes/pages/ClientesPage.tsx',
  '/components/pages/ClientesPageWithPhoto.tsx': '/src/features/clientes/pages/ClientesPageWithPhoto.tsx',
  '/components/pages/ClienteMisCitasPageCalendar.tsx': '/src/features/clientes/pages/ClienteMisCitasPageCalendar.tsx',
  '/components/pages/ClienteAgendarCitaPage.tsx': '/src/features/clientes/pages/ClienteAgendarCitaPage.tsx',
  '/components/pages/ClienteAgendarCitaPageGoogleStyle.tsx': '/src/features/clientes/pages/ClienteAgendarCitaPageGoogleStyle.tsx',
  '/components/pages/ClienteHistorialVentasPage.tsx': '/src/features/clientes/pages/ClienteHistorialVentasPage.tsx',
  '/components/pages/ClienteHistorialDevolucionesPage.tsx': '/src/features/clientes/pages/ClienteHistorialDevolucionesPage.tsx',

  // INVENTARIO FEATURE
  '/components/pages/ComprasPage.tsx': '/src/features/inventario/pages/ComprasPage.tsx',
  '/components/pages/ComprasPageComplete.tsx': '/src/features/inventario/pages/ComprasPageComplete.tsx',
  '/components/pages/ProveedoresPage.tsx': '/src/features/inventario/pages/ProveedoresPage.tsx',
  '/components/pages/CategoriasPage.tsx': '/src/features/inventario/pages/CategoriasPage.tsx',
  '/components/pages/EntregaInsumosPage.tsx': '/src/features/inventario/pages/EntregaInsumosPage.tsx',
  '/components/pages/entrega-insumos/AgregarProductoDialog.tsx': '/src/features/inventario/components/entrega-insumos/AgregarProductoDialog.tsx',
  '/components/pages/entrega-insumos/DetalleEntregaDialog.tsx': '/src/features/inventario/components/entrega-insumos/DetalleEntregaDialog.tsx',
  '/components/pages/entrega-insumos/constants.ts': '/src/features/inventario/components/entrega-insumos/constants.ts',
  '/components/pages/entrega-insumos/utils.ts': '/src/features/inventario/components/entrega-insumos/utils.ts',

  // ADMINISTRACION FEATURE
  '/components/pages/AccessPage.tsx': '/src/features/administracion/pages/AccessPage.tsx',
  '/components/pages/RolesPage.tsx': '/src/features/administracion/pages/RolesPage.tsx',
  '/components/pages/RolesPageOptimized.tsx': '/src/features/administracion/pages/RolesPageOptimized.tsx',
  '/components/pages/RolesPageUpdated.tsx': '/src/features/administracion/pages/RolesPageUpdated.tsx',
  '/components/pages/UsersPage.tsx': '/src/features/administracion/pages/UsersPage.tsx',
  '/components/pages/UsersPageUpdated.tsx': '/src/features/administracion/pages/UsersPageUpdated.tsx',
  '/components/pages/BarberosPage.tsx': '/src/features/administracion/pages/BarberosPage.tsx',
  '/components/pages/users/UserDetailsDialog.tsx': '/src/features/administracion/components/users/UserDetailsDialog.tsx',
  '/components/pages/users/UserFormDialog.tsx': '/src/features/administracion/components/users/UserFormDialog.tsx',
  '/components/pages/barberos/BarberoDetailsDialog.tsx': '/src/features/administracion/components/barberos/BarberoDetailsDialog.tsx',
  '/components/pages/barberos/BarberoFormDialog.tsx': '/src/features/administracion/components/barberos/BarberoFormDialog.tsx',

  // HORARIOS FEATURE
  '/components/pages/HorariosPage.tsx': '/src/features/horarios/pages/HorariosPage.tsx',
  '/components/pages/HorariosPageWeekly.tsx': '/src/features/horarios/pages/HorariosPageWeekly.tsx',
  '/components/pages/ClienteHorariosPageCalendar.tsx': '/src/features/horarios/pages/ClienteHorariosPageCalendar.tsx',

  // PAQUETES FEATURE
  '/components/pages/PaquetesPage.tsx': '/src/features/paquetes/pages/PaquetesPage.tsx',
  '/components/pages/ClientePaquetesPage.tsx': '/src/features/paquetes/pages/ClientePaquetesPage.tsx',

  // SHARED - UI COMPONENTS
  '/components/ui/accordion.tsx': '/src/shared/components/ui/accordion.tsx',
  '/components/ui/alert-dialog.tsx': '/src/shared/components/ui/alert-dialog.tsx',
  '/components/ui/alert.tsx': '/src/shared/components/ui/alert.tsx',
  '/components/ui/aspect-ratio.tsx': '/src/shared/components/ui/aspect-ratio.tsx',
  '/components/ui/avatar.tsx': '/src/shared/components/ui/avatar.tsx',
  '/components/ui/badge.tsx': '/src/shared/components/ui/badge.tsx',
  '/components/ui/breadcrumb.tsx': '/src/shared/components/ui/breadcrumb.tsx',
  '/components/ui/button.tsx': '/src/shared/components/ui/button.tsx',
  '/components/ui/calendar.tsx': '/src/shared/components/ui/calendar.tsx',
  '/components/ui/card.tsx': '/src/shared/components/ui/card.tsx',
  '/components/ui/carousel.tsx': '/src/shared/components/ui/carousel.tsx',
  '/components/ui/chart.tsx': '/src/shared/components/ui/chart.tsx',
  '/components/ui/checkbox.tsx': '/src/shared/components/ui/checkbox.tsx',
  '/components/ui/collapsible.tsx': '/src/shared/components/ui/collapsible.tsx',
  '/components/ui/command.tsx': '/src/shared/components/ui/command.tsx',
  '/components/ui/confirmation-alert.tsx': '/src/shared/components/ui/confirmation-alert.tsx',
  '/components/ui/context-menu.tsx': '/src/shared/components/ui/context-menu.tsx',
  '/components/ui/custom-alert.tsx': '/src/shared/components/ui/custom-alert.tsx',
  '/components/ui/dialog.tsx': '/src/shared/components/ui/dialog.tsx',
  '/components/ui/double-confirmation.tsx': '/src/shared/components/ui/double-confirmation.tsx',
  '/components/ui/drawer.tsx': '/src/shared/components/ui/drawer.tsx',
  '/components/ui/dropdown-menu.tsx': '/src/shared/components/ui/dropdown-menu.tsx',
  '/components/ui/form.tsx': '/src/shared/components/ui/form.tsx',
  '/components/ui/hover-card.tsx': '/src/shared/components/ui/hover-card.tsx',
  '/components/ui/input-otp.tsx': '/src/shared/components/ui/input-otp.tsx',
  '/components/ui/input.tsx': '/src/shared/components/ui/input.tsx',
  '/components/ui/label.tsx': '/src/shared/components/ui/label.tsx',
  '/components/ui/menubar.tsx': '/src/shared/components/ui/menubar.tsx',
  '/components/ui/navigation-menu.tsx': '/src/shared/components/ui/navigation-menu.tsx',
  '/components/ui/pagination.tsx': '/src/shared/components/ui/pagination.tsx',
  '/components/ui/popover.tsx': '/src/shared/components/ui/popover.tsx',
  '/components/ui/progress.tsx': '/src/shared/components/ui/progress.tsx',
  '/components/ui/radio-group.tsx': '/src/shared/components/ui/radio-group.tsx',
  '/components/ui/resizable.tsx': '/src/shared/components/ui/resizable.tsx',
  '/components/ui/scroll-area.tsx': '/src/shared/components/ui/scroll-area.tsx',
  '/components/ui/select.tsx': '/src/shared/components/ui/select.tsx',
  '/components/ui/separator.tsx': '/src/shared/components/ui/separator.tsx',
  '/components/ui/sheet.tsx': '/src/shared/components/ui/sheet.tsx',
  '/components/ui/sidebar.tsx': '/src/shared/components/ui/sidebar.tsx',
  '/components/ui/skeleton.tsx': '/src/shared/components/ui/skeleton.tsx',
  '/components/ui/slider.tsx': '/src/shared/components/ui/slider.tsx',
  '/components/ui/switch.tsx': '/src/shared/components/ui/switch.tsx',
  '/components/ui/table.tsx': '/src/shared/components/ui/table.tsx',
  '/components/ui/tabs.tsx': '/src/shared/components/ui/tabs.tsx',
  '/components/ui/textarea.tsx': '/src/shared/components/ui/textarea.tsx',
  '/components/ui/toggle-group.tsx': '/src/shared/components/ui/toggle-group.tsx',
  '/components/ui/toggle.tsx': '/src/shared/components/ui/toggle.tsx',
  '/components/ui/tooltip.tsx': '/src/shared/components/ui/tooltip.tsx',
  '/components/ui/use-mobile.ts': '/src/shared/components/ui/use-mobile.ts',
  '/components/ui/utils.ts': '/src/shared/components/ui/utils.ts',

  // SHARED - FIGMA
  '/components/figma/ImageWithFallback.tsx': '/src/shared/components/figma/ImageWithFallback.tsx',

  // SHARED - CONTEXTS

  // SHARED - UTILS
  '/components/utils/themeColors.ts': '/src/shared/utils/themeColors.ts',
  '/components/utils/excelUtils.ts': '/src/shared/utils/excelUtils.ts',

  // SHARED - STYLES
  '/styles/globals.css': '/src/shared/styles/globals.css',

  // APP.TSX (permanece en src/)
  '/App.tsx': '/src/App.tsx',
};

// Función para crear directorios recursivamente
function ensureDirectoryExists(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExists(dirname);
  fs.mkdirSync(dirname);
}

// Función para mover archivos
function moveFile(oldPath, newPath) {
  const currentDir = process.cwd();
  const absoluteOldPath = path.join(currentDir, oldPath);
  const absoluteNewPath = path.join(currentDir, newPath);

  if (!fs.existsSync(absoluteOldPath)) {
    console.log(`⚠️  Archivo no encontrado: ${oldPath}`);
    return false;
  }

  ensureDirectoryExists(absoluteNewPath);
  
  try {
    fs.renameSync(absoluteOldPath, absoluteNewPath);
    console.log(`✅ Movido: ${oldPath} -> ${newPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error moviendo ${oldPath}:`, error.message);
    return false;
  }
}

// Función principal
function reorganizeProject() {
  console.log('🚀 Iniciando reorganización del proyecto...\n');

  let movedCount = 0;
  let errorCount = 0;

  Object.entries(fileMap).forEach(([oldPath, newPath]) => {
    const success = moveFile(oldPath, newPath);
    if (success) movedCount++;
    else errorCount++;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Archivos movidos exitosamente: ${movedCount}`);
  console.log(`❌ Errores: ${errorCount}`);
  console.log('='.repeat(50));
  console.log('\n📝 Ahora debes actualizar las importaciones en los archivos.');
  console.log('💡 VS Code puede ayudarte automáticamente con esto.');
}

// Ejecutar
reorganizeProject();
