import { useState, useEffect } from "react";
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
import { Calendar, Clock, User, Edit, Trash2, Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal, ShoppingBag, Scissors, Package, FileText, CalendarDays, Plus, Minus, X } from "lucide-react";
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
  { value: "Confirmada", label: "Confirmada", color: "bg-orange-primary text-black-primary" },
  { value: "En Proceso", label: "En Proceso", color: "bg-green-600" },
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
  const [carouselPage, setCarouselPage] = useState(0);
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

  // Estados para el modal de gestión de franja horaria
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
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

  useEffect(() => {
    if (!onSubNavChange) return;

    if (viewMode === 'crear') {
      onSubNavChange({
        title: selectedCita ? 'Editar Cita' : 'Nueva Cita',
        subtitle: 'Completa la información del agendamiento',
        onBack: () => {
          setViewMode('calendar');
          setSelectedCita(null);
          setShowFormErrors(false);
        },
        backTitle: 'Volver al Calendario',
        icon: <CalendarDays className="w-5 h-5" />,
        iconContainerClassName: 'text-orange-primary',
      });
      return;
    }

    onSubNavChange(null);
  }, [viewMode, selectedCita, onSubNavChange]);

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

      setViewMode('crear');
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

    setViewMode('crear');
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
      const horaSplit = (cita.hora || '').split(':');
      const horaInicio = parseInt(horaSplit[0] || '0') + (parseInt(horaSplit[1] || '0') / 60);
      const horaFin = horaInicio + (cita.duracion || 60) / 60;
      return horaInicio <= hora && hora < horaFin;
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
      case 'Confirmada': return '#d8b081';
      case 'En Proceso': return '#22C55E';
      case 'Completada': return '#3B82F6';
      case 'Cancelada': return '#EF4444';
      case 'Pendiente': return '#d8b081';
      default: return '#d8b081';
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

  // Manejar clic en celda del calendario
  const handleSlotClick = (dia: string, hora: number) => {
    const weekDays = getCurrentWeekDays();
    const dayInfo = weekDays.find(d => d.dia === dia);

    setSelectedSlot({
      dia,
      hora,
      fecha: dayInfo?.fechaCompleta || ''
    });

    // Preparar formulario para nueva cita
    const h = Math.floor(hora);
    const m = (hora % 1) * 60;
    const horaString = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
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

    setActiveTab('lista');
    setSlotSearchTerm("");
    setSlotFilterEstado("all");
    setIsSlotModalOpen(true);
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
      setViewMode('calendar');
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
      setViewMode('crear');
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
      setViewMode('calendar');
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
    setActiveTab('detalle');
  };

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
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-primary text-xl animate-pulse">Cargando datos...</div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA DE CREAR / EDITAR CITA (inline, no modal) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'crear' && (
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          {/* Master-Detail Layout */}
          <div
            className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 flex-1 min-h-0 overflow-hidden"
            style={{ gridTemplateRows: 'minmax(0, 1fr)' }}
          >
            {/* ── Panel Izquierdo: Formulario ── */}
            <aside className="min-h-0 min-w-0">
              <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-0">
                  {/* Fila 1: Cliente y Barbero */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 border-b border-gray-dark pb-10 px-2">
                    {/* Sección: Cliente */}
                    <div className="space-y-0 px-2">
                      <FormSection title="Cliente" icon={<User className="w-4 h-4 text-orange-primary" />}>
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
                            <div>
                              <p className="text-white-primary text-sm font-medium">{c.nombre}</p>
                              <p className="text-gray-lighter text-xs">{c.telefono || 'Sin teléfono'}</p>
                            </div>
                          )}
                          isSelected={!!nuevaCita.clienteId}
                          error={showFormErrors && !nuevaCita.clienteId ? 'Selecciona un cliente' : undefined}
                        />
                        {nuevaCita.telefono && (
                          <div className="mt-2">
                            <Label className="text-xs text-gray-lighter">Teléfono</Label>
                            <p className="text-sm text-white-primary">{nuevaCita.telefono}</p>
                          </div>
                        )}
                      </FormSection>
                    </div>

                    {/* Sección: Barbero */}
                    <div className="pt-8 md:pt-0 px-2">
                      <FormSection title="Barbero" icon={<User className="w-4 h-4 text-orange-primary" />}>
                        <SearchField<any>
                          label="Buscar barbero"
                          placeholder="Nombre del barbero..."
                          value={barberoFormSearchTerm}
                          onChange={setBarberoFormSearchTerm}
                          items={barberosList}
                          filterFn={(b, term) => (b.nombre || '').toLowerCase().includes(term.toLowerCase())}
                          onSelect={(b) => {
                            setNuevaCita(prev => ({ ...prev, barberoId: b.id, barbero: b.nombre }));
                            setBarberoFormSearchTerm(b.nombre);
                          }}
                          onClear={() => {
                            setNuevaCita(prev => ({ ...prev, barberoId: 0, barbero: '' }));
                            setBarberoFormSearchTerm('');
                          }}
                          renderItem={(b) => (
                            <p className="text-white-primary text-sm">{b.nombre}</p>
                          )}
                          isSelected={!!nuevaCita.barberoId}
                          error={showFormErrors && !nuevaCita.barberoId ? 'Selecciona un barbero' : undefined}
                        />
                      </FormSection>
                    </div>
                  </div>

                  {/* Fila 2: Servicios y Paquetes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10 border-b border-gray-dark py-10 px-2">
                    {/* Sección: Servicios */}
                    <div className="space-y-0 px-2">
                      <FormSection title="Servicios" icon={<Scissors className="w-4 h-4 text-orange-primary" />}>
                        {nuevaCita.paqueteId ? (
                          <p className="text-xs text-gray-lighter">Desactiva el paquete para seleccionar servicios individuales</p>
                        ) : (
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
                              error={showFormErrors && nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId ? 'Selecciona al menos un servicio o paquete' : undefined}
                            />
                          </>
                        )}
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
                                  {!nuevaCita.paqueteId && (
                                    <button
                                      type="button"
                                      onClick={() => toggleServicio(sId)}
                                      className="ml-1 hover:text-red-400 transition-colors"
                                      title="Quitar servicio"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </FormSection>
                    </div>

                    {/* Sección: Paquetes */}
                    <div className="pt-8 md:pt-0 px-2">
                      <FormSection title="Paquetes" icon={<Package className="w-4 h-4 text-orange-primary" />}>
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
                            dropUp
                          />
                        )}
                      </FormSection>
                    </div>
                  </div>

                  {/* Resto de secciones (Full width) */}
                  <div className="divide-y divide-gray-dark">
                    {/* Sección: Productos */}
                    {(nuevaCita.servicioIds.length > 0 || nuevaCita.paqueteId) && productosList.length > 0 && (
                      <div className="py-10">
                        <FormSection title="Productos adicionales" icon={<ShoppingBag className="w-4 h-4 text-orange-primary" />}>
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
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                    <ImageRenderer url={p.imagenProduc || ""} alt={p.nombre} className="w-full h-full border-0 bg-transparent" fallbackVariant="product" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white-primary text-sm font-medium truncate">{p.nombre}</p>
                                    <p className="text-gray-lighter text-xs">Stock: {p.stockVentas}{cantActual > 0 ? ` · Ya agregado: ${cantActual}` : ''}</p>
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precioVenta || p.precio || 0)}</span>
                                </div>
                              );
                            }}
                            dropUp
                          />
                          {/* Productos seleccionados con control de cantidad */}
                          {Object.keys(nuevaCita.productoCantidades).length > 0 && (
                            <div className="space-y-2 mt-2">
                              {Object.entries(nuevaCita.productoCantidades).map(([idStr, cantidad]) => {
                                const pId = Number(idStr);
                                const prod = productosList.find(p => p.id === pId);
                                if (!prod) return null;
                                const precioUnit = Number(prod.precioVenta || prod.precio || 0);
                                return (
                                  <div key={pId} className="flex items-center gap-2 bg-orange-primary/10 border border-orange-primary/20 rounded-lg px-3 py-2">
                                    <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                      <ImageRenderer url={prod.imagenProduc || ""} alt={prod.nombre} className="w-full h-full border-0 bg-transparent" fallbackVariant="product" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white-primary text-xs font-medium truncate">{prod.nombre}</p>
                                      <p className="text-orange-primary text-[10px] font-bold">{formatearPrecio(precioUnit)} c/u</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => removeProducto(pId)}
                                        className="w-6 h-6 rounded-full bg-gray-dark hover:bg-gray-darker flex items-center justify-center text-white-primary transition-colors"
                                        title="Disminuir cantidad"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <span className="text-white-primary text-sm font-bold w-6 text-center">{cantidad}</span>
                                      <button
                                        type="button"
                                        onClick={() => addProducto(pId)}
                                        className="w-6 h-6 rounded-full bg-orange-primary/30 hover:bg-orange-primary/50 flex items-center justify-center text-orange-primary transition-colors"
                                        title="Aumentar cantidad"
                                        disabled={cantidad >= (prod.stockVentas || 99)}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <span className="text-orange-primary text-xs font-bold shrink-0 w-16 text-right">{formatearPrecio(precioUnit * cantidad)}</span>
                                    <button
                                      type="button"
                                      onClick={() => quitarProducto(pId)}
                                      className="ml-1 text-gray-lighter hover:text-red-400 transition-colors shrink-0"
                                      title="Quitar producto"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </FormSection>
                      </div>
                    )}

                    {/* Sección: Fecha y Hora */}
                    <div className="py-10">
                      <FormSection title="Fecha y Hora" icon={<CalendarDays className="w-4 h-4 text-orange-primary" />}>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                          <div>
                            <Label className="text-xs text-gray-lighter">Fecha</Label>
                            <Input
                              type="date"
                              value={nuevaCita.fecha}
                              onChange={e => setNuevaCita(prev => ({ ...prev, fecha: e.target.value }))}
                              className="elegante-input"
                            />
                            {showFormErrors && !nuevaCita.fecha && <p className="text-red-400 text-xs mt-1">Requerido</p>}
                          </div>
                          <div>
                            <Label className="text-xs text-gray-lighter">Hora</Label>
                            {nuevaCita.barberoId && nuevaCita.fecha ? (
                              <Select value={nuevaCita.hora} onValueChange={v => setNuevaCita(prev => ({ ...prev, hora: v }))}>
                                <SelectTrigger className="elegante-input">
                                  <SelectValue placeholder="Seleccionar hora" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-darkest border-gray-dark max-h-52">
                                  {getHorasDisponiblesParaDia(nuevaCita.fecha, nuevaCita.barberoId, nuevaCita.duracion).map(h => (
                                    <SelectItem key={h} value={h} className="text-white-primary">{h}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type="time"
                                value={nuevaCita.hora}
                                onChange={e => setNuevaCita(prev => ({ ...prev, hora: e.target.value }))}
                                className="elegante-input"
                              />
                            )}
                            {showFormErrors && !nuevaCita.hora && <p className="text-red-400 text-xs mt-1">Requerido</p>}
                          </div>
                          <div>
                            <Label className="text-xs text-gray-lighter">Duración (min)</Label>
                            <Input
                              type="number"
                              value={nuevaCita.duracion}
                              onChange={e => setNuevaCita(prev => ({ ...prev, duracion: parseInt(e.target.value) || 60 }))}
                              className="elegante-input"
                              min={15} step={15}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-lighter">Estado</Label>
                            <Select value={nuevaCita.estado} onValueChange={v => setNuevaCita(prev => ({ ...prev, estado: v }))}>
                              <SelectTrigger className="elegante-input">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-darkest border-gray-dark">
                                {estados.map(e => (
                                  <SelectItem key={e.value} value={e.value} className="text-white-primary">{e.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </FormSection>
                    </div>

                    {/* Sección: Notas */}
                    <div className="py-10 border-b border-gray-dark">
                      <FormSection title="Notas" icon={<FileText className="w-4 h-4 text-orange-primary" />}>
                        <div className="grid grid-cols-1">
                          <Textarea
                            value={nuevaCita.notas}
                            onChange={e => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                            placeholder="Notas adicionales..."
                            className="elegante-input min-h-[80px]"
                          />
                        </div>
                      </FormSection>
                    </div>
                  </div>
                </div>

                {/* Footer fijo con botones */}
                <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
                  <button
                    onClick={() => { setViewMode('calendar'); setSelectedCita(null); setShowFormErrors(false); }}
                    className="elegante-button-secondary py-3 px-8"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={selectedCita ? handleUpdateCita : handleCreateCita}
                    className="elegante-button-primary py-3 px-8 flex items-center gap-2"
                  >
                    <CalendarDays className="w-4 h-4" />
                    {selectedCita ? 'Actualizar Cita' : 'Crear Cita'}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Panel Derecho: Resumen ── */}
            <section className="min-h-0 min-w-0">
              <div className="elegante-card h-full min-h-0 overflow-hidden flex flex-col p-0">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-r from-orange-primary/20 to-orange-primary/5 border-b border-gray-dark px-5 py-4">
                  <h3 className="text-white-primary font-bold text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-primary" />
                    Resumen de la Cita
                  </h3>
                  <p className="text-xs text-gray-lighter mt-1">Vista previa de los datos seleccionados</p>
                </div>

                {/* Contenido scrollable */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
                  {/* Cliente */}
                  {nuevaCita.clienteId > 0 && (
                    <div className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Cliente</p>
                      <p className="text-white-primary font-semibold">{nuevaCita.cliente}</p>
                      {nuevaCita.telefono && <p className="text-xs text-gray-lighter">{nuevaCita.telefono}</p>}
                    </div>
                  )}

                  {/* Servicios seleccionados */}
                  {nuevaCita.servicioIds.length > 0 && !nuevaCita.paqueteId && (
                    <div>
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-2">
                        Servicios ({nuevaCita.servicioIds.length})
                      </p>
                      <div className="space-y-2">
                        {nuevaCita.servicioIds.map(sId => {
                          const srv = serviciosList.find(s => s.id === sId);
                          if (!srv) return null;
                          return (
                            <div key={sId} className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                  <ImageRenderer url={srv.imagen || ""} alt={srv.nombre} className="w-full h-full border-0 bg-transparent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white-primary text-sm font-medium truncate">{srv.nombre}</span>
                                    <span className="text-orange-primary text-sm font-bold shrink-0 ml-2">{formatearPrecio(srv.precio)}</span>
                                  </div>
                                  {srv.descripcion && (
                                    <p className="text-xs text-gray-lighter mt-0.5 italic truncate">{srv.descripcion}</p>
                                  )}
                                  <p className="text-[10px] text-gray-lighter mt-0.5">{srv.duracion || 60} min</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paquete seleccionado */}
                  {nuevaCita.paqueteId && (() => {
                    const paq = paquetesList.find(p => p.id === nuevaCita.paqueteId);
                    if (!paq) return null;
                    return (
                      <div>
                        <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-2">Paquete</p>
                        <div className="bg-gray-darker rounded-lg p-3 border border-orange-primary/30">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-orange-primary" />
                              <span className="text-white-primary font-semibold text-sm">{paq.nombre}</span>
                            </div>
                            <span className="text-orange-primary font-bold text-sm">{formatearPrecio(paq.precio)}</span>
                          </div>
                          {paq.descripcion && (
                            <p className="text-xs text-gray-lighter mt-1 ml-6 italic">{paq.descripcion}</p>
                          )}
                          {paq.precioOriginal && paq.precioOriginal > paq.precio && (
                            <p className="text-[10px] text-gray-lighter mt-1 ml-6">
                              Precio original: <span className="line-through">{formatearPrecio(paq.precioOriginal)}</span>
                              {' '}— Ahorras {formatearPrecio(paq.precioOriginal - paq.precio)}
                            </p>
                          )}
                          {/* Servicios incluidos en el paquete */}
                          {paq.servicios && paq.servicios.length > 0 && (
                            <div className="mt-3 ml-6 pt-2 border-t border-gray-dark/50">
                              <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Servicios incluidos</p>
                              <div className="space-y-1">
                                {paq.servicios.map((sName: string, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <Scissors className="w-3 h-3 text-orange-primary/60" />
                                    <span className="text-xs text-gray-lightest">{sName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-lighter mt-1 ml-6">{paq.duracion || 60} min</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Productos seleccionados */}
                  {Object.keys(nuevaCita.productoCantidades).length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-2">
                        Productos ({Object.values(nuevaCita.productoCantidades).reduce((a, b) => a + b, 0)})
                      </p>
                      <div className="space-y-2">
                        {Object.entries(nuevaCita.productoCantidades).map(([idStr, cantidad]) => {
                          const pId = Number(idStr);
                          const prod = productosList.find(p => p.id === pId);
                          if (!prod) return null;
                          const precioUnit = Number(prod.precioVenta || prod.precio || 0);
                          return (
                            <div key={pId} className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                  <ImageRenderer url={prod.imagenProduc || ""} alt={prod.nombre} className="w-full h-full border-0 bg-transparent" fallbackVariant="product" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-white-primary text-sm font-medium truncate block">{prod.nombre}</span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-orange-primary text-sm font-bold">{formatearPrecio(precioUnit * cantidad)}</span>
                                    {cantidad > 1 && (
                                      <span className="text-gray-lighter text-[10px]">({cantidad} × {formatearPrecio(precioUnit)})</span>
                                    )}
                                  </div>
                                </div>
                                <span className="bg-orange-primary/20 text-orange-primary text-xs font-bold px-2 py-0.5 rounded-full">{cantidad}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Barbero */}
                  {nuevaCita.barberoId > 0 && (
                    <div className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Barbero</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-orange-primary" />
                        <span className="text-white-primary font-medium text-sm">{nuevaCita.barbero}</span>
                      </div>
                    </div>
                  )}

                  {/* Horario */}
                  {(nuevaCita.fecha || nuevaCita.hora) && (
                    <div className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Horario</p>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-orange-primary" />
                        <span className="text-white-primary text-sm">
                          {nuevaCita.fecha && new Date(nuevaCita.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {nuevaCita.hora && ` — ${nuevaCita.hora}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-lighter mt-1 ml-6">Duración: {nuevaCita.duracion} min</p>
                    </div>
                  )}

                  {/* Estado */}
                  <div className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                    <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Estado</p>
                    <div className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${getEstadoInfo(nuevaCita.estado).color} text-white`}>
                      {getEstadoInfo(nuevaCita.estado).label}
                    </div>
                  </div>

                  {/* Notas */}
                  {nuevaCita.notas && (
                    <div className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-1">Notas</p>
                      <p className="text-gray-lightest text-xs italic">"{nuevaCita.notas}"</p>
                    </div>
                  )}
                </div>

                {/* Footer Sticky con Total */}
                <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90">
                  <div
                    className="flex justify-between items-center rounded-lg px-4 py-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(174,120,14,0.15) 0%, rgba(244,194,69,0.08) 100%)',
                      border: '1px solid rgba(244,194,69,0.25)',
                    }}
                  >
                    <span className="text-white-primary font-bold text-base tracking-wide">TOTAL</span>
                    <span className="text-orange-primary font-bold text-2xl tabular-nums">{formatearPrecio(nuevaCita.precio)}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* VISTA DE CALENDARIO */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {viewMode === 'calendar' && (
        <div className="p-2">

          {/* Stats Cards */}
          <div style={{ display: 'none' }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="elegante-card text-center">
              <Calendar className="w-8 h-8 text-orange-primary mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-white-primary mb-1">{totalCitas}</h4>
              <p className="text-gray-lightest text-sm">Total Citas</p>
            </div>
            <div className="elegante-card text-center">
              <Clock className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-white-primary mb-1">{citasActivas}</h4>
              <p className="text-gray-lightest text-sm">Citas Activas</p>
            </div>
            <div className="elegante-card text-center">
              <User className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <h4 className="text-2xl font-bold text-white-primary mb-1">{citasHoy}</h4>
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
                  onClick={() => {
                    const { fecha, hora } = getAutoDateTime();
                    setSelectedCita(null);
                    setShowFormErrors(false);
                    setClienteSearchTerm('');
                    setBarberoFormSearchTerm('');
                    setNuevaCita({
                      clienteId: 0, cliente: '', telefono: '',
                      servicioId: null, servicioIds: [], productoCantidades: {},
                      paqueteId: null, servicio: '', barberoId: 0, barbero: '',
                      fecha, hora, duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
                    });
                    setViewMode('crear');
                  }}
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
                      className="shrink-0 text-white-primary hover:text-orange-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed bg-gray-darker border border-gray-dark hover:border-gray-medium rounded-lg p-2"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {/* Tarjetas — ocupan el espacio central */}
                    <div className="flex-1 flex gap-3 min-w-0 pr-20">
                      {citasSemana.length === 0 ? (
                        <p className="flex-1 text-center text-sm text-gray-dark">Sin citas para esta semana</p>
                      ) : (
                        <>
                          {pageCitas.map((cita: any) => {
                          const servicio = formatNombre(cita.servicioNombre || cita.paqueteNombre || '—');
                          const subtitulo = [formatHoraStr12(cita.hora), formatNombre(cita.barberoNombre)].join(' — ');
                          const estadoColor =
                            cita.estado === 'Completada' || cita.estado === 'Confirmada'
                                ? 'border-l-[3px] border-l-[#7aab8a]'
                                : cita.estado === 'Cancelada' || cita.estado === 'Anulada'
                                ? 'border-l-[3px] border-l-[#b07070]'
                                : 'border-l-[3px] border-l-orange-primary';
                            return (
                              <div
                                key={cita.id}
                                className={`flex-1 min-w-0 bg-gray-darker/40 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-dark/80 hover:border-gray-medium border border-transparent transition-all duration-200 ${estadoColor}`}
                                onClick={() => {
                                  setSelectedCita(cita);
                                  // Determinar el slot para que el título del modal sea correcto
                                  const [hStr, mStr] = (cita.hora || '09:00').split(':');
                                  const horaNum = parseInt(hStr) + (parseInt(mStr) / 60);
                                  const fechaObj = new Date(`${cita.fecha}T12:00:00`);
                                  const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7]; // Ajuste de Domingo(0) a Lunes(0)
                                  
                                  setSelectedSlot({ 
                                    dia: diaStr, 
                                    hora: horaNum, 
                                    fecha: cita.fecha 
                                  });
                                  
                                  setActiveTab('detalle');
                                  setIsSlotModalOpen(true);
                                }}
                              >
                                <p className="text-sm font-normal text-gray-lightest truncate leading-tight">
                                  {formatNombre(cita.clienteNombre)}
                                </p>
                                <p className="text-xs text-gray-lighter/80 truncate mt-0.5 leading-tight font-normal">
                                  {servicio}
                                </p>
                                <p className="text-[11px] text-gray-light mt-1 leading-tight font-normal tracking-tight">
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
                      className="shrink-0 text-white-primary hover:text-orange-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed bg-gray-darker border border-gray-dark hover:border-gray-medium rounded-lg p-2"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Métrica derecha para evitar duplicidad de botones y conservar ancho de layout */}
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

          {/* Carrusel de días — citas por día de la semana */}
          <div className="std-card mb-0">
            <div
              className="grid gap-1 py-3"
              style={{ gridTemplateColumns: calendarGridTemplate }}
            >
              <div />
              {getCurrentWeekDays().map(({ dia, fecha, fechaCompleta }) => {
                const isSelected = selectedDates.has(fechaCompleta);
                const discount = dayDiscounts[fechaCompleta];
                return (
                  <div
                    key={dia}
                    className={`min-w-0 text-center cursor-pointer transition-all duration-200 rounded-lg py-3 px-2 border-2 ${
                      isSelected ? 'border-orange-primary bg-orange-primary/10' : 'border-transparent hover:bg-gray-darker'
                    }`}
                    onClick={() => handleDateSelect(fechaCompleta)}
                  >
                    <div className="flex justify-center items-center gap-1">
                      <h4 className="text-sm font-bold tracking-[0.06em] uppercase text-gray-lightest">{dia.slice(0, 3)}</h4>
                      {discount > 0 && (
                        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold tracking-[0.06em] text-gray-lightest">{fecha}</p>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Grid de horarios */}
          <div className="std-card mb-0">
            <div className="w-full pb-4 pt-3">
              <div className="-mx-6 pl-3 pr-6">
                {(() => {
                  const weekDays = getCurrentWeekDays();
                  const todayStr = toLocalDateString(new Date());
                  return horasDelDia.map((hora) => (
                    <div
                      key={hora}
                      className="grid gap-1 h-14"
                      style={{ gridTemplateColumns: calendarGridTemplate }}
                    >
                      <div className="flex h-full items-center justify-center text-center text-[11px] font-semibold tracking-[0.04em] text-gray-lightest whitespace-nowrap">
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
                            if ((hora * 60) <= cur - 30) isPastSlot = true;
                          }
                        }

                        const slotKey = `${dayInfo?.fechaCompleta}-${hora}`;
                        const safeIdx =
                          citasEnSlot.length > 0
                            ? (slotCitaIndex[slotKey] ?? 0) % citasEnSlot.length
                            : 0;
                        const citaEnCurso = citasEnSlot[safeIdx] || null;
                        const tieneMultiples = citasEnSlot.length > 1;
                        let slotRole: 'none' | 'start' | 'middle' | 'end' = 'none';
                        if (citaEnCurso) {
                          const [hStr, mStr] = (citaEnCurso.hora || '').split(':');
                          const citaInicio = parseInt(hStr) + parseInt(mStr) / 60;
                          const citaFin = citaInicio + (citaEnCurso.duracion || 60) / 60;
                          const isStart = Math.abs(citaInicio - hora) < 0.001;
                          const isEnd = Math.abs(citaFin - (hora + 0.5)) < 0.001;
                          if (isStart && isEnd) slotRole = 'start';
                          else if (isStart) slotRole = 'start';
                          else if (isEnd) slotRole = 'end';
                          else slotRole = 'middle';
                        }

                        // Si es middle/end, verificar que esta cita sigue seleccionada en su slot de inicio.
                        // Si en su inicio hay múltiples citas y se seleccionó otra, suprimir este bloque.
                        if ((slotRole === 'middle' || slotRole === 'end') && citaEnCurso && dayInfo) {
                          const [cHStr, cMStr] = (citaEnCurso.hora || '09:00').split(':');
                          const citaStartHora = parseInt(cHStr) + parseInt(cMStr || '0') / 60;
                          const citaStartKey = `${dayInfo.fechaCompleta}-${citaStartHora}`;
                          const citasDia = citas.filter(c => c.fecha === dayInfo.fechaCompleta);
                          const citasEnInicio = citasDia.filter(c => {
                            const [hh, mm] = (c.hora || '').split(':');
                            return Math.abs((parseInt(hh) + parseInt(mm || '0') / 60) - citaStartHora) < 0.001;
                          });
                          if (citasEnInicio.length > 1) {
                            const idxEnInicio = (slotCitaIndex[citaStartKey] ?? 0) % citasEnInicio.length;
                            const citaSeleccionadaEnInicio = citasEnInicio[idxEnInicio];
                            if (!citaSeleccionadaEnInicio || citaSeleccionadaEnInicio.id !== citaEnCurso.id) {
                              slotRole = 'none';
                            }
                          }
                        }

                        // Beige claro como en la imagen de referencia
                        const citaBg = isPastSlot ? 'rgba(220,190,130,0.25)' : '#e8d5a8';
                        const citaBorder = isPastSlot ? 'rgba(180,140,80,0.2)' : 'rgba(160,120,60,0.4)';
                        const citaBorderLeft = isPastSlot ? 'rgba(180,140,80,0.3)' : '#a07830';

                        return (
                          <div
                            key={`${dia}-${hora}`}
                            className={`relative min-w-0 transition-all duration-200 ${
                              slotRole !== 'none'
                                ? 'cursor-pointer'
                                : isPastSlot
                                  ? 'rounded border bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-60'
                                  : 'rounded border bg-gray-darker border-gray-dark hover:bg-gray-dark hover:border-orange-primary/50 cursor-pointer group'
                            }`}
                            style={slotRole !== 'none' ? {
                              background: citaBg,
                              borderLeft: `3px solid ${citaBorderLeft}`,
                              borderRight: `1px solid ${citaBorder}`,
                              borderTop: slotRole === 'start' ? `1px solid ${citaBorder}` : 'none',
                              borderBottom: slotRole === 'end' ? `1px solid ${citaBorder}` : 'none',
                              borderRadius: slotRole === 'start' ? '6px 6px 0 0' : slotRole === 'end' ? '0 0 6px 6px' : '0',
                              marginTop: (slotRole === 'middle' || slotRole === 'end') ? '-4px' : '0',
                              paddingTop: (slotRole === 'middle' || slotRole === 'end') ? '4px' : '0',
                              height: (slotRole === 'middle' || slotRole === 'end') ? 'calc(100% + 4px)' : '100%',
                              zIndex: slotRole === 'start' ? 2 : 1,
                            } : {}}
                            onClick={() => {
                              if (slotRole !== 'none') {
                                const [hStr, mStr] = (citaEnCurso!.hora || '09:00').split(':');
                                const horaNum = parseInt(hStr) + parseInt(mStr) / 60;
                                const fechaObj = new Date(`${dayInfo?.fechaCompleta}T12:00:00`);
                                const diaStr = diasSemana[(fechaObj.getDay() + 6) % 7];
                                setSelectedCita(citaEnCurso!);
                                setSelectedSlot({ dia: diaStr, hora: horaNum, fecha: dayInfo?.fechaCompleta || '' });
                                setActiveTab('detalle');
                                setIsSlotModalOpen(true);
                              } else if (!isPastSlot) {
                                handleSlotClick(dia, hora);
                              }
                            }}
                          >
                            {slotRole === 'none' && !isPastSlot && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-orange-primary/10 backdrop-blur-[1px] z-0 rounded">
                                <div className="bg-orange-primary/20 p-1.5 rounded-full border border-orange-primary/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                  <Plus className="w-4 h-4 text-orange-primary" />
                                </div>
                              </div>
                            )}
                            {slotRole === 'start' && citaEnCurso && (() => {
                              const durSlots = Math.ceil((citaEnCurso.duracion || 60) / 30);
                              const contentH = `calc(${durSlots} * 3.5rem)`;
                              return (
                              <>
                                <div
                                  className={`absolute left-0 right-0 top-0 flex flex-col items-center justify-center pointer-events-none px-1 gap-0.5 ${tieneMultiples ? 'pt-5' : ''}`}
                                  style={{ height: contentH, zIndex: 3 }}
                                >
                                  <span style={{ color: isPastSlot ? '#8a7050' : '#3d2000' }} className="text-[10px] font-bold leading-tight text-center w-full truncate">
                                    {formatNombre((citaEnCurso.clienteNombre || 'Cliente').split(' ')[0])}
                                  </span>
                                  <span style={{ color: isPastSlot ? '#a08060' : '#5a3510' }} className="text-[9px] leading-tight text-center w-full truncate">
                                    {formatNombre(citaEnCurso.servicioNombre || citaEnCurso.paqueteNombre || (citaEnCurso.serviciosNombres?.[0]) || 'Servicio')}
                                  </span>
                                </div>
                                {tieneMultiples && (
                                  <div
                                    className="absolute top-0 right-0 z-10 flex items-center"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => navegarCitaEnSlot(slotKey, citasEnSlot.length, 'prev', e)}
                                      className="flex items-center justify-center w-6 h-6 hover:text-orange-primary"
                                      style={{ color: isPastSlot ? '#8a7050' : '#3d2000' }}
                                      aria-label="Cita anterior"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <span
                                      className="text-[10px] font-bold leading-none select-none"
                                      style={{ color: isPastSlot ? '#8a7050' : '#3d2000' }}
                                      title={`${citasEnSlot.length} citas en esta franja`}
                                    >
                                      {safeIdx + 1}/{citasEnSlot.length}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => navegarCitaEnSlot(slotKey, citasEnSlot.length, 'next', e)}
                                      className="flex items-center justify-center w-6 h-6 hover:text-orange-primary"
                                      style={{ color: isPastSlot ? '#8a7050' : '#3d2000' }}
                                      aria-label="Cita siguiente"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </>
                              );
                            })()}
                            {citaEnCurso?.estado === 'En Proceso' && slotRole === 'end' && (
                              <div className="absolute bottom-0 left-0 h-0.5 bg-orange-primary w-full animate-pulse" />
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

      {/* Modal de Gestión de Franja Horaria */}
      <Dialog open={isSlotModalOpen} onOpenChange={setIsSlotModalOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark w-[95vw] max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-gray-dark pb-4">
            <DialogTitle className="text-white-primary text-2xl flex items-center gap-3">
              <Clock className="w-7 h-7 text-orange-primary" />
              {selectedSlot && `${selectedSlot.dia} - ${selectedSlot.hora}:00`}
            </DialogTitle>
            <DialogDescription className="text-gray-lightest text-lg">
              Gestiona todas las citas para esta franja horaria
            </DialogDescription>
          </DialogHeader>

          {/* Tabs de navegación */}
          <div className="flex items-center justify-between border-b border-gray-dark mb-6">
            <div className="flex">
              <button
                onClick={() => setActiveTab('lista')}
                className={`px-6 py-3 border-b-2 transition-colors ${activeTab === 'lista'
                  ? 'border-orange-primary text-orange-primary'
                  : 'border-transparent text-gray-lightest hover:text-white-primary'
                  }`}
              >
                Lista de Citas
              </button>
              {activeTab === 'detalle' && selectedCita && (
                <button
                  onClick={() => setActiveTab('detalle')}
                  className="px-6 py-3 border-b-2 border-orange-primary text-orange-primary"
                >
                  Detalle de Cita
                </button>
              )}
            </div>
            {(() => {
              let slotEsPasado = false;
              if (selectedSlot) {
                const today = new Date();
                const todayStr = today.toISOString().split('T')[0];
                if (selectedSlot.fecha < todayStr) slotEsPasado = true;
                else if (selectedSlot.fecha === todayStr && selectedSlot.hora <= today.getHours()) slotEsPasado = true;
              }
              if (slotEsPasado) return null;
              return (
                <button
                  onClick={() => {
                    setShowFormErrors(false);
                    setSelectedCita(null);
                    setNuevaCita({
                      clienteId: 0, cliente: '', telefono: '',
                      servicioId: null, servicioIds: [], productoCantidades: {},
                      paqueteId: null, servicio: '', barberoId: 0, barbero: '',
                      fecha: selectedSlot?.fecha || '', hora: selectedSlot?.hora.toString().padStart(2, '0') + ':00' || '',
                      duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
                    });
                    setClienteSearchTerm('');
                    setBarberoFormSearchTerm('');
                    setIsSlotModalOpen(false);
                    setViewMode('crear');
                  }}
                  className="elegante-button-primary flex items-center gap-2 mb-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Cita
                </button>
              );
            })()}
          </div>

          {/* Contenido según tab activo */}
          {activeTab === 'lista' && (() => {
            const citasEnFranja = selectedSlot ? getCitasEnSlot(selectedSlot.dia, selectedSlot.hora) : [];

            return (
              <div className="space-y-6">
                <TableHeaderSection
                  variant="dark"
                  searchValue={slotSearchTerm}
                  onSearchChange={setSlotSearchTerm}
                  searchPlaceholder="Buscar por cliente, telefono o servicio..."
                  statusFilter={{
                    value: slotFilterEstado,
                    onChange: setSlotFilterEstado,
                    options: [
                      { value: "all", label: "Todos" },
                      ...estados.map((estado) => ({
                        value: estado.value,
                        label: estado.label,
                      })),
                    ],
                    placeholder: "Filtrar por estado",
                  }}
                  recordsText={`Mostrando ${citasEnFranja.length} registros`}
                />

                {/* Lista de citas */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {citasEnFranja.map((cita) => {
                  let isPasada = false;
                  const today = new Date();
                  const todayStr = today.toISOString().split('T')[0];
                  if (cita.fecha < todayStr) {
                    isPasada = true;
                  } else if (cita.fecha === todayStr) {
                    const [hh] = String(cita.hora || '0').split(':');
                    if (parseInt(hh, 10) <= today.getHours()) {
                      isPasada = true;
                    }
                  }

                  return (
                    <div key={cita.id} className="bg-gray-darker border border-gray-dark rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: getCitaColor(cita.estado) }}
                          />
                          <h4 className="font-semibold text-white-primary">{cita.clienteNombre}</h4>
                          <div className={`elegante-tag ${getEstadoInfo(cita.estado).color} text-white text-xs`}>
                            {getEstadoInfo(cita.estado).label}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {/* Cambio rápido de estado */}
                          <Select value={cita.estado} onValueChange={(value) => handleChangeEstado(cita.id, value)}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-darkest border-gray-dark">
                              {estados.map((estado) => (
                                <SelectItem key={estado.value} value={estado.value} className="text-white-primary text-xs">
                                  {estado.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(cita);
                            }}
                            className="p-2 rounded bg-blue-600/20 hover:bg-blue-600/30 transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-blue-400" />
                          </button>

                          {!isPasada && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log("Click en icono Eliminar (Trash2)");
                                  handleDeleteCita(cita);
                                }}
                                className="p-2 rounded bg-red-600/20 hover:bg-red-600/30 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-lightest">
                        <div>
                          <span className="text-gray-light">Servicio:</span> {cita.servicioNombre}
                        </div>
                        <div>
                          <span className="text-gray-light">Barbero:</span> {cita.barberoNombre}
                        </div>
                        <div>
                          <span className="text-gray-light">Hora:</span> {cita.hora} ({cita.duracion}min)
                        </div>
                        <div>
                          <span className="text-gray-light">Precio:</span> {formatearPrecio(cita.precio)}
                        </div>
                      </div>

                      {cita.notas && (
                        <div className="mt-2 text-sm text-gray-lightest">
                          <span className="text-gray-light">Notas:</span> {cita.notas}
                        </div>
                      )}
                    </div>
                  );
                  })}

                  {selectedSlot && citasEnFranja.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-medium mx-auto mb-4" />
                      <p className="text-gray-lightest">No hay citas para esta franja horaria</p>
                      <button
                        onClick={() => { setIsSlotModalOpen(false); setSelectedCita(null); setViewMode('crear'); }}
                        className="elegante-button-primary mt-4"
                      >
                        Crear Cita
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {activeTab === 'detalle' && selectedCita && (
            <div className="space-y-6">
              <div className="bg-gray-darker border border-gray-dark rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white-primary">{formatNombre(selectedCita.clienteNombre)}</h3>
                  <div className={`elegante-tag ${getEstadoInfo(selectedCita.estado).color} text-white`}>
                    {getEstadoInfo(selectedCita.estado).label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Información del Cliente</h4>
                      <p className="text-white-primary">{formatNombre(selectedCita.clienteNombre)}</p>
                      <p className="text-gray-lightest text-sm">{selectedCita.telefono}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Servicio</h4>
                      <p className="text-white-primary">{formatNombre(selectedCita.servicioNombre)}</p>
                      <p className="text-orange-primary font-semibold">{formatearPrecio(selectedCita.precio)}</p>
                    </div>
                    {selectedCita.productosNombres && selectedCita.productosNombres.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-light mb-1 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" /> Productos
                        </h4>
                        {selectedCita.productosNombres.map((nombre: string, i: number) => (
                          <p key={i} className="text-white-primary text-sm">• {formatNombre(nombre)}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Programación</h4>
                      <p className="text-white-primary">{selectedCita.fecha}</p>
                      <p className="text-gray-lightest">{selectedCita.hora} - {selectedCita.duracion} minutos</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Barbero Asignado</h4>
                      <p className="text-white-primary">{formatNombre(selectedCita.barberoNombre)}</p>
                    </div>
                  </div>
                </div>

                {selectedCita.notas && (
                  <div className="mt-6 pt-4 border-t border-gray-dark">
                    <h4 className="text-sm font-semibold text-gray-light mb-2">Notas Especiales</h4>
                    <p className="text-gray-lightest">{selectedCita.notas}</p>
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t border-gray-dark">
                  <button
                    onClick={() => setActiveTab('lista')}
                    className="elegante-button-secondary"
                  >
                    Volver a Lista
                  </button>
                  <button
                    onClick={() => handleChangeEstado(selectedCita.id, 'Completada')}
                    className="elegante-button-primary"
                    title="Marcar como Completada y generar venta"
                  >
                    Completar Cita
                  </button>
                  <button
                    onClick={() => handleDeleteCita(selectedCita)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center transition-all"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar Cita
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer del modal */}

        </DialogContent>
      </Dialog>

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
