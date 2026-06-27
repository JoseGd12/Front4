import { useState, useEffect } from "react";
import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { useIsMobile } from "../../../shared/hooks/useIsMobile";
import {
  Calendar,
  DollarSign,
  Clock,
  User,
  LogOut,
  Settings,
  AtSign,
  ArrowRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shared/components/ui/dropdown-menu";
import manitoLogo from "../../../assets/Manito.jpeg";
const LOGO_URL = manitoLogo;
import { AgendamientoPage } from "../../agendamiento/pages/AgendamientoPage";
import { VentasPage } from "../../ventas/pages/VentasPage";
import { HorariosPage } from "../../horarios/pages/HorariosPage";
import { AdminPerfilPage } from "./AdminPerfilPage";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { ModuleSubNav } from "../../../shared/components/ui/module-sub-nav";
import { barberosService } from "../../administracion/services/barberosService";
const MisSolicitudesPage = React.lazy(() => import("../../horarios/pages/SolicitudesCambioHorario/MisSolicitudesPage"));
const CrearSolicitudPage = React.lazy(() => import("../../horarios/pages/SolicitudesCambioHorario/CrearSolicitudPage"));

const navItems = [
  { icon: Calendar, label: "Agendamientos" },
  { icon: DollarSign, label: "Ventas" },
  { icon: Clock, label: "Horarios" },
  { icon: User, label: "Mi Perfil" },
];

const barberoPathToPage = (pathname: string): string => {
  const seg = pathname.split("/dashboard/")[1] || "";
  if (seg === "ventas") return "Ventas";
  if (seg === "horarios") return "Horarios";
  if (seg === "perfil") return "Mi Perfil";
  return "Agendamientos";
};

const barberoPageToPath = (page: string): string => {
  if (page === "Ventas") return "ventas";
  if (page === "Horarios") return "horarios";
  if (page === "Mi Perfil") return "perfil";
  return "";
};

export function BarberoDashboard({
  onBackToLanding,
}: {
  onBackToLanding?: () => void;
}) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [horariosSubPage, setHorariosSubPage] = useState<'main' | 'solicitudes' | 'crearSolicitud'>('main');
  const [barberoIdNum, setBarberoIdNum] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!user) return;
    const uid = Number(user.id);
    const correo = (user.email || '').toLowerCase();
    barberosService.getBarberos().then(barberos => {
      const b = barberos.find(bb => {
        if (bb.usuarioId && Number(bb.usuarioId) === uid) return true;
        if (Number(bb.id) === uid) return true;
        if (correo && (bb.correo || '').toLowerCase() === correo) return true;
        return false;
      });
      if (b) setBarberoIdNum(b.id);
    }).catch(() => {});
  }, [user]);

  const activePage = barberoPathToPage(location.pathname);

  const setActivePage = (page: string) => {
    if (page !== "Horarios") setHorariosSubPage('main');
    const path = barberoPageToPath(page);
    navigate(path ? `/dashboard/${path}` : "/dashboard");
    if (isMobile) setMobileDrawerOpen(false);
  };

  const displayGreetingName =
    String(user?.name || "Barbero").trim().split(" ")[0] || "Barbero";

  const handleLogout = async () => {
    sessionStorage.setItem("barbershop_post_logout_view", "landing");
    await logout();
  };

  const renderNavItem = (item: (typeof navItems)[0], isActive: boolean) => {
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
        <Icon
          className={`w-5 h-5 ${isActive ? "text-orange-primary" : "text-gray-lighter"}`}
        />
        {!sidebarCollapsed && <span>{item.label}</span>}
      </button>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip key={item.label} delayDuration={0}>
          <TooltipTrigger asChild>{buttonElement}</TooltipTrigger>
          <TooltipContent
            side="right"
            className="bg-gray-darkest border-gray-dark text-white-primary"
          >
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return buttonElement;
  };

  const handleHorariosNavigate = (page: string) => {
    if (page === 'Solicitudes de Cambio de Horario') {
      setHorariosSubPage('solicitudes');
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case "Agendamientos":
        return <AgendamientoPage />;
      case "Ventas":
        return <VentasPage />;
      case "Horarios":
        if (horariosSubPage === 'crearSolicitud') {
          return (
            <React.Suspense fallback={null}>
              <CrearSolicitudPage
                barberoId={barberoIdNum}
                onNavigate={() => setHorariosSubPage('solicitudes')}
              />
            </React.Suspense>
          );
        }
        if (horariosSubPage === 'solicitudes') {
          return (
            <React.Suspense fallback={null}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setHorariosSubPage('main')}
                    className="px-3 py-1.5 text-sm font-medium text-gray-lighter hover:text-gray-lightest bg-gray-darker border border-gray-dark rounded-lg transition-colors"
                  >
                    Volver a Horarios
                  </button>
                  <button
                    onClick={() => setHorariosSubPage('crearSolicitud')}
                    className="btn-std-primary"
                  >
                    Nueva Solicitud
                  </button>
                </div>
                <MisSolicitudesPage
                  barberoId={barberoIdNum}
                  onNavigate={(tab) => {
                    if (tab === 'crear') setHorariosSubPage('crearSolicitud');
                    else setHorariosSubPage('main');
                  }}
                />
              </div>
            </React.Suspense>
          );
        }
        return <HorariosPage onNavigate={handleHorariosNavigate} />;
      case "Mi Perfil":
        return <AdminPerfilPage />;
      default:
        return <AgendamientoPage />;
    }
  };

  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-screen bg-black-primary"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* Barra Superior */}
        <header
          className="border-b border-gray-dark py-4 flex items-center transition-colors z-[100] relative"
          style={{
            backgroundColor: "#111111",
            boxShadow: "0px 0px 25px rgba(0,0,0,0.8)",
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
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "var(--black-secondary)",
                    border: "1px solid var(--gray-dark)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition:
                      "background-color 0.2s, border-color 0.2s, box-shadow 0.2s",
                  }}
                >
                  <svg
                    width="20"
                    height="14"
                    viewBox="0 0 20 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    overflow="hidden"
                  >
                    <defs>
                      <mask id="bar-mask-barbero-mobile-1">
                        <rect
                          x="0"
                          y="0"
                          width="20"
                          height="4.5"
                          rx="2.25"
                          fill="white"
                        />
                      </mask>
                      <mask id="bar-mask-barbero-mobile-2">
                        <rect
                          x="0"
                          y="9.5"
                          width="20"
                          height="4.5"
                          rx="2.25"
                          fill="white"
                        />
                      </mask>
                    </defs>
                    {[
                      { mask: "url(#bar-mask-barbero-mobile-1)", y: 0 },
                      { mask: "url(#bar-mask-barbero-mobile-2)", y: 9.5 },
                    ].map((bar, i) => (
                      <g key={i} mask={bar.mask}>
                        <rect
                          x="0"
                          y={bar.y}
                          width="20"
                          height="4.5"
                          rx="2.25"
                          fill="#E3C6A5"
                        />
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
                  <img
                    src={LOGO_URL}
                    alt="Manito Barbershop Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0 hidden sm:block">
                  <h1 className="text-lg font-bold text-white-primary truncate">
                    MANITO BARBERSHOP
                  </h1>
                  <p className="text-xs text-gray-lighter font-medium truncate">
                    Panel de Barberos
                  </p>
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
                      <p className="text-lg font-semibold text-white-primary">
                        Hola, {displayGreetingName}
                      </p>
                      <span className="inline-flex mt-2 px-3 py-1 rounded-full text-xs font-medium bg-orange-primary text-black-primary">
                        Barbero
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
                        onSelect={() => setActivePage("Mi Perfil")}
                        className="cursor-pointer text-gray-lightest focus:bg-gray-darker focus:text-white-primary rounded-lg"
                      >
                        <Settings className="w-4 h-4 text-orange-primary" />
                        Mi Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => void handleLogout()}
                        className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300 rounded-lg"
                      >
                        <LogOut className="w-4 h-4 text-red-400" />
                        Cerrar sesion
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
              boxShadow:
                isMobile && mobileDrawerOpen
                  ? "4px 0 25px rgba(0,0,0,0.8)"
                  : "0px 0px 25px rgba(0,0,0,0.8)",
            }}
          >
            {!isMobile && (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="sidebar-toggle-btn"
                style={{
                  position: "absolute",
                  right: "-16px",
                  top: "24px",
                  zIndex: 100,
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "var(--black-secondary)",
                  border: "1px solid var(--gray-dark)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition:
                    "background-color 0.2s, border-color 0.2s, box-shadow 0.2s",
                }}
              >
                <svg
                  width="20"
                  height="14"
                  viewBox="0 0 20 14"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  overflow="hidden"
                >
                  <defs>
                    <mask id="bar-mask-barbero-1">
                      <rect
                        x="0"
                        y="0"
                        width="20"
                        height="4.5"
                        rx="2.25"
                        fill="white"
                      />
                    </mask>
                    <mask id="bar-mask-barbero-2">
                      <rect
                        x="0"
                        y="9.5"
                        width="20"
                        height="4.5"
                        rx="2.25"
                        fill="white"
                      />
                    </mask>
                  </defs>
                  {[
                    { mask: "url(#bar-mask-barbero-1)", y: 0 },
                    { mask: "url(#bar-mask-barbero-2)", y: 9.5 },
                  ].map((bar, i) => (
                    <g key={i} mask={bar.mask}>
                      <rect
                        x="0"
                        y={bar.y}
                        width="20"
                        height="4.5"
                        rx="2.25"
                        fill="#E3C6A5"
                      />
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
            <nav
              className={`flex-1 overflow-y-auto space-y-1 ${isMobile ? "pt-20 pb-6" : "py-6"}`}
            >
              {navItems.map((item) =>
                renderNavItem(item, activePage === item.label)
              )}
            </nav>
          </aside>

          {/* Contenido principal */}
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
