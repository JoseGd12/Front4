import React, { useState, useEffect } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { authSyncService } from "../../auth/services/authSyncService";
import { rolesApiService } from "../../administracion/services/rolesApiService";
import { modulosService } from "../../administracion/services/modulosService";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import { BarberPole } from "../../../shared/components/ui/BarberPole";
import {
  Calendar,
  Scissors,
  Package,
  Users,
  DollarSign,
  Clock,
  Gift,
  ShoppingCart,
  Truck,
  Tags,
  FileText,
  Shield,
  User,
  LogOut,
  Menu,
  RotateCcw,
  Sun,
  Moon,
  LayoutGrid,
  Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import logo from "../assets/a51cd14e3664f3752eaa436dadb14492d91e40aa.png";
import { DashboardPage } from "../pages/DashboardPage";
import { AgendamientoPage } from "../../agendamiento/pages/AgendamientoPage";
import { ServiciosPage } from "../../servicios/pages/ServiciosPage";
import { BarberosPage } from "../../administracion/pages/BarberosPage";
import { ProductosPage } from "../../productos/pages/ProductosPage";
import { VentasPage } from "../../ventas/pages/VentasPage";
import { ClientesPage } from "../../clientes/pages/ClientesPage";
import { HorariosPage } from "../../horarios/pages/HorariosPage";
import { PaquetesPage } from "../../paquetes/pages/PaquetesPage";
import { ComprasPage } from "../../inventario/pages/ComprasPage";
import { ProveedoresPage } from "../../inventario/pages/ProveedoresPage";
import { CategoriasPage } from "../../inventario/pages/CategoriasPage";
import { EntregaInsumosPage } from "../../inventario/pages/EntregaInsumosPage";
import { DevolucionesPage } from "../../ventas/pages/DevolucionesPage";
import { RolesPage } from "../../administracion/pages/RolesPage";
import { UsersPage } from "../../administracion/pages/UsersPage";
import manitoLogo from "../../../assets/Manito.jpeg";

// Información de cada módulo para el título dinámico
const moduleInfo: Record<string, {
  title: string;
  description: string;
  icon: any;
  color: string;
}> = {
  "Dashboard": {
    title: "Panel Principal",
    description: "Vista general del sistema",
    icon: LayoutGrid,
    color: "text-orange-primary"
  },
  "Ventas": {
    title: "Gestión de Ventas",
    description: "Procesamiento y seguimiento de ventas",
    icon: DollarSign,
    color: "text-green-400"
  },
  "Compras": {
    title: "Gestión de Compras",
    description: "Administración de compras y proveedores",
    icon: ShoppingCart,
    color: "text-blue-400"
  },
  "Devoluciones": {
    title: "Devoluciones",
    description: "Gestión de devoluciones y reembolsos",
    icon: RotateCcw,
    color: "text-yellow-400"
  },
  "Proveedores": {
    title: "Proveedores",
    description: "Administración de proveedores",
    icon: Truck,
    color: "text-purple-400"
  },
  "Agendamientos": {
    title: "Agendamiento",
    description: "Gestión de citas y reservas",
    icon: Calendar,
    color: "text-blue-400"
  },
  "Horarios": {
    title: "Horarios",
    description: "Configuración de horarios de trabajo",
    icon: Clock,
    color: "text-cyan-400"
  },
  "Barberos": {
    title: "Barberos",
    description: "Gestión del personal y barberos",
    icon: Users,
    color: "text-pink-400"
  },
  "Servicios": {
    title: "Servicios",
    description: "Catálogo de servicios de la barbería",
    icon: Scissors,
    color: "text-purple-400"
  },
  "Categorías": {
    title: "Categorías",
    description: "Organización de productos y servicios",
    icon: Tags,
    color: "text-indigo-400"
  },
  "Paquetes": {
    title: "Paquetes",
    description: "Paquetes promocionales",
    icon: Gift,
    color: "text-red-400"
  },
  "Productos": {
    title: "Productos",
    description: "Inventario y gestión de productos",
    icon: Package,
    color: "text-green-400"
  },
  "Entregas de Insumos": {
    title: "Entregas de Insumos",
    description: "Control de entregas de materiales",
    icon: FileText,
    color: "text-amber-400"
  },
  "Clientes": {
    title: "Clientes",
    description: "Base de datos de clientes",
    icon: Users,
    color: "text-pink-400"
  },
  "Usuarios": {
    title: "Usuarios",
    description: "Gestión de usuarios del sistema",
    icon: User,
    color: "text-indigo-400"
  },
  "Roles": {
    title: "Roles y Permisos",
    description: "Configuración de roles por módulos",
    icon: Shield,
    color: "text-orange-400"
  }
};

const menuSections = [
  {
    title: "Agenda",
    items: [
      { icon: Calendar, label: "Agendamientos" },
      { icon: Clock, label: "Horarios" },
      { icon: Users, label: "Barberos" },
    ],
  },
  {
    title: "Ventas",
    items: [
      { icon: DollarSign, label: "Ventas" },
      { icon: Scissors, label: "Servicios" },
      { icon: Gift, label: "Paquetes" },
      { icon: RotateCcw, label: "Devoluciones" },
      { icon: Users, label: "Clientes" },
    ],
  },
  {
    title: "Compras",
    items: [
      { icon: ShoppingCart, label: "Compras" },
      { icon: Package, label: "Productos" },
      { icon: Tags, label: "Categorías" },
      { icon: Truck, label: "Proveedores" },
      { icon: FileText, label: "Entregas de Insumos" },
    ],
  },
  {
    title: "Configuración",
    items: [
      { icon: User, label: "Usuarios" },
      { icon: Shield, label: "Roles" },
    ],
  },
];

// Lista de todos los labels del menú para fallback cuando la API de módulos falla
const ALL_MENU_LABELS = menuSections.flatMap((s) => s.items.map((i) => i.label));

export function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);

  const [allowedModules, setAllowedModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  useEffect(() => {
    const fetchModules = async () => {
      if (!user) {
        setLoadingModules(false);
        return;
      }
      try {
        setLoadingModules(true);
        const rolId = authSyncService.getRolId(user.role);

        // Obtener permisos del rol y todos los módulos concurrentemente
        const [rolePerms, allModules] = await Promise.all([
          rolesApiService.getRoleModules(rolId),
          modulosService.getModulos()
        ]);

        // IDs de módulos que el rol puede ver
        const validModuleIds = rolePerms
          .filter(rm => rm.puedeVer)
          .map(rm => rm.moduloId.toString());

        // Mapear de validModuleIds a los nombres de módulo
        const allowedNames = allModules
          .filter(m => validModuleIds.includes(m.id.toString()))
          .map(m => m.nombre);

        setAllowedModules(allowedNames.length > 0 ? allowedNames : getFallbackModulesForRole(user.role));
      } catch (error) {
        console.error("Error fetching role modules:", error);
        // Si la API falla (ej. 500), mostrar todos los módulos a admin/super_admin para que pueda usar el sistema
        setAllowedModules(getFallbackModulesForRole(user.role));
      } finally {
        setLoadingModules(false);
      }
    };

    fetchModules();
  }, [user]);

  function getFallbackModulesForRole(role: string | undefined): string[] {
    const r = (role || "").toLowerCase();
    if (r === "super_admin" || r === "super administrador" || r === "admin" || r === "administrador" || r === "gerente") {
      return ALL_MENU_LABELS;
    }
    if (r === "barbero" || r === "recepcionista" || r === "cajero") {
      return ["Agendamientos", "Horarios", "Barberos", "Ventas", "Servicios", "Paquetes", "Devoluciones", "Clientes", "Compras", "Productos", "Categorías", "Proveedores", "Entregas de Insumos"];
    }
    return ["Agendamientos", "Horarios", "Servicios", "Paquetes", "Clientes"];
  }

  // Filtrar las secciones del menú basado en los módulos permitidos
  const checkModuleAccess = (itemLabel: string) => {
    if (itemLabel === "Dashboard") return true;

    // Ajustes específicos y términos de búsqueda comunes por si la BD guarda el nombre diferente al label en UI
    const searchTerms = [itemLabel.toLowerCase().trim()];

    if (itemLabel === 'Horarios') searchTerms.push('horario');
    if (itemLabel === 'Agendamientos') searchTerms.push('agendamiento', 'agenda', 'citas');
    if (itemLabel === 'Barberos') searchTerms.push('barbero', 'empleado');
    if (itemLabel === 'Servicios') searchTerms.push('servicio');
    if (itemLabel === 'Paquetes') searchTerms.push('paquete');
    if (itemLabel === 'Ventas') searchTerms.push('venta');
    if (itemLabel === 'Devoluciones') searchTerms.push('devolucion');
    if (itemLabel === 'Clientes') searchTerms.push('cliente');
    if (itemLabel === 'Compras') searchTerms.push('compra');
    if (itemLabel === 'Productos') searchTerms.push('producto', 'inventario');
    if (itemLabel === 'Categorías') searchTerms.push('categoria');
    if (itemLabel === 'Proveedores') searchTerms.push('proveedor');
    if (itemLabel === 'Entregas de Insumos') searchTerms.push('entrega', 'insumo');
    if (itemLabel === 'Usuarios') searchTerms.push('usuario');
    if (itemLabel === 'Roles') searchTerms.push('rol', 'permiso');
    if (itemLabel === 'Configuración') searchTerms.push('config', 'ajuste');

    return allowedModules.some(mod => {
      const modNormalizado = mod.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return searchTerms.some(term => {
        const termNormalizado = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return modNormalizado === termNormalizado || modNormalizado.includes(termNormalizado) || termNormalizado.includes(modNormalizado);
      });
    });
  };

  const filteredMenuSections = menuSections.map(section => {
    return {
      ...section,
      items: section.items.filter(item => {
        // Filtro adicional: Solo el 'super_admin' puede ver el módulo de Roles
        if (item.label === "Roles" && user?.role !== 'super_admin') {
          return false;
        }
        return checkModuleAccess(item.label);
      })
    };
  }).filter(section => section.items.length > 0);

  const renderNavItem = (item: any) => {
    const Icon = item.icon;
    const targetPage = item.page ?? item.label;
    const isActive = activePage === targetPage;

    const buttonElement = (
      <button
        key={item.label}
        onClick={() => {
          setActivePage(targetPage);
        }}
        className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-orange-primary/10 text-orange-primary" : "text-gray-lighter hover:bg-white/5"
          } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
        title={item.label}
      >
        <Icon className={`w-4 h-4 ${isActive ? "text-orange-primary" : "text-gray-lighter"}`} />
        {!sidebarCollapsed && <span>{item.label}</span>}
      </button>
    );

    // Si el sidebar está colapsado, envolvemos el botón con un Tooltip
    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.label} delayDuration={0}>
          <TooltipTrigger asChild>
            {buttonElement}
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-gray-darkest border-gray-dark text-white-primary">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return buttonElement;
  };

  const renderContent = () => {
    switch (activePage) {
      case "Dashboard":
        return <DashboardPage />;
      case "Agendamientos":
        return <AgendamientoPage />;
      case "Horarios":
        return <HorariosPage />;
      case "Barberos":
        return <BarberosPage />;
      case "Entregas de Insumos":
        return <EntregaInsumosPage />;
      case "Servicios":
        return <ServiciosPage />;
      case "Paquetes":
        return <PaquetesPage />;
      case "Ventas":
        return <VentasPage />;
      case "Compras":
        return <ComprasPage />;
      case "Devoluciones":
        return <DevolucionesPage />;
      case "Proveedores":
        return <ProveedoresPage />;
      case "Productos":
        return <ProductosPage />;
      case "Categorías":
        return <CategoriasPage />;
      case "Clientes":
        return <ClientesPage />;
      case "Usuarios":
        return <UsersPage />;
      case "Roles":
        return <RolesPage />;
      default:
        return <DashboardPage />;
    }
  };

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(filteredMenuSections.map(section => [section.title, false]))
  );

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-black-primary" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Barra Superior */}
        <header
          className="border-b border-gray-dark px-6 lg:px-8 py-4 flex items-center gap-6 transition-colors z-[100] relative"
          style={{
            backgroundColor: theme === 'dark' ? '#111111' : '#c9b7a3',
            boxShadow: theme === 'dark' ? '0px 0px 25px rgba(0,0,0,0.8)' : '0px 0px 25px rgba(0,0,0,0.35)'
          }}
        >
          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="group relative p-2 rounded-md bg-muted border border-[#5D4037]/40 transition-all duration-300 flex items-center justify-center overflow-visible"
              style={{
                boxShadow: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(174, 120, 14, 0.81), 0 4px 8px rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(244, 194, 69, 0.6)';
                e.currentTarget.style.backgroundColor = 'rgba(145, 129, 112, 0.98)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(93, 64, 55, 0.4)';
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
            >
              <div className="transition-all duration-300 group-hover:scale-110">
                <BarberPole />
              </div>
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center elegante-shadow-lg relative overflow-hidden">
                <img src={manitoLogo} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white-primary">MANITO BARBERSHOP</h1>
                <p className="text-xs text-gray-lighter font-medium">Sistema de Gestión</p>
              </div>
            </div>
          </div>

          {/* Título dinámico del módulo */}
          <div className="flex-1 flex items-center justify-center text-center px-4">
            {moduleInfo[activePage] && (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gray-darkest flex items-center justify-center ${moduleInfo[activePage].color}`}>
                  {React.createElement(moduleInfo[activePage].icon, { className: "w-5 h-5" })}
                </div>
                <div className="text-left">
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-lightest/70">Módulo actual</p>
                  <h2 className="text-xl font-semibold text-white-primary leading-tight">{moduleInfo[activePage].title}</h2>
                  <p className="text-xs text-gray-lightest/80">{moduleInfo[activePage].description}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
              title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-orange-primary" />
              ) : (
                <Moon className="w-5 h-5 text-orange-primary" />
              )}
            </button>

            {/* Información del Usuario */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-darkest border border-gray-dark">
              <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-gray-dark">
                <ImageRenderer 
                  url={user?.fotoPerfil} 
                  className="w-full h-full object-cover" 
                  alt={user?.name}
                />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white-primary">{user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-lighter">
                  {user?.role === 'super_admin' ? 'Super Administrador' : user?.role === 'admin' ? 'Administrador' : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Usuario'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsUserDetailOpen(true)}
              className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
              title="Ver detalles del usuario"
            >
              <Eye className="w-5 h-5 text-orange-primary" />
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-5 h-5 text-orange-primary" />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <aside
            className={`border-r border-gray-dark flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-72"} z-[90] relative`}
            style={{
              backgroundColor: theme === 'dark' ? '#111111' : '#c9b7a3',
              boxShadow: theme === 'dark' ? '0px 0px 25px rgba(0,0,0,0.8)' : '0px 0px 25px rgba(0,0,0,0.35)'
            }}
          >
            <div className={`px-4 py-5 ${sidebarCollapsed ? "flex justify-center" : "flex items-center gap-3"}`}>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-white-primary font-semibold text-lg mt-5 leading-tight">Panel Principal</p>
                  <p className="text-sm mt-5 mb-4 text-gray-lighter">Accesos directos</p>
                </div>
              )}
            </div>
            <nav className={`flex-1 overflow-y-auto px-3 mt-5 pb-6 ${sidebarCollapsed ? "space-y-2" : "space-y-6"}`}>
              {sidebarCollapsed ? (
                <div className="space-y-1">
                  {/* Dashboard independiente */}
                  {renderNavItem({ icon: LayoutGrid, label: "Dashboard", page: "Dashboard" })}
                  {/* Otros módulos filtrados */}
                  {filteredMenuSections.flatMap(section => section.items).map(renderNavItem)}
                </div>
              ) : (
                <>
                  {/* Dashboard como elemento independiente */}
                  <div className="space-y-1">
                    {renderNavItem({ icon: LayoutGrid, label: "Dashboard", page: "Dashboard" })}
                  </div>
                  {/* Secciones desplegables filtradas */}
                  {filteredMenuSections.map(section => {
                    const isCollapsed = collapsedSections[section.title];
                    return (
                      <div key={section.title} className="space-y-2">
                        <button
                          onClick={() => toggleSection(section.title)}
                          className="w-full flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-gray-lightest/80 px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
                          aria-expanded={!isCollapsed}
                        >
                          <span>{section.title}</span>
                          <span className="text-xs">
                            {isCollapsed ? "+" : "–"}
                          </span>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${isCollapsed
                            ? "max-h-0 opacity-0 pointer-events-none"
                            : "max-h-96 opacity-100"
                            } space-y-1 pl-1`}
                        >
                          {!isCollapsed && section.items.map(renderNavItem)}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </nav>
          </aside>
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="module-content flex-1 overflow-y-auto px-6 lg:px-8 py-6">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Dialog de Detalles del Usuario */}
        <Dialog open={isUserDetailOpen} onOpenChange={setIsUserDetailOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white-primary">Detalles del Usuario</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información del usuario actual
              </DialogDescription>
            </DialogHeader>
            {user && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4 p-4 bg-gray-darker rounded-lg border border-gray-dark">
                  <div className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-gray-dark">
                    <ImageRenderer 
                      url={user.fotoPerfil} 
                      className="w-full h-full object-cover" 
                      alt={user.name}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white-primary">{user.name}</h3>
                    <p className="text-sm text-gray-lighter">{user.email || "No especificado"}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-primary text-black-primary">
                      {user?.role === 'super_admin' ? 'Super Administrador' : user?.role === 'admin' ? 'Administrador' : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Usuario'}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-lighter mb-1">Nombre completo</p>
                    <p className="text-sm text-white-primary">{user.name}</p>
                  </div>
                  {user.email && (
                    <div>
                      <p className="text-xs text-gray-lighter mb-1">Correo electrónico</p>
                      <p className="text-sm text-white-primary">{user.email}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
