import React, { useState, useEffect } from "react";
import {
  Gift,
  Plus,
  Edit,
  ToggleLeft,
  ToggleRight,
  Eye,
  Clock,
  DollarSign,
  Scissors,
  Package,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Calculator,
  FileText
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Input } from "../../../shared/components/ui/input";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { apiService, Paquete } from "../../../shared/services/api";

import { servicioService, Servicio } from "../../servicios/services/servicioService";

const categorias = ["Premium", "Clásico", "Moderno", "Especial"];

export function PaquetesPage() {
  const { created, edited, deleted, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const { confirmCreateAction, DoubleConfirmationContainer } = useDoubleConfirmation();
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [selectedPaquete, setSelectedPaquete] = useState<Paquete | null>(null);
  const [detallePaquete, setDetallePaquete] = useState<any[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("all");
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Servicios disponibles cargados desde la API
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  // Mapa paqueteId -> nombres de servicios (para mostrar en columna Paquete)
  const [serviciosPorPaqueteId, setServiciosPorPaqueteId] = useState<Map<number, string[]>>(new Map());

  const mapServiciosPorPaquete = (detalles: any[]) => {
    const map = new Map<number, string[]>();
    for (const d of detalles || []) {
      const paqueteId = Number(d?.paqueteId || 0);
      if (!paqueteId) continue;
      const nombre = String(d?.nombreServicio || '').trim();
      if (!nombre) continue;
      const list = map.get(paqueteId) || [];
      list.push(nombre);
      map.set(paqueteId, list);
    }
    setServiciosPorPaqueteId(map);
  };

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [paquetesData, serviciosData, detallesData] = await Promise.all([
          apiService.getPaquetes(),
          servicioService.getServicios(),
          apiService.getDetallePaquetes().catch(() => [])
        ]);
        setPaquetes(paquetesData);
        setServiciosDisponibles(serviciosData.filter(s => s.estado === true));
        mapServiciosPorPaquete(detallesData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Function to reload paquetes. silent=true evita parpadeo tras crear/editar/eliminar/toggle.
  const loadPaquetes = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [data, detallesData] = await Promise.all([
        apiService.getPaquetes(),
        apiService.getDetallePaquetes().catch(() => [])
      ]);
      setPaquetes(data);
      mapServiciosPorPaquete(detallesData);
    } catch (error) {
      console.error('Error loading paquetes:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Function to load detalle paquete
  const loadDetallePaquete = async (paqueteId: number) => {
    try {
      setLoadingDetalle(true);

      // 1. Obtener los detalles específicos desde el endpoint de detalles
      const data = await apiService.getDetallePaquetesByPaqueteId(paqueteId);
      setDetallePaquete(data);

      // 2. Opcionalmente recargar el paquete por ID para asegurar que tiene los strings de servicios
      const fullPaquete = await apiService.getPaqueteById(paqueteId);
      if (fullPaquete) {
        setSelectedPaquete(fullPaquete);
      }
    } catch (error) {
      console.error('Error loading detalle paquete:', error);
      setDetallePaquete([]);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [serviciosAgregados, setServiciosAgregados] = useState<Array<{ nombre: string, precio: number }>>([]);
  const [precioInput, setPrecioInput] = useState<string>('');
  const [porcentajeInput, setPorcentajeInput] = useState<string>('');
  const [nuevoPaquete, setNuevoPaquete] = useState({
    nombre: '',
    descripcion: '',
    servicios: [] as string[],
    serviciosTexto: '',
    duracion: 0,
    precio: 0,
    descuento: 0,
    categoria: '',
    activo: true,
    metodoPago: '',
    porcentajeDescuento: 0
  });

  const [horaInput, setHoraInput] = useState('');
  const [minutosInput, setMinutosInput] = useState('');

  // Estado inicial para reset
  const estadoInicialPaquete = {
    nombre: '',
    descripcion: '',
    servicios: [] as string[],
    serviciosTexto: '',
    duracion: 0,
    precio: 0,
    descuento: 0,
    categoria: '',
    activo: true,
    metodoPago: '',
    porcentajeDescuento: 0
  };

  const filteredPaquetes = paquetes.filter(paquete => {
    const matchesSearch = paquete.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      paquete.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesEstado = true;
    if (filterEstado === "activos") {
      matchesEstado = paquete.activo === true;
    } else if (filterEstado === "inactivos") {
      matchesEstado = paquete.activo === false;
    }

    return matchesSearch && matchesEstado;
  });

  const totalPages = Math.max(1, Math.ceil(filteredPaquetes.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedPaquetes = filteredPaquetes.slice(startIndex, startIndex + itemsPerPage);



  // Funciones para manejar servicios automáticamente con precios
  const agregarServicio = () => {
    if (!servicioSeleccionado) return;

    const yaExiste = serviciosAgregados.find(s => s.nombre === servicioSeleccionado);
    if (!yaExiste) {
      const servicioEncontrado = serviciosDisponibles.find(s => s.nombre === servicioSeleccionado);
      if (!servicioEncontrado) return;

      const precioServicio = servicioEncontrado.precio;

      const nuevosServicios = [...serviciosAgregados, {
        id: servicioEncontrado.id,
        nombre: servicioSeleccionado,
        precio: precioServicio
      }];

      setServiciosAgregados(nuevosServicios);
      const nuevoPrecio = nuevosServicios.reduce((total, s) => total + s.precio, 0);
      // Recalcular duración total con base en los servicios agregados
      const totalMinutos = nuevosServicios.reduce((acc, s) => {
        const ref = serviciosDisponibles.find(sd => sd.nombre === s.nombre);
        const d = Number(ref?.duracion ?? 0);
        return acc + (Number.isFinite(d) ? d : 0);
      }, 0);
      const h = Math.floor(totalMinutos / 60);
      const m = totalMinutos % 60;
      setHoraInput(h > 0 ? String(h) : '');
      setMinutosInput(m > 0 ? String(m) : '');
      setPrecioInput(String(nuevoPrecio));
      setNuevoPaquete({
        ...nuevoPaquete,
        servicios: nuevosServicios.map(s => s.nombre),
        serviciosTexto: nuevosServicios.map(s => s.nombre).join(', '),
        precio: nuevoPrecio,
        duracion: totalMinutos
      });
    }

    setServicioSeleccionado('');
  };

  const eliminarServicio = (nombreServicio: string) => {
    const nuevosServicios = serviciosAgregados.filter(s => s.nombre !== nombreServicio);

    setServiciosAgregados(nuevosServicios);
    const nuevoPrecio = nuevosServicios.reduce((total, s) => total + s.precio, 0);
    // Recalcular duración total tras eliminar
    const totalMinutos = nuevosServicios.reduce((acc, s) => {
      const ref = serviciosDisponibles.find(sd => sd.nombre === s.nombre);
      const d = Number(ref?.duracion ?? 0);
      return acc + (Number.isFinite(d) ? d : 0);
    }, 0);
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    setHoraInput(h > 0 ? String(h) : '');
    setMinutosInput(m > 0 ? String(m) : '');
    setPrecioInput(nuevoPrecio > 0 ? String(nuevoPrecio) : '');
    setNuevoPaquete({
      ...nuevoPaquete,
      servicios: nuevosServicios.map(s => s.nombre),
      serviciosTexto: nuevosServicios.map(s => s.nombre).join(', '),
      precio: nuevoPrecio,
      duracion: totalMinutos
    });
  };

  // Funciones para cálculos automáticos
  const calcularSubtotal = () => {
    return nuevoPaquete.precio;
  };

  const calcularDescuento = (subtotal: number) => {
    return subtotal * (nuevoPaquete.porcentajeDescuento / 100);
  };

  const calcularTotal = () => {
    const subtotal = calcularSubtotal();
    const descuento = calcularDescuento(subtotal);
    return subtotal - descuento;
  };

  const handleCreatePaquete = async () => {
    const nombreTrim = (nuevoPaquete.nombre || '').trim();

    // Descripción ya no es obligatoria: sólo validar nombre y al menos un servicio
    if (!nombreTrim || serviciosAgregados.length === 0) {
      return;
    }

    // Validar que no exista otro paquete con el mismo nombre (case-insensitive)
    const nombreLower = nombreTrim.toLowerCase();
    const nombreDuplicado = paquetes.some(
      (p) => (p.nombre || '').trim().toLowerCase() === nombreLower
    );

    if (nombreDuplicado) {
      showErrorAlert(
        "No se puede crear el paquete",
        `El nombre "${nombreTrim}" ya existe. Por favor elige otro nombre para el paquete.`
      );
      return;
    }

    try {
      // 1. Preparar la estructura para el endpoint /completo
      const paqueteData = {
        ...nuevoPaquete,
        nombre: nombreTrim,
        precio: parseFloat(nuevoPaquete.precio.toString()),
        duracion: Number(nuevoPaquete.duracion) || 60,
        detalles: serviciosAgregados.map(s => ({
          servicioId: (s as any).id,
          cantidad: 1
        }))
      };

      // 2. Crear paquete y detalles en una sola transacción API
      const createdPaquete = await apiService.createPaqueteCompleto(paqueteData);

      setPaquetes([...paquetes, createdPaquete]);
      setNuevoPaquete({ ...estadoInicialPaquete });
      setServiciosAgregados([]);
      setIsDialogOpen(false);
      setViewMode('list');
      setPrecioInput('');
      setPorcentajeInput('');
      setHoraInput('');
      setMinutosInput('');

      created("Paquete creado exitosamente ✔️", `El paquete "${createdPaquete.nombre}" ha sido creado correctamente con todos sus servicios en una sola operación.`);
    } catch (error) {
      console.error('Error creating paquete completo:', error);
    }
  };

  const handleEditPaquete = async (paquete: Paquete) => {
    setEditingPaquete(paquete);
    // Cargar detalles reales para obtener IDs y nombres exactos
    let serviciosArray: string[] = Array.isArray(paquete.servicios) ? paquete.servicios : [];
    let serviciosConPrecio: any[] = [];
    try {
      const detalles = await apiService.getDetallePaquetesByPaqueteId(paquete.id);
      if (Array.isArray(detalles) && detalles.length > 0) {
        serviciosConPrecio = detalles.map((d: any) => {
          const matchById = serviciosDisponibles.find(s => Number(s.id) === Number(d.servicioId));
          const matchByName = serviciosDisponibles.find(s => String(s.nombre || '').trim().toLowerCase() === String(d.nombreServicio || '').trim().toLowerCase());
          const svc = matchById || matchByName;
          return {
            id: svc ? svc.id : (d.servicioId || 0),
            nombre: svc ? svc.nombre : (d.nombreServicio || 'Servicio'),
            precio: svc ? svc.precio : 0
          };
        });
        serviciosArray = serviciosConPrecio.map(s => s.nombre);
      } else {
        // Fallback: usar strings del paquete con match case-insensitive
        serviciosConPrecio = serviciosArray.map((nombreServicio: string) => {
          const servicioEncontrado = serviciosDisponibles.find(s => String(s.nombre || '').trim().toLowerCase() === String(nombreServicio || '').trim().toLowerCase());
          return {
            id: servicioEncontrado ? servicioEncontrado.id : 0,
            nombre: nombreServicio,
            precio: servicioEncontrado ? servicioEncontrado.precio : 0
          };
        });
      }
    } catch {
      serviciosConPrecio = serviciosArray.map((nombreServicio: string) => {
        const servicioEncontrado = serviciosDisponibles.find(s => String(s.nombre || '').trim().toLowerCase() === String(nombreServicio || '').trim().toLowerCase());
        return {
          id: servicioEncontrado ? servicioEncontrado.id : 0,
          nombre: nombreServicio,
          precio: servicioEncontrado ? servicioEncontrado.precio : 0
        };
      });
    }
    const serviciosTexto = serviciosArray.join(', ');

    setNuevoPaquete({
      nombre: paquete.nombre || '',
      descripcion: paquete.descripcion || '',
      servicios: serviciosArray,
      serviciosTexto: serviciosTexto,
      duracion: paquete.duracion || 60,
      precio: paquete.precio || 0,
      descuento: paquete.descuento || 0,
      categoria: paquete.categoria || '',
      activo: paquete.activo ?? true,
      metodoPago: '',
      porcentajeDescuento: 0
    });
    setPrecioInput(String(paquete.precio || 0));
    setPorcentajeInput('0');

    const totalMinutos = paquete.duracion || 0;
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    setHoraInput(h > 0 ? String(h) : '');
    setMinutosInput(m > 0 ? String(m) : '');

    setServiciosAgregados(serviciosConPrecio);
    // setIsDialogOpen(true); // Ya no usamos dialog para editar
    setViewMode('edit');
  };

  const handleUpdatePaquete = async () => {
    if (!editingPaquete) return;

    const nombreTrim = (nuevoPaquete.nombre || '').trim();
    if (!nombreTrim) {
      showErrorAlert(
        "Nombre inválido",
        "El nombre del paquete es obligatorio."
      );
      return;
    }

    // Validar duplicado contra otros paquetes (excluyendo el que se está editando)
    const nombreLower = nombreTrim.toLowerCase();
    const nombreDuplicado = paquetes.some(
      (p) => p.id !== editingPaquete.id && (p.nombre || '').trim().toLowerCase() === nombreLower
    );

    if (nombreDuplicado) {
      showErrorAlert(
        "No se puede actualizar el paquete",
        `El nombre "${nombreTrim}" ya existe. Por favor elige otro nombre para el paquete.`
      );
      return;
    }

    const nombrePaquete = nombreTrim;
    const tempPaqueteData = { ...nuevoPaquete, nombre: nombreTrim };

    // Ejecutar actualización directamente
    try {
      const updatedPaquete = await apiService.updatePaquete(editingPaquete.id, {
        ...tempPaqueteData,
        precio: parseFloat(tempPaqueteData.precio.toString()),
        precioOriginal: parseFloat(tempPaqueteData.precio.toString()) * (1 + tempPaqueteData.descuento / 100)
      });

      // Actualizar detalles del paquete en una sola operación (IDs de servicios)
      console.log(`🔄 Actualizando detalles para el paquete ${editingPaquete.id}`);
      await apiService.updatePaqueteDetalles(
        editingPaquete.id,
        serviciosAgregados.map((s: any) => ({
          servicioId: Number(s.id || 0),
          cantidad: 1
        }))
      );

      await loadPaquetes(true);
      setEditingPaquete(null);
      setNuevoPaquete({ ...estadoInicialPaquete });
      setServiciosAgregados([]);
      setViewMode('list');

      edited('Paquete actualizado exitosamente ✔️', `El paquete "${nombrePaquete}" ha sido actualizado correctamente con la nueva información.`);
    } catch (error) {
      console.error('Error updating paquete:', error);
      showErrorAlert('Error al actualizar', 'No se pudo actualizar el paquete. Inténtalo nuevamente.');
    }
  };

  const handleToggleEstadoPaquete = (paquete: Paquete) => {
    const nombrePaquete = paquete.nombre;
    const nuevoEstado = !paquete.activo;

    // Ejecutar directamente sin confirmación
    (async () => {
      try {
        await apiService.updatePaqueteStatus(paquete.id, nuevoEstado);
        await loadPaquetes(true);
        edited(`Paquete ${nuevoEstado ? 'activado' : 'desactivado'} ✔️`, `El paquete "${nombrePaquete}" ha sido ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente.`);
      } catch (error) {
        console.error('Error updating paquete status:', error);
      }
    })();
  };

  const handleEliminarPaquete = (paquete: Paquete) => {
    const nombrePaquete = paquete.nombre;
    (async () => {
      try {
        await apiService.deletePaquete(paquete.id);
        let exists = false;
        try {
          const all = await apiService.getPaquetes();
          exists = !!all.find(p => p.id === paquete.id);
        } catch { exists = false; }
        if (exists) {
          try {
            await apiService.updatePaqueteStatus(paquete.id, false);
            await loadPaquetes(true);
            edited("Paquete desactivado", `El paquete "${nombrePaquete}" se desactivó automáticamente porque tiene conexiones.`);
          } catch {
            showErrorAlert("No se puede eliminar", "Este paquete tiene conexiones. Solo se puede desactivar para conservar el historial.");
          }
          return;
        }
        await loadPaquetes(true);
        deleted("Paquete eliminado ✔️", `El paquete "${nombrePaquete}" ha sido eliminado del sistema.`);
      } catch (error: any) {
        const msg = String(error?.message || '').toLowerCase();
        const related =
          msg.includes('409') ||
          msg.includes('foreign') ||
          msg.includes('constraint') ||
          msg.includes('referenc') ||
          msg.includes('venta') ||
          msg.includes('compra') ||
          msg.includes('servicio') ||
          msg.includes('cita');
        if (related) {
          try {
            await apiService.updatePaqueteStatus(paquete.id, false);
            await loadPaquetes(true);
            edited("Paquete desactivado", `El paquete "${nombrePaquete}" se desactivó automáticamente porque tiene conexiones.`);
          } catch {
            showErrorAlert("No se puede eliminar", "Este paquete tiene conexiones. Solo se puede desactivar para conservar el historial.");
          }
        } else {
          showErrorAlert("Error", "No se pudo eliminar el paquete.");
        }
      }
    })();
  };

  const toggleEstadoPaquete = (paqueteId: number) => {
    const paquete = paquetes.find(p => p.id === paqueteId);
    if (!paquete) return;

    handleToggleEstadoPaquete(paquete);
  };

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white-primary">Paquetes de Servicios</h1>
            <p className="text-sm text-gray-lightest mt-1">Gestiona combinaciones de servicios con descuentos especiales</p>
          </div>

        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Vista Lista de Paquetes */}
        {viewMode === 'list' && (
          <div className="elegante-card">
            {/* Barra de Controles */}
            <TableHeaderSection
              leftContent={(
                <button
                  className="elegante-button-primary gap-2 flex items-center"
                  onClick={() => {
                    setEditingPaquete(null);
                    setNuevoPaquete({ ...estadoInicialPaquete });
                    setServiciosAgregados([]);
                    setServicioSeleccionado('');
                    setPrecioInput('');
                    setPorcentajeInput('');
                    setHoraInput('');
                    setMinutosInput('');
                    setViewMode('create');
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Nuevo Paquete
                </button>
              )}
              searchValue={searchTerm}
              onSearchChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              searchPlaceholder="Buscar paquetes..."
              statusFilter={{
                value: filterEstado,
                onChange: (value) => {
                  setFilterEstado(value);
                  setCurrentPage(1);
                },
                options: [
                  { value: "all", label: "Todos" },
                  { value: "activos", label: "Activos" },
                  { value: "inactivos", label: "Inactivos" },
                ],
              }}
              recordsText={`Mostrando ${displayedPaquetes.length} de ${filteredPaquetes.length} paquetes`}
              recordsPlacement="left"
            />

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Nombre</th>
                    <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Descripción</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Servicios</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Duración</th>
                    <th className="text-right py-3 px-4 text-white-primary font-bold text-sm">Precio</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-right py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingStateRow
                      colSpan={7}
                      title="Cargando paquetes..."
                    />
                  ) : displayedPaquetes.length > 0 ? displayedPaquetes.map((paquete) => (
                        <tr key={paquete.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-gray-lighter">{paquete.nombre}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-lighter text-sm">
                              {(() => {
                                const nombres = serviciosPorPaqueteId.get(paquete.id) ?? [];
                                return nombres.length > 0
                                  ? nombres.join(', ')
                                  : <span className="text-gray-dark italic">Sin servicios</span>;
                              })()}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-gray-lighter">{paquete.servicios.length} servicios</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-gray-lighter">{paquete.duracion} min</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-gray-lighter">${(paquete.precio ?? 0).toLocaleString('es-CO')}</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${paquete.activo ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-medium/20 text-gray-lighter border-gray-dark'}`}>
                              {paquete.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleEstadoPaquete(paquete)}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                                title={paquete.activo ? "Desactivar paquete" : "Activar paquete"}
                              >
                                {paquete.activo ? (
                                  <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                                ) : (
                                  <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPaquete(paquete);
                                  setIsDetailDialogOpen(true);
                                  loadDetallePaquete(paquete.id); // Cargar detalles del paquete
                                }}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                                title="Ver Detalle"
                              >
                                <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                              </button>
                              <button
                                onClick={() => handleEditPaquete(paquete)}
                                className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                              </button>
                              <button
                                onClick={() => handleEliminarPaquete(paquete)}
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
                      colSpan={7}
                      title="No se encontraron paquetes"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={loadPaquetes}
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
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-lightest">Filas por página:</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={() => {
                      setItemsPerPage(5);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[110px] h-8 bg-gray-darker border-gray-dark text-gray-lightest">
                      <SelectValue placeholder={itemsPerPage.toString()} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
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
        )}

        {/* Vista Crear/Editar Paquete (Pantalla Completa) */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className="elegante-card max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-dark">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setEditingPaquete(null);
                    setNuevoPaquete({ ...estadoInicialPaquete });
                  }}
                  className="p-2 rounded-lg hover:bg-gray-darker text-gray-lightest transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                  <h2 className="text-xl font-semibold text-white-primary flex items-center gap-2">
                    <Package className="w-6 h-6 text-orange-primary" />
                    {viewMode === 'edit' ? 'Editar Paquete' : 'Crear Nuevo Paquete'}
                  </h2>
                  <p className="text-sm text-gray-lightest mt-1">
                    {viewMode === 'edit' ? 'Modifica la información del paquete seleccionado' : 'Configura una nueva combinación de servicios'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Nombre y Descripción */}
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-primary" />
                    Nombre del Paquete *
                  </Label>
                  <Input
                    value={nuevoPaquete.nombre}
                    onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, nombre: e.target.value })}
                    placeholder="Ej: Paquete Premium Completo"
                    className="elegante-input"
                  />
                </div>
              </div>

              {/* Precio y Descuento */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-orange-primary" />
                    Precio ($) *
                  </Label>
                  <Input
                    type="number"
                    value={precioInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.length <= 15) {
                        setPrecioInput(val);
                        const nRaw = val.trim() === '' ? 0 : Number(val);
                        const n = Number.isFinite(nRaw) ? Math.max(0, nRaw) : 0;
                        setNuevoPaquete({ ...nuevoPaquete, precio: n });
                      }
                    }}
                    className="elegante-input no-spin"
                    min="0"
                    step="100"
                    placeholder=""
                    readOnly={viewMode !== 'edit'}
                    disabled={viewMode !== 'edit'}
                  />
                  <div className="flex justify-start mt-1">
                    <span className="text-xs text-gray-500 font-medium">
                      {precioInput.length}/15 caracteres
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-orange-primary" />
                    Porcentaje Descuento (%)
                  </Label>
                  <Input
                    type="number"
                    value={porcentajeInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPorcentajeInput(val);
                      const nRaw = val.trim() === '' ? 0 : Number(val);
                      const n = Number.isFinite(nRaw) ? Math.max(0, Math.min(100, nRaw)) : 0;
                      setNuevoPaquete({ ...nuevoPaquete, porcentajeDescuento: n });
                    }}
                    className="elegante-input no-spin"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label className="text-white-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-primary" />
                  Descripción
                </Label>
                <Textarea
                  value={nuevoPaquete.descripcion}
                  onChange={(e) => setNuevoPaquete({ ...nuevoPaquete, descripcion: e.target.value })}
                  placeholder="Describe el paquete de servicios"
                  className="elegante-input"
                  rows={3}
                />
              </div>

              {/* Sección de Servicios mejorada UI/UX - Versión Compacta */}
              <div className="space-y-3 bg-gray-darker p-3 rounded-xl border border-gray-dark/50">
                <div className="flex items-center justify-between">
                  <Label className="text-white-primary flex items-center gap-2 text-base font-medium">
                    <Scissors className="w-4 h-4 text-orange-primary" />
                    Configuración de Servicios
                  </Label>
                  <span className="text-[10px] text-gray-lightest bg-gray-dark px-2 py-0.5 rounded-full">
                    {serviciosAgregados.length} servicios
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <div className="flex-1 w-full">
                    <select
                      value={servicioSeleccionado}
                      onChange={(e) => setServicioSeleccionado(e.target.value)}
                      className="elegante-input w-full h-9 text-sm"
                    >
                      <option value="">-- Seleccionar servicio --</option>
                      {serviciosDisponibles.map((servicio, index) => (
                        <option key={index} value={servicio.nombre}>
                          {servicio.nombre} - ${(servicio.precio ?? 0).toLocaleString('es-CO')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      agregarServicio();
                    }}
                    className={`h-9 px-4 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 ${!servicioSeleccionado
                        ? 'bg-gray-dark text-gray-light cursor-not-allowed opacity-50'
                        : 'bg-orange-primary text-black-primary hover:bg-orange-secondary hover:shadow-lg hover:shadow-orange-primary/20 transform hover:-translate-y-0.5'
                      }`}
                    disabled={!servicioSeleccionado}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>

                {/* Lista de servicios agregados con mejor diseño */}
                {serviciosAgregados.length > 0 ? (
                  <div className="mt-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar grid grid-cols-2 gap-2 auto-rows-min">
                    {serviciosAgregados.map((servicio, index) => (
                      <div key={index} className="group flex items-center justify-between bg-black-primary p-2 rounded-lg border border-gray-dark hover:border-gray-light transition-all h-fit">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="w-6 h-6 rounded-full bg-gray-dark flex items-center justify-center text-gray-lightest text-[10px] font-bold shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white-primary font-medium text-sm truncate" title={servicio.nombre}>{servicio.nombre}</p>
                            <p className="text-[10px] text-gray-lightest truncate">Base: ${(servicio.precio ?? 0).toLocaleString('es-CO')}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => eliminarServicio(servicio.nombre)}
                          className="p-1.5 rounded-full text-gray-light hover:bg-red-500/10 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0"
                          title="Eliminar servicio del paquete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 p-4 border border-dashed border-gray-dark rounded-lg flex flex-col items-center justify-center text-gray-light bg-black-primary/30">
                    <Scissors className="w-5 h-5 mb-1 opacity-20" />
                    <p className="text-xs text-gray-500">Selecciona un servicio arriba para comenzar</p>
                  </div>
                )}
              </div>

              {/* Duración (Moved here) */}
              <div className="space-y-2 bg-gray-darker p-4 rounded-xl border border-gray-dark/50">
                <Label className="text-white-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-primary" />
                  Duración Total (minutos)
                </Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={horaInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        const h = Math.max(0, parseInt(val, 10) || 0);
                        const m = Math.max(0, parseInt(minutosInput, 10) || 0);
                        setHoraInput(val);
                        setNuevoPaquete({ ...nuevoPaquete, duracion: h * 60 + m });
                      }}
                      placeholder="0"
                      className="elegante-input no-spin text-center"
                    />
                    <span className="text-gray-lightest text-sm font-medium">horas</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={minutosInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        const m = Math.max(0, Math.min(59, parseInt(val, 10) || 0));
                        const h = Math.max(0, parseInt(horaInput, 10) || 0);
                        setMinutosInput(val);
                        setNuevoPaquete({ ...nuevoPaquete, duracion: h * 60 + m });
                      }}
                      placeholder="0"
                      className="elegante-input no-spin text-center"
                    />
                    <span className="text-gray-lightest text-sm font-medium">min</span>
                  </div>
                  <div className="px-4 py-2 bg-gray-dark rounded-lg border border-gray-medium/30">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
                    <p className="text-orange-primary font-bold text-lg">{(nuevoPaquete.duracion || 0)} min</p>
                  </div>
                </div>
              </div>

              {/* Resumen de Totales */}
              {nuevoPaquete.precio > 0 && (
                <div className="bg-gray-darker border border-gray-dark rounded-lg p-4">
                  <h3 className="text-white-primary font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-primary" />
                    Resumen de Totales
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-lightest">Subtotal:</span>
                      <span className="text-white-primary">${calcularSubtotal().toLocaleString('es-CO')}</span>
                    </div>
                    {nuevoPaquete.porcentajeDescuento > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-lightest">Descuento ({nuevoPaquete.porcentajeDescuento}%):</span>
                        <span className="text-red-400">-${calcularDescuento(calcularSubtotal()).toLocaleString('es-CO')}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold border-t border-gray-dark pt-2">
                      <span className="text-white-primary">Total:</span>
                      <span className="text-orange-primary">${calcularTotal().toLocaleString('es-CO')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-dark">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setEditingPaquete(null);
                    setNuevoPaquete({ ...estadoInicialPaquete });
                    setServiciosAgregados([]);
                    setServicioSeleccionado('');
                    setPrecioInput('');
                    setPorcentajeInput('');
                  }}
                  className="elegante-button-secondary"
                >
                  Cancelar
                </button>
                <button
                  onClick={editingPaquete ? handleUpdatePaquete : handleCreatePaquete}
                  className="elegante-button-primary"
                >
                  {editingPaquete ? 'Actualizar' : 'Crear'} Paquete
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Dialog de Detalle del Paquete - Mismo layout que Editar, solo lectura */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedPaquete && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-white-primary flex items-center gap-2">
                    <Eye className="w-5 h-5 text-orange-primary" />
                    Ver detalle del paquete
                  </DialogTitle>
                  <DialogDescription className="text-gray-lightest">
                    Información del paquete (solo lectura)
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                  {/* Nombre y Precio - solo lectura */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Package className="w-4 h-4 text-orange-primary" />
                        Nombre del Paquete
                      </Label>
                      <Input
                        value={selectedPaquete.nombre ?? ''}
                        readOnly
                        disabled
                        className="elegante-input bg-gray-medium cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-orange-primary" />
                        Precio ($)
                      </Label>
                      <Input
                        value={selectedPaquete.precio != null ? String(selectedPaquete.precio) : ''}
                        readOnly
                        disabled
                        className="elegante-input bg-gray-medium cursor-not-allowed no-spin"
                      />
                    </div>
                  </div>

                  {/* Duración y Porcentaje Descuento - solo lectura */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-primary" />
                        Duración (minutos)
                      </Label>
                      <p className="elegante-input bg-gray-medium cursor-not-allowed py-2.5 px-3 text-gray-lightest">
                        {selectedPaquete.duracion != null && selectedPaquete.duracion > 0
                          ? (() => {
                              const h = Math.floor((selectedPaquete.duracion || 0) / 60);
                              const m = (selectedPaquete.duracion || 0) % 60;
                              if (h > 0) {
                                return `${h} h ${m} min (${selectedPaquete.duracion} min total)`;
                              }
                              return `${m} min`;
                            })()
                          : '0 min'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Calculator className="w-4 h-4 text-orange-primary" />
                        Porcentaje Descuento (%)
                      </Label>
                      <Input
                        value={selectedPaquete.descuento != null ? String(selectedPaquete.descuento) : '0'}
                        readOnly
                        disabled
                        className="elegante-input bg-gray-medium cursor-not-allowed no-spin"
                      />
                    </div>
                  </div>

                  {/* Descripción - solo lectura */}
                  <div className="space-y-2">
                    <Label className="text-white-primary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-orange-primary" />
                      Descripción
                    </Label>
                    <Textarea
                      value={selectedPaquete.descripcion ?? ''}
                      readOnly
                      disabled
                      rows={3}
                      className="elegante-input bg-gray-medium cursor-not-allowed resize-none"
                    />
                  </div>

                  {/* Servicios agregados - solo lectura */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white-primary flex items-center gap-2">
                        <Scissors className="w-4 h-4 text-orange-primary" />
                        Agregar servicio
                      </Label>
                      <p className="text-gray-lightest text-sm">Los servicios del paquete se muestran abajo (solo lectura).</p>
                    </div>

                    {loadingDetalle ? (
                      <div className="flex items-center justify-center py-6 bg-gray-darker rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-primary"></div>
                        <span className="ml-3 text-gray-lightest">Cargando servicios...</span>
                      </div>
                    ) : (
                      (detallePaquete.length > 0 || (selectedPaquete.servicios && selectedPaquete.servicios.length > 0)) && (
                        <div className="space-y-3">
                          <h4 className="text-lg font-semibold text-white-primary mb-3">Servicios incluidos</h4>
                          <div className="space-y-3 max-h-48 overflow-y-auto">
                            {detallePaquete.length > 0 ? (
                              detallePaquete.map((detalle: any, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-gray-darker p-4 rounded-xl border border-gray-dark">
                                  <span className="text-white-primary font-semibold">{detalle.nombreServicio}</span>
                                  <span className="text-white-primary font-medium">
                                    ${(detalle.precioServicio ?? 0).toLocaleString('es-CO')}
                                  </span>
                                </div>
                              ))
                            ) : (
                              selectedPaquete.servicios?.map((servicio: string, index: number) => {
                                const servicioInfo = serviciosDisponibles.find(s => s.nombre === servicio);
                                return (
                                  <div key={index} className="flex items-center justify-between bg-gray-darker p-4 rounded-xl border border-gray-dark">
                                    <span className="text-white-primary font-semibold">{servicio}</span>
                                    <span className="text-white-primary font-medium">
                                      ${servicioInfo ? (servicioInfo.precio ?? 0).toLocaleString('es-CO') : '0'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* “Servicios seleccionados” redundante oculto en detalle */}

                  {/* Resumen de totales - solo lectura */}
                  <div className="bg-gray-darker border border-gray-dark rounded-lg p-4">
                    <h3 className="text-white-primary font-semibold mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-primary" />
                      Resumen de totales
                    </h3>
                    <div className="space-y-2 text-sm">
                      {(selectedPaquete.precioOriginal ?? selectedPaquete.precio) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-lightest">Subtotal / Precio original:</span>
                          <span className="text-white-primary">
                            ${(selectedPaquete.precioOriginal ?? selectedPaquete.precio ?? 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}
                      {selectedPaquete.descuento != null && Number(selectedPaquete.descuento) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-lightest">Descuento ({selectedPaquete.descuento}%):</span>
                          <span className="text-red-400">
                            -${(((selectedPaquete.precioOriginal ?? selectedPaquete.precio ?? 0) * Number(selectedPaquete.descuento) / 100)).toLocaleString('es-CO')}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t border-gray-dark pt-2">
                        <span className="text-white-primary">Total:</span>
                        <span className="text-orange-primary">${(selectedPaquete.precio ?? 0).toLocaleString('es-CO')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-dark">
                    <button
                      onClick={() => setIsDetailDialogOpen(false)}
                      className="elegante-button-secondary"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <AlertContainer />
        <DoubleConfirmationContainer />
      </main>
    </>
  );
}
