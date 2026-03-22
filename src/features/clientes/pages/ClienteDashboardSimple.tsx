import { useState } from "react";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { NuevaCitaCliente } from "../../agendamiento/components/NuevaCitaCliente";
import {
  Calendar,
  User,
  Package,
  History,
  LogOut,
  Scissors,
  Menu,
  Settings
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../shared/components/ui/tooltip";

const mainNavItems = [
  { icon: User, label: "Inicio" },
  { icon: Calendar, label: "Mis Citas" },
  { icon: Package, label: "Productos" },
  { icon: History, label: "Historial" },
];

export function ClienteDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("Inicio");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;

    const buttonElement = (
      <button
        key={item.label}
        onClick={() => setActiveTab(item.label)}
        className={`elegante-nav-item w-full text-left cursor-pointer ${isActive ? "elegante-nav-item-active" : ""
          } ${sidebarCollapsed ? "justify-center px-2" : ""}`}
        title={sidebarCollapsed ? item.label : ""}
      >
        <Icon className={`w-5 h-5 ${isActive ? "text-primary-orange" : "text-gray-lighter"}`} />
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
    switch (activeTab) {
      case "Inicio":
        return <InicioContent user={user} setActiveTab={setActiveTab} />;
      case "Mis Citas":
        return <CitasContent />;
      case "Productos":
        return <ProductosContent />;
      case "Historial":
        return <HistorialContent />;
      default:
        return <InicioContent user={user} setActiveTab={setActiveTab} />;
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-black-primary" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-black-primary border-r border-gray-dark flex flex-col transition-all duration-300`}>
          {/* Logo */}
          <div className={`${sidebarCollapsed ? 'p-4' : 'p-8'} border-b border-gray-dark transition-all duration-300`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}`}>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-primary to-orange-secondary rounded-2xl flex items-center justify-center elegante-shadow-lg relative overflow-hidden">
                <Scissors className="w-6 h-6 text-black-primary" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-xl font-bold text-white-primary">EDWINS BARBER</h1>
                  <p className="text-xs text-gray-lighter font-medium">Portal del Cliente</p>
                </div>
              )}
            </div>
          </div>

          {/* Botón de colapso */}
          <div className={`${sidebarCollapsed ? 'px-2 py-4' : 'px-6 py-4'} transition-all duration-300`}>
            <div className={`${sidebarCollapsed ? 'flex justify-center' : 'flex justify-between items-center'} pb-3 border-b border-gray-dark`}>
              {!sidebarCollapsed && <span className="text-sm font-semibold text-gray-lighter">Menú</span>}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors shadow-md cursor-pointer"
                title={sidebarCollapsed ? "Expandir menú" : "Contraer menú"}
              >
                <Menu className="w-4 h-4 text-orange-primary" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 ${sidebarCollapsed ? 'px-2' : 'px-6'} space-y-8 overflow-y-auto transition-all duration-300`}>
            <div className="space-y-2">
              {mainNavItems.map((item) => renderNavItem(item, activeTab === item.label))}
            </div>
          </nav>

          {/* User Info y Logout */}
          <div className={`${sidebarCollapsed ? 'p-2' : 'p-6'} border-t border-gray-dark transition-all duration-300`}>
            <div className={`flex items-center ${sidebarCollapsed ? 'flex-col space-y-2 p-2' : 'space-x-3 p-3'} rounded-lg bg-gray-darkest border border-gray-dark transition-all duration-300`}>
              <div className="w-10 h-10 bg-orange-primary rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-black-primary" />
              </div>
              {!sidebarCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white-primary truncate">{user?.name}</p>
                    <p className="text-xs text-gray-lighter truncate">Cliente Premium</p>
                  </div>
                  <button
                    type="button"
                    className="p-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark transition-colors cursor-pointer"
                    title="Configuración"
                  >
                    <Settings className="w-4 h-4 text-orange-primary" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4 text-orange-primary" />
              </button>
              {sidebarCollapsed && (
                <button
                  type="button"
                  className="p-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark transition-colors cursor-pointer"
                  title="Configuración"
                >
                  <Settings className="w-4 h-4 text-orange-primary" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barra Superior */}
          <div className="bg-gray-darkest border-b border-gray-dark px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white-primary">{activeTab}</h1>
              <p className="text-sm text-gray-lightest">Portal del Cliente - EDWINS BARBER</p>
            </div>

          </div>

          {renderContent()}
        </div>
      </div>
    </TooltipProvider>
  );
}

function InicioContent({ user, setActiveTab }: { user: any; setActiveTab: (tab: string) => void }) {
  return (
    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
      {/* Welcome Card */}
      <div className="elegante-card">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-orange-primary rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-black-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white-primary">¡Bienvenido, {user?.name}!</h2>
            <p className="text-gray-lightest">Gestiona tus citas y descubre nuestros productos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="elegante-card">
            <h3 className="text-xl font-bold text-white-primary mb-4">Agendar Nueva Cita</h3>
            <p className="text-gray-lightest mb-4">Reserva tu próxima visita con nuestros barberos profesionales</p>
            <button
              onClick={() => setActiveTab("Mis Citas")}
              className="elegante-button-primary w-full flex items-center justify-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Agendar Cita
            </button>
          </div>

          <div className="elegante-card">
            <h3 className="text-xl font-bold text-white-primary mb-4">Explorar Productos</h3>
            <p className="text-gray-lightest mb-4">Descubre nuestros productos de cuidado personal</p>
            <button
              onClick={() => setActiveTab("Productos")}
              className="elegante-button-secondary w-full flex items-center justify-center"
            >
              <Package className="w-4 h-4 mr-2" />
              Ver Catálogo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CitasContent() {
  const [showNuevaCita, setShowNuevaCita] = useState(false);
  const { user } = useAuth();

  // Información del cliente desde el contexto de autenticación
  const clienteInfo = {
    nombre: user?.name || "Cliente",
    telefono: user?.telefono || "+57 300 000 0000"
  };

  // Mock data de citas (en un caso real esto vendría de una API)
  const [citas, setCitas] = useState([
    // Algunas citas de ejemplo para demostración
    {
      id: 1,
      servicio: "Corte Clásico",
      barbero: "Carlos Mendez",
      fecha: "2024-12-20",
      hora: "10:00",
      precio: 35000,
      estado: "Confirmada",
      duracion: 30
    },
    {
      id: 2,
      servicio: "Recorte de Barba",
      barbero: "Miguel Rodriguez",
      fecha: "2024-12-22",
      hora: "15:30",
      precio: 25000,
      estado: "Pendiente",
      duracion: 25
    }
  ]);

  const formatearFecha = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearPrecio = (precio: number): string => {
    return `$ ${precio.toLocaleString('es-CO')}`;
  };

  const handleNuevaCitaSuccess = (nuevaCitaData: any) => {
    // Agregar la nueva cita a la lista
    const nuevaCita = {
      id: citas.length + 1,
      ...nuevaCitaData,
      estado: "Pendiente"
    };
    setCitas(prev => [...prev, nuevaCita]);
  };

  return (
    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
      <div className="elegante-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white-primary">Mis Citas</h2>
            <p className="text-gray-lightest">Gestiona tus citas programadas y agenda nuevas visitas</p>
          </div>
          <button
            onClick={() => setShowNuevaCita(true)}
            className="elegante-button-primary flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        </div>

        {citas.length === 0 ? (
          <div className="mt-6 p-6 rounded-lg bg-gray-medium border border-gray-dark text-center">
            <Calendar className="w-12 h-12 text-orange-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white-primary mb-2">No tienes citas programadas</h3>
            <p className="text-gray-lightest mb-4">¡Agenda tu primera cita con nosotros!</p>
            <button
              onClick={() => setShowNuevaCita(true)}
              className="elegante-button-primary"
            >
              Nueva Cita
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {citas
              .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
              .map((cita: any) => (
                <div key={cita.id} className="elegante-card bg-gray-darker border border-gray-dark">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-orange-primary rounded-full flex items-center justify-center">
                        <Scissors className="w-6 h-6 text-black-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white-primary">{cita.servicio}</h4>
                        <p className="text-sm text-gray-lightest">Con {cita.barbero}</p>
                        <p className="text-xs text-gray-lighter">{formatearFecha(cita.fecha)} a las {cita.hora}</p>
                        <p className="text-xs text-gray-light">{cita.duracion} minutos</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-orange-primary font-bold">{formatearPrecio(cita.precio)}</div>
                      <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${cita.estado === 'Confirmada'
                        ? 'bg-green-600 text-white'
                        : cita.estado === 'Pendiente'
                          ? 'bg-orange-secondary text-white'
                          : 'bg-gray-600 text-white'
                        }`}>
                        {cita.estado}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Modal de Nueva Cita */}
      <NuevaCitaCliente
        isOpen={showNuevaCita}
        onClose={() => setShowNuevaCita(false)}
        clienteInfo={clienteInfo}
        onSuccess={handleNuevaCitaSuccess}
      />
    </div>
  );
}

function ProductosContent() {
  return (
    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
      <div className="elegante-card">
        <h2 className="text-2xl font-bold text-white-primary mb-4">Catálogo de Productos</h2>
        <p className="text-gray-lightest">Descubre nuestros productos de cuidado personal y accesorios</p>

        <div className="mt-6 p-6 rounded-lg bg-gray-medium border border-gray-dark text-center">
          <Package className="w-12 h-12 text-orange-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white-primary mb-2">Catálogo próximamente</h3>
          <p className="text-gray-lightest">Estamos preparando una increíble selección de productos para ti</p>
        </div>
      </div>
    </div>
  );
}

function HistorialContent() {
  return (
    <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
      <div className="elegante-card">
        <h2 className="text-2xl font-bold text-white-primary mb-4">Historial</h2>
        <p className="text-gray-lightest">Revisa tu historial de citas y compras</p>

        <div className="mt-6 p-6 rounded-lg bg-gray-medium border border-gray-dark text-center">
          <History className="w-12 h-12 text-orange-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white-primary mb-2">Sin historial aún</h3>
          <p className="text-gray-lightest">Tu historial aparecerá aquí una vez que realices tu primera cita</p>
        </div>
      </div>
    </div>
  );
}
