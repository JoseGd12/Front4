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
import { Calendar, Clock, User, Edit, Trash2, Search, ChevronLeft, ChevronRight, Eye, MoreHorizontal, ShoppingBag, Scissors, Package, FileText, CalendarDays, ArrowLeft, Plus, Minus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { emailJsService } from "../../../shared/services/emailJsService";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { FormSection } from "../../../shared/components/ui/FormSection";
import { SearchField } from "../../../shared/components/ui/SearchField";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

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

interface AgendamientoPageProps {
  initialItem?: any;
  onClearInitialItem?: () => void;
}

export function AgendamientoPage({ initialItem, onClearInitialItem }: AgendamientoPageProps) {
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
  const [lastInitialItemKey, setLastInitialItemKey] = useState("");

  // Cargar datos al montar el componente
  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!initialItem || isLoading) return;
    if (serviciosList.length === 0 && paquetesList.length === 0) return;

    const key = `${initialItem.type || initialItem.tipoItem || "servicio"}-${initialItem.id || "0"}`;
    if (key === lastInitialItemKey) return;

    applyInitialReservationItem(initialItem);
    setLastInitialItemKey(key);
  }, [initialItem, isLoading, serviciosList, paquetesList, lastInitialItemKey]);

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

    const { fecha, hora, hours } = getAutoDateTime();
    const dayLabels = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const dayName = dayLabels[new Date(`${fecha}T12:00:00`).getDay()] || "Reserva";

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
    const precioServicios = selectedServicios.reduce((acc, s) => acc + Number(s.precio || 0), 0);
    const precioProductos = calcularPrecioProductos(nuevaCita.productoCantidades);
    const duracionTotal = selectedServicios.reduce((acc, s) => acc + Number(s.duracion || 60), 0);
    setNuevaCita(prev => ({
      ...prev,
      paqueteId: null,
      servicioId: servicioIds.length > 0 ? servicioIds[0] : null,
      servicioIds,
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
    setNuevaCita(prev => ({
      ...prev,
      productoCantidades: cantidades,
      precio: precioBase + precioProductos
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
    setNuevaCita(prev => ({
      ...prev,
      paqueteId: id,
      servicioId: null,
      servicioIds: [],
      servicio: paquete ? paquete.nombre : "",
      precio: (paquete ? paquete.precio : 0) + precioProductos,
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

  // Stats para el dashboard
  const totalCitas = citas.length;
  const citasActivas = citas.filter(c => c.estado !== 'Cancelada').length;
  const citasHoy = citas.filter(c => c.fecha === new Date().toISOString().split('T')[0]).length;

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
          {/* Header con botón Volver */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => { setViewMode('calendar'); setSelectedCita(null); setShowFormErrors(false); }}
                className="p-2 rounded-lg hover:bg-gray-dark text-gray-lightest hover:text-white-primary transition-colors"
                title="Volver al Calendario"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white-primary flex items-center gap-2">
                  <CalendarDays className="w-6 h-6 text-orange-primary" />
                  {selectedCita ? 'Editar Cita' : 'Nueva Cita'}
                </h2>
                <p className="text-sm text-gray-lightest">Completa la información del agendamiento</p>
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
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 space-y-0 divide-y divide-gray-dark">
                {/* Sección: Cliente */}
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

                {/* Sección: Servicios */}
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

                {/* Sección: Paquetes */}
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

                {/* Sección: Productos */}
                {(nuevaCita.servicioIds.length > 0 || nuevaCita.paqueteId) && productosList.length > 0 && (
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
                )}

                {/* Sección: Barbero */}
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

                {/* Sección: Fecha y Hora */}
                <FormSection title="Fecha y Hora" icon={<CalendarDays className="w-4 h-4 text-orange-primary" />}>
                  <div className="grid grid-cols-2 gap-3">
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
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
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

                {/* Sección: Notas */}
                <FormSection title="Notas" icon={<FileText className="w-4 h-4 text-orange-primary" />}>
                  <Textarea
                    value={nuevaCita.notas}
                    onChange={e => setNuevaCita(prev => ({ ...prev, notas: e.target.value }))}
                    placeholder="Notas adicionales..."
                    className="elegante-input min-h-[80px]"
                  />
                </FormSection>
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
        <div className="overflow-auto h-full p-2">

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
        <div className="elegante-card mb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentWeek(currentWeek - 1)}
              className="elegante-button-secondary p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-white-primary">
                {currentWeek === 0 ? 'Esta Semana' : `Semana ${currentWeek > 0 ? '+' : ''}${currentWeek}`}
              </h3>
              <p className="text-xs text-gray-lightest">
                {getCurrentWeekDays()[0].fecha} - {getCurrentWeekDays()[6].fecha}
              </p>
            </div>

            <div className="flex gap-2">
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
                className="elegante-button-primary flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Nueva Cita
              </button>
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

        {/* Calendario Semanal */}
        <div className="elegante-card">
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Header de días */}
              <div className="grid grid-cols-8 gap-1 mb-4 border-b border-gray-dark pb-4">
                <div className="text-center">
                  <span className="text-sm font-semibold text-gray-light">Horas</span>
                </div>
                {getCurrentWeekDays().map(({ dia, fecha }) => (
                  <div key={dia} className="text-center">
                    <h4 className="font-semibold text-white-primary">{dia}</h4>
                    <p className="text-xs text-gray-lightest">{fecha}</p>
                    <div className="text-xs text-orange-primary mt-1">
                      {getCitasPorDia(dia).length} citas
                    </div>
                  </div>
                ))}
              </div>

              {/* Grid de horarios */}
              <div className="relative">
                {(() => {
                  const weekDays = getCurrentWeekDays();
                  const todayStr = toLocalDateString(new Date());
                  return horasDelDia.map((hora) => (
                    <div key={hora} className="grid grid-cols-8 gap-1 h-14 border-b border-gray-dark">
                      <div className="flex items-center justify-center text-xs text-gray-light font-medium">
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
                              const currentMinutesAdjusted = today.getHours() * 60 + today.getMinutes();
                              // Se desactiva si han pasado más de 30 minutos desde el inicio de la hora
                              if ((hora * 60) <= currentMinutesAdjusted - 30) {
                                isPastSlot = true;
                              }
                           }
                        }

                        return (
                          <div
                            key={`${dia}-${hora}`}
                            className={`relative rounded border transition-all duration-200 ${isPastSlot && citasEnSlot.length === 0
                                ? "bg-gray-darkest border-gray-dark/40 cursor-not-allowed opacity-60"
                                : isPastSlot && citasEnSlot.length > 0
                                  ? "bg-gray-darker border-gray-dark hover:bg-gray-dark opacity-80 cursor-pointer hover:border-orange-primary/50 group"
                                  : "bg-gray-darker border-gray-dark hover:bg-gray-dark hover:border-orange-primary/50 cursor-pointer group"
                              }`}
                            onClick={() => {
                              // Permitir clic si no es pasada o si es pasada pero tiene citas (para poder editarlas)
                              if (!isPastSlot || citasEnSlot.length > 0) handleSlotClick(dia, hora);
                            }}
                            title={isPastSlot && citasEnSlot.length === 0 ? "Franja pasada y sin citas" : `Gestionar citas de ${dia} a las ${formatHora12(hora)}`}
                          >
                            {/* Indicador de citas */}
                            {citasEnSlot.length > 0 && (
                              <div className={`absolute top-1 right-1 text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold ${isPastSlot ? "bg-gray-dark text-gray-light" : "bg-orange-primary text-black-primary"
                                }`}>
                                {citasEnSlot.length}
                              </div>
                            )}

                            {/* Overlay hover */}
                            {(!isPastSlot || citasEnSlot.length > 0) && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="text-center">
                                  <MoreHorizontal className="w-6 h-6 text-orange-primary mx-auto mb-1" />
                                  <span className="text-xs text-orange-primary">Gestionar</span>
                                </div>
                              </div>
                            )}

                            {/* Vista previa de citas */}
                            <div className="p-1 space-y-1 max-h-14 overflow-hidden">
                              {citasEnSlot.slice(0, 2).map((cita) => (
                                <div
                                  key={cita.id}
                                  className="text-xs p-1 rounded truncate"
                                  style={{
                                    backgroundColor: getCitaColor(cita.estado) + (isPastSlot ? '20' : '40'),
                                    color: getCitaColor(cita.estado),
                                    border: `1px solid ${getCitaColor(cita.estado)}`
                                  }}
                                >
                                  {cita.clienteNombre}
                                </div>
                              ))}
                              {citasEnSlot.length > 2 && (
                                <div className="text-xs text-gray-light text-center">
                                  +{citasEnSlot.length - 2} más
                                </div>
                              )}
                            </div>
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
          {activeTab === 'lista' && (
            <div className="space-y-6">
              {/* Filtros y búsqueda */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                  <Input
                    placeholder="Buscar por cliente, teléfono o servicio..."
                    value={slotSearchTerm}
                    onChange={(e) => setSlotSearchTerm(e.target.value)}
                    className="elegante-input pl-11"
                  />
                </div>

                <Select value={slotFilterEstado} onValueChange={setSlotFilterEstado}>
                  <SelectTrigger className="w-48 elegante-input">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    <SelectItem value="all" className="text-white-primary">Todos</SelectItem>
                    {estados.map((estado) => (
                      <SelectItem key={estado.value} value={estado.value} className="text-white-primary">
                        {estado.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de citas */}
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedSlot && getCitasEnSlot(selectedSlot.dia, selectedSlot.hora).map((cita) => {
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
                                  handleEditCita(cita);
                                }}
                                className="p-2 rounded bg-orange-primary/20 hover:bg-orange-primary/30 transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-orange-primary" />
                              </button>
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

                {selectedSlot && getCitasEnSlot(selectedSlot.dia, selectedSlot.hora).length === 0 && (
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
          )}

          {activeTab === 'detalle' && selectedCita && (
            <div className="space-y-6">
              <div className="bg-gray-darker border border-gray-dark rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white-primary">{selectedCita.clienteNombre}</h3>
                  <div className={`elegante-tag ${getEstadoInfo(selectedCita.estado).color} text-white`}>
                    {getEstadoInfo(selectedCita.estado).label}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Información del Cliente</h4>
                      <p className="text-white-primary">{selectedCita.clienteNombre}</p>
                      <p className="text-gray-lightest text-sm">{selectedCita.telefono}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-light mb-1">Servicio</h4>
                      <p className="text-white-primary">{selectedCita.servicioNombre}</p>
                      <p className="text-orange-primary font-semibold">{formatearPrecio(selectedCita.precio)}</p>
                    </div>
                    {selectedCita.productosNombres && selectedCita.productosNombres.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-light mb-1 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" /> Productos
                        </h4>
                        {selectedCita.productosNombres.map((nombre: string, i: number) => (
                          <p key={i} className="text-white-primary text-sm">• {nombre}</p>
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
                      <p className="text-white-primary">{selectedCita.barberoNombre}</p>
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
                    onClick={() => handleEditCita(selectedCita)}
                    className="elegante-button-primary"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar Cita
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

      <AlertContainer />
    </>
  );
}
