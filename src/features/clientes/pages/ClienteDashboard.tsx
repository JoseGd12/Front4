import { useState } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useTheme } from "../../../shared/contexts/ThemeContext";
import {
  Calendar,
  DollarSign,
  RotateCcw,
  User,
  LogOut,
  Menu,
  Sun,
  Moon,
  Eye,
  Scissors,
  Package
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import manitoLogo from "../../../assets/Manito.jpeg";
const LOGO_URL = manitoLogo;
import { ClienteMisCitasPageCalendar } from "./ClienteMisCitasPageCalendar";
import { ClienteHistorialVentasPage } from "./ClienteHistorialVentasPage";
import { ClienteHistorialDevolucionesPage } from "./ClienteHistorialDevolucionesPage";
import { ClienteServiciosPage } from "../../servicios/pages/ClienteServiciosPage";
import { ClientePerfilPage } from "./ClientePerfilPage";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

// Navegación para clientes - Sin agrupaciones
const navItems = [
  { icon: Calendar, label: "Mis Citas" },
  { icon: Scissors, label: "Servicios" },
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
        <header className="bg-black-primary border-b border-gray-dark px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
              title={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
            >
              <Menu className="w-5 h-5 text-orange-primary" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center elegante-shadow-lg relative overflow-hidden">
                <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white-primary">MANITO BARBERSHOP</h1>
                <p className="text-xs text-gray-lighter font-medium">Panel de Clientes</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
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
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`bg-black-primary border-r border-gray-dark flex flex-col transition-all duration-300 ${sidebarCollapsed ? "w-20" : "w-72"
              }`}
          >
            {/* Navigation */}
            <nav className={`flex-1 px-3 py-6 overflow-y-auto ${sidebarCollapsed ? "space-y-2" : "space-y-2"}`}>
              {navItems.map((item) => renderNavItem(item, activePage === item.label))}
            </nav>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderContent()}
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
