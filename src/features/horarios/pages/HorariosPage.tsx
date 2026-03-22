import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  User as UserIcon,
  CheckCircle,
  AlertTriangle,
  X,
  ToggleRight,
  ToggleLeft,
  Loader2,
  Filter,
  CalendarX,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../shared/components/ui/dialog";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../shared/components/ui/alert-dialog";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { barberosService, Barbero } from "../../administracion/services/barberosService";
import { horariosService, HorarioBarbero } from "../../agendamiento/services/horariosService";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { emailJsService } from "../../../shared/services/emailJsService";

const diasSemana = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

// Tipo para un bloque de horario (día + hora inicio + hora fin)
interface BloqueHorario {
  id?: number;
  dia: string;
  horaInicio: string;
  horaFin: string;
  estado?: boolean;
}

// Tipo para un horario completo (un solo registro con múltiples bloques)
interface HorarioSemanal {
  id: number;
  barberoId: number;
  barbero: string;
  documento?: string;
  tipoDocumento?: string;
  activo: boolean; // Estado derivado
  bloques: BloqueHorario[];
  notas?: string;
}

export function HorariosPage() {
  const { success, error, AlertContainer } = useCustomAlert();
  const [horarios, setHorarios] = useState<HorarioSemanal[]>([]);
  const [barberos, setBarberos] = useState<Barbero[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isSpecialCancelDialogOpen, setIsSpecialCancelDialogOpen] = useState(false);
  const [isReprogramDialogOpen, setIsReprogramDialogOpen] = useState(false);

  // Selection states
  const [editingHorario, setEditingHorario] = useState<HorarioSemanal | null>(null);
  const [horarioToDelete, setHorarioToDelete] = useState<HorarioSemanal | null>(null);
  const [selectedHorario, setSelectedHorario] = useState<HorarioSemanal | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [cancelMotive, setCancelMotive] = useState("Día desactivado por administración.");
  const [isProcessingSpecialCancel, setIsProcessingSpecialCancel] = useState(false);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [reprogramItems, setReprogramItems] = useState<Array<{ citaId: number; clienteId: number; barberoId: number; sugerencias: string[] }>>([]);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Estado para el formulario de nuevo horario
  const [nuevoHorario, setNuevoHorario] = useState<{
    barberoId: string;
    activo: boolean;
    bloques: BloqueHorario[];
  }>({
    barberoId: "",
    activo: true,
    bloques: [],
  });

  const [barberoSearchTerm, setBarberoSearchTerm] = useState("");
  const [showBarberoResults, setShowBarberoResults] = useState(false);

  // Estado para agregar un nuevo bloque
  const [nuevoBloque, setNuevoBloque] = useState<BloqueHorario>({
    dia: "",
    horaInicio: "",
    horaFin: "",
  });

  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>([]);

  // Cargar datos al inicio
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [barberosData, horariosData] = await Promise.all([
        barberosService.getBarberos(),
        horariosService.getHorarios()
      ]);

      // Mapear barberos de API a formato local para evitar problemas de nombres de propiedades
      const barberosMapeados = barberosData.map(b => ({
        id: b.id,
        nombre: (b as any).nombres || b.nombre,
        apellido: (b as any).apellidos || b.apellido,
        documento: b.documento || (b as any).documento || '',
        tipoDocumento: b.tipoDocumento || (b as any).tipoDocumento || 'CC',
        estado: b.estado
      }));

      setBarberos(barberosMapeados as any);

      // Agrupar horarios por barberoId
      const horariosPorBarbero: Record<number, HorarioBarbero[]> = {};
      horariosData.forEach(h => {
        if (!horariosPorBarbero[h.barberoId]) {
          horariosPorBarbero[h.barberoId] = [];
        }
        horariosPorBarbero[h.barberoId]!.push(h);
      });

      // Mapear a la estructura de la vista
      const horariosMapeados: HorarioSemanal[] = barberosMapeados
        .filter(b => b.id !== undefined && b.estado === true && horariosPorBarbero[b.id] && horariosPorBarbero[b.id].length > 0)
        .map(b => {
          const bloquesBarbero = horariosPorBarbero[b.id!] || [];
          // El estado activo del horario depende de si tiene al menos un bloque activo
          const representsActivo = bloquesBarbero.some(h => h.estado !== false);

          return {
            id: b.id!,
            barberoId: b.id!,
            barbero: `${b.nombre} ${b.apellido}`,
            documento: b.documento || '',
            tipoDocumento: b.tipoDocumento || 'CC',
            activo: representsActivo,
            bloques: bloquesBarbero.map(h => ({
              id: h.id,
              dia: h.dia,
              horaInicio: h.horaInicio,
              horaFin: h.horaFin,
              estado: h.estado ?? true
            }))
          };
        });

      setHorarios(horariosMapeados);
    } catch (err) {
      console.error("Error cargando horarios:", err);
      error("Error de conexión", "No se pudieron cargar los horarios de los barberos.");
    } finally {
      setLoading(false);
    }
  };

  const filteredHorarios = horarios.filter((horario) => {
    const matchesActivo =
      statusFilter === "all" ||
      (statusFilter === "active" ? horario.activo : !horario.activo);
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchesActivo;
    // Buscar en todos los campos mostrados en la tabla: Documento, Barbero, Días, Horas, Bloques, Estado
    const docStr = `${horario.tipoDocumento ?? ""} ${horario.documento ?? ""}`.toLowerCase();
    const barberoStr = (horario.barbero ?? "").toLowerCase();
    const diasStr = [...new Set(horario.bloques.map((b) => b.dia))].join(" ").toLowerCase();
    const horasStr = horario.bloques.map((b) => `${b.horaInicio} ${b.horaFin}`).join(" ").toLowerCase();
    const bloquesStr = `${horario.bloques.length} bloque${horario.bloques.length !== 1 ? "s" : ""}`.toLowerCase();
    const estadoStr = horario.activo ? "activo" : "inactivo";
    const searchable = [docStr, barberoStr, diasStr, horasStr, bloquesStr, estadoStr].join(" ");
    return searchable.includes(q) && matchesActivo;
  });

  // Paginación
  const totalPages = Math.max(1, Math.ceil(filteredHorarios.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedHorarios = filteredHorarios.slice(startIndex, startIndex + itemsPerPage);

  // Agregar bloque al formulario
  const handleAgregarBloque = () => {
    if (diasSeleccionados.length === 0) {
      error("Días requeridos", "Por favor selecciona al menos un día de la semana.");
      return;
    }
    if (!nuevoBloque.horaInicio || !nuevoBloque.horaFin) {
      error("Horario incompleto", "Por favor ingresa la hora de inicio y fin.");
      return;
    }
    if (nuevoBloque.horaInicio >= nuevoBloque.horaFin) {
      error("Horario inválido", "La hora de inicio debe ser anterior a la hora de fin.");
      return;
    }

    // Filtrar días que ya están en el horario para evitar duplicados
    const diasSinDuplicados = diasSeleccionados.filter(dia => 
      !nuevoHorario.bloques.some(b => b.dia === dia)
    );

    if (diasSinDuplicados.length === 0) {
      error("Días duplicados", "Los días seleccionados ya tienen un bloque de horario asignado.");
      return;
    }

    const nuevosBloques = diasSinDuplicados.map(dia => ({
      ...nuevoBloque,
      dia,
      estado: true
    }));

    setNuevoHorario(prev => ({
      ...prev,
      bloques: [...prev.bloques, ...nuevosBloques],
    }));

    setNuevoBloque({ dia: "", horaInicio: "", horaFin: "" });
    setDiasSeleccionados([]);
  };

  // Eliminar bloque del formulario
  const handleEliminarBloque = (index: number) => {
    setNuevoHorario({
      ...nuevoHorario,
      bloques: nuevoHorario.bloques.filter((_, i) => i !== index),
    });
  };

  // Resetear formulario
  const resetFormulario = () => {
    setNuevoHorario({
      barberoId: "",
      activo: true,
      bloques: [],
    });
    setNuevoBloque({ dia: "", horaInicio: "", horaFin: "" });
    setDiasSeleccionados([]);
    setBarberoSearchTerm("");
    setShowBarberoResults(false);
  };

  const handleCreateHorario = async () => {
    if (!nuevoHorario.barberoId) {
      error("Barbero requerido", "Por favor selecciona un barbero.");
      return;
    }
    if (nuevoHorario.bloques.length === 0) {
      error("Sin bloques", "Debes agregar al menos un bloque de horario (día + horas).");
      return;
    }

    if (horarios.some(h => h.barberoId.toString() === nuevoHorario.barberoId)) {
      error("Duplicado", "Este barbero ya tiene horarios asignados. Edítalos en su lugar.");
      return;
    }

    // Ejecutar creación directamente
    await confirmCreateHorario();
  };

  const confirmCreateHorario = async () => {
    try {
      const barberoIdNum = parseInt(nuevoHorario.barberoId);
      const promises = nuevoHorario.bloques.map(bloque => {
        const horarioData: HorarioBarbero = {
          barberoId: barberoIdNum,
          dia: bloque.dia,
          horaInicio: bloque.horaInicio,
          horaFin: bloque.horaFin,
          estado: true
        };
        return horariosService.createHorario(horarioData);
      });

      await Promise.all(promises);

      resetFormulario();
      setIsDialogOpen(false);
      await loadData(true);
      success("¡Horario creado!", "Se han registrado los horarios correctamente.");
    } catch (err) {
      console.error(err);
      error("Error", "No se pudieron crear los horarios.");
    }
  };

  const handleEditHorario = (horario: HorarioSemanal) => {
    setEditingHorario(horario);
    setNuevoHorario({
      barberoId: horario.barberoId.toString(),
      activo: horario.activo,
      bloques: [...horario.bloques],
    });
    setBarberoSearchTerm(horario.barbero);
    setIsDialogOpen(true);
  };

  const handleUpdateHorario = () => {
    if (!nuevoHorario.barberoId) {
      error("Barbero requerido", "Por favor selecciona un barbero.");
      return;
    }
    if (nuevoHorario.bloques.length === 0) {
      error("Sin bloques", "Debes agregar al menos un bloque de horario.");
      return;
    }
    setIsEditDialogOpen(true);
  };

  const confirmEditHorario = async () => {
    if (!editingHorario) return;

    try {
      const barberoIdNum = parseInt(nuevoHorario.barberoId);

      // Bloques actuales en BD (traídos en loadData y guardados en editingHorario)
      const bloquesActuales = editingHorario.bloques;

      // Bloques en el formulario
      const bloquesNuevos = nuevoHorario.bloques;

      // 1. Eliminar los que ya no están
      // Un bloque se elimina si tiene ID y ese ID no está en la lista nueva
      const idsNuevos = new Set(bloquesNuevos.map(b => b.id).filter(id => id !== undefined));
      const bloquesAEliminar = bloquesActuales.filter(b => b.id !== undefined && !idsNuevos.has(b.id));

      // 2. Crear los nuevos (no tienen ID)
      const bloquesACrear = bloquesNuevos.filter(b => b.id === undefined);

      // 3. Actualizar los existentes (tienen ID)
      const bloquesAActualizar = bloquesNuevos.filter(b => b.id !== undefined);

      const deletePromises = bloquesAEliminar.map(b => horariosService.deleteHorario(b.id!));

      const createPromises = bloquesACrear.map(b => horariosService.createHorario({
        barberoId: barberoIdNum,
        dia: b.dia,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        estado: true
      }));

      const updatePromises = bloquesAActualizar.map(b => horariosService.updateHorario(b.id!, {
        id: b.id,
        barberoId: barberoIdNum,
        dia: b.dia,
        horaInicio: b.horaInicio,
        horaFin: b.horaFin,
        estado: true
      }));

      await Promise.all([...deletePromises, ...createPromises, ...updatePromises]);

      setEditingHorario(null);
      resetFormulario();
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
      await loadData(true);

      success("¡Horario actualizado!", "Los cambios han sido guardados exitosamente.");
    } catch (err) {
      console.error(err);
      error("Error", "Ocurrió un error al actualizar los horarios.");
    }
  };

  const handleDeleteHorario = (horario: HorarioSemanal) => {
    setHorarioToDelete(horario);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (horarioToDelete) {
      try {
        const promises = horarioToDelete.bloques.map(b =>
          b.id ? horariosService.deleteHorario(b.id) : Promise.resolve()
        );
        await Promise.all(promises);

        setIsDeleteDialogOpen(false);
        setHorarioToDelete(null);
        await loadData(true);
        success("¡Horario eliminado!", `El horario de ${horarioToDelete.barbero} ha sido eliminado.`);
      } catch (err) {
        console.error(err);
        error("Error", "No se pudo eliminar el horario.");
      }
    }
  };

  const obtenerUsuarioSolicitanteId = (): number | null => {
    try {
      const raw = localStorage.getItem('barbershop_user');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id);
      return Number.isFinite(id) && id > 0 ? id : null;
    } catch {
      return null;
    }
  };

  const formatDateLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const ordenDias: { [key: string]: number } = {
    Lunes: 1,
    Martes: 2,
    Miércoles: 3,
    Jueves: 4,
    Viernes: 5,
    Sábado: 6,
    Domingo: 7,
  };
  const getTodayNumeric = (): number => {
    const d = new Date();
    const js = d.getDay(); // 0=Domingo ... 6=Sábado
    return js === 0 ? 7 : js;
  };
  const getDateForThisWeek = (diaNombre: string): Date => {
    const today = new Date();
    const todayNum = getTodayNumeric();
    const targetNum = ordenDias[diaNombre] ?? 0;
    const diff = targetNum - todayNum;
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return new Date(base.getFullYear(), base.getMonth(), base.getDate() + diff);
  };
  const getDateForWeek = (diaNombre: string, weekOffset: number): Date => {
    const base = getDateForThisWeek(diaNombre);
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + (7 * weekOffset));
    return target;
  };

  const toggleEstadoHorario = async (horario: HorarioSemanal) => {
    try {
      setTogglingId(horario.id);
      const nuevoEstado = !horario.activo;

      if (!nuevoEstado) {
        const usuarioSolicitanteId = obtenerUsuarioSolicitanteId();
        if (!usuarioSolicitanteId) {
          error("Sesión inválida", "No se pudo identificar el usuario solicitante.");
          setTogglingId(null);
          return;
        }

        const motivo = "Horario desactivado desde el panel de gestión.";
        
        // Deactivamos TODOS los bloques activos de este barbero
        const bloquesAProcesar = horario.bloques.filter(b => b.estado !== false && !!b.id);
        
        if (bloquesAProcesar.length > 0) {
          const resultados = await Promise.all(
            bloquesAProcesar.map(b => {
                const fechaRef = formatDateLocal(getDateForThisWeek(b.dia));
                return horariosService.toggleEstado(b.id!, false, {
                  usuarioSolicitanteId,
                  fechaReferencia: fechaRef,
                  motivo,
                  cantidadSugerencias: 3
                });
            })
          );

          let totalCanceladas = 0;
          const allDetalles: any[] = [];

          resultados.forEach(res => {
            totalCanceladas += Number(res?.citasCanceladas || 0);
            if (Array.isArray(res?.detalle)) {
                allDetalles.push(...res.detalle);
            }
          });

          // --- NOTIFICACIÓN VÍA EMAILJS ---
          if (allDetalles.length > 0) {
            allDetalles.forEach(item => {
              if (item?.clienteCorreo) {
                emailJsService.notificarCancelacion({
                  cliente_nombre: item.clienteNombre || "Cliente",
                  cliente_email: item.clienteCorreo,
                  barbero_nombre: item.barberoNombre || "Tu barbero",
                  fecha_original: item.fechaHoraOriginal ? new Date(item.fechaHoraOriginal).toLocaleString('es-CO') : "Fecha no especificada",
                  motivo_cancelacion: motivo,
                  sugerencias_reprogramacion: Array.isArray(item.sugerenciasReprogramacion) ? item.sugerenciasReprogramacion : []
                });
              }
            });
          }

          await loadData(true);
          success("Horario desactivado", `Se han desactivado ${bloquesAProcesar.length} turnos y cancelado ${totalCanceladas} citas. Los correos de notificación han sido enviados.`);
        } else {
            // Si por alguna razón no hay bloques marcados como activos pero el toggle decía activo
            await loadData(true);
            success("Estado actualizado", "El horario ya no está operativo.");
        }
      } else {
        // ACTIVAR: Activamos todos los bloques que estén inactivos
        const bloquesInactivos = horario.bloques.filter(b => !!b.id && b.estado === false);
        const promises = bloquesInactivos.map(b => horariosService.toggleEstado(b.id!, true));
        await Promise.all(promises);
        await loadData(true);
        success("Estado actualizado", `El horario de ${horario.barbero} ahora está activo`);
      }
    } catch (err) {
      console.error(err);
      error("Error", "No se pudo cambiar el estado.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenSpecialCancel = (horario: HorarioSemanal) => {
    setSelectedHorario(horario);
    setSelectedDates([]);
    setCancelMotive("Día desactivado por administración.");
    setIsSpecialCancelDialogOpen(true);
  };

  const handleConfirmSpecialCancel = async () => {
    if (!selectedHorario || selectedDates.length === 0) {
      error("Datos incompletos", "Por favor selecciona al menos una fecha.");
      return;
    }

    const usuarioSolicitanteId = obtenerUsuarioSolicitanteId();
    if (!usuarioSolicitanteId) {
      error("Sesión inválida", "No se pudo identificar el usuario solicitante.");
      return;
    }

    try {
      setIsProcessingSpecialCancel(true);
      const diasJs = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
      let totalCanceladas = 0;
      const fechasFallidas: string[] = [];
      const erroresApi: string[] = [];
      const fechasUnicas = Array.from(new Set(selectedDates.map((d) => formatDateLocal(d))))
        .map((value) => new Date(`${value}T00:00:00`));
      const collectedReprogram: Array<{ 
        citaId: number; 
        clienteId: number; 
        barberoId: number; 
        sugerencias: string[];
        clienteNombre?: string;
        clienteCorreo?: string;
        barberoNombre?: string;
        fechaHoraOriginal?: string;
      }> = [];

      for (const fecha of fechasUnicas) {
        const diaSemanaNombre = diasJs[fecha.getDay()];
        const bloquesDelDia = selectedHorario.bloques.filter(
          b => !!b.id && b.dia === diaSemanaNombre && b.estado !== false
        );
        const fechaStr = formatDateLocal(fecha);

        if (bloquesDelDia.length === 0) {
          try {
            const resultadoDirecto = await horariosService.cancelarDiaPorBarbero(selectedHorario.barberoId, {
              usuarioSolicitanteId,
              fechaReferencia: fechaStr,
              motivo: (cancelMotive || "").trim() || "Día desactivado por administración.",
              cantidadSugerencias: 3
            });
            totalCanceladas += Number(resultadoDirecto?.citasCanceladas) || 0;
            const detalle = Array.isArray(resultadoDirecto?.detalle) ? resultadoDirecto.detalle : [];
            detalle.forEach((item: any) => {
              const sug = Array.isArray(item?.sugerenciasReprogramacion) ? item.sugerenciasReprogramacion : [];
              collectedReprogram.push({
                citaId: Number(item?.citaId || 0),
                clienteId: Number(item?.clienteId || 0),
                barberoId: Number(item?.barberoId || 0),
                sugerencias: sug.map((s: any) => String(s)),
                clienteNombre: item?.clienteNombre,
                clienteCorreo: item?.clienteCorreo,
                barberoNombre: item?.barberoNombre,
                fechaHoraOriginal: item?.fechaHoraOriginal
              });
            });
            continue;
          } catch (apiError: any) {
            const detalle = apiError?.message ? String(apiError.message) : "Error desconocido";
            erroresApi.push(`${fechaStr} (${diaSemanaNombre}): ${detalle}`);
            continue;
          }
        }

        for (const bloque of bloquesDelDia) {
          try {
            const resultado = await horariosService.toggleEstado(bloque.id!, false, {
              usuarioSolicitanteId,
              fechaReferencia: fechaStr,
              motivo: (cancelMotive || "").trim() || "Día desactivado por administración.",
              cantidadSugerencias: 3
            });
            totalCanceladas += Number(resultado?.citasCanceladas) || 0;
            const detalle = Array.isArray(resultado?.detalle) ? resultado.detalle : [];
            detalle.forEach((item: any) => {
              const sug = Array.isArray(item?.sugerenciasReprogramacion) ? item.sugerenciasReprogramacion : [];
              collectedReprogram.push({
                citaId: Number(item?.citaId || 0),
                clienteId: Number(item?.clienteId || 0),
                barberoId: Number(item?.barberoId || 0),
                sugerencias: sug.map((s: any) => String(s)),
                clienteNombre: item?.clienteNombre,
                clienteCorreo: item?.clienteCorreo,
                barberoNombre: item?.barberoNombre,
                fechaHoraOriginal: item?.fechaHoraOriginal
              });
            });
          } catch (apiError: any) {
            const detalle = apiError?.message ? String(apiError.message) : "Error desconocido";
            erroresApi.push(`${fechaStr} (${diaSemanaNombre}): ${detalle}`);
          }
        }
      }

      await loadData(true);
      setIsSpecialCancelDialogOpen(false);
      setReprogramItems(collectedReprogram);
      if (collectedReprogram.length > 0) {
        setIsReprogramDialogOpen(true);
        
        // --- ENVÍO DE CORREOS VÍA EMAILJS ---
        // Notificamos de manera asíncrona sin bloquear la UI
        const motivo = (cancelMotive || "").trim() || "Día desactivado por administración.";
        collectedReprogram.forEach(item => {
          if (item.clienteCorreo) {
            emailJsService.notificarCancelacion({
              cliente_nombre: item.clienteNombre || "Cliente",
              cliente_email: item.clienteCorreo,
              barbero_nombre: item.barberoNombre || "Tu barbero",
              fecha_original: item.fechaHoraOriginal ? new Date(item.fechaHoraOriginal).toLocaleString('es-CO') : "Fecha no especificada",
              motivo_cancelacion: motivo,
              sugerencias_reprogramacion: item.sugerencias
            });
          }
        });
      }
      
      if (fechasFallidas.length > 0 && fechasFallidas.length === fechasUnicas.length && erroresApi.length === 0) {
        error("Error en todas las fechas", "No se encontró horario activo para ninguna de las fechas seleccionadas.");
      } else {
        if (erroresApi.length > 0) {
          const resumenErrores = erroresApi.slice(0, 3).join(" | ");
          error(
            "Cancelación parcial con errores",
            `Citas canceladas: ${totalCanceladas}. Errores: ${resumenErrores}${erroresApi.length > 3 ? " ..." : ""}`
          );
        } else {
          const msg = fechasFallidas.length > 0 
            ? `Se procesaron las fechas. Citas canceladas: ${totalCanceladas}. Omitidas: ${fechasFallidas.join(", ")}`
            : `Se cancelaron los horarios para ${fechasUnicas.length} días. Citas canceladas: ${totalCanceladas}.`;
          success("Cancelación completada", msg);
        }
      }
    } catch (err) {
      console.error(err);
      error("Error", "Ocurrió un error al procesar las cancelaciones.");
    } finally {
      setIsProcessingSpecialCancel(false);
    }
  };

  const handleViewDetail = (horario: HorarioSemanal) => {
    setSelectedHorario(horario);
    setIsDetailDialogOpen(true);
  };

  const reprogramAgendamiento = async (citaId: number, sugerenciaIso: string) => {
    try {
      const original = await agendamientoService.getAgendamientoById(citaId);
      const dt = new Date(sugerenciaIso);
      const fecha = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
      const hora = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;

      const created = await agendamientoService.createAgendamiento({
        clienteId: original.clienteId,
        barberoId: original.barberoId,
        servicioId: original.servicioId,
        servicioIds: original.servicioIds,
        paqueteId: original.paqueteId,
        fecha,
        hora,
        duracion: original.duracion,
        precio: original.precio,
        estado: 'Pendiente',
        notas: `Reprogramación de cita cancelada #${citaId}`
      });
      success("Cita reprogramada", `Nueva fecha: ${created.fecha} ${created.hora} para ${created.clienteNombre}`);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Error desconocido";
      error("No se pudo reprogramar", msg);
    }
  };


  // Obtener resumen de días del horario
  const getDiasResumen = (bloques: BloqueHorario[]) => {
    const diasUnicos = [...new Set(bloques.map((b) => b.dia))];
    if (diasUnicos.length <= 3) {
      return diasUnicos.join(", ");
    }
    return `${diasUnicos.slice(0, 2).join(", ")} +${diasUnicos.length - 2} más`;
  };

  // Ordenar bloques por día de la semana
  const ordenarBloques = (bloques: BloqueHorario[]) => {
    const ordenDias: { [key: string]: number } = {
      Lunes: 1,
      Martes: 2,
      Miércoles: 3,
      Jueves: 4,
      Viernes: 5,
      Sábado: 6,
      Domingo: 7,
    };
    return [...bloques].sort((a, b) => {
      const ordenA = ordenDias[a.dia] || 0;
      const ordenB = ordenDias[b.dia] || 0;
      if (ordenA !== ordenB) return ordenA - ordenB;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  };

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">
              Horarios de Barbería
            </h1>
            <p className="text-sm text-gray-lightest mt-1">
              Gestiona los horarios semanales del personal
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Sección Principal */}
        <div className="elegante-card">
          {/* Barra de Controles */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-dark">
            <div className="flex flex-wrap items-center gap-4">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="elegante-button-primary gap-2 flex items-center"
                    onClick={() => {
                      setEditingHorario(null);
                      resetFormulario();
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Horario
                  </button>
                </DialogTrigger>
              </Dialog>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                <Input
                  placeholder="Buscar por documento, barbero, días, horas..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="elegante-input pl-11 w-80"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                    title="Limpiar búsqueda"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-darker text-gray-lighter hover:text-gray-lightest transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-gray-lightest" />
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as "all" | "active" | "inactive");
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-48 elegante-input">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark">
                      <SelectItem value="all" className="text-white-primary">Todos</SelectItem>
                      <SelectItem value="active" className="text-white-primary">Activos</SelectItem>
                      <SelectItem value="inactive" className="text-white-primary">Inactivos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="text-sm text-gray-lightest">
                  Mostrando {displayedHorarios.length} de {filteredHorarios.length} registros
                </div>
              </div>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full">
                <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">
                      Documento
                    </th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">
                      Barbero
                    </th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">
                      Días
                    </th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">
                      Horas
                    </th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">
                      Bloques
                    </th>
                    <th className="text-right py-3 px-4 text-white-primary font-bold text-sm">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingStateRow
                      colSpan={6}
                      title="Cargando horarios..."
                    />
                  ) : displayedHorarios.length > 0 ? displayedHorarios.map((horario) => (
                    <tr
                      key={horario.id}
                      className="border-b border-gray-dark hover:bg-gray-darker transition-colors"
                    >
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">
                          {horario.tipoDocumento} {horario.documento || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-dark border-2 border-gray-medium flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-gray-lightest" />
                          </div>
                          <span className="text-gray-lighter">
                            {horario.barbero}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">
                          {getDiasResumen(horario.bloques)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="text-gray-lighter text-sm">
                          {horario.bloques.length > 0 && (
                            <div className="text-gray-lighter">
                              {horario.bloques[0].horaInicio} - {horario.bloques[0].horaFin}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 rounded bg-gray-medium text-gray-lighter text-sm">
                          {horario.bloques.length} bloque{horario.bloques.length !== 1 ? "s" : ""}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleEstadoHorario(horario)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title={horario.activo ? "Desactivar" : "Activar"}
                            disabled={togglingId === horario.id}
                          >
                            {togglingId === horario.id ? (
                              <Loader2 className="w-4 h-4 text-orange-primary animate-spin" />
                            ) : horario.activo ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleOpenSpecialCancel(horario)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Cancelación Especial (Días/Citas)"
                          >
                            <CalendarX className="w-4 h-4 text-gray-lightest group-hover:text-red-500" />
                          </button>
                          <button
                            onClick={() => handleViewDetail(horario)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleEditHorario(horario)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleDeleteHorario(horario)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <TableEmptyStateRow
                      colSpan={6}
                      title="No se encontraron horarios"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={loadData}
                    />
                  )}
                </tbody>
              </table>
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-dark">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-lightest">
                Página {currentPage} de {totalPages}
              </div>
            </div>
            <EllipsisPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
              className="mx-0 w-auto justify-end"
            />
          </div>
        </div>
      </main>

      {/* Dialog de Creación/Edición */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-dark">
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-primary" />
              {editingHorario ? "Editar Horario" : "Nuevo Horario"}
            </DialogTitle>
            <DialogDescription className="text-gray-lightest mt-1.5">
              {editingHorario
                ? "Modifica la información del horario"
                : "Crea un horario semanal agregando bloques de día y hora"}
            </DialogDescription>
          </DialogHeader>


          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna Izquierda: Barbero + Agregar Bloque */}
              <div className="space-y-4">
                {/* Barbero */}
                <div className="space-y-1.5">
                  <Label className="text-gray-lightest text-sm">Barbero *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                    <Input
                      placeholder="Buscar barbero por nombre..."
                      value={barberoSearchTerm}
                      onChange={(e) => {
                        setBarberoSearchTerm(e.target.value);
                        setShowBarberoResults(true);
                      }}
                      onFocus={() => setShowBarberoResults(true)}
                      onBlur={() => setTimeout(() => setShowBarberoResults(false), 200)}
                      className="elegante-input pl-11 w-full"
                      disabled={!!editingHorario}
                    />

                    {showBarberoResults && barberoSearchTerm.trim() !== "" && !editingHorario && (
                      <div className="absolute z-50 w-full mt-2 bg-gray-darkest border border-gray-dark rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                        {(() => {
                          const query = barberoSearchTerm.toLowerCase();
                          const filteredResults = barberos.filter(b =>
                            b.estado === true && `${b.nombre} ${b.apellido}`.toLowerCase().includes(query)
                          );

                          if (filteredResults.length === 0) {
                            return (
                              <div className="p-4 text-center text-gray-lightest italic">
                                No se encontraron barberos.
                              </div>
                            );
                          }

                          return filteredResults.map((barbero) => (
                            <div
                              key={barbero.id}
                              onClick={() => {
                                setNuevoHorario({
                                  ...nuevoHorario,
                                  barberoId: barbero.id.toString()
                                });
                                setBarberoSearchTerm(`${barbero.nombre} ${barbero.apellido}`);
                                setShowBarberoResults(false);
                              }}
                              className="p-3 border-b border-gray-dark hover:bg-gray-dark transition-colors cursor-pointer group"
                            >
                              <div className="flex justify-between items-center">
                                <p className="text-white-primary font-medium text-sm group-hover:text-orange-secondary transition-colors">
                                  {barbero.nombre} {barbero.apellido}
                                </p>
                                <p className="text-[10px] text-gray-lightest">{barbero.documento || ''}</p>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Agregar Bloque */}
                <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                  <h3 className="text-white-primary font-medium mb-3 flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-orange-primary" />
                    Agregar Bloque de Horario
                  </h3>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-lightest text-sm">Días *</Label>
                      <div className="flex flex-wrap gap-2">
                        {diasSemana.map((dia) => {
                          const isSelected = diasSeleccionados.includes(dia);
                          const isAlreadyAdded = nuevoHorario.bloques.some(b => b.dia === dia);
                          return (
                            <button
                              key={dia}
                              type="button"
                              disabled={isAlreadyAdded}
                              onClick={() => {
                                if (isSelected) {
                                  setDiasSeleccionados(diasSeleccionados.filter((d) => d !== dia));
                                } else {
                                  setDiasSeleccionados([...diasSeleccionados, dia]);
                                }
                              }}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border flex items-center gap-1 ${isSelected
                                ? "bg-orange-primary text-black-primary border-orange-primary shadow-[0_0_10px_rgba(216,176,129,0.3)]"
                                : isAlreadyAdded
                                  ? "bg-green-600/10 text-green-400 border-green-500/30 cursor-not-allowed opacity-80"
                                  : "bg-gray-dark hover:bg-gray-medium text-gray-lightest border-gray-medium"
                                }`}
                              title={isAlreadyAdded ? "Este día ya tiene un bloque asignado" : ""}
                            >
                              {dia}
                              {isAlreadyAdded && <CheckCircle className="w-3 h-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-gray-lightest text-sm">Hora inicio</Label>
                        <Input
                          type="time"
                          value={nuevoBloque.horaInicio}
                          onChange={(e) =>
                            setNuevoBloque({ ...nuevoBloque, horaInicio: e.target.value })
                          }
                          className="elegante-input p-2.5"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-gray-lightest text-sm">Hora fin</Label>
                        <Input
                          type="time"
                          value={nuevoBloque.horaFin}
                          onChange={(e) =>
                            setNuevoBloque({ ...nuevoBloque, horaFin: e.target.value })
                          }
                          className="elegante-input p-2.5"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAgregarBloque(); }}
                      className="w-full elegante-button-primary py-2 flex items-center justify-center gap-2 text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Bloque
                    </button>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Bloques Agregados */}
              <div className="space-y-4">
                <div className="bg-gray-darker rounded-lg p-6 border border-gray-dark h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white-primary font-medium flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-orange-primary" />
                      Bloques Agregados
                    </h3>
                    <span className="px-2 py-0.5 rounded bg-orange-primary/20 text-orange-primary text-xs font-medium">
                      {nuevoHorario.bloques.length}
                    </span>
                  </div>

                  {nuevoHorario.bloques.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-dark rounded-lg">
                      <Calendar className="w-8 h-8 text-gray-medium mx-auto mb-2" />
                      <p className="text-gray-lightest text-sm">Sin bloques</p>
                      <p className="text-gray-medium text-xs mt-1">
                        Agrega bloques de día y hora
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {ordenarBloques(nuevoHorario.bloques).map((bloque) => (
                        <div
                          key={`${bloque.dia}-${bloque.horaInicio}-${bloque.horaFin}-${bloque.id ?? 'new'}`}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-gray-darkest border border-gray-dark"
                        >
                          <div className="flex items-center gap-2" style={{ padding: "1rem" }}>
                            <div className="w-7 h-7 rounded bg-orange-primary/20 flex items-center justify-center">
                              <Calendar className="w-3.5 h-3.5 text-orange-primary" />
                            </div>
                            <div>
                              <p className="text-white-primary font-semibold text-base">
                                {bloque.dia}
                              </p>
                              <p className="text-gray-lightest text-xs">
                                {bloque.horaInicio} - {bloque.horaFin}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const realIdx = nuevoHorario.bloques.findIndex(
                                b => b.dia === bloque.dia && b.horaInicio === bloque.horaInicio && b.horaFin === bloque.horaFin && b.id === bloque.id
                              );
                              if (realIdx !== -1) handleEliminarBloque(realIdx);
                            }}
                            className="p-1.5 rounded hover:bg-red-600/20 transition-colors group"
                            style={{ padding: "1rem" }}
                            title="Eliminar bloque"
                          >
                            <X className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-dark">
            <button
              onClick={() => setIsDialogOpen(false)}
              className="px-4 py-2 rounded-lg bg-gray-medium hover:bg-gray-dark border border-gray-dark text-white-primary transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={editingHorario ? handleUpdateHorario : handleCreateHorario}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={!nuevoHorario.barberoId || nuevoHorario.bloques.length === 0}
            >
              <Clock className="w-4 h-4" />
              {editingHorario ? "Actualizar" : "Crear"} Horario
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelación Especial (Múltiples Días) */}
      <Dialog open={isSpecialCancelDialogOpen} onOpenChange={setIsSpecialCancelDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-dark">
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-red-500" />
              Cancelación Especial de Días
            </DialogTitle>
            <DialogDescription className="text-gray-lightest mt-1.5">
              Selecciona una o varias fechas para desactivar el horario de{" "}
              <span className="text-white-primary font-semibold">
                {selectedHorario?.barbero}
              </span>. 
              Esto cancelará automáticamente todas las citas de esos días y enviará notificaciones a los clientes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Selección por días de la semana */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="text-gray-lightest text-sm block">Selecciona los días:</Label>
                  <Select
                    value={String(weekOffset)}
                    onValueChange={(val) => setWeekOffset(Number(val))}
                  >
                    <SelectTrigger className="w-56 elegante-input">
                      <SelectValue placeholder="Semana" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark">
                      <SelectItem value="0" className="text-white-primary">Semana actual</SelectItem>
                      <SelectItem value="1" className="text-white-primary">Próxima semana</SelectItem>
                      <SelectItem value="2" className="text-white-primary">En 2 semanas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                  {diasSemana.map((dia) => {
                    const targetNum = ordenDias[dia] ?? 0;
                    const todayNum = getTodayNumeric();
                    const isDisabled = weekOffset === 0 && targetNum < todayNum;
                    const targetDate = getDateForWeek(dia, weekOffset);
                    const key = formatDateLocal(targetDate);
                    const isSelected = selectedDates.some(d => formatDateLocal(d) === key);
                    return (
                      <button
                        key={dia}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          if (isDisabled) return;
                          if (isSelected) {
                            setSelectedDates(selectedDates.filter(d => formatDateLocal(d) !== key));
                          } else {
                            setSelectedDates([...selectedDates, targetDate]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border flex items-center gap-1 ${
                          isDisabled
                            ? "bg-gray-dark text-gray-medium border-gray-medium cursor-not-allowed opacity-60"
                            : isSelected
                              ? "bg-orange-primary text-black-primary border-orange-primary shadow-[0_0_10px_rgba(216,176,129,0.3)]"
                              : "bg-gray-dark hover:bg-gray-medium text-gray-lightest border-gray-medium"
                        }`}
                        title={isDisabled ? "Este día ya pasó en esta semana" : ""}
                      >
                        {dia}
                        {isSelected && <CheckCircle className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-lightest italic">
                  * Semana: {weekOffset === 0 ? "actual" : weekOffset === 1 ? "próxima" : `en ${weekOffset} semanas`}. 
                  {weekOffset === 0 ? " Solo se pueden seleccionar el día de hoy y días futuros." : " Puedes seleccionar cualquier día."}
                </div>
              </div>

              {/* Formulario de Motivo */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-gray-lightest text-sm">Motivo de la cancelación *</Label>
                  <Textarea
                    placeholder="Escribe el motivo aquí... (Este se enviará a los clientes)"
                    value={cancelMotive}
                    onChange={(e) => setCancelMotive(e.target.value)}
                    className="elegante-input min-h-[120px] text-sm"
                  />
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-primary shrink-0" />
                    <div className="text-xs text-orange-200/80 leading-relaxed">
                      <p className="font-semibold text-orange-primary mb-1">Nota importante:</p>
                      Al confirmar, el sistema buscará los bloques de horario para los días de semana correspondientes a las fechas seleccionadas. 
                      Si no hay horario activo para un día específico, esa fecha será omitida.
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-lightest">
                  Fechas seleccionadas: <span className="text-white-primary font-medium">{selectedDates.length}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-dark gap-3">
            <button
              onClick={() => setIsSpecialCancelDialogOpen(false)}
              className="px-6 py-2 rounded-xl text-gray-lightest hover:bg-gray-dark transition-colors text-sm font-medium"
              disabled={isProcessingSpecialCancel}
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmSpecialCancel}
              disabled={isProcessingSpecialCancel || selectedDates.length === 0}
              className="elegante-button-primary bg-red-600 hover:bg-red-700 border-red-800 text-white-primary px-8 py-2 flex items-center gap-2"
            >
              {isProcessingSpecialCancel ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Cancelación
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reprogramación tras cancelación */}
      <Dialog open={isReprogramDialogOpen} onOpenChange={setIsReprogramDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-dark">
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-orange-primary" />
              Reprogramar citas canceladas
            </DialogTitle>
            <DialogDescription className="text-gray-lightest mt-1.5">
              Selecciona una de las sugerencias disponibles para reprogramar cada cita cancelada.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-4">
            {reprogramItems.length === 0 ? (
              <div className="text-center text-gray-lightest">No hay sugerencias disponibles.</div>
            ) : (
              reprogramItems.map(item => (
                <div key={item.citaId} className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                  <div className="flex items-center justify-between">
                    <div className="text-white-primary font-semibold text-sm">
                      Cita #{item.citaId}
                    </div>
                    <div className="text-xs text-gray-lightest">
                      Cliente ID: {item.clienteId} | Barbero ID: {item.barberoId}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.sugerencias.length === 0 ? (
                      <div className="text-xs text-gray-lightest italic">Sin sugerencias.</div>
                    ) : (
                      item.sugerencias.map(sug => (
                        <button
                          key={`${item.citaId}-${sug}`}
                          onClick={() => reprogramAgendamiento(item.citaId, sug)}
                          className="px-3 py-1.5 rounded-lg bg-gray-dark hover:bg-gray-medium text-gray-lightest border border-gray-medium text-xs transition-colors"
                          title="Reprogramar a esta fecha"
                        >
                          {new Date(sug).toLocaleString()}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-dark gap-3">
            <button
              onClick={() => setIsReprogramDialogOpen(false)}
              className="px-6 py-2 rounded-xl text-gray-lightest hover:bg-gray-dark transition-colors text-sm font-medium"
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialogs */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-400" />
              ¿Guardar cambios?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              Se actualizará el horario de{" "}
              <span className="font-semibold text-white-primary">
                {barberos.find(b => b.id.toString() === nuevoHorario.barberoId)?.nombre || 'Barbero'}
              </span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsEditDialogOpen(false)}
              className="elegante-button-secondary"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmEditHorario} className="elegante-button-primary">
              Guardar Cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-gray-darkest border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              ¿Eliminar Horario?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest">
              Se eliminará permanentemente el horario de{" "}
              <span className="font-semibold text-white-primary">{horarioToDelete?.barbero}</span>{" "}
              con todos sus bloques.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setIsDeleteDialogOpen(false)}
              className="elegante-button-secondary"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg"
            >
              Eliminar Horario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Ver Detalle */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white-primary text-xl flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              Detalles del Horario
            </DialogTitle>
          </DialogHeader>

          {selectedHorario && (
            <div className="py-4 space-y-4">
              {/* Info Principal */}
              <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-dark border-2 border-gray-medium flex items-center justify-center">
                    <UserIcon className="w-6 h-6 text-gray-lightest" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white-primary font-semibold text-lg">
                      {selectedHorario.barbero}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedHorario.activo
                        ? "bg-green-600/20 text-green-400"
                        : "bg-red-600/20 text-red-400"
                        }`}
                    >
                      {selectedHorario.activo ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloques de Horario */}
              <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                <h4 className="text-white-primary font-medium mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-primary" />
                  Bloques de Horario ({selectedHorario.bloques.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ordenarBloques(selectedHorario.bloques).map(
                    (bloque: BloqueHorario, index: number) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg bg-gray-darkest border border-gray-dark"
                      >
                        <p className="text-white-primary font-medium">{bloque.dia}</p>
                        <p className="text-orange-primary text-sm">
                          {bloque.horaInicio} - {bloque.horaFin}
                        </p>
                      </div>
                    )
                  )
                  }
                </div>
              </div>

              {/* Notas */}
              {selectedHorario.notas && (
                <div className="bg-gray-darker rounded-lg p-4 border border-gray-dark">
                  <h4 className="text-white-primary font-medium mb-2">Notas</h4>
                  <p className="text-gray-lightest text-sm">{selectedHorario.notas}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertContainer />
    </>
  );
}
