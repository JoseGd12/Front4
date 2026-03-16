import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  AlertTriangle,
  CheckCircle,
  Phone,
  MoreVertical,
  Search,
  CheckCircle2,
  CalendarDays,
  Package
} from "lucide-react";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Input } from "../../../shared/components/ui/input";
import { Textarea } from "../../../shared/components/ui/textarea";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { horariosService } from "../../agendamiento/services/horariosService";

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horasDelDia = Array.from({ length: 29 }, (_, i) => 9 + i * 0.5); // 9:00 AM a 11:00 PM

const formatHora12 = (hora: number): string => {
  const h = Math.floor(hora);
  const m = (hora % 1) * 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const minutesStr = m === 0 ? '00' : '30';
  return `${h12}:${minutesStr} ${ampm}`;
};

const estados = [
  { value: "Pendiente", label: "Pendiente", color: "bg-orange-primary" },
  { value: "Confirmada", label: "Confirmada", color: "bg-orange-primary text-black-primary" },
  { value: "En Proceso", label: "En Proceso", color: "bg-green-600" },
  { value: "Completada", label: "Completada", color: "bg-blue-600" },
  { value: "Cancelada", label: "Cancelada", color: "bg-red-600" }
];

const formatearPrecio = (precio: any): string => {
  const p = Number(precio) || 0;
  const precioEntero = Math.round(p);
  return `$ ${precioEntero.toLocaleString('es-CO')}`;
};

const getCitaColor = (estado: string) => {
  switch (estado) {
    case 'Confirmada': return '#d8b081';
    case 'En Proceso': return '#22C55E';
    case 'Completada': return '#3B82F6';
    case 'Cancelada': return '#EF4444';
    case 'Pendiente': return '#d8b081';
    default: return '#d8b081';
  }
};

interface ClienteMisCitasPageCalendarProps {
  initialItem?: any;
  onClearInitialItem?: () => void;
}

export function ClienteMisCitasPageCalendar({ initialItem, onClearInitialItem }: ClienteMisCitasPageCalendarProps) {
  const { user } = useAuth();
  const { success, error, AlertContainer } = useCustomAlert();
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCliente, setCurrentCliente] = useState<any>(null);

  // Listas para los selects
  const [serviciosList, setServiciosList] = useState<any[]>([]);
  const [paquetesList, setPaquetesList] = useState<any[]>([]);
  const [barberosList, setBarberosList] = useState<any[]>([]);
  const [horariosList, setHorariosList] = useState<any[]>([]);

  const [currentWeek, setCurrentWeek] = useState(0);

  // Cargar datos al montar
  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      if (!user?.email) {
        setIsLoading(false);
        return;
      }

      const allClientes = await clientesService.getClientes();
      const cliente = allClientes.find(c => (c.correo || '').toLowerCase() === user.email.toLowerCase());

      if (!cliente) {
        error("Error de perfil", "No se encontró tu perfil de cliente en el sistema.");
        setIsLoading(false);
        return;
      }

      console.log("Cargando datos para cliente ID:", cliente.id);
      setCurrentCliente(cliente);

      let citasData: any[] = [];
      try {
        citasData = await agendamientoService.getAgendamientosByClienteId(Number(cliente.id));
      } catch (apiErr: any) {
        console.warn("Endpoint específico de cliente no encontrado, filtrando todos los agendamientos:", apiErr);
        const allCitas = await agendamientoService.getAgendamientos();
        citasData = allCitas.filter(c => Number(c.clienteId) === Number(cliente.id));
      }

      const [barberosData, serviciosData, paquetesData, horariosData] = await Promise.all([
        barberosService.getBarberos().catch(() => []),
        servicioService.getServicios().catch(() => []),
        apiService.getPaquetes().catch(() => []),
        horariosService.getHorarios().catch(() => [])
      ]);

      console.log("Datos recibidos:", {
        citas: citasData.length,
        barberos: barberosData.length,
        servicios: serviciosData.length,
        paquetes: paquetesData.length,
        horarios: horariosData.length
      });

      setCitas(citasData);

      const isRecordActive = (item: any) => {
        if (!item) return false;
        const val = item.estado !== undefined ? item.estado : (item.activo !== undefined ? item.activo : true);
        return val === true || val === 1 || val === 'true' || val === 'Active' || val === 'Activo';
      };

      const barberosConHorarioActivo = new Set(
        (Array.isArray(horariosData) ? horariosData : [])
          .filter(h => isRecordActive(h))
          .map((h: any) => Number(h.barberoId))
      );

      const filteredBarberos = (Array.isArray(barberosData) ? barberosData : []).filter((b: any) => {
        return isRecordActive(b) && barberosConHorarioActivo.has(Number(b.id));
      });

      console.log("Barberos filtrados (activos y con horario):", filteredBarberos.length);
      setBarberosList(filteredBarberos);

      setServiciosList((Array.isArray(serviciosData) ? serviciosData : []).filter(s => isRecordActive(s)));
      setPaquetesList((Array.isArray(paquetesData) ? paquetesData : []).filter(p => isRecordActive(p)));
      setHorariosList(horariosData || []);

      // Si venimos con un item pre-seleccionado desde Servicios
      if (initialItem) {
        handleSelectInitialItem(initialItem, serviciosData, paquetesData);
      }
    } catch (err) {
      console.error("Error al cargar datos:", err);
      error("Error de carga", "No se pudieron sincronizar los datos. Verifica tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  // Estados para modales
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [citaToDelete, setCitaToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [nuevaCita, setNuevaCita] = useState({
    barberoId: 0,
    barbero: '', // Almacenar nombre para el autocomplete
    servicioId: null as number | null,
    paqueteId: null as number | null,
    servicio: '',
    fecha: '',
    hora: '',
    notas: '',
    duracion: 60,
    precio: 0,
    estado: 'Pendiente'
  });

  const [barberoFormSearchTerm, setBarberoFormSearchTerm] = useState('');
  const [showBarberoFormResults, setShowBarberoFormResults] = useState(false);
  const [showFormErrors, setShowFormErrors] = useState(false);

  const handleSelectInitialItem = (item: any, currentServicios: any[], currentPaquetes: any[]) => {
    setIsEditMode(false);
    const isPaquete = item.type === 'paquete';
    const itemId = item.id;

    let price = 0;
    let duration = 60;

    if (isPaquete) {
      const p = currentPaquetes.find(p => p.id === itemId);
      price = p?.precio || item.precio || 0;
      duration = p?.duracion || item.duracion || 60;
    } else {
      const s = currentServicios.find(s => s.id === itemId);
      price = s?.precio || item.precio || 0;
      duration = s?.duracion || item.duracion || 60;
    }

    const today = new Date();

    // Calcular hora (una hora después: 60 min)
    const future = new Date(today.getTime() + (60 * 60 * 1000));
    let hours = future.getHours();
    let minutes = future.getMinutes();
    let targetDate = today;

    // Redondear minutos al bloque de 30 más cercano (0 o 30)
    if (minutes < 15) {
      minutes = 0;
    } else if (minutes < 45) {
      minutes = 30;
    } else {
      minutes = 0;
      hours += 1;
    }

    // Si la hora calculada es después del cierre (ej: 9:30 PM) o antes de la apertura (9:00 AM)
    // Pasamos al día siguiente a las 11:00 AM como sugerencia ideal
    if (hours >= 22 || (hours === 21 && minutes > 30)) {
      targetDate = new Date(today.getTime() + (24 * 60 * 60 * 1000)); // Mañana
      hours = 11;
      minutes = 0;
    } else if (hours < 9) {
      hours = 11; // Si es muy temprano, sugerir también las 11 AM
      minutes = 0;
    }

    const fechaAuto = toLocalDateString(targetDate);
    const horaAuto = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    setNuevaCita({
      barberoId: 0,
      barbero: '',
      servicioId: isPaquete ? null : itemId,
      paqueteId: isPaquete ? itemId : null,
      servicio: item.nombre,
      fecha: fechaAuto,
      hora: horaAuto,
      notas: '',
      duracion: duration,
      precio: price,
      estado: 'Pendiente'
    });

    setIsFormDialogOpen(true);
    if (onClearInitialItem) onClearInitialItem();
  };

  const getMondayOfWeek = (weekOffset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const monday = getMondayOfWeek(currentWeek);
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return {
      dia: diasSemana[i],
      fecha: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
      fechaCompleta: toLocalDateString(date)
    };
  });

  const getCitasEnSlot = (diaFechaCompleta: string, hora: number) => {
    return citas.filter(cita => {
      if (cita.fecha !== diaFechaCompleta) return false;
      const horaSplit = (cita.hora || '').split(':');
      if (horaSplit.length < 2) return false;
      const horaInicio = parseInt(horaSplit[0]) + (parseInt(horaSplit[1]) / 60);
      const horaFin = horaInicio + (cita.duracion || 60) / 60;
      return horaInicio <= hora && hora < horaFin;
    });
  };

  const validarDisponibilidad = (barberoId: number, fecha: string, hora: string, duracion: number, ignoreCitaId?: number): string | null => {
    if (!fecha || !hora) return null;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (fecha < todayStr) return "No puedes agendar en el pasado.";

    const [hh, mm] = hora.split(':').map(Number);
    const startNueva = hh * 60 + mm;
    const endNueva = startNueva + duracion;

    if (fecha === todayStr) {
      const current = today.getHours() * 60 + today.getMinutes();
      // Desactivar si el slot ya pasó por más de 30 minutos (gracia) o requiere 30 min de preaviso
      if (startNueva <= current + 30) return "Debes agendar con al menos 30 minutos de anticipación.";
    }

    // Verificar horario laboral
    const dateObj = new Date(`${fecha}T12:00:00`);
    const dayIndex = dateObj.getDay();
    const dayStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];
    const turnos = horariosList.filter((h: any) => h.barberoId === barberoId && h.dia === dayStr && h.estado);

    if (turnos.length === 0) return `${barberosList.find(b => b.id === barberoId)?.nombre} no trabaja los ${dayStr}.`;

    const enHorario = turnos.some((h: any) => {
      const [hIh, hIm] = h.horaInicio.split(':').map(Number);
      const [hFh, hFm] = h.horaFin.split(':').map(Number);
      return startNueva >= (hIh * 60 + hIm) && endNueva <= (hFh * 60 + hFm);
    });

    if (!enHorario) return "La hora está fuera del horario laboral del barbero.";

    // Solapamiento con cualquier cita del barbero (backend lo valida, pero aquí verificamos las del cliente)
    // El administrador puede ver todas las citas, el cliente solo las suyas. 
    // Para una validación real el backend es el que manda, pero validamos localmente lo que tenemos.
    const solapa = citas.find((cita: any) => {
      if (cita.fecha !== fecha) return false;
      if (Number(cita.barberoId) !== Number(barberoId)) return false;
      if (ignoreCitaId && cita.id === ignoreCitaId) return false;
      if (cita.estado === 'Cancelada') return false;

      const [ch, cm] = (cita.hora || '').split(':').map(Number);
      const startExist = ch * 60 + cm;
      const endExist = startExist + (cita.duracion || 60);

      return startNueva < endExist && startExist < endNueva;
    });

    if (solapa) return "Ese barbero ya tiene una cita en ese horario.";

    return null;
  };

  const getHorasDisponiblesParaDia = (fechaStr: string, barberoId: number, duracion: number) => {
    if (!fechaStr || !barberoId) return [];

    // Obtener el día de la semana
    const fechaObj = new Date(`${fechaStr}T12:00:00`);
    const dayIndex = fechaObj.getDay(); // 0=Domingo..6=Sábado
    const diaStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];

    // Obtener horarios para ese día
    const horariosBarbero = horariosList.filter((h: any) => Number(h.barberoId) === Number(barberoId) && String(h.dia) === diaStr && h.estado === true);

    if (horariosBarbero.length === 0) return [];

    let availableSlots: string[] = [];

    // Para cada franja horaria de este día
    horariosBarbero.forEach((h: any) => {
      const [hIniH, hIniM] = String(h.horaInicio || '00:00').split(':').map((x: string) => parseInt(x || '0', 10));
      const [hFinH, hFinM] = String(h.horaFin || '23:59').split(':').map((x: string) => parseInt(x || '0', 10));

      const startH = hIniH * 60 + hIniM;
      const endH = hFinH * 60 + hFinM;

      // Generar slots cada 30 minutos (ajustable)
      for (let time = startH; time + duracion <= endH; time += 30) {
        const hh = Math.floor(time / 60);
        const mm = time % 60;
        const horaStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;

        // Verificar si está en el pasado
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        if (fechaStr === todayStr) {
          const currentMinutesWithLead = today.getHours() * 60 + today.getMinutes() + 30;
          if (time <= currentMinutesWithLead) continue;
        }

        // Verificar si solapa con alguna cita existente
        const solapa = citas.find((cita: any) => {
          if (cita.fecha !== fechaStr) return false;
          if (Number(cita.barberoId) !== Number(barberoId)) return false;
          if (isEditMode && selectedCita && cita.id === selectedCita.id) return false;
          if (cita.estado === 'Cancelada') return false;

          const [ch, cm] = String(cita.hora || '').split(':').map(Number);
          const startExist = (ch * 60) + cm;
          const endExist = startExist + (cita.duracion || 60);

          return time < endExist && startExist < (time + duracion);
        });

        if (!solapa) {
          availableSlots.push(horaStr);
        }
      }
    });

    return [...new Set(availableSlots)].sort();
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setBarberoFormSearchTerm('');
    setNuevaCita({
      barberoId: 0,
      barbero: '',
      servicioId: null,
      paqueteId: null,
      servicio: '',
      fecha: '',
      hora: '',
      notas: '',
      duracion: 60,
      precio: 0,
      estado: 'Pendiente'
    });
    setIsFormDialogOpen(true);
  };

  const handleSlotClick = (fechaCompleta: string, hora: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Evitar crear citas en días pasados
    if (fechaCompleta < todayStr) return;

    setIsEditMode(false);
    setBarberoFormSearchTerm('');
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    const horaString = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
    setNuevaCita({
      barberoId: 0,
      barbero: '',
      servicioId: null,
      paqueteId: null,
      servicio: '',
      fecha: fechaCompleta,
      hora: horaString,
      notas: '',
      duracion: 60,
      precio: 0,
      estado: 'Pendiente'
    });
    setIsFormDialogOpen(true);
  };

  const handleOpenEdit = (cita: any) => {
    setIsEditMode(true);
    setSelectedCita(cita);
    setBarberoFormSearchTerm(cita.barberoNombre || '');
    setNuevaCita({
      barberoId: cita.barberoId,
      barbero: cita.barberoNombre || '',
      servicioId: cita.servicioId,
      paqueteId: cita.paqueteId,
      servicio: cita.servicioNombre || cita.paqueteNombre || '',
      fecha: cita.fecha,
      hora: cita.hora,
      notas: cita.notas || '',
      duracion: cita.duracion || 60,
      precio: cita.precio || 0,
      estado: cita.estado
    });
    setIsDetailDialogOpen(false);
    setIsFormDialogOpen(true);
  };

  const handleSaveCita = async () => {
    if (!nuevaCita.barberoId || (!nuevaCita.servicioId && !nuevaCita.paqueteId) || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      return;
    }

    const errorDisp = validarDisponibilidad(nuevaCita.barberoId, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion, selectedCita?.id);
    if (errorDisp) {
      error("No disponible", errorDisp);
      return;
    }

    try {
      if (isEditMode && selectedCita) {
        await agendamientoService.updateAgendamiento(selectedCita.id, {
          clienteId: Number(currentCliente.id),
          barberoId: nuevaCita.barberoId,
          servicioId: nuevaCita.servicioId,
          paqueteId: nuevaCita.paqueteId,
          fecha: nuevaCita.fecha,
          hora: nuevaCita.hora,
          duracion: nuevaCita.duracion,
          precio: nuevaCita.precio,
          estado: nuevaCita.estado,
          notas: nuevaCita.notas
        });
        success("¡Cita actualizada!", "Tus cambios han sido guardados.");
      } else {
        await agendamientoService.createAgendamiento({
          clienteId: Number(currentCliente.id),
          barberoId: nuevaCita.barberoId,
          servicioId: nuevaCita.servicioId,
          paqueteId: nuevaCita.paqueteId,
          fecha: nuevaCita.fecha,
          hora: nuevaCita.hora,
          duracion: nuevaCita.duracion,
          precio: nuevaCita.precio,
          estado: 'Pendiente',
          notas: nuevaCita.notas
        });
        success("¡Cita agendada!", "Tu cita ha sido registrada exitosamente.");
      }

      await fetchData();
      setIsFormDialogOpen(false);
    } catch (err: any) {
      error("Error", err.message || "No se pudo procesar la solicitud.");
    }
  };

  const handleCancelCita = async () => {
    if (!citaToDelete) return;
    try {
      await agendamientoService.updateAgendamientoStatus(citaToDelete.id, "Cancelada");
      await fetchData();
      setIsDeleteDialogOpen(false);
      success("Cita cancelada", "Tu cita ha sido cancelada correctamente.");
    } catch (err: any) {
      error("Error", "No se pudo cancelar la cita.");
    }
  };

  const handleItemChange = (value: string) => {
    if (value.startsWith('p-')) {
      const id = parseInt(value.replace('p-', ''));
      const paquete = paquetesList.find(p => p.id === id);
      setNuevaCita({
        ...nuevaCita,
        paqueteId: id,
        servicioId: null,
        precio: paquete?.precio || 0,
        duracion: paquete?.duracion || 60
      });
    } else {
      const id = parseInt(value);
      const servicio = serviciosList.find(s => s.id === id);
      setNuevaCita({
        ...nuevaCita,
        servicioId: id,
        paqueteId: null,
        precio: servicio?.precio || 0,
        duracion: servicio?.duracion || 60
      });
    }
  };

  return (
    <>
      <AlertContainer />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white-primary">Mis Citas</h1>
          <p className="text-sm text-gray-lightest mt-1">Gestiona tu agenda y programa nuevas visitas</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="elegante-button-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Agendar Nueva Cita
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-primary animate-pulse text-xl font-medium">Cargando tus citas...</div>
        </div>
      ) : (
        <div className="space-y-8">


            {/* Navegación Semanal */}
            <div className="elegante-card">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentWeek(currentWeek - 1)}
                  className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium border border-gray-dark transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white-primary" />
                </button>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-white-primary">
                    {currentWeek === 0 ? 'Esta Semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
                  </h3>
                  <p className="text-xs text-gray-lightest">{weekDays[0].fecha} - {weekDays[6].fecha}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentWeek(0)}
                    className="elegante-button-secondary text-xs py-2"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={() => setCurrentWeek(currentWeek + 1)}
                    className="p-2 rounded-lg bg-gray-darker hover:bg-gray-medium border border-gray-dark transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-white-primary" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Calendario */}
            <div className="elegante-card">
              <div className="overflow-x-auto">
                <div className="min-w-[1200px]">
                  {/* Header Días */}
                  <div className="grid grid-cols-8 gap-1 mb-4 border-b border-gray-dark pb-4">
                    <div className="text-center">
                      <span className="text-sm font-semibold text-gray-light font-black uppercase tracking-tighter">Horas</span>
                    </div>
                    {weekDays.map(day => (
                      <div key={day.dia} className="text-center">
                        <h4 className="font-semibold text-white-primary uppercase text-[10px] tracking-tighter">{day.dia}</h4>
                        <p className="text-[10px] text-gray-lightest">{day.fecha}</p>
                        <div className="text-[9px] text-orange-primary mt-1 font-bold">
                          {citas.filter(c => c.fecha === day.fechaCompleta && c.estado !== 'Cancelada').length} citas
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Grid de horarios */}
                  <div className="relative">
                    {(() => {
                      const todayStr = toLocalDateString(new Date());
                      const now = new Date();
                      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

                      return horasDelDia.map((hora) => (
                        <div key={hora} className="grid grid-cols-8 gap-1 h-16 border-b border-gray-dark">
                          <div className="flex items-center justify-center text-[10px] text-gray-light font-bold">
                            {formatHora12(hora)}
                          </div>
                          {weekDays.map((day) => {
                            const citasEnSlot = getCitasEnSlot(day.fechaCompleta, hora);

                            let isPastSlot = false;
                            if (day.fechaCompleta < todayStr) {
                              isPastSlot = true;
                            } else if (day.fechaCompleta === todayStr) {
                              // Se desactiva solo si han pasado más de 30 minutos de la hora de inicio
                              if ((hora * 60) <= currentTotalMinutes - 30) isPastSlot = true;
                            }

                            return (
                              <div
                                key={`${day.dia}-${hora}`}
                                className={`relative rounded border transition-all duration-200 p-1 flex flex-col gap-1 ${isPastSlot && citasEnSlot.length === 0
                                    ? "bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-40"
                                    : "bg-gray-dark/40 border-gray-dark hover:bg-gray-dark hover:border-orange-primary/50 cursor-pointer group"
                                  }`}
                                onClick={() => {
                                  if (!isPastSlot && citasEnSlot.length === 0) {
                                    handleSlotClick(day.fechaCompleta, hora);
                                  }
                                }}
                              >
                                {citasEnSlot.map(cita => (
                                  <div
                                    key={cita.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCita(cita);
                                      setIsDetailDialogOpen(true);
                                    }}
                                    className="text-[10px] p-1.5 rounded truncate font-bold border transition-transform hover:scale-[1.02] cursor-pointer"
                                    style={{
                                      backgroundColor: getCitaColor(cita.estado) + (isPastSlot ? '15' : '25'),
                                      color: getCitaColor(cita.estado),
                                      borderColor: getCitaColor(cita.estado) + '50'
                                    }}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getCitaColor(cita.estado) }} />
                                      {cita.servicioNombre || cita.paqueteNombre}
                                    </div>
                                    <div className="text-[8px] opacity-70 mt-0.5 ml-3 truncate">
                                      {cita.barberoNombre} • {cita.hora}
                                    </div>
                                  </div>
                                ))}

                                {citasEnSlot.length === 0 && !isPastSlot && (
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Plus className="w-4 h-4 text-orange-primary/50" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Modal Crear / Editar Cita */}
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark text-white-primary max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-orange-primary" />
              {isEditMode ? 'Editar tu Reservación' : 'Programar Nueva Cita'}
            </DialogTitle>
            <DialogDescription className="text-gray-lightest border-b border-gray-dark pb-3">
              {isEditMode ? 'Modifica los detalles de tu cita para ajustarla a tu necesidad.' : 'Completa los detalles para asegurar tu espacio con nosotros.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Columna Izquierda: Qué y Quién */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-lightest flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-orange-primary" />
                    Servicio o Paquete *
                  </Label>
                  <Select
                    value={nuevaCita.paqueteId ? `p-${nuevaCita.paqueteId}` : (nuevaCita.servicioId ? nuevaCita.servicioId.toString() : undefined)}
                    onValueChange={handleItemChange}
                  >
                    <SelectTrigger className="elegante-input h-11">
                      <SelectValue placeholder="Busca un servicio o paquete..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark max-h-72">
                      <div className="px-3 py-2 text-[10px] font-black text-orange-primary/60 uppercase tracking-widest border-b border-gray-dark/40 mb-1">Servicios Estándar</div>
                      {serviciosList.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()} className="text-white-primary focus:bg-orange-primary/10 focus:text-orange-primary">
                          {s.nombre} &bull; <span className="text-orange-primary font-bold">{formatearPrecio(s.precio)}</span>
                        </SelectItem>
                      ))}
                      {paquetesList.length > 0 && (
                        <>
                          <div className="px-3 py-2 mt-2 text-[10px] font-black text-orange-primary/60 uppercase tracking-widest border-b border-gray-dark/40 mb-1">Paquetes Especiales</div>
                          {paquetesList.map(p => (
                            <SelectItem key={`p-${p.id}`} value={`p-${p.id}`} className="text-white-primary focus:bg-orange-primary/10 focus:text-orange-primary">
                              {p.nombre} &bull; <span className="text-orange-primary font-bold">{formatearPrecio(p.precio)}</span>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {showFormErrors && !nuevaCita.servicioId && !nuevaCita.paqueteId && (
                    <p className="text-[10px] text-red-400 italic font-medium">Por favor selecciona lo que deseas hacerte.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-lightest flex items-center gap-2">
                    <User className="w-4 h-4 text-orange-primary" />
                    Barbero de Preferencia *
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                    <Input
                      placeholder="Busca a tu barbero..."
                      value={barberoFormSearchTerm}
                      onChange={(e) => { setBarberoFormSearchTerm(e.target.value); setShowBarberoFormResults(true); }}
                      onFocus={() => setShowBarberoFormResults(true)}
                      onBlur={() => setTimeout(() => setShowBarberoFormResults(false), 200)}
                      className="elegante-input pl-10 h-11"
                    />
                    {showBarberoFormResults && barberoFormSearchTerm.trim() && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-52 overflow-y-auto custom-scrollbar">
                        {barberosList
                          .filter(b => {
                            const fullName = `${b.nombre || b.nombres || ''} ${b.apellido || b.apellidos || ''}`.toLowerCase();
                            const searchMatch = fullName.includes(barberoFormSearchTerm.toLowerCase());
                            if (nuevaCita.fecha && nuevaCita.hora) {
                              const errorDisp = validarDisponibilidad(b.id, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion, selectedCita?.id);
                              return searchMatch && !errorDisp;
                            }
                            return searchMatch;
                          })
                          .map(barbero => (
                            <div
                              key={barbero.id}
                              onMouseDown={() => {
                                const name = `${barbero.nombre || barbero.nombres || ''} ${barbero.apellido || barbero.apellidos || ''}`.trim();
                                setNuevaCita({
                                  ...nuevaCita,
                                  barberoId: barbero.id,
                                  barbero: name
                                });
                                setBarberoFormSearchTerm(name);
                                setShowBarberoFormResults(false);
                              }}
                              className="p-3 border-b border-gray-dark last:border-0 hover:bg-gray-dark cursor-pointer group"
                            >
                              <p className="text-white-primary text-sm font-medium group-hover:text-orange-primary transition-colors">
                                {barbero.nombre || barbero.nombres} {barbero.apellido || barbero.apellidos || ''}
                              </p>
                            </div>
                          ))
                        }
                        {barberosList.filter(b => {
                          const fullName = `${b.nombre || b.nombres || ''} ${b.apellido || b.apellidos || ''}`.toLowerCase();
                          const searchMatch = fullName.includes(barberoFormSearchTerm.toLowerCase());
                          if (nuevaCita.fecha && nuevaCita.hora) {
                            const errorDisp = validarDisponibilidad(b.id, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion, selectedCita?.id);
                            return searchMatch && !errorDisp;
                          }
                          return searchMatch;
                        }).length === 0 && (
                            <div className="p-3 text-center text-gray-lightest text-sm italic">
                              {nuevaCita.fecha && nuevaCita.hora ? 'No hay barberos disponibles para este horario' : 'No se encontraron barberos'}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  {showFormErrors && !nuevaCita.barberoId && (
                    <p className="text-[10px] text-red-400 italic font-medium">Debes seleccionar un barbero para continuar.</p>
                  )}


                </div>
              </div>

              {/* Columna Derecha: Cuándo */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-gray-lightest flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-orange-primary" />
                      Fecha *
                    </Label>
                    <Input
                      type="date"
                      value={nuevaCita.fecha}
                      onChange={(e) => setNuevaCita({ ...nuevaCita, fecha: e.target.value })}
                      className="elegante-input h-11"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-gray-lightest flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-primary" />
                      Hora *
                    </Label>
                    <Input
                      type="time"
                      value={nuevaCita.hora}
                      onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                      className="elegante-input h-11"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-bold text-gray-lightest flex items-center gap-2">
                    <Edit className="w-4 h-4 text-orange-primary" />
                    Notas Adicionales
                  </Label>
                  <Textarea
                    value={nuevaCita.notas}
                    onChange={(e) => setNuevaCita({ ...nuevaCita, notas: e.target.value })}
                    placeholder="¿Algún detalle especial que debamos saber?"
                    className="elegante-input min-h-[120px] resize-none pt-3"
                  />
                </div>

                {isEditMode && (
                  <div className="space-y-3">
                    <Label className="text-sm font-bold text-gray-lightest">Actualizar Estado</Label>
                    <Select value={nuevaCita.estado} onValueChange={(v) => setNuevaCita({ ...nuevaCita, estado: v })}>
                      <SelectTrigger className="elegante-input h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-darkest border-gray-dark">
                        <SelectItem value={selectedCita.estado} className="text-white-primary">{selectedCita.estado}</SelectItem>
                        {selectedCita.estado !== 'Cancelada' && (
                          <SelectItem value="Cancelada" className="text-white-primary text-red-500">Cancelar Cita</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Precio y Acciones */}
            <div className="pt-6 border-t border-gray-dark">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {nuevaCita.precio > 0 && (
                    <div className="flex items-center gap-3">
                      {/* Imagen al tamaño exacto del div de precio (aprox 74px) */}
                      <div className="w-28 h-[74px] rounded-2xl overflow-hidden border border-orange-primary/20 bg-gray-darkers flex-shrink-0">
                        <ImageRenderer 
                          url={nuevaCita.paqueteId 
                            ? paquetesList.find(p => p.id === nuevaCita.paqueteId)?.imagen 
                            : serviciosList.find(s => s.id === nuevaCita.servicioId)?.imagen
                          }
                          showLabel={false}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="bg-orange-primary/10 px-6 py-3 rounded-2xl border border-orange-primary/20 h-[74px] flex flex-col justify-center">
                        <p className="text-[10px] font-black text-orange-primary uppercase tracking-widest mb-1">Total Estimado</p>
                        <p className="text-2xl font-bold text-white-primary leading-none">{formatearPrecio(nuevaCita.precio)}</p>
                      </div>
                    </div>
                  )}
                  <div className="text-gray-lightest text-[10px] max-w-[200px] leading-relaxed italic">
                    * El precio puede variar ligeramente según el detalle final del servicio en la barbería.
                  </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setIsFormDialogOpen(false)} className="elegante-button-secondary flex-1 md:flex-none py-3 px-8">
                    Cancelar
                  </button>
                  <button onClick={handleSaveCita} className="elegante-button-primary flex-1 md:flex-none py-3 px-8 shadow-lg shadow-orange-primary/10">
                    {isEditMode ? 'Guardar Cambios' : 'Confirmar Reservación'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle Cita */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark text-white-primary max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between border-b border-gray-dark pb-3">
              <DialogTitle className="text-xl">Detalle de tu Reservación</DialogTitle>
              {selectedCita && selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                <button
                  onClick={() => handleOpenEdit(selectedCita)}
                  className="p-2.5 bg-orange-primary/10 hover:bg-orange-primary/20 rounded-xl transition-all border border-orange-primary/20 group"
                  title="Modificar cita"
                >
                  <Edit className="w-5 h-5 text-orange-primary group-hover:scale-110 transition-transform" />
                </button>
              )}
            </div>
          </DialogHeader>
          {selectedCita && (
            <div className="space-y-8 py-6">
              {/* Header con Servicio y Estado */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-primary/10 rounded-2xl flex items-center justify-center border border-orange-primary/20">
                    <Scissors className="text-orange-primary w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white-primary">{selectedCita.servicioNombre || selectedCita.paqueteNombre}</h3>
                    <p className="text-sm text-gray-lightest flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" /> {selectedCita.duracion} min &bull;
                      <span className="text-orange-primary font-bold">{formatearPrecio(selectedCita.precio)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedCita.estado === 'Pendiente' ? 'bg-orange-primary/10 text-orange-primary border-orange-primary/30' :
                      selectedCita.estado === 'Confirmada' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                        selectedCita.estado === 'Completada' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                          'bg-red-500/10 text-red-500 border-red-500/30'
                    }`}>
                    {selectedCita.estado}
                  </div>
                </div>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-2 gap-6 bg-black/20 p-5 rounded-2xl border border-gray-dark/50">
                <div className="space-y-1">
                  <p className="text-gray-lightest text-[10px] uppercase font-black tracking-tighter opacity-50">Barbero Asignado</p>
                  <p className="font-bold flex items-center gap-2 text-white-primary">
                    <User className="w-4 h-4 text-orange-primary/70" />
                    {selectedCita.barberoNombre}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-lightest text-[10px] uppercase font-black tracking-tighter opacity-50">Fecha Programada</p>
                  <p className="font-bold flex items-center gap-2 text-white-primary">
                    <Calendar className="w-4 h-4 text-orange-primary/70" />
                    {selectedCita.fecha}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-lightest text-[10px] uppercase font-black tracking-tighter opacity-50">Hora de Inicio</p>
                  <p className="font-bold flex items-center gap-2 text-white-primary text-lg">
                    <Clock className="w-4 h-4 text-orange-primary/70" />
                    {selectedCita.hora}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-lightest text-[10px] uppercase font-black tracking-tighter opacity-50">Telf. Contacto</p>
                  <p className="font-bold flex items-center gap-2 text-white-primary">
                    <Phone className="w-4 h-4 text-orange-primary/70" />
                    Barbería Elite
                  </p>
                </div>
              </div>

              {/* Notas */}
              {selectedCita.notas && (
                <div className="space-y-2">
                  <p className="text-gray-lightest text-[10px] font-bold uppercase ml-1">Observaciones / Preferencias</p>
                  <div className="p-4 bg-gray-darker/50 rounded-xl text-sm border border-gray-dark italic text-gray-lighter leading-relaxed">
                    "{selectedCita.notas}"
                  </div>
                </div>
              )}

              {/* Footer de cancelación */}
              {selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                <div className="pt-4 flex flex-col gap-3">
                  <div className="h-px bg-gray-dark w-full mb-2" />
                  <p className="text-[10px] text-gray-lightest text-center italic">
                    ¿No puedes asistir? Por favor cancela con al menos 2 horas de anticipación.
                  </p>
                  <button
                    onClick={() => {
                      setCitaToDelete(selectedCita);
                      setIsDetailDialogOpen(false);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="w-full py-3 bg-red-500/5 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-red-500/5"
                  >
                    Cancelar reservación
                  </button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar Cancelación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary">¿Estás seguro de cancelar tu cita?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              Esta acción informará a la barbería y liberará el horario. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-darker text-white-primary border-gray-dark">Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelCita} className="bg-red-600 hover:bg-red-700 text-white font-bold">Sí, cancelar cita</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
