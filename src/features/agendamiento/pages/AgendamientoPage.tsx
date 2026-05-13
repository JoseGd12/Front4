import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { agendamientoService } from "../services/agendamientoService";
import { ventaService } from "../../ventas/services/ventaService";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { productoService } from "../../productos/services/productos";
import { horariosService } from "../services/horariosService";
import { Input } from "../../../shared/components/ui/input";
import { Calendar, Clock, User, Edit, Trash2, Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal, ShoppingBag, Scissors, Package, FileText, CalendarDays, Plus, Minus, X, Phone } from "lucide-react";
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

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horasDelDia = Array.from({ length: 29 }, (_, i) => 9 + i * 0.5); // 9:00 AM a 11:00 PM
const calendarGridTemplate = "clamp(64px, 6vw, 78px) repeat(7, minmax(0, 1fr))";

const formatHora12 = (hora: number): string => {
  const h = Math.floor(hora);
  const m = (hora % 1) * 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const minutesStr = m === 0 ? '00' : '30';
  return `${h12}:${minutesStr} ${ampm}`;
};

// Convierte un string "HH:MM" o "HH:MM:SS" a formato 12 horas con AM/PM
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


export function AgendamientoPage({ initialItem, onClearInitialItem, onSubNavChange }: AgendamientoPageProps) {
  const { user } = useAuth();
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
  // Carrusel de servicios/paquetes dentro del modal de detalle de cita
  const [servicioCarouselPage, setServicioCarouselPage] = useState(0);
  const SERVICIO_PAGE_SIZE = 3;
  const CAROUSEL_PAGE_SIZE = 5;
  const [lastInitialItemKey, setLastInitialItemKey] = useState("");

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

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
    try {
      const [citasData, barberosData, serviciosData, clientesData, paquetesData, horariosData, productosData] = await Promise.all([
        agendamientoService.getAgendamientos(),
        barberosService.getBarberos(),
        servicioService.getServicios(),
        clientesService.getClientes(),
        apiService.getPaquetes(),
        horariosService.getHorarios(),
        productoService.getProductos().catch(() => [])
      ]);

      setCitas(citasData);
      // Solo mostrar barberos activos que tengan al menos un horario activo
      const barberosConHorarioActivo = new Set(
        horariosData.filter(h => h.estado === true).map(h => h.barberoId)
      );
      setBarberosList(barberosData.filter(b => b.estado === true && barberosConHorarioActivo.has(b.id)));
      setServiciosList(serviciosData.filter(s => s.estado === true));
      setClientesList(clientesData.filter(c => c.estado === true));
      setPaquetesList(paquetesData.filter(p => p.activo === true));
      setProductosList(productosData.filter((p: any) => p.activo !== false && (p.stockVentas > 0 || p.stockTotal > 0)));
      setHorariosList(horariosData || []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      // Fallback a los datos estáticos si hay error (opcional, pero mejor mostrar error)
      error("Error de conexión", "No se pudieron cargar los datos desde el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // Estados para el popover de detalle de cita (estilo Google Calendar)
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [popoverSide, setPopoverSide] = useState<'left' | 'right'>('right');
  const [popoverPhase, setPopoverPhase] = useState<'enter' | 'open' | 'exit'>('enter');

  // Estados del modal de creación/edición de citas
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalPosition, setModalPosition] = useState<{ top: number; left: number } | null>(null);
  const [modalPhase, setModalPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const POPOVER_ANIM_MS = 200;
  const [selectedSlot, setSelectedSlot] = useState<{ dia: string, hora: number, fecha: string } | null>(null);
  const [slotSearchTerm, setSlotSearchTerm] = useState("");
  const [slotFilterEstado, setSlotFilterEstado] = useState("all");
  const [activeTab, setActiveTab] = useState<'lista' | 'crear' | 'detalle'>('lista');
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'crear'>('calendar');
  const [ventasPorCita, setVentasPorCita] = useState<Record<number, number>>({});
  // Índice de la cita visible cuando hay varias en una misma franja (key: `${fecha}-${hora}`)
  const [slotCitaIndex, setSlotCitaIndex] = useState<Record<string, number>>({});

  const navegarCitaEnSlot = (
    slotKey: string,
    totalCitas: number,
    direction: 'next' | 'prev',
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (totalCitas <= 1) return;
    setSlotCitaIndex(prev => {
      const current = prev[slotKey] ?? 0;
      const newIdx =
        direction === 'next'
          ? (current + 1) % totalCitas
          : (current - 1 + totalCitas) % totalCitas;
      return { ...prev, [slotKey]: newIdx };
    });
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
  const [activeModalDiscountTab, setActiveModalDiscountTab] = useState<'descuento' | 'barberos' | 'citas'>('descuento');

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
        const diffToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
        const thisMonday = new Date(today);
        thisMonday.setDate(today.getDate() + diffToMonday);

        const citaDate = new Date(`${fecha}T12:00:00`);
        citaDate.setHours(0, 0, 0, 0);
        const citaDayOfWeek = citaDate.getDay();
        const diffToCitaMonday = citaDayOfWeek === 0 ? 1 : 1 - citaDayOfWeek;
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

  // Estados para buscadores dentro del formulario de cita
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [showClienteResults, setShowClienteResults] = useState(false);
  const [barberoFormSearchTerm, setBarberoFormSearchTerm] = useState('');
  const [showBarberoFormResults, setShowBarberoFormResults] = useState(false);
  const [servicioSearchTerm, setServicioSearchTerm] = useState('');
  const [paqueteSearchTerm, setPaqueteSearchTerm] = useState('');
  const [productoSearchTerm, setProductoSearchTerm] = useState('');
  const [showFormErrors, setShowFormErrors] = useState(false);
  const [tipoServicio, setTipoServicio] = useState<'individuales' | 'paquetes'>('individuales');
  const [editingFecha, setEditingFecha] = useState(false);
  const [editingHora, setEditingHora] = useState(false);

  // Cerrar modal con animación de salida
  const handleCloseModal = useCallback(() => {
    setModalPhase('exit');
    setTimeout(() => {
      setIsCreateModalOpen(false);
      setModalPosition(null);
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
        fecha: '', hora: '', duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
      });
    }, 200);
  }, []);

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
      setModalPhase('enter');
      setIsCreateModalOpen(true);
      setTimeout(() => setModalPhase('open'), 10);
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
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
    setSelectedCita(null);
    onClearInitialItem?.();
  };

  // Helper: obtener el lunes de una semana dada
  const getMondayOfWeek = (weekOffset: number) => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Lun...6=Sáb
    // Si hoy es domingo (0), ir +1 al próximo lunes; si no, retroceder al lunes de esta semana
    const diffToMonday = dayOfWeek === 0 ? 1 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Formato local YYYY-MM-DD sin conversión UTC
  const toLocalDateString = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
    return citas.filter(cita => cita.fecha === targetDateString);
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
      if (startNueva <= currentMinutes + 30) {
        return "Debes agendar con al menos 30 minutos de anticipación.";
      }
    }

    const endNueva = startNueva + durNueva;

    // Obtener las citas del día para este barbero, para considerarlo en el error
    const fechaObj = new Date(`${nuevaCita.fecha}T12:00:00`); // 12:00 pm para evitar desfases
    const dayIndex = fechaObj.getDay(); // 0=Domingo..6=Sábado
    const diaStr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayIndex];
    const horariosBarbero = horariosList.filter((h: any) => Number(h.barberoId) === Number(barberoId) && String(h.dia) === diaStr && h.estado === true);

    if (horariosBarbero.length === 0) {
      return `El barbero no trabaja los días ${diaStr}.`;
    }

    const dentroHorario = horariosBarbero.some((h: any) => {
      const [hIniH, hIniM] = String(h.horaInicio || '00:00').split(':').map((x: string) => parseInt(x || '0', 10));
      const [hFinH, hFinM] = String(h.horaFin || '23:59').split(':').map((x: string) => parseInt(x || '0', 10));
      const startH = hIniH * 60 + hIniM;
      const endH = hFinH * 60 + hFinM;
      return startNueva >= startH && endNueva <= endH;
    });

    if (!dentroHorario) {
      // Retornar las horas disponibles para decirle al usuario
      const horasDisponiblesStr = horariosBarbero.map((h: any) => `${h.horaInicio} a ${h.horaFin}`).join(", ");
      return `La hora seleccionada está fuera de su horario laboral. Las horas disponibles de este barbero son: ${horasDisponiblesStr}.`;
    }

    const solapa = citas.find((cita: any) => {
      if (cita.fecha !== nuevaCita.fecha) return false;
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

      const intervaloMinutos = 30; // Mostrar intervalos de 30 minutos

      const today = new Date();
      const todayStr = toLocalDateString(today);
      const isToday = fechaStr === todayStr;
      const currentMinutes = today.getHours() * 60 + today.getMinutes();

      for (let currentSlotStart = startH; currentSlotStart + duracion <= endH; currentSlotStart += intervaloMinutos) {
        // Omitir bloques que ya pasaron si es el día de hoy
        if (isToday && currentSlotStart <= currentMinutes + 30) {
          continue;
        }

        // Verificar solapamiento
        const solapa = citas.find((cita: any) => {
          if (cita.fecha !== fechaStr) return false;
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

          const endCurrentSlot = currentSlotStart + duracion;

          // Se solapan si inician antes de que termine la otra y terminan después de que empiece
          return currentSlotStart < endExist && startExist < endCurrentSlot;
        });

        if (!solapa) {
          const hhStr = String(Math.floor(currentSlotStart / 60)).padStart(2, '0');
          const mmStr = String(currentSlotStart % 60).padStart(2, '0');
          availableSlots.push(`${hhStr}:${mmStr}`);
        }
      }
    });

    return Array.from(new Set(availableSlots)).sort();
  };

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

    // Inicializar animación de entrada
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
  }, []);

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

    // Inicializar animación de entrada
    setModalPhase('enter');
    setIsCreateModalOpen(true);
    setTimeout(() => setModalPhase('open'), 10);
  }, [getCurrentWeekDays]);

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
    if (!nuevaCita.clienteId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.barberoId || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
      return;
    }
    setShowFormErrors(false);

    const errorDisponibilidad = validarDisponibilidadBarbero(nuevaCita.barberoId);
    if (errorDisponibilidad) {
      error("No disponible", errorDisponibilidad);
      return;
    }

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
      handleCloseModal();
    } catch (err: any) {
      console.error("Error al crear cita:", err);
      // Extraemos el mensaje de la API si existe, sino damos un mensaje genérico.
      const errorMsg = err?.message || err || "No se pudo conectar con el servidor.";
      // Si el message tiene "Error 400: ", lo limpiamos para que se lea mejor en la alerta
      const displayMsg = errorMsg.toString().replace("Error 400: ", "").replace("Error 500: ", "");
      error("No se pudo crear la cita", displayMsg);
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
      setModalPhase('enter');
      setIsCreateModalOpen(true);
      setTimeout(() => setModalPhase('open'), 10);
      setIsSlotModalOpen(false);
    } catch (err) {
      console.error("Error al obtener la cita completa:", err);
      error("Error al cargar cita", "No se pudo traer toda la información desde el servidor para editar.");
    }
  };

  // Actualizar cita
  const handleUpdateCita = async () => {
    if (!nuevaCita.clienteId || (!(nuevaCita.servicioIds.length > 0) && !nuevaCita.paqueteId) || !nuevaCita.barberoId || !nuevaCita.fecha || !nuevaCita.hora) {
      setShowFormErrors(true);
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
      handleCloseModal();
    } catch (err: any) {
      console.error("Error al actualizar:", err);
      const errorMsg = err?.message || err || "No se pudieron guardar los cambios en el servidor.";
      const displayMsg = errorMsg.toString().replace("Error 400: ", "").replace("Error 500: ", "");
      error("Error al actualizar", displayMsg);
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
    setActiveTab('detalle');
  };

  const POPOVER_WIDTH = 420;
  const openCitaPopover = useCallback((cita: any, slot: { dia: string; hora: number; fecha: string }, anchorRect: DOMRect) => {
    setSelectedCita(cita);
    setServicioCarouselPage(0);
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark bg-gray-darker/50 shrink-0">
              <h2 className="text-lg font-semibold text-gray-lightest">
                {selectedCita ? 'Editar Cita' : 'Nueva Cita'}
              </h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-1.5 rounded-lg text-gray-lighter hover:text-white-primary hover:bg-gray-dark transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido scrollable — filas del formulario (tareas 2.2–2.8) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {/* ── Fila: Cliente ── */}
              <div className="flex items-start gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
                  <User className="w-5 h-5 text-gray-lighter" />
                </div>
                <div className="flex-1 min-w-0">
                  <SearchField<any>
                    label="Buscar cliente"
                    placeholder="Nombre del cliente..."
                    value={clienteSearchTerm}
                    onChange={setClienteSearchTerm}
                    items={clientesList}
                    filterFn={(c, term) =>
                      (c.nombre || '').toLowerCase().includes(term.toLowerCase()) ||
                      (c.telefono || '').includes(term)
                    }
                    onSelect={(c) => {
                      setNuevaCita(prev => ({ ...prev, clienteId: c.id, cliente: c.nombre, telefono: c.telefono || '' }));
                      setClienteSearchTerm(c.nombre);
                    }}
                    onClear={() => {
                      setNuevaCita(prev => ({ ...prev, clienteId: 0, cliente: '', telefono: '' }));
                      setClienteSearchTerm('');
                    }}
                    renderItem={(c) => (
                      <div className="flex items-center gap-3 w-full">
                        {/* photo + name + phone */}
                        {c.fotoPerfil ? (
                          <img src={c.fotoPerfil} alt={c.nombre} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center">
                            <User className="w-4 h-4 text-gray-lighter" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-lightest">{c.nombre}</p>
                          <p className="text-xs text-gray-lighter">{c.telefono}</p>
                        </div>
                      </div>
                    )}
                    error={showFormErrors && !nuevaCita.clienteId ? 'Selecciona un cliente' : undefined}
                  />
                </div>
              </div>
              <div className="border-t border-gray-dark/60 mx-4" />

              {/* ── Fila: Switch Tipo ── */}
              <div className="flex items-center gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center">
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
              <div className="border-t border-gray-dark/60 mx-4" />

              {/* ── Fila: Servicio / Paquete ── */}
              <div className="flex items-start gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
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
                      {/* Servicios seleccionados: tarjeta compacta estilo Google Calendar */}
                      {nuevaCita.servicioIds.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {nuevaCita.servicioIds.map(sId => {
                            const srv = serviciosList.find(s => s.id === sId);
                            if (!srv) return null;
                            return (
                              <div key={sId} className="flex items-center gap-3 px-1 py-1 rounded-lg group">
                                <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-dark border border-gray-dark/60 flex items-center justify-center">
                                  <ImageRenderer url={srv.imagen || ""} alt={srv.nombre} className="w-full h-full border-0 bg-transparent" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm text-gray-lightest leading-tight truncate">{srv.nombre}</p>
                                  <p className="text-xs text-gray-lighter leading-tight">{formatearPrecio(srv.precio)} · {srv.duracion || 60} min</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleServicio(sId)}
                                  className="shrink-0 p-1 rounded-full text-gray-lighter hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Quitar servicio"
                                >
                                  <X className="w-3.5 h-3.5" />
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
                            .filter((h: any) => Number(h.barberoId) === Number(nuevaCita.barberoId) && h.estado === true)
                            .map((h: any) => String(h.dia))
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
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                    nuevaCita.fecha === fecha
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
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                    nuevaCita.hora === h
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
              <div className="flex items-start gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
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

                  {/* Barbero seleccionado: tarjeta compacta estilo Google Calendar */}
                  {nuevaCita.barberoId > 0 && (() => {
                    const b = barberosList.find((x: any) => x.id === nuevaCita.barberoId);
                    if (!b) return null;
                    const nombreCompleto = `${b.nombre} ${b.apellido || ''}`.trim();
                    return (
                      <div className="mt-2 flex items-center gap-3 px-1 py-1 rounded-lg">
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
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="border-t border-gray-dark/60 mx-4" />

              {/* ── Fila: Producto ── */}
              <div className="flex items-start gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
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
              <div className="flex items-start gap-0 py-3 px-2">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0 }} className="flex items-center justify-center pt-2">
                  <FileText className="w-5 h-5 text-gray-lighter" />
                </div>
                <div className="flex-1 min-w-0">
                  <textarea
                    value={nuevaCita.notas}
                    onChange={(e) => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Agregar notas o instrucciones especiales..."
                    className="w-full bg-transparent text-sm text-gray-lightest placeholder-gray-lighter resize-none focus:outline-none min-h-[60px]"
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
                  onClick={selectedCita ? handleUpdateCita : handleCreateCita}
                  className="px-4 py-2 text-sm font-medium bg-orange-primary text-white-primary rounded-lg hover:bg-orange-primary/90 disabled:opacity-50 transition-colors"
                >
                  {selectedCita ? 'Actualizar Cita' : 'Guardar'}
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
          <div className="std-card mb-4">
            {/* Fila de controles */}
            <div className="flex items-center gap-6">
              {/* Navegación izquierda */}
              <div className="flex items-center gap-2 flex-1">
                <button
                  onClick={() => { setCurrentWeek(currentWeek - 1); setCarouselPage(0); }}
                  className="elegante-button-secondary p-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 text-center">
                  <h3 className="text-lg font-semibold text-gray-lightest">
                    {currentWeek === 0 ? 'Esta Semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
                  </h3>
                  <p className="text-xs text-gray-light">
                    {getCurrentWeekDays()[0].fecha} - {getCurrentWeekDays()[6].fecha}
                  </p>
                </div>

                <button
                  onClick={() => { setCurrentWeek(currentWeek + 1); setCarouselPage(0); }}
                  className="elegante-button-secondary p-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Acciones derecha — Restaurados a la fila superior */}
              <div className="flex items-center gap-2 ml-10">
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
              const citasSemana = getCurrentWeekDays().flatMap(({ fechaCompleta }) =>
                getCitasPorDia(diasSemana[getCurrentWeekDays().findIndex(d => d.fechaCompleta === fechaCompleta)])
              ).sort((a, b) => {
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
                  {/* Contenedor de navegación del carrusel — alineado con el título de arriba */}
                  <div className="flex items-center gap-2 flex-1">
                    {/* Botón anterior — flecha blanca con borde sutil para alinear */}
                    <button
                      onClick={() => setCarouselPage(p => Math.max(0, p - 1))}
                      disabled={carouselPage === 0 || citasSemana.length === 0}
                      className={`shrink-0 transition-all rounded-lg p-2 border cursor-pointer ${
                        carouselPage === 0 || citasSemana.length === 0
                          ? 'bg-gray-darkest border-gray-dark/20 text-gray-dark cursor-not-allowed opacity-40'
                          : 'bg-gray-darker border-gray-dark text-gray-lightest hover:text-orange-primary hover:border-gray-medium'
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
                        <p className="flex-1 text-center text-sm text-gray-dark">Sin citas para esta semana</p>
                      ) : (
                        <>
                          {pageCitas.map((cita: any) => {
                          const servicio = formatNombre(cita.servicioNombre || cita.paqueteNombre || '—');
                          const subtitulo = [formatHoraStr12(cita.hora), formatNombre(cita.barberoNombre)].join(' — ');
                          const estadoColor =
                            cita.estado === 'Completada'
                                ? 'border-l-[3px] border-l-[#7aab8a]'
                                : cita.estado === 'Cancelada' || cita.estado === 'Anulada'
                                ? 'border-l-[3px] border-l-[#b07070]'
                                : 'border-l-[3px] border-l-orange-primary';
                            return (
                              <div
                                key={cita.id}
                                className={`flex-1 min-w-0 bg-gray-darker/40 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-dark/80 hover:border-gray-medium border border-transparent transition-all duration-200 ${estadoColor}`}
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

                    {/* Botón siguiente — flecha blanca con borde sutil para alinear */}
                    <button
                      onClick={() => setCarouselPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={carouselPage >= totalPages - 1 || citasSemana.length === 0}
                      className={`shrink-0 transition-all rounded-lg p-2 border cursor-pointer ${
                        carouselPage >= totalPages - 1 || citasSemana.length === 0
                          ? 'bg-gray-darkest border-gray-dark/20 text-gray-dark cursor-not-allowed opacity-40'
                          : 'bg-gray-darker border-gray-dark text-gray-lightest hover:text-orange-primary hover:border-gray-medium'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Métrica derecha para evitar duplicidad de botones y conservar ancho de layout */}
                  <div className="ml-10 w-[220px] shrink-0 flex justify-end">
                    <div className="rounded-lg border border-gray-dark bg-gray-darker/50 px-3 py-2 text-center min-w-[170px]">
                      <p className="text-[10px] uppercase tracking-widest text-gray-lighter">Total Semana</p>
                      <p className="text-sm text-gray-lightest tabular-nums">{citasSemana.length} citas</p>
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

                {/* Fila de headers de días — misma estructura que las filas del grid */}
                <div
                  className="grid gap-1 mb-2"
                  style={{ gridTemplateColumns: calendarGridTemplate }}
                >
                  <div />
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
                          <h4 className="text-sm tracking-[0.06em] uppercase text-gray-lightest leading-none font-bold">{dia.slice(0, 3)}</h4>
                          {discount > 0 && (
                            <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              -{discount}%
                            </span>
                          )}
                        </div>
                        <p className="text-sm tracking-[0.06em] text-gray-lightest">{fecha}</p>
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

                        // --- Lógica de slot fusionado (estilo Excel) ---
                        // Determinar si este slot es el inicio visible de una cita en la grilla.
                        // Un slot es "inicio visible" si:
                        //   a) La cita empieza exactamente en este slot, O
                        //   b) La cita empieza antes de este slot pero ese slot de inicio no está en la grilla
                        //      y este es el primer slot de la grilla que cubre la cita.

                        // Buscar la cita que "arranca" visualmente en este slot
                        // (puede haber varias citas solapadas; usamos slotCitaIndex para navegar entre ellas)
                        const slotKey = `${dayInfo?.fechaCompleta}-${hora}`;

                        // Citas cuyo slot de inicio visible es exactamente este slot
                        // Usamos el slot de grilla redondeado (floor al múltiplo de 0.5)
                        // para que citas con minutos extra (ej. 12:05) caigan en el slot correcto (12:00)
                        const citasQueArrancanAqui = citasEnSlot.filter(cita => {
                          const [hh, mm] = (cita.hora || '').split(':');
                          const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                          const citaInicioSlot = Math.floor(citaInicio * 2) / 2;
                          // Arranca en este slot (redondeado)
                          if (Math.abs(citaInicioSlot - hora) < 0.001) return true;
                          // O arranca antes pero su slot de inicio no está en la grilla
                          if (citaInicioSlot < hora) {
                            const startEnGrilla = horasDelDia.some(h => Math.abs(h - citaInicioSlot) < 0.001);
                            if (!startEnGrilla) {
                              const primerSlotGrilla = horasDelDia.find(h => h > citaInicioSlot);
                              return primerSlotGrilla !== undefined && Math.abs(primerSlotGrilla - hora) < 0.001;
                            }
                          }
                          return false;
                        });

                        // Citas que pasan por este slot pero arrancan en un slot anterior de la grilla
                        const citasOcupandoSlot = citasEnSlot.filter(cita => {
                          const [hh, mm] = (cita.hora || '').split(':');
                          const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                          const citaInicioSlot = Math.floor(citaInicio * 2) / 2;
                          if (Math.abs(citaInicioSlot - hora) < 0.001) return false; // arranca aquí, no "ocupa"
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
                            const inicioKey = `${dayInfo?.fechaCompleta}-${slotInicioVisible}`;
                            const citasEnInicio = getCitasEnSlot(dia, slotInicioVisible).filter(c => {
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

                        const estaOcupado = citasOcupandoSlot.length > 0 && citasQueArrancanAqui.length === 0;
                        const tieneInicio = citasQueArrancanAqui.length > 0;

                        // Para slots con inicio: seleccionar cuál cita mostrar (navegación con flechas)
                        const safeIdx = tieneInicio
                          ? (slotCitaIndex[slotKey] ?? 0) % citasQueArrancanAqui.length
                          : 0;
                        const citaEnCurso = tieneInicio ? citasQueArrancanAqui[safeIdx] : null;
                        const tieneMultiples = citasQueArrancanAqui.length > 1;

                        // Calcular altura del bloque fusionado (slots desde aquí hasta el fin de la cita)
                        const calcBlockHeight = (cita: typeof citaEnCurso) => {
                          if (!cita) return '100%';
                          const [hh, mm] = (cita.hora || '').split(':');
                          const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                          const citaFinExacta = citaInicio + (cita.duracion || 60) / 60;
                          // Número de slots completos que ocupa la cita desde este slot
                          // floor: no extender más allá del último slot que realmente ocupa
                          const slotsRestantes = Math.max(1, Math.floor((citaFinExacta - hora) / 0.5));
                          // gap-1 = 4px entre filas; cada fila h-20 = 5rem
                          return `calc(${slotsRestantes} * 5rem + ${slotsRestantes - 1} * 4px)`;
                        };

                        const citaEstado = citaEnCurso?.estado || 'Pendiente';
                        const citaBg = isPastSlot
                          ? citaEstado === 'Completada'
                              ? '#2e2e2e'
                              : '#2c2820'
                          : citaEstado === 'Completada'
                              ? '#2e2e2e'
                              : '#e8d5a8';
                        const citaBorder = isPastSlot
                          ? citaEstado === 'Completada'
                              ? 'rgba(80,80,80,0.4)'
                              : 'rgba(120,95,50,0.25)'
                          : citaEstado === 'Completada'
                              ? 'rgba(80,80,80,0.5)'
                              : 'rgba(160,120,60,0.4)';
                        const citaBorderLeft = isPastSlot
                          ? citaEstado === 'Completada'
                              ? 'rgba(90,90,90,0.6)'
                              : 'rgba(130,100,55,0.45)'
                          : citaEstado === 'Completada'
                              ? 'rgba(100,100,100,0.7)'
                              : '#a07830';
                        const citaTextPrimary = isPastSlot
                          ? citaEstado === 'Completada' ? '#555' : '#5a4a30'
                          : citaEstado === 'Completada' ? '#666'
                              : '#3d2000';
                        const citaTextSecondary = isPastSlot
                          ? citaEstado === 'Completada' ? '#484848' : '#4a3c24'
                          : citaEstado === 'Completada' ? '#555'
                              : '#5a3510';

                        // Key que incluye los índices de navegación de los slots que afectan a esta celda
                        // para forzar re-render cuando el usuario navega entre citas solapadas.
                        // IMPORTANTE: usar citaInicioSlot (redondeado al slot de grilla) para que coincida
                        // con el slotKey que usa slotCitaIndex — no el tiempo decimal exacto de la cita.
                        const relevantKeys = citasEnSlot.map(cita => {
                          const [hh, mm] = (cita.hora || '').split(':');
                          const citaInicio = parseInt(hh) + parseInt(mm || '0') / 60;
                          const citaInicioSlot = Math.floor(citaInicio * 2) / 2;
                          const inicioKey = `${dayInfo?.fechaCompleta}-${citaInicioSlot}`;
                          return slotCitaIndex[inicioKey] ?? 0;
                        }).join('-');

                        // Un slot con tieneInicio pero también con citasOcupandoSlot activas
                        // debe comportarse como ocupado visualmente (el bloque de la cita anterior lo cubre)
                        const bloqueVisible = tieneInicio && citasOcupandoSlot.length === 0;

                        return (
                          <div
                            key={`${dia}-${hora}-${relevantKeys}`}
                            className={`min-w-0 transition-all duration-200 ${
                              estaOcupado || (tieneInicio && citasOcupandoSlot.length > 0)
                                ? 'relative' // transparente — cubierto por bloque del slot anterior
                                : bloqueVisible
                                  ? 'relative cursor-pointer overflow-visible'
                                  : isPastSlot
                                    ? 'relative rounded border bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-60'
                                    : 'relative rounded border bg-gray-darker border-gray-dark hover:bg-gray-dark hover:border-orange-primary/50 cursor-pointer group'
                            }`}
                            onClick={(e) => {
                              if (bloqueVisible && citaEnCurso) {
                                const [hStr, mStr] = (citaEnCurso.hora || '09:00').split(':');
                                const horaNum = parseInt(hStr) + parseInt(mStr) / 60;
                                const fechaObj = new Date(`${dayInfo?.fechaCompleta}T12:00:00`);
                                const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                                openCitaPopover(
                                  citaEnCurso,
                                  { dia: diaStr, hora: horaNum, fecha: dayInfo?.fechaCompleta || '' },
                                  e.currentTarget.getBoundingClientRect()
                                );
                              } else if (!estaOcupado && !(tieneInicio && citasOcupandoSlot.length > 0) && !isPastSlot) {
                                handleSlotClick(dia, hora);
                              }
                            }}
                          >
                            {/* Slot vacío hover */}
                            {!tieneInicio && !estaOcupado && !isPastSlot && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-orange-primary/10 backdrop-blur-[1px] z-0 rounded">
                                <div className="bg-orange-primary/20 p-1.5 rounded-full border border-orange-primary/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                  <Plus className="w-4 h-4 text-orange-primary" />
                                </div>
                              </div>
                            )}

                            {/* Bloque fusionado: solo se renderiza si no hay una cita de un slot anterior cubriéndolo */}
                            {tieneInicio && citaEnCurso && citasOcupandoSlot.length === 0 && (
                              <div
                                className={`absolute left-0 top-0 z-10 cita-calendar-block${citaEnCurso.id === highlightedCitaId ? ' cita-notification-highlight' : ''}`}
                                style={{
                                  width: '100%',
                                  height: calcBlockHeight(citaEnCurso),
                                  overflow: 'visible',
                                }}
                              >
                                {/* Fondo y borde del bloque — separado del wrapper para no recortar los botones */}
                                <div
                                  className="absolute inset-0 flex flex-col cursor-pointer"
                                  style={{
                                    background: citaBg,
                                    border: `1px solid ${citaBorder}`,
                                    borderLeft: `3px solid ${citaBorderLeft}`,
                                    borderRadius: '6px',
                                    overflow: 'hidden',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const [hStr, mStr] = (citaEnCurso.hora || '09:00').split(':');
                                    const horaNum = parseInt(hStr) + parseInt(mStr) / 60;
                                    const fechaObj = new Date(`${dayInfo?.fechaCompleta}T12:00:00`);
                                    const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                                    openCitaPopover(
                                      citaEnCurso,
                                      { dia: diaStr, hora: horaNum, fecha: dayInfo?.fechaCompleta || '' },
                                      e.currentTarget.getBoundingClientRect()
                                    );
                                  }}
                                >
                                  {/* Texto centrado en el bloque completo */}
                                  <div className="flex-1 flex flex-col items-center justify-center px-1 gap-0.5 min-h-0">
                                    <span
                                      style={{ color: citaTextPrimary }}
                                      className="text-[10px] leading-tight text-center w-full truncate font-bold"
                                    >
                                      {formatNombre((citaEnCurso.clienteNombre || 'Cliente').split(' ')[0])}
                                    </span>
                                    <span
                                      style={{ color: citaTextSecondary }}
                                      className="text-[9px] leading-tight text-center w-full truncate"
                                    >
                                      {formatNombre(citaEnCurso.servicioNombre || citaEnCurso.paqueteNombre || (citaEnCurso.serviciosNombres?.[0]) || 'Servicio')}
                                    </span>
                                    {citaEnCurso.barberoNombre && (
                                      <span
                                        style={{ color: citaTextSecondary }}
                                        className="text-[9px] leading-tight text-center w-full truncate"
                                      >
                                        {formatNombre(citaEnCurso.barberoNombre.split(' ')[0])}
                                      </span>
                                    )}
                                  </div>

                                  {citaEnCurso.estado === 'Completada' && (
                                    <div className="absolute bottom-0 left-0 h-0.5 bg-blue-600 w-full" />
                                  )}
                                </div>

                                {/* Navegación entre citas solapadas — en el wrapper con overflow:visible, fuera del div con overflow:hidden */}
                                {tieneMultiples && (
                                  <div
                                    className="absolute top-0 right-0 z-20 flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => navegarCitaEnSlot(slotKey, citasQueArrancanAqui.length, 'prev', e)}
                                      className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80 transition-opacity"
                                      style={{ color: citaTextPrimary, background: citaBg, border: `1px solid ${citaBorder}` }}
                                      aria-label="Cita anterior"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <span
                                      className="text-[9px] leading-none select-none px-0.5 font-bold"
                                      style={{ color: citaTextPrimary, background: citaBg }}
                                      title={`${citasQueArrancanAqui.length} citas en esta franja`}
                                    >
                                      {safeIdx + 1}/{citasQueArrancanAqui.length}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => navegarCitaEnSlot(slotKey, citasQueArrancanAqui.length, 'next', e)}
                                      className="flex items-center justify-center w-5 h-5 rounded hover:opacity-80 transition-opacity"
                                      style={{ color: citaTextPrimary, background: citaBg, border: `1px solid ${citaBorder}` }}
                                      aria-label="Cita siguiente"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
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

      {/* Popover flotante de detalle de cita — estilo Google Calendar */}
      {isSlotModalOpen && popoverPosition && createPortal(
        <>
          {/* Backdrop con pointer-events:none — permite scroll y clicks en el calendario.
              El cierre por click fuera lo gestiona el handler mousedown a nivel document. */}
          <div
            className="fixed inset-0 pointer-events-none"
            style={{ background: 'transparent', zIndex: 9998 }}
          />
          <div
            ref={popoverRef}
            className="fixed flex flex-col rounded-2xl border border-gray-dark/60 bg-gray-darkest overflow-hidden"
            style={{
              top: popoverPosition.top,
              left: popoverPosition.left,
              width: POPOVER_WIDTH,
              maxHeight: 'calc(100vh - 16px)',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35)',
              zIndex: 9999,
              isolation: 'isolate',
              // Animación: 'enter' arranca opaco 0 y desplazado hacia el bloque,
              // 'open' termina en posición final con opacidad 1, 'exit' es solo fade-out.
              opacity: popoverPhase === 'open' ? 1 : 0,
              transform:
                popoverPhase === 'enter'
                  ? `translateX(${popoverSide === 'right' ? -10 : 10}px) scale(0.97)`
                  : 'translateX(0) scale(1)',
              transformOrigin: popoverSide === 'right' ? 'left center' : 'right center',
              transition: `opacity ${POPOVER_ANIM_MS}ms ease-out, transform ${POPOVER_ANIM_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
              willChange: 'opacity, transform',
            }}
          >
          {/* Barra superior: hora del slot + botón cerrar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark bg-gray-darker/50 shrink-0">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-primary" />
              <span className="text-sm font-semibold text-gray-lightest">
                {selectedSlot && `${selectedSlot.dia} · ${formatHora12(selectedSlot.hora)}`}
              </span>
            </div>
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

              {/* ── Separador ── */}
              <div className="border-t border-gray-dark/60 mb-1" />

              {/* ── Fila: Fecha y hora ── */}
              <div className="flex items-center gap-0 py-3">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <div className="flex items-center gap-0 py-3">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <div className="flex items-center gap-0 py-3">
                <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                      <p className="text-sm text-gray-lightest">
                        {detalleServicios.map((s: any) => formatNombre(s.nombre)).join(', ')}
                      </p>
                      {detalleServicios.some((s: any) => s.duracion) && (
                        <p className="text-xs text-gray-lighter mt-0.5">
                          {detalleServicios.filter((s: any) => s.duracion).map((s: any) => `${s.nombre}: ${s.duracion} min`).join(' · ')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-lighter">Sin servicios registrados</p>
                  )}
                </div>
              </div>

              {/* ── Fila: Productos (si hay) ── */}
              {detalleProductos.length > 0 && (
                <div className="flex items-center gap-0 py-3">
                  <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingBag className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-lightest">
                      {detalleProductos.map((p: any) =>
                        p.cantidad > 1 ? `${formatNombre(p.nombre)} ×${p.cantidad}` : formatNombre(p.nombre)
                      ).join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Fila: Notas (si hay) ── */}
              {selectedCita.notas && (
                <div className="flex items-center gap-0 py-3">
                  <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <p className="text-sm text-gray-lighter leading-relaxed">{selectedCita.notas}</p>
                </div>
              )}

              {/* ── Fila: Teléfono cliente (si hay) ── */}
              {selectedCita.telefono && (
                <div className="flex items-center gap-0 py-3">
                  <div style={{ width: 72, minWidth: 72, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone className="w-5 h-5 text-gray-lighter" />
                  </div>
                  <p className="text-sm text-gray-lightest">{selectedCita.telefono}</p>
                </div>
              )}

              {/* ── Separador ── */}
              <div className="border-t border-gray-dark/60 mt-1" />

              {/* ── Acciones ── */}
              {selectedCita.estado !== 'Completada' && (
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => handleChangeEstado(selectedCita.id, 'Cancelada')}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-600/10 border border-transparent hover:border-red-500/30 transition-all"
                  >
                    Cancelar cita
                  </button>
                  <button
                    onClick={() => handleChangeEstado(selectedCita.id, 'Completada')}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-primary text-black-primary hover:bg-orange-primary/90 transition-all"
                  >
                    Completar
                  </button>
                </div>
              )}
            </div>
            );
          })() : null}

          </div>
        </div>
        </>,
        document.body
      )}

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

      {/* Dialog para configurar descuentos de días */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="bg-gray-darkest border-orange-primary max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2 text-xl">
              <Calendar className="w-6 h-6 text-orange-primary" />
              Descuento Especial
            </DialogTitle>
            <DialogDescription className="text-gray-lightest pt-2">
              <strong>Días afectados:</strong> {Array.from(selectedDates).join(", ")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4 overflow-hidden flex-1 flex flex-col">
            {/* Custom Tabs */}
            <div className="flex border-b border-gray-dark shrink-0">
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'descuento' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('descuento')}
              >
                Configurar Descuento
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'barberos' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('barberos')}
              >
                Barberos
              </button>
              <button
                className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeModalDiscountTab === 'citas' ? 'border-orange-primary text-orange-primary bg-orange-primary/5' : 'border-transparent text-gray-lighter hover:text-white hover:bg-gray-dark/50'}`}
                onClick={() => setActiveModalDiscountTab('citas')}
              >
                Citas
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

                    const barberosEnDias = barberosList.filter(b => {
                      return horariosList.some(h => 
                        h.barberoId === b.id && h.estado && diasSeleccionadosList.includes(h.dia)
                      );
                    });

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
                             {horariosList.filter(h => h.barberoId === barbero.id && h.estado && diasSeleccionadosList.includes(h.dia)).map((h, i) => (
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
              <Input
                type="time"
                value={editHorarioStart}
                onChange={e => setEditHorarioStart(e.target.value)}
                className="elegante-input w-full"
                disabled={isSavingHorario}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white-primary text-sm">Hora de Fin</Label>
              <Input
                type="time"
                value={editHorarioEnd}
                onChange={e => setEditHorarioEnd(e.target.value)}
                className="elegante-input w-full"
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
