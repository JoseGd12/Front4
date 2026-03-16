import { useState } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  Calendar,
  DollarSign,
  RotateCcw,
  User,
  LogOut,
  Sun,
  Moon,
  Eye,
  Scissors,
  Package,
  Search,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import { BarberPole } from "../../../shared/components/ui/BarberPole";
import manitoLogo from "../../../assets/Manito.jpeg";
const LOGO_URL = manitoLogo;
import { ClienteMisCitasPageCalendar } from "./ClienteMisCitasPageCalendar";
import { ClienteHistorialVentasPage } from "./ClienteHistorialVentasPage";
import { ClienteHistorialDevolucionesPage } from "./ClienteHistorialDevolucionesPage";
import { ClienteServiciosPage } from "../../servicios/pages/ClienteServiciosPage";
import { ClientePerfilPage } from "./ClientePerfilPage";
import { ClienteProductosPage } from "./ClienteProductosPage";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { ModuleSubNav } from "../../../shared/components/ui/module-sub-nav";
import { Input } from "../../../shared/components/ui/input";

// Navegación para clientes - Sin agrupaciones
const navItems = [
  { icon: Calendar, label: "Mis Citas" },
  { icon: Scissors, label: "Servicios" },
  { icon: Package, label: "Productos" },
  { icon: DollarSign, label: "Mis Compras" },
  { icon: RotateCcw, label: "Mis Devoluciones" },
  { icon: User, label: "Cuenta" },
];

export function ClienteDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activePage, setActivePage] = useState("Mis Citas");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);
  const [preSelectedReservation, setPreSelectedReservation] = useState<any>(null);
  const [sidebarSearch, setSidebarSearch] = useState("");

  const normalizedSidebarSearch = sidebarSearch
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const filteredNavItems = normalizedSidebarSearch
    ? navItems.filter((item) =>
        item.label
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .includes(normalizedSidebarSearch)
      )
    : navItems;

  const handleReservationRedirect = (item: any) => {
    setPreSelectedReservation(item);
    setActivePage("Mis Citas");
  };

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;

    const buttonElement = (
      <button
        key={item.label}
        onClick={() => setActivePage(item.label)}
        className={`flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-orange-primary/10 text-orange-primary" : "text-gray-lighter hover:bg-white/5"
          } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
        title={item.label}
      >
        <Icon className={`w-5 h-5 ${isActive ? "text-orange-primary" : "text-gray-lighter"}`} />
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
      case "Mis Citas":
        return <ClienteMisCitasPageCalendar 
                 initialItem={preSelectedReservation} 
                 onClearInitialItem={() => setPreSelectedReservation(null)} 
               />;
      case "Mis Compras":
        return <ClienteHistorialVentasPage />;
      case "Mis Devoluciones":
        return <ClienteHistorialDevolucionesPage />;
      case "Servicios":
        return <ClienteServiciosPage onSelectReservation={handleReservationRedirect} />;
      case "Productos":
        return <ClienteProductosPage />;
      case "Cuenta":
        return <ClientePerfilPage />;
      default:
        return <ClienteMisCitasPageCalendar />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-black-primary" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Barra Superior */}
        <header
          className="border-b border-gray-dark py-4 flex items-center transition-colors z-[100] relative"
          style={{
            backgroundColor: theme === 'dark' ? '#111111' : '#c9b7a3',
            boxShadow: theme === 'dark' ? '0px 0px 25px rgba(0,0,0,0.8)' : '0px 0px 25px rgba(0,0,0,0.35)'
          }}
        >
          <div className="flex items-center w-full">
            <div className="w-72 shrink-0 px-4 flex items-center gap-3">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="group relative p-2 rounded-md bg-muted border border-[#5D4037]/40 transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out flex items-center justify-center overflow-visible"
                    style={{ boxShadow: 'none' }}
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
                  >
                    <div className="transition-transform duration-150 ease-out group-hover:scale-110">
                      <BarberPole />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-gray-darkest border-gray-dark text-white-primary">
                  <p>{sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}</p>
                </TooltipContent>
              </Tooltip>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-lighter" />
                <Input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Buscar módulo..."
                  className="elegante-input pl-10 w-full"
                />
                {sidebarSearch && (
                  <button
                    type="button"
                    onClick={() => setSidebarSearch("")}
                    title="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 px-6 lg:px-8 flex items-center justify-between gap-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center elegante-shadow-lg relative overflow-hidden shrink-0">
                  <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-white-primary truncate">MANITO BARBERSHOP</h1>
                  <p className="text-xs text-gray-lighter font-medium truncate">Panel de Clientes</p>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
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
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-darkest border border-gray-dark">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-orange-primary/30 flex items-center justify-center bg-orange-primary/10">
                <ImageRenderer 
                  url={user?.fotoPerfil} 
                  className="w-full h-full object-cover"
                  showLabel={false}
                  fallbackVariant="person"
                />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold text-white-primary">{user?.name || "Usuario"}</p>
                <p className="text-xs text-gray-lighter">Cliente</p>
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
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`border-r border-gray-dark flex flex-col transition-[width] duration-200 ease-out will-change-[width] shrink-0 z-[90] relative ${sidebarCollapsed ? "w-20" : "w-72"}`}
            style={{
              backgroundColor: theme === 'dark' ? '#111111' : '#c9b7a3',
              boxShadow: theme === 'dark' ? '0px 0px 25px rgba(0,0,0,0.8)' : '0px 0px 25px rgba(0,0,0,0.35)'
            }}
          >
            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 overflow-y-auto space-y-1">
              {filteredNavItems.map((item) => renderNavItem(item, activePage === item.label))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ModuleSubNav
              title={activePage}
              icon={(() => {
                const match = navItems.find((n) => n.label === activePage);
                if (!match?.icon) return undefined;
                const Icon = match.icon;
                return <Icon className="w-5 h-5 text-orange-primary" />;
              })()}
            />
            <div className="module-content flex-1 overflow-y-auto px-6 lg:px-8 pt-4 pb-6">
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
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary/30 flex items-center justify-center bg-orange-primary/10">
                    <ImageRenderer 
                      url={user.fotoPerfil} 
                      className="w-full h-full object-cover"
                      showLabel={false}
                      fallbackVariant="person"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white-primary">{user.name}</h3>
                    <p className="text-sm text-gray-lighter">{user.email || "No especificado"}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-primary text-black-primary">
                      Cliente
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
