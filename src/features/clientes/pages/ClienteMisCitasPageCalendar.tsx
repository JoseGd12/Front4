import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  CalendarDays,
  Package,
  ShoppingBag,
  FileText,
  X,
  AlertCircle
} from "lucide-react";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Input } from "../../../shared/components/ui/input";
import { DatePicker } from "../../../shared/components/ui/DatePicker";
import { Calendar as UICalendar } from "../../../shared/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { Textarea } from "../../../shared/components/ui/textarea";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { PerfilIncompletoModal } from "../../../shared/components/ui/PerfilIncompletoModal";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { productoService } from "../../productos/services/productos";
import { horariosService } from "../../agendamiento/services/horariosService";
import { formatDuracion } from "../../../shared/utils/dateUtils";
import { MIN_ANTICIPACION_AGENDA_MINUTOS } from "../../agendamiento/constants";
import {
  getHorariosBarberoParaDia,
  getHorasDisponiblesParaDia as calcularHorasDisponibles,
  filtrarBarberosDisponibles,
  horarioEstaActivo,
  normalizeDiaNombre,
  normalizarFechaCita,
  parseHoraAMinutos,
  toLocalDateString,
  CALENDAR_SLOT_HOURS,
  barberoTrabajaEnFecha,
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
  onGoToPerfil?: () => void;
}

export function ClienteMisCitasPageCalendar({ initialItem, onClearInitialItem, preSelectedProduct, onClearPreSelectedProduct, onGoToPerfil }: ClienteMisCitasPageCalendarProps) {
  const { user } = useAuth();
  const { success, error, AlertContainer } = useCustomAlert();
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCliente, setCurrentCliente] = useState<any>(null);
  const [showPerfilModal, setShowPerfilModal] = useState(false);
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([]);
  const [barberoHorarioError, setBarberoHorarioError] = useState<string | null>(null);

  const getPerfilFaltantes = (cliente: any): string[] => {
    const faltantes: string[] = [];
    const docStr = (cliente?.documento || '').trim();
    const isTempDoc = !docStr || docStr.startsWith('PASO-');

    if (isTempDoc) {
      faltantes.push('documento');
    } else {
      const partes = docStr.split(/\s+/);
      if (partes.length < 2) {
        // Documento tiene solo el número sin tipo. Verificar si tipoDocumento
        // está definido como campo separado en el objeto usuario anidado.
        const tipoSeparado = (
          cliente?.usuario?.tipoDocumento ||
          cliente?.tipoDocumento ||
          ''
        ).trim();
        if (!tipoSeparado) faltantes.push('tipoDocumento');
      }
    }

    if (!cliente?.fechaNacimiento) faltantes.push('fechaNacimiento');
    if (!cliente?.telefono) faltantes.push('telefono');
    if (!cliente?.direccion) faltantes.push('direccion');
    if (!cliente?.barrio) faltantes.push('barrio');
    return faltantes;
  };

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
      setProductosList((Array.isArray(productosData) ? productosData : []).filter((p: any) => p.activo !== false && (p.stock ?? p.cantidad ?? 0) > 0));
      setHorariosList(horariosData || []);

      // Si venimos con un item pre-seleccionado desde Servicios
      if (initialItem) {
        handleSelectInitialItem(initialItem, serviciosData, paquetesData, cliente);
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
  const [servicioSearchTerm, setServicioSearchTerm] = useState('');
  const [paqueteSearchTerm, setPaqueteSearchTerm] = useState('');
  const [productoSearchTerm, setProductoSearchTerm] = useState('');
  const [formServicioPage, setFormServicioPage] = useState(0);
  const [formProductoPage, setFormProductoPage] = useState(0);
  const [formPaqueteServicioPage, setFormPaqueteServicioPage] = useState(0);
  const FORM_CAROUSEL_SIZE = 3;
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [isSavingCita, setIsSavingCita] = useState(false);
  const isSavingCitaRef = useRef(false);
  const initialFormSnapshotRef = useRef<any>(null);
  const showDiscardDialogRef = useRef(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
  const [editingFecha, setEditingFecha] = useState(false);
  const [editingHora, setEditingHora] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const hourPickerRef = useRef<HTMLDivElement>(null);
  const MODAL_HEIGHT = Math.min(580, window.innerHeight - 32);
  const MODAL_MIN_HEIGHT = 220;
  const MODAL_DOCKED_TOP = window.innerHeight - 16 - MODAL_HEIGHT;
  const [modalHeight, setModalHeight] = useState<number>(MODAL_HEIGHT);
  const [modalTop, setModalTop] = useState<number>(MODAL_DOCKED_TOP);
  const [modalLeft, setModalLeft] = useState<number | null>(null);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const dragState = useRef<{ dragging: boolean; startY: number; startX: number; startHeight: number; startTop: number; startLeft: number }>({ dragging: false, startY: 0, startX: 0, startHeight: MODAL_HEIGHT, startTop: MODAL_DOCKED_TOP, startLeft: 0 });

  // Resetear carrusel de citas al cambiar de semana
  useEffect(() => { setCarouselPage(0); }, [currentWeek]);

  // Cuando llega un producto pre-seleccionado desde la página de productos,
  // abrir el formulario y guardar el producto pendiente para agregarlo al seleccionar servicio/paquete
  useEffect(() => {
    if (preSelectedProduct && !isLoading && productosList.length > 0) {
      const faltantes = getPerfilFaltantes(currentCliente);
      if (faltantes.length > 0) {
        setCamposFaltantes(faltantes);
        setShowPerfilModal(true);
        if (onClearPreSelectedProduct) onClearPreSelectedProduct();
        return;
      }
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
      setModalHeight(MODAL_HEIGHT);
      setModalTop(MODAL_DOCKED_TOP);
      setModalLeft(null);
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

  const handleSelectInitialItem = (item: any, currentServicios: any[], currentPaquetes: any[], clienteOverride?: any) => {
    const faltantes = getPerfilFaltantes(clienteOverride ?? currentCliente);
    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setShowPerfilModal(true);
      if (onClearInitialItem) onClearInitialItem();
      return;
    }
    setIsEditMode(false);

    // ── Handle barbero-type selection from landing page ──
    if (item.type === 'barbero') {
      const nombreBarbero = String(item.nombre || '').trim().toLowerCase();
      const barberoMatch = barberosList.find(
        (b: any) => String(b.nombre || '').trim().toLowerCase().includes(nombreBarbero)
          || nombreBarbero.includes(String(b.nombre || '').trim().toLowerCase())
      );

      const { fecha: fechaAuto, hora: horaAuto } = getAutoDateTime();

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
      setModalHeight(MODAL_HEIGHT);
      setModalTop(MODAL_DOCKED_TOP);
      setModalLeft(null);
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

    const { fecha: fechaAuto, hora: horaAuto } = getAutoDateTime();

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
    setModalHeight(MODAL_HEIGHT);
    setModalTop(MODAL_DOCKED_TOP);
    setModalLeft(null);
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

  const validarDisponibilidadBarbero = (barberoId: number): string | null => {
    if (!nuevaCita.fecha || !nuevaCita.hora) return null;
    const today = new Date();
    const todayStr = toLocalDateString(today);
    if (nuevaCita.fecha < todayStr) return "No se permite agendar citas en dias anteriores al dia actual.";
    const durNueva = Number(nuevaCita.duracion || 60);
    const [hhStr, mmStr = '0'] = String(nuevaCita.hora).split(':');
    const startNueva = (parseInt(hhStr || '0', 10) * 60) + (parseInt(mmStr || '0', 10));
    if (nuevaCita.fecha === todayStr) {
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      if (startNueva <= currentMinutes + MIN_ANTICIPACION_AGENDA_MINUTOS)
        return `Debes agendar con al menos ${MIN_ANTICIPACION_AGENDA_MINUTOS} minutos de anticipacion.`;
    }
    const endNueva = startNueva + durNueva;
    const horariosBarbero = getHorariosBarberoParaDia(horariosList, barberoId, nuevaCita.fecha);
    if (horariosBarbero.length === 0) {
      const diaStr = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'][new Date(`${nuevaCita.fecha}T12:00:00`).getDay()];
      return `El barbero no trabaja los dias ${diaStr}.`;
    }
    const dentroHorario = horariosBarbero.some((h: any) => {
      const startH = parseHoraAMinutos(h.horaInicio || '00:00');
      const endH = parseHoraAMinutos(h.horaFin || '23:59');
      return startNueva >= startH && endNueva <= endH;
    });
    if (!dentroHorario) {
      const horasDisponiblesStr = horariosBarbero.map((h: any) => `${h.horaInicio} a ${h.horaFin}`).join(", ");
      return `La hora seleccionada esta fuera de su horario laboral. Horas disponibles: ${horasDisponiblesStr}.`;
    }
    const solapa = citas.find((cita: any) => {
      if (normalizarFechaCita(cita.fecha) !== nuevaCita.fecha) return false;
      if (Number(cita.barberoId) !== Number(barberoId)) return false;
      if (isEditMode && selectedCita && cita.id === selectedCita.id) return false;
      if (String(cita.estado || '').toLowerCase() === 'cancelada') return false;
      const [ch, cm = '0'] = String(cita.hora || '').split(':');
      const startExist = (parseInt(ch || '0', 10) * 60) + (parseInt(cm || '0', 10));
      const endExist = startExist + Number(cita.duracion || 60);
      return startNueva < endExist && startExist < endNueva;
    });
    if (solapa) return `El barbero ya tiene otra cita ocupada de ${solapa.hora} (+${solapa.duracion}min). Selecciona otro horario.`;
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

  const barberosParaFormulario = useMemo(
    () =>
      filtrarBarberosDisponibles(barberosList, horariosList, {
        fechaStr: nuevaCita.fecha,
        hora: nuevaCita.hora || undefined,
        duracionMinutos: nuevaCita.duracion,
        citas,
        ignoreCitaId: isEditMode && selectedCita ? selectedCita.id : undefined,
        minAnticipacionMinutos: MIN_ANTICIPACION_AGENDA_MINUTOS,
        slotHours: horasDelDia,
      }),
    [barberosList, horariosList, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion, citas, selectedCita?.id, isEditMode]
  );

  useEffect(() => {
    if (!nuevaCita.barberoId || !nuevaCita.fecha) {
      setBarberoHorarioError(null);
      return;
    }
    const sigueDisponible = barberosParaFormulario.some(
      (b: any) => Number(b.id) === Number(nuevaCita.barberoId)
    );
    if (!sigueDisponible) {
      if (nuevaCita.hora && barberoTrabajaEnFecha(horariosList, nuevaCita.barberoId, nuevaCita.fecha)) {
        const horariosBarbero = getHorariosBarberoParaDia(horariosList, nuevaCita.barberoId, nuevaCita.fecha);
        const horaFinMax = horariosBarbero.reduce((maxFin: string, h: any) => {
          return (h.horaFin || '00:00') > maxFin ? (h.horaFin || '00:00') : maxFin;
        }, '00:00');
        setBarberoHorarioError(
          `La duración del servicio (${nuevaCita.duracion} min) a partir de las ${formatHoraStr12(nuevaCita.hora)} supera el horario de este barbero, que termina a las ${formatHoraStr12(horaFinMax)}. Selecciona un horario más temprano.`
        );
      } else {
        setBarberoHorarioError(null);
        setNuevaCita((prev) => ({ ...prev, barberoId: 0, barbero: '' }));
        setBarberoFormSearchTerm('');
      }
    } else {
      setBarberoHorarioError(null);
    }
  }, [barberosParaFormulario, nuevaCita.barberoId, nuevaCita.fecha]);

  const getAutoDateTime = () => {
    const now = new Date();
    const future = new Date(now.getTime() + (60 * 60 * 1000));
    let hours = future.getHours();
    let minutes = future.getMinutes();
    let targetDate = now;
    if (minutes < 15) { minutes = 0; }
    else if (minutes < 45) { minutes = 30; }
    else { minutes = 0; hours += 1; }
    if (hours >= 22 || (hours === 21 && minutes > 30)) {
      targetDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      hours = 11; minutes = 0;
    } else if (hours < 9) { hours = 11; minutes = 0; }
    const fecha = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    const hora = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return { fecha, hora };
  };

  const buildCurrentFormSnapshot = () => ({
    barberoId: nuevaCita.barberoId,
    barbero: nuevaCita.barbero,
    servicioId: nuevaCita.servicioId,
    servicioIds: JSON.stringify(nuevaCita.servicioIds),
    productoCantidades: JSON.stringify(nuevaCita.productoCantidades),
    paqueteId: nuevaCita.paqueteId,
    servicio: nuevaCita.servicio,
    fecha: nuevaCita.fecha,
    hora: nuevaCita.hora,
    duracion: nuevaCita.duracion,
    precio: nuevaCita.precio,
    notas: (nuevaCita.notas || '').trim(),
    tipoServicio,
    barberoFormSearchTerm,
    servicioSearchTerm,
    paqueteSearchTerm,
    productoSearchTerm,
  });

  const isFormDirtyNow = useCallback((): boolean => {
    const init = initialFormSnapshotRef.current;
    if (!init) return false;
    const current = buildCurrentFormSnapshot();
    return Object.keys(current).some((key) => (current as any)[key] !== (init as any)[key]);
  }, [nuevaCita, tipoServicio, barberoFormSearchTerm, servicioSearchTerm, paqueteSearchTerm, productoSearchTerm]);

  const handleOpenCreateModal = () => {
    const faltantes = getPerfilFaltantes(currentCliente);
    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setShowPerfilModal(true);
      return;
    }
    const { fecha, hora } = getAutoDateTime();
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };
    setModalPosition(position);
    setModalHeight(MODAL_HEIGHT);
    setModalTop(MODAL_DOCKED_TOP);
    setModalLeft(null);
    setIsEditMode(false);
    setSelectedCita(null);
    setShowFormErrors(false);
    setDismissedErrors(new Set());
    setNuevaCita({
      barberoId: 0, barbero: '',
      servicioId: null, servicioIds: [], productoCantidades: {},
      paqueteId: null, servicio: '',
      fecha, hora, notas: '', duracion: 60, precio: 0, estado: 'Pendiente'
    });
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setTipoServicio('individuales');
    setEditingFecha(false);
    setEditingHora(false);
    initialFormSnapshotRef.current = {
      barberoId: 0, barbero: '',
      servicioId: null, servicioIds: JSON.stringify([]), productoCantidades: JSON.stringify({}),
      paqueteId: null, servicio: '',
      fecha, hora, duracion: 60, precio: 0, notas: '',
      tipoServicio: 'individuales',
      barberoFormSearchTerm: '', servicioSearchTerm: '', paqueteSearchTerm: '', productoSearchTerm: '',
    };
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
  };

  const handleSlotClick = (fechaCompleta: string, hora: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Evitar crear citas en días pasados
    if (fechaCompleta < todayStr) return;

    const faltantes = getPerfilFaltantes(currentCliente);
    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes);
      setShowPerfilModal(true);
      return;
    }

    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    const horaString = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;

    // Calcular posición centrada en pantalla (cerca del slot no es posible sin ref al elemento)
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };

    setModalPosition(position);
    setModalHeight(MODAL_HEIGHT);
    setModalTop(MODAL_DOCKED_TOP);
    setModalLeft(null);
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
    initialFormSnapshotRef.current = {
      barberoId: 0, barbero: '',
      servicioId: null, servicioIds: JSON.stringify([]), productoCantidades: JSON.stringify({}),
      paqueteId: null, servicio: '',
      fecha: fechaCompleta, hora: horaString, duracion: 60, precio: 0, notas: '',
      tipoServicio: 'individuales',
      barberoFormSearchTerm: '', servicioSearchTerm: '', paqueteSearchTerm: '', productoSearchTerm: '',
    };

    // Inicializar animación de entrada
    setModalPhase('enter');
    setTimeout(() => setModalPhase('open'), 10);
  };

  const handleCloseModal = useCallback((skipDirty = false) => {
    if (!skipDirty && isFormDirtyNow()) {
      setShowDiscardDialog(true);
      return;
    }
    setShowDiscardDialog(false);
    initialFormSnapshotRef.current = null;
    setModalPhase('exit');
    setTimeout(() => {
      setIsCreateModalOpen(false);
      setModalPosition(null);
      setSelectedCita(null);
      setNuevaCita({
        barberoId: 0, barbero: '',
        servicioId: null, servicioIds: [], productoCantidades: {},
        paqueteId: null, servicio: '',
        fecha: '', hora: '', notas: '', duracion: 60, precio: 0, estado: 'Pendiente'
      });
      setBarberoFormSearchTerm('');
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      setShowFormErrors(false);
      setBarberoHorarioError(null);
      setTipoServicio('individuales');
      setEditingFecha(false);
      setEditingHora(false);
    }, 200);
  }, [isFormDirtyNow]);

  useEffect(() => {
    showDiscardDialogRef.current = showDiscardDialog;
  }, [showDiscardDialog]);

  // Cerrar pickers de fecha/hora al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setEditingFecha(false);
      }
      if (hourPickerRef.current && !hourPickerRef.current.contains(event.target as Node)) {
        setEditingHora(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar modal con tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showDiscardDialogRef.current) {
        e.preventDefault();
        e.stopPropagation();
        setShowDiscardDialog(false);
        return;
      }
      if (isCreateModalOpen) {
        e.preventDefault();
        handleCloseModal();
      }
    };
    if (isCreateModalOpen || showDiscardDialog) {
      document.addEventListener('keydown', handleKeyDown, true);
      return () => document.removeEventListener('keydown', handleKeyDown, true);
    }
  }, [isCreateModalOpen, showDiscardDialog]);

  const handleOpenEdit = async (cita: any) => {
    try {
      const citaCompleta = await agendamientoService.getAgendamientoById(cita.id);
      setIsEditMode(true);
      setSelectedCita(citaCompleta);
      setBarberoFormSearchTerm(citaCompleta.barberoNombre || '');
      setShowFormErrors(false);
      setDismissedErrors(new Set());
      const editState = {
        barberoId: citaCompleta.barberoId,
        barbero: citaCompleta.barberoNombre || '',
        servicioId: citaCompleta.servicioId,
        servicioIds: (citaCompleta.servicioIds && citaCompleta.servicioIds.length > 0)
          ? citaCompleta.servicioIds
          : (citaCompleta.servicioId ? [citaCompleta.servicioId] : []),
        productoCantidades: (citaCompleta.productos && citaCompleta.productos.length > 0)
          ? citaCompleta.productos.reduce((acc: any, p: any) => { acc[p.productoId] = (p.cantidad || 1); return acc; }, {})
          : ((citaCompleta.productoIds || []) as number[]).reduce((acc: Record<number,number>, id: number) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {} as Record<number,number>),
        paqueteId: citaCompleta.paqueteId,
        servicio: citaCompleta.servicioNombre || citaCompleta.paqueteNombre || '',
        fecha: citaCompleta.fecha,
        hora: citaCompleta.hora,
        notas: citaCompleta.notas || '',
        duracion: citaCompleta.duracion || 60,
        precio: citaCompleta.precio || 0,
        estado: citaCompleta.estado
      };
      setNuevaCita(editState);
      setIsDetailDialogOpen(false);
      const position = { top: Math.max(16, (window.innerHeight - 600) / 2), left: Math.max(16, (window.innerWidth - 480) / 2) };
      setModalPosition(position);
      setModalHeight(MODAL_HEIGHT);
      setModalTop(MODAL_DOCKED_TOP);
      setModalLeft(null);
      const nextTipoServicio = citaCompleta.paqueteId ? 'paquetes' as const : 'individuales' as const;
      setTipoServicio(nextTipoServicio);
      setEditingFecha(false);
      setEditingHora(false);
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      initialFormSnapshotRef.current = {
        barberoId: editState.barberoId, barbero: editState.barbero,
        servicioId: editState.servicioId, servicioIds: JSON.stringify(editState.servicioIds),
        productoCantidades: JSON.stringify(editState.productoCantidades),
        paqueteId: editState.paqueteId, servicio: editState.servicio,
        fecha: editState.fecha, hora: editState.hora, duracion: editState.duracion,
        precio: editState.precio, notas: (editState.notas || '').trim(),
        tipoServicio: nextTipoServicio,
        barberoFormSearchTerm: citaCompleta.barberoNombre || '',
        servicioSearchTerm: '', paqueteSearchTerm: '', productoSearchTerm: '',
      };
      setModalPhase('enter');
      setIsCreateModalOpen(true);
      setTimeout(() => setModalPhase('open'), 10);
    } catch (err) {
      console.error("Error al obtener cita:", err);
      error("Error al cargar cita", "No se pudo traer la informacion para editar.");
    }
  };

  const handleSaveCita = async () => {
    if (!nuevaCita.barberoId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      setDismissedErrors(new Set());
      return;
    }
    setShowFormErrors(false);
    const errorDisp = validarDisponibilidadBarbero(nuevaCita.barberoId);
    if (errorDisp) { error("No disponible", errorDisp); return; }
    if (isEditMode && selectedCita && String(nuevaCita.estado).toLowerCase() === 'completada') {
      const now = new Date();
      const horaCompleta = nuevaCita.hora ? (String(nuevaCita.hora).includes(':') ? String(nuevaCita.hora) : `${nuevaCita.hora}:00`) : '00:00';
      const horaFormateada = horaCompleta.length === 4 && horaCompleta.indexOf(':') === 1 ? `0${horaCompleta}` : horaCompleta;
      const citaDate = new Date(`${nuevaCita.fecha}T${horaFormateada}:00`);
      if (citaDate > now) { error("Accion no permitida", "No se puede establecer una fecha futura a una cita completada."); return; }
    }
    const productosPayload = Object.entries(nuevaCita.productoCantidades).map(([id, cant]) => ({ productoId: Number(id), cantidad: cant }));
    if (isSavingCitaRef.current) return;
    isSavingCitaRef.current = true;
    setIsSavingCita(true);
    try {
      if (isEditMode && selectedCita) {
        await agendamientoService.updateAgendamiento(selectedCita.id, {
          clienteId: Number(currentCliente.id), barberoId: nuevaCita.barberoId,
          servicioId: nuevaCita.servicioId, servicioIds: nuevaCita.servicioIds,
          productos: productosPayload, paqueteId: nuevaCita.paqueteId,
          fecha: nuevaCita.fecha, hora: nuevaCita.hora, duracion: nuevaCita.duracion,
          precio: nuevaCita.precio, estado: nuevaCita.estado, notas: nuevaCita.notas
        });
        success("Cita actualizada!", "Tus cambios han sido guardados correctamente.");
      } else {
        await agendamientoService.createAgendamiento({
          clienteId: Number(currentCliente.id), barberoId: nuevaCita.barberoId,
          servicioId: nuevaCita.servicioId, servicioIds: nuevaCita.servicioIds,
          productos: productosPayload, paqueteId: nuevaCita.paqueteId,
          fecha: nuevaCita.fecha, hora: nuevaCita.hora, duracion: nuevaCita.duracion,
          precio: nuevaCita.precio, estado: 'Pendiente', notas: nuevaCita.notas
        });
        success("Cita agendada!", "Tu cita ha sido registrada exitosamente.");
      }
      await fetchData();
      handleCloseModal(true);
    } catch (err: any) {
      console.error("Error al guardar cita:", err);
      const errorMsg = err?.message || err || "No se pudo procesar la solicitud.";
      const displayMsg = errorMsg.toString().replace("Error 400: ", "").replace("Error 500: ", "");
      error("Error", displayMsg);
    } finally {
      isSavingCitaRef.current = false;
      setIsSavingCita(false);
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

      <PerfilIncompletoModal
        open={showPerfilModal}
        onClose={() => setShowPerfilModal(false)}
        onGoToPerfil={() => {
          setShowPerfilModal(false);
          if (onGoToPerfil) onGoToPerfil();
        }}
        camposFaltantes={camposFaltantes}
      />

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
                onClick={() => handleCloseModal()}
              />

              {/* Modal container */}
              <div
                ref={modalRef}
                className="fixed flex flex-col rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
                style={{
                  top: Math.max(16, Math.min(window.innerHeight - modalHeight - 16, modalTop)),
                  left: modalLeft ?? modalPosition.left,
                  width: 480,
                  height: modalHeight,
                  boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
                  zIndex: 9999,
                  opacity: modalPhase === 'open' ? 1 : 0,
                  transform: modalPhase === 'enter' ? 'translateY(-10px) scale(0.97)' : 'translateY(0) scale(1)',
                  transition: dragState.current.dragging ? 'none' : 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Header con grip visual y drag handle */}
                <div
                  className="shrink-0 bg-gray-darker/50 select-none"
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    const currentLeft = modalLeft ?? modalPosition.left;
                    dragState.current = { dragging: true, startY: e.clientY, startX: e.clientX, startHeight: modalHeight, startTop: modalTop, startLeft: currentLeft };
                    setIsModalDragging(true);
                    const onMove = (ev: MouseEvent) => {
                      if (!dragState.current.dragging) return;
                      const deltaY = ev.clientY - dragState.current.startY;
                      const deltaX = ev.clientX - dragState.current.startX;
                      const { startHeight, startTop } = dragState.current;

                      const moveUpMax = MODAL_DOCKED_TOP - 16;
                      const startMoveUp = Math.max(0, MODAL_DOCKED_TOP - startTop);
                      const startVirtual = (startHeight - MODAL_MIN_HEIGHT) + startMoveUp;
                      const newVirtual = Math.max(0, Math.min((MODAL_HEIGHT - MODAL_MIN_HEIGHT) + moveUpMax, startVirtual - deltaY));

                      const heightRange = MODAL_HEIGHT - MODAL_MIN_HEIGHT;
                      if (newVirtual <= heightRange) {
                        const nextH = MODAL_MIN_HEIGHT + newVirtual;
                        setModalHeight(nextH);
                        setModalTop(window.innerHeight - 16 - nextH);
                      } else {
                        const movedUp = newVirtual - heightRange;
                        setModalHeight(MODAL_HEIGHT);
                        setModalTop(MODAL_DOCKED_TOP - movedUp);
                      }

                      const nextL = Math.min(window.innerWidth - 480, Math.max(0, dragState.current.startLeft + deltaX));
                      setModalLeft(nextL);
                    };
                    const onUp = () => {
                      dragState.current.dragging = false;
                      setIsModalDragging(false);
                      window.removeEventListener('mousemove', onMove);
                      window.removeEventListener('mouseup', onUp);
                    };
                    window.addEventListener('mousemove', onMove);
                    window.addEventListener('mouseup', onUp);
                  }}
                  style={{ cursor: isModalDragging ? 'grabbing' : 'grab' }}
                >
                  {/* Grip visual */}
                  <div className="flex justify-center pt-2 pb-0.5">
                    <div className="w-8 h-1 rounded-full bg-gray-dark/80" />
                  </div>
                  <div className="flex items-center justify-between" style={{ paddingLeft: 67, paddingRight: 20, paddingTop: 10, paddingBottom: 12 }}>
                    <h2 className="text-lg font-semibold text-gray-lightest">
                      {isEditMode ? 'Editar Cita' : 'Nueva Cita'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleCloseModal()}
                      className="p-2.5 rounded-full text-gray-lighter hover:text-white-primary hover:bg-gray-dark/80 bg-gray-dark/40 transition-all cursor-pointer flex items-center justify-center"
                      title="Cerrar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Barbero fijo — fuera del scroll */}
                <div className="shrink-0 pr-6">
                  <div
                    className="flex items-center gap-0 py-1 px-2"
                    style={showFormErrors && !nuevaCita.barberoId ? { marginBottom: '1.25rem' } : {}}
                  >
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {nuevaCita.barberoId > 0 ? (() => {
                        const b = barberosList.find((x: any) => x.id === nuevaCita.barberoId);
                        if (!b) return null;
                        const nombreCompleto = `${b.nombre} ${b.apellido || ''}`.trim();
                        return (
                          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg group">
                            {b.fotoPerfil ? (
                              <img src={b.fotoPerfil} alt={nombreCompleto} className="w-8 h-8 rounded-full object-cover shrink-0" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-dark border border-gray-dark/60 flex items-center justify-center shrink-0">
                                <User className="w-4 h-4 text-gray-lighter" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-gray-lightest leading-tight truncate">{nombreCompleto}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setNuevaCita(prev => ({ ...prev, barberoId: 0, barbero: '' }));
                                setBarberoFormSearchTerm('');
                                setBarberoHorarioError(null);
                                setEditingFecha(false);
                                setEditingHora(false);
                              }}
                              className="p-1 rounded-full text-gray-lighter hover:bg-gray-dark hover:text-white-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                              title="Cambiar barbero"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })() : (
                        <SearchField<any>
                          label="Buscar barbero"
                          placeholder="Nombre del barbero..."
                          value={barberoFormSearchTerm}
                          onChange={setBarberoFormSearchTerm}
                          ghostMode={true}
                          items={barberosParaFormulario}
                          filterFn={(b, term) =>
                            (b.nombre || '').toLowerCase().includes(term.toLowerCase()) ||
                            (b.apellido || '').toLowerCase().includes(term.toLowerCase())
                          }
                          onSelect={(b) => {
                            const nombreCompleto = `${b.nombre} ${b.apellido || ''}`.trim();
                            setNuevaCita(prev => ({ ...prev, barberoId: b.id, barbero: nombreCompleto }));
                            setBarberoFormSearchTerm(nombreCompleto);
                            setEditingFecha(false);
                            setEditingHora(false);
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
                          error={showFormErrors && !nuevaCita.barberoId ? 'Selecciona un barbero' : undefined}
                        />
                      )}
                    </div>
                  </div>
                  {barberoHorarioError && (
                    <div
                      className="flex items-start gap-2 mt-1 mb-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30"
                      style={{ marginLeft: 55, marginRight: 12 }}
                    >
                      <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive leading-snug">{barberoHorarioError}</p>
                    </div>
                  )}
                  <div className="border-t border-gray-dark/60 mx-4" />
                </div>

                {/* Contenido scrollable — filas del formulario */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-6">

                  {/* ── Fila: Switch Tipo ── */}
                  <div className="flex items-center gap-0 py-1 px-2 mt-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} />
                    <div className="flex gap-5 ml-3">
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
                          ? 'text-orange-primary text-sm font-semibold transition-all px-3 py-1 rounded-md bg-orange-primary/10 active:scale-95 border-b-2 border-orange-primary cursor-pointer'
                          : 'text-gray-lighter text-sm transition-all px-3 py-1 rounded-md hover:bg-gray-dark hover:text-gray-lightest active:scale-95 active:bg-gray-dark border-b-2 border-transparent cursor-pointer'
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
                          ? 'text-orange-primary text-sm font-semibold transition-all px-3 py-1 rounded-md bg-orange-primary/10 active:scale-95 border-b-2 border-orange-primary cursor-pointer'
                          : 'text-gray-lighter text-sm transition-all px-3 py-1 rounded-md hover:bg-gray-dark hover:text-gray-lightest active:scale-95 active:bg-gray-dark border-b-2 border-transparent cursor-pointer'
                        }
                      >
                        Paquetes
                      </button>
                    </div>
                  </div>

                  {/* ── Fila: Fecha y Hora ── */}
                  <div className="flex items-center gap-0 py-1 px-2.5 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      {/* Chips (fecha + hora) una vez hay datos, o ghost si no */}
                      {nuevaCita.fecha || nuevaCita.hora ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Chip fecha */}
                          <button
                            type="button"
                            onClick={() => { setEditingFecha(prev => !prev); setEditingHora(false); }}
                            className={`px-3 py-1.5 rounded-lg text-base transition-colors duration-150 ${
                              editingFecha
                                ? 'bg-orange-primary text-white-primary'
                                : 'bg-gray-dark/70 hover:bg-gray-dark text-gray-lightest hover:text-white-primary'
                            }`}
                          >
                            {nuevaCita.fecha
                              ? (() => { const s = format(parseISO(`${nuevaCita.fecha}T12:00:00`), "EEEE, d 'de' MMMM", { locale: es }); return s.charAt(0).toUpperCase() + s.slice(1); })()
                              : 'Selecciona fecha'}
                          </button>
                          {/* Chip hora inicio */}
                          <button
                            type="button"
                            onClick={() => { setEditingHora(prev => !prev); setEditingFecha(false); }}
                            className={`px-3 py-1.5 rounded-lg text-base transition-colors duration-150 ${
                              editingHora
                                ? 'bg-orange-primary text-white-primary'
                                : 'bg-gray-dark/70 hover:bg-gray-dark text-gray-lightest hover:text-white-primary'
                            }`}
                          >
                            {nuevaCita.hora ? formatHoraStr12(nuevaCita.hora) : 'Hora inicio'}
                          </button>
                          {/* Hora fin — solo si hay servicio o paquete */}
                          {(nuevaCita.servicioIds.length > 0 || !!nuevaCita.paqueteId) && (
                            <>
                              <span className="text-gray-lighter text-sm select-none">–</span>
                              <div className="px-3 py-1.5 rounded-lg bg-gray-dark/40 text-base text-gray-lighter transition-colors duration-150 cursor-default">
                                {(() => {
                                  if (!nuevaCita.hora) return 'Hora fin';
                                  const [hs, ms = '0'] = nuevaCita.hora.split(':');
                                  const startMin = parseInt(hs || '0', 10) * 60 + parseInt(ms || '0', 10);
                                  const endMin = startMin + (Number(nuevaCita.duracion) || 60);
                                  const hFin = Math.floor(endMin / 60) % 24;
                                  const mFin = endMin % 60;
                                  const ampm = hFin >= 12 ? 'PM' : 'AM';
                                  const h12 = hFin % 12 === 0 ? 12 : hFin % 12;
                                  return `${h12}:${String(mFin).padStart(2, '0')} ${ampm}`;
                                })()}
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        /* Ghost: placeholder hasta que el usuario interactúa */
                        <button
                          type="button"
                          onClick={() => setEditingFecha(true)}
                          className="w-full text-left py-1.5 px-3 text-gray-lighter hover:text-gray-lightest hover:bg-gray-dark rounded-md transition-colors duration-150 text-base cursor-pointer"
                        >
                          Selecciona fecha y hora
                        </button>
                      )}

                      {showFormErrors && (!nuevaCita.fecha || !nuevaCita.hora) && (
                        <p className="text-sm text-red-400 mt-1 px-3">Selecciona fecha y hora</p>
                      )}

                      {/* Calendario flotante */}
                      {editingFecha && (
                        <div
                          ref={datePickerRef}
                          className="absolute left-0 mt-1 bg-gray-darkest border border-gray-dark rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] p-2 animate-in fade-in zoom-in duration-200"
                          style={{ zIndex: 101, top: '100%' }}
                        >
                          <UICalendar
                            mode="single"
                            selected={nuevaCita.fecha ? parseISO(nuevaCita.fecha) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                const fechaStr = `${y}-${m}-${d}`;
                                setNuevaCita(prev => ({ ...prev, fecha: fechaStr }));
                                setEditingFecha(false);
                                setEditingHora(true);
                              }
                            }}
                            locale={es}
                            className="bg-gray-darkest text-gray-lightest"
                            classNames={{
                              day_selected: "bg-orange-primary text-white-primary hover:bg-orange-primary hover:text-white-primary focus:bg-orange-primary focus:text-white-primary rounded-full",
                              day_today: "bg-gray-dark text-orange-primary font-bold rounded-full",
                            }}
                            disabled={(date) => {
                              const today = new Date();
                              today.setHours(0, 0, 0, 0);
                              if (date < today) return true;
                              if (nuevaCita.barberoId) {
                                const y = date.getFullYear();
                                const m = String(date.getMonth() + 1).padStart(2, '0');
                                const d = String(date.getDate()).padStart(2, '0');
                                const fechaStr = `${y}-${m}-${d}`;
                                return !barberoTrabajaEnFecha(horariosList, nuevaCita.barberoId, fechaStr);
                              }
                              return false;
                            }}
                          />
                        </div>
                      )}

                      {/* Dropdown de horas flotante */}
                      {editingHora && (
                        <div
                          ref={hourPickerRef}
                          className="absolute left-0 mt-1 w-48 bg-gray-darkest border border-gray-dark rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in duration-200"
                          style={{ zIndex: 100, top: '100%' }}
                        >
                          {!nuevaCita.fecha || !nuevaCita.barberoId ? (
                            <p className="text-xs text-gray-lighter px-4 py-3">
                              {!nuevaCita.barberoId ? 'Selecciona un barbero primero' : 'Selecciona una fecha primero'}
                            </p>
                          ) : (() => {
                            const horasDisp = calcularHorasDisponibles({
                              fechaStr: nuevaCita.fecha,
                              barberoId: nuevaCita.barberoId,
                              duracionMinutos: nuevaCita.duracion,
                              horariosList,
                              citas,
                              ignoreCitaId: isEditMode && selectedCita ? selectedCita.id : undefined,
                              minAnticipacionMinutos: MIN_ANTICIPACION_AGENDA_MINUTOS,
                              slotHours: horasDelDia,
                            });
                            if (horasDisp.length === 0) {
                              return <p className="text-xs text-gray-lighter px-4 py-3">No hay horas disponibles para este día</p>;
                            }
                            return (
                              <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
                                {horasDisp.map(h => (
                                  <button
                                    key={h}
                                    type="button"
                                    onClick={() => {
                                      setNuevaCita(prev => ({ ...prev, hora: h }));
                                      setEditingHora(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                      nuevaCita.hora === h
                                        ? 'bg-orange-primary text-white-primary font-medium'
                                        : 'text-gray-lightest hover:bg-gray-dark'
                                    }`}
                                  >
                                    {formatHoraStr12(h)}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}
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
                            ghostMode={true}
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
                                  <p className="text-gray-lighter text-xs">{formatDuracion(s.duracion || 60)}</p>
                                </div>
                                <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(s.precio)}</span>
                              </div>
                            )}
                            isSelected={nuevaCita.servicioIds.length > 0}
                            error={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId && !dismissedErrors.has('servicio') ? 'Selecciona al menos un servicio o paquete' : undefined}
                            onFocus={() => setDismissedErrors(prev => new Set(prev).add('servicio'))}
                          />
                          {/* Servicios seleccionados: carrusel horizontal */}
                          {nuevaCita.servicioIds.length > 0 && (() => {
                            const formServicioPageSize = 2;
                            const totalSrvPages = Math.ceil(nuevaCita.servicioIds.length / formServicioPageSize);
                            const safeSrvPage = Math.min(formServicioPage, totalSrvPages - 1);
                            const pageSrvIds = nuevaCita.servicioIds.slice(safeSrvPage * formServicioPageSize, (safeSrvPage + 1) * formServicioPageSize);
                            return (
                              <div className="flex items-center gap-1 mt-2">
                                <button
                                  type="button"
                                  onClick={() => setFormServicioPage(p => Math.max(0, p - 1))}
                                  disabled={safeSrvPage === 0}
                                  className={`shrink-0 transition-colors cursor-pointer ${safeSrvPage === 0 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex gap-1 flex-1 min-w-0">
                                  {pageSrvIds.map(sId => {
                                    const srv = serviciosList.find(s => s.id === sId);
                                    if (!srv) return null;
                                    return (
                                      <div key={sId} className="flex-1 min-w-0 group bg-gray-darker/40 rounded-lg px-3 py-2 border border-transparent">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="rounded-lg overflow-hidden shrink-0" style={{ width: 48, height: 48, minWidth: 48 }}>
                                            <ImageRenderer url={srv.imagen || ""} alt={srv.nombre} className="!w-full !h-full !max-w-[48px] !max-h-[48px] !rounded-lg border-0 bg-transparent" />
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-0.5">
                                            <p className="text-base font-medium text-gray-lightest truncate leading-tight">{srv.nombre}</p>
                                            <p className="text-sm text-gray-lighter leading-tight">{formatearPrecio(srv.precio)}</p>
                                            <p className="text-sm text-gray-lighter leading-tight">{formatDuracion(srv.duracion || 60)}</p>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => { toggleServicio(sId); if (safeSrvPage > 0 && pageSrvIds.length === 1) setFormServicioPage(p => p - 1); }}
                                            className="p-1 rounded-full text-gray-lighter hover:bg-gray-dark hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                            title="Quitar servicio"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {pageSrvIds.length < formServicioPageSize && <div className="flex-1 min-w-0" />}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormServicioPage(p => Math.min(totalSrvPages - 1, p + 1))}
                                  disabled={safeSrvPage >= totalSrvPages - 1}
                                  className={`shrink-0 transition-colors cursor-pointer ${safeSrvPage >= totalSrvPages - 1 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          {nuevaCita.paqueteId ? (
                            <>
                              {/* Card paquete seleccionado */}
                              {(() => {
                                const paq = paquetesList.find(p => p.id === nuevaCita.paqueteId);
                                if (!paq) return null;
                                return (
                                  <div className="flex items-center justify-between py-1.5 px-3 bg-gray-dark/20 rounded-lg group animate-in fade-in slide-in-from-left-2 duration-200">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="w-8 h-8 rounded-md bg-gray-dark flex items-center justify-center border border-gray-dark/60 shadow-sm shrink-0">
                                        <Package className="w-4 h-4 text-orange-primary" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm text-gray-lightest leading-tight truncate">{paq.nombre}</p>
                                        <p className="text-xs text-gray-lighter leading-tight">{formatDuracion(paq.duracion || 60)} · {formatearPrecio(paq.precio)}</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => { handlePaqueteChange('none'); setPaqueteSearchTerm(''); setFormPaqueteServicioPage(0); }}
                                      className="p-1 rounded-full text-gray-lighter hover:bg-gray-dark hover:text-white-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer shrink-0"
                                      title="Quitar paquete"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })()}
                              {/* Servicios del paquete — carrusel read-only */}
                              {(() => {
                                const paq = paquetesList.find(p => p.id === nuevaCita.paqueteId);
                                if (!paq || !paq.servicios?.length) return null;
                                const srvs: any[] = (paq.servicios as string[])
                                  .map((nombre: string) => serviciosList.find((s: any) => s.nombre === nombre))
                                  .filter(Boolean);
                                const pageSize = 2;
                                const totalPages = Math.ceil(srvs.length / pageSize);
                                const safePage = Math.min(formPaqueteServicioPage, Math.max(0, totalPages - 1));
                                const pageSrvs = srvs.slice(safePage * pageSize, (safePage + 1) * pageSize);
                                return (
                                  <div className="flex items-center gap-1 mt-2">
                                    <button
                                      type="button"
                                      onClick={() => setFormPaqueteServicioPage(p => Math.max(0, p - 1))}
                                      disabled={safePage === 0}
                                      className={`shrink-0 transition-colors cursor-pointer ${safePage === 0 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <div className="flex gap-1 flex-1 min-w-0">
                                      {pageSrvs.map((srv: any) => (
                                        <div key={srv.id} className="flex-1 min-w-0 bg-gray-darker/40 rounded-lg px-3 py-2 border border-transparent">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="rounded-lg overflow-hidden shrink-0" style={{ width: 48, height: 48, minWidth: 48 }}>
                                              <ImageRenderer url={srv.imagen || ""} alt={srv.nombre} className="!w-full !h-full !max-w-[48px] !max-h-[48px] !rounded-lg border-0 bg-transparent" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                              <p className="text-base font-medium text-gray-lightest truncate leading-tight">{srv.nombre}</p>
                                              <p className="text-sm text-gray-lighter leading-tight">{formatearPrecio(srv.precio)}</p>
                                              <p className="text-sm text-gray-lighter leading-tight">{formatDuracion(srv.duracion || 60)}</p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                      {pageSrvs.length < pageSize && <div className="flex-1 min-w-0" />}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => setFormPaqueteServicioPage(p => Math.min(totalPages - 1, p + 1))}
                                      disabled={safePage >= totalPages - 1}
                                      className={`shrink-0 transition-colors cursor-pointer ${safePage >= totalPages - 1 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <SearchField<any>
                              label="Buscar paquete"
                              placeholder="Buscar paquete..."
                              value={paqueteSearchTerm}
                              onChange={setPaqueteSearchTerm}
                              ghostMode={true}
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
                                    <p className="text-gray-lighter text-xs">{formatDuracion(p.duracion || 60)} — {p.servicios?.length || 0} servicios</p>
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precio)}</span>
                                </div>
                              )}
                              error={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId && !dismissedErrors.has('servicio') ? 'Selecciona al menos un servicio o paquete' : undefined}
                              onFocus={() => setDismissedErrors(prev => new Set(prev).add('servicio'))}
                            />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {/* ── Fila: Producto ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-2">
                      <ShoppingBag className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId ? (
                        <p className="text-gray-lighter text-base py-1.5 px-3">Selecciona un servicio o paquete para agregar productos</p>
                      ) : (
                        <>
                          <SearchField<any>
                            label="Buscar producto"
                            placeholder="Buscar producto..."
                            value={productoSearchTerm}
                            onChange={setProductoSearchTerm}
                            ghostMode={true}
                            isSelected={Object.keys(nuevaCita.productoCantidades).length > 0}
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
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                    <ImageRenderer url={p.imagenProduc || ""} alt={p.nombre} className="w-full h-full border-0 bg-transparent" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white-primary text-sm font-medium truncate">{p.nombre}</p>
                                    {cantActual > 0 && (
                                      <p className="text-orange-primary text-xs">En carrito: {cantActual}</p>
                                    )}
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precioVenta ?? p.precio)}</span>
                                </div>
                              );
                            }}
                          />
                          {/* Productos seleccionados: carrusel horizontal */}
                          {Object.keys(nuevaCita.productoCantidades).length > 0 && (() => {
                            const prodEntries = Object.entries(nuevaCita.productoCantidades);
                            const totalProdPages = Math.ceil(prodEntries.length / FORM_CAROUSEL_SIZE);
                            const safeProdPage = Math.min(formProductoPage, totalProdPages - 1);
                            const pageProdEntries = prodEntries.slice(safeProdPage * FORM_CAROUSEL_SIZE, (safeProdPage + 1) * FORM_CAROUSEL_SIZE);
                            return (
                              <div className="mt-3 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFormProductoPage(p => Math.max(0, p - 1))}
                                  disabled={safeProdPage === 0}
                                  className={`shrink-0 transition-colors cursor-pointer ${safeProdPage === 0 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div className="flex-1 flex gap-2 min-w-0">
                                  {pageProdEntries.map(([idStr, cantidad]) => {
                                    const pId = Number(idStr);
                                    const prod = productosList.find(p => p.id === pId);
                                    if (!prod) return null;
                                    return (
                                      <div key={pId} className="flex-1 min-w-0 group bg-gray-darker/40 rounded-lg px-3 py-2 border border-transparent hover:border-gray-dark transition-all">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                                            <ImageRenderer url={prod.imagenProduc || ""} alt={prod.nombre} className="w-full h-full border-0 bg-transparent" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-lightest font-medium truncate leading-tight">{prod.nombre}</p>
                                            <p className="text-gray-lighter leading-tight truncate" style={{ fontSize: '9px' }}>{formatearPrecio(prod.precioVenta ?? prod.precio)}</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <button type="button" onClick={() => removeProducto(pId)} className="text-gray-lighter hover:text-white-primary transition-colors cursor-pointer">
                                                <Minus className="w-2.5 h-2.5" />
                                              </button>
                                              <span className="w-3 text-center text-gray-lightest tabular-nums" style={{ fontSize: '9px' }}>{cantidad}</span>
                                              <button type="button" onClick={() => addProducto(pId)} className="text-gray-lighter hover:text-white-primary transition-colors cursor-pointer">
                                                <Plus className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => { quitarProducto(pId); if (safeProdPage > 0 && pageProdEntries.length === 1) setFormProductoPage(p => p - 1); }}
                                            className="shrink-0 text-gray-dark hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {pageProdEntries.length < FORM_CAROUSEL_SIZE && Array.from({ length: FORM_CAROUSEL_SIZE - pageProdEntries.length }).map((_, i) => (
                                    <div key={`prod-empty-${i}`} className="flex-1 min-w-0" />
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setFormProductoPage(p => Math.min(totalProdPages - 1, p + 1))}
                                  disabled={safeProdPage >= totalProdPages - 1}
                                  className={`shrink-0 transition-colors cursor-pointer ${safeProdPage >= totalProdPages - 1 ? 'text-gray-dark cursor-not-allowed opacity-30' : 'text-gray-lighter hover:text-orange-primary'}`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>

                  {/* ── Fila: Notas ── */}
                  <div className="flex items-start gap-0 py-1.5 px-2 mt-3">
                    <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center pt-1">
                      <FileText className="w-5 h-5 text-gray-lighter" />
                    </div>
                    <div className="flex-1 min-w-0 border-b border-transparent focus-within:border-orange-primary/60 transition-colors pb-1">
                      <textarea
                        value={nuevaCita.notas}
                        rows={1}
                        maxLength={300}
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
                      {nuevaCita.notas.length > 0 && (
                        <p className={`text-right text-xs px-3 mt-0.5 transition-colors ${
                          nuevaCita.notas.length >= 280
                            ? 'text-red-400'
                            : nuevaCita.notas.length >= 240
                              ? 'text-orange-primary'
                              : 'text-gray-lighter'
                        }`}>
                          {nuevaCita.notas.length}/300
                        </p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer sticky con botones */}
                <div className="border-t border-gray-dark bg-gray-darker/50 px-4 py-3 shrink-0">
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => handleCloseModal()}
                      className="px-4 py-2 text-sm font-medium text-gray-lighter hover:text-white-primary transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveCita}
                      disabled={isSavingCita}
                      className="px-4 py-2 text-sm font-semibold bg-orange-primary text-black-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSavingCita ? 'Guardando...' : (isEditMode ? 'Guardar cambios' : 'Agendar Cita')}
                    </button>
                  </div>
                </div>
              </div>
            </>,
            document.body
          )}

          <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
            <AlertDialogContent className="bg-gray-darkest border-gray-dark text-white-primary" style={{ zIndex: 200000 }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-lighter">
                  Tienes cambios sin guardar. Si cierras el formulario se perderan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-transparent text-orange-primary border border-orange-primary hover:bg-orange-primary/10 font-semibold rounded-xl px-6 py-3 h-auto mt-0">
                  Seguir editando
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-transparent text-destructive border border-destructive hover:bg-destructive/10 font-semibold rounded-xl px-6 py-3 h-auto"
                  onClick={() => handleCloseModal(true)}
                >
                  Descartar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* VISTA DE CALENDARIO */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="px-2 pt-2 pb-6">

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
            <div className="std-card !py-0" style={{ marginBottom: '1.5rem' }}>
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

          <div style={{ height: '2rem' }} aria-hidden />
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
                {/* Barra título */}
                <div className="flex items-center px-4 pr-12 py-3 border-b border-gray-dark bg-gray-darker/50 shrink-0">
                  <span className="text-lg font-semibold text-gray-lightest">Detalle de cita</span>
                </div>

                {/* Contenido */}
                <div className="p-4">
                  <div className="space-y-0">

                    {/* ── Principal: Barbero ── */}
                    <div className="mb-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar barbero 56px */}
                        <div
                          style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
                          className="bg-gray-dark border border-gray-dark/60 flex items-center justify-center"
                        >
                          {barberoData?.fotoPerfil ? (
                            <img
                              src={barberoData.fotoPerfil}
                              alt={selectedCita.barberoNombre}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <User style={{ width: 24, height: 24, flexShrink: 0 }} className="text-gray-lighter" />
                          )}
                        </div>
                        {/* Nombre + chips + botón editar */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h2 className="text-2xl font-normal text-gray-lightest leading-tight truncate">
                              {formatNombre(selectedCita.barberoNombre) || 'Sin barbero'}
                            </h2>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-3 py-0.5 rounded-full text-xs font-medium border ${
                              paqueteData
                                ? 'bg-orange-primary/15 text-orange-primary border-orange-primary/30'
                                : 'bg-gray-darker text-gray-lightest border-gray-dark'
                            }`}>
                              {paqueteData ? 'Paquete' : 'Individual'}
                            </span>
                            <span
                              className="px-3 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                background: `${estadoColor}18`,
                                color: estadoColor,
                                borderColor: `${estadoColor}40`,
                              }}
                            >
                              {selectedCita.estado}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── Fila: Fecha y hora ── */}
                    <div className="flex items-center gap-4 py-3">
                      <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock className="w-5 h-5 text-gray-lighter" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-lightest">{fechaLegible}</p>
                        <p className="text-sm text-gray-lighter mt-0.5">
                          {formatHoraStr12(selectedCita.hora)}{horaFin ? ` – ${horaFin}` : ''} · {formatDuracion(selectedCita.duracion || 60)}
                        </p>
                      </div>
                    </div>

                    {/* ── Fila: Servicio / Paquete ── */}
                    <div className="flex items-center gap-4 py-3">
                      <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scissors className="w-5 h-5 text-gray-lighter" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-lightest">{formatNombre(servicioNombre)}</p>
                        <p className="text-xs text-gray-lighter mt-0.5">{formatDuracion(selectedCita.duracion || 60)}</p>
                      </div>
                    </div>

                    {/* ── Fila: Productos (si hay) ── */}
                    {selectedCita.productosNombres && selectedCita.productosNombres.length > 0 && (
                      <div className="flex items-start gap-4 py-3">
                        <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="pt-0.5">
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

                    {/* ── Fila: Precio ── */}
                    <div className="flex items-center gap-4 py-3">
                      <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calendar className="w-5 h-5 text-gray-lighter" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-orange-primary">{formatearPrecio(selectedCita.precio)}</p>
                        <p className="text-xs text-gray-lighter mt-0.5">Precio total</p>
                      </div>
                    </div>

                    {/* ── Fila: Notas (si hay) ── */}
                    {selectedCita.notas && (
                      <div className="flex items-start gap-4 py-3">
                        <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="pt-0.5">
                          <FileText className="w-5 h-5 text-gray-lighter" />
                        </div>
                        <p className="text-sm text-gray-lighter leading-relaxed">{selectedCita.notas}</p>
                      </div>
                    )}

                    {/* ── Acción: cancelar ── */}
                    {selectedCita.estado !== 'Cancelada' && selectedCita.estado !== 'Completada' && (
                      <div className="flex flex-col gap-2 pt-3 pb-2 border-t border-gray-dark/60 mt-1">
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
