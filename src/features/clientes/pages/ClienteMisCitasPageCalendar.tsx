import React, { useState, useEffect } from "react";
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
  Trash2,
  AlertTriangle,
  CheckCircle,
  Phone,
  MoreVertical,
  Search,
  CheckCircle2,
  CalendarDays,
  Package,
  ShoppingBag,
  FileText,
  ArrowLeft,
  Eye,
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
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import { useAuth } from "../../../shared/contexts/AuthContext";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { barberosService } from "../../administracion/services/barberosService";
import { servicioService } from "../../servicios/services/servicioService";
import { clientesService } from "../../clientes/services/clientesService";
import { apiService } from "../../../shared/services/api";
import { productoService } from "../../productos/services/productos";
import { horariosService } from "../../agendamiento/services/horariosService";

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
  const [pendingProduct, setPendingProduct] = useState<any>(null);
  const [citaCarouselIndex, setCitaCarouselIndex] = useState(0);

  // Resetear carrusel de citas al cambiar de semana
  useEffect(() => { setCitaCarouselIndex(0); setCarouselPage(0); }, [currentWeek]);

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
      setViewMode('crear');
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

      setViewMode('crear');
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

    setViewMode('crear');
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
    setViewMode('crear');
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
    setViewMode('crear');
  };

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
    setViewMode('crear');
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
      setViewMode('calendar');
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

  return (
    <>
      <AlertContainer />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-orange-primary animate-pulse text-xl font-medium">Cargando tus citas...</div>
        </div>
      ) : viewMode === 'crear' ? (
        /* ═══════════════════════════════════════════════════════════════════ */
        /* VISTA DE CREAR / EDITAR CITA (inline, no modal) */
        /* ═══════════════════════════════════════════════════════════════════ */
        <div className="flex flex-col gap-4 h-full min-h-0 overflow-hidden">
          {/* Header con botón Volver */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setViewMode('calendar'); setPendingProduct(null); }}
                className="p-2 rounded-lg hover:bg-gray-dark text-gray-lightest hover:text-white-primary transition-colors"
                title="Volver al Calendario"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white-primary flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-orange-primary" />
                  {isEditMode ? 'Editar tu Reservación' : 'Programar Nueva Cita'}
                </h2>
                <p className="text-sm text-gray-lightest">Selecciona los servicios y horario de tu preferencia</p>
              </div>
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div
            className="grid grid-cols-1 lg:grid-cols-master-detail gap-4 flex-1 min-h-0 overflow-hidden"
            style={{ gridTemplateRows: 'minmax(0, 1fr)' }}
          >
            {/* ── Panel Izquierdo: Formulario ── */}
            <aside className="min-h-0 min-w-0">
              <div className="elegante-card h-full min-h-0 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-10">
                  {/* Sección: Barbero */}
                  <div className="py-10">
                    <FormSection title="Barbero de Preferencia" icon={<User className="w-4 h-4 text-orange-primary" />}>
                      <SearchField<any>
                        placeholder="Busca a tu barbero..."
                        value={barberoFormSearchTerm}
                        onChange={(val) => setBarberoFormSearchTerm(val)}
                        onClear={() => {
                          setBarberoFormSearchTerm('');
                          setNuevaCita({ ...nuevaCita, barberoId: 0, barbero: '' });
                        }}
                        items={barberosList.filter((b: any) => {
                          if (nuevaCita.fecha && nuevaCita.hora) {
                            const errorDisp = validarDisponibilidad(b.id, nuevaCita.fecha, nuevaCita.hora, nuevaCita.duracion, selectedCita?.id);
                            return !errorDisp;
                          }
                          return true;
                        })}
                        filterFn={(b: any, query: string) => {
                          const fullName = `${b.nombre || b.nombres || ''} ${b.apellido || b.apellidos || ''}`.toLowerCase();
                          return fullName.includes(query.toLowerCase());
                        }}
                        renderItem={(barbero: any) => (
                          <p className="text-white-primary text-sm font-medium group-hover:text-orange-primary transition-colors">
                            {barbero.nombre || barbero.nombres} {barbero.apellido || barbero.apellidos || ''}
                          </p>
                        )}
                        onSelect={(barbero: any) => {
                          const name = `${barbero.nombre || barbero.nombres || ''} ${barbero.apellido || barbero.apellidos || ''}`.trim();
                          setNuevaCita({ ...nuevaCita, barberoId: barbero.id, barbero: name });
                          setBarberoFormSearchTerm(name);
                        }}
                        error={showFormErrors && !nuevaCita.barberoId ? 'Debes seleccionar un barbero para continuar.' : undefined}
                      />
                    </FormSection>
                  </div>

                  {/* Sección: Servicios y Paquetes (Agrupados) */}
                  <div className="py-10 border-t border-gray-dark">
                    <div className="flex flex-row items-start w-full" style={{ gap: '10px' }}>
                      <div className="flex-1 min-w-0">
                        <FormSection title="Servicios" icon={<Scissors className="w-4 h-4 text-orange-primary" />}>
                          {nuevaCita.paqueteId ? (
                            <p className="text-xs text-gray-lighter">Desactiva el paquete para seleccionar servicios individuales</p>
                          ) : (
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

                      <div className="flex-1 min-w-0">
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
                            />
                          )}
                        </FormSection>
                      </div>
                    </div>
                  </div>

                  {/* Sección: Productos adicionales */}
                  {productosList.length > 0 && (
                    <div className="py-10">
                      <FormSection title="Productos Adicionales" icon={<ShoppingBag className="w-4 h-4 text-orange-primary" />}>
                        {(nuevaCita.servicioIds.length > 0 || !!nuevaCita.paqueteId) ? (
                          <>
                            <SearchField<any>
                              label="Buscar producto"
                              placeholder="Buscar producto..."
                              value={productoSearchTerm}
                              onChange={setProductoSearchTerm}
                              items={productosList.filter(p => !nuevaCita.productoCantidades[p.id])}
                              filterFn={(p, term) =>
                                (p.nombre || '').toLowerCase().includes(term.toLowerCase())
                              }
                              onSelect={(p) => {
                                addProducto(p.id);
                                setProductoSearchTerm('');
                              }}
                              onClear={() => setProductoSearchTerm('')}
                              renderItem={(p) => (
                                <div className="flex items-center gap-3">
                                  <div className="shrink-0 w-9 h-9 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                    <ImageRenderer url={p.imagenProduc || ""} alt={p.nombre} className="w-full h-full border-0 bg-transparent" fallbackVariant="product" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white-primary text-sm font-medium truncate">{p.nombre}</p>
                                    <p className="text-gray-lighter text-xs">Stock: {p.stockVentas ?? p.stockTotal ?? 0}</p>
                                  </div>
                                  <span className="text-orange-primary text-sm font-bold shrink-0">{formatearPrecio(p.precioVenta || p.precio || 0)}</span>
                                </div>
                              )}
                            />
                            {/* Lista de productos seleccionados con cantidades */}
                            {Object.entries(nuevaCita.productoCantidades).length > 0 && (
                              <div className="space-y-2 mt-3">
                                {Object.entries(nuevaCita.productoCantidades).map(([pId, cant]) => {
                                  const prod = productosList.find(p => p.id === Number(pId));
                                  if (!prod) return null;
                                  return (
                                    <div key={pId} className="flex items-center justify-between gap-3 bg-gray-darker/60 border border-gray-dark rounded-xl p-3 group hover:border-orange-primary/30 transition-all duration-300">
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="shrink-0 w-8 h-8 rounded-lg overflow-hidden bg-gray-dark border border-gray-dark/50">
                                          <ImageRenderer url={prod.imagenProduc || ""} alt={prod.nombre} className="w-full h-full border-0 bg-transparent object-cover" fallbackVariant="product" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white-primary text-sm font-medium truncate">{prod.nombre}</p>
                                          <p className="text-orange-primary text-xs font-bold">{formatearPrecio(prod.precioVenta || prod.precio || 0)}</p>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-gray-darkest rounded-lg border border-gray-dark px-1 py-1">
                                          <button
                                            type="button"
                                            onClick={() => removeProducto(Number(pId))}
                                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-dark text-gray-light hover:text-white transition-colors"
                                          >
                                            <Minus className="w-3.5 h-3.5" />
                                          </button>
                                          <span className="text-white-primary font-bold text-sm w-4 text-center tabular-nums">{cant}</span>
                                          <button
                                            type="button"
                                            onClick={() => addProducto(Number(pId))}
                                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-dark text-orange-primary hover:text-orange-secondary transition-colors"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => quitarProducto(Number(pId))}
                                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-lighter hover:text-red-400 transition-all duration-300 border border-transparent hover:border-red-500/20"
                                          title="Quitar"
                                        >
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-2">
                            {pendingProduct && (
                              <div className="flex items-center gap-2 p-2 rounded-lg border border-orange-primary/40 bg-orange-primary/10">
                                <ShoppingBag className="w-4 h-4 text-orange-primary shrink-0" />
                                <p className="text-xs text-orange-primary font-medium">
                                  <strong>{pendingProduct.nombre}</strong> se agregará automáticamente al seleccionar un servicio o paquete.
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-gray-lighter italic">
                              Selecciona al menos un servicio o paquete para agregar productos.
                            </p>
                          </div>
                        )}
                      </FormSection>
                    </div>
                  )}

                  {/* Sección: Fecha y Hora */}
                  <div className="py-10">
                    <FormSection title="Fecha y Hora" icon={<Calendar className="w-4 h-4 text-orange-primary" />}>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-gray-lightest text-xs">Fecha *</Label>
                          <DatePicker
                            value={nuevaCita.fecha}
                            onChange={(val) => setNuevaCita({ ...nuevaCita, fecha: val })}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-gray-lightest text-xs">Hora *</Label>
                          {nuevaCita.barberoId && nuevaCita.fecha ? (
                            <Select value={nuevaCita.hora} onValueChange={v => setNuevaCita({ ...nuevaCita, hora: v })}>
                              <SelectTrigger className="elegante-input h-11">
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
                              onChange={(e) => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
                              className="elegante-input h-11"
                            />
                          )}
                        </div>
                      </div>
                    </FormSection>
                  </div>

                  {/* Sección: Notas */}
                  <div className="py-10">
                    <FormSection title="Notas Adicionales" icon={<FileText className="w-4 h-4 text-orange-primary" />}>
                      <Textarea
                        value={nuevaCita.notas}
                        onChange={(e) => setNuevaCita({ ...nuevaCita, notas: e.target.value })}
                        placeholder="¿Algún detalle especial que debamos saber?"
                        className="elegante-input min-h-[80px] resize-none pt-3"
                      />
                    </FormSection>
                  </div>

                  {/* Sección: Estado (solo edición) */}
                  {isEditMode && selectedCita && (
                    <FormSection title="Estado" icon={<CheckCircle2 className="w-4 h-4 text-orange-primary" />}>
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
                    </FormSection>
                  )}
                </div>

                {/* Footer fijo con botones */}
                <div className="shrink-0 px-5 pt-3 pb-4 border-t border-gray-dark bg-gray-darkest/90 flex justify-end space-x-3">
                  <button
                    onClick={() => { setViewMode('calendar'); setPendingProduct(null); }}
                    className="elegante-button-secondary py-3 px-8"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCita}
                    className="elegante-button-primary py-3 px-8 shadow-lg shadow-orange-primary/10 flex items-center gap-2"
                  >
                    <CalendarDays className="w-4 h-4" />
                    {isEditMode ? 'Guardar Cambios' : 'Confirmar Reservación'}
                  </button>
                </div>
              </div>
            </aside>

            {/* ── Panel Derecho: Resumen ── */}
            <section className="min-h-0 min-w-0">
              <div className="elegante-card h-full min-h-0 overflow-hidden flex flex-col p-0">
                {/* Header con gradiente */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-orange-primary/20 to-orange-primary/5 border-b border-gray-dark px-5 py-4">
                  <h3 className="text-white-primary font-bold text-lg flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-primary" />
                    Resumen de Reservación
                  </h3>
                  <p className="text-xs text-gray-lighter mt-1">Vista previa de tu cita</p>
                </div>

                {/* Contenido scrollable */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-5 py-4 space-y-4">
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

                  {/* Servicios */}
                  {nuevaCita.servicioIds.length > 0 && !nuevaCita.paqueteId && (
                    <div>
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-2">
                        Servicios ({nuevaCita.servicioIds.length})
                      </p>
                      <div className="space-y-2">
                        {nuevaCita.servicioIds.map(id => {
                          const s = serviciosList.find((sv: any) => sv.id === id);
                          if (!s) return null;
                          return (
                            <div key={id} className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                  <ImageRenderer url={s.imagen || ""} alt={s.nombre} className="w-full h-full border-0 bg-transparent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white-primary text-sm font-medium truncate">{s.nombre}</span>
                                    <span className="text-orange-primary text-sm font-bold shrink-0 ml-2">{formatearPrecio(s.precio)}</span>
                                  </div>
                                  {s.descripcion && (
                                    <p className="text-xs text-gray-lighter mt-0.5 italic truncate">{s.descripcion}</p>
                                  )}
                                  <p className="text-[10px] text-gray-lighter mt-0.5">{s.duracion || 60} min</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Paquete */}
                  {nuevaCita.paqueteId && (() => {
                    const paq = paquetesList.find((p: any) => p.id === nuevaCita.paqueteId);
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
                          <p className="text-[10px] text-gray-lighter mt-2 ml-6">{paq.duracion || 60} min</p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Productos */}
                  {Object.entries(nuevaCita.productoCantidades).length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-lighter uppercase tracking-widest font-bold mb-2">
                        Productos ({Object.values(nuevaCita.productoCantidades).reduce((a, b) => a + b, 0)})
                      </p>
                      <div className="space-y-2">
                        {Object.entries(nuevaCita.productoCantidades).map(([id, cant]) => {
                          const p = productosList.find((pr: any) => pr.id === Number(id));
                          if (!p) return null;
                          return (
                            <div key={id} className="bg-gray-darker rounded-lg p-3 border border-gray-dark">
                              <div className="flex items-center gap-3">
                                <div className="shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-dark border border-gray-dark">
                                  <ImageRenderer url={p.imagenProduc || ""} alt={p.nombre} className="w-full h-full border-0 bg-transparent object-cover" fallbackVariant="product" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white-primary text-sm font-medium truncate">{p.nombre}</span>
                                    <span className="text-orange-primary text-sm font-bold shrink-0 ml-2">{formatearPrecio(Number(p.precioVenta || 0) * cant)}</span>
                                  </div>
                                  <p className="text-[10px] text-gray-lighter mt-0.5">Cantidad: {cant} x {formatearPrecio(p.precioVenta)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

                  {/* Estado vacío */}
                  {nuevaCita.servicioIds.length === 0 && !nuevaCita.paqueteId && !nuevaCita.barberoId && (
                    <div className="py-8 text-center">
                      <CalendarDays className="w-10 h-10 text-gray-dark mx-auto mb-2" />
                      <p className="text-sm text-gray-lightest">
                        Selecciona servicios para ver el resumen
                      </p>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {nuevaCita.precio > 0 && (
                    <p className="text-gray-lightest text-[10px] italic leading-relaxed">
                      * El precio puede variar ligeramente según el detalle final del servicio en la barbería.
                    </p>
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
                    <span className="text-white-primary font-bold text-base tracking-wide">TOTAL ESTIMADO</span>
                    <span className="text-orange-primary font-bold text-2xl tabular-nums">
                      {formatearPrecio(nuevaCita.precio)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="p-2">

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
                    {weekDays[0].fecha} - {weekDays[6].fecha}
                  </p>
                </div>

                <button
                  onClick={() => { setCurrentWeek(currentWeek + 1); setCarouselPage(0); }}
                  className="elegante-button-secondary p-2"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Acciones derecha */}
              <div className="flex items-center gap-2 ml-10">
                <button
                  onClick={() => { setCurrentWeek(0); setCarouselPage(0); }}
                  className="elegante-button-secondary text-sm"
                >
                  Hoy
                </button>
                <button
                  onClick={handleOpenCreate}
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
                      className="shrink-0 text-white-primary hover:text-orange-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed bg-gray-darker border border-gray-dark hover:border-gray-medium rounded-lg p-2"
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
                      className="shrink-0 text-white-primary hover:text-orange-primary transition-colors disabled:opacity-20 disabled:cursor-not-allowed bg-gray-darker border border-gray-dark hover:border-gray-medium rounded-lg p-2"
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

          {/* Encabezado de días */}
          <div className="std-card mb-0">
            <div
              className="grid gap-1 py-3"
              style={{ gridTemplateColumns: calendarGridTemplate }}
            >
              <div />
              {weekDays.map(({ dia, fecha }) => (
                <div
                  key={dia}
                  className="min-w-0 text-center rounded-lg py-3 px-2 border-2 border-transparent"
                >
                  <div className="flex justify-center items-center gap-1">
                    <h4 className="text-sm font-bold tracking-[0.06em] uppercase text-gray-lightest">{dia.slice(0, 3)}</h4>
                  </div>
                  <p className="text-sm font-bold tracking-[0.06em] text-gray-lightest">{fecha}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Grid de horarios */}
          <div className="std-card mb-0">
            <div className="w-full pb-4 pt-3">
              <div className="-mx-6 pl-3 pr-6">
                {(() => {
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
                      {weekDays.map((dayInfo) => {
                        const citasEnSlot = getCitasEnSlot(dayInfo.fechaCompleta, hora);

                        let isPastSlot = false;
                        if (dayInfo.fechaCompleta < todayStr) {
                          isPastSlot = true;
                        } else if (dayInfo.fechaCompleta === todayStr) {
                          const today = new Date();
                          const cur = today.getHours() * 60 + today.getMinutes();
                          if ((hora * 60) <= cur - 30) isPastSlot = true;
                        }

                        const slotKey = `${dayInfo.fechaCompleta}-${hora}`;
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
                        if ((slotRole === 'middle' || slotRole === 'end') && citaEnCurso) {
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

                        // Beige claro como en el diseño admin
                        const citaBg = isPastSlot ? 'rgba(220,190,130,0.25)' : '#e8d5a8';
                        const citaBorder = isPastSlot ? 'rgba(180,140,80,0.2)' : 'rgba(160,120,60,0.4)';
                        const citaBorderLeft = isPastSlot ? 'rgba(180,140,80,0.3)' : '#a07830';

                        return (
                          <div
                            key={`${dayInfo.dia}-${hora}`}
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
                              if (slotRole !== 'none' && citaEnCurso) {
                                setSelectedCita(citaEnCurso);
                                setIsDetailDialogOpen(true);
                              } else if (!isPastSlot) {
                                handleSlotClick(dayInfo.fechaCompleta, hora);
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
                                      {formatNombre(citaEnCurso.servicioNombre || citaEnCurso.paqueteNombre || (citaEnCurso.serviciosNombres?.[0]) || 'Servicio')}
                                    </span>
                                    <span style={{ color: isPastSlot ? '#a08060' : '#5a3510' }} className="text-[9px] leading-tight text-center w-full truncate">
                                      {formatNombre(citaEnCurso.barberoNombre || 'Barbero')}
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

      {/* Modal Detalle Cita */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark text-white-primary max-w-lg max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-5 py-2">
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

              {/* Productos asociados */}
              {selectedCita.productosNombres && selectedCita.productosNombres.length > 0 && (
                <div className="bg-black/20 p-4 rounded-2xl border border-gray-dark/50">
                  <p className="text-gray-lightest text-[10px] uppercase font-black tracking-tighter opacity-50 mb-2 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5" /> Productos Incluidos
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCita.productosNombres.map((nombre: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-orange-primary/10 border border-orange-primary/20 rounded-full text-xs text-orange-primary font-medium">
                        {nombre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid de información */}
              <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded-2xl border border-gray-dark/50">
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
                  <div className="p-3 bg-gray-darker/50 rounded-xl text-[13px] border border-gray-dark italic text-gray-lighter leading-relaxed">
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
