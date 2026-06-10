import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { agendamientoService } from "../services/agendamientoService";
import { ventaService } from "../../ventas/services/ventaService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { productoService } from "../../productos/services/productos";
import { TimeInput12h } from "../../../shared/components/ui/TimeInput12h";
import { horariosService } from "../services/horariosService";
import { formatDuracion } from "../../../shared/utils/dateUtils";
import { MIN_ANTICIPACION_AGENDA_MINUTOS } from "../constants";
import {
  barberoTrabajaEnFecha,
  diaSemanaDesdeFecha,
  filtrarBarberosDisponibles,
  getHorariosBarberoParaDia,
  getHorasDisponiblesParaDia as calcularHorasDisponibles,
  horarioEstaActivo,
  normalizeDiaNombre,
  normalizarFechaCita,
  parseHoraAMinutos,
  toLocalDateString,
  CALENDAR_SLOT_HOURS,
} from "../utils/scheduleUtils";
import { Input } from "../../../shared/components/ui/input";
import { Calendar as UICalendar } from "../../../shared/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale/es";
import { Calendar, Clock, User, Edit, Trash2, Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal, ShoppingBag, Scissors, Package, FileText, CalendarDays, Plus, Minus, X, Phone, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { emailJsService } from "../../../shared/services/emailJsService";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { ModalCompletarParcialmente } from "../components/ModalCompletarParcialmente";

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horasDelDia = CALENDAR_SLOT_HOURS; // 9:00 – 23:00, franjas de 30 min (sync con scheduleUtils)
const calendarGridTemplate = "clamp(64px, 6vw, 78px) repeat(7, minmax(0, 1fr))";

/** Hover en celdas del grid — usa clase CSS explícita para evitar problemas de cascade en Tailwind v4. */
const CAL_GRID_HOVER_CELL =
  "cal-cell-hover transition-[background-color,border-color] duration-200 ease-out";
/** Para bloques de cita (inner div): mismo hover + group para activar shimmer de hijos. */
const CAL_GRID_BLOCK_HOVER =
  "group cal-cell-hover transition-[background-color,border-color] duration-200 ease-out";
const CAL_GRID_HOVER_SHIMMER =
  "pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out";
const CAL_GRID_HOVER_PLUS_ICON = "w-5 h-5 text-white/80 stroke-[1.2] transform scale-95 group-hover:scale-100 transition-transform duration-200 ease-out";

const formatHora12 = (hora: number): string => {
  const h = Math.floor(hora);
  const m = (hora % 1) * 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:30${ampm}`;
};

// Convierte un string "HH:MM" o "HH:MM:SS" a formato 12 horas con am/pm
const formatHoraStr12 = (horaStr: string): string => {
  if (!horaStr) return '';
  const [hStr, mStr = '00'] = horaStr.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`;
};

/** Inicio (12h) – fin (12h) para tooltips del calendario. */
const formatRangoHorarioCita = (cita: { hora?: string; duracion?: number }): string => {
  if (!cita?.hora) return '—';
  const [hs, ms = '0'] = String(cita.hora).split(':');
  const startMin = parseInt(hs || '0', 10) * 60 + parseInt(ms || '0', 10);
  const endMin = startMin + (Number(cita.duracion) || 60);
  const hFin = Math.floor(endMin / 60) % 24;
  const mFin = endMin % 60;
  const ampm = hFin >= 12 ? 'pm' : 'am';
  const h12 = hFin % 12 === 0 ? 12 : hFin % 12;
  const endStr = mFin === 0 ? `${h12}${ampm}` : `${h12}:${String(mFin).padStart(2, '0')}${ampm}`;
  return `${formatHoraStr12(cita.hora)} · ${endStr}`;
};

// Los datos se cargan dinámicamente desde la API

const estados = [
  { value: "Pendiente", label: "Pendiente", color: "bg-orange-primary" },
  { value: "Completada", label: "Completada", color: "bg-blue-600" },
  { value: "Cancelada", label: "Cancelada", color: "bg-red-600" }
];

// Función para formatear precios
const formatearPrecio = (precio: number): string => {
  const precioEntero = Math.round(precio);
  return `$ ${precioEntero.toLocaleString('es-CO')}`;
};

// Función para formatear nombres (Mayúscula Inicial)
const formatNombre = (nombre: string): string => {
  if (!nombre) return '—';
  return nombre.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

interface AgendamientoPageProps {
  initialItem?: any;
  onClearInitialItem?: () => void;
  onSubNavChange?: (config: {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    backTitle?: string;
    icon?: React.ReactNode;
    iconContainerClassName?: string;
  } | null) => void;
}

type NuevaCitaFormState = {
  clienteId: number;
  cliente: string;
  telefono: string;
  servicioId: number | null;
  servicioIds: number[];
  productoCantidades: Record<number, number>;
  paqueteId: number | null;
  servicio: string;
  barberoId: number;
  barbero: string;
  fecha: string;
  hora: string;
  duracion: number;
  precio: number;
  estado: string;
  notas: string;
};

type FormSnapshot = {
  cita: NuevaCitaFormState;
  tipoServicio: 'individuales' | 'paquetes';
  clienteSearchTerm: string;
  barberoFormSearchTerm: string;
  servicioSearchTerm: string;
  paqueteSearchTerm: string;
  productoSearchTerm: string;
};

const DISCARD_DIALOG_Z = 200000;

const buildFormSnapshot = (
  cita: NuevaCitaFormState,
  extras: Omit<FormSnapshot, 'cita'>
): FormSnapshot => ({
  cita: JSON.parse(JSON.stringify(cita)) as NuevaCitaFormState,
  ...extras,
});

const isSnapshotDirty = (current: FormSnapshot, initial: FormSnapshot): boolean => {
  const c = current.cita;
  const i = initial.cita;
  return (
    c.clienteId !== i.clienteId ||
    (c.telefono || '') !== (i.telefono || '') ||
    (c.cliente || '') !== (i.cliente || '') ||
    c.barberoId !== i.barberoId ||
    (c.barbero || '') !== (i.barbero || '') ||
    c.servicioId !== i.servicioId ||
    JSON.stringify(c.servicioIds) !== JSON.stringify(i.servicioIds) ||
    c.paqueteId !== i.paqueteId ||
    (c.servicio || '') !== (i.servicio || '') ||
    JSON.stringify(c.productoCantidades) !== JSON.stringify(i.productoCantidades) ||
    c.fecha !== i.fecha ||
    c.hora !== i.hora ||
    c.duracion !== i.duracion ||
    c.precio !== i.precio ||
    (c.notas || '').trim() !== (i.notas || '').trim() ||
    current.tipoServicio !== initial.tipoServicio ||
    current.clienteSearchTerm !== initial.clienteSearchTerm ||
    current.barberoFormSearchTerm !== initial.barberoFormSearchTerm ||
    current.servicioSearchTerm !== initial.servicioSearchTerm ||
    current.paqueteSearchTerm !== initial.paqueteSearchTerm ||
    current.productoSearchTerm !== initial.productoSearchTerm
  );
};


export function AgendamientoPage({ initialItem, onClearInitialItem, onSubNavChange }: AgendamientoPageProps) {
  const { user, isLoading: authIsLoading } = useAuth();
  const { success, error, AlertContainer } = useCustomAlert();
  const [citas, setCitas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listas para los selects
  const [serviciosList, setServiciosList] = useState<any[]>([]);
  const [paquetesList, setPaquetesList] = useState<any[]>([]);
  const [productosList, setProductosList] = useState<any[]>([]);
  const [barberosList, setBarberosList] = useState<any[]>([]);
  const [clientesList, setClientesList] = useState<any[]>([]);
  const [horariosList, setHorariosList] = useState<any[]>([]);

  const [currentWeek, setCurrentWeek] = useState(0);
  const [highlightedCitaId, setHighlightedCitaId] = useState<number | null>(null);
  const [carouselPage, setCarouselPage] = useState(0);
  const [carouselEstadoFiltro, setCarouselEstadoFiltro] = useState<'Todas' | 'Pendiente' | 'Completada' | 'Cancelada'>('Pendiente');
  const [carouselBusqueda, setCarouselBusqueda] = useState('');
  const [busquedaExpanded, setBusquedaExpanded] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const busquedaRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Carrusel de servicios/paquetes dentro del modal de detalle de cita
  const [servicioCarouselPage, setServicioCarouselPage] = useState(0);
  const [detalleServiciosExpanded, setDetalleServiciosExpanded] = useState(false);
  const [detalleProductosExpanded, setDetalleProductosExpanded] = useState(false);
  const SERVICIO_PAGE_SIZE = 3;
  const CAROUSEL_PAGE_SIZE = 5;
  // Carruseles del formulario de creación de citas
  const [formServicioPage, setFormServicioPage] = useState(0);
  const [formProductoPage, setFormProductoPage] = useState(0);
  const [formPaqueteServicioPage, setFormPaqueteServicioPage] = useState(0);
  const FORM_CAROUSEL_SIZE = 3;
  const [lastInitialItemKey, setLastInitialItemKey] = useState("");

  // Cargar datos al montar el componente — esperar a que Firebase auth esté listo.
  // barberosService usa auth.currentUser.getIdToken(); si Firebase aún no inicializó
  // la sesión, auth.currentUser es null y el servidor devuelve vacío o 401.
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (authIsLoading) return;          // Firebase still restoring session — wait
    if (hasFetchedRef.current) return;  // Already fetched once — don't repeat on re-renders
    hasFetchedRef.current = true;
    fetchData();
  }, [authIsLoading]);

  useEffect(() => {
    if (!initialItem || isLoading) return;

    const isBarberoType = initialItem.type === 'barbero';

    // For barbero type, we need barberosList; for services/packages, we need those lists
    if (!isBarberoType && serviciosList.length === 0 && paquetesList.length === 0) return;
    if (isBarberoType && barberosList.length === 0) return;

    const key = isBarberoType
      ? `barbero-${initialItem.nombre || "0"}`
      : `${initialItem.type || initialItem.tipoItem || "servicio"}-${initialItem.id || "0"}`;
    if (key === lastInitialItemKey) return;

    applyInitialReservationItem(initialItem);
    setLastInitialItemKey(key);
  }, [initialItem, isLoading, serviciosList, paquetesList, barberosList, lastInitialItemKey]);

  const fetchData = async () => {
    setIsLoading(true);

    const [
      citasResult,
      barberosResult,
      serviciosResult,
      clientesResult,
      paquetesResult,
      horariosResult,
      productosResult,
    ] = await Promise.allSettled([
      agendamientoService.getAgendamientosPaged(1, 1000), // Cargar un bloque grande para el calendario
      barberosService.getBarberos(),
      servicioService.getServicios(),
      clientesService.getClientes(),
      apiService.getPaquetes(),
      horariosService.getHorarios(),
      productoService.getProductos(),
    ]);

    const getVal = <T,>(r: PromiseSettledResult<T>): T | null =>
      r.status === 'fulfilled' ? r.value : null;

    const citasResponse = getVal(citasResult);
    const citasData     = citasResponse ? ((citasResponse as any).items || citasResponse) : null;
    const barberosData  = getVal(barberosResult);
    const serviciosResponse = getVal(serviciosResult);
    const serviciosData = serviciosResponse ? ((serviciosResponse as any).items || serviciosResponse) : null;
    const clientesResponse  = getVal(clientesResult);
    const clientesData  = clientesResponse ? ((clientesResponse as any).items || clientesResponse) : null;
    const paquetesData  = getVal(paquetesResult);
    const horariosData  = getVal(horariosResult);
    const productosResponse = getVal(productosResult);
    const productosData = productosResponse ? ((productosResponse as any).items || productosResponse) : [];

    // Actualizar estado solo para peticiones exitosas (las fallidas conservan estado previo)
    if (citasData !== null)     setCitas(citasData);
    if (serviciosData !== null) setServiciosList((serviciosData as any[]).filter((s: any) => s.estado === true));
    if (clientesData !== null)  setClientesList((clientesData as any[]).filter((c: any) => c.estado === true));
    if (paquetesData !== null)  setPaquetesList((paquetesData as any[]).filter((p: any) => p.activo === true));
    setProductosList((productosData as any[]).filter((p: any) => p.activo !== false && (p.stock ?? p.cantidad ?? 0) > 0));

    if (horariosData !== null) {
      // Build the set from ALL horario records regardless of estado (Activo, Pendiente, Finalizado).
      // Filtering only by horarioEstaActivo (estado === true = "Activo") caused barberos to disappear
      // whenever their current week's schedule transitioned to "Finalizado" and no new "Activo"
      // schedule had been created yet.  The horario-based availability check (barberoTrabajaEnFecha)
      // already handles slot-level filtering inside the form — the dropdown list only needs to know
      // whether a barbero has *any* schedule record in the system.
      const barberosConHorario = new Set(
        (horariosData as any[]).map((h: any) => Number(h.barberoId))
      );
      if (barberosData !== null) {
        setBarberosList(
          (barberosData as any[]).filter((b: any) => {
            // Use truthy check — API may return estado as 1, "true", etc. (not strict boolean)
            if (!b.estado) return false;
            // If horariosData came back empty (API glitch / page-limit gap), show all active
            // barberos rather than filtering everyone out.
            if (barberosConHorario.size === 0) return true;
            return barberosConHorario.has(Number(b.id));
          })
        );
      }
      setHorariosList(horariosData as any[]);
    } else if (barberosData !== null) {
      // Truthy check — API may return estado as integer 1 or string "true"
      setBarberosList((barberosData as any[]).filter((b: any) => !!b.estado));
    }

    // Alerta solo cuando TODAS las peticiones críticas fallaron (falla de conexión real).
    // Un fallo parcial conserva datos previos — no se alerta al usuario.
    const criticalResults = [citasResult, barberosResult, serviciosResult, clientesResult, horariosResult];
    const failedCount = criticalResults.filter(r => r.status === 'rejected').length;

    if (failedCount === criticalResults.length) {
      error("Error de conexión", "No se pudieron cargar los datos desde el servidor.");
      console.error("Fallo total al cargar datos:", (citasResult as PromiseRejectedResult).reason);
    } else if (failedCount > 0) {
      console.warn(
        `${failedCount} petición(es) fallaron (se mantienen datos previos):`,
        criticalResults
          .filter(r => r.status === 'rejected')
          .map(r => (r as PromiseRejectedResult).reason)
      );
    }

    setIsLoading(false);
  };

  // Estados para el popover de detalle de cita (estilo Google Calendar)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const isSlotModalOpenRef = useRef(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [popoverSide, setPopoverSide] = useState<'left' | 'right'>('right');
  const [popoverPhase, setPopoverPhase] = useState<'enter' | 'open' | 'exit'>('enter');

  // Estado para el mini-tooltip de cita al hacer hover sobre la pestaña
  const [hoveredCita, setHoveredCita] = useState<{ cita: any; rect: DOMRect; servicioLabel: string; tabColor: string; abrirDetalle: () => void } | null>(null);
  const [hoveredSlotKey, setHoveredSlotKey] = useState<string | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [overflowPopup, setOverflowPopup] = useState<{
    citas: any[];
    rect: DOMRect;
    horaLabel: string;
    diaLabel: string;
    fechaCompleta: string;
  } | null>(null);
  const hoveredCitaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleHideTooltip = () => {
    cancelHideTooltip();
    // Delay antes de fade out para cubrir el gap entre botón y tooltip
    hoveredCitaTimerRef.current = setTimeout(() => {
      setTooltipVisible(false);
      tooltipHideTimerRef.current = setTimeout(() => setHoveredCita(null), 150);
    }, 80);
  };
  const cancelHideTooltip = () => {
    if (hoveredCitaTimerRef.current) clearTimeout(hoveredCitaTimerRef.current);
    if (tooltipHideTimerRef.current) clearTimeout(tooltipHideTimerRef.current);
  };
  const showTooltip = (data: { cita: any; rect: DOMRect; servicioLabel: string; tabColor: string; abrirDetalle: () => void }) => {
    cancelHideTooltip();
    setHoveredCita(data);
    // Pequeño delay para que el DOM monte antes de activar la transición
    requestAnimationFrame(() => requestAnimationFrame(() => setTooltipVisible(true)));
  };

  // Estados del modal de creación/edición de citas
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const MODAL_HEIGHT = Math.min(580, window.innerHeight - 32);
  const MODAL_MIN_HEIGHT = 220;
  const MODAL_DOCKED_TOP = window.innerHeight - 16 - MODAL_HEIGHT;
  const [modalHeight, setModalHeight] = useState<number>(MODAL_HEIGHT);
  const [modalTop, setModalTop] = useState<number>(MODAL_DOCKED_TOP);
  const [modalLeft, setModalLeft] = useState<number | null>(null);
  const [isModalDragging, setIsModalDragging] = useState(false);
  const [isSavingCita, setIsSavingCita] = useState(false);
  const isSavingCitaRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const initialFormSnapshotRef = useRef<FormSnapshot | null>(null);
  const showDiscardDialogRef = useRef(false);
  const dragState = useRef<{ dragging: boolean; startY: number; startX: number; startHeight: number; startTop: number; startLeft: number }>({ dragging: false, startY: 0, startX: 0, startHeight: MODAL_HEIGHT, startTop: MODAL_DOCKED_TOP, startLeft: 0 });
  const POPOVER_ANIM_MS = 200;
  const [selectedSlot, setSelectedSlot] = useState<{ dia: string, hora: number, fecha: string } | null>(null);
  const [slotSearchTerm, setSlotSearchTerm] = useState("");
  const [slotFilterEstado, setSlotFilterEstado] = useState("all");
  const [activeTab, setActiveTab] = useState<'lista' | 'crear' | 'detalle'>('lista');
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'crear'>('calendar');
  const [ventasPorCita, setVentasPorCita] = useState<Record<number, number>>({});
  const [showModalParcial, setShowModalParcial] = useState(false);
  const showModalParcialRef = useRef(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  // Índice de la cita activa cuando hay varias en una misma franja (pestañas; key: `${fecha}-${hora}`)
  const [slotCitaIndex, setSlotCitaIndex] = useState<Record<string, number>>({});

  const seleccionarCitaEnSlot = (slotKey: string, index: number, totalCitas: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalCitas <= 0 || index < 0 || index >= totalCitas) return;
    setSlotCitaIndex(prev => ({ ...prev, [slotKey]: index }));
  };

  // Estados para gestión de descuentos por día
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [dayDiscounts, setDayDiscounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('dayDiscounts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [pendingDiscountValue, setPendingDiscountValue] = useState("");
  const [activeModalDiscountTab, setActiveModalDiscountTab] = useState<'descuento' | 'barberos' | 'citas'>('citas');

  // Estados para edición de horario de barbero desde modal
  const [selectedBarberoForEdit, setSelectedBarberoForEdit] = useState<any>(null);
  const [isEditHorarioModalOpen, setIsEditHorarioModalOpen] = useState(false);
  const [editHorarioStart, setEditHorarioStart] = useState("");
  const [editHorarioEnd, setEditHorarioEnd] = useState("");
  const [isSavingHorario, setIsSavingHorario] = useState(false);

  useEffect(() => {
    localStorage.setItem('dayDiscounts', JSON.stringify(dayDiscounts));
  }, [dayDiscounts]);

  // Escuchar evento de scroll desde el sistema de notificaciones
  useEffect(() => {
    const handler = (e: Event) => {
      const { hora, fecha, citaId } = (e as CustomEvent<{ hora: string; fecha: string; citaId?: number }>).detail || {};
      if (!hora) return;

      // Asegurarse de estar en vista calendario
      setViewMode('calendar');

      // Si viene con fecha, calcular el weekOffset para navegar a esa semana
      if (fecha) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dayOfWeek = today.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diffToMonday);

        const citaDate = new Date(`${fecha}T12:00:00`);
        citaDate.setHours(0, 0, 0, 0);
        const citaDayOfWeek = citaDate.getDay();
        const diffToCitaMonday = citaDayOfWeek === 0 ? -6 : 1 - citaDayOfWeek;
        const citaMonday = new Date(citaDate);
        citaMonday.setDate(citaDate.getDate() + diffToCitaMonday);

        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekOffset = Math.round((citaMonday.getTime() - thisMonday.getTime()) / msPerWeek);

        // Siempre actualizar currentWeek, incluso si weekOffset es 0:
        // el usuario puede estar viendo otra semana y hay que volver a la actual.
        setCurrentWeek(weekOffset);
      }

      // Calcular posición de scroll: grilla empieza en 9:00, cada slot = h-20 (80px) + gap-1 (4px) = 84px
      const [hStr, mStr] = hora.split(':');
      const horaDecimal = parseInt(hStr) + parseInt(mStr || '0') / 60;
      const GRID_START = 9;
      const SLOT_HEIGHT = 84;
      const slotIndex = Math.max(0, Math.round((horaDecimal - GRID_START) / 0.5));
      const slotTop = slotIndex * SLOT_HEIGHT;

      // Scroll con delay aumentado para dar tiempo al re-render del calendario
      // tras el posible cambio de semana (setCurrentWeek → re-render → DOM listo).
      setTimeout(() => {
        const container = document.querySelector('.module-content');
        if (container) {
          // Centrar la hora en el viewport: restar la mitad de la altura visible
          // y sumar la mitad de la altura de un slot para que quede justo en el centro.
          const halfViewport = container.clientHeight / 2;
          const scrollTarget = Math.max(0, slotTop - halfViewport + SLOT_HEIGHT / 2);
          container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
        }
        // Activar highlight sobre el bloque de la cita una vez que el scroll terminó.
        // El glow dura 2.4 s (ver globals.css → citaNotifHighlight) y luego se limpia.
        if (citaId != null) {
          setHighlightedCitaId(citaId);
          setTimeout(() => setHighlightedCitaId(null), 2600);
        }
      }, 400);
    };

    window.addEventListener('scroll-to-cita-hora', handler);
    return () => window.removeEventListener('scroll-to-cita-hora', handler);
  }, []);

  // Sincronizar cambios de estado hechos desde notificaciones externas (ej. bell)
  useEffect(() => {
    const handler = (e: Event) => {
      const { citaId, estado } = (e as CustomEvent<{ citaId: number; estado: string }>).detail || {};
      if (!citaId || !estado) return;
      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado } : c));
      setSelectedCita(prev => prev?.id === citaId ? { ...prev, estado } : prev);
    };
    window.addEventListener('cita-estado-changed', handler);
    return () => window.removeEventListener('cita-estado-changed', handler);
  }, []);

  // Estados para formulario de nueva cita
  const [nuevaCita, setNuevaCita] = useState({
    clienteId: 0,
    cliente: '',
    telefono: '',
    servicioId: null as number | null,
    servicioIds: [] as number[],
    productoCantidades: {} as Record<number, number>,
    paqueteId: null as number | null,
    servicio: '',
    barberoId: 0,
    barbero: '',
    fecha: '',
    hora: '',
    duracion: 60,
    precio: 0,
    estado: 'Pendiente',
    notas: ''
  });

  // Estados para confirmaciones
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [citaToDelete, setCitaToDelete] = useState<any>(null);

  // Confirmación de acción de estado de cita
  const [confirmAccion, setConfirmAccion] = useState<null | { tipo: 'cancelar' | 'completar' | 'parcial'; citaId: number }>(null);
  const confirmAccionRef = useRef<typeof confirmAccion>(null);

  // Estados para buscadores dentro del formulario de cita
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [barberoFormSearchTerm, setBarberoFormSearchTerm] = useState('');
  const [showBarberoFormResults, setShowBarberoFormResults] = useState(false);
  const [servicioSearchTerm, setServicioSearchTerm] = useState('');
  const [paqueteSearchTerm, setPaqueteSearchTerm] = useState('');
  const [productoSearchTerm, setProductoSearchTerm] = useState('');
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(new Set());
  const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
  const [editingFecha, setEditingFecha] = useState(false);
  const [editingHora, setEditingHora] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const hourPickerRef = useRef<HTMLDivElement>(null);

  /** Barberos filtrados por fecha/hora del formulario (turno laboral + disponibilidad). */
  const barberosParaFormulario = useMemo(
    () =>
      filtrarBarberosDisponibles(barberosList, horariosList, {
        fechaStr: nuevaCita.fecha,
        hora: nuevaCita.hora || undefined,
        duracionMinutos: nuevaCita.duracion,
        citas,
        ignoreCitaId: selectedCita?.id,
        minAnticipacionMinutos: MIN_ANTICIPACION_AGENDA_MINUTOS,
        slotHours: horasDelDia,
      }),
    [
      barberosList,
      horariosList,
      nuevaCita.fecha,
      nuevaCita.hora,
      nuevaCita.duracion,
      citas,
      selectedCita?.id,
    ]
  );

  const [barberoHorarioWarning, setBarberoHorarioWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!nuevaCita.barberoId || !nuevaCita.fecha || !nuevaCita.hora) {
      setBarberoHorarioWarning(null);
      return;
    }
    const sigueDisponible = barberosParaFormulario.some(
      (b) => Number(b.id) === Number(nuevaCita.barberoId)
    );
    if (!sigueDisponible) {
      const horariosBarbero = getHorariosBarberoParaDia(horariosList, nuevaCita.barberoId, nuevaCita.fecha);
      if (horariosBarbero.length > 0) {
        const [hh, mm] = nuevaCita.hora.split(':').map(Number);
        const inicioMin = hh * 60 + mm;
        const finCitaMin = inicioMin + nuevaCita.duracion;
        const bloque = horariosBarbero.find(h => {
          const s = parseHoraAMinutos(h.horaInicio || '00:00');
          const e = parseHoraAMinutos(h.horaFin || '23:59');
          return inicioMin >= s && inicioMin < e;
        });
        if (bloque) {
          const horaFinStr = bloque.horaFin || '';
          const finBloqueMin = parseHoraAMinutos(horaFinStr);
          const exceso = finCitaMin - finBloqueMin;
          if (exceso > 0) {
            setBarberoHorarioWarning(
              `El barbero termina su jornada a las ${formatHoraStr12(horaFinStr)}. Los servicios seleccionados suman ${nuevaCita.duracion} min y superan ese límite por ${exceso} min.`
            );
            return;
          }
        }
      }
      setBarberoHorarioWarning(null);
    } else {
      setBarberoHorarioWarning(null);
    }
  }, [barberosParaFormulario, nuevaCita.barberoId, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion]);

  // Cerrar dropdowns al hacer clic fuera
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

  const getCurrentFormSnapshot = useCallback((): FormSnapshot => (
    buildFormSnapshot(nuevaCita, {
      tipoServicio,
      clienteSearchTerm,
      barberoFormSearchTerm,
      servicioSearchTerm,
      paqueteSearchTerm,
      productoSearchTerm,
    })
  ), [
    nuevaCita,
    tipoServicio,
    clienteSearchTerm,
    barberoFormSearchTerm,
    servicioSearchTerm,
    paqueteSearchTerm,
    productoSearchTerm,
  ]);

  const commitFormSnapshot = useCallback((snapshot: FormSnapshot) => {
    initialFormSnapshotRef.current = snapshot;
  }, []);

  const beginCreateModalOpen = useCallback((snapshot: FormSnapshot) => {
    commitFormSnapshot(snapshot);
    setShowDiscardDialog(false);
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
  }, [commitFormSnapshot]);

  const isFormDirtyNow = useCallback((): boolean => {
    const init = initialFormSnapshotRef.current;
    if (!init) return false;
    return isSnapshotDirty(getCurrentFormSnapshot(), init);
  }, [getCurrentFormSnapshot]);

  // Cerrar modal con animación de salida
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
      // No limpiar selectedCita si el slot modal abrió durante la animación de cierre
      if (!isSlotModalOpenRef.current) setSelectedCita(null);
      setShowFormErrors(false);
      setClienteSearchTerm('');
      setBarberoFormSearchTerm('');
      setServicioSearchTerm('');
      setPaqueteSearchTerm('');
      setProductoSearchTerm('');
      setNuevaCita({
        clienteId: 0, cliente: '', telefono: '',
        servicioId: null, servicioIds: [], productoCantidades: {},
        paqueteId: null, servicio: '', barberoId: 0, barbero: '',
        fecha: '', hora: '', duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
      });
    }, 200);
  }, [isFormDirtyNow]);

  useEffect(() => {
    showDiscardDialogRef.current = showDiscardDialog;
  }, [showDiscardDialog]);

  useEffect(() => {
    if (!isCreateModalOpen) {
      initialFormSnapshotRef.current = null;
    }
  }, [isCreateModalOpen]);

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
  }, [isCreateModalOpen, showDiscardDialog, handleCloseModal]);

  // Cerrar modal al hacer click fuera (sin bloquear scroll del calendario)
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (showDiscardDialogRef.current) return;
      const path = e.composedPath();
      if (path.some((el) => el instanceof HTMLElement && el.closest('[data-discard-dialog-root]'))) {
        return;
      }
      if (path.some((el) => el instanceof Element && el.getAttribute('data-modal-portal') === 'true')) {
        return;
      }
      if (modalRef.current && !path.includes(modalRef.current)) {
        handleCloseModal();
      }
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [isCreateModalOpen, handleCloseModal]);

  useEffect(() => {
    if (!onSubNavChange) return;

    if (isCreateModalOpen) {
      onSubNavChange({
        title: selectedCita ? 'Editar Cita' : 'Nueva Cita',
        subtitle: 'Completa la información del agendamiento',
        onBack: () => {
          handleCloseModal();
        },
        backTitle: 'Volver al Calendario',
        icon: <CalendarDays className="w-5 h-5" />,
        iconContainerClassName: 'text-orange-primary',
      });
      return;
    }

    onSubNavChange(null);
  }, [isCreateModalOpen, selectedCita, onSubNavChange, handleCloseModal]);

  const getAutoDateTime = () => {
    const now = new Date();
    const future = new Date(now.getTime() + (60 * 60 * 1000));
    let hours = future.getHours();
    let minutes = future.getMinutes();
    let targetDate = now;

    if (minutes < 15) {
      minutes = 0;
    } else if (minutes < 45) {
      minutes = 30;
    } else {
      minutes = 0;
      hours += 1;
    }

    if (hours >= 22 || (hours === 21 && minutes > 30)) {
      targetDate = new Date(now.getTime() + (24 * 60 * 60 * 1000));
      hours = 11;
      minutes = 0;
    } else if (hours < 9) {
      hours = 11;
      minutes = 0;
    }

    const fecha = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, "0")}-${String(targetDate.getDate()).padStart(2, "0")}`;
    const hora = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    return { fecha, hora, hours };
  };

  const applyInitialReservationItem = (item: any) => {
    if (!item) return;

    const { fecha, hora, hours } = getAutoDateTime();
    const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = dayLabels[new Date(`${fecha}T12:00:00`).getDay()] || "Reserva";

    // ── Handle barbero-type selection from landing page ──
    if (item.type === 'barbero') {
      const nombreBarbero = String(item.nombre || '').trim().toLowerCase();
      const barberoMatch = barberosList.find(
        (b: any) => String(b.nombre || '').trim().toLowerCase().includes(nombreBarbero)
          || nombreBarbero.includes(String(b.nombre || '').trim().toLowerCase())
      );

      setSelectedSlot({ dia: dayName, hora: hours, fecha });
      setSelectedCita(null);
      setShowFormErrors(false);
      setClienteSearchTerm("");

      if (barberoMatch) {
        setBarberoFormSearchTerm(`${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim());
        setNuevaCita({
          clienteId: 0,
          cliente: '',
          telefono: '',
          servicioId: null,
          servicioIds: [],
          productoCantidades: {},
          paqueteId: null,
          servicio: '',
          barberoId: barberoMatch.id,
          barbero: `${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim(),
          fecha,
          hora,
          duracion: 60,
          precio: 0,
          estado: 'Pendiente',
          notas: ''
        });
      } else {
        setBarberoFormSearchTerm(item.nombre || '');
        setNuevaCita({
          clienteId: 0,
          cliente: '',
          telefono: '',
          servicioId: null,
          servicioIds: [],
          productoCantidades: {},
          paqueteId: null,
          servicio: '',
          barberoId: 0,
          barbero: item.nombre || '',
          fecha,
          hora,
          duracion: 60,
          precio: 0,
          estado: 'Pendiente',
          notas: ''
        });
      }

      // Abrir modal con los datos pre-llenados
      const position = {
        top: Math.max(16, (window.innerHeight - 600) / 2),
        left: Math.max(16, (window.innerWidth - 480) / 2)
      };
      setModalPosition(position);
      setTipoServicio('individuales');
      setEditingFecha(false);
      setEditingHora(false);
      setModalHeight(MODAL_HEIGHT);
      setModalTop(MODAL_DOCKED_TOP);
      setModalLeft(null);
      beginCreateModalOpen(buildFormSnapshot(
        barberoMatch
          ? {
              clienteId: 0, cliente: '', telefono: '',
              servicioId: null, servicioIds: [], productoCantidades: {},
              paqueteId: null, servicio: '',
              barberoId: barberoMatch.id,
              barbero: `${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim(),
              fecha, hora, duracion: 60, precio: 0, estado: 'Pendiente', notas: '',
            }
          : {
              clienteId: 0, cliente: '', telefono: '',
              servicioId: null, servicioIds: [], productoCantidades: {},
              paqueteId: null, servicio: '',
              barberoId: 0, barbero: item.nombre || '',
              fecha, hora, duracion: 60, precio: 0, estado: 'Pendiente', notas: '',
            },
        {
          tipoServicio: 'individuales',
          clienteSearchTerm: '',
          barberoFormSearchTerm: barberoMatch
            ? `${barberoMatch.nombre} ${barberoMatch.apellido || ''}`.trim()
            : (item.nombre || ''),
          servicioSearchTerm: '',
          paqueteSearchTerm: '',
          productoSearchTerm: '',
        }
      ));
      onClearInitialItem?.();
      return;
    }

    // ── Handle servicio / paquete selection ──
    const isPaquete = item.type === "paquete" || item.tipoItem === "paquete";
    const itemId = Number(item.id || 0);
    if (!itemId) return;

    let precio = Number(item.precio || 0);
    let duracion = Number(item.duracion || 60);

    if (isPaquete) {
      const paquete = paquetesList.find((p) => Number(p.id) === itemId);
      if (paquete) {
        precio = Number(paquete.precio || precio || 0);
        duracion = Number(paquete.duracion || duracion || 60);
      }
    } else {
      const servicio = serviciosList.find((s) => Number(s.id) === itemId);
      if (servicio) {
        precio = Number(servicio.precio || precio || 0);
        duracion = Number(servicio.duracion || duracion || 60);
      }
    }

    setSelectedSlot({
      dia: dayName,
      hora: hours,
      fecha
    });

    setSelectedCita(null);
    setShowFormErrors(false);
    setClienteSearchTerm("");
    setBarberoFormSearchTerm("");

    setNuevaCita({
      clienteId: 0,
      cliente: '',
      telefono: '',
      servicioId: isPaquete ? null : itemId,
      servicioIds: isPaquete ? [] : [itemId],
      productoCantidades: {},
      paqueteId: isPaquete ? itemId : null,
      servicio: String(item.nombre || ''),
      barberoId: 0,
      barbero: '',
      fecha,
      hora,
      duracion,
      precio,
      estado: 'Pendiente',
      notas: ''
    });

    // Abrir modal con los datos pre-llenados
    const positionItem = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };
    setModalPosition(positionItem);
    setTipoServicio(isPaquete ? 'paquetes' : 'individuales');
    setEditingFecha(false);
    setEditingHora(false);
    setModalHeight(MODAL_HEIGHT);
    setModalLeft(null);
    beginCreateModalOpen(buildFormSnapshot(
      {
        clienteId: 0, cliente: '', telefono: '',
        servicioId: isPaquete ? null : itemId,
        servicioIds: isPaquete ? [] : [itemId],
        productoCantidades: {},
        paqueteId: isPaquete ? itemId : null,
        servicio: String(item.nombre || ''),
        barberoId: 0, barbero: '',
        fecha, hora, duracion, precio, estado: 'Pendiente', notas: '',
      },
      {
        tipoServicio: isPaquete ? 'paquetes' : 'individuales',
        clienteSearchTerm: '',
        barberoFormSearchTerm: '',
        servicioSearchTerm: '',
        paqueteSearchTerm: '',
        productoSearchTerm: '',
      }
    ));
    setSelectedCita(null);
    onClearInitialItem?.();
  };

  // Helper: obtener el lunes de una semana dada
  const getMondayOfWeek = (weekOffset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun...6=Sáb
    // Domingo (0) → retroceder 6 días al lunes anterior; resto → retroceder al lunes de la semana
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Funciones auxiliares para el calendario
  const getCurrentWeekDays = () => {
    const monday = getMondayOfWeek(currentWeek);
    return diasSemana.map((dia, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return {
        dia,
        fecha: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        fechaCompleta: toLocalDateString(date)
      };
    });
  };

  const getCitasPorDia = (dia: string) => {
    const monday = getMondayOfWeek(currentWeek);
    const dayIndex = diasSemana.indexOf(dia);
    const targetDate = new Date(monday);
    targetDate.setDate(monday.getDate() + dayIndex);
    const targetDateString = toLocalDateString(targetDate);
    return citas.filter(cita => normalizarFechaCita(cita.fecha) === targetDateString);
  };

  // Obtener citas específicas para una hora y día
  const getCitasEnSlot = (dia: string, hora: number) => {
    const citasDelDia = getCitasPorDia(dia);
    return citasDelDia.filter(cita => {
      if ((cita.estado || '').toLowerCase() === 'cancelada') return false;
      const horaSplit = (cita.hora || '').split(':');
      const horaInicio = parseInt(horaSplit[0] || '0') + (parseInt(horaSplit[1] || '0') / 60);
      // Redondear inicio al slot de grilla hacia abajo (12:05 → 12:00)
      const horaInicioSlot = Math.floor(horaInicio * 2) / 2;
      const horaFinExacta = horaInicio + (cita.duracion || 60) / 60;
      // El slot pertenece a la cita si: inicio_slot <= hora < fin_exacta
      // Esto hace que 13:05 incluya el slot 13:00 pero no el 13:30
      return horaInicioSlot <= hora && hora < horaFinExacta;
    }).filter(cita => {
      // Aplicar filtros de búsqueda (con null-safety en todos los campos)
      if (!slotSearchTerm) return slotFilterEstado === "all" || cita.estado === slotFilterEstado;
      const term = slotSearchTerm.toLowerCase();
      const matchesSearch =
        (cita.clienteNombre || '').toLowerCase().includes(term) ||
        (cita.clienteTelefono || cita.telefono || '').includes(slotSearchTerm) ||
        (cita.servicioNombre || '').toLowerCase().includes(term);
      const matchesEstado = slotFilterEstado === "all" || cita.estado === slotFilterEstado;
      return matchesSearch && matchesEstado;
    });
  };

  const getCitaColor = (estado: string) => {
    switch (estado) {
      case 'Completada': return '#3B82F6';
      case 'Cancelada': return '#EF4444';
      default: return '#d8b081'; // Pendiente
    }
  };

  /** Color de pestaña / acento: prioriza `color` guardado en la cita (hex), si no el del estado. */
  const getCitaTabColor = (cita: { estado?: string; color?: string } | null | undefined): string => {
    if (!cita) return '#d8b081';
    const raw = String((cita as { color?: string }).color ?? '').trim();
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(raw)) return raw;
    return getCitaColor(String(cita.estado || 'Pendiente'));
  };

  /** Color del punto y barra de la cita en la grilla: gris si Completada, color por barbero principal, o dorado por defecto. */
  const BARBERO_DOT_COLORS: { match: RegExp; color: string }[] = [
    { match: /edwin/i,           color: '#F5C518' },
    { match: /maicol/i,          color: '#E8B430' },
    { match: /eduardo/i,         color: '#C8900A' },
    { match: /christian/i,       color: '#B07808' },
    { match: /juan\s*g[oó]mez/i, color: '#8B6410' },
  ];

  const getCitaDotColor = (cita: { estado?: string; barberoNombre?: string } | null | undefined): string => {
    if (!cita) return '#d8b081';
    if (String(cita.estado || '') === 'Completada') return '#6B7280';
    const nombre = String((cita as any).barberoNombre || '');
    for (const { match, color } of BARBERO_DOT_COLORS) {
      if (match.test(nombre)) return color;
    }
    return '#d8b081';
  };

  const validarDisponibilidadBarbero = (barberoId: number): string | null => {
    if (!nuevaCita.fecha || !nuevaCita.hora) return null;

    // Validar fecha anterior al día actual
    const today = new Date();
    const todayStr = toLocalDateString(today);
    if (nuevaCita.fecha < todayStr) {
      return "No se permite agendar citas en días anteriores al día actual.";
    }

    const durNueva = Number(nuevaCita.duracion || 60);
    const [hhStr, mmStr = '0'] = String(nuevaCita.hora).split(':');
    const startNueva = (parseInt(hhStr || '0', 10) * 60) + (parseInt(mmStr || '0', 10));

    // Validar hora pasada si es el día de hoy
    if (nuevaCita.fecha === todayStr) {
      const currentMinutes = today.getHours() * 60 + today.getMinutes();
      if (startNueva <= currentMinutes + MIN_ANTICIPACION_AGENDA_MINUTOS) {
        return `Debes agendar con al menos ${MIN_ANTICIPACION_AGENDA_MINUTOS} minutos de anticipación.`;
      }
    }

    const endNueva = startNueva + durNueva;

    // Obtener las citas del día para este barbero, para considerarlo en el error
    const horariosBarbero = getHorariosBarberoParaDia(horariosList, barberoId, nuevaCita.fecha);

    if (horariosBarbero.length === 0) {
      const diaStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][
        new Date(`${nuevaCita.fecha}T12:00:00`).getDay()
      ];
      return `El barbero no trabaja los días ${diaStr}.`;
    }

    const dentroHorario = horariosBarbero.some((h: any) => {
      const startH = parseHoraAMinutos(h.horaInicio || '00:00');
      const endH = parseHoraAMinutos(h.horaFin || '23:59');
      return startNueva >= startH && endNueva <= endH;
    });

    if (!dentroHorario) {
      // Retornar las horas disponibles para decirle al usuario
      const horasDisponiblesStr = horariosBarbero.map((h: any) => `${h.horaInicio} a ${h.horaFin}`).join(", ");
      return `La hora seleccionada está fuera de su horario laboral. Las horas disponibles de este barbero son: ${horasDisponiblesStr}.`;
    }

    const solapa = citas.find((cita: any) => {
      if (normalizarFechaCita(cita.fecha) !== nuevaCita.fecha) return false;
      if (Number(cita.barberoId) !== Number(barberoId)) return false;
      // Ignorar la propia cita cuando estamos editando
      if (selectedCita && cita.id === selectedCita.id) return false;
      // Ignorar canceladas
      const estado = String(cita.estado || '');
      if (estado.toLowerCase() === 'cancelada') return false;
      const [ch, cm = '0'] = String(cita.hora || '').split(':');
      const startExist = (parseInt(ch || '0', 10) * 60) + (parseInt(cm || '0', 10));
      const durExist = Number(cita.duracion || 60);
      const endExist = startExist + durExist;
      // Se solapan si inician antes de que termine la otra y terminan después de que empiece
      return startNueva < endExist && startExist < endNueva;
    });

    if (solapa) {
      return `El barbero ya tiene otra cita ocupada de ${solapa.hora} a ${solapa.hora} (+${solapa.duracion}min). Por favor selecciona otro horario.`;
    }

    return null; // Todo correcto
  };

  const getHorasDisponiblesParaDia = (fechaStr: string, barberoId: number, duracion: number) =>
    calcularHorasDisponibles({
      fechaStr,
      barberoId,
      duracionMinutos: duracion,
      horariosList,
      citas,
      ignoreCitaId: selectedCita?.id,
      minAnticipacionMinutos: MIN_ANTICIPACION_AGENDA_MINUTOS,
      slotHours: horasDelDia,
    });

  const getEstadoInfo = (estado: string) => {
    const estadoInfo = estados.find(e => e.value === estado);
    return estadoInfo || { value: estado, label: estado, color: "bg-gray-medium" };
  };

  // Abrir modal de creación desde el botón "Nueva Cita" (campos vacíos, posición centrada)
  const handleOpenCreateModal = useCallback(() => {
    const { fecha, hora } = getAutoDateTime();

    // Calcular posición centrada en pantalla
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };

    setModalPosition(position);
    setSelectedCita(null);
    setShowFormErrors(false);
    setClienteSearchTerm('');
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setNuevaCita({
      clienteId: 0, cliente: '', telefono: '',
      servicioId: null, servicioIds: [], productoCantidades: {},
      paqueteId: null, servicio: '', barberoId: 0, barbero: '',
      fecha, hora, duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
    });
    setTipoServicio('individuales');
    setEditingFecha(false);
    setEditingHora(false);

    setModalHeight(MODAL_HEIGHT);
    setModalLeft(null);
    beginCreateModalOpen(buildFormSnapshot(
      {
        clienteId: 0, cliente: '', telefono: '',
        servicioId: null, servicioIds: [], productoCantidades: {},
        paqueteId: null, servicio: '', barberoId: 0, barbero: '',
        fecha, hora, duracion: 60, precio: 0, estado: 'Pendiente', notas: '',
      },
      {
        tipoServicio: 'individuales',
        clienteSearchTerm: '',
        barberoFormSearchTerm: '',
        servicioSearchTerm: '',
        paqueteSearchTerm: '',
        productoSearchTerm: '',
      }
    ));
  }, [beginCreateModalOpen]);

  // Manejar clic en celda del calendario (abre modal con fecha/hora preseleccionadas)
  const handleSlotClick = useCallback((dia: string, hora: number) => {
    const weekDays = getCurrentWeekDays();
    const dayInfo = weekDays.find(d => d.dia === dia);

    setSelectedSlot({
      dia,
      hora,
      fecha: dayInfo?.fechaCompleta || ''
    });

    // Calcular posición centrada en pantalla (cerca del slot)
    const position = {
      top: Math.max(16, (window.innerHeight - 600) / 2),
      left: Math.max(16, (window.innerWidth - 480) / 2)
    };

    // Preparar formulario con fecha/hora del slot preseleccionadas
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    const horaString = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;

    setModalPosition(position);
    setSelectedCita(null);
    setShowFormErrors(false);
    setClienteSearchTerm('');
    setBarberoFormSearchTerm('');
    setServicioSearchTerm('');
    setPaqueteSearchTerm('');
    setProductoSearchTerm('');
    setNuevaCita({
      clienteId: 0,
      cliente: '',
      telefono: '',
      servicioId: null,
      servicioIds: [],
      productoCantidades: {},
      paqueteId: null,
      servicio: '',
      barberoId: 0,
      barbero: '',
      fecha: dayInfo?.fechaCompleta || '',
      hora: horaString,
      duracion: 60,
      precio: 0,
      estado: 'Pendiente',
      notas: ''
    });

    setSlotSearchTerm("");
    setSlotFilterEstado("all");
    setTipoServicio('individuales');
    setEditingFecha(false);
    setEditingHora(false);

    setModalHeight(MODAL_HEIGHT);
    setModalLeft(null);
    beginCreateModalOpen(buildFormSnapshot(
      {
        clienteId: 0, cliente: '', telefono: '',
        servicioId: null, servicioIds: [], productoCantidades: {},
        paqueteId: null, servicio: '', barberoId: 0, barbero: '',
        fecha: dayInfo?.fechaCompleta || '',
        hora: horaString,
        duracion: 60, precio: 0, estado: 'Pendiente', notas: '',
      },
      {
        tipoServicio: 'individuales',
        clienteSearchTerm: '',
        barberoFormSearchTerm: '',
        servicioSearchTerm: '',
        paqueteSearchTerm: '',
        productoSearchTerm: '',
      }
    ));
  }, [getCurrentWeekDays, beginCreateModalOpen]);

  // Helper para formatear el texto de fecha/hora en la fila del formulario (Requirement 4.2)
  const formatFechaHoraTexto = (): string => {
    if (!nuevaCita.fecha && !nuevaCita.hora) return 'Selecciona fecha y hora';
    const partes: string[] = [];
    if (nuevaCita.fecha) {
      const d = new Date(nuevaCita.fecha + 'T12:00:00');
      partes.push(d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }));
    }
    if (nuevaCita.hora) {
      const horaInicio = formatHoraStr12(nuevaCita.hora);
      const [hh, mm] = nuevaCita.hora.split(':').map(Number);
      const finMin = hh * 60 + mm + nuevaCita.duracion;
      const finHH = Math.floor(finMin / 60).toString().padStart(2, '0');
      const finMM = String(finMin % 60).padStart(2, '0');
      const horaFin = formatHoraStr12(`${finHH}:${finMM}`);
      partes.push(`${horaInicio} – ${horaFin}`);
    }
    return partes.join(' · ');
  };

  // Helper para calcular precio de productos seleccionados
  const calcularPrecioProductos = (cantidades: Record<number, number>) => {
    return Object.entries(cantidades).reduce((acc, [idStr, cant]) => {
      const prod = productosList.find(p => p.id === Number(idStr));
      return acc + (prod ? Number(prod.precioVenta || 0) * cant : 0);
    }, 0);
  };

  // Helper para convertir productoCantidades a array plano de IDs para la API
  const flattenProductoCantidades = (cantidades: Record<number, number>): number[] => {
    return Object.entries(cantidades).flatMap(([idStr, cant]) =>
      Array.from({ length: cant }, () => Number(idStr))
    );
  };

  const applyServiciosSelection = (servicioIds: number[]) => {
    const selectedServicios = serviciosList.filter(s => servicioIds.includes(s.id));
    const servicioNombres = selectedServicios.map(s => s.nombre).filter(Boolean);
    const precioBaseServicios = selectedServicios.reduce((acc, s) => acc + Number(s.precio || 0), 0);
    const descuento = dayDiscounts[nuevaCita.fecha] || 0;
    const precioBaseConDescuento = precioBaseServicios * (1 - (descuento / 100));
    
    const precioProductos = calcularPrecioProductos(nuevaCita.productoCantidades);
    const duracionTotal = selectedServicios.reduce((acc, s) => acc + Number(s.duracion || 60), 0);
    setNuevaCita(prev => ({
      ...prev,
      paqueteId: null,
      servicioId: servicioIds.length > 0 ? servicioIds[0] : null,
      servicioIds,
      servicio: servicioNombres.join(", "),
      precio: precioBaseConDescuento + precioProductos,
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
    const nextCantidades = { ...nuevaCita.productoCantidades, [productoId]: (nuevaCita.productoCantidades[productoId] || 0) + 1 };
    recalcularPrecioConProductos(nextCantidades);
  };

  const removeProducto = (productoId: number) => {
    const current = nuevaCita.productoCantidades[productoId] || 0;
    const nextCantidades = { ...nuevaCita.productoCantidades };
    if (current <= 1) {
      delete nextCantidades[productoId];
    } else {
      nextCantidades[productoId] = current - 1;
    }
    recalcularPrecioConProductos(nextCantidades);
  };

  const quitarProducto = (productoId: number) => {
    const nextCantidades = { ...nuevaCita.productoCantidades };
    delete nextCantidades[productoId];
    recalcularPrecioConProductos(nextCantidades);
  };

  const recalcularPrecioConProductos = (cantidades: Record<number, number>) => {
    const precioProductos = calcularPrecioProductos(cantidades);
    let precioBase = 0;
    if (nuevaCita.paqueteId) {
      const paquete = paquetesList.find(p => p.id === nuevaCita.paqueteId);
      precioBase = paquete ? Number(paquete.precio || 0) : 0;
    } else {
      precioBase = serviciosList
        .filter(s => nuevaCita.servicioIds.includes(s.id))
        .reduce((acc, s) => acc + Number(s.precio || 0), 0);
    }
    
    const descuento = dayDiscounts[nuevaCita.fecha] || 0;
    const precioBaseConDescuento = precioBase * (1 - (descuento / 100));

    setNuevaCita(prev => ({
      ...prev,
      productoCantidades: cantidades,
      precio: precioBaseConDescuento + precioProductos
    }));
  };

  const handlePaqueteChange = (value: string) => {
    const precioProductos = calcularPrecioProductos(nuevaCita.productoCantidades);
    if (value === "none") {
      setNuevaCita(prev => ({
        ...prev,
        paqueteId: null,
        servicioId: null,
        servicioIds: [],
        servicio: "",
        precio: precioProductos,
        duracion: 60
      }));
      return;
    }
    const id = parseInt(value.replace("p-", ""));
    const paquete = paquetesList.find(p => p.id === id);
    
    const precioBase = paquete ? paquete.precio : 0;
    const descuento = dayDiscounts[nuevaCita.fecha] || 0;
    const precioBaseConDescuento = precioBase * (1 - (descuento / 100));

    setNuevaCita(prev => ({
      ...prev,
      paqueteId: id,
      servicioId: null,
      servicioIds: [],
      servicio: paquete ? paquete.nombre : "",
      precio: precioBaseConDescuento + precioProductos,
      duracion: paquete ? paquete.duracion : 60
    }));
  };

  // Crear nueva cita
  const handleCreateCita = async () => {
    if (isSavingCitaRef.current) return;
    if (!nuevaCita.clienteId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.barberoId || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      setDismissedErrors(new Set());
      return;
    }
    setShowFormErrors(false);

    const errorDisponibilidad = validarDisponibilidadBarbero(nuevaCita.barberoId);
    if (errorDisponibilidad) {
      error("No disponible", errorDisponibilidad);
      return;
    }

    isSavingCitaRef.current = true;
    setIsSavingCita(true);
    try {
      await agendamientoService.createAgendamiento({
        clienteId: nuevaCita.clienteId,
        barberoId: nuevaCita.barberoId,
        servicioId: nuevaCita.servicioId,
        servicioIds: nuevaCita.servicioIds,
        productoIds: flattenProductoCantidades(nuevaCita.productoCantidades),
        paqueteId: nuevaCita.paqueteId,
        fecha: nuevaCita.fecha,
        hora: nuevaCita.hora,
        duracion: nuevaCita.duracion,
        precio: nuevaCita.precio,
        estado: nuevaCita.estado,
        notas: nuevaCita.notas
      });

      // Recargar todos los datos para que la cita creada tenga nombres, hora correcta, etc.
      await fetchData();

      setClienteSearchTerm('');
      setBarberoFormSearchTerm('');
      success("¡Cita creada exitosamente!", `La cita ha sido registrada.`);
      handleCloseModal(true);
    } catch (err: any) {
      console.error("Error al crear cita:", err);
      const errorMsg = err?.message || err || "No se pudo conectar con el servidor.";
      const displayMsg = errorMsg.toString().replace("Error 400: ", "").replace("Error 500: ", "");
      error("No se pudo crear la cita", displayMsg);
    } finally {
      isSavingCitaRef.current = false;
      setIsSavingCita(false);
    }
  };

  // Editar cita
  const handleEditCita = async (cita: any) => {
    try {
      const citaCompleta = await agendamientoService.getAgendamientoById(cita.id);

      setSelectedCita(citaCompleta);
      setShowFormErrors(false);

      setNuevaCita({
        clienteId: citaCompleta.clienteId,
        cliente: citaCompleta.clienteNombre,
        telefono: citaCompleta.clienteTelefono || '',
        servicioId: citaCompleta.servicioId,
        servicioIds: (citaCompleta.servicioIds && citaCompleta.servicioIds.length > 0)
          ? citaCompleta.servicioIds
          : (citaCompleta.servicioId ? [citaCompleta.servicioId] : []),
        productoCantidades: ((citaCompleta.productoIds || []) as number[]).reduce((acc: Record<number, number>, id: number) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
        paqueteId: citaCompleta.paqueteId,
        servicio: citaCompleta.servicioNombre || citaCompleta.paqueteNombre || '',
        barberoId: citaCompleta.barberoId,
        barbero: citaCompleta.barberoNombre,
        fecha: citaCompleta.fecha,
        hora: citaCompleta.hora,
        duracion: citaCompleta.duracion,
        precio: citaCompleta.precio,
        estado: citaCompleta.estado,
        notas: citaCompleta.notas
      });

      setClienteSearchTerm(citaCompleta.clienteNombre || '');
      setBarberoFormSearchTerm(citaCompleta.barberoNombre || '');
      setTipoServicio(citaCompleta.paqueteId ? 'paquetes' : 'individuales');
      setEditingFecha(false);
      setEditingHora(false);

      // Abrir modal con los datos de la cita a editar
      const editPosition = {
        top: Math.max(16, (window.innerHeight - 600) / 2),
        left: Math.max(16, (window.innerWidth - 480) / 2)
      };
      setModalPosition(editPosition);
      setModalHeight(MODAL_HEIGHT);
      setModalTop(MODAL_DOCKED_TOP);
      setModalLeft(null);
      const editCita: NuevaCitaFormState = {
        clienteId: citaCompleta.clienteId,
        cliente: citaCompleta.clienteNombre,
        telefono: citaCompleta.clienteTelefono || '',
        servicioId: citaCompleta.servicioId,
        servicioIds: (citaCompleta.servicioIds && citaCompleta.servicioIds.length > 0)
          ? citaCompleta.servicioIds
          : (citaCompleta.servicioId ? [citaCompleta.servicioId] : []),
        productoCantidades: ((citaCompleta.productoIds || []) as number[]).reduce((acc: Record<number, number>, id: number) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {} as Record<number, number>),
        paqueteId: citaCompleta.paqueteId,
        servicio: citaCompleta.servicioNombre || citaCompleta.paqueteNombre || '',
        barberoId: citaCompleta.barberoId,
        barbero: citaCompleta.barberoNombre,
        fecha: citaCompleta.fecha,
        hora: citaCompleta.hora,
        duracion: citaCompleta.duracion,
        precio: citaCompleta.precio,
        estado: citaCompleta.estado,
        notas: citaCompleta.notas,
      };
      beginCreateModalOpen(buildFormSnapshot(editCita, {
        tipoServicio: citaCompleta.paqueteId ? 'paquetes' : 'individuales',
        clienteSearchTerm: citaCompleta.clienteNombre || '',
        barberoFormSearchTerm: citaCompleta.barberoNombre || '',
        servicioSearchTerm: '',
        paqueteSearchTerm: '',
        productoSearchTerm: '',
      }));
      setIsSlotModalOpen(false);
    } catch (err) {
      console.error("Error al obtener la cita completa:", err);
      error("Error al cargar cita", "No se pudo traer toda la información desde el servidor para editar.");
    }
  };

  // Actualizar cita
  const handleUpdateCita = async () => {
    if (isSavingCitaRef.current) return;
    if (!nuevaCita.clienteId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.barberoId || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      setDismissedErrors(new Set());
      return;
    }
    setShowFormErrors(false);

    const errorDisponibilidad = validarDisponibilidadBarbero(nuevaCita.barberoId);
    if (errorDisponibilidad) {
      error("No disponible", errorDisponibilidad);
      return;
    }

    if (String(nuevaCita.estado).toLowerCase() === 'completada') {
      const now = new Date();
      const horaCompleta = nuevaCita.hora ?
        (String(nuevaCita.hora).includes(':') ? String(nuevaCita.hora) : `${nuevaCita.hora}:00`)
        : '00:00';
      const horaFormateada = horaCompleta.length === 4 && horaCompleta.indexOf(':') === 1 ? `0${horaCompleta}` : horaCompleta;
      const citaDate = new Date(`${nuevaCita.fecha}T${horaFormateada}:00`);
      if (citaDate > now) {
        error("Acción no permitida", "No se puede establecer una fecha futura a una cita completada.");
        return;
      }
    }

    isSavingCitaRef.current = true;
    setIsSavingCita(true);
    try {
      await agendamientoService.updateAgendamiento(selectedCita.id, {
        clienteId: nuevaCita.clienteId,
        barberoId: nuevaCita.barberoId,
        servicioId: nuevaCita.servicioId,
        servicioIds: nuevaCita.servicioIds,
        productoIds: flattenProductoCantidades(nuevaCita.productoCantidades),
        paqueteId: nuevaCita.paqueteId,
        fecha: nuevaCita.fecha,
        hora: nuevaCita.hora,
        duracion: nuevaCita.duracion,
        precio: nuevaCita.precio,
        estado: nuevaCita.estado,
        notas: nuevaCita.notas
      });

      // Refrescamos todos los datos para asegurar que los nombres y detalles sean correctos
      await fetchData();

      success("¡Cita actualizada exitosamente!", `Los cambios han sido guardados correctamente.`);
      setSelectedCita(null);
      handleCloseModal(true);
    } catch (err: any) {
      console.error("Error al actualizar:", err);
      const errorMsg = err?.message || err || "No se pudieron guardar los cambios en el servidor.";
      const displayMsg = errorMsg.toString().replace("Error 400: ", "").replace("Error 500: ", "");
      error("Error al actualizar", displayMsg);
    } finally {
      isSavingCitaRef.current = false;
      setIsSavingCita(false);
    }
  };

  // Eliminar cita
  const handleDeleteCita = (cita: any) => {
    console.log("Iniciando eliminación de cita:", cita);
    setCitaToDelete(cita);
    setIsSlotModalOpen(false); // Cerramos el modal de la franja para evitar conflictos de capas
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCita = async () => {
    console.log("LLAMANDO A confirmDeleteCita - Cita ID:", citaToDelete?.id);
    if (citaToDelete) {
      try {
        console.log("Ejecutando agendamientoService.deleteAgendamiento físico...");
        await agendamientoService.deleteAgendamiento(citaToDelete.id);
        console.log("Eliminación física exitosa en el servidor");

        // Refrescamos todos los datos desde el servidor para asegurar sincronización total
        await fetchData();

        setIsDeleteDialogOpen(false);
        setCitaToDelete(null);
        success("¡Cita eliminada!", `La cita ha sido eliminada permanentemente del sistema.`);
      } catch (err: any) {
        console.error("ERROR CRÍTICO AL ELIMINAR:", err);
        error("Error al eliminar", err.message || "No se pudo realizar la operación.");
      }
    } else {
      console.warn("No hay cita seleccionada para eliminar (citaToDelete es null)");
    }
  };

  // Cambiar estado de cita
  const handleChangeEstado = async (citaId: number, nuevoEstado: string) => {
    try {
      const estadoLower = String(nuevoEstado).toLowerCase();
      if (estadoLower === 'completada') {
        const citaActual = citas.find(c => c.id === citaId);
        if (citaActual) {
          const now = new Date();
          // Asegurar formato de hora válido, ej. '14:00'
          const horaCompleta = citaActual.hora ?
            (citaActual.hora.includes(':') ? citaActual.hora : `${citaActual.hora}:00`)
            : '00:00';
          const horaFormateada = horaCompleta.length === 4 && horaCompleta.indexOf(':') === 1 ? `0${horaCompleta}` : horaCompleta;
          const citaDate = new Date(`${citaActual.fecha}T${horaFormateada}:00`);
          if (citaDate > now) {
            error("Acción no permitida", "No se puede completar una cita futura.");
            return;
          }
        }
      }

      const result = await agendamientoService.updateAgendamientoStatus(citaId, nuevoEstado);
      setCitas(citas.map(cita =>
        cita.id === citaId ? { ...cita, estado: nuevoEstado } : cita
      ));
      // Notifica al bell para que elimine la notif al instante
      window.dispatchEvent(new CustomEvent("cita-estado-changed", { detail: { citaId, estado: nuevoEstado } }));
      if (estadoLower === 'cancelada') {
        const ventaInfoCancel = result && (result.venta || result.Venta || null);
        const ventaIdCancel = Number(result?.ventaId || result?.VentaId || ventaInfoCancel?.id || ventaInfoCancel?.Id || 0);
        const { [citaId]: _, ...rest } = ventasPorCita;
        setVentasPorCita(rest);
        if (ventaIdCancel > 0) {
          success("Cita cancelada", `La venta #${ventaIdCancel} asociada ha sido anulada.`);
        } else {
          success("Cita cancelada", "Estado actualizado correctamente.");
        }

        // --- NOTIFICACIÓN VÍA EMAILJS ---
        const citaActual = citas.find(c => c.id === citaId);
        if (citaActual && citaActual.clienteCorreo) {
          emailJsService.notificarCancelacion({
            cliente_nombre: citaActual.clienteNombre || "Cliente",
            cliente_email: citaActual.clienteCorreo,
            barbero_nombre: citaActual.barberoNombre || "Tu barbero",
            fecha_original: `${citaActual.fecha} ${citaActual.hora}`,
            motivo_cancelacion: "Cita cancelada por el administrador/barbero.",
            sugerencias_reprogramacion: []
          });
        }
        return;
      }
      if (estadoLower === 'completada') {
        const ventaInfo = result && (result.venta || result.Venta || null);
        const ventaIdRes = Number(result?.ventaId || result?.VentaId || ventaInfo?.id || ventaInfo?.Id || 0);
        const ventaRegistradaLocal = ventasPorCita[citaId];
        if (ventaRegistradaLocal && ventaRegistradaLocal > 0) {
          success("Cita completada", `Venta #${ventaRegistradaLocal} ya registrada para esta cita.`);
          return;
        }
        if (!ventaInfo && !(ventaIdRes > 0)) {
          const posibleVenta = await agendamientoService.getVentaPorAgendamiento(citaId);
          const ventaInfo2 = posibleVenta && (posibleVenta.venta || posibleVenta.Venta || null);
          const ventaId2 = Number(posibleVenta?.ventaId || posibleVenta?.VentaId || ventaInfo2?.id || ventaInfo2?.Id || 0);
          if (ventaInfo2 || ventaId2 > 0) {
            success("Cita completada", `Venta #${ventaInfo2?.id || ventaInfo2?.Id || ventaId2} confirmada.`);
            setVentasPorCita(prev => ({ ...prev, [citaId]: (ventaInfo2?.id || ventaInfo2?.Id || ventaId2) }));
            return;
          }
        }
        if (ventaInfo || ventaIdRes > 0) {
          success("Cita completada", `Venta #${ventaInfo?.id || ventaInfo?.Id || ventaIdRes} confirmada.`);
          const idConfirmado = Number(ventaInfo?.id || ventaInfo?.Id || ventaIdRes || 0);
          if (idConfirmado > 0) {
            setVentasPorCita(prev => ({ ...prev, [citaId]: idConfirmado }));
          }
        } else {
          try {
            await new Promise(resolve => setTimeout(resolve, 300));
            const verif = await agendamientoService.getVentaPorAgendamiento(citaId);
            const vi = verif && (verif.venta || verif.Venta || null);
            const vid = Number(verif?.ventaId || verif?.VentaId || vi?.id || vi?.Id || 0);
            if (vid > 0) {
              setVentasPorCita(prev => ({ ...prev, [citaId]: vid }));
              success("Cita completada", `Venta #${vid} confirmada.`);
            } else {
              success("Cita completada", "Estado actualizado. La venta se gestionará por el sistema.");
            }
          } catch {
            success("Cita completada", "Estado actualizado correctamente.");
          }
        }
      } else {
        success("Estado actualizado", "El estado de la cita ha sido modificado.");
      }
    } catch (err: any) {
      const msg = err?.message ? String(err.message).replace("Error 400: ", "").replace("Error 500: ", "") : "No se pudieron guardar los cambios.";
      error("Error al actualizar estado", msg);
    }
  };

  // Ver detalle de cita
  const handleViewDetail = (cita: any) => {
    setSelectedCita(cita);
    setServicioCarouselPage(0);
    setDetalleServiciosExpanded(false);
    setDetalleProductosExpanded(false);
    setActiveTab('detalle');
  };

  const POPOVER_WIDTH = 420;
  const openCitaPopover = useCallback((cita: any, slot: { dia: string; hora: number; fecha: string }, anchorRect: DOMRect) => {
    setSelectedCita(cita);
    setServicioCarouselPage(0);
    setDetalleServiciosExpanded(false);
    setDetalleProductosExpanded(false);
    setSelectedSlot(slot);
    setActiveTab('detalle');

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceRight = vw - anchorRect.right - 12;
    const spaceLeft = anchorRect.left - 12;

    let left: number;
    let side: 'left' | 'right' = 'right';
    if (spaceRight >= POPOVER_WIDTH) {
      left = anchorRect.right + 12;
      side = 'right';
    } else if (spaceLeft >= POPOVER_WIDTH) {
      left = anchorRect.left - POPOVER_WIDTH - 12;
      side = 'left';
    } else {
      left = Math.max(8, (vw - POPOVER_WIDTH) / 2);
      side = 'right';
    }

    const MAX_H = 620;
    let top = anchorRect.top;
    if (top + MAX_H > vh - 8) top = Math.max(8, vh - MAX_H - 8);
    top = Math.max(8, top);

    setPopoverPosition({ top, left });
    setPopoverSide(side);
    setPopoverPhase('enter');     // estado inicial: opacidad 0 + desplazado
    setIsSlotModalOpen(true);
  }, []);

  // Cuando el popover monta en fase 'enter', avanzar a 'open' en el siguiente frame
  // para que el navegador pinte primero el estado inicial y luego dispare la transición.
  useEffect(() => {
    if (!isSlotModalOpen || popoverPhase !== 'enter') return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPopoverPhase('open'));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [isSlotModalOpen, popoverPhase]);

  // Cierra el popover con fade-out: cambia a fase 'exit' y desmonta tras la animación.
  const closePopover = useCallback(() => {
    setPopoverPhase('exit');
    window.setTimeout(() => {
      setIsSlotModalOpen(false);
      setPopoverPosition(null);
      setSelectedCita(null);
    }, POPOVER_ANIM_MS);
  }, []);

  /** Oculta el popover sin limpiar selectedCita — usar cuando otro modal necesita selectedCita. */
  const hidePopoverKeepCita = useCallback(() => {
    setPopoverPhase('exit');
    setIsSlotModalOpen(false);
    setPopoverPosition(null);
  }, []);

  // Mantener refs sincronizados con estado para usarlos en handlers y timeouts
  useEffect(() => { isSlotModalOpenRef.current = isSlotModalOpen; }, [isSlotModalOpen]);
  useEffect(() => { showModalParcialRef.current = showModalParcial; }, [showModalParcial]);
  useEffect(() => { (confirmAccionRef as any).current = confirmAccion; }, [confirmAccion]);

  // Cerrar popover al hacer click fuera o presionar Escape.
  // Aplica defensa en capas para garantizar que ningún bloque del calendario
  // quede por encima del popover, sin importar el stacking context del layout.
  useEffect(() => {
    if (!isSlotModalOpen) return;

    // Capa 1 — Manipulación directa con inline !important.
    // Es la prioridad MÁS ALTA en la cascada CSS (supera a cualquier stylesheet,
    // incluso uno inyectado con !important). Elimina:
    //   - clipPath inline (causa principal de stacking context propio)
    //   - z-index (deja al elemento sin stacking context propio para que herede
    //     el contexto del root, donde nuestro popover en z-[9999] siempre gana).
    const blocks = document.querySelectorAll<HTMLElement>('.cita-calendar-block');
    blocks.forEach((el) => {
      el.style.setProperty('z-index', '0', 'important');
      el.style.setProperty('clip-path', 'none', 'important');
      el.style.setProperty('-webkit-clip-path', 'none', 'important');
      el.style.setProperty('isolation', 'auto', 'important');
      el.style.setProperty('transform', 'none', 'important');
      el.style.setProperty('filter', 'none', 'important');
      el.style.setProperty('will-change', 'auto', 'important');
    });

    // Capa 2 — Stylesheet inyectado con !important (respaldo para bloques que
    // se monten DESPUÉS de abrir el popover, p.ej. al cambiar de semana).
    const styleTag = document.createElement('style');
    styleTag.id = '__cita-popover-z-suppress';
    styleTag.textContent = `
      .cita-calendar-block {
        z-index: 0 !important;
        clip-path: none !important;
        -webkit-clip-path: none !important;
        isolation: auto !important;
        transform: none !important;
        filter: none !important;
      }
    `;
    document.head.appendChild(styleTag);

    const onMouseDown = (e: MouseEvent) => {
      if (showModalParcialRef.current) return;
      if ((confirmAccionRef as any).current) return;
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        closePopover();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePopover();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      // Restaurar inline styles
      blocks.forEach((el) => {
        el.style.removeProperty('z-index');
        el.style.removeProperty('clip-path');
        el.style.removeProperty('-webkit-clip-path');
        el.style.removeProperty('isolation');
        el.style.removeProperty('transform');
        el.style.removeProperty('filter');
        el.style.removeProperty('will-change');
      });
      document.getElementById('__cita-popover-z-suppress')?.remove();
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isSlotModalOpen]);

  // Stats para el dashboard (ajustadas para ignorar canceladas según solicitud)
  const isCitaActiva = (estado: string) => {
    const st = String(estado || "").toLowerCase();
    return st !== "cancelada" && st !== "cancelado" && st !== "anulada";
  };

  const citasFiltradas = citas.filter(c => isCitaActiva(c.estado));
  const totalCitas = citasFiltradas.length;
  const citasActivas = totalCitas; // Ya filtradas arriba
  const todayYMD = new Date().getFullYear() + "-" + 
                   String(new Date().getMonth() + 1).padStart(2, '0') + "-" + 
                   String(new Date().getDate()).padStart(2, '0');
  const citasHoy = citasFiltradas.filter(c => c.fecha === todayYMD).length;

  // Manejo de descuentos por día (apertura directa del modal)
  const handleDateSelect = (fechaCompleta: string) => {
    setSelectedDates(new Set([fechaCompleta]));
    const currentDiscount = dayDiscounts[fechaCompleta];
    setPendingDiscountValue(currentDiscount ? String(currentDiscount) : "");
    setActiveModalDiscountTab('descuento');
    setIsDiscountDialogOpen(true);
  };

  const handleSaveDiscount = () => {
    const val = Number(pendingDiscountValue);
    if (isNaN(val) || val < 0 || val > 100) {
      error("Descuento inválido", "El descuento debe ser un número entre 0 y 100.");
      return;
    }
    const nextDiscounts = { ...dayDiscounts };
    Array.from(selectedDates).forEach(date => {
      if (val === 0) {
        delete nextDiscounts[date];
      } else {
        nextDiscounts[date] = val;
      }
    });
    setDayDiscounts(nextDiscounts);
    setIsDiscountDialogOpen(false);
    setSelectedDates(new Set());
    success("Descuento aplicado", `Se configuró un ${val}% de descuento para los días seleccionados.`);
  };

  const handleClearDiscounts = () => {
    const nextDiscounts = { ...dayDiscounts };
    Array.from(selectedDates).forEach(date => {
      delete nextDiscounts[date];
    });
    setDayDiscounts(nextDiscounts);
    setSelectedDates(new Set());
    success("Descuento removido", "Se eliminaron los descuentos de los días seleccionados.");
  };

  const handleOpenEditHorario = (barbero: any, horario: any) => {
    setSelectedBarberoForEdit({ barbero, horario });
    setEditHorarioStart(horario.horaInicio || "");
    setEditHorarioEnd(horario.horaFin || "");
    setIsEditHorarioModalOpen(true);
  };

  const handleSaveEditHorario = async () => {
    if (!selectedBarberoForEdit || !editHorarioStart || !editHorarioEnd) {
      error("Datos incompletos", "Por favor ingrese la hora de inicio y fin.");
      return;
    }
    setIsSavingHorario(true);
    const { barbero, horario } = selectedBarberoForEdit;
    const fechaSeleccionada = Array.from(selectedDates)[0] || "";

    try {
      // 1. Actualizar el horario en la API
      await horariosService.updateHorario(horario.id, {
        ...horario,
        horaInicio: editHorarioStart,
        horaFin: editHorarioEnd,
      });

      // 2. Detectar citas afectadas: misma fecha, mismo barbero, cuya hora quede fuera del nuevo horario
      const [newStartH, newStartM] = editHorarioStart.split(':').map(Number);
      const [newEndH, newEndM] = editHorarioEnd.split(':').map(Number);
      const newStartMin = (newStartH || 0) * 60 + (newStartM || 0);
      const newEndMin = (newEndH || 0) * 60 + (newEndM || 0);

      const citasAfectadas = citas.filter(c => {
        if (c.fecha !== fechaSeleccionada) return false;
        if (Number(c.barberoId) !== Number(barbero.id)) return false;
        const estado = String(c.estado || '').toLowerCase();
        if (estado === 'cancelada' || estado === 'completada') return false;
        const [ch, cm] = String(c.hora || '').split(':').map(Number);
        const citaMinutos = (ch || 0) * 60 + (cm || 0);
        // La cita queda "afectada" si su hora de inicio cae fuera del nuevo rango
        return citaMinutos < newStartMin || citaMinutos >= newEndMin;
      });

      // 3. Cancelar citas afectadas y enviar correo
      let emailsEnviados = 0;
      for (const cita of citasAfectadas) {
        try {
          // Cancelar la cita usando el endpoint dedicado de estado (más confiable)
          await agendamientoService.updateAgendamientoStatus(cita.id, 'Cancelada');
          console.log(`✅ Cita ${cita.id} cancelada exitosamente`);
        } catch (cancelErr) {
          console.warn('No se pudo cancelar la cita', cita.id, cancelErr);
        }

        // Enviar correo al cliente notificando la cancelación
        try {
          const clienteData = await clientesService.getClienteById(Number(cita.clienteId));
          const emailCliente = clienteData?.correo || '';
          if (emailCliente) {
            await emailJsService.notificarCancelacion({
              cliente_nombre: cita.clienteNombre || 'Cliente',
              cliente_email: emailCliente,
              barbero_nombre: barbero.nombre || 'Barbero',
              fecha_original: `${fechaSeleccionada}T${cita.hora}:00`,
              motivo_cancelacion: `Su cita fue cancelada debido a un cambio de horario de su barbero. El nuevo horario es: ${formatHoraStr12(editHorarioStart)} – ${formatHoraStr12(editHorarioEnd)}. Por favor, comuníquese con nosotros para reprogramarla.`,
            });
            emailsEnviados++;
          }
        } catch (emailErr) {
          console.warn('No se pudo enviar email para cita', cita.id, emailErr);
        }
      }

      // 4. Recargar horarios
      await fetchData();
      setIsEditHorarioModalOpen(false);

      const msg = citasAfectadas.length > 0
        ? ` Se notificó por correo a ${emailsEnviados} cliente(s) afectado(s).`
        : ' No hay citas afectadas por este cambio.';
      success("Horario actualizado", `El horario de ${barbero.nombre} fue modificado exitosamente.${msg}`);
    } catch (err: any) {
      error("Error al actualizar", err?.message || "No se pudo actualizar el horario.");
    } finally {
      setIsSavingHorario(false);
    }
  };

  return (
    <>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MODAL_FORMULARIO — createPortal (Nueva / Editar Cita) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && modalPosition && createPortal(
        <>
          {/* Backdrop semi-transparente — pointer-events-none para no bloquear scroll */}
          <div
            className="fixed inset-0 bg-black/40 pointer-events-none"
            style={{ zIndex: 9998 }}
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
            {/* Header con drag handle */}
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

                  // "virtual" = how far above minimum state we are
                  // [0 .. MODAL_HEIGHT-MIN] = height range (docked)
                  // [MODAL_HEIGHT-MIN .. MAX] = move-up range (full height)
                  const moveUpMax = MODAL_DOCKED_TOP - 16;
                  const startMoveUp = Math.max(0, MODAL_DOCKED_TOP - startTop);
                  const startVirtual = (startHeight - MODAL_MIN_HEIGHT) + startMoveUp;
                  const newVirtual = Math.max(0, Math.min((MODAL_HEIGHT - MODAL_MIN_HEIGHT) + moveUpMax, startVirtual - deltaY));

                  const heightRange = MODAL_HEIGHT - MODAL_MIN_HEIGHT;
                  if (newVirtual <= heightRange) {
                    // Phase 1: height adjustment, docked
                    const nextH = MODAL_MIN_HEIGHT + newVirtual;
                    setModalHeight(nextH);
                    setModalTop(window.innerHeight - 16 - nextH);
                  } else {
                    // Phase 2: move modal up at full height
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
                  {selectedCita ? 'Editar Cita' : 'Nueva Cita'}
                </h2>
                <button
                  type="button"
                  onClick={() => handleCloseModal()}
                  className="p-2.5 rounded-full text-gray-lighter hover:text-white-primary hover:bg-gray-dark/80 bg-gray-dark/40 transition-all cursor-pointer flex items-center justify-center"
                  style={{ cursor: 'default' }}
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cliente fijo — fuera del scroll */}
            <div className="shrink-0 pr-6">
              <div
                className="flex items-center gap-0 py-1 px-2.5 px-2"
                style={showFormErrors && !nuevaCita.clienteId && !dismissedErrors.has('cliente') ? { marginBottom: '1.25rem' } : {}}
              >
                <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-lighter" />
                </div>
                <div className="flex-1 min-w-0">
                  {nuevaCita.clienteId > 0 ? (
                    <div className="flex items-center justify-between py-1.5 px-3 bg-gray-dark/20 rounded-lg group animate-in fade-in slide-in-from-left-2 duration-200">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const c = clientesList.find(cli => Number(cli.id) === Number(nuevaCita.clienteId));
                          return c?.fotoPerfil ? (
                            <img src={c.fotoPerfil} alt={c.nombre} className="w-8 h-8 rounded-full object-cover border-2 border-orange-primary/60 shadow-sm" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center border-2 border-orange-primary/60 shadow-sm">
                              <User className="w-4 h-4 text-gray-lighter" />
                            </div>
                          );
                        })()}
                        <p className="text-sm font-medium text-gray-lightest leading-tight">
                          {(() => {
                            const c = clientesList.find(cli => Number(cli.id) === Number(nuevaCita.clienteId));
                            if (!c) return nuevaCita.cliente;
                            return `${c.nombre || ''} ${c.apellido || ''}`.trim() || nuevaCita.cliente;
                          })()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setNuevaCita(prev => ({ ...prev, clienteId: 0, cliente: '', telefono: '' })); setClienteSearchTerm(''); }}
                        className="p-1 rounded-full text-gray-lighter hover:bg-gray-dark hover:text-white-primary opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Cambiar cliente"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <SearchField<any>
                      label="Buscar cliente"
                      placeholder="Nombre del cliente..."
                      value={clienteSearchTerm}
                      onChange={setClienteSearchTerm}
                      ghostMode={true}
                      items={clientesList}
                      filterFn={(c, term) => {
                        const t = term.toLowerCase();
                        const full = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
                        return full.includes(t) ||
                          (c.nombre || '').toLowerCase().includes(t) ||
                          (c.apellido || '').toLowerCase().includes(t) ||
                          (c.telefono || '').includes(term);
                      }}
                      onSelect={(c) => {
                        const fullName = `${c.nombre || ''} ${c.apellido || ''}`.trim();
                        setNuevaCita(prev => ({ ...prev, clienteId: c.id, cliente: fullName, telefono: c.telefono || '' }));
                        setClienteSearchTerm(fullName);
                      }}
                      onClear={() => { setNuevaCita(prev => ({ ...prev, clienteId: 0, cliente: '', telefono: '' })); setClienteSearchTerm(''); }}
                      renderItem={(c) => (
                        <div className="flex items-center gap-3 w-full">
                          {c.fotoPerfil ? (
                            <img src={c.fotoPerfil} alt={c.nombre} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-lighter" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-lightest">{c.nombre} {c.apellido}</p>
                            <p className="text-xs text-gray-lighter">{c.telefono}</p>
                          </div>
                        </div>
                      )}
                      error={showFormErrors && !nuevaCita.clienteId && !dismissedErrors.has('cliente') ? 'Selecciona un cliente' : undefined}
                      onFocus={() => setDismissedErrors(prev => new Set(prev).add('cliente'))}
                    />
                  )}
                </div>
              </div>
              <div className="border-t border-gray-dark/60 mx-4" />
            </div>

            {/* Contenido scrollable — filas del formulario (tareas 2.2–2.8) */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-6">

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
                  {/* ── Fila de chips (siempre visible una vez hay datos, o ghost si no) ── */}
                  {nuevaCita.fecha || nuevaCita.hora ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Chip fecha */}
                      <button
                        type="button"
                        onClick={() => { setEditingFecha(prev => !prev); setEditingHora(false); setDismissedErrors(prev => new Set(prev).add('fechaHora')); }}
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
                        onClick={() => { setEditingHora(prev => !prev); setEditingFecha(false); setDismissedErrors(prev => new Set(prev).add('fechaHora')); }}
                        className={`px-3 py-1.5 rounded-lg text-base transition-colors duration-150 ${
                          editingHora
                            ? 'bg-orange-primary text-white-primary'
                            : 'bg-gray-dark/70 hover:bg-gray-dark text-gray-lightest hover:text-white-primary'
                        }`}
                      >
                        {nuevaCita.hora ? formatHoraStr12(nuevaCita.hora) : 'Hora inicio'}
                      </button>
                      {/* Separador y hora fin — solo si hay servicio o paquete */}
                      {(nuevaCita.servicioIds.length > 0 || !!nuevaCita.paqueteId) && (
                        <>
                          <span className="text-gray-lighter text-sm select-none">–</span>
                          <div
                            className="px-3 py-1.5 rounded-lg bg-gray-dark/40 text-base text-gray-lighter transition-colors duration-150 cursor-default"
                          >
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
                      onClick={() => { setEditingFecha(true); setDismissedErrors(prev => new Set(prev).add('fechaHora')); }}
                      className="w-full text-left py-1.5 px-3 text-gray-lighter hover:text-gray-lightest hover:bg-gray-dark rounded-md transition-colors duration-150 text-base cursor-pointer"
                    >
                      Selecciona fecha y hora
                    </button>
                  )}

                  {showFormErrors && (!nuevaCita.fecha || !nuevaCita.hora) && !dismissedErrors.has('fechaHora') && (
                    <p className="text-sm text-red-400 mt-1 px-3">Selecciona fecha y hora</p>
                  )}

                  {/* ── Selector de Fecha (Calendario Flotante tipo Google) ── */}
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
                           // Desactivar fechas pasadas
                           const today = new Date();
                           today.setHours(0, 0, 0, 0);
                           if (date < today) return true;

                           // Desactivar si el barbero no trabaja ese día
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

                  {/* ── Dropdown de horas (Flotante) ── */}
                  {editingHora && (
                    <div 
                      ref={hourPickerRef}
                      className="absolute left-0 mt-1 w-48 bg-gray-darkest border border-gray-dark rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] overflow-hidden animate-in fade-in zoom-in duration-200"
                      style={{ 
                        zIndex: 100,
                        top: '100%' 
                      }}
                    >
                      {!nuevaCita.fecha || !nuevaCita.barberoId ? (
                        <p className="text-xs text-gray-lighter px-4 py-3">
                          {!nuevaCita.barberoId ? 'Selecciona un barbero primero' : 'Selecciona una fecha primero'}
                        </p>
                      ) : (() => {
                        const horasDisp = getHorasDisponiblesParaDia(nuevaCita.fecha, nuevaCita.barberoId, nuevaCita.duracion);
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
              <div
                className="flex items-start gap-0 py-1.5 px-2"
                style={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId && !dismissedErrors.has('servicio') ? { marginBottom: '1.25rem' } : {}}
              >
                <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3, paddingTop: '0.5rem' }} className="flex items-center justify-center">
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
                      {/* Servicios seleccionados: carrusel horizontal (mismo diseño que paquete) */}
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
                                      <div
                                        className="rounded-lg overflow-hidden shrink-0"
                                        style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, maxWidth: 48, maxHeight: 48 }}
                                      >
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
                          {/* Card paquete seleccionado — estilo cliente */}
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
                          {/* Servicios del paquete — read-only carousel */}
                          {(() => {
                            const paq = paquetesList.find(p => p.id === nuevaCita.paqueteId);
                            if (!paq || !paq.servicios?.length) return null;
                            const srvs: any[] = (paq.servicios as string[])
                              .map((nombre) => serviciosList.find((s: any) => s.nombre === nombre))
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
                                        <div
                                          className="rounded-lg overflow-hidden shrink-0"
                                          style={{ width: 48, height: 48, minWidth: 48, minHeight: 48, maxWidth: 48, maxHeight: 48 }}
                                        >
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

              {/* ── Fila: Barbero ── */}
              <div
                className="flex items-center gap-0 py-1 px-2.5 px-2"
                style={(showFormErrors && !nuevaCita.barberoId && !dismissedErrors.has('barbero')) || (nuevaCita.fecha && barberosParaFormulario.length === 0) ? { marginBottom: '1.25rem' } : {}}
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
                          {b.telefono && (
                            <p className="text-xs text-gray-lighter leading-tight truncate">{b.telefono}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNuevaCita(prev => ({ ...prev, barberoId: 0, barbero: '' }));
                            setBarberoFormSearchTerm('');
                            setBarberoHorarioWarning(null);
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
                      placeholder={
                        !nuevaCita.fecha
                          ? 'Selecciona fecha y hora primero'
                          : barberosParaFormulario.length === 0
                            ? 'Ningún barbero disponible en este horario'
                            : 'Nombre del barbero...'
                      }
                      value={barberoFormSearchTerm}
                      onChange={setBarberoFormSearchTerm}
                      ghostMode={true}
                      items={nuevaCita.fecha ? barberosParaFormulario : []}
                      filterFn={(b, term) => {
                        const t = term.toLowerCase();
                        const full = `${b.nombre || ''} ${b.apellido || ''}`.trim().toLowerCase();
                        return full.includes(t) ||
                          (b.nombre || '').toLowerCase().includes(t) ||
                          (b.apellido || '').toLowerCase().includes(t);
                      }}
                      onSelect={(b) => {
                        const nombreCompleto = `${b.nombre} ${b.apellido || ''}`.trim();
                        setNuevaCita(prev => ({ ...prev, barberoId: b.id, barbero: nombreCompleto }));
                        setBarberoFormSearchTerm(nombreCompleto);
                      }}
                      onClear={() => {
                        setNuevaCita(prev => ({ ...prev, barberoId: 0, barbero: '' }));
                        setBarberoFormSearchTerm('');
                        setBarberoHorarioWarning(null);
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
                      error={
                        showFormErrors && !nuevaCita.barberoId && !dismissedErrors.has('barbero')
                          ? 'Selecciona un barbero'
                          : nuevaCita.fecha && barberosParaFormulario.length === 0
                            ? 'No hay barberos con horario para esta fecha y hora'
                            : undefined
                      }
                      onFocus={() => setDismissedErrors(prev => new Set(prev).add('barbero'))}
                    />
                  )}
                </div>
              </div>

              {barberoHorarioWarning && (
                <div className="flex items-center gap-0 py-1 px-2.5">
                  <div style={{ width: 44, minWidth: 44, flexShrink: 0, marginLeft: 3 }} className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-orange-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0 ml-2 mr-4 px-3 py-1.5 rounded-lg bg-orange-primary/10 border border-orange-primary/30">
                    <p className="text-sm text-orange-primary leading-relaxed">{barberoHorarioWarning}</p>
                  </div>
                </div>
              )}

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
                              <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precio)}</span>
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
                                  <div key={pId} className="relative flex-1 min-w-0 group bg-gray-darker/40 rounded-lg px-3 py-2 border border-transparent hover:border-gray-dark transition-all">
                                    {/* X arriba a la derecha */}
                                    <button
                                      type="button"
                                      onClick={() => { quitarProducto(pId); if (safeProdPage > 0 && pageProdEntries.length === 1) setFormProductoPage(p => p - 1); }}
                                      className="absolute top-1 right-1 text-gray-dark hover:text-red-400 opacity-60 hover:opacity-100 transition-all cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                                        <ImageRenderer url={prod.imagenProduc || ""} alt={prod.nombre} className="w-full h-full border-0 bg-transparent" />
                                      </div>
                                      <div className="flex-1 min-w-0 pr-3">
                                        <p className="text-sm text-gray-lightest font-medium truncate leading-tight">{prod.nombre}</p>
                                        <p className="text-gray-lighter leading-tight truncate" style={{ fontSize: '9px' }}>{formatearPrecio(prod.precio)}</p>
                                        {(() => {
                                          const stockMax = prod.stock ?? prod.cantidad ?? 0;
                                          const atLimit = stockMax > 0 && (cantidad as number) >= stockMax;
                                          return (
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  onClick={() => removeProducto(pId)}
                                                  className="text-gray-lighter hover:text-white-primary transition-colors cursor-pointer"
                                                >
                                                  <Minus className="w-2.5 h-2.5" />
                                                </button>
                                                <input
                                                  type="number"
                                                  min={1}
                                                  max={stockMax > 0 ? stockMax : undefined}
                                                  value={cantidad as number}
                                                  onChange={(e) => {
                                                    const raw = parseInt(e.target.value, 10);
                                                    if (isNaN(raw) || raw < 1) return;
                                                    const clamped = stockMax > 0 ? Math.min(raw, stockMax) : raw;
                                                    const next = { ...nuevaCita.productoCantidades, [pId]: clamped };
                                                    recalcularPrecioConProductos(next);
                                                  }}
                                                  className={`no-spin w-8 text-center tabular-nums bg-transparent border-none outline-none focus:outline-none ${atLimit ? 'text-red-400' : 'text-gray-lightest'}`}
                                                  style={{ fontSize: '9px', MozAppearance: 'textfield', WebkitAppearance: 'none' }}
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => { if (!atLimit) addProducto(pId); }}
                                                  disabled={atLimit}
                                                  className={`transition-colors ${atLimit ? 'text-gray-dark cursor-not-allowed opacity-40' : 'text-gray-lighter hover:text-white-primary cursor-pointer'}`}
                                                >
                                                  <Plus className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                              {atLimit && (
                                                <p className="text-red-400 leading-tight" style={{ fontSize: '8px' }}>
                                                  Has llegado al límite
                                                </p>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>
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
                    className="w-full bg-transparent text-base text-gray-lightest placeholder-gray-lighter resize-none focus:outline-none focus:ring-0 focus:shadow-none overflow-hidden px-3"
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
            <div className="bg-gray-darker/50 px-4 py-3 shrink-0">
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
                  onClick={selectedCita ? handleUpdateCita : handleCreateCita}
                  disabled={isSavingCita}
                  className="relative px-4 py-2 text-sm font-semibold bg-orange-primary text-black-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <span className={isSavingCita ? 'opacity-0' : ''}>
                    {selectedCita ? 'Actualizar Cita' : 'Guardar'}
                  </span>
                  {isSavingCita && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="#212020" strokeWidth="4" />
                        <path fill="#555555" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* VISTA DE CALENDARIO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div className="p-2">

          {/* Stats Cards */}
          <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="elegante-card text-center">
              <Calendar className="w-8 h-8 text-orange-primary mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-gray-lightest mb-1">{totalCitas}</h4>
              <p className="text-gray-lightest text-sm">Total Citas</p>
            </div>
            <div className="elegante-card text-center">
              <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-gray-lightest mb-1">{citasActivas}</h4>
              <p className="text-gray-lightest text-sm">Citas Activas</p>
            </div>
            <div className="elegante-card text-center">
              <User className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-gray-lightest mb-1">{citasHoy}</h4>
              <p className="text-gray-lightest text-sm">Citas Hoy</p>
            </div>
          </div>

          {/* Navegación de Semana */}
          <div className="std-card mb-4 !pt-3">

            {/* Fila única: título | spacer | buscador | nav semana | acciones */}
            <div className="flex items-center gap-3">

              {/* Título — extremo izquierdo */}
              <h4 className="text-xl font-bold text-gray-lightest tracking-wide shrink-0 ml-11" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>Citas de la semana</h4>

              {/* Buscador fantasma — ocupa todo el espacio disponible, abre lista de resultados */}
              <div ref={searchContainerRef} className="flex-1 min-w-0 relative flex items-center">
                {/* Input — siempre ocupa el espacio completo, visibilidad por opacidad */}
                <div className={`relative w-full transition-opacity duration-200 ease-out ${
                  busquedaExpanded || carouselBusqueda ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}>
                  <input
                    ref={busquedaRef}
                    type="text"
                    placeholder="Buscar cita..."
                    value={carouselBusqueda}
                    onChange={e => {
                      setCarouselBusqueda(e.target.value);
                      setShowSearchResults(true);
                    }}
                    onFocus={() => { if (carouselBusqueda) setShowSearchResults(true); }}
                    onBlur={() => {
                      searchBlurTimer.current = setTimeout(() => {
                        setShowSearchResults(false);
                        if (!carouselBusqueda) setBusquedaExpanded(false);
                      }, 150);
                    }}
                    className="elegante-input input-no-ring text-sm py-2 pl-4 w-full"
                  />
                  {carouselBusqueda && (
                    <button
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        setCarouselBusqueda('');
                        setShowSearchResults(false);
                        busquedaRef.current?.focus();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 btn-ghost-icon-sm text-gray-lighter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {/* Lupa — superpuesta en el mismo espacio, desaparece cuando el input está activo */}
                <button
                  type="button"
                  onClick={() => { setBusquedaExpanded(true); requestAnimationFrame(() => busquedaRef.current?.focus()); }}
                  className={`absolute right-0 btn-ghost-icon transition-opacity duration-200 ease-out ${
                    busquedaExpanded || carouselBusqueda ? 'opacity-0 pointer-events-none' : 'opacity-100'
                  }`}
                >
                  {/* Lupa con mango largo */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                    <circle cx="9" cy="9" r="6" />
                    <line x1="13.5" y1="13.5" x2="22" y2="22" />
                  </svg>
                </button>

                {/* Portal: dropdown fuera del árbol DOM del std-card para escapar overflow:clip */}
                {carouselBusqueda.trim() && showSearchResults && searchContainerRef.current && createPortal(
                  (() => {
                    const rect = searchContainerRef.current!.getBoundingClientRect();
                    const normQ = (s: string) =>
                      String(s || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
                    const q = normQ(carouselBusqueda.trim());
                    const results = citas.filter((cita: any) => {
                      const diaNombre = cita.fecha ? diaSemanaDesdeFecha(normalizarFechaCita(cita.fecha)) : '';
                      return (
                        normQ(cita.clienteNombre).includes(q) ||
                        normQ(cita.barberoNombre).includes(q) ||
                        normQ(cita.servicioNombre).includes(q) ||
                        normQ(cita.paqueteNombre).includes(q) ||
                        normQ(diaNombre).includes(q)
                      );
                    }).slice(0, 15);

                    const availableBelow = window.innerHeight - rect.bottom - 12;

                    return (
                      <div
                        style={{
                          position: 'fixed',
                          top: rect.bottom + 6,
                          left: rect.left,
                          width: Math.max(rect.width, 380),
                          maxHeight: Math.min(availableBelow, 300),
                          zIndex: 9999,
                        }}
                        className="bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl overflow-y-auto custom-scrollbar"
                      >
                        {results.length === 0 ? (
                          <div className="p-4 text-center text-sm text-gray-dark italic">Sin resultados</div>
                        ) : results.map((cita: any) => {
                          const diaNombre = cita.fecha ? diaSemanaDesdeFecha(normalizarFechaCita(cita.fecha)) : '';
                          const fechaDisplay = cita.fecha
                            ? normalizarFechaCita(cita.fecha).split('-').reverse().join('/')
                            : '';
                          const estado = String(cita.estado || '');
                          const estadoColor =
                            estado === 'Completada' ? 'text-[#7aab8a]'
                            : estado === 'Cancelada' || estado === 'Anulada' ? 'text-[#b07070]'
                            : 'text-orange-primary';

                          return (
                            <div
                              key={cita.id}
                              onMouseDown={e => {
                                e.preventDefault();
                                if (searchBlurTimer.current) clearTimeout(searchBlurTimer.current);
                              }}
                              onClick={(e) => {
                                const today = new Date();
                                const todayDay = today.getDay();
                                const thisMonday = new Date(today);
                                thisMonday.setDate(today.getDate() + (todayDay === 0 ? -6 : 1 - todayDay));
                                thisMonday.setHours(0, 0, 0, 0);
                                const citaDateObj = new Date(`${cita.fecha}T12:00:00`);
                                const citaDay = citaDateObj.getDay();
                                const citaMonday = new Date(citaDateObj);
                                citaMonday.setDate(citaDateObj.getDate() + (citaDay === 0 ? -6 : 1 - citaDay));
                                citaMonday.setHours(0, 0, 0, 0);
                                const weekOffset = Math.round(
                                  (citaMonday.getTime() - thisMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
                                );
                                setCurrentWeek(weekOffset);
                                const [hStr, mStr] = (cita.hora || '09:00').split(':');
                                const horaNum = parseInt(hStr) + parseInt(mStr || '0') / 60;
                                const diaStr = diasSemana[(citaDateObj.getDay() + 6) % 7];
                                openCitaPopover(
                                  cita,
                                  { dia: diaStr, hora: horaNum, fecha: cita.fecha },
                                  e.currentTarget.getBoundingClientRect()
                                );
                                setCarouselBusqueda('');
                                setBusquedaExpanded(false);
                                setShowSearchResults(false);
                              }}
                              className="px-4 py-3 border-b border-gray-dark last:border-none hover:bg-gray-dark transition-colors cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-gray-lightest truncate">
                                  {formatNombre(cita.clienteNombre)}
                                </span>
                                <span className={`text-xs font-medium shrink-0 ${estadoColor}`}>{estado}</span>
                              </div>
                              <p className="text-xs text-gray-lighter truncate mt-0.5">
                                {formatNombre(cita.servicioNombre || cita.paqueteNombre || '—')}
                              </p>
                              <p className="text-[11px] text-gray-light mt-0.5">
                                {formatNombre(cita.barberoNombre)} · {diaNombre} {fechaDisplay} · {formatHoraStr12(cita.hora)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })(),
                  document.body
                )}
              </div>

              {/* Navegación de semana */}
              <div className="flex items-center shrink-0">
                <button
                  onClick={() => { setCurrentWeek(currentWeek - 1); setCarouselPage(0); setCarouselBusqueda(''); setBusquedaExpanded(false); setShowSearchResults(false); }}
                  className="btn-ghost-icon"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="text-center px-4">
                  <h3 className="text-base font-semibold text-gray-lightest leading-tight">
                    {currentWeek === 0 ? 'Esta Semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
                  </h3>
                  <p className="text-xs text-gray-light">
                    {getCurrentWeekDays()[0].fecha} - {getCurrentWeekDays()[6].fecha}
                  </p>
                </div>
                <button
                  onClick={() => { setCurrentWeek(currentWeek + 1); setCarouselPage(0); setCarouselBusqueda(''); setBusquedaExpanded(false); setShowSearchResults(false); }}
                  className="btn-ghost-icon"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { setCurrentWeek(0); setCarouselPage(0); setCarouselBusqueda(''); setBusquedaExpanded(false); setShowSearchResults(false); }}
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
              // Construir el conjunto exacto de fechas YYYY-MM-DD de la semana visible.
              const mondayRef = getMondayOfWeek(currentWeek);
              const weekDateSet = new Set(
                Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(mondayRef);
                  d.setDate(mondayRef.getDate() + i);
                  return toLocalDateString(d);
                })
              );

              // Solo citas cuya fecha normalizada cae dentro de la semana visible.
              // La guardia length===10 descarta fechas vacías o con formato inesperado.
              const semanaCitas = citas.filter((cita: any) => {
                const f = normalizarFechaCita(cita.fecha);
                return f.length === 10 && weekDateSet.has(f);
              });

              // Filtrar por estado — el buscador es independiente y no afecta este carrusel.
              const citasSemana = semanaCitas.filter((cita: any) => {
                if (carouselEstadoFiltro === 'Todas') return true;
                const estadoNorm = String(cita.estado || '').toLowerCase();
                if (carouselEstadoFiltro === 'Cancelada') return estadoNorm === 'cancelada' || estadoNorm === 'anulada';
                return String(cita.estado || '') === carouselEstadoFiltro;
              }).sort((a: any, b: any) => {
                if (a.fecha < b.fecha) return -1;
                if (a.fecha > b.fecha) return 1;
                return (a.hora || '').localeCompare(b.hora || '');
              });

              const totalPages = Math.max(1, Math.ceil(citasSemana.length / CAROUSEL_PAGE_SIZE));
              const safePage = Math.min(carouselPage, Math.max(0, totalPages - 1));
              const canGoPrev = citasSemana.length > 0 && safePage > 0;
              const canGoNext = citasSemana.length > 0 && safePage < totalPages - 1;
              const pageCitas = citasSemana.slice(
                safePage * CAROUSEL_PAGE_SIZE,
                (safePage + 1) * CAROUSEL_PAGE_SIZE
              );

              return (
                <div className="pt-4 pb-4 flex items-center gap-6">
                  {/* Contenedor de navegación del carrusel — alineado con el título de arriba */}
                  <div className="flex items-center gap-2 flex-1">
                    {/* Botón anterior */}
                    <button
                      onClick={() => setCarouselPage(p => Math.max(0, p - 1))}
                      disabled={!canGoPrev}
                      className={`btn-ghost-icon shrink-0 transition-opacity duration-150 ${
                        canGoPrev ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Tarjetas — ocupan el espacio central */}
                    <div className="flex-1 flex gap-3 min-w-0 pr-20">
                      {isLoading ? (
                         <div className="flex-1 flex flex-col items-center justify-center py-6 bg-gray-darker/20 rounded-lg border border-dashed border-gray-dark">
                           <div className="relative">
                             <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-dark border-t-orange-primary"></div>
                             <div className="absolute inset-0 flex items-center justify-center">
                               <div className="h-1 w-1 bg-orange-primary rounded-full animate-ping"></div>
                             </div>
                           </div>
                           <p className="text-[11px] text-gray-lighter mt-3 tracking-wider uppercase font-medium">Cargando agenda semanal...</p>
                         </div>
                       ) : citasSemana.length === 0 ? (
                        <p className="flex-1 text-center text-sm text-gray-dark">Sin citas {carouselEstadoFiltro === 'Todas' ? '' : carouselEstadoFiltro.toLowerCase() + 's '}para esta semana</p>
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
                                onClick={(e) => {
                                  const [hStr, mStr] = (cita.hora || '09:00').split(':');
                                  const horaNum = parseInt(hStr) + (parseInt(mStr) / 60);
                                  const fechaObj = new Date(`${cita.fecha}T12:00:00`);
                                  const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                                  openCitaPopover(
                                    cita,
                                    { dia: diaStr, hora: horaNum, fecha: cita.fecha },
                                    e.currentTarget.getBoundingClientRect()
                                  );
                                }}
                              >
                                <p className="text-sm text-gray-lightest truncate leading-tight">
                                  {formatNombre(cita.clienteNombre)}
                                </p>
                                <p className="text-xs text-gray-lighter/80 truncate mt-0.5 leading-tight">
                                  {servicio}
                                </p>
                                <p className="text-[11px] text-gray-light mt-1 leading-tight tracking-tight">
                                  {subtitulo}
                                </p>
                              </div>
                            );
                          })}
                          {/* Relleno para mantener el ancho uniforme */}
                          {pageCitas.length < CAROUSEL_PAGE_SIZE && Array.from({ length: CAROUSEL_PAGE_SIZE - pageCitas.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="flex-1 min-w-0" />
                          ))}
                        </>
                      )}
                    </div>

                    {/* Botón siguiente */}
                    <button
                      onClick={() => setCarouselPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={!canGoNext}
                      className={`btn-ghost-icon shrink-0 transition-opacity duration-150 ${
                        canGoNext ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Filtro de estados + métrica total */}
                  <div className="ml-4 shrink-0 flex items-center gap-3">
                    {/* Filtro select */}
                    <Select
                      value={carouselEstadoFiltro}
                      onValueChange={(v) => { setCarouselEstadoFiltro(v as any); setCarouselPage(0); }}
                    >
                      <SelectTrigger className="h-auto py-1.5 px-3 text-xs font-semibold rounded-xl border border-orange-primary bg-transparent text-orange-primary hover:bg-orange-primary/10 transition-colors focus:ring-0 focus:ring-offset-0 min-w-[110px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl">
                        {(['Todas', 'Pendiente', 'Completada', 'Cancelada'] as const).map(op => (
                          <SelectItem
                            key={op}
                            value={op}
                            className="text-gray-lightest text-xs cursor-pointer [&[data-highlighted]]:bg-orange-primary/20 [&[data-highlighted]]:text-white-primary [&[data-state=checked]]:text-white-primary"
                          >
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* Total */}
                    <div className="text-center select-none">
                      <p className="text-[10px] uppercase tracking-widest text-gray-lighter leading-none">Total</p>
                      <p className="text-sm text-gray-lightest tabular-nums mt-0.5">{citasSemana.length}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Grid de horarios + headers de días — un solo card unificado */}
          <div className="std-card mb-0 !py-0 !overflow-visible">
            <div className="w-full py-5">
              <div className="-mx-6 pl-3 pr-6">

                {/* Fila de headers de días — misma estructura que las filas del grid */}
                <div
                  className="grid gap-1 mb-2"
                  style={{ gridTemplateColumns: calendarGridTemplate }}
                >
                  {/* Mes actual — ocupa la columna del tiempo */}
                  <div className="flex items-center justify-center select-none">
                    <span className="text-[11px] font-semibold text-gray-lightest tracking-wide leading-none">
                      {getMondayOfWeek(currentWeek).toLocaleDateString('es-ES', { month: 'long' }).toUpperCase()}
                    </span>
                  </div>
                  {getCurrentWeekDays().map(({ dia, fecha, fechaCompleta }) => {
                    const isSelected = selectedDates.has(fechaCompleta);
                    const discount = dayDiscounts[fechaCompleta];
                    return (
                      <div
                        key={dia}
                        className={`min-w-0 text-center cursor-pointer transition-all duration-200 rounded-lg py-3 border-2 flex flex-col items-center justify-center gap-1 ${
                          isSelected ? 'border-orange-primary bg-orange-primary/10' : 'border-transparent hover:bg-gray-darker'
                        }`}
                        onClick={() => handleDateSelect(fechaCompleta)}
                      >
                        <div className="flex justify-center items-center gap-1">
                          <h4 className="text-sm tracking-[0.06em] uppercase text-gray-lightest leading-none font-normal">{dia.slice(0, 3)}</h4>
                          {discount > 0 && (
                            <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <p className="text-xl text-gray-lightest leading-none">{parseInt(fechaCompleta.split('-')[2], 10)}</p>
                      </div>
                    );
                  })}
                </div>
                {(() => {
                  const weekDays = getCurrentWeekDays();
                  const todayStr = toLocalDateString(new Date());
                  return horasDelDia.map((hora) => (
                    <div
                      key={hora}
                      className="grid gap-1 h-20"
                      style={{ gridTemplateColumns: calendarGridTemplate }}
                    >
                      <div className="flex h-full items-center justify-center text-center text-[11px] tracking-[0.04em] text-gray-lightest whitespace-nowrap">
                        {formatHora12(hora)}
                      </div>
                      {diasSemana.map((dia) => {
                        const citasEnSlot = getCitasEnSlot(dia, hora);
                        const dayInfo = weekDays.find(d => d.dia === dia);

                        let isPastSlot = false;
                        if (dayInfo) {
                          if (dayInfo.fechaCompleta < todayStr) {
                            isPastSlot = true;
                          } else if (dayInfo.fechaCompleta === todayStr) {
                            const today = new Date();
                            const cur = today.getHours() * 60 + today.getMinutes();
                            if ((hora * 60) <= cur) isPastSlot = true;
                          }
                        }

                        // Cada celda es independiente: todas las citas que ocupan esta franja horaria (sin fusionar filas).
                        const slotKey = `${dayInfo?.fechaCompleta}-${hora}`;
                        const citasEnCelda = [...citasEnSlot].sort((a, b) => {
                          const [ah, am = '0'] = String(a.hora || '0:0').split(':');
                          const [bh, bm = '0'] = String(b.hora || '0:0').split(':');
                          const ta = parseInt(ah, 10) * 60 + parseInt(am, 10);
                          const tb = parseInt(bh, 10) * 60 + parseInt(bm, 10);
                          if (ta !== tb) return ta - tb;
                          return (Number(a.id) || 0) - (Number(b.id) || 0);
                        });
                        // Pestañas solo donde la cita "arranca" en esta franja (inicio de grilla o primer slot visible).
                        const citasQueArrancanEnCelda = citasEnCelda.filter(cita => {
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
                        const tieneCita = citasEnCelda.length > 0;
                        const relevantKeys = `${citasEnCelda.map(c => c.id).join('-')}-${citasQueArrancanEnCelda.map(c => c.id).join('-')}`;
                        const mostrarBloqueCita = tieneCita;
                        const celdaResaltada = citasEnCelda.some(c => c.id === highlightedCitaId);
                        const isBlockHovered = !isPastSlot && hoveredSlotKey === slotKey;

                        return (
                          <div
                            key={`${dia}-${hora}-${relevantKeys}`}
                            className={`min-w-0 h-full transition-all duration-200 ${
                              tieneCita
                                ? `relative min-h-0 overflow-visible ${isPastSlot ? 'cursor-default' : 'cursor-pointer group'}`
                                : isPastSlot
                                  ? 'relative rounded border bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-60'
                                  : `relative rounded border border-gray-dark bg-gray-darker cursor-pointer group ${CAL_GRID_HOVER_CELL}`
                            }`}
                            onClick={(e) => {
                              if (isPastSlot) return;
                              // Block slot clicks while any modal/dialog/popup is open to avoid
                              // accidentally opening the create form behind an active overlay.
                              if (
                                isCreateModalOpen ||
                                isSlotModalOpen ||
                                isDeleteDialogOpen ||
                                showDiscardDialog ||
                                isDiscountDialogOpen ||
                                isEditHorarioModalOpen ||
                                showModalParcial ||
                                overflowPopup !== null
                              ) return;
                              handleSlotClick(dia, hora);
                            }}
                          >
                            {/* Slot vacío: hover + */}
                            {!tieneCita && !isPastSlot && (
                              <div className={`absolute inset-0 z-[1] rounded ${CAL_GRID_HOVER_SHIMMER}`}>
                                <Plus className={CAL_GRID_HOVER_PLUS_ICON} />
                              </div>
                            )}

                            {mostrarBloqueCita && (
                              <div
                                className={`absolute inset-0 cita-calendar-block${celdaResaltada ? ' cita-notification-highlight' : ''}${!isPastSlot ? ' cursor-pointer' : ''}`}
                              >
                                <div
                                  className={`absolute inset-0 flex flex-col justify-start gap-1 rounded-md overflow-hidden px-1.5 pt-2 pb-1 group transition-[background-color,border-color] duration-200 ease-out ${
                                    isPastSlot
                                      ? 'cursor-default border border-gray-dark/45 bg-gray-darkest/90 opacity-[0.92]'
                                      : `border bg-gray-darker border-gray-dark${isBlockHovered ? ' cal-block-hovered' : ''}`
                                  }`}
                                  onMouseOver={!isPastSlot ? (e) => {
                                    // Only highlight when mouse is directly on the block background,
                                    // not on child elements (cita rows, overflow button, tooltip).
                                    setHoveredSlotKey(e.target === e.currentTarget ? slotKey : null);
                                  } : undefined}
                                  onMouseLeave={!isPastSlot ? () => setHoveredSlotKey(null) : undefined}
                                >
                                  {citasQueArrancanEnCelda.length > 0 ? (
                                    <>
                                    {citasQueArrancanEnCelda.slice(0, 2).map((citaItem) => {
                                      const dotColor = getCitaDotColor(citaItem);
                                      const visibleText = `${formatHoraStr12(citaItem.hora)} ${formatNombre(citaItem.clienteNombre || 'Cliente')} - ${formatNombre(citaItem.barberoNombre || 'Barbero')}`;
                                      const abrirDetalleLinea = (rect: DOMRect) => {
                                        const [hStr, mStr] = (citaItem.hora || '09:00').split(':');
                                        const horaNum = parseInt(hStr, 10) + parseInt(mStr || '0', 10) / 60;
                                        const fechaObj = new Date(`${dayInfo?.fechaCompleta}T12:00:00`);
                                        const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                                        openCitaPopover(
                                          citaItem,
                                          { dia: diaStr, hora: horaNum, fecha: dayInfo?.fechaCompleta || '' },
                                          rect
                                        );
                                      };
                                      return (
                                        <div
                                          key={citaItem.id}
                                          className="flex items-center gap-1.5 min-w-0 w-full rounded cursor-pointer"
                                          onClick={(e) => { e.stopPropagation(); abrirDetalleLinea(e.currentTarget.getBoundingClientRect()); }}
                                          onMouseEnter={(e) => {
                                            const span = e.currentTarget.querySelector('span');
                                            if (span) span.style.color = 'rgba(255,255,255,0.95)';
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            showTooltip({
                                              cita: citaItem,
                                              rect,
                                              servicioLabel: formatNombre(citaItem.servicioNombre || citaItem.paqueteNombre || 'Servicio'),
                                              tabColor: dotColor,
                                              abrirDetalle: () => abrirDetalleLinea(rect),
                                            });
                                          }}
                                          onMouseLeave={(e) => {
                                            const span = e.currentTarget.querySelector('span');
                                            if (span) span.style.color = '';
                                            scheduleHideTooltip();
                                          }}
                                        >
                                          <div
                                            className="w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ background: dotColor }}
                                          />
                                          <span className="truncate text-[9px] font-bold text-gray-lightest leading-tight" style={{ transition: 'color 150ms' }}>
                                            {visibleText}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {citasQueArrancanEnCelda.length > 2 && (
                                      <button
                                        type="button"
                                        className="self-start text-left text-[8px] font-semibold leading-tight rounded transition-all duration-150 px-0.5"
                                        style={{ color: 'rgba(160,160,168,0.80)', paddingLeft: '3px', cursor: 'pointer' }}
                                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.90)'; }}
                                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(160,160,168,0.80)'; }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOverflowPopup({
                                            citas: citasQueArrancanEnCelda,
                                            rect: e.currentTarget.getBoundingClientRect(),
                                            horaLabel: formatHora12(hora),
                                            diaLabel: dia,
                                            fechaCompleta: dayInfo?.fechaCompleta || '',
                                          });
                                        }}
                                      >
                                        {citasQueArrancanEnCelda.length - 2} más
                                      </button>
                                    )}
                                    </>
                                  ) : (
                                    /* Continuation slot: cita spans from previous row */
                                    <>
                                      <div
                                        className="absolute inset-y-2 left-1.5 rounded-full"
                                        style={{ width: 2, background: getCitaDotColor(citasEnCelda[0]) }}
                                      />
                                      {!isPastSlot && (
                                        <div
                                          className={`absolute inset-0 z-10 rounded-md ${CAL_GRID_HOVER_SHIMMER}`}
                                          aria-hidden
                                        >
                                          <Plus className={CAL_GRID_HOVER_PLUS_ICON} />
                                        </div>
                                      )}
                                    </>
                                  )}

                                  {citasEnCelda.some(c => c.estado === 'Completada') && (
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
      )}

      {/* Mini-tooltip de cita al hacer hover sobre la pestaña de color */}
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
          onClick={() => { cancelHideTooltip(); hoveredCita.abrirDetalle(); setHoveredCita(null); setTooltipVisible(false); }}
        >
          <div
            className="rounded-xl px-3 py-2 text-left select-none flex gap-2.5 items-stretch"
            style={{
              background: 'rgba(18, 18, 20, 0.96)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.7), 0 0 0 1px rgba(216,176,129,0.15)',
              minWidth: 140,
              maxWidth: 210,
            }}
          >
            {/* Franja de color de la cita */}
            <div className="w-1 rounded-full shrink-0" style={{ background: hoveredCita.tabColor }} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold" style={{ color: '#d8b081' }}>
                {formatNombre(hoveredCita.cita.clienteNombre || 'Cliente')}
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
          {/* Flecha */}
          <div className="flex justify-center -mt-px">
            <div className="w-2 h-2 rotate-45" style={{ background: 'rgba(18,18,20,0.96)' }} />
          </div>
        </div>,
        document.body
      )}

      {/* Overflow popup — lista de citas cuando el bloque tiene más de 2 */}
      {overflowPopup && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOverflowPopup(null)} />
          <div
            className="fixed z-[9999] rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
            style={(() => {
              const r = overflowPopup.rect;
              const popW = 290;
              const popMaxH = 360;
              // Center the popup vertically on the slot that triggered it.
              const slotCenterY = (r.top + r.bottom) / 2;
              const top = Math.max(8, Math.min(slotCenterY - popMaxH / 2, window.innerHeight - popMaxH - 8));
              const left = Math.min(r.left, window.innerWidth - popW - 12);
              return {
                top,
                left,
                width: popW,
                maxHeight: popMaxH,
                overflowY: 'auto' as const,
                boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.60)',
              };
            })()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — día abreviado + número de fecha centrados */}
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
            {/* Cita list */}
            <div className="py-2">
              {overflowPopup.citas.map((cita) => {
                const color = getCitaTabColor(cita);
                return (
                  <button
                    key={cita.id}
                    type="button"
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-gray-dark transition-colors"
                    style={{ paddingLeft: '1.75rem', paddingRight: '1rem' }}
                    onClick={(e) => {
                      setOverflowPopup(null);
                      const [hStr, mStr] = (cita.hora || '09:00').split(':');
                      const horaNum = parseInt(hStr, 10) + parseInt(mStr || '0', 10) / 60;
                      const fechaObj = new Date(`${overflowPopup.fechaCompleta}T12:00:00`);
                      const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                      openCitaPopover(
                        cita,
                        { dia: diaStr, hora: horaNum, fecha: overflowPopup.fechaCompleta },
                        e.currentTarget.getBoundingClientRect()
                      );
                    }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-[11px] font-semibold text-gray-lightest truncate">
                      {formatHoraStr12(cita.hora)} {formatNombre(cita.clienteNombre || 'Cliente')} - {formatNombre(cita.barberoNombre || 'Barbero')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Popover flotante de detalle de cita — estilo Google Calendar */}
      {isSlotModalOpen && popoverPosition && createPortal(
        <>
          <div
            ref={popoverRef}
            className="fixed flex flex-col rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
            style={{
              top: popoverPosition.top,
              left: popoverPosition.left,
              width: `min(${POPOVER_WIDTH}px, calc(100vw - 32px))`,
              maxHeight: 'calc(100vh - 16px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
              zIndex: 9999,
              // Animación: 'enter' arranca opaco 0 y desplazado hacia el bloque,
              // 'open' termina en posición final con opacidad 1, 'exit' es solo fade-out.
              opacity: popoverPhase === 'open' ? 1 : 0,
              transform:
                popoverPhase === 'enter'
                  ? `translateX(${popoverSide === 'right' ? -10 : 10}px) scale(0.97)`
                  : popoverPhase === 'open'
                  ? 'none'
                  : 'translateX(0) scale(1)',
              transformOrigin: popoverSide === 'right' ? 'left center' : 'right center',
              transition: `opacity ${POPOVER_ANIM_MS}ms ease-out, transform ${POPOVER_ANIM_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
              willChange: popoverPhase === 'open' ? 'auto' : 'opacity, transform',
            }}
          >
          {/* Barra superior: título + botón cerrar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark bg-gray-darker/50 shrink-0">
            <span className="text-lg font-semibold text-gray-lightest">
              Detalle de cita
            </span>
            <button
              type="button"
              onClick={closePopover}
              className="p-1.5 rounded-lg text-gray-lighter hover:text-white-primary hover:bg-gray-dark transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contenido scrollable */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

          {selectedCita ? (() => {
            const detalleServicios: any[] = Array.isArray(selectedCita.servicios) && selectedCita.servicios.length > 0
              ? selectedCita.servicios
              : (Array.isArray(selectedCita.serviciosNombres) ? selectedCita.serviciosNombres.map((n: string) => ({ nombre: n })) : []);
            const detalleProductos: any[] = Array.isArray(selectedCita.productos) && selectedCita.productos.length > 0
              ? selectedCita.productos
              : (Array.isArray(selectedCita.productosNombres) ? selectedCita.productosNombres.map((n: string) => ({ nombre: n, cantidad: 1 })) : []);
            const paqueteData = selectedCita.paqueteId ? paquetesList.find((p: any) => p.id === selectedCita.paqueteId) : null;
            const barberoDataDetalle = selectedCita.barberoId ? barberosList.find((b: any) => b.id === selectedCita.barberoId) : null;
            const inicialesBarberoDetalle = (selectedCita.barberoNombre || '?')
              .split(' ').filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join('') || '?';
            // Mapear nombres de servicios del paquete a sus imágenes desde serviciosList
            const serviciosDelPaquete: any[] = paqueteData && Array.isArray(paqueteData.servicios)
              ? paqueteData.servicios.map((nombre: string) => {
                  const srv = serviciosList.find((s: any) => (s.nombre || '').toLowerCase() === String(nombre).toLowerCase());
                  return srv
                    ? { nombre, imagen: srv.imagen, duracion: srv.duracion, precio: srv.precio }
                    : { nombre };
                })
              : [];
            const inicialesCliente = (selectedCita.clienteNombre || '?')
              .split(' ').filter(Boolean).slice(0, 2).map((s: string) => s[0]?.toUpperCase()).join('') || '?';
            const clienteDataDetalle = selectedCita.clienteId ? clientesList.find((c: any) => c.id === selectedCita.clienteId) : null;
            const estadoColor = getCitaColor(selectedCita.estado);

            // Formato de fecha legible
            const fechaLegible = (() => {
              if (!selectedCita.fecha) return '—';
              const d = new Date(selectedCita.fecha + 'T00:00:00');
              const str = d.toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long' });
              return str.charAt(0).toUpperCase() + str.slice(1);
            })();

            const horaFin = (() => {
              if (!selectedCita.hora) return '';
              const [hStr, mStr] = selectedCita.hora.split(':');
              const totalMin = parseInt(hStr) * 60 + parseInt(mStr || '0') + (selectedCita.duracion || 60);
              const hFin = Math.floor(totalMin / 60);
              const mFin = totalMin % 60;
              const ampm = hFin >= 12 ? 'PM' : 'AM';
              const h12 = hFin % 12 === 0 ? 12 : hFin % 12;
              return `${h12}:${String(mFin).padStart(2, '0')} ${ampm}`;
            })();

            return (
            <div className="space-y-0">

              {/* ── Título: nombre del cliente con foto ── */}
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  {/* Avatar — más grande, a la izquierda de ambas líneas */}
                  <div
                    style={{ width: 56, height: 56, minWidth: 56, minHeight: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
                    className="bg-gray-dark border border-gray-dark/60 flex items-center justify-center"
                  >
                    {clienteDataDetalle?.fotoPerfil ? (
                      <img
                        src={clienteDataDetalle.fotoPerfil}
                        alt={selectedCita.clienteNombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <User style={{ width: 24, height: 24, flexShrink: 0 }} className="text-gray-lighter" />
                    )}
                  </div>
                  {/* Nombre + chips apilados verticalmente */}
                  <div className="min-w-0">
                    <h2 className="text-2xl font-normal text-gray-lightest leading-tight truncate">
                      {formatNombre(selectedCita.clienteNombre)}
                    </h2>
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
                        {getEstadoInfo(selectedCita.estado).label}
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
                  <p className="text-sm text-gray-lightest">
                    {fechaLegible}
                  </p>
                  <p className="text-sm text-gray-lighter mt-0.5">
                    {formatHoraStr12(selectedCita.hora)}{horaFin ? ` – ${horaFin}` : ''}
                  </p>
                </div>
              </div>

              {/* ── Fila: Barbero ── */}
              <div className="flex items-center gap-4 py-3">
                <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div
                    style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
                    className="bg-gray-dark border border-gray-dark flex items-center justify-center"
                  >
                    {barberoDataDetalle?.fotoPerfil ? (
                      <img
                        src={barberoDataDetalle.fotoPerfil}
                        alt={selectedCita.barberoNombre}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <User style={{ width: 14, height: 14 }} className="text-gray-lighter" />
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-lightest">
                    {formatNombre(selectedCita.barberoNombre) || 'Sin barbero asignado'}
                  </p>
                  <p className="text-xs text-gray-lighter mt-0.5">Barbero</p>
                </div>
              </div>

              {/* ── Fila: Servicios / Paquete ── */}
              <div className="flex items-center gap-4 py-3">
                <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Scissors className="w-5 h-5 text-gray-lighter" />
                </div>
                <div className="flex-1 min-w-0">
                  {paqueteData ? (
                    <div>
                      <p className="text-sm text-gray-lightest font-medium">{formatNombre(paqueteData.nombre || selectedCita.paqueteNombre || '')}</p>
                      {serviciosDelPaquete.length > 0 && (
                        <p className="text-xs text-gray-lighter mt-0.5">
                          {serviciosDelPaquete.map((s: any) => formatNombre(s.nombre)).join(', ')}
                        </p>
                      )}
                    </div>
                  ) : detalleServicios.length > 0 ? (
                    <div>
                      {(() => {
                        const MAX = 3;
                        const hasDuraciones = detalleServicios.some((s: any) => s.duracion);
                        const source = detalleServiciosExpanded ? detalleServicios : detalleServicios.slice(0, MAX);
                        const extra = detalleServicios.length - MAX;
                        const items = source.map((s: any) =>
                          hasDuraciones && s.duracion
                            ? `${formatNombre(s.nombre)}: ${formatDuracion(s.duracion)}`
                            : formatNombre(s.nombre)
                        );
                        return (
                          <p className="text-sm text-gray-lightest">
                            {items.join(' · ')}
                            {extra > 0 && (
                              <button
                                type="button"
                                onClick={() => setDetalleServiciosExpanded(v => !v)}
                                className="ml-1 text-xs font-semibold transition-colors duration-150"
                                style={{ color: 'rgba(160,160,168,0.85)', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.90)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(160,160,168,0.85)')}
                              >
                                {detalleServiciosExpanded ? 'ver menos' : `· ${extra} más`}
                              </button>
                            )}
                          </p>
                        );
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-lighter">Sin servicios registrados</p>
                  )}
                </div>
              </div>

              {/* ── Fila: Productos (si hay) ── */}
              {detalleProductos.length > 0 && (
                <div className="flex items-center gap-4 py-3">
                  <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {(() => {
                      const MAX = 3;
                      const source = detalleProductosExpanded ? detalleProductos : detalleProductos.slice(0, MAX);
                      const extra = detalleProductos.length - MAX;
                      return (
                        <p className="text-sm text-gray-lightest">
                          {source.map((p: any) =>
                            p.cantidad > 1 ? `${formatNombre(p.nombre)} ×${p.cantidad}` : formatNombre(p.nombre)
                          ).join(', ')}
                          {extra > 0 && (
                            <button
                              type="button"
                              onClick={() => setDetalleProductosExpanded(v => !v)}
                              className="ml-1 text-xs font-semibold transition-colors duration-150"
                              style={{ color: 'rgba(160,160,168,0.85)', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.90)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(160,160,168,0.85)')}
                            >
                              {detalleProductosExpanded ? 'ver menos' : `, ${extra} más`}
                            </button>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ── Fila: Notas (si hay) ── */}
              {selectedCita.notas && (
                <div className="flex items-center gap-4 py-3">
                  <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <p className="text-sm text-gray-lighter leading-relaxed">{selectedCita.notas}</p>
                </div>
              )}

              {/* ── Fila: Teléfono cliente (si hay) ── */}
              {selectedCita.telefono && (
                <div className="flex items-center gap-4 py-3">
                  <div style={{ width: 56, minWidth: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <p className="text-sm text-gray-lightest">{selectedCita.telefono}</p>
                </div>
              )}

              {/* ── Acciones ── */}
              {selectedCita.estado !== 'Completada' && (() => {
                // Permitir completar desde que la cita inicia (no esperar a que termine)
                const [h, m] = (selectedCita.hora || '00:00').split(':');
                const citaStart = new Date(selectedCita.fecha + 'T' + h.padStart(2, '0') + ':' + m.padStart(2, '0'));
                const isFuture = citaStart > new Date();

                return (
                  <div className="flex flex-wrap justify-end gap-2 sm:gap-3 pt-3">
                    <button
                      onClick={() => setConfirmAccion({ tipo: 'cancelar', citaId: selectedCita.id })}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-transparent hover:border-red-500/40 transition-all cursor-pointer"
                    >
                      Cancelar cita
                    </button>
                    {!isFuture && (
                      <>
                        <button
                          onClick={() => setConfirmAccion({ tipo: 'parcial', citaId: selectedCita.id })}
                          className="px-4 py-2 rounded-lg text-sm font-medium border border-orange-primary/40 text-orange-primary hover:bg-orange-primary/10 transition-all cursor-pointer"
                        >
                          Completar Parcialmente
                        </button>
                        <button
                          onClick={() => setConfirmAccion({ tipo: 'completar', citaId: selectedCita.id })}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-primary text-black-primary hover:bg-orange-primary/90 transition-all cursor-pointer"
                        >
                          Completar
                        </button>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
            );
          })() : null}

          </div>
        </div>
        </>,
        document.body
      )}

      {showModalParcial && selectedCita && (
        <ModalCompletarParcialmente
          isOpen={true}
          cita={selectedCita}
          onClose={() => setShowModalParcial(false)}
          onComplete={async (servicios, productos) => {
            await agendamientoService.completarParcialmente(selectedCita.id, {
              serviciosCompletados: servicios,
              productosCompletados: productos,
              estado: "Completada"
            });
            setCitas(citas.map(c =>
              c.id === selectedCita.id ? { ...c, estado: 'Completada' } : c
            ));
            window.dispatchEvent(new CustomEvent("cita-estado-changed", { detail: { citaId: selectedCita.id, estado: "Completada" } }));
            setSelectedCita({ ...selectedCita, estado: 'Completada' });
            setShowModalParcial(false);
            success("Cita completada", "Completada parcialmente con venta generada.");
          }}
        />
      )}

      {/* Dialog de confirmación de acción de estado */}
      <AlertDialog open={!!confirmAccion} onOpenChange={(open) => { if (!open) setConfirmAccion(null); }}>
        <AlertDialogContent className="bg-gray-darkest border border-gray-dark">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                confirmAccion?.tipo === 'cancelar' ? 'bg-red-600/20' : 'bg-orange-primary/10'
              }`}>
                {confirmAccion?.tipo === 'cancelar' ? (
                  <X className="w-5 h-5 text-red-400" />
                ) : (
                  <Check className="w-5 h-5 text-orange-primary" />
                )}
              </div>
              <AlertDialogTitle className="text-white-primary">
                {confirmAccion?.tipo === 'cancelar' && 'Cancelar cita'}
                {confirmAccion?.tipo === 'completar' && 'Completar cita'}
                {confirmAccion?.tipo === 'parcial' && 'Completar parcialmente'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-lightest">
              {confirmAccion?.tipo === 'cancelar' && 'La cita será cancelada y la venta asociada quedará anulada. Esta acción no se puede deshacer.'}
              {confirmAccion?.tipo === 'completar' && '¿Confirmas que la cita fue atendida y deseas marcarla como completada?'}
              {confirmAccion?.tipo === 'parcial' && '¿Deseas registrar los servicios realizados en esta cita de forma parcial?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="elegante-button-secondary" onClick={() => setConfirmAccion(null)}>
              No, volver
            </AlertDialogCancel>
            <AlertDialogAction
              className={confirmAccion?.tipo === 'cancelar'
                ? 'bg-red-600 hover:bg-red-700 text-white border-none'
                : 'bg-orange-primary hover:bg-orange-primary/90 text-black-primary border-none'}
              onClick={() => {
                if (!confirmAccion) return;
                if (confirmAccion.tipo === 'cancelar') {
                  handleChangeEstado(confirmAccion.citaId, 'Cancelada');
                } else if (confirmAccion.tipo === 'completar') {
                  handleChangeEstado(confirmAccion.citaId, 'Completada');
                } else if (confirmAccion.tipo === 'parcial') {
                  hidePopoverKeepCita();
                  setShowModalParcial(true);
                }
                setConfirmAccion(null);
              }}
            >
              {confirmAccion?.tipo === 'cancelar' && 'Sí, cancelar'}
              {confirmAccion?.tipo === 'completar' && 'Sí, completar'}
              {confirmAccion?.tipo === 'parcial' && 'Sí, continuar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación de eliminación */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-darkest border border-orange-primary">
          <AlertDialogHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-red-600/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <AlertDialogTitle className="text-white-primary">
                Confirmar Eliminación
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-gray-lightest">
              ¿Estás seguro de que deseas eliminar la cita de {citaToDelete?.clienteNombre}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="elegante-button-secondary"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setCitaToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white border-none"
              onClick={() => {
                console.log("Botón ELIMINAR del Dialog presionado");
                confirmDeleteCita();
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de descarte: siempre montado (evita onOpenChange de Radix al montar condicional) */}
      {createPortal(
        <div
          data-discard-dialog-root
          className={`fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-150 ${
            showDiscardDialog ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          style={{ zIndex: DISCARD_DIALOG_Z }}
          aria-hidden={!showDiscardDialog}
        >
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setShowDiscardDialog(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="discard-dialog-title"
            aria-describedby="discard-dialog-desc"
            className="relative w-full max-w-md rounded-xl border border-gray-dark bg-gray-darkest p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="discard-dialog-title" className="text-lg font-semibold text-white-primary">
              ¿Descartar cambios?
            </h2>
            <p id="discard-dialog-desc" className="mt-2 text-sm text-gray-lightest">
              Tienes cambios sin guardar. Si cierras el formulario, se perderán.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="elegante-button-primary rounded-xl"
                onClick={() => setShowDiscardDialog(false)}
              >
                Seguir editando
              </button>
              <button
                type="button"
                className="bg-transparent text-gray-lightest border border-gray-dark hover:bg-gray-dark font-semibold rounded-xl px-6 py-3 transition-colors"
                onClick={() => handleCloseModal(true)}
              >
                Descartar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Dialog para configurar descuentos de días */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="bg-gray-darkest border-orange-primary max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2 text-xl">
              <Calendar className="w-6 h-6 text-orange-primary" />
              Detalle del día
            </DialogTitle>
            <DialogDescription className="text-gray-lightest pt-2">
              <strong>Días afectados:</strong> {Array.from(selectedDates).join(", ")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4 overflow-hidden flex-1 flex flex-col">
            {/* Custom Tabs */}
            <div className="flex border-b border-gray-dark shrink-0">
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'citas' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('citas')}
              >
                Citas
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'barberos' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('barberos')}
              >
                Horarios
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'descuento' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('descuento')}
              >
                Descuentos
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
              {activeModalDiscountTab === 'descuento' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-gray-darker p-4 rounded-lg border border-gray-dark">
                    <p className="text-sm text-gray-lightest mb-4">
                      Aplica un porcentaje de descuento que se restará automáticamente del precio base de todos los servicios o paquetes agendados para este día.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-white-primary">Porcentaje de descuento (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Ej. 15"
                        className="elegante-input w-full text-lg h-12"
                        value={pendingDiscountValue}
                        onChange={(e) => setPendingDiscountValue(e.target.value)}
                      />
                      <p className="text-xs text-orange-primary/80 mt-1 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Ingresa 0 para quitar el descuento existente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeModalDiscountTab === 'barberos' && (
                <div className="space-y-3 pt-2">
                  {(() => {
                    const diasSeleccionadosList = Array.from(selectedDates).map(d => {
                      const date = new Date(d + 'T12:00:00'); // Evitar desfase horario
                      const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                      return dayLabels[date.getDay()];
                    });

                    const barberosEnDias = barberosList.filter(b =>
                      horariosList.some(h =>
                        Number(h.barberoId) === Number(b.id) &&
                        horarioEstaActivo(h) &&
                        diasSeleccionadosList.includes(normalizeDiaNombre(String(h.dia)))
                      )
                    );

                    if (barberosEnDias.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <User className="w-12 h-12 text-gray-dark mx-auto mb-2" />
                          <p className="text-gray-lightest text-sm">No hay barberos con horario asignado para estos días.</p>
                        </div>
                      );
                    }

                    return barberosEnDias.map(barbero => (
                      <div key={barbero.id} className="flex items-start gap-4 bg-gray-darkest border border-gray-dark p-3 rounded-lg">
                        {/* Foto del barbero */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-dark shrink-0 border-2 border-orange-primary/40">
                          {barbero.fotoPerfil ? (
                            <ImageRenderer url={barbero.fotoPerfil} alt={barbero.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-dark">
                              <User className="w-8 h-8 text-gray-medium" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-white-primary font-semibold text-base truncate">{barbero.nombre}</p>
                           <p className="text-xs text-gray-lighter mb-2">Haz clic en un horario para editarlo</p>
                           <div className="mt-1 space-y-1.5">
                             {horariosList.filter(h => Number(h.barberoId) === Number(barbero.id) && horarioEstaActivo(h) && diasSeleccionadosList.includes(normalizeDiaNombre(String(h.dia)))).map((h, i) => (
                               <button
                                 key={i}
                                 onClick={() => handleOpenEditHorario(barbero, h)}
                                 className="w-full flex items-center gap-2 bg-orange-primary/10 border border-orange-primary/20 hover:border-orange-primary hover:bg-orange-primary/20 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                               >
                                  <Clock className="w-3.5 h-3.5 text-orange-primary shrink-0" />
                                  <span className="text-white-primary text-sm font-medium flex-1 text-left">
                                    {formatHoraStr12(h.horaInicio)} &ndash; {formatHoraStr12(h.horaFin)}
                                  </span>
                                  <Edit className="w-3.5 h-3.5 text-orange-primary/60" />
                               </button>
                             ))}
                           </div>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {activeModalDiscountTab === 'citas' && (
                <div className="space-y-3 pt-2">
                  {(() => {
                    const fechaCitas = Array.from(selectedDates)[0];
                    const citasDelDia = citas.filter(c => c.fecha === fechaCitas);

                    if (citasDelDia.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Clock className="w-12 h-12 text-gray-dark mx-auto mb-2" />
                          <p className="text-gray-lightest text-sm">No hay citas agendadas para este día.</p>
                        </div>
                      );
                    }

                    // Ordenar citas por hora
                    const citasOrdenadas = [...citasDelDia].sort((a, b) => {
                      const timeA = new Date(`1970/01/01 ${a.hora}`).getTime();
                      const timeB = new Date(`1970/01/01 ${b.hora}`).getTime();
                      return timeA - timeB;
                    });

                    return citasOrdenadas.map(cita => (
                      <div key={cita.id} className="flex justify-between items-center bg-gray-darkest border border-gray-dark p-3 rounded-lg">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-white-primary font-medium truncate">{cita.clienteNombre}</p>
                          <p className="text-xs text-gray-lighter truncate mt-0.5">
                            {cita.servicioNombre || cita.paqueteNombre || "Servicio"} <span className="text-gray-medium">•</span> {cita.barberoNombre}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-orange-primary font-bold text-sm bg-orange-primary/10 px-2 py-1 rounded-md">
                            {formatHora12((parseInt((cita.hora || "0").split(":")[0] || "0") * 60 + parseInt((cita.hora || "0").split(":")[1] || "0")) / 60)}
                          </span>
                          <p className="text-[10px] text-gray-light mt-1 uppercase tracking-widest">{cita.estado}</p>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 border-t border-gray-dark pt-4 mt-1 shrink-0">
            <button
              onClick={() => setIsDiscountDialogOpen(false)}
              className="elegante-button-secondary px-4 py-2"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveDiscount}
              className="elegante-button-primary px-4 py-2 font-bold"
            >
              Guardar Descuento
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar horario del barbero */}
      <Dialog open={isEditHorarioModalOpen} onOpenChange={(open) => { if (!isSavingHorario) setIsEditHorarioModalOpen(open); }}>
        <DialogContent className="bg-gray-darkest border-orange-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-primary" />
              Modificar Horario
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              {selectedBarberoForEdit && (
                <span>
                  <strong className="text-orange-primary">{selectedBarberoForEdit.barbero?.nombre}</strong> &mdash; {selectedBarberoForEdit.horario?.dia} {Array.from(selectedDates)[0] || ''}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-white-primary text-sm">Hora de Inicio</Label>
              <TimeInput12h
                value={editHorarioStart}
                onChange={setEditHorarioStart}
                disabled={isSavingHorario}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white-primary text-sm">Hora de Fin</Label>
              <TimeInput12h
                value={editHorarioEnd}
                onChange={setEditHorarioEnd}
                disabled={isSavingHorario}
              />
            </div>
            <div className="bg-orange-primary/10 border border-orange-primary/30 rounded-lg p-3">
              <p className="text-xs text-orange-primary">
                ⚠️ Si hay citas programadas fuera de este nuevo horario, se enviará un correo de notificación a cada cliente afectado.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-dark pt-4">
            <button
              onClick={() => setIsEditHorarioModalOpen(false)}
              className="elegante-button-secondary px-4 py-2"
              disabled={isSavingHorario}
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEditHorario}
              className="elegante-button-primary px-4 py-2 font-bold flex items-center gap-2"
              disabled={isSavingHorario}
            >
              {isSavingHorario ? (
                <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Guardando...</>
              ) : (
                <>Guardar Cambios</>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertContainer />
    </>
  );
}
