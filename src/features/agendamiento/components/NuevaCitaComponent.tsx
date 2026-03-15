import { useState } from "react";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  Star,
  ChevronRight,
  ChevronLeft,
  Check,
  X,
  Plus,
  ArrowRight
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { toast } from "../../../shared/components/ui/notify";

// Datos de servicios y paquetes
const serviciosIndividuales = [
  {
    id: 1,
    nombre: "Corte Clásico",
    precio: 35000,
    duracion: 30,
    descripcion: "Corte tradicional masculino con técnicas clásicas",
    categoria: "Corte",
    imagen: "✂️",
    popular: true,
    barberos: ["Carlos Mendez", "Miguel Rodriguez"]
  },
  {
    id: 2,
    nombre: "Corte Moderno",
    precio: 40000,
    duracion: 40,
    descripcion: "Corte contemporáneo con fade y técnicas actuales",
    categoria: "Corte",
    imagen: "💇‍♂️",
    popular: false,
    barberos: ["Miguel Rodriguez", "Ana Lopez"]
  },
  {
    id: 3,
    nombre: "Recorte de Barba",
    precio: 25000,
    duracion: 25,
    descripcion: "Recorte y perfilado profesional de barba",
    categoria: "Barba",
    imagen: "🧔‍♂️",
    popular: true,
    barberos: ["Carlos Mendez", "Miguel Rodriguez"]
  },
  {
    id: 4,
    nombre: "Afeitado Clásico",
    precio: 30000,
    duracion: 30,
    descripcion: "Afeitado tradicional con navaja y toallas calientes",
    categoria: "Barba",
    imagen: "🪒",
    popular: false,
    barberos: ["Carlos Mendez"]
  },
  {
    id: 5,
    nombre: "Perfilado de Cejas",
    precio: 20000,
    duracion: 20,
    descripcion: "Perfilado y arreglo profesional de cejas",
    categoria: "Cejas",
    imagen: "👁️",
    popular: true,
    barberos: ["Ana Lopez", "Miguel Rodriguez"]
  },
  {
    id: 6,
    nombre: "Mascarilla Facial",
    precio: 50000,
    duracion: 45,
    descripcion: "Tratamiento facial hidratante y revitalizante",
    categoria: "Cuidado",
    imagen: "🧴",
    popular: false,
    barberos: ["Ana Lopez"]
  },
  {
    id: 7,
    nombre: "Lavado Premium",
    precio: 15000,
    duracion: 15,
    descripcion: "Lavado con productos premium y masaje capilar",
    categoria: "Cuidado",
    imagen: "🚿",
    popular: true,
    barberos: ["Carlos Mendez", "Miguel Rodriguez", "Ana Lopez"]
  }
];

const paquetesEspeciales = [
  {
    id: 101,
    nombre: "Paquete Premium Completo",
    descripcion: "El servicio más completo para el caballero moderno",
    servicios: ["Corte de cabello", "Recorte de barba", "Perfilado de cejas"],
    duracion: 90,
    precio: 120000,
    descuento: 15,
    precioOriginal: 141000,
    categoria: "Premium",
    imagen: "🌟",
    popular: true,
    barberos: ["Carlos Mendez", "Miguel Rodriguez"]
  },
  {
    id: 102,
    nombre: "Paquete Elegante Plus",
    descripcion: "Elegancia y precisión en cada detalle",
    servicios: ["Corte de cabello", "Afeitado de barba", "Perfilado de cejas"],
    duracion: 85,
    precio: 110000,
    descuento: 12,
    precioOriginal: 125000,
    categoria: "Premium",
    imagen: "✨",
    popular: true,
    barberos: ["Carlos Mendez", "Miguel Rodriguez"]
  },
  {
    id: 103,
    nombre: "Paquete Clásico Duo",
    descripcion: "La combinación perfecta de corte y afeitado",
    servicios: ["Corte de cabello", "Afeitado de barba"],
    duracion: 70,
    precio: 80000,
    descuento: 10,
    precioOriginal: 89000,
    categoria: "Clásico",
    imagen: "🎩",
    popular: false,
    barberos: ["Carlos Mendez", "Miguel Rodriguez"]
  },
  {
    id: 104,
    nombre: "Paquete Estilo Moderno",
    descripcion: "Corte moderno con detalles perfectos",
    servicios: ["Corte de cabello", "Perfilado de cejas"],
    duracion: 50,
    precio: 65000,
    descuento: 8,
    precioOriginal: 71000,
    categoria: "Moderno",
    imagen: "💼",
    popular: true,
    barberos: ["Miguel Rodriguez", "Ana Lopez"]
  }
];

const barberos = [
  {
    id: 1,
    nombre: "Carlos Mendez",
    especialidad: "Cortes clásicos y barba",
    experiencia: 8,
    rating: 4.9,
    imagen: "👨‍💼",
    disponible: true,
    estado: "disponible",
    proximaCita: "14:00",
    citasHoy: 3
  },
  {
    id: 2,
    nombre: "Miguel Rodriguez",
    especialidad: "Cortes modernos y fade",
    experiencia: 6,
    rating: 4.8,
    imagen: "👨‍🎨",
    disponible: true,
    estado: "ocupado",
    proximaCita: "12:00",
    citasHoy: 5
  },
  {
    id: 3,
    nombre: "Ana Lopez",
    especialidad: "Cuidado facial y cejas",
    experiencia: 5,
    rating: 4.9,
    imagen: "👩‍💼",
    disponible: false,
    estado: "disponible",
    proximaCita: "16:00",
    citasHoy: 2
  },
  {
    id: 4,
    nombre: "Sofia Martinez",
    especialidad: "Tintura y coloración",
    experiencia: 7,
    rating: 4.8,
    imagen: "👩‍🎨",
    disponible: true,
    estado: "disponible",
    proximaCita: "15:30",
    citasHoy: 4
  }
];

// Horarios disponibles por barbero
const horariosDisponibles = {
  "Carlos Mendez": ["09:00", "10:30", "14:00", "15:30", "17:00"],
  "Miguel Rodriguez": ["10:00", "14:30", "16:00", "17:30"],
  "Ana Lopez": ["09:30", "11:00", "16:00", "17:00", "18:00"],
  "Sofia Martinez": ["10:00", "12:00", "15:30", "17:30", "18:30"]
};

interface NuevaCitaComponentProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NuevaCita {
  tipoServicio: string;
  servicio: string;
  servicioId: number | null;
  barbero: string;
  fecha: string;
  hora: string;
  notas: string;
}

// Componente para organizar servicios individuales por categorías
function ServiciosIndividualesMenu({
  serviciosSeleccionadoId,
  onServicioSelect,
  formatearPrecio
}: {
  serviciosSeleccionadoId: number | null;
  onServicioSelect: (servicio: any) => void;
  formatearPrecio: (precio: number) => string;
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>("Todos");

  // Agrupar servicios por categoría
  const categorias = ["Todos", ...Array.from(new Set(serviciosIndividuales.map(s => s.categoria)))];
  const serviciosPorCategoria = categorias.reduce((acc, categoria) => {
    acc[categoria] = categoria === "Todos"
      ? serviciosIndividuales
      : serviciosIndividuales.filter(s => s.categoria === categoria);
    return acc;
  }, {} as Record<string, typeof serviciosIndividuales>);

  const serviciosFiltrados = serviciosPorCategoria[categoriaActiva] || [];

  return (
    <div className="space-y-4">
      {/* Submenu de categorías */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-darker rounded-xl border border-gray-dark">
        {categorias.map((categoria) => (
          <button
            key={categoria}
            onClick={() => setCategoriaActiva(categoria)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${categoriaActiva === categoria
              ? 'bg-orange-primary text-black-primary'
              : 'bg-gray-dark text-gray-lightest hover:bg-gray-medium'
              }`}
          >
            {categoria}
            <span className="ml-2 text-xs opacity-75">
              ({categoria === "Todos" ? serviciosIndividuales.length : serviciosPorCategoria[categoria]?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Servicios populares destacados */}
      {categoriaActiva === "Todos" && (
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-orange-primary mb-3 flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Servicios Más Populares</span>
          </h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {serviciosIndividuales.filter(s => s.popular).slice(0, 3).map((servicio) => (
              <button
                key={`popular-${servicio.id}`}
                onClick={() => onServicioSelect(servicio)}
                className={`p-3 rounded-lg border text-left transition-all duration-300 ${serviciosSeleccionadoId === servicio.id
                  ? 'border-orange-primary bg-gray-darker'
                  : 'border-orange-primary bg-gray-darkest hover:bg-gray-darker'
                  }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{servicio.imagen}</div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-white-primary text-sm">{servicio.nombre}</h5>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-lightest">{servicio.duracion} min</span>
                      <span className="font-bold text-orange-primary">{formatearPrecio(servicio.precio)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grid de servicios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
        {serviciosFiltrados.map((servicio) => (
          <button
            key={servicio.id}
            onClick={() => onServicioSelect(servicio)}
            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${serviciosSeleccionadoId === servicio.id
              ? 'border-orange-primary bg-gray-darker'
              : 'border-gray-medium bg-gray-darkest hover:border-gray-light'
              }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{servicio.imagen}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-bold text-white-primary">{servicio.nombre}</h4>
                  {servicio.popular && (
                    <span className="px-2 py-1 bg-orange-primary text-black-primary text-xs rounded-full font-semibold">
                      Popular
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-lightest mb-2">{servicio.descripcion}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-primary" />
                    <span className="text-sm text-gray-lightest">{servicio.duracion} min</span>
                  </div>
                  <div className="font-bold text-orange-primary">
                    {formatearPrecio(servicio.precio)}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {serviciosFiltrados.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-lightest">No hay servicios disponibles en esta categoría</p>
        </div>
      )}
    </div>
  );
}

// Componente para organizar paquetes especiales
function PaquetesEspecialesGrid({
  paqueteSeleccionadoId,
  onPaqueteSelect,
  formatearPrecio
}: {
  paqueteSeleccionadoId: number | null;
  onPaqueteSelect: (paquete: any) => void;
  formatearPrecio: (precio: number) => string;
}) {
  const [filtroActivo, setFiltroActivo] = useState<string>("Todos");

  // Filtros disponibles
  const filtros = ["Todos", "Premium", "Clásico", "Moderno"];
  const paquetesFiltrados = filtroActivo === "Todos"
    ? paquetesEspeciales
    : paquetesEspeciales.filter(p => p.categoria === filtroActivo);

  return (
    <div className="space-y-4">
      {/* Submenu de filtros */}
      <div className="flex flex-wrap gap-2 p-4 bg-gray-darker rounded-xl border border-gray-dark">
        {filtros.map((filtro) => (
          <button
            key={filtro}
            onClick={() => setFiltroActivo(filtro)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${filtroActivo === filtro
              ? 'bg-orange-primary text-black-primary'
              : 'bg-gray-dark text-gray-lightest hover:bg-gray-medium'
              }`}
          >
            {filtro}
            <span className="ml-2 text-xs opacity-75">
              ({filtro === "Todos" ? paquetesEspeciales.length : paquetesEspeciales.filter(p => p.categoria === filtro).length})
            </span>
          </button>
        ))}
      </div>

      {/* Grid de paquetes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
        {paquetesFiltrados.map((paquete) => (
          <button
            key={paquete.id}
            onClick={() => onPaqueteSelect(paquete)}
            className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${paqueteSeleccionadoId === paquete.id
              ? 'border-orange-primary bg-gray-darker'
              : 'border-gray-medium bg-gray-darkest hover:border-gray-light'
              }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{paquete.imagen}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-bold text-white-primary">{paquete.nombre}</h4>
                  {paquete.popular && (
                    <span className="px-2 py-1 bg-orange-primary text-black-primary text-xs rounded-full font-semibold">
                      Popular
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-medium text-gray-lightest text-xs rounded-full font-semibold">
                    {paquete.categoria}
                  </span>
                </div>
                <p className="text-xs text-gray-lightest mb-2">{paquete.descripcion}</p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-orange-primary" />
                    <span className="text-sm text-gray-lightest">{paquete.duracion} min</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-light line-through">
                      {formatearPrecio(paquete.precioOriginal)}
                    </div>
                    <div className="font-bold text-orange-primary">
                      {formatearPrecio(paquete.precio)}
                    </div>
                    <div className="text-xs text-green-400 font-semibold">
                      Ahorra {paquete.descuento}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-medium">
                  <div className="text-xs text-gray-lightest">
                    <strong>Incluye:</strong> {paquete.servicios.join(', ')}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {paquetesFiltrados.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-lightest">No hay paquetes disponibles en esta categoría</p>
        </div>
      )}
    </div>
  );
}

export function NuevaCitaComponent({ isOpen, onClose }: NuevaCitaComponentProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [nuevaCita, setNuevaCita] = useState<NuevaCita>({
    tipoServicio: '',
    servicio: '',
    servicioId: null,
    barbero: '',
    fecha: '',
    hora: '',
    notas: ''
  });

  const formatearPrecio = (precio: number): string => {
    const precioEntero = Math.round(precio);
    return `$ ${precioEntero.toLocaleString('es-CO')}`;
  };

  const resetForm = () => {
    setNuevaCita({
      tipoServicio: '',
      servicio: '',
      servicioId: null,
      barbero: '',
      fecha: '',
      hora: '',
      notas: ''
    });
    setCurrentStep(1);
    setSelectedDate(null);
  };

  const getServicioSeleccionado = () => {
    if (nuevaCita.tipoServicio === 'individual') {
      return serviciosIndividuales.find(s => s.id === nuevaCita.servicioId);
    } else if (nuevaCita.tipoServicio === 'paquete') {
      return paquetesEspeciales.find(s => s.id === nuevaCita.servicioId);
    }
    return null;
  };

  const getBarberosDisponibles = () => {
    const servicio = getServicioSeleccionado();
    if (!servicio) return barberos;
    return barberos.filter(barbero =>
      servicio.barberos.includes(barbero.nombre) && barbero.disponible
    );
  };

  const handleSubmit = () => {
    const servicio = getServicioSeleccionado();
    if (!servicio) return;

    // Submit logic here - data is ready in nuevaCita object

    toast.success("¡Cita agendada exitosamente!", {
      description: `Tu cita de ${servicio.nombre} con ${nuevaCita.barbero} ha sido confirmada para el ${nuevaCita.fecha} a las ${nuevaCita.hora}.`
    });

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Funciones para el calendario
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const isDateAvailable = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const prevMonth = () => {
    const prevMonthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    const today = new Date();
    if (prevMonthDate.getFullYear() >= today.getFullYear() && prevMonthDate.getMonth() >= today.getMonth()) {
      setCurrentMonth(prevMonthDate);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] overflow-y-auto overflow-x-hidden bg-gray-darkest border-gray-dark p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white-primary flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-orange-primary" />
            <span>Nueva Cita</span>
          </DialogTitle>
          <DialogDescription className="text-gray-lightest">
            Programa tu próxima visita siguiendo estos sencillos pasos
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-center space-x-2 lg:space-x-4 py-6 border-b border-gray-dark overflow-x-auto">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm lg:text-base ${currentStep >= step
                ? 'bg-orange-primary border-orange-primary text-black-primary'
                : 'border-gray-medium text-gray-light'
                }`}>
                {currentStep > step ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : step}
              </div>
              {step < 5 && (
                <div className={`w-8 lg:w-12 h-0.5 mx-1 lg:mx-2 transition-all duration-300 ${currentStep > step ? 'bg-orange-primary' : 'bg-gray-medium'
                  }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="py-6">
          {/* Paso 1: Tipo de Servicio */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Elige el tipo de servicio</h3>
                <p className="text-gray-lightest">¿Prefieres un servicio individual o un paquete especial?</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <button
                  onClick={() => setNuevaCita(prev => ({ ...prev, tipoServicio: 'individual', servicio: '', servicioId: null }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${nuevaCita.tipoServicio === 'individual'
                    ? 'border-orange-primary bg-gray-darker'
                    : 'border-gray-medium bg-gray-darkest hover:border-gray-light'
                    }`}
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-orange-primary rounded-full flex items-center justify-center">
                      <Scissors className="w-8 h-8 text-black-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-white-primary">Servicios Individuales</h4>
                    <p className="text-sm text-gray-lightest">Elige un servicio específico según tus necesidades</p>
                  </div>
                </button>

                <button
                  onClick={() => setNuevaCita(prev => ({ ...prev, tipoServicio: 'paquete', servicio: '', servicioId: null }))}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${nuevaCita.tipoServicio === 'paquete'
                    ? 'border-orange-primary bg-gray-darker'
                    : 'border-gray-medium bg-gray-darkest hover:border-gray-light'
                    }`}
                >
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-orange-primary rounded-full flex items-center justify-center">
                      <Star className="w-8 h-8 text-black-primary" />
                    </div>
                    <h4 className="text-lg font-bold text-white-primary">Paquetes Especiales</h4>
                    <p className="text-sm text-gray-lightest">Combinaciones especiales con descuentos exclusivos</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar Servicio */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">
                  {nuevaCita.tipoServicio === 'individual' ? 'Selecciona tu servicio' : 'Elige tu paquete'}
                </h3>
                <p className="text-gray-lightest">
                  {nuevaCita.tipoServicio === 'individual'
                    ? 'Escoge el servicio que mejor se adapte a tus necesidades'
                    : 'Aprovecha nuestros paquetes especiales con descuentos exclusivos'
                  }
                </p>
              </div>

              {nuevaCita.tipoServicio === 'individual' ? (
                <ServiciosIndividualesMenu
                  serviciosSeleccionadoId={nuevaCita.servicioId}
                  onServicioSelect={(servicio) => setNuevaCita(prev => ({
                    ...prev,
                    servicio: servicio.nombre,
                    servicioId: servicio.id
                  }))}
                  formatearPrecio={formatearPrecio}
                />
              ) : (
                <PaquetesEspecialesGrid
                  paqueteSeleccionadoId={nuevaCita.servicioId}
                  onPaqueteSelect={(paquete) => setNuevaCita(prev => ({
                    ...prev,
                    servicio: paquete.nombre,
                    servicioId: paquete.id
                  }))}
                  formatearPrecio={formatearPrecio}
                />
              )}
            </div>
          )}

          {/* Paso 3: Seleccionar Barbero */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Elige tu barbero preferido</h3>
                <p className="text-gray-lightest">Selecciona al profesional que realizará tu servicio</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {getBarberosDisponibles().map((barbero) => (
                  <button
                    key={barbero.id}
                    onClick={() => setNuevaCita(prev => ({ ...prev, barbero: barbero.nombre }))}
                    className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${nuevaCita.barbero === barbero.nombre
                      ? 'border-orange-primary bg-gray-darker'
                      : 'border-gray-medium bg-gray-darkest hover:border-gray-light'
                      }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">{barbero.imagen}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-white-primary">{barbero.nombre}</h4>
                          <div className={`px-2 py-1 rounded-full text-xs font-semibold ${barbero.estado === 'disponible'
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-secondary text-white'
                            }`}>
                            {barbero.estado === 'disponible' ? 'Disponible' : 'Ocupado'}
                          </div>
                        </div>
                        <p className="text-sm text-gray-lightest mb-2">{barbero.especialidad}</p>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center space-x-1">
                            <Star className="w-4 h-4 text-orange-secondary fill-current" />
                            <span className="text-gray-lightest">{barbero.rating}</span>
                          </div>
                          <div className="text-gray-lightest">
                            {barbero.experiencia} años exp.
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Paso 4: Seleccionar Fecha */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Selecciona la fecha</h3>
                <p className="text-gray-lightest">Elige el día que mejor se adapte a tu agenda</p>
              </div>

              <div className="max-w-md mx-auto">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-white-primary" />
                  </button>
                  <h4 className="text-lg font-bold text-white-primary">
                    {currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                  </h4>
                  <button
                    onClick={nextMonth}
                    className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium border border-gray-medium transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white-primary" />
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-semibold text-gray-light">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {/* Empty cells for days before the first day of the month */}
                  {[...Array(getFirstDayOfMonth(currentMonth))].map((_, index) => (
                    <div key={index} className="p-3" />
                  ))}

                  {/* Days of the month */}
                  {[...Array(getDaysInMonth(currentMonth))].map((_, index) => {
                    const day = index + 1;
                    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                    const dateString = formatDate(date);
                    const isAvailable = isDateAvailable(day);
                    const isSelected = selectedDate && formatDate(selectedDate) === dateString;

                    return (
                      <button
                        key={day}
                        disabled={!isAvailable}
                        onClick={() => {
                          setSelectedDate(date);
                          setNuevaCita(prev => ({ ...prev, fecha: dateString }));
                        }}
                        className={`p-3 text-center rounded-lg transition-all duration-200 ${isSelected
                          ? 'bg-orange-primary text-black-primary font-bold'
                          : isAvailable
                            ? 'bg-gray-darkest hover:bg-gray-darker text-white-primary border border-gray-medium'
                            : 'bg-gray-medium text-gray-light cursor-not-allowed'
                          }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Paso 5: Seleccionar Hora y Confirmar */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Selecciona la hora</h3>
                <p className="text-gray-lightest">Elige el horario disponible para {nuevaCita.barbero}</p>
              </div>

              {/* Horarios disponibles */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-lg mx-auto">
                {horariosDisponibles[nuevaCita.barbero as keyof typeof horariosDisponibles]?.map((hora) => (
                  <button
                    key={hora}
                    onClick={() => setNuevaCita(prev => ({ ...prev, hora }))}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 ${nuevaCita.hora === hora
                      ? 'border-orange-primary bg-gray-darker text-orange-primary'
                      : 'border-gray-medium bg-gray-darkest text-white-primary hover:border-gray-light'
                      }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-semibold">{hora}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Notas adicionales */}
              <div className="max-w-lg mx-auto">
                <label className="block text-sm font-semibold text-white-primary mb-2">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={nuevaCita.notas}
                  onChange={(e) => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Escribe cualquier solicitud especial o comentario..."
                  className="w-full p-3 rounded-lg bg-gray-darker border border-gray-medium text-white-primary placeholder-gray-light resize-none"
                  rows={3}
                />
              </div>

              {/* Resumen de la cita */}
              {nuevaCita.hora && (
                <div className="max-w-lg mx-auto p-4 rounded-xl bg-gray-darker border border-gray-medium">
                  <h4 className="font-bold text-white-primary mb-3 flex items-center space-x-2">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Resumen de tu cita</span>
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Servicio:</span>
                      <span className="text-white-primary font-semibold">{nuevaCita.servicio}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Barbero:</span>
                      <span className="text-white-primary font-semibold">{nuevaCita.barbero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Fecha:</span>
                      <span className="text-white-primary font-semibold">
                        {selectedDate?.toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Hora:</span>
                      <span className="text-white-primary font-semibold">{nuevaCita.hora}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-medium">
                      <span className="text-gray-lightest">Total:</span>
                      <span className="text-orange-primary font-bold text-lg">
                        {formatearPrecio(getServicioSeleccionado()?.precio || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-dark">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                variant="outline"
                className="flex items-center space-x-2 border-gray-medium hover:border-gray-light"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Anterior</span>
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-medium hover:border-gray-light"
            >
              Cancelar
            </Button>

            {currentStep < 5 ? (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                disabled={
                  (currentStep === 1 && !nuevaCita.tipoServicio) ||
                  (currentStep === 2 && !nuevaCita.servicioId) ||
                  (currentStep === 3 && !nuevaCita.barbero) ||
                  (currentStep === 4 && !nuevaCita.fecha)
                }
                className="elegante-button-primary flex items-center space-x-2"
              >
                <span>Siguiente</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!nuevaCita.hora}
                className="elegante-button-primary flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Cita</span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
