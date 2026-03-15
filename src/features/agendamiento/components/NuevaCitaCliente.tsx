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
  ArrowRight,
  Mail
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { toast } from "../../../shared/components/ui/notify";
import { EmailSimulatorCita } from "./EmailSimulatorCita";

// Datos de servicios simplificados para clientes
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

const barberos = [
  {
    id: 1,
    nombre: "Carlos Mendez",
    especialidad: "Cortes clásicos y barba",
    experiencia: 8,
    rating: 4.9,
    imagen: "👨‍💼",
    disponible: true,
    estado: "disponible"
  },
  {
    id: 2,
    nombre: "Miguel Rodriguez",
    especialidad: "Cortes modernos y fade",
    experiencia: 6,
    rating: 4.8,
    imagen: "👨‍🎨",
    disponible: true,
    estado: "disponible"
  },
  {
    id: 3,
    nombre: "Ana Lopez",
    especialidad: "Cuidado facial y cejas",
    experiencia: 5,
    rating: 4.9,
    imagen: "👩‍💼",
    disponible: true,
    estado: "disponible"
  }
];

// Horarios disponibles
const horariosDisponibles = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30"
];

interface NuevaCitaClienteProps {
  isOpen: boolean;
  onClose: () => void;
  clienteInfo?: {
    nombre: string;
    telefono: string;
  };
  onSuccess?: (citaData: any) => void;
}

interface NuevaCita {
  servicio: string;
  servicioId: number | null;
  barbero: string;
  fecha: string;
  hora: string;
  notas: string;
}

export function NuevaCitaCliente({ isOpen, onClose, clienteInfo, onSuccess }: NuevaCitaClienteProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showEmailSimulator, setShowEmailSimulator] = useState(false);
  const [citaCompletada, setCitaCompletada] = useState<any>(null);
  const [nuevaCita, setNuevaCita] = useState<NuevaCita>({
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
      servicio: '',
      servicioId: null,
      barbero: '',
      fecha: '',
      hora: '',
      notas: ''
    });
    setCurrentStep(1);
    setSelectedDate(null);
    setShowEmailSimulator(false);
    setCitaCompletada(null);
  };

  const getServicioSeleccionado = () => {
    return serviciosIndividuales.find(s => s.id === nuevaCita.servicioId);
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

    const citaData = {
      servicio: servicio.nombre,
      barbero: nuevaCita.barbero,
      fecha: nuevaCita.fecha,
      hora: nuevaCita.hora,
      precio: servicio.precio,
      duracion: servicio.duracion,
      notas: nuevaCita.notas
    };

    console.log('Nueva cita del cliente:', {
      ...nuevaCita,
      cliente: clienteInfo,
      servicioCompleto: servicio
    });

    // Guardar los datos de la cita para el simulador de email
    setCitaCompletada(citaData);

    toast.success("¡Cita agendada exitosamente!", {
      description: `Tu cita de ${servicio.nombre} con ${nuevaCita.barbero} ha sido confirmada para el ${nuevaCita.fecha} a las ${nuevaCita.hora}.`,
      action: {
        label: "Ver confirmación",
        onClick: () => setShowEmailSimulator(true),
      },
    });

    if (onSuccess) {
      onSuccess(citaData);
    }

    // Mostrar el simulador de email después de un breve delay
    setTimeout(() => {
      setShowEmailSimulator(true);
    }, 1000);

    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canContinue = () => {
    switch (currentStep) {
      case 1: return nuevaCita.servicioId !== null;
      case 2: return nuevaCita.barbero !== '';
      case 3: return nuevaCita.fecha !== '';
      case 4: return nuevaCita.hora !== '';
      default: return false;
    }
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

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Si se debe mostrar el simulador de email, renderizarlo
  if (showEmailSimulator && citaCompletada && clienteInfo) {
    return (
      <EmailSimulatorCita
        citaData={citaCompletada}
        clienteInfo={clienteInfo}
        onClose={() => {
          setShowEmailSimulator(false);
          setCitaCompletada(null);
        }}
      />
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] overflow-y-auto bg-gray-darkest border-gray-dark p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white-primary flex items-center space-x-2">
            <Calendar className="w-6 h-6 text-orange-primary" />
            <span>Agendar Nueva Cita</span>
          </DialogTitle>
          <DialogDescription className="text-gray-lightest">
            Completa la información de la cita para registrarla en el sistema
          </DialogDescription>
        </DialogHeader>

        {/* Información del Cliente (Precargada) */}
        <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
          <div className="flex items-center space-x-2 mb-2">
            <User className="w-4 h-4 text-orange-primary" />
            <span className="text-orange-primary font-semibold">Información del Cliente</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-white-primary mb-1">Cliente</label>
              <Input
                value={clienteInfo?.nombre || ''}
                readOnly
                className="elegante-input bg-gray-medium cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-white-primary mb-1">Teléfono</label>
              <Input
                value={clienteInfo?.telefono || ''}
                readOnly
                className="elegante-input bg-gray-medium cursor-not-allowed"
              />
            </div>
          </div>
        </div>

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
          {/* Paso 1: Seleccionar Servicio */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Detalles del Servicio</h3>
                <p className="text-gray-lightest">Selecciona el servicio que deseas agendar</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-white-primary">Servicio</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto custom-scrollbar">
                  {serviciosIndividuales.map((servicio) => (
                    <button
                      key={servicio.id}
                      onClick={() => setNuevaCita(prev => ({
                        ...prev,
                        servicio: servicio.nombre,
                        servicioId: servicio.id
                      }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${nuevaCita.servicioId === servicio.id
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
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar Barbero */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Programación de la Cita</h3>
                <p className="text-gray-lightest">Selecciona el barbero de tu preferencia</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-white-primary">Barbero</label>
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
                            <div className="px-2 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
                              Disponible
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
            </div>
          )}

          {/* Paso 3: Seleccionar Fecha */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Programación de la Cita</h3>
                <p className="text-gray-lightest">Elige la fecha de tu cita</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-white-primary">Fecha</label>
                <div className="bg-gray-darkest rounded-lg border border-gray-dark p-4">
                  {/* Calendar Header */}
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={prevMonth}
                      className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4 text-orange-primary" />
                    </button>
                    <h4 className="text-lg font-semibold text-white-primary">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h4>
                    <button
                      onClick={nextMonth}
                      className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium transition-colors"
                    >
                      <ChevronRight className="w-4 h-4 text-orange-primary" />
                    </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-gray-lightest">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {/* Empty cells for days before month start */}
                    {Array.from({ length: getFirstDayOfMonth(currentMonth) }, (_, i) => (
                      <div key={i} className="p-2"></div>
                    ))}

                    {/* Calendar days */}
                    {Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => {
                      const day = i + 1;
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const isAvailable = isDateAvailable(day);
                      const isSelected = selectedDate && formatDate(date) === formatDate(selectedDate);

                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (isAvailable) {
                              setSelectedDate(date);
                              setNuevaCita(prev => ({ ...prev, fecha: formatDate(date) }));
                            }
                          }}
                          disabled={!isAvailable}
                          className={`p-2 text-sm rounded-lg transition-all duration-300 ${isSelected
                              ? 'bg-orange-primary text-black-primary font-bold'
                              : isAvailable
                                ? 'text-white-primary hover:bg-gray-darker'
                                : 'text-gray-medium cursor-not-allowed'
                            }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Paso 4: Seleccionar Hora */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Programación de la Cita</h3>
                <p className="text-gray-lightest">Selecciona la hora de tu cita</p>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-white-primary">Hora</label>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {horariosDisponibles.map((hora) => (
                    <button
                      key={hora}
                      onClick={() => setNuevaCita(prev => ({ ...prev, hora }))}
                      className={`p-3 rounded-lg border-2 text-center transition-all duration-300 ${nuevaCita.hora === hora
                          ? 'border-orange-primary bg-orange-primary text-black-primary font-bold'
                          : 'border-gray-medium bg-gray-darkest text-white-primary hover:border-orange-primary'
                        }`}
                    >
                      <div className="font-semibold">{hora}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-white-primary mb-2">
                    Duración (minutos)
                  </label>
                  <Input
                    value={getServicioSeleccionado()?.duracion || 60}
                    readOnly
                    className="elegante-input bg-gray-medium cursor-not-allowed max-w-32"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Paso 5: Precio, Estado y Notas */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-white-primary mb-2">Precio y Estado</h3>
                <p className="text-gray-lightest">Revisa los detalles finales de tu cita</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white-primary mb-2">Precio (COP)</label>
                  <Input
                    value={getServicioSeleccionado()?.precio || 0}
                    readOnly
                    className="elegante-input bg-gray-medium cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white-primary mb-2">Estado Inicial</label>
                  <Input
                    value="Pendiente"
                    readOnly
                    className="elegante-input bg-gray-medium cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white-primary mb-2">Notas Adicionales</label>
                <textarea
                  value={nuevaCita.notas}
                  onChange={(e) => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                  placeholder="Escribe aquí cualquier nota especial sobre la cita, preferencias del cliente, alergias, etc..."
                  className="w-full p-3 rounded-lg bg-gray-darker border border-gray-dark text-white-primary placeholder-gray-light focus:border-orange-primary focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* Resumen de la cita */}
              <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                <h4 className="text-lg font-semibold text-white-primary mb-3">Resumen de la Cita</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Cliente:</span>
                    <span className="text-white-primary font-medium">{clienteInfo?.nombre || 'Sin nombre'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Servicio:</span>
                    <span className="text-white-primary font-medium">{nuevaCita.servicio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Barbero:</span>
                    <span className="text-white-primary font-medium">{nuevaCita.barbero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Fecha:</span>
                    <span className="text-white-primary font-medium">{nuevaCita.fecha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Hora:</span>
                    <span className="text-white-primary font-medium">{nuevaCita.hora}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Precio:</span>
                    <span className="text-orange-primary font-bold">
                      {formatearPrecio(getServicioSeleccionado()?.precio || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-dark">
          <div className="flex space-x-2">
            <Button
              onClick={handleClose}
              variant="outline"
              className="elegante-button-secondary"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>

            {currentStep > 1 && (
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                variant="outline"
                className="elegante-button-secondary"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>
            )}
          </div>

          {currentStep < 5 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canContinue()}
              className="elegante-button-primary"
            >
              Siguiente
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="elegante-button-primary"
            >
              <Check className="w-4 h-4 mr-2" />
              Agendar Cita
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
