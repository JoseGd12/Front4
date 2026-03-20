import { useState } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import { Calendar, Clock, User, ChevronLeft, ChevronRight, AlertTriangle, Filter, Eye, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horasDelDia = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 AM a 9:00 PM

// Datos de horarios semanales de barberos
const horariosData = [
  {
    id: 1,
    barbero: "Miguel Rodriguez",
    diaSemana: "Lunes",
    horaInicio: "08:00",
    horaFin: "17:00",
    activo: true,
    color: "#3B82F6",
    citas: [
      { hora: "09:00", cliente: "Carlos Mendez", ocupado: true },
      { hora: "11:00", cliente: "José Torres", ocupado: true },
      { hora: "14:00", cliente: "Ana García", ocupado: true }
    ]
  },
  {
    id: 2,
    barbero: "Sofia Martinez",
    diaSemana: "Lunes",
    horaInicio: "09:00",
    horaFin: "18:00",
    activo: true,
    color: "#8B5CF6",
    citas: [
      { hora: "10:30", cliente: "María López", ocupado: true },
      { hora: "15:00", cliente: "Laura Ramírez", ocupado: true }
    ]
  },
  {
    id: 3,
    barbero: "Miguel Rodriguez",
    diaSemana: "Martes",
    horaInicio: "08:00",
    horaFin: "17:00",
    activo: true,
    color: "#3B82F6",
    citas: [
      { hora: "10:00", cliente: "Pedro Sánchez", ocupado: true }
    ]
  },
  {
    id: 4,
    barbero: "Sofia Martinez",
    diaSemana: "Martes",
    horaInicio: "09:00",
    horaFin: "18:00",
    activo: true,
    color: "#8B5CF6",
    citas: []
  },
  {
    id: 5,
    barbero: "Carlos Ruiz",
    diaSemana: "Miércoles",
    horaInicio: "08:00",
    horaFin: "16:00",
    activo: true,
    color: "#10B981",
    citas: [
      { hora: "09:00", cliente: "Diana Torres", ocupado: true },
      { hora: "12:00", cliente: "Roberto Díaz", ocupado: true }
    ]
  },
  {
    id: 6,
    barbero: "Miguel Rodriguez",
    diaSemana: "Jueves",
    horaInicio: "08:00",
    horaFin: "17:00",
    activo: true,
    color: "#3B82F6",
    citas: [
      { hora: "08:00", cliente: "Andrés Morales", ocupado: true },
      { hora: "13:00", cliente: "Sofía Vargas", ocupado: true }
    ]
  },
  {
    id: 7,
    barbero: "Ana Herrera",
    diaSemana: "Viernes",
    horaInicio: "10:00",
    horaFin: "19:00",
    activo: true,
    color: "#F59E0B",
    citas: [
      { hora: "11:00", cliente: "Jorge Martínez", ocupado: true },
      { hora: "16:00", cliente: "Patricia Gómez", ocupado: true }
    ]
  },
  {
    id: 8,
    barbero: "Miguel Rodriguez",
    diaSemana: "Sábado",
    horaInicio: "09:00",
    horaFin: "15:00",
    activo: true,
    color: "#3B82F6",
    citas: [
      { hora: "09:00", cliente: "Luis Hernández", ocupado: true },
      { hora: "11:00", cliente: "Carmen Silva", ocupado: true },
      { hora: "13:00", cliente: "Miguel Ángel", ocupado: true }
    ]
  }
];

const barberos = ["Miguel Rodriguez", "Sofia Martinez", "Carlos Ruiz", "Ana Herrera"];

export function ClienteHorariosPageCalendar() {
  const { success, error, AlertContainer } = useCustomAlert();
  const [horarios, setHorarios] = useState(horariosData);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [filterBarbero, setFilterBarbero] = useState("all");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedHorario, setSelectedHorario] = useState<any>(null);
  const [isOccupiedAlertOpen, setIsOccupiedAlertOpen] = useState(false);
  const [occupiedInfo, setOccupiedInfo] = useState<any>(null);

  const getMondayOfWeek = (weekOffset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const getCurrentWeekDays = () => {
    const monday = getMondayOfWeek(currentWeek);
    return diasSemana.map((dia, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        dia,
        fecha: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      };
    });
  };

  const getHorariosPorDia = (dia: string) => {
    const filteredHorarios = horarios.filter(h => {
      const matchesDia = h.diaSemana === dia;
      const matchesBarbero = filterBarbero === "all" || h.barbero === filterBarbero;
      return matchesDia && matchesBarbero && h.activo;
    });
    return filteredHorarios;
  };

  // Verificar si una hora está ocupada para un barbero específico
  const isHoraOcupada = (horario: any, hora: number) => {
    const horaString = hora.toString().padStart(2, '0') + ':00';
    const cita = horario.citas?.find((c: any) => c.hora === horaString && c.ocupado);
    return cita;
  };

  // Verificar si una hora está dentro del rango de trabajo del barbero
  const isHoraDentroDeRango = (horario: any, hora: number) => {
    const horaInicio = parseInt(horario.horaInicio.split(':')[0]);
    const horaFin = parseInt(horario.horaFin.split(':')[0]);
    return hora >= horaInicio && hora < horaFin;
  };

  // Manejar clic en una celda del calendario
  const handleCeldaClick = (dia: string, hora: number, horario: any) => {
    const horaString = hora.toString().padStart(2, '0') + ':00';
    
    // Verificar si está dentro del rango de trabajo
    if (!isHoraDentroDeRango(horario, hora)) {
      error("Fuera de horario", `${horario.barbero} no trabaja a las ${horaString} los ${dia}s.`);
      return;
    }

    // Verificar si la hora está ocupada
    const citaOcupada = isHoraOcupada(horario, hora);
    if (citaOcupada) {
      setOccupiedInfo({
        barbero: horario.barbero,
        dia: dia,
        hora: horaString,
        cliente: citaOcupada.cliente
      });
      setIsOccupiedAlertOpen(true);
      return;
    }

    // Si está disponible, mostrar información del horario
    setSelectedHorario({
      ...horario,
      diaSeleccionado: dia,
      horaSeleccionada: horaString
    });
    setIsDetailDialogOpen(true);
  };

  // Función para agendar cita (simulación)
  const handleAgendarCita = () => {
    if (!selectedHorario) return;
    
    success(
      "¡Disponible para agendar!", 
      `Puedes agendar una cita con ${selectedHorario.barbero} el ${selectedHorario.diaSeleccionado} a las ${selectedHorario.horaSeleccionada}.`
    );
    setIsDetailDialogOpen(false);
  };

  const weekDays = getCurrentWeekDays();

  return (
    <>
      <AlertContainer />

      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white-primary">Horarios de Barberos</h1>
            <p className="text-sm text-gray-lightest mt-1">
              Visualiza la disponibilidad de nuestros barberos
            </p>
          </div>
          
          {/* Filtro de barberos */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-orange-primary" />
              <select
                value={filterBarbero}
                onChange={(e) => setFilterBarbero(e.target.value)}
                className="elegante-input px-3 py-2"
              >
                <option value="all">Todos los barberos</option>
                {barberos.map((barbero) => (
                  <option key={barbero} value={barbero}>
                    {barbero}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="p-8">
        {/* Navegación de semana */}
        <div className="elegante-card mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentWeek(currentWeek - 1)}
              className="p-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white-primary" />
            </button>
            
            <div className="text-center">
              <h2 className="text-white-primary">
                {currentWeek === 0 ? 'Semana Actual' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
              </h2>
              <p className="text-sm text-gray-lightest">
                {weekDays[0].fecha} - {weekDays[6].fecha}
              </p>
            </div>

            <button
              onClick={() => setCurrentWeek(currentWeek + 1)}
              className="p-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white-primary" />
            </button>
          </div>
        </div>

        {/* Leyenda */}
        <div className="elegante-card mb-6">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-lightest">Disponible</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-lightest">Ocupado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-600 rounded"></div>
              <span className="text-sm text-gray-lightest">Fuera de horario</span>
            </div>
          </div>
        </div>

        {/* Calendario semanal */}
        <div className="elegante-card overflow-x-auto">
          <div className="min-w-[1200px]">
            {/* Header de días */}
            <div className="grid grid-cols-8 border-b border-gray-dark">
              <div className="p-4 border-r border-gray-dark">
                <span className="text-gray-lightest">Hora</span>
              </div>
              {weekDays.map((day, index) => (
                <div key={index} className="p-4 text-center border-r border-gray-dark last:border-r-0">
                  <div className="text-white-primary">{day.dia}</div>
                  <div className="text-sm text-gray-lightest">{day.fecha}</div>
                </div>
              ))}
            </div>

            {/* Grid de horas */}
            <div>
              {horasDelDia.map((hora) => (
                <div key={hora} className="grid grid-cols-8 border-b border-gray-dark last:border-b-0">
                  {/* Columna de hora */}
                  <div className="p-4 border-r border-gray-dark flex items-center">
                    <span className="text-gray-lightest">
                      {hora.toString().padStart(2, '0')}:00
                    </span>
                  </div>

                  {/* Columnas de días */}
                  {diasSemana.map((dia, diaIndex) => {
                    const horariosDelDia = getHorariosPorDia(dia);
                    
                    return (
                      <div 
                        key={diaIndex} 
                        className="border-r border-gray-dark last:border-r-0 min-h-[64px] relative"
                      >
                        {horariosDelDia.map((horario, horarioIndex) => {
                          const dentroDeRango = isHoraDentroDeRango(horario, hora);
                          const horaOcupada = isHoraOcupada(horario, hora);
                          
                          return (
                            <div
                              key={horarioIndex}
                              onClick={() => handleCeldaClick(dia, hora, horario)}
                              className={`
                                h-16 cursor-pointer transition-all border-b border-gray-darkest
                                ${dentroDeRango 
                                  ? horaOcupada 
                                    ? 'bg-red-900/30 hover:bg-red-900/50' 
                                    : 'bg-green-900/30 hover:bg-green-900/50'
                                  : 'bg-gray-800/20 cursor-not-allowed'
                                }
                              `}
                              title={
                                dentroDeRango
                                  ? horaOcupada
                                    ? `Ocupado - ${horaOcupada.cliente}`
                                    : `Disponible - ${horario.barbero}`
                                  : `Fuera de horario - ${horario.barbero}`
                              }
                            >
                              {dentroDeRango && (
                                <div className="p-2 h-full flex flex-col justify-center">
                                  <div className="text-xs text-white-primary truncate">
                                    {horario.barbero.split(' ')[0]}
                                  </div>
                                  {horaOcupada && (
                                    <div className="text-xs text-red-400 truncate">
                                      Ocupado
                                    </div>
                                  )}
                                  {!horaOcupada && (
                                    <div className="text-xs text-green-400 truncate">
                                      Disponible
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Información de horarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {barberos.map((barbero) => {
            const horariosDelBarbero = horarios.filter(h => h.barbero === barbero && h.activo);
            const totalCitas = horariosDelBarbero.reduce((acc, h) => acc + (h.citas?.length || 0), 0);
            
            return (
              <div key={barbero} className="elegante-card">
                <div className="flex items-center gap-3 mb-3">
                  <User className="w-5 h-5 text-orange-primary" />
                  <h3 className="text-white-primary">{barbero}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-lightest">Días laborales:</span>
                    <span className="text-white-primary">{horariosDelBarbero.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-lightest">Citas agendadas:</span>
                    <span className="text-white-primary">{totalCitas}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Dialog de detalle de horario disponible */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-primary" />
              Horario Disponible
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Información del horario seleccionado
            </DialogDescription>
          </DialogHeader>

          {selectedHorario && (
            <div className="space-y-4 py-4">
              <div className="elegante-card">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Barbero:</span>
                    <span className="text-white-primary">{selectedHorario.barbero}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Día:</span>
                    <span className="text-white-primary">{selectedHorario.diaSeleccionado}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Hora:</span>
                    <span className="text-white-primary">{selectedHorario.horaSeleccionada}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Horario laboral:</span>
                    <span className="text-white-primary">
                      {selectedHorario.horaInicio} - {selectedHorario.horaFin}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Estado:</span>
                    <span className="text-green-400">✓ Disponible</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAgendarCita}
                  className="elegante-button-primary flex-1"
                >
                  Agendar Cita
                </button>
                <button
                  onClick={() => setIsDetailDialogOpen(false)}
                  className="elegante-button-secondary flex-1"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert de hora ocupada */}
      <AlertDialog open={isOccupiedAlertOpen} onOpenChange={setIsOccupiedAlertOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Horario No Disponible
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              {occupiedInfo && (
                <div className="space-y-2 mt-4">
                  <p>El horario seleccionado ya está ocupado:</p>
                  <div className="elegante-card mt-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-lightest">Barbero:</span>
                        <span className="text-white-primary">{occupiedInfo.barbero}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-lightest">Día:</span>
                        <span className="text-white-primary">{occupiedInfo.dia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-lightest">Hora:</span>
                        <span className="text-white-primary">{occupiedInfo.hora}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-lightest">Cliente:</span>
                        <span className="text-white-primary">{occupiedInfo.cliente}</span>
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm">
                    Por favor selecciona otro horario disponible.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setIsOccupiedAlertOpen(false)}
              className="elegante-button-primary"
            >
              Entendido
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
