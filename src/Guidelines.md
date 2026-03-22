# Edwin's Barbería - Sistema de Gestión

## Roles y Autenticación

### Cuentas de Usuario
El sistema maneja dos tipos de roles con interfaces completamente diferentes:

#### Administradores
- **Email**: admin@edwinsbarberia.com, sofia@edwinsbarberia.com
- **Contraseña**: admin123
- **Acceso**: Panel completo de administración con gestión de ventas, inventario, citas, clientes, usuarios y configuración

#### Clientes  
- **Email**: juan.perez@email.com, maria.gomez@email.com
- **Contraseña**: cliente123
- **Acceso**: Portal del cliente con reserva de citas, visualización de servicios, productos y historial personal

### Diferencias por Rol

#### Vista de Administrador
- **Dashboard completo** con métricas de negocio, ventas diarias, inventario bajo
- **Gestión de citas** con vista de todos los clientes y barberos
- **Control de inventario** con productos, proveedores, compras
- **Módulo de ventas** con facturación, métodos de pago, reportes
- **Administración de usuarios** y roles del sistema
- **Configuración** de servicios, horarios, precios

#### Vista de Cliente
- **Panel personal** con información de contacto y historial
- **Reserva de citas** solo para el cliente autenticado
- **Historial personal** de compras y devoluciones
- **Sin acceso** a datos administrativos o de otros clientes
- **Sin acceso** a módulos de Servicios y Paquetes

## Esquema de Colores

El sistema usa un único modo de visualización: **Modo Oscuro**.

### Paleta Base
- **Negro Primario**: #000000 - Fondo principal
- **Grises**: #1a1a1a a #aaaaaa - Jerarquía de contenido
- **Naranja Cobrizo**: #E3931C, #F5A642 - Elementos de acción y énfasis
- **Blanco**: #FFFFFF - Texto principal

### Tema Único (Oscuro)
- El proyecto usa únicamente paleta oscura con acentos dorados.
- No existe toggle de tema ni persistencia de preferencia de modo claro/oscuro.
- El atributo `data-theme` se fija en `dark` al iniciar la app.

### Uso de Colores en el Código

**Variables CSS (Recomendado):**
```css
/* Usar variables CSS que se adaptan automáticamente */
color: var(--color-orange-primary);
background-color: var(--color-orange-primary);
border-color: var(--color-orange-primary);
```

**Clases de Utilidad:**
```tsx
className="text-orange-primary bg-orange-primary border-orange-primary"
className="theme-primary-color theme-primary-bg theme-primary-border"
```

**JavaScript/TypeScript (para gráficos, PDFs, etc.):**
```tsx
import { useThemeColors } from '../utils/themeColors';

function MyComponent() {
  const colors = useThemeColors(); // Retorna la paleta oscura fija
  
  return (
    <BarChart>
      <Bar fill={colors.primary} />
    </BarChart>
  );
}
```

**Importante:** 
- ✅ Usar `colors.primary`, `colors.gold`, `colors.accent` del hook `useThemeColors()`
- ✅ Usar variables CSS: `var(--color-orange-primary)` 
- ✅ Usar clases de utilidad: `text-orange-primary`, `bg-orange-primary`
- ❌ NO usar colores hardcodeados: `#E3931C`, `#FFD700`, etc.

**Colores que se mantienen fijos:**
- Estados de éxito (verde): `#22C55E`, `#10B981`
- Estados de error (rojo): `#EF4444`, `#DC2626`, `#C62828`
- Estados de advertencia (amarillo): `#F59E0B`
- Estados de info (azul): `#3B82F6`, `#2563eb`

### Aplicación por Componente

**Diseño actual:**
- **Botones primarios**: Fondo naranja cobrizo (#E3931C) con texto negro
- **Botones secundarios**: Borde naranja con fondo transparente
- **Cards**: Fondo gris oscuro (#1a1a1a) con bordes grises
- **Navegación activa**: Borde naranja con fondo gris
- **Estados de éxito**: Verde para completado
- **Estados de advertencia**: Naranja para pendiente
- **Estados de error**: Rojo para cancelado/error

## Componentes Específicos

### .elegante-card
- **Padding**: 1.5rem
- **Border-radius**: 0.75rem
- **Background**: #1a1a1a
- **Border**: 1px solid #3a3a3a
- **Shadow**: rgba(0, 0, 0, 0.5) 0px 4px 12px

### .elegante-button-primary
- **Background**: #FFD700
- **Color**: #000000
- **Padding**: 0.75rem 1.5rem
- **Font-weight**: 600
- **Hover**: Glow dorado

### .elegante-button-secondary
- **Border**: 1px solid #FFD700
- **Color**: #FFD700
- **Background**: transparent
- **Hover**: Background dorado transparente

## Navegación

### Administrador
- **Principales**: Dashboard, Agendamiento, Servicios, Productos
- **Operaciones**: Ventas, Clientes, Horarios, Paquetes  
- **Inventario**: Compras, Proveedores, Categorías, Entrega Insumos
- **Administración**: Acceso, Roles, Usuarios

### Cliente
- **Navegación simplificada**: Mis Citas, Agendar Cita, Mis Compras, Mis Devoluciones
- **Sin acceso** a funciones administrativas, Servicios o Paquetes
- **Enfoque** en autoservicio y experiencia personal

## Estados y Feedback

### Estados de Citas
- **Pendiente**: Fondo naranja (#f97316)
- **Confirmada**: Fondo dorado (#FFD700)
- **En Curso**: Fondo verde (#16a34a)
- **Completada**: Fondo azul (#2563eb)
- **Cancelada**: Fondo rojo (#dc2626)

### Métodos de Pago
- **Efectivo**: Color verde (#22c55e)
- **Tarjeta**: Color azul (#3b82f6)
- **Transferencia**: Color púrpura (#a855f7)

## Responsive Design

### Breakpoints
- **Mobile**: < 768px - Navegación colapsada
- **Tablet**: 768px - 1024px - Sidebar adaptativo
- **Desktop**: > 1024px - Layout completo

### Adaptaciones
- **Tablas**: Scroll horizontal en móvil
- **Cards**: Stack vertical en pantallas pequeñas
- **Sidebar**: Overlay en móvil, fijo en desktop
- **Formularios**: Campos stack en móvil, grid en desktop