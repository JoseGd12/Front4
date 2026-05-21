import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Calendar,
  Clock,
  User,
  Scissors,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  CalendarDays,
  Package,
  ShoppingBag,
  FileText,
  X
} from "lucide-react";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Input } from "../../../shared/components/ui/input";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { Textarea } from "../../../shared/components/ui/textarea";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { productoService } from "../../productos/services/productos";
import { horariosService } from "../../agendamiento/services/horariosService";
import { MIN_ANTICIPACION_AGENDA_MINUTOS } from "../../agendamiento/constants";
import {
  getHorariosBarberoParaDia,
  getHorasDisponiblesParaDia as calcularHorasDisponibles,
  horarioEstaActivo,
  normalizeDiaNombre,
  parseHoraAMinutos,
  toLocalDateString,
  CALENDAR_SLOT_HOURS,
} from "../../agendamiento/utils/scheduleUtils";

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horasDelDia = CALENDAR_SLOT_HOURS;
const calendarGridTemplate = "clamp(64px, 6vw, 78px) repeat(7, minmax(0, 1fr))";

const CAL_GRID_HOVER_CELL =
  "cal-cell-hover transition-[background-color,border-color] duration-200 ease-out";
const CAL_GRID_HOVER_SHIMMER =
  "pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out";
const CAL_GRID_HOVER_PLUS_ICON = "w-5 h-5 text-white/80 stroke-[1.2] transform scale-95 group-hover:scale-100 transition-transform duration-200 ease-out";

const formatHora12 = (hora: number): string => {
  const h = Math.floor(hora);
  const m = (hora % 1) * 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const minutesStr = m === 0 ? '00' : '30';
  return `${h12}:${minutesStr} ${ampm}`;
};

const formatHoraStr12 = (horaStr: string): string => {
  if (!horaStr) return '';
  const [hStr, mStr = '00'] = horaStr.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const formatNombre = (nombre: string): string => {
  if (!nombre) return '—';
  return nombre.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const estados = [
  { value: "Pendiente", label: "Pendiente", color: "bg-orange-primary" },
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
    case 'Completada': return '#3B82F6';
    case 'Cancelada': return '#EF4444';
    default: return '#d8b081'; // Pendiente
  }
};

const getCitaDotColor = (cita: any): string => getCitaColor(cita?.estado || 'Pendiente');

const formatRangoHorarioCita = (cita: { hora?: string; duracion?: number }): string => {
  if (!cita?.hora) return '—';
  const [hs, ms = '0'] = String(cita.hora).split(':');
  const startMin = parseInt(hs || '0', 10) * 60 + parseInt(ms || '0', 10);
  const endMin = startMin + (Number(cita.duracion) || 60);
  const hFin = Math.floor(endMin / 60) % 24;
  const mFin = endMin % 60;
  const ampm = hFin >= 12 ? 'PM' : 'AM';
  const h12 = hFin % 12 === 0 ? 12 : hFin % 12;
  const endStr = mFin === 0 ? `${h12}${ampm}` : `${h12}:${String(mFin).padStart(2, '0')}${ampm}`;
  return `${formatHoraStr12(cita.hora)} · ${endStr}`;
};

interface ClienteMisCitasPageCalendarProps {
  initialItem?: any;
  onClearInitialItem?: () => void;
  preSelectedProduct?: any;
  onClearPreSelectedProduct?: () => void;
}

export function ClienteMisCitasPageCalendar({ initialItem, onClearInitialItem, preSelectedProduct, onClearPreSelectedProduct }: ClienteMisCitasPageCalendarProps) {
  const { user } = useAuth();
  const { success, error, AlertContainer } = useCustomAlert();
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCliente, setCurrentCliente] = useState<any>(null);

  // Listas para los selects
  const [serviciosList, setServiciosList] = useState<any[]>([]);
  const [paquetesList, setPaquetesList] = useState<any[]>([]);
  const [productosList, setProductosList] = useState<any[]>([]);
  const [barberosList, setBarberosList] = useState<any[]>([]);
  const [horariosList, setHorariosList] = useState<any[]>([]);

  const [currentWeek, setCurrentWeek] = useState(0);
  const [carouselPage, setCarouselPage] = useState(0);
  const CAROUSEL_PAGE_SIZE = 5;
  // Índice de la cita visible cuando hay varias en una misma franja (key: `${fecha}-${hora}`)
  const [slotCitaIndex, setSlotCitaIndex] = useState<Record<string, number>>({});

  // ── Admin-style hover / overflow / tooltip state ──
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [overflowPopup, setOverflowPopup] = useState<{
    citas: any[];
    rect: DOMRect;
    horaLabel: string;
    diaLabel: string;
    fechaCompleta: string;
  } | null>(null);
  const [hoveredCita, setHoveredCita] = useState<{ cita: any; rect: DOMRect; servicioLabel: string; tabColor: string } | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hoveredCitaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHideTooltip = () => {
    if (hoveredCitaTimerRef.current) clearTimeout(hoveredCitaTimerRef.current);
    if (tooltipHideTimerRef.current) clearTimeout(tooltipHideTimerRef.current);
    hoveredCitaTimerRef.current = setTimeout(() => {
      setTooltipVisible(false);
      tooltipHideTimerRef.current = setTimeout(() => setHoveredCita(null), 150);
    }, 80);
  };
  const cancelHideTooltip = () => {
    if (hoveredCitaTimerRef.current) clearTimeout(hoveredCitaTimerRef.current);
    if (tooltipHideTimerRef.current) clearTimeout(tooltipHideTimerRef.current);
  };
  const showTooltip = (data: { cita: any; rect: DOMRect; servicioLabel: string; tabColor: string }) => {
    cancelHideTooltip();
    setHoveredCita(data);
    requestAnimationFrame(() => requestAnimationFrame(() => setTooltipVisible(true)));
  };



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

      const [barberosData, serviciosData, paquetesData, horariosData, productosData] = await Promise.all([
        barberosService.getBarberos().catch(() => []),
        servicioService.getServicios().catch(() => []),
        apiService.getPaquetes().catch(() => []),
        horariosService.getHorarios().catch(() => []),
        productoService.getProductos().catch(() => [])
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
      setProductosList((Array.isArray(productosData) ? productosData : []).filter((p: any) => p.activo !== false && (p.stockVentas > 0 || p.stockTotal > 0)));
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

  // Estados para modales y vistas
  const [viewMode, setViewMode] = useState<'calendar' | 'crear'>('calendar');
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [citaToDelete, setCitaToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [nuevaCita, setNuevaCita] = useState({
    barberoId: 0,
    barbero: '', // Almacenar nombre para el autocomplete
    servicioId: null as number | null,
    servicioIds: [] as number[],
    productoCantidades: {} as Record<number, number>,
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
  const [servicioSearchTerm, setServicioSearchTerm] = useState('');
  const [paqueteSearchTerm, setPaqueteSearchTerm] = useState('');
  const [productoSearchTerm, setProductoSearchTerm] = useState('');
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
  const [editingFecha, setEditingFecha] = useState(false);
  const [editingHora, setEditingHora] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Resetear carrusel de citas al cambiar de semana
  useEffect(() => { setCarouselPage(0); }, [currentWeek]);

  // Cuando llega un producto pre-seleccionado desde la página de productos,
  // abrir el formulario y guardar el producto pendiente para agregarlo al seleccionar servicio/paquete
  useEffect(() => {
    if (preSelectedProduct && !isLoading && productosList.length > 0) {
      setIsEditMode(false);
      setNuevaCita({
        barberoId: 0,
        barbero: '',
        servicioId: null,
        servicioIds: [],
        productoCantidades: {},
        paqueteId: null,
        servicio: '',
        fecha: '',
        hora: '',
        notas: '',
        duracion: 60,
        precio: 0,
        estado: 'Pendiente'
      });
      setPendingProduct(preSelectedProduct);
      // Open the modal
      const position = {
        top: Math.max(16, (window.innerHeight - 600) / 2),
        left: Math.max(16, (window.innerWidth - 480) / 2)
      };
      setModalPosition(position);
      setTipoServicio('individuales');
      setEditingFecha(false);
      setEditingHora(false);
      setShowFormErrors(false);
      setBarberoFormSearchTerm('');
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      setModalPhase('enter');
      setIsCreateModalOpen(true);
      setTimeout(() => setModalPhase('open'), 10);
      if (onClearPreSelectedProduct) onClearPreSelectedProduct();
    }
  }, [preSelectedProduct, isLoading, productosList]);

  const handleSelectInitialItem = (item: any, currentServicios: any[], currentPaquetes: any[]) => {
    setIsEditMode(false);

    // ── Handle barbero-type selection from landing page ──
    if (item.type === 'barbero') {
      const nombreBarbero = String(item.nombre || '').trim().toLowerCase();
      const barberoMatch = barberosList.find(
        (b: any) => String(b.nombre || '').trim().toLowerCase().includes(nombreBarbero)
          || nombreBarbero.includes(String(b.nombre || '').trim().toLowerCase())
      );

      const today = new Date();
      const future = new Date(today.getTime() + (60 * 60 * 1000));
      let hours = future.getHours();
      let minutes = future.getMinutes();
      let targetDate = today;

      if (minutes < 15) { minutes = 0; }
      else if (minutes < 45) { minutes = 30; }
      else { minutes = 0; hours += 1; }

      if (hours >= 22 || (hours === 21 && minutes > 30)) {
        targetDate = new Date(today.getTime() + (24 * 60 * 60 * 1000));
        hours = 11; minutes = 0;
      } else if (hours < 9) {
        hours = 11; minutes = 0;
      }

      const fechaAuto = toLocalDateString(targetDate);
      const horaAuto = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      if (barberoMatch) {
        setBarberoFormSearchTerm(`${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim());
        setNuevaCita({
          barberoId: barberoMatch.id,
          barbero: `${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim(),
          servicioId: null,
          servicioIds: [],
          productoCantidades: {},
          paqueteId: null,
          servicio: '',
          fecha: fechaAuto,
          hora: horaAuto,
          notas: '',
          duracion: 60,
          precio: 0,
          estado: 'Pendiente'
        });
      } else {
        setBarberoFormSearchTerm(item.nombre || '');
        setNuevaCita({
          barberoId: 0,
          barbero: item.nombre || '',
          servicioId: null,
          servicioIds: [],
          productoCantidades: {},
          paqueteId: null,
          servicio: '',
          fecha: fechaAuto,
          hora: horaAuto,
          notas: '',
          duracion: 60,
          precio: 0,
          estado: 'Pendiente'
        });
      }

      // Open modal instead of navigating to crear view
      const position = {
        top: Math.max(16, (window.innerHeight - 600) / 2),
        left: Math.max(16, (window.innerWidth - 480) / 2)
      };
      setModalPosition(position);
      setTipoServicio('individuales');
      setEditingFecha(false);
      setEditingHora(false);
      setShowFormErrors(false);
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      setModalPhase('enter');
      setIsCreateModalOpen(true);
      setTimeout(() => setModalPhase('open'), 10);
      if (onClearInitialItem) onClearInitialItem();
      return;
    }

    // ── Handle servicio / paquete selection ──
    const isPaquete = item.type === 'paquete' || item.tipoItem === 'paquete';
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
      servicioIds: isPaquete ? [] : [itemId],
      productoCantidades: {},
      paqueteId: isPaquete ? itemId : null,
      servicio: item.nombre,
      fecha: fechaAuto,
      hora: horaAuto,
      notas: '',
      duracion: duration,
      precio: price,
      estado: 'Pendiente'
    });

    setTipoServicio(isPaquete ? 'paquetes' : 'individuales');
    // Open modal instead of navigating to crear view
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };
    setModalPosition(position);
    setEditingFecha(false);
    setEditingHora(false);
    setShowFormErrors(false);
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
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
      if ((cita.estado || '').toLowerCase() === 'cancelada') return false;
      const horaSplit = (cita.hora || '').split(':');
      if (horaSplit.length < 2) return false;
      const horaInicio = parseInt(horaSplit[0]) + (parseInt(horaSplit[1]) / 60);
      // Redondear inicio al slot de grilla hacia abajo (12:05 → 12:00)
      const horaInicioSlot = Math.floor(horaInicio * 2) / 2;
      const horaFinExacta = horaInicio + (cita.duracion || 60) / 60;
      // Usar fin exacto: 13:05 incluye slot 13:00 pero no 13:30
      return horaInicioSlot <= hora && hora < horaFinExacta;
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
      if (startNueva <= current + MIN_ANTICIPACION_AGENDA_MINUTOS) {
        return `Debes agendar con al menos ${MIN_ANTICIPACION_AGENDA_MINUTOS} minutos de anticipación.`;
      }
    }

    const turnos = getHorariosBarberoParaDia(horariosList, barberoId, fecha);
    if (turnos.length === 0) {
      const dayStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][
        new Date(`${fecha}T12:00:00`).getDay()
      ];
      return `${barberosList.find(b => b.id === barberoId)?.nombre} no trabaja los ${dayStr}.`;
    }

    const enHorario = turnos.some((h: any) => {
      const start = parseHoraAMinutos(h.horaInicio || '00:00');
      const end = parseHoraAMinutos(h.horaFin || '23:59');
      return startNueva >= start && endNueva <= end;
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

  const getHorasDisponiblesParaDia = (fechaStr: string, barberoId: number, duracion: number) =>
    calcularHorasDisponibles({
      fechaStr,
      barberoId,
      duracionMinutos: duracion,
      horariosList,
      citas,
      ignoreCitaId: isEditMode && selectedCita ? selectedCita.id : undefined,
      minAnticipacionMinutos: MIN_ANTICIPACION_AGENDA_MINUTOS,
      slotHours: horasDelDia,
    });

  // ── Funciones de control del modal ──

  const handleOpenCreateModal = () => {
    // Calcular posición centrada en pantalla
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };

    setModalPosition(position);
    setIsCreateModalOpen(true);
    setIsEditMode(false);

    // Resetear formulario
    setNuevaCita({
      barberoId: 0,
      barbero: '',
      servicioId: null,
      servicioIds: [],
      productoCantidades: {},
      paqueteId: null,
      servicio: '',
      fecha: '',
      hora: '',
      notas: '',
      duracion: 60,
      precio: 0,
      estado: 'Pendiente'
    });
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setShowFormErrors(false);
    setTipoServicio('individuales');
    setEditingFecha(false);
    setEditingHora(false);

    // Inicializar animación de entrada
    setModalPhase('enter');
    setTimeout(() => setModalPhase('open'), 10);
  };

  const handleSlotClick = (fechaCompleta: string, hora: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Evitar crear citas en días pasados
    if (fechaCompleta < todayStr) return;

    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    const horaString = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;

    // Calcular posición centrada en pantalla (cerca del slot no es posible sin ref al elemento)
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };

    setModalPosition(position);
    setIsCreateModalOpen(true);
    setIsEditMode(false);

    // Pre-llenar fecha y hora del slot
    setNuevaCita({
      barberoId: 0,
      barbero: '',
      servicioId: null,
      servicioIds: [],
      productoCantidades: {},
      paqueteId: null,
      servicio: '',
      fecha: fechaCompleta,
      hora: horaString,
      notas: '',
      duracion: 60,
      precio: 0,
      estado: 'Pendiente'
    });

    // Resetear otros estados del formulario
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setShowFormErrors(false);
    setTipoServicio('individuales');
    setEditingFecha(false);
    setEditingHora(false);

    // Inicializar animación de entrada
    setModalPhase('enter');
    setTimeout(() => setModalPhase('open'), 10);
  };

  const handleCloseModal = () => {
    // Iniciar animación de salida
    setModalPhase('exit');
    setTimeout(() => {
      setIsCreateModalOpen(false);
      setModalPosition(null);
      // Resetear estados del formulario
      setNuevaCita({
        barberoId: 0,
        barbero: '',
        servicioId: null,
        servicioIds: [],
        productoCantidades: {},
        paqueteId: null,
        servicio: '',
        fecha: '',
        hora: '',
        notas: '',
        duracion: 60,
        precio: 0,
        estado: 'Pendiente'
      });
      setBarberoFormSearchTerm('');
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      setShowFormErrors(false);
      setTipoServicio('individuales');
      setEditingFecha(false);
      setEditingHora(false);
    }, 200);
  };

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCreateModalOpen) {
        handleCloseModal();
      }
    };

    if (isCreateModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isCreateModalOpen]);

  const handleOpenEdit = (cita: any) => {
    setIsEditMode(true);
    setSelectedCita(cita);
    setBarberoFormSearchTerm(cita.barberoNombre || '');
    setNuevaCita({
      barberoId: cita.barberoId,
      barbero: cita.barberoNombre || '',
      servicioId: cita.servicioId,
      servicioIds: (cita.servicioIds && cita.servicioIds.length > 0)
        ? cita.servicioIds
        : (cita.servicioId ? [cita.servicioId] : []),
      productoCantidades: (cita.productoIds || []).reduce((acc: any, id: number) => {
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {}),
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
    // Open the modal
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };
    setModalPosition(position);
    setTipoServicio(cita.paqueteId ? 'paquetes' : 'individuales');
    setEditingFecha(false);
    setEditingHora(false);
    setShowFormErrors(false);
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
  };

  const handleSaveCita = async () => {
    if (!nuevaCita.barberoId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      return;
    }

    const flattenedProductoIds = Object.entries(nuevaCita.productoCantidades).flatMap(([id, cant]) => Array(cant).fill(Number(id)));

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
          servicioIds: nuevaCita.servicioIds,
          productoIds: flattenedProductoIds,
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
          servicioIds: nuevaCita.servicioIds,
          productoIds: flattenedProductoIds,
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
      handleCloseModal();
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

  // Helper para calcular precio de productos seleccionados
  const calcularPrecioProductos = (productoCantidades: Record<number, number>) => {
    return Object.entries(productoCantidades).reduce((acc, [id, cant]) => {
      const p = productosList.find(prod => prod.id === Number(id));
      return acc + (Number(p?.precioVenta || 0) * cant);
    }, 0);
  };

  const applyServiciosSelection = (servicioIds: number[]) => {
    const selectedServicios = serviciosList.filter(s => servicioIds.includes(s.id));
    const servicioNombres = selectedServicios.map(s => s.nombre).filter(Boolean);
    const precioServicios = selectedServicios.reduce((acc, s) => acc + Number(s.precio || 0), 0);
    const duracionTotal = selectedServicios.reduce((acc, s) => acc + Number(s.duracion || 60), 0);
    // Si no hay servicios ni paquete, limpiar productos seleccionados
    const keepProducts = servicioIds.length > 0;
    let nextProductoCantidades = keepProducts ? { ...nuevaCita.productoCantidades } : {};
    // Auto-agregar producto pendiente si el usuario acaba de seleccionar su primer servicio
    if (keepProducts && pendingProduct && !nextProductoCantidades[pendingProduct.id]) {
      nextProductoCantidades[pendingProduct.id] = 1;
      setPendingProduct(null);
    }
    const precioProductos = calcularPrecioProductos(nextProductoCantidades);
    setNuevaCita(prev => ({
      ...prev,
      paqueteId: null,
      servicioId: servicioIds.length > 0 ? servicioIds[0] : null,
      servicioIds,
      productoCantidades: nextProductoCantidades,
      servicio: servicioNombres.join(", "),
      precio: precioServicios + precioProductos,
      duracion: servicioIds.length > 0 ? duracionTotal : 60
    }));
  };

  const toggleServicio = (servicioId: number) => {
    const nextServicioIds = nuevaCita.servicioIds.includes(servicioId)
      ? nuevaCita.servicioIds.filter(id => id !== servicioId)
      : [...nuevaCita.servicioIds, servicioId];
    applyServiciosSelection(nextServicioIds);
  };

  const addProducto = (productoId: number) => {
    const nextProductoCantidades = { ...nuevaCita.productoCantidades };
    nextProductoCantidades[productoId] = (nextProductoCantidades[productoId] || 0) + 1;
    updateNuevaCitaConProductos(nextProductoCantidades);
  };

  const removeProducto = (productoId: number) => {
    const nextProductoCantidades = { ...nuevaCita.productoCantidades };
    if (nextProductoCantidades[productoId] > 1) {
      nextProductoCantidades[productoId]--;
    } else {
      delete nextProductoCantidades[productoId];
    }
    updateNuevaCitaConProductos(nextProductoCantidades);
  };

  const quitarProducto = (productoId: number) => {
    const nextProductoCantidades = { ...nuevaCita.productoCantidades };
    delete nextProductoCantidades[productoId];
    updateNuevaCitaConProductos(nextProductoCantidades);
  };

  const updateNuevaCitaConProductos = (nextProductoCantidades: Record<number, number>) => {
    const precioProductos = calcularPrecioProductos(nextProductoCantidades);
    let precioBase = 0;
    if (nuevaCita.paqueteId) {
      const paquete = paquetesList.find(p => p.id === nuevaCita.paqueteId);
      precioBase = paquete ? Number(paquete.precio || 0) : 0;
    } else {
      precioBase = serviciosList
        .filter(s => nuevaCita.servicioIds.includes(s.id))
        .reduce((acc, s) => acc + Number(s.precio || 0), 0);
    }

    setNuevaCita(prev => ({
      ...prev,
      productoCantidades: nextProductoCantidades,
      precio: precioBase + precioProductos
    }));
  };

  const handlePaqueteChange = (value: string) => {
    if (value === "none") {
      setNuevaCita(prev => ({
        ...prev,
        paqueteId: null,
        servicioId: null,
        servicioIds: [],
        productoCantidades: {}, // Sin servicio ni paquete, limpiar productos
        servicio: "",
        precio: 0,
        duracion: 60
      }));
      return;
    }
    const id = parseInt(value.replace("p-", ""));
    const paquete = paquetesList.find(p => p.id === id);
    // Auto-agregar producto pendiente al seleccionar paquete
    let nextProductoCantidades = { ...nuevaCita.productoCantidades };
    if (pendingProduct && !nextProductoCantidades[pendingProduct.id]) {
      nextProductoCantidades[pendingProduct.id] = 1;
      setPendingProduct(null);
    }
    const precioProductosFinal = calcularPrecioProductos(nextProductoCantidades);
    setNuevaCita(prev => ({
      ...prev,
      paqueteId: id,
      servicioId: null,
      servicioIds: [],
      productoCantidades: nextProductoCantidades,
      servicio: paquete?.nombre || "",
      precio: (paquete?.precio || 0) + precioProductosFinal,
      duracion: paquete?.duracion || 60
    }));
  };

  // Helper para formatear el texto de fecha/hora en la Fila_Formulario
  const formatFechaHoraTexto = (): string => {
    if (!nuevaCita.fecha && !nuevaCita.hora) return 'Selecciona fecha y hora';
    const partes: string[] = [];
    if (nuevaCita.fecha) {
      const d = new Date(nuevaCita.fecha + 'T12:00:00');
      partes.push(d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
    }
    if (nuevaCita.hora) {
      partes.push(formatHoraStr12(nuevaCita.hora));
      // Calcular hora fin
      const [hh, mm] = nuevaCita.hora.split(':').map(Number);
      const finMin = hh * 60 + mm + nuevaCita.duracion;
      const finHH = Math.floor(finMin / 60).toString().padStart(2, '0');
      const finMM = String(finMin % 60).padStart(2, '0');
      partes[partes.length - 1] += ` – ${formatHoraStr12(`${finHH}:${finMM}`)}`;
    }
    return partes.join(' · ');
  };

  return (
    <>
      <AlertContainer />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-primary animate-pulse text-xl font-medium">Cargando tus citas...</div>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* MODAL_FORMULARIO — createPortal (Nueva / Editar Cita) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {isCreateModalOpen && modalPosition && createPortal(
            <>
              {/* Backdrop semi-transparente */}
              <div
                className="fixed inset-0 bg-black/40"
                style={{ zIndex: 9998 }}
                onClick={handleCloseModal}
              />

              {/* Modal container */}
              <div
                ref={modalRef}
                className="fixed flex flex-col rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
                style={{
                  top: modalPosition.top,
                  left: modalPosition.left,
                  width: 480,
                  maxHeight: 'calc(100vh - 32px)',
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                  zIndex: 9999,
                  opacity: modalPhase === 'open' ? 1 : 0,
                  transform: modalPhase === 'enter' ? 'translateY(-10px) scale(0.97)' : 'translateY(0) scale(1)',
                  transition: 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Header con grip visual — igual al admin */}
                <div
                  className="shrink-0 bg-gray-darker/50 border-b border-gray-dark/40 select-none"
                >
                  {/* Grip visual */}
                  <div className="flex justify-center pt-2 pb-0.5">
                    <div className="w-8 h-1 rounded-full bg-gray-dark/80" />
                  </div>
                  <div className="flex items-center justify-between" style={{ paddingLeft: 67, paddingRight: 20, paddingTop: 10, paddingBottom: 12 }}>
                    <h2 className="text-lg font-semibold text-gray-lightest">
                      {isEditMode || selectedCita ? 'Editar Cita' : 'Nueva Cita'}
                    </h2>
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="p-2.5 rounded-full text-gray-lighter hover:text-white-primary hover:bg-gray-dark/80 bg-gray-dark/40 transition-all cursor-pointer flex items-center justify-center"
                      title="Cerrar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Contenido scrollable — filas del formulario (tareas 5.2–5.7) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">

                  {/* ── Fila: Switch Tipo ── */}
                  <div className="flex items-center gap-0 py-3 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center">
                      {tipoServicio === 'paquetes' ? <Package className="w-5 h-5 text-gray-lighter" /> : <Scissors className="w-5 h-5 text-gray-lighter" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-1 bg-gray-darker rounded-lg p-1 w-fit">
                        <button
                          type="button"
                          onClick={() => {
                            if (tipoServicio !== 'individuales') {
                              setTipoServicio('individuales');
                              setNuevaCita(prev => ({ ...prev, paqueteId: null }));
                              setPaqueteSearchTerm('');
                            }
                          }}
                          className={tipoServicio === 'individuales'
                            ? 'bg-gray-darkest text-orange-primary rounded-md px-3 py-1 text-sm font-medium transition-all'
                            : 'text-gray-lighter px-3 py-1 text-sm transition-all hover:text-gray-lightest'
                          }
                        >
                          Individuales
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (tipoServicio !== 'paquetes') {
                              setTipoServicio('paquetes');
                              setNuevaCita(prev => ({ ...prev, servicioIds: [], servicioId: null, servicio: '' }));
                              setServicioSearchTerm('');
                            }
                          }}
                          className={tipoServicio === 'paquetes'
                            ? 'bg-gray-darkest text-orange-primary rounded-md px-3 py-1 text-sm font-medium transition-all'
                            : 'text-gray-lighter px-3 py-1 text-sm transition-all hover:text-gray-lightest'
                          }
                        >
                          Paquetes
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Fila: Servicio / Paquete ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-2">
                      {tipoServicio === 'paquetes' ? <Package className="w-5 h-5 text-gray-lighter" /> : <Scissors className="w-5 h-5 text-gray-lighter" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {tipoServicio === 'individuales' ? (
                        <>
                          <SearchField<any>
                            label="Buscar servicio"
                            placeholder="Buscar servicio..."
                            value={servicioSearchTerm}
                            onChange={setServicioSearchTerm}
                            items={serviciosList.filter(s => !nuevaCita.servicioIds.includes(s.id))}
                            filterFn={(s, term) =>
                              (s.nombre || '').toLowerCase().includes(term.toLowerCase())
                            }
                            onSelect={(s) => {
                              toggleServicio(s.id);
                              setServicioSearchTerm('');
                            }}
                            onClear={() => setServicioSearchTerm('')}
                            renderItem={(s) => (
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                  <ImageRenderer url={s.imagen || ""} alt={s.nombre} className="w-full h-full border-0 bg-transparent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white-primary text-sm font-medium truncate">{s.nombre}</p>
                                  <p className="text-gray-lighter text-xs">{s.duracion || 60} min</p>
                                </div>
                                <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(s.precio)}</span>
                              </div>
                            )}
                            isSelected={nuevaCita.servicioIds.length > 0}
                            error={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId ? 'Selecciona al menos un servicio o paquete' : undefined}
                          />
                          {/* Tags de servicios seleccionados */}
                          {nuevaCita.servicioIds.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {nuevaCita.servicioIds.map(sId => {
                                const srv = serviciosList.find(s => s.id === sId);
                                if (!srv) return null;
                                return (
                                  <div key={sId} className="flex items-center gap-1.5 bg-orange-primary/15 border border-orange-primary/30 text-orange-primary rounded-full px-3 py-1 text-xs font-medium">
                                    <Scissors className="w-3 h-3" />
                                    <span>{srv.nombre}</span>
                                    <span className="opacity-60">({formatearPrecio(srv.precio)})</span>
                                    <button
                                      type="button"
                                      onClick={() => toggleServicio(sId)}
                                      className="ml-1 hover:text-red-400 transition-colors"
                                      title="Quitar servicio"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          {nuevaCita.paqueteId ? (
                            <div className="flex flex-wrap gap-2">
                              {(() => {
                                const paq = paquetesList.find(p => p.id === nuevaCita.paqueteId);
                                if (!paq) return null;
                                return (
                                  <div className="flex items-center gap-1.5 bg-orange-primary/15 border border-orange-primary/30 text-orange-primary rounded-full px-3 py-1 text-xs font-medium">
                                    <Package className="w-3 h-3" />
                                    <span>{paq.nombre}</span>
                                    <span className="opacity-60">({formatearPrecio(paq.precio)})</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handlePaqueteChange('none');
                                        setPaqueteSearchTerm('');
                                      }}
                                      className="ml-1 hover:text-red-400 transition-colors"
                                      title="Quitar paquete"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <SearchField<any>
                              label="Buscar paquete"
                              placeholder="Buscar paquete..."
                              value={paqueteSearchTerm}
                              onChange={setPaqueteSearchTerm}
                              items={paquetesList}
                              filterFn={(p, term) =>
                                (p.nombre || '').toLowerCase().includes(term.toLowerCase())
                              }
                              onSelect={(p) => {
                                handlePaqueteChange(`p-${p.id}`);
                                setPaqueteSearchTerm('');
                              }}
                              onClear={() => setPaqueteSearchTerm('')}
                              renderItem={(p) => (
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                    <Package className="w-5 h-5 text-orange-primary/50" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white-primary text-sm font-medium truncate">{p.nombre}</p>
                                    <p className="text-gray-lighter text-xs">{p.duracion || 60} min — {p.servicios?.length || 0} servicios</p>
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precio)}</span>
                                </div>
                              )}
                              error={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId ? 'Selecciona al menos un servicio o paquete' : undefined}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-dark/60 mx-4" />

                  {/* ── Fila: Fecha y Hora ── */}
                  <div className="flex items-start gap-0 py-3 px-2">
                    <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
                      <CalendarDays className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {!editingFecha && !editingHora ? (
                        <div>
                          <button
                            type="button"
                            onClick={() => setEditingFecha(true)}
                            className="text-left text-sm text-gray-lightest hover:text-white-primary transition-colors w-full py-1"
                          >
                            {formatFechaHoraTexto()}
                          </button>
                          {showFormErrors && (!nuevaCita.fecha || !nuevaCita.hora) && (
                            <p className="text-xs text-red-400 mt-1">Selecciona fecha y hora</p>
                          )}
                        </div>
                      ) : (
                        <div>
                          {/* Picker de días disponibles del barbero */}
                          {editingFecha && (() => {
                            if (!nuevaCita.barberoId) {
                              return (
                                <p className="text-xs text-gray-lighter py-1">Selecciona un barbero primero para ver los días disponibles</p>
                              );
                            }
                            // Obtener los días de la semana en que trabaja el barbero
                            const diasTrabajados = Array.from(new Set(
                              horariosList
                                .filter((h: any) => Number(h.barberoId) === Number(nuevaCita.barberoId) && horarioEstaActivo(h))
                                .map((h: any) => normalizeDiaNombre(String(h.dia)))
                            ));
                            // Generar los próximos 14 días disponibles
                            const diasDisponibles: { fecha: string; label: string; diaNombre: string }[] = [];
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                            for (let i = 0; i < 28 && diasDisponibles.length < 14; i++) {
                              const d = new Date(today);
                              d.setDate(today.getDate() + i);
                              const diaNombre = dayNames[d.getDay()];
                              if (diasTrabajados.includes(diaNombre)) {
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                const fechaStr = `${y}-${m}-${day}`;
                                const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                                diasDisponibles.push({ fecha: fechaStr, label, diaNombre });
                              }
                            }
                            if (diasDisponibles.length === 0) {
                              return (
                                <p className="text-xs text-gray-lighter py-1">No hay días disponibles para este barbero</p>
                              );
                            }
                            return (
                              <div>
                                <p className="text-xs text-gray-lighter mb-1.5">Selecciona un día</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {diasDisponibles.map(({ fecha, label }) => (
                                    <button
                                      key={fecha}
                                      type="button"
                                      onClick={() => {
                                        setNuevaCita(prev => ({ ...prev, fecha }));
                                        setEditingFecha(false);
                                        setEditingHora(true);
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${nuevaCita.fecha === fecha
                                        ? 'bg-orange-primary text-white-primary'
                                        : 'bg-gray-darker text-gray-lighter hover:bg-gray-dark hover:text-gray-lightest'
                                        }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Picker de horas disponibles */}
                          {editingHora && nuevaCita.fecha && nuevaCita.barberoId > 0 && (() => {
                            const horasDisp = getHorasDisponiblesParaDia(nuevaCita.fecha, nuevaCita.barberoId, nuevaCita.duracion);
                            if (horasDisp.length === 0) {
                              return (
                                <p className="text-xs text-gray-lighter mt-2 py-1">No hay horas disponibles para este día</p>
                              );
                            }
                            return (
                              <div className="mt-2">
                                <p className="text-xs text-gray-lighter mb-1.5">Selecciona una hora</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {horasDisp.map(h => (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => {
                                        setNuevaCita(prev => ({ ...prev, hora: h }));
                                        setEditingHora(false);
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${nuevaCita.hora === h
                                        ? 'bg-orange-primary text-white-primary'
                                        : 'bg-gray-darker text-gray-lighter hover:bg-gray-dark hover:text-gray-lightest'
                                        }`}
                                    >
                                      {formatHoraStr12(h)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-dark/60 mx-4" />

                  {/* ── Fila: Barbero ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-2">
                      <User className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <SearchField<any>
                        label="Buscar barbero"
                        placeholder="Nombre del barbero..."
                        value={barberoFormSearchTerm}
                        onChange={setBarberoFormSearchTerm}
                        items={barberosList}
                        filterFn={(b, term) =>
                          (b.nombre || '').toLowerCase().includes(term.toLowerCase()) ||
                          (b.apellido || '').toLowerCase().includes(term.toLowerCase())
                        }
                        onSelect={(b) => {
                          const nombreCompleto = `${b.nombre} ${b.apellido || ''}`.trim();
                          setNuevaCita(prev => ({ ...prev, barberoId: b.id, barbero: nombreCompleto }));
                          setBarberoFormSearchTerm(nombreCompleto);
                        }}
                        onClear={() => {
                          setNuevaCita(prev => ({ ...prev, barberoId: 0, barbero: '' }));
                          setBarberoFormSearchTerm('');
                        }}
                        renderItem={(b) => (
                          <div className="flex items-center gap-3 w-full">
                            {b.fotoPerfil ? (
                              <img src={b.fotoPerfil} alt={b.nombre} className="w-8 h-8 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-gray-lighter" />
                              </div>
                            )}
                            <p className="text-sm text-gray-lightest">{`${b.nombre} ${b.apellido || ''}`.trim()}</p>
                          </div>
                        )}
                        isSelected={!!nuevaCita.barberoId}
                        error={showFormErrors && !nuevaCita.barberoId ? 'Selecciona un barbero' : undefined}
                      />

                      {/* Disponibilidad del barbero: horas disponibles para el día seleccionado */}
                      {nuevaCita.barberoId > 0 && nuevaCita.fecha && (() => {
                        const horasDisp = getHorasDisponiblesParaDia(nuevaCita.fecha, nuevaCita.barberoId, nuevaCita.duracion);
                        if (horasDisp.length === 0) return null;
                        return (
                          <div className="mt-2">
                            <p className="text-xs text-gray-lighter mb-1.5">Horas disponibles</p>
                            <div className="flex flex-wrap gap-1.5">
                              {horasDisp.map(h => (
                                <button
                                  key={h}
                                  type="button"
                                  onClick={() => setNuevaCita(prev => ({ ...prev, hora: h }))}
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${nuevaCita.hora === h
                                    ? 'bg-orange-primary text-white-primary'
                                    : 'bg-gray-darker text-gray-lighter hover:bg-gray-dark hover:text-gray-lightest'
                                    }`}
                                >
                                  {formatHoraStr12(h)}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="border-t border-gray-dark/60 mx-4" />

                  {/* ── Fila: Producto ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-2">
                      <ShoppingBag className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId ? (
                        <p className="text-gray-lighter text-sm">Selecciona un servicio o paquete para agregar productos</p>
                      ) : (
                        <>
                          <SearchField<any>
                            label="Buscar producto"
                            placeholder="Buscar producto..."
                            value={productoSearchTerm}
                            onChange={setProductoSearchTerm}
                            items={productosList}
                            filterFn={(p, term) =>
                              (p.nombre || '').toLowerCase().includes(term.toLowerCase())
                            }
                            onSelect={(p) => {
                              addProducto(p.id);
                              setProductoSearchTerm('');
                            }}
                            onClear={() => setProductoSearchTerm('')}
                            renderItem={(p) => {
                              const cantActual = nuevaCita.productoCantidades[p.id] || 0;
                              return (
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center">
                                    <ShoppingBag className="w-5 h-5 text-orange-primary/50" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white-primary text-sm font-medium truncate">{p.nombre}</p>
                                    {cantActual > 0 && (
                                      <p className="text-orange-primary text-xs">En carrito: {cantActual}</p>
                                    )}
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precio)}</span>
                                </div>
                              );
                            }}
                          />
                          {/* Productos seleccionados con control de cantidad */}
                          {Object.keys(nuevaCita.productoCantidades).length > 0 && (
                            <div className="space-y-2 mt-2">
                              {Object.entries(nuevaCita.productoCantidades).map(([idStr, cantidad]) => {
                                const pId = Number(idStr);
                                const prod = productosList.find(p => p.id === pId);
                                if (!prod) return null;
                                return (
                                  <div key={pId} className="flex items-center gap-2 bg-gray-darker/60 rounded-lg px-3 py-2">
                                    <span className="flex-1 text-sm text-gray-lightest truncate">{prod.nombre}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => removeProducto(pId)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-dark hover:bg-gray-medium text-gray-lighter hover:text-white-primary transition-colors"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="w-6 text-center text-sm text-gray-lightest tabular-nums">{cantidad}</span>
                                      <button
                                        type="button"
                                        onClick={() => addProducto(pId)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-dark hover:bg-gray-medium text-gray-lighter hover:text-white-primary transition-colors"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => quitarProducto(pId)}
                                        className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-dark hover:bg-red-600/60 text-gray-lighter hover:text-white-primary transition-colors ml-1"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-gray-dark/60 mx-4" />

                  {/* ── Fila: Notas ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2 mt-3">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-1">
                      <FileText className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0 border-b border-transparent focus-within:border-orange-primary/60 transition-colors pb-1">
                      <textarea
                        value={nuevaCita.notas}
                        rows={1}
                        ref={(el) => {
                          if (!el) return;
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }}
                        onChange={(e) => {
                          setNuevaCita(prev => ({ ...prev, notas: e.target.value }));
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        placeholder="Agregar notas o instrucciones especiales..."
                        className="w-full bg-transparent text-base text-gray-lightest placeholder-gray-lighter resize-none focus:outline-none focus:ring-0 overflow-hidden px-3"
                        style={{ outline: 'none', boxShadow: 'none' }}
                      />
                    </div>
                  </div>

                </div>

                {/* Footer sticky con botones */}
                <div className="border-t border-gray-dark bg-gray-darker/50 px-4 py-3 shrink-0">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-sm font-medium text-gray-lighter hover:text-white-primary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCita}
                      className="px-4 py-2 text-sm font-semibold bg-orange-primary text-black-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}

          {/* VISTA DE CALENDARIO */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="p-2">

            {/* Navegación de Semana */}
            <div className="std-card mb-4 !pt-3">

              {/* Fila única: título | spacer | nav semana | acciones */}
              <div className="flex items-center gap-3">

                {/* Título — extremo izquierdo */}
                <h4 className="text-xl font-bold text-gray-lightest tracking-wide shrink-0" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>Mis Citas</h4>

                {/* Spacer */}
                <div className="flex-1 min-w-0" />

                {/* Navegación de semana */}
                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => { setCurrentWeek(currentWeek - 1); setCarouselPage(0); }}
                    className="btn-ghost-icon"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-center px-4">
                    <h3 className="text-base font-semibold text-gray-lightest leading-tight">
                      {currentWeek === 0 ? 'Esta Semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
                    </h3>
                    <p className="text-xs text-gray-light">
                      {weekDays[0].fecha} - {weekDays[6].fecha}
                    </p>
                  </div>
                  <button
                    onClick={() => { setCurrentWeek(currentWeek + 1); setCarouselPage(0); }}
                    className="btn-ghost-icon"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setCurrentWeek(0); setCarouselPage(0); }}
                    className="elegante-button-secondary text-sm"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={handleOpenCreateModal}
                    className="btn-std-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Cita
                  </button>
                </div>
              </div>

              {/* Separador */}
              <div className="border-t border-gray-darker -mx-6 mt-4" />

              {/* Carrusel de citas de la semana */}
              {(() => {
                const weekFechas = new Set(weekDays.map(d => d.fechaCompleta));
                const citasSemana = citas
                  .filter(c => c.fecha && weekFechas.has(c.fecha))
                  .sort((a, b) => {
                    if (a.fecha < b.fecha) return -1;
                    if (a.fecha > b.fecha) return 1;
                    return (a.hora || '').localeCompare(b.hora || '');
                  });

                const totalPages = Math.max(1, Math.ceil(citasSemana.length / CAROUSEL_PAGE_SIZE));
                const pageCitas = citasSemana.slice(
                  carouselPage * CAROUSEL_PAGE_SIZE,
                  (carouselPage + 1) * CAROUSEL_PAGE_SIZE
                );

                return (
                  <div className="pt-4 pb-4 flex items-center gap-6">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        onClick={() => setCarouselPage(p => Math.max(0, p - 1))}
                        disabled={carouselPage === 0 || citasSemana.length === 0}
                        className={`shrink-0 transition-all rounded-lg p-2 border ${carouselPage === 0 || citasSemana.length === 0
                          ? 'bg-gray-darkest border-gray-dark/20 text-gray-dark cursor-not-allowed opacity-40'
                          : 'bg-gray-darker border-gray-dark text-white-primary hover:text-orange-primary hover:border-gray-medium cursor-pointer'
                          }`}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex-1 flex gap-3 min-w-0 pr-20">
                        {citasSemana.length === 0 ? (
                          <p className="flex-1 text-center text-sm text-gray-dark">Sin citas para esta semana</p>
                        ) : (
                          <>
                            {pageCitas.map((cita: any) => {
                              const servicio = formatNombre(cita.servicioNombre || cita.paqueteNombre || '—');
                              const horaRango = formatRangoHorarioCita(cita);
                              const subtitulo = [horaRango, formatNombre(cita.barberoNombre)].join(' — ');
                              const estadoColor =
                                cita.estado === 'Completada'
                                  ? 'border-l-[3px] border-l-[#7aab8a]'
                                  : cita.estado === 'Cancelada' || cita.estado === 'Anulada'
                                    ? 'border-l-[3px] border-l-[#b07070]'
                                    : 'border-l-[3px] border-l-orange-primary';
                              return (
                                <div
                                  key={cita.id}
                                  className={`flex-1 min-w-0 bg-gray-darker/40 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-dark border border-gray-dark/40 hover:border-gray-medium transition-all duration-200 ${estadoColor}`}
                                  onClick={() => {
                                    setSelectedCita(cita);
                                    setIsDetailDialogOpen(true);
                                  }}
                                >
                                  <p className="text-sm font-normal text-gray-lightest truncate leading-tight">
                                    {servicio}
                                  </p>
                                  <p className="text-xs text-gray-lighter/80 truncate mt-0.5 leading-tight font-normal">
                                    {formatNombre(cita.barberoNombre)}
                                  </p>
                                  <p className="text-[11px] text-gray-light mt-1 leading-tight font-normal tracking-tight">
                                    {subtitulo}
                                  </p>
                                </div>
                              );
                            })}
                            {pageCitas.length < CAROUSEL_PAGE_SIZE && Array.from({ length: CAROUSEL_PAGE_SIZE - pageCitas.length }).map((_, i) => (
                              <div key={`empty-${i}`} className="flex-1 min-w-0" />
                            ))}
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => setCarouselPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={carouselPage >= totalPages - 1 || citasSemana.length === 0}
                        className={`shrink-0 transition-all rounded-lg p-2 border ${carouselPage >= totalPages - 1 || citasSemana.length === 0
                          ? 'bg-gray-darkest border-gray-dark/20 text-gray-dark cursor-not-allowed opacity-40'
                          : 'bg-gray-darker border-gray-dark text-white-primary hover:text-orange-primary hover:border-gray-medium cursor-pointer'
                          }`}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="ml-10 w-[220px] shrink-0 flex justify-end">
                      <div className="rounded-lg border border-gray-dark bg-gray-darker/50 px-3 py-2 text-center min-w-[170px]">
                        <p className="text-[10px] uppercase tracking-widest text-gray-lighter">Total Semana</p>
                        <p className="text-sm font-semibold text-gray-lightest tabular-nums">{citasSemana.length} citas</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Grid de horarios + headers de días — un solo card unificado */}
            <div className="std-card mb-0 !py-0">
              <div className="w-full py-5">
                <div className="-mx-6 pl-3 pr-6">

                  {/* Fila de headers de días */}
                  <div
                    className="grid gap-1 mb-2"
                    style={{ gridTemplateColumns: calendarGridTemplate }}
                  >
                    <div />
                    {weekDays.map(({ dia, fecha, fechaCompleta }) => {
                      const isToday = fechaCompleta === toLocalDateString(new Date());
                      return (
                        <div
                          key={dia}
                          className={`min-w-0 text-center rounded-lg py-3 border-2 flex flex-col items-center justify-center gap-1 ${isToday ? 'border-orange-primary bg-orange-primary/10' : 'border-transparent'
                            }`}
                        >
                          <h4 className="text-sm tracking-[0.06em] uppercase text-gray-lightest leading-none font-bold">{dia.slice(0, 3)}</h4>
                          <p className="text-sm tracking-[0.06em] text-gray-lightest">{fecha}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Filas de horarios */}
                  {(() => {
                    const todayStr = toLocalDateString(new Date());
                    return horasDelDia.map((hora) => (
                      <div
                        key={hora}
                        className="grid gap-1 h-20"
                        style={{ gridTemplateColumns: calendarGridTemplate }}
                      >
                        <div className="flex h-full items-center justify-center text-center text-[11px] font-semibold tracking-[0.04em] text-gray-lightest whitespace-nowrap">
                          {formatHora12(hora)}
                        </div>
                        {weekDays.map((dayInfo) => {
                          const citasEnSlot = getCitasEnSlot(dayInfo.fechaCompleta, hora);

                          let isPastSlot = false;
                          if (dayInfo.fechaCompleta < todayStr) {
                            isPastSlot = true;
                          } else if (dayInfo.fechaCompleta === todayStr) {
                            const today = new Date();
                            const cur = today.getHours() * 60 + today.getMinutes();
                            if ((hora * 60) <= cur) isPastSlot = true;
                          }

                          const slotKey = `${dayInfo.fechaCompleta}-${hora}`;

                          // Citas cuyo inicio visible es este slot
                          // Usamos el slot de grilla redondeado (floor al múltiplo de 0.5)
                          const citasQueArrancanAqui = citasEnSlot.filter(cita => {
                            const [hh, mm] = (cita.hora || '').split(':');
                            const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                            const citaInicioSlot = Math.floor(citaInicio * 2) / 2;
                            if (Math.abs(citaInicioSlot - hora) < 0.001) return true;
                            if (citaInicioSlot < hora) {
                              const startEnGrilla = horasDelDia.some(h => Math.abs(h - citaInicioSlot) < 0.001);
                              if (!startEnGrilla) {
                                const primerSlotGrilla = horasDelDia.find(h => h > citaInicioSlot);
                                return primerSlotGrilla !== undefined && Math.abs(primerSlotGrilla - hora) < 0.001;
                              }
                            }
                            return false;
                          });

                          // Citas que pasan por este slot pero arrancan en un slot anterior
                          const citasOcupandoSlot = citasEnSlot.filter(cita => {
                            const [hh, mm] = (cita.hora || '').split(':');
                            const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                            const citaInicioSlot = Math.floor(citaInicio * 2) / 2;
                            if (Math.abs(citaInicioSlot - hora) < 0.001) return false;
                            if (citaInicioSlot < hora) {
                              const startEnGrilla = horasDelDia.some(h => Math.abs(h - citaInicioSlot) < 0.001);
                              let slotInicioVisible: number;
                              if (startEnGrilla) {
                                slotInicioVisible = citaInicioSlot;
                              } else {
                                const primerSlotGrilla = horasDelDia.find(h => h > citaInicioSlot);
                                if (primerSlotGrilla === undefined || primerSlotGrilla >= hora) return false;
                                slotInicioVisible = primerSlotGrilla;
                              }
                              const inicioKey = `${dayInfo.fechaCompleta}-${slotInicioVisible}`;
                              const citasEnInicio = getCitasEnSlot(dayInfo.fechaCompleta, slotInicioVisible).filter(c => {
                                const [ch, cm] = (c.hora || '').split(':');
                                const cInicio = parseInt(ch) + parseInt(cm || '0') / 60;
                                return Math.abs(Math.floor(cInicio * 2) / 2 - slotInicioVisible) < 0.001;
                              });
                              if (citasEnInicio.length === 0) return false;
                              const idxEnInicio = (slotCitaIndex[inicioKey] ?? 0) % citasEnInicio.length;
                              return citasEnInicio[idxEnInicio]?.id === cita.id;
                            }
                            return false;
                          });

                          const tieneCita = citasEnSlot.length > 0;
                          const isBlockHovered = !isPastSlot && hoveredSlotKey === slotKey;

                          return (
                            <div
                              key={`${dayInfo.dia}-${hora}`}
                              className={`min-w-0 h-full transition-all duration-200 ${
                                tieneCita
                                  ? `relative min-h-0 overflow-visible ${isPastSlot ? 'cursor-default' : 'cursor-pointer group'}`
                                  : isPastSlot
                                    ? 'relative rounded border bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-60'
                                    : `relative rounded border border-gray-dark bg-gray-darker cursor-pointer group ${CAL_GRID_HOVER_CELL}`
                              }`}
                              onClick={() => {
                                if (isPastSlot) return;
                                if (isCreateModalOpen || isDetailDialogOpen || isDeleteDialogOpen || overflowPopup !== null) return;
                                if (!tieneCita) {
                                  handleSlotClick(dayInfo.fechaCompleta, hora);
                                }
                              }}
                            >
                              {/* Slot vacío: hover + */}
                              {!tieneCita && !isPastSlot && (
                                <div className={`absolute inset-0 z-[1] rounded ${CAL_GRID_HOVER_SHIMMER}`}>
                                  <Plus className={CAL_GRID_HOVER_PLUS_ICON} />
                                </div>
                              )}

                              {/* Bloque de cita — admin style */}
                              {tieneCita && (
                                <div className={`absolute inset-0 cita-calendar-block${!isPastSlot ? ' cursor-pointer' : ''}`}>
                                  <div
                                    className={`absolute inset-0 flex flex-col justify-start gap-1 rounded-md overflow-hidden px-1.5 pt-2 pb-1 transition-[background-color,border-color] duration-200 ease-out ${
                                      isPastSlot
                                        ? 'cursor-default border border-gray-dark/45 bg-gray-darkest/90 opacity-[0.92]'
                                        : `border bg-gray-darker border-gray-dark${isBlockHovered ? ' cal-block-hovered' : ''}`
                                    }`}
                                    onMouseOver={!isPastSlot ? (e) => {
                                      setHoveredSlotKey(e.target === e.currentTarget ? slotKey : null);
                                    } : undefined}
                                    onMouseLeave={!isPastSlot ? () => setHoveredSlotKey(null) : undefined}
                                  >
                                    {citasQueArrancanAqui.length > 0 ? (
                                      <>
                                        {citasQueArrancanAqui.slice(0, 2).map((citaItem: any) => {
                                          const dotColor = getCitaDotColor(citaItem);
                                          const visibleText = `${formatHoraStr12(citaItem.hora)} ${formatNombre(citaItem.servicioNombre || citaItem.paqueteNombre || 'Servicio')} - ${formatNombre(citaItem.barberoNombre || 'Barbero')}`;
                                          return (
                                            <div
                                              key={citaItem.id}
                                              className="flex items-center gap-1.5 min-w-0 w-full rounded cursor-pointer"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedCita(citaItem);
                                                setIsDetailDialogOpen(true);
                                              }}
                                              onMouseEnter={(e) => {
                                                const span = e.currentTarget.querySelector('span');
                                                if (span) span.style.color = 'rgba(255,255,255,0.95)';
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                showTooltip({
                                                  cita: citaItem,
                                                  rect,
                                                  servicioLabel: formatNombre(citaItem.servicioNombre || citaItem.paqueteNombre || 'Servicio'),
                                                  tabColor: dotColor,
                                                });
                                              }}
                                              onMouseLeave={(e) => {
                                                const span = e.currentTarget.querySelector('span');
                                                if (span) span.style.color = '';
                                                scheduleHideTooltip();
                                              }}
                                            >
                                              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dotColor }} />
                                              <span className="truncate text-[9px] font-bold text-gray-lightest leading-tight" style={{ transition: 'color 150ms' }}>
                                                {visibleText}
                                              </span>
                                            </div>
                                          );
                                        })}
                                        {citasQueArrancanAqui.length > 2 && (
                                          <button
                                            type="button"
                                            className="self-start text-left text-[8px] font-semibold leading-tight rounded transition-all duration-150 px-0.5"
                                            style={{ color: 'rgba(160,160,168,0.80)', paddingLeft: '3px', cursor: 'pointer' }}
                                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.90)'; }}
                                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,168,0.80)'; }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOverflowPopup({
                                                citas: citasQueArrancanAqui,
                                                rect: e.currentTarget.getBoundingClientRect(),
                                                horaLabel: formatHora12(hora),
                                                diaLabel: dayInfo.dia,
                                                fechaCompleta: dayInfo.fechaCompleta,
                                              });
                                            }}
                                          >
                                            {citasQueArrancanAqui.length - 2} más
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      /* Continuation slot: vertical colored line */
                                      <div
                                        className="absolute inset-y-2 left-1.5 rounded-full"
                                        style={{ width: 2, background: getCitaDotColor(citasEnSlot[0]) }}
                                      />
                                    )}
                                    {citasEnSlot.some((c: any) => c.estado === 'Completada') && (
                                      <div className="absolute bottom-0 left-0 h-0.5 bg-blue-600 w-full" />
                                    )}
                                  </div>
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
        </>
      )}

      {/* Mini-tooltip al hacer hover sobre fila de cita */}
      {hoveredCita && createPortal(
        <div
          className="fixed z-[9999] cursor-pointer"
          style={{
            top: hoveredCita.rect.top - 8,
            left: hoveredCita.rect.left + hoveredCita.rect.width / 2,
            transform: `translate(-50%, -100%) translateY(${tooltipVisible ? 0 : 4}px)`,
            opacity: tooltipVisible ? 1 : 0,
            transition: 'opacity 140ms ease, transform 140ms ease',
            pointerEvents: tooltipVisible ? 'auto' : 'none',
          }}
          onMouseLeave={() => scheduleHideTooltip()}
          onMouseEnter={() => cancelHideTooltip()}
          onClick={() => {
            cancelHideTooltip();
            setSelectedCita(hoveredCita.cita);
            setIsDetailDialogOpen(true);
            setHoveredCita(null);
            setTooltipVisible(false);
          }}
        >
          <div
            className="rounded-xl px-3 py-2 text-left select-none flex gap-2.5 items-stretch"
            style={{
              background: 'rgba(18,18,20,0.96)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(216,176,129,0.15)',
              minWidth: 140,
              maxWidth: 210,
            }}
          >
            <div className="w-1 rounded-full shrink-0" style={{ background: hoveredCita.tabColor }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: '#d8b081' }}>
                {hoveredCita.servicioLabel}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(160,160,168,0.90)' }}>
                {formatRangoHorarioCita(hoveredCita.cita)}
              </p>
              {hoveredCita.cita.barberoNombre && (
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(160,160,168,0.65)' }}>
                  {formatNombre(hoveredCita.cita.barberoNombre)}
                </p>
              )}
            </div>
          </div>
          <div className="flex justify-center -mt-px">
            <div className="w-2 h-2 rotate-45" style={{ background: 'rgba(18,18,20,0.96)' }} />
          </div>
        </div>,
        document.body
      )}

      {/* Overflow popup — más de 2 citas en un slot */}
      {overflowPopup && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOverflowPopup(null)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
            style={(() => {
              const r = overflowPopup.rect;
              const popW = 290;
              const popMaxH = 360;
              const slotCenterY = (r.top + r.bottom) / 2;
              const top = Math.max(8, Math.min(slotCenterY - popMaxH / 2, window.innerHeight - popMaxH - 8));
              const left = Math.min(r.left, window.innerWidth - popW - 12);
              return { top, left, width: popW, maxHeight: popMaxH, overflowY: 'auto' as const, boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.60)' };
            })()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center px-4 py-4 border-b border-gray-dark bg-gray-darker/60 sticky top-0">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-lighter leading-none">
                  {overflowPopup.diaLabel.slice(0, 3)}
                </span>
                <span className="text-2xl font-bold text-white-primary leading-none">
                  {new Date(`${overflowPopup.fechaCompleta}T12:00:00`).getDate()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOverflowPopup(null)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-lighter hover:text-white-primary hover:bg-gray-dark transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="py-2">
              {overflowPopup.citas.map((cita: any) => {
                const color = getCitaDotColor(cita);
                return (
                  <button
                    key={cita.id}
                    type="button"
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-dark transition-colors"
                    style={{ paddingLeft: '1.75rem', paddingRight: '1rem' }}
                    onClick={() => {
                      setOverflowPopup(null);
                      setSelectedCita(cita);
                      setIsDetailDialogOpen(true);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[11px] font-semibold text-gray-lightest truncate">
                      {formatHoraStr12(cita.hora)} {formatNombre(cita.servicioNombre || cita.paqueteNombre || 'Servicio')} - {formatNombre(cita.barberoNombre || 'Barbero')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Modal Detalle Cita */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark/60 text-white-primary max-w-sm max-h-[90vh] overflow-y-auto p-0">
          {selectedCita && (() => {
            const barberoData = barberosList.find((b: any) => Number(b.id) === Number(selectedCita.barberoId));
            const paqueteData = selectedCita.paqueteId ? paquetesList.find((p: any) => p.id === selectedCita.paqueteId) : null;
            const estadoColor =
              selectedCita.estado === 'Completada' ? '#3B82F6'
              : selectedCita.estado === 'Cancelada' ? '#EF4444'
              : '#d8b081';

            // Calcular hora fin
            const horaFin = (() => {
              if (!selectedCita.hora) return '';
              const [hh, mm] = selectedCita.hora.split(':').map(Number);
              const finMin = hh * 60 + mm + (selectedCita.duracion || 60);
              const finHH = Math.floor(finMin / 60).toString().padStart(2, '0');
              const finMM = String(finMin % 60).padStart(2, '0');
              return formatHoraStr12(`${finHH}:${finMM}`);
            })();

            // Fecha legible
            const fechaLegible = (() => {
              if (!selectedCita.fecha) return '';
              const d = new Date(selectedCita.fecha + 'T12:00:00');
              const s = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
              return s.charAt(0).toUpperCase() + s.slice(1);
            })();

            const servicioNombre = selectedCita.servicioNombre || selectedCita.paqueteNombre || '—';

            return (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark/60 bg-gray-darker/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-orange-primary/10 border border-orange-primary/20 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4 text-orange-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-gray-lightest truncate">{formatNombre(servicioNombre)}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                          style={{ background: `${estadoColor}18`, color: estadoColor, borderColor: `${estadoColor}40` }}
                        >
                          {selectedCita.estado}
                        </span>
                        {paqueteData && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-orange-primary/15 text-orange-primary border border-orange-primary/30">
                            Paquete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                    <button
                      onClick={() => handleOpenEdit(selectedCita)}
                      className="p-2 bg-orange-primary/10 hover:bg-orange-primary/20 rounded-xl transition-all border border-orange-primary/20 shrink-0 ml-2"
                      title="Modificar cita"
                    >
                      <Edit className="w-4 h-4 text-orange-primary" />
                    </button>
                  )}
                </div>

                {/* Contenido — filas estilo admin */}
                <div className="px-4 py-2">

                  {/* Separador */}
                  <div className="border-t border-gray-dark/60 mb-1" />

                  {/* Fila: Fecha y hora */}
                  <div className="flex items-center gap-0 py-3">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0 }} className="flex items-center justify-center">
                      <Clock className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-lightest">{fechaLegible}</p>
                      <p className="text-sm text-gray-lighter mt-0.5">
                        {formatHoraStr12(selectedCita.hora)}{horaFin ? ` – ${horaFin}` : ''} · {selectedCita.duracion || 60} min
                      </p>
                    </div>
                  </div>

                  {/* Fila: Barbero */}
                  <div className="flex items-center gap-0 py-3">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0 }} className="flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-dark border border-gray-dark flex items-center justify-center shrink-0">
                        {barberoData?.fotoPerfil ? (
                          <img src={barberoData.fotoPerfil} alt={selectedCita.barberoNombre} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-lighter" />
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-lightest">{formatNombre(selectedCita.barberoNombre) || 'Sin barbero asignado'}</p>
                      <p className="text-xs text-gray-lighter mt-0.5">Barbero</p>
                    </div>
                  </div>

                  {/* Fila: Precio */}
                  <div className="flex items-center gap-0 py-3">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0 }} className="flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-lightest font-semibold text-orange-primary">{formatearPrecio(selectedCita.precio)}</p>
                      <p className="text-xs text-gray-lighter mt-0.5">Precio total</p>
                    </div>
                  </div>

                  {/* Fila: Productos (si hay) */}
                  {selectedCita.productosNombres && selectedCita.productosNombres.length > 0 && (
                    <div className="flex items-start gap-0 py-3">
                      <div style={{ width: 44, minWidth: 44, flexShrink: 0 }} className="flex items-center justify-center pt-0.5">
                        <ShoppingBag className="w-5 h-5 text-gray-lighter" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-lightest">
                          {selectedCita.productosNombres.join(', ')}
                        </p>
                        <p className="text-xs text-gray-lighter mt-0.5">Productos incluidos</p>
                      </div>
                    </div>
                  )}

                  {/* Fila: Notas (si hay) */}
                  {selectedCita.notas && (
                    <div className="flex items-start gap-0 py-3">
                      <div style={{ width: 44, minWidth: 44, flexShrink: 0 }} className="flex items-center justify-center pt-0.5">
                        <FileText className="w-5 h-5 text-gray-lighter" />
                      </div>
                      <p className="text-sm text-gray-lighter leading-relaxed">{selectedCita.notas}</p>
                    </div>
                  )}

                  {/* Separador */}
                  <div className="border-t border-gray-dark/60 mt-1" />

                  {/* Acciones */}
                  {selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                    <div className="flex flex-col gap-2 pt-3 pb-2">
                      <p className="text-[10px] text-gray-lighter text-center italic">
                        ¿No puedes asistir? Por favor cancela con al menos 2 horas de anticipación.
                      </p>
                      <button
                        onClick={() => {
                          setCitaToDelete(selectedCita);
                          setIsDetailDialogOpen(false);
                          setIsDeleteDialogOpen(true);
                        }}
                        className="w-full py-2.5 text-sm font-medium text-red-400 hover:bg-red-600/10 border border-transparent hover:border-red-500/30 rounded-lg transition-all"
                      >
                        Cancelar reservación
                      </button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
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
