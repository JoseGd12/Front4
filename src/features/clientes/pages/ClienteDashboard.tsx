import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  Calendar,
  DollarSign,
  RotateCcw,
  User,
  LogOut,
  Settings,
  Scissors,
  Package,
  AtSign,
  Search,
  X,
  ArrowRight
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../shared/components/ui/dropdown-menu";
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

export function ClienteDashboard({ onBackToLanding, initialItem }: { onBackToLanding?: () => void; initialItem?: any }) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [preSelectedReservation, setPreSelectedReservation] = useState<any>(initialItem || null);
  const [preSelectedProduct, setPreSelectedProduct] = useState<any>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const clientePathToBasePage = (pathname: string) => {
    const target = pathname.split('/dashboard/')[1] || '';
    if (target === '') return 'Mis Citas';
    if (target === 'compras') return 'Mis Compras';
    if (target === 'devoluciones') return 'Mis Devoluciones';
    if (target === 'servicios') return 'Servicios';
    if (target === 'productos') return 'Productos';
    if (target === 'cuenta') return 'Cuenta';
    return 'Mis Citas';
  };

  const clientePageToPath = (page: string) => {
    if (page === 'Mis Citas') return '';
    if (page === 'Mis Compras') return 'compras';
    if (page === 'Mis Devoluciones') return 'devoluciones';
    if (page === 'Servicios') return 'servicios';
    if (page === 'Productos') return 'productos';
    if (page === 'Cuenta') return 'cuenta';
    return '';
  };

  const activePage = clientePathToBasePage(location.pathname);

  const setActivePage = (page: string) => {
    const path = clientePageToPath(page);
    navigate(path ? `/dashboard/${path}` : '/dashboard');
  };

  const roleLabel = "Cliente";
  const displayGreetingName = String(user?.name || "Usuario").trim().split(" ")[0] || "Usuario";

  const handleLogout = async () => {
    sessionStorage.setItem("barbershop_post_logout_view", "landing");
    await logout();
  };

  const handleReservationRedirect = (item: any) => {
    setPreSelectedReservation(item);
    setActivePage("Mis Citas");
  };

  const handleProductReservation = (product: any) => {
    setPreSelectedProduct(product);
    setActivePage("Mis Citas");
  };

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;

    const buttonElement = (
      <button
        key={item.label}
        onClick={() => setActivePage(item.label)}
        className={`flex items-center gap-3 w-full text-left px-6 py-2 transition-colors cursor-pointer ${isActive ? "bg-orange-primary/10 text-orange-primary border-r-2 border-orange-primary" : "text-gray-lighter hover:bg-white/5"
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
                 preSelectedProduct={preSelectedProduct}
                 onClearPreSelectedProduct={() => setPreSelectedProduct(null)}
               />;
      case "Mis Compras":
        return <ClienteHistorialVentasPage />;
      case "Mis Devoluciones":
        return <ClienteHistorialDevolucionesPage />;
      case "Servicios":
        return <ClienteServiciosPage onSelectReservation={handleReservationRedirect} />;
      case "Productos":
        return <ClienteProductosPage onSelectProduct={handleProductReservation} />;
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
            backgroundColor: "#111111",
            boxShadow: "0px 0px 25px rgba(0,0,0,0.8)"
          }}
        >
          <div className="flex items-center w-full">
            <div className="w-72 shrink-0 px-4 flex items-center gap-3">
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="group relative p-2 rounded-md bg-muted border border-[#5D4037]/40 transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out flex items-center justify-center overflow-visible cursor-pointer"
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
                {onBackToLanding && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        to="/"
                        onClick={onBackToLanding}
                        className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors cursor-pointer"
                        title="Volver a la landing"
                      >
                        <ArrowRight className="w-5 h-5 text-orange-primary" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>Volver al inicio</p>
                    </TooltipContent>
                  </Tooltip>
                )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="w-10 h-10 rounded-full overflow-hidden border border-orange-primary/30 hover:border-orange-primary/60 hover:scale-105 transition-all duration-200 cursor-pointer"
                  title="Cuenta"
                  type="button"
                >
                  <ImageRenderer
                    url={user?.fotoPerfil}
                    className="w-full h-full object-cover rounded-full border-0 bg-transparent"
                    showLabel={false}
                    fallbackVariant="person"
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-gray-darkest border-gray-dark text-white-primary p-0 rounded-xl shadow-2xl"
              >
                <div className="px-4 pt-4 pb-3 text-center flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-orange-primary/40 mb-3">
                    <ImageRenderer
                      url={user?.fotoPerfil}
                      className="w-full h-full object-cover"
                      showLabel={false}
                      fallbackVariant="person"
                    />
                  </div>
                  <p className="text-lg font-semibold text-white-primary">¡Hola, {displayGreetingName}!</p>
                  <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-primary text-black-primary">
                    {roleLabel}
                  </span>
                  {user?.email ? (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-lighter">
                      <AtSign className="w-4 h-4 text-gray-lighter shrink-0" />
                      <p className="truncate">{user.email}</p>
                    </div>
                  ) : null}
                </div>
                <DropdownMenuSeparator className="bg-gray-dark -mx-0 my-0" />
                <div className="p-2">
                  <DropdownMenuItem
                    onSelect={() => setActivePage("Cuenta")}
                    className="cursor-pointer text-gray-lightest focus:bg-gray-darker focus:text-white-primary rounded-lg"
                  >
                    <Settings className="w-4 h-4 text-orange-primary" />
                    Ajustes
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => void handleLogout()}
                    className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-lg"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`border-r border-gray-dark flex flex-col transition-[width] duration-200 ease-out will-change-[width] shrink-0 z-[90] relative ${sidebarCollapsed ? "w-20" : "w-72"}`}
            style={{
              backgroundColor: "#111111",
              boxShadow: "0px 0px 25px rgba(0,0,0,0.8)"
            }}
          >
            {/* Navigation */}
            <nav className="flex-1 py-6 overflow-y-auto space-y-1">
              {navItems.map((item) => renderNavItem(item, activePage === item.label))}
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


      </div>
    </TooltipProvider>
  );
}
