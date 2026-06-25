import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useIsMobile } from "../../../shared/hooks/useIsMobile";
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
  ArrowRight,
  Menu,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "../../../shared/components/ui/dropdown-menu";
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
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [preSelectedReservation, setPreSelectedReservation] = useState<any>(initialItem || null);
  const [preSelectedProduct, setPreSelectedProduct] = useState<any>(null);
  const [autoOpenPerfilEdit, setAutoOpenPerfilEdit] = useState(false);

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
    if (isMobile) setMobileDrawerOpen(false);
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
        className={`flex items-center gap-3 w-full text-left px-6 py-2 transition-colors cursor-pointer ${
          isActive
            ? "bg-orange-primary/10 text-orange-primary border-r-2 border-orange-primary"
            : "text-gray-lighter hover:bg-white/5"
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
                 onGoToPerfil={() => { setAutoOpenPerfilEdit(true); setActivePage("Cuenta"); }}
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
        return <ClientePerfilPage autoOpenEdit={autoOpenPerfilEdit} onAutoOpenEditDone={() => setAutoOpenPerfilEdit(false)} />;
      default:
        return <ClienteMisCitasPageCalendar onGoToPerfil={() => { setAutoOpenPerfilEdit(true); setActivePage("Cuenta"); }} />;
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
            {isMobile && (
              <div className="px-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                  className="sidebar-toggle-btn"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--black-secondary)',
                    border: '1px solid var(--gray-dark)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
                  }}
                >
                  <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
                    <defs>
                      <mask id="bar-mask-cliente-mobile-1"><rect x="0" y="0" width="20" height="4.5" rx="2.25" fill="white" /></mask>
                      <mask id="bar-mask-cliente-mobile-2"><rect x="0" y="9.5" width="20" height="4.5" rx="2.25" fill="white" /></mask>
                    </defs>
                    {[
                      { mask: 'url(#bar-mask-cliente-mobile-1)', y: 0 },
                      { mask: 'url(#bar-mask-cliente-mobile-2)', y: 9.5 },
                    ].map((bar, i) => (
                      <g key={i} mask={bar.mask}>
                        <rect x="0" y={bar.y} width="20" height="4.5" rx="2.25" fill="#E3C6A5" />
                        <g className="barber-bar-stripes">
                          {[...Array(10)].map((_, j) => (
                            <rect
                              key={j}
                              x={j * 9 - 18}
                              y={bar.y - 4}
                              width="2.2"
                              height="13"
                              fill="#A06C31"
                              transform={`rotate(-35 ${j * 9 - 18 + 1.1} ${bar.y + 2.25})`}
                            />
                          ))}
                        </g>
                      </g>
                    ))}
                  </svg>
                </button>
              </div>
            )}

            <div className="flex-1 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-6 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center elegante-shadow-lg relative overflow-hidden shrink-0">
                  <img src={LOGO_URL} alt="Manito Barbershop Logo" className="w-full h-full object-contain" />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h1 className="text-lg font-bold text-white-primary truncate">MANITO BARBERSHOP</h1>
                  <p className="text-xs text-gray-lighter font-medium truncate">Panel de Clientes</p>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
          {isMobile && mobileDrawerOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-[89] transition-opacity"
              onClick={() => setMobileDrawerOpen(false)}
            />
          )}
          <aside
            className={`border-r border-gray-dark flex flex-col transition-all duration-200 ease-out shrink-0 z-[90] ${
              isMobile
                ? `fixed top-0 left-0 h-full w-72 ${mobileDrawerOpen ? "translate-x-0" : "-translate-x-full"}`
                : `relative ${sidebarCollapsed ? "w-20" : "w-72"} will-change-[width]`
            }`}
            style={{
              backgroundColor: "#111111",
              boxShadow: isMobile && mobileDrawerOpen ? "4px 0 25px rgba(0,0,0,0.8)" : "0px 0px 25px rgba(0,0,0,0.8)"
            }}
          >
            {/* Toggle button desktop — borde derecho */}
            {!isMobile && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="sidebar-toggle-btn"
                style={{
                  position: 'absolute',
                  right: '-16px',
                  top: '24px',
                  zIndex: 100,
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--black-secondary)',
                  border: '1px solid var(--gray-dark)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
                }}
              >
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="hidden">
                  <defs>
                    <mask id="bar-mask-cliente-1"><rect x="0" y="0" width="20" height="4.5" rx="2.25" fill="white" /></mask>
                    <mask id="bar-mask-cliente-2"><rect x="0" y="9.5" width="20" height="4.5" rx="2.25" fill="white" /></mask>
                  </defs>
                  {[
                    { mask: 'url(#bar-mask-cliente-1)', y: 0 },
                    { mask: 'url(#bar-mask-cliente-2)', y: 9.5 },
                  ].map((bar, i) => (
                    <g key={i} mask={bar.mask}>
                      <rect x="0" y={bar.y} width="20" height="4.5" rx="2.25" fill="#E3C6A5" />
                      <g className="barber-bar-stripes">
                        {[...Array(10)].map((_, j) => (
                          <rect
                            key={j}
                            x={j * 9 - 18}
                            y={bar.y - 4}
                            width="2.2"
                            height="13"
                            fill="#A06C31"
                            transform={`rotate(-35 ${j * 9 - 18 + 1.1} ${bar.y + 2.25})`}
                          />
                        ))}
                      </g>
                    </g>
                  ))}
                </svg>
              </button>
            )}
            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto space-y-1 ${isMobile ? "pt-20 pb-6" : "py-6"}`}>
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
            <div className="module-content flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
              {renderContent()}
            </div>
          </div>
        </div>


      </div>
    </TooltipProvider>
  );
}
