import { useState } from "react";
import { Calendar, Clock, User, Phone, Mail, MapPin, ChevronLeft, ChevronRight, Plus, AlertTriangle } from "lucide-react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";

const barberos = [
  { id: "1", nombre: "Miguel Rodriguez", especialidad: "Corte Clásico y Barba" },
  { id: "2", nombre: "Sofia Martinez", especialidad: "Cortes Modernos y Tinturado" },
  { id: "3", nombre: "Carlos Mendoza", especialidad: "Barba y Bigote" },
];

const servicios = [
  { id: "1", nombre: "Corte de Cabello", precio: 35000, duracion: 45 },
  { id: "2", nombre: "Arreglo de Barba", precio: 20000, duracion: 30 },
  { id: "3", nombre: "Corte + Barba", precio: 50000, duracion: 60 },
  { id: "4", nombre: "Tinturado", precio: 55000, duracion: 90 },
  { id: "5", nombre: "Paquete Premium", precio: 80000, duracion: 120 },
];

// Función para obtener fechas actuales dinámicamente
const getHoy = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getManana = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const getPasadoManana = () => {
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  return dayAfter.toISOString().split('T')[0];
};

// Simulación de citas existentes para validar disponibilidad (actualizado dinámicamente)
const citasExistentesBase = [
  {
    id: 1,
    barbero: "1",
    fecha: getHoy(),
    hora: "09:00",
    duracion: 60,
    cliente: "Juan Pérez"
  },
  {
    id: 2,
    barbero: "1", 
    fecha: getHoy(),
    hora: "11:00",
    duracion: 45,
    cliente: "María García"
  },
  {
    id: 3,
    barbero: "2",
    fecha: getHoy(), 
    hora: "10:00",
    duracion: 90,
    cliente: "Carlos López"
  },
  {
    id: 4,
    barbero: "1",
    fecha: getHoy(),
    hora: "14:00", 
    duracion: 60,
    cliente: "Ana Torres"
  },
  {
    id: 5,
    barbero: "2",
    fecha: getManana(),
    hora: "09:00", 
    duracion: 45,
    cliente: "Roberto Díaz"
  },
  {
    id: 6,
    barbero: "3",
    fecha: getManana(),
    hora: "15:00", 
    duracion: 60,
    cliente: "Lucía Morales"
  },
  {
    id: 7,
    barbero: "1",
    fecha: getPasadoManana(),
    hora: "10:00", 
    duracion: 90,
    cliente: "Fernando Ruiz"
  },
  {
    id: 8,
    barbero: "2",
    fecha: getPasadoManana(),
    hora: "13:00", 
    duracion: 60,
    cliente: "Patricia Silva"
  }
];

const horasDelDia = Array.from({ length: 25 }, (_, i) => 8 + i * 0.5); // 8:00 AM a 8:00 PM
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function ClienteAgendarCitaPageGoogleStyle() {
  const [citasExistentes, setCitasExistentes] = useState(citasExistentesBase);
  const [formData, setFormData] = useState({
    barbero: "",
    servicio: "",
    fecha: "",
    hora: "",
    notas: ""
  });

  const formatHora = (hora: number) => {
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    return `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
  };

  const [currentWeek, setCurrentWeek] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("");
  const [showConflictAlert, setShowConflictAlert] = useState(false);
  const [conflictInfo, setConflictInfo] = useState({ hora: "", cliente: "", barbero: "" });
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [citaConfirmada, setCitaConfirmada] = useState<any>(null);

  // Función para obtener los días de la semana actual
  const getCurrentWeekDays = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + 1 + (currentWeek * 7));
    
    return diasSemana.map((dia, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        dia,
        fecha: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      };
    });
  };

  // Función para verificar si una hora está ocupada
  const isHoraOcupada = (fecha: string, hora: number, barberoId: string, duracionServicio: number = 0) => {
    if (!barberoId) return false;

    return citasExistentes.some(cita => {
      if (cita.barbero !== barberoId || cita.fecha !== fecha) return false;
      
      const horaSplit = cita.hora.split(':');
      const citaHora = parseInt(horaSplit[0]) + (parseInt(horaSplit[1]) / 60);
      const citaFin = citaHora + (cita.duracion / 60);
      const nuevaFin = hora + (duracionServicio / 60);
      
      // Verificar si hay superposición
      return (hora < citaFin && nuevaFin > citaHora);
    });
  };

  // Función para obtener información de conflicto
  const getConflictInfo = (fecha: string, hora: number, barberoId: string) => {
    const horaString = formatHora(hora);
    const cita = citasExistentes.find(c => {
      if (c.barbero !== barberoId || c.fecha !== fecha) return false;
      const hSplit = c.hora.split(':');
      const hNum = parseInt(hSplit[0]) + (parseInt(hSplit[1]) / 60);
      return hNum === hora;
    });
    const barbero = barberos.find(b => b.id === barberoId);
    return cita ? { 
      hora: cita.hora, 
      cliente: cita.cliente,
      barbero: barbero?.nombre || "Barbero desconocido"
    } : null;
  };

  // Función para obtener el cliente que ocupó una hora específica
  const getClienteEnHora = (fecha: string, hora: number, barberoId: string) => {
    const cita = citasExistentes.find(c => {
      if (c.barbero !== barberoId || c.fecha !== fecha) return false;
      const hSplit = c.hora.split(':');
      const hNum = parseInt(hSplit[0]) + (parseInt(hSplit[1]) / 60);
      return hNum === hora;
    });
    return cita?.cliente || null;
  };

  // Función para manejar clic en celda de hora
  const handleCeldaClick = (fecha: string, hora: number) => {
    if (!formData.barbero) {
      toast.error("Por favor selecciona un barbero primero");
      return;
    }

    const selectedService = servicios.find(s => s.id === formData.servicio);
    const duracionServicio = selectedService ? selectedService.duracion : 0;

    if (isHoraOcupada(fecha, hora, formData.barbero, duracionServicio)) {
      const conflict = getConflictInfo(fecha, hora, formData.barbero);
      if (conflict) {
        setConflictInfo(conflict);
        setShowConflictAlert(true);
      }
      return;
    }

    const horaString = formatHora(hora);
    setFormData({
      ...formData,
      fecha,
      hora: horaString
    });
    setSelectedDate(fecha);
    setSelectedHour(horaString);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.barbero || !formData.servicio || !formData.fecha || !formData.hora) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    // Verificar una vez más la disponibilidad antes de confirmar
    const selectedService = servicios.find(s => s.id === formData.servicio);
    const selectedBarberoData = barberos.find(b => b.id === formData.barbero);
    const hSplit = formData.hora.split(':');
    const hora = parseInt(hSplit[0]) + (parseInt(hSplit[1]) / 60);
    
    if (isHoraOcupada(formData.fecha, hora, formData.barbero, selectedService?.duracion || 0)) {
      toast.error("La hora seleccionada ya no está disponible");
      return;
    }

    // Agregar la nueva cita a las citas existentes
    const nuevaCita = {
      id: citasExistentes.length + 1,
      barbero: formData.barbero,
      fecha: formData.fecha,
      hora: formData.hora,
      duracion: selectedService?.duracion || 60,
      cliente: "Tú" // En producción, usar el nombre del usuario autenticado
    };
    setCitasExistentes([...citasExistentes, nuevaCita]);

    // Preparar información de la cita confirmada para el alert
    setCitaConfirmada({
      barbero: selectedBarberoData?.nombre || "Barbero",
      barberoEspecialidad: selectedBarberoData?.especialidad || "",
      servicio: selectedService?.nombre || "Servicio",
      precio: selectedService?.precio || 0,
      duracion: selectedService?.duracion || 0,
      fecha: formData.fecha,
      hora: formData.hora,
      notas: formData.notas
    });

    // Mostrar alert de confirmación
    setShowSuccessAlert(true);

    // Reset form
    setFormData({
      barbero: "",
      servicio: "",
      fecha: "",
      hora: "",
      notas: ""
    });
    setSelectedDate("");
    setSelectedHour("");
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('es-CO');
  };

  const selectedService = servicios.find(s => s.id === formData.servicio);
  const selectedBarbero = barberos.find(b => b.id === formData.barbero);
  const weekDays = getCurrentWeekDays();

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Agendar Nueva Cita</h1>
            <p className="text-sm text-gray-lightest mt-1">Selecciona la fecha y hora que mejor te convengan</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Formulario de Selección - Columna Izquierda */}
            <div className="xl:col-span-1">
              <div className="elegante-card">
                <h2 className="text-xl font-semibold text-white-primary mb-6">Configuración de la Cita</h2>
                
                <form className="space-y-6">
                  {/* Selección de Barbero */}
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <User className="w-4 h-4 text-orange-primary" />
                      Barbero *
                    </Label>
                    <Select value={formData.barbero} onValueChange={(value) => {
                      setFormData({...formData, barbero: value, fecha: "", hora: ""});
                      setSelectedDate("");
                      setSelectedHour("");
                    }}>
                      <SelectTrigger className="elegante-input">
                        <SelectValue placeholder="Selecciona un barbero" />
                      </SelectTrigger>
                      <SelectContent>
                        {barberos.map((barbero) => (
                          <SelectItem key={barbero.id} value={barbero.id}>
                            <div>
                              <div className="font-medium">{barbero.nombre}</div>
                              <div className="text-xs text-gray-lightest">{barbero.especialidad}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Selección de Servicio */}
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-primary" />
                      Servicio *
                    </Label>
                    <Select value={formData.servicio} onValueChange={(value) => {
                      setFormData({...formData, servicio: value, fecha: "", hora: ""});
                      setSelectedDate("");
                      setSelectedHour("");
                    }}>
                      <SelectTrigger className="elegante-input">
                        <SelectValue placeholder="Selecciona un servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {servicios.map((servicio) => (
                          <SelectItem key={servicio.id} value={servicio.id}>
                            <div className="flex justify-between items-center w-full">
                              <div>
                                <div className="font-medium">{servicio.nombre}</div>
                                <div className="text-xs text-gray-lightest">{servicio.duracion} min</div>
                              </div>
                              <div className="text-orange-primary font-medium ml-4">
                                ${formatCurrency(servicio.precio)}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notas Adicionales */}
                  <div className="space-y-2">
                    <Label className="text-white-primary">
                      Notas Adicionales (Opcional)
                    </Label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      className="elegante-input min-h-[100px] resize-none"
                      placeholder="Especifica alguna preferencia..."
                    />
                  </div>

                  {/* Botón de Confirmación */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={!formData.barbero || !formData.servicio || !formData.fecha || !formData.hora}
                      className="elegante-button-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar Cita
                    </button>
                  </div>
                </form>
              </div>

              {/* Resumen de Selección */}
              {(selectedService || selectedBarbero || formData.fecha || formData.hora) && (
                <div className="elegante-card mt-6">
                  <h3 className="text-lg font-semibold text-white-primary mb-4">
                    Resumen de tu Cita
                  </h3>
                  <div className="space-y-4">
                    {selectedBarbero && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Barbero</p>
                        <p className="text-white-primary font-medium">{selectedBarbero.nombre}</p>
                        <p className="text-gray-lightest text-sm">{selectedBarbero.especialidad}</p>
                      </div>
                    )}
                    
                    {selectedService && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Servicio</p>
                        <p className="text-white-primary font-medium">{selectedService.nombre}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-gray-lightest text-sm">{selectedService.duracion} min</p>
                          <p className="text-orange-primary font-medium">${formatCurrency(selectedService.precio)}</p>
                        </div>
                      </div>
                    )}
                    
                    {formData.fecha && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Fecha</p>
                        <p className="text-white-primary font-medium">
                          {new Date(formData.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                    
                    {formData.hora && (
                      <div>
                        <p className="text-xs text-gray-lightest uppercase tracking-wide">Hora</p>
                        <p className="text-white-primary font-medium">{formData.hora}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Calendario Estilo Google - Columna Derecha */}
            <div className="xl:col-span-3">
              <div className="elegante-card">
                {/* Header del Calendario */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-white-primary">Seleccionar Fecha y Hora</h2>
                  
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setCurrentWeek(currentWeek - 1)}
                      className="elegante-button-secondary p-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    
                    <h3 className="text-lg font-semibold text-white-primary min-w-[120px] text-center">
                      Semana {currentWeek === 0 ? 'Actual' : 
                        currentWeek > 0 ? `+${currentWeek}` : currentWeek}
                    </h3>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentWeek(0)}
                        className="elegante-button-secondary text-sm"
                      >
                        Hoy
                      </button>
                      <button
                        onClick={() => setCurrentWeek(currentWeek + 1)}
                        className="elegante-button-secondary p-2"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Instrucciones */}
                {!formData.barbero && (
                  <div className="bg-orange-primary/10 border border-orange-primary rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-primary" />
                      <p className="text-orange-primary font-medium">
                        Selecciona un barbero y servicio para ver la disponibilidad
                      </p>
                    </div>
                  </div>
                )}

                {/* Vista Semanal estilo Google Calendar */}
                {formData.barbero && (
                  <div className="overflow-x-auto">
                    <div className="min-w-[800px]">
                      {/* Header de días */}
                      <div className="grid grid-cols-7 gap-1 mb-4 border-b border-gray-dark pb-4">
                        {weekDays.map(({ dia, fecha, displayDate }) => (
                          <div key={dia} className="text-center">
                            <h4 className="font-semibold text-white-primary">{dia}</h4>
                            <p className="text-xs text-gray-lightest">{displayDate}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {horasDelDia.map((hora) => (
                          <div key={hora} className="grid grid-cols-7 gap-1 h-12">
                            {weekDays.map(({ dia, fecha }) => {
                              const isOcupada = isHoraOcupada(fecha, hora, formData.barbero, selectedService?.duracion || 0);
                              const isSelected = selectedDate === fecha && selectedHour === formatHora(hora);
                              const isDisabled = !formData.servicio;
                              const clienteEnHora = getClienteEnHora(fecha, hora, formData.barbero);
                              
                              return (
                                <div 
                                  key={`${dia}-${hora}`} 
                                  className={`relative rounded border transition-all duration-200 flex flex-col items-center justify-center text-sm cursor-pointer group ${
                                    isSelected
                                      ? 'bg-orange-primary border-orange-primary text-black-primary font-medium'
                                      : isOcupada
                                      ? 'bg-red-900/30 border-red-700 text-red-400 cursor-not-allowed'
                                      : isDisabled
                                      ? 'bg-gray-darker border-gray-dark text-gray-light cursor-not-allowed'
                                      : 'bg-gray-darker border-gray-dark hover:bg-gray-dark hover:border-orange-primary/50 text-white-primary'
                                  }`}
                                  onClick={() => !isDisabled && handleCeldaClick(fecha, hora)}
                                  title={
                                    isDisabled 
                                      ? "Selecciona un servicio"
                                      : isOcupada 
                                      ? `Hora ocupada - ${clienteEnHora}` 
                                      : `Agendar cita para ${dia} a las ${formatHora(hora)}`
                                  }
                                >
                                  {/* Indicador de hora y estado */}
                                  {!isOcupada && (
                                    <span className="text-xs">
                                      {formatHora(hora)}
                                    </span>
                                  )}
                                  
                                  {/* Overlay para celdas disponibles */}
                                  {!isOcupada && !isDisabled && !isSelected && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <Plus className="w-4 h-4 text-orange-primary" />
                                    </div>
                                  )}
                                  
                                  {/* Indicador de ocupado con información del cliente */}
                                  {isOcupada && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-1">
                                      <span className="text-xs font-medium leading-tight">Ocupado</span>
                                      {clienteEnHora && (
                                        <span className="text-xs opacity-80 truncate w-full text-center leading-tight mt-0.5">
                                          {clienteEnHora}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Leyenda */}
                <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-gray-dark">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-darker border border-gray-dark rounded"></div>
                    <span className="text-sm text-gray-lightest">Disponible</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-primary rounded"></div>
                    <span className="text-sm text-gray-lightest">Seleccionado</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-900/30 border border-red-700 rounded"></div>
                    <span className="text-sm text-gray-lightest">Ocupado</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Alert Dialog para Conflictos */}
      <AlertDialog open={showConflictAlert} onOpenChange={setShowConflictAlert}>
        <AlertDialogContent className="elegante-card max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Horario No Disponible
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              <div className="space-y-4 mt-4">
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                  <p className="text-white-primary mb-3">
                    Lo sentimos, este horario ya está ocupado:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Barbero:</span>
                      <span className="text-white-primary font-medium">{conflictInfo.barbero}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Cliente:</span>
                      <span className="text-white-primary font-medium">{conflictInfo.cliente}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Hora:</span>
                      <span className="text-white-primary font-medium">{conflictInfo.hora}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-orange-primary/10 border border-orange-primary/30 rounded-lg p-3">
                  <p className="text-orange-primary text-sm flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>
                      Por favor selecciona otro horario disponible en el calendario. 
                      Los horarios en <span className="font-medium">gris</span> están disponibles para agendar.
                    </span>
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowConflictAlert(false)}
              className="elegante-button-primary w-full"
            >
              Entendido, seleccionar otro horario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog de Confirmación Exitosa */}
      <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
        <AlertDialogContent className="elegante-card max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary flex items-center gap-3">
              <div className="w-12 h-12 bg-green-600/20 border border-green-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span>¡Cita Agendada Exitosamente!</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              {citaConfirmada && (
                <div className="space-y-4 mt-4">
                  {/* Mensaje de éxito */}
                  <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
                    <p className="text-white-primary text-center mb-1">
                      Tu cita ha sido registrada correctamente
                    </p>
                    <p className="text-gray-lightest text-sm text-center">
                      Recibirás un recordatorio antes de tu cita
                    </p>
                  </div>

                  {/* Detalles de la cita */}
                  <div className="bg-gray-darker border border-gray-dark rounded-lg p-5">
                    <h4 className="text-white-primary font-semibold mb-4 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-primary" />
                      Detalles de tu Cita
                    </h4>
                    
                    <div className="space-y-3">
                      {/* Fecha y Hora */}
                      <div className="flex items-start justify-between pb-3 border-b border-gray-dark">
                        <div className="flex-1">
                          <p className="text-xs text-gray-lightest uppercase tracking-wide mb-1">Fecha y Hora</p>
                          <p className="text-white-primary font-medium">
                            {new Date(citaConfirmada.fecha + 'T00:00:00').toLocaleDateString('es-ES', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-orange-primary font-medium mt-1">
                            {citaConfirmada.hora} ({citaConfirmada.duracion} min)
                          </p>
                        </div>
                        <Clock className="w-5 h-5 text-gray-light mt-1" />
                      </div>

                      {/* Barbero */}
                      <div className="flex items-start justify-between pb-3 border-b border-gray-dark">
                        <div className="flex-1">
                          <p className="text-xs text-gray-lightest uppercase tracking-wide mb-1">Barbero</p>
                          <p className="text-white-primary font-medium">{citaConfirmada.barbero}</p>
                          <p className="text-gray-lightest text-sm">{citaConfirmada.barberoEspecialidad}</p>
                        </div>
                        <User className="w-5 h-5 text-gray-light mt-1" />
                      </div>

                      {/* Servicio */}
                      <div className="flex items-start justify-between pb-3 border-b border-gray-dark">
                        <div className="flex-1">
                          <p className="text-xs text-gray-lightest uppercase tracking-wide mb-1">Servicio</p>
                          <p className="text-white-primary font-medium">{citaConfirmada.servicio}</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-light mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                        </svg>
                      </div>

                      {/* Precio */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs text-gray-lightest uppercase tracking-wide mb-1">Precio Total</p>
                          <p className="text-orange-primary font-semibold text-xl">
                            ${formatCurrency(citaConfirmada.precio)}
                          </p>
                        </div>
                        <svg className="w-5 h-5 text-gray-light mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>

                      {/* Notas si existen */}
                      {citaConfirmada.notas && (
                        <div className="pt-3 border-t border-gray-dark">
                          <p className="text-xs text-gray-lightest uppercase tracking-wide mb-1">Notas</p>
                          <p className="text-white-primary text-sm">{citaConfirmada.notas}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recordatorio */}
                  <div className="bg-orange-primary/10 border border-orange-primary/30 rounded-lg p-3">
                    <p className="text-orange-primary text-sm text-center">
                      💡 Por favor llega 5 minutos antes de tu cita
                    </p>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => {
                setShowSuccessAlert(false);
                setCitaConfirmada(null);
              }}
              className="elegante-button-primary w-full"
            >
              Perfecto, entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
