import { useState, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import { NameInput } from "../../../shared/components/ui/NameInput";
import { Scissors, Plus, Edit, Trash2, Eye, ToggleRight, ToggleLeft, Image as ImageIcon, X, Loader2, Camera, Info, FileText, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Switch } from "../../../shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { DiscardChangesDialog } from "../../../shared/components/ui/discard-changes-dialog";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { apiService, Servicio } from "../../../shared/services/api";
import { formatDuracion } from "../../../shared/utils/dateUtils";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { StandardTable, resolveStatusVariant, ColumnDef } from "../../../shared/components/ui/standard-table";

export function ServiciosPage() {
  const { created, edited, deleted, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [pagedServicios, setPagedServicios] = useState<Servicio[]>([]);
  const [totalPagesApi, setTotalPagesApi] = useState(1);
  const [totalCountApi, setTotalCountApi] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [precioServicioInput, setPrecioServicioInput] = useState<string>('');
  const [nombreServicioDuplicado, setNombreServicioDuplicado] = useState(false);
  const [nombreServicioError, setNombreServicioError] = useState<string | null>(null);
  const [showServicioFormErrors, setShowServicioFormErrors] = useState(false);
  const [servicioValidationAttempt, setServicioValidationAttempt] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shakeClass = servicioValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';

  const NOMBRE_MIN = 2;
  const NOMBRE_MAX = 18;
  const ONLY_PUNCTUATION = /^[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ]+$/;

  const validarNombreServicio = (nombre: string): string | null => {
    if (!nombre.trim()) return 'Este campo es obligatorio.';
    if (/\d/.test(nombre)) return 'El nombre no puede contener números.';
    if (ONLY_PUNCTUATION.test(nombre)) return 'No se permiten solo signos de puntuación.';
    if (nombre.length < NOMBRE_MIN) return `Debe tener al menos ${NOMBRE_MIN} caracteres.`;
    if (nombre.length > NOMBRE_MAX) return `No puede superar ${NOMBRE_MAX} caracteres.`;
    return null;
  };

  // Cargar servicios desde la API. silent=true evita setLoading para no parpadear la tabla tras crear/editar/eliminar/toggle.
  const loadServicios = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const data = await apiService.getServicios();
      setServicios(data);
    } catch (err: any) {
      console.error('Error cargando servicios:', err);
      setError(err.message || 'Error al cargar los servicios');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadServicios();
  }, []);

  useEffect(() => {
    const run = async () => {
      // Si estamos en medio de un toggle de estado, no cargamos datos de la API
      if (isTogglingStatus) {
        return;
      }
      
      try {
        setLoadingPage(true);
        const extra: Record<string, any> = {};
        if (statusFilter !== 'all') {
          extra.estado = statusFilter === 'active';
        }
        const res = await apiService.getServiciosPaged({
          page: currentPage,
          pageSize: itemsPerPage,
          q: searchTerm,
          ...extra
        });
        setPagedServicios(res.items);
        setTotalPagesApi(res.totalPages);
        setTotalCountApi(res.totalCount);
        if (res.page !== currentPage) {
          setCurrentPage(res.page);
        }
      } catch (e) {
        // Fallback: si falla, mostrar por cliente
        const filtered = servicios.filter(servicio => {
          const term = searchTerm.trim().toLowerCase();
          const estadoLabel = servicio.estado ? 'activo' : 'inactivo';
          const matchesSearch = term === '' ||
            (servicio.nombre || '').toLowerCase().includes(term) ||
            (servicio.descripcion || '').toLowerCase().includes(term) ||
            String(servicio.precio ?? '').includes(term) ||
            String(servicio.duracion ?? '').includes(term) ||
            estadoLabel.includes(term);
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "active" ? servicio.estado === true : servicio.estado === false);
          return matchesSearch && matchesStatus;
        });
        const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
        const startIndex = (currentPage - 1) * itemsPerPage;
        setPagedServicios(filtered.slice(startIndex, startIndex + itemsPerPage));
        setTotalPagesApi(totalPages);
        setTotalCountApi(filtered.length);
      } finally {
        setLoadingPage(false);
      }
    };
    run();
  }, [searchTerm, statusFilter, currentPage, itemsPerPage, servicios, isTogglingStatus]);

  const [nuevoServicio, setNuevoServicio] = useState({
    nombre: '',
    descripcion: '',
    duracion: 30,
    precio: 0,
    estado: true,
    imagen: ''
  });

  const MAX_IMAGE_MB = 5;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Formato no válido. Solo JPG, PNG, GIF o WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setImageError(`La imagen no debe superar los ${MAX_IMAGE_MB} MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const removeSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleDeleteImage = async () => {
    if (!editingServicio || !editingServicio.imagen) return;

    try {
      setIsDeletingImage(true);
      await apiService.deleteServicioImagen(editingServicio.id);
      
      // Actualizar estado local
      setEditingServicio({ ...editingServicio, imagen: undefined });
      setNuevoServicio(prev => ({ ...prev, imagen: '' }));
      setImagePreview(null);
      
      // Recargar lista sin mostrar loading (evitar parpadeo)
      await loadServicios(true);
      
      edited("Imagen eliminada ✔️", "La imagen del servicio ha sido eliminada.");
    } catch (err: any) {
      console.error("Error eliminando imagen:", err);
      showErrorAlert("Error", "No se pudo eliminar la imagen del servidor.");
    } finally {
      setIsDeletingImage(false);
    }
  };

  const displayedServicios = (statusFilter === "all")
    ? pagedServicios
    : pagedServicios.filter(s => statusFilter === "active" ? s.estado === true : s.estado === false);
  const totalPages = totalPagesApi;


  const handleCreateServicio = async () => {
    setShowServicioFormErrors(true);
    setServicioValidationAttempt((prev) => prev + 1);

    const nombre = (nuevoServicio.nombre || '').trim();
    const descripcion = (nuevoServicio.descripcion || '').trim();
    const duracion = Number(nuevoServicio.duracion || 0);
    const precio = Number(nuevoServicio.precio || 0);

    const errorNombre = validarNombreServicio(nombre);
    setNombreServicioError(errorNombre);
    if (errorNombre || duracion <= 0 || precio <= 0) {
      setNombreServicioDuplicado(false);
      return;
    }

    // Validar nombre duplicado (case-insensitive)
    const nombreLower = nombre.toLowerCase();
    const existeNombre = servicios.some(
      (s) => (s.nombre || '').trim().toLowerCase() === nombreLower
    );

    if (existeNombre) {
      setNombreServicioDuplicado(true);
      return;
    }
    setNombreServicioDuplicado(false);
    setNombreServicioError(null);

    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setSubmitting(true);
      const createdServicio = await apiService.createServicio({
        ...nuevoServicio,
        nombre,
        descripcion,
        duracion,
        precio,
      });

      setServicios(prev => [createdServicio, ...prev]); // Mostrar inmediatamente en la lista
      await loadServicios(true); // Sincronizar con backend sin parpadear la tabla
      setCurrentPage(1); // Mostrar al inicio para ver el recién creado
      setNuevoServicio({ nombre: '', descripcion: '', duracion: 30, precio: 0, estado: true, imagen: '' });
      setPrecioServicioInput('');
      setImageFile(null);
      setImagePreview(null);
      setShowServicioFormErrors(false);
      setIsDialogOpen(false);

      // Subir imagen si existe
      if (imageFile && createdServicio.id) {
        try {
          await apiService.uploadServicioImagen(createdServicio.id, imageFile);
          await loadServicios(true); // Recargar para obtener la URL de la imagen sin parpadear
        } catch (imgErr) {
          console.error('Error subiendo imagen:', imgErr);
          showErrorAlert("Servicio creado, pero...", "No se pudo subir la imagen. Puedes intentarlo editando el servicio.");
        }
      }

      if (!createdServicio.id || !String(createdServicio.nombre || '').trim()) {
        created("Servicio creado (sin contenido)", "El servidor no devolvió datos del servicio; la lista se recargó para sincronizar.");
      } else {
        created("Servicio creado ✔️", `El servicio "${nombre}" ha sido agregado exitosamente.`);
      }
    } catch (err: any) {
      console.error('Error creando servicio:', err);
      // Mostrar error amigable en lugar del mensaje crudo del servidor
      showErrorAlert(
        "No se puede crear el servicio",
        "Ocurrió un problema al crear el servicio. Verifica que todos los campos estén completos y que los valores sean válidos."
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleEditServicio = (servicio: Servicio) => {
    setEditingServicio(servicio);
    setNuevoServicio({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      duracion: servicio.duracion,
      precio: servicio.precio,
      estado: servicio.estado,
      imagen: servicio.imagen || ''
    });
    setPrecioServicioInput(servicio.precio != null ? Number(servicio.precio).toLocaleString('es-CO') : '');
    setImagePreview(servicio.imagen || null);
    setImageFile(null);
    setShowServicioFormErrors(false);
    setNombreServicioDuplicado(false);
    setServicioValidationAttempt(0);
    setIsDialogOpen(true);
  };

  const handleUpdateServicio = async () => {
    if (editingServicio) {
      setShowServicioFormErrors(true);
      setServicioValidationAttempt((prev) => prev + 1);

      const nombre = (nuevoServicio.nombre || '').trim();
      const duracion = Number(nuevoServicio.duracion || 0);
      const precio = Number(nuevoServicio.precio || 0);

      const errorNombre = validarNombreServicio(nombre);
      setNombreServicioError(errorNombre);
      if (errorNombre || duracion <= 0 || precio <= 0) {
        setNombreServicioDuplicado(false);
        return;
      }

      // Validar nombre duplicado excluyendo el servicio que se está editando
      const nombreLower = nombre.toLowerCase();
      const existeNombre = servicios.some(
        (s) => s.id !== editingServicio.id && (s.nombre || '').trim().toLowerCase() === nombreLower
      );

      if (existeNombre) {
        setNombreServicioDuplicado(true);
        return;
      }
      setNombreServicioDuplicado(false);
      setNombreServicioError(null);
      if (submittingRef.current) return;
      submittingRef.current = true;
      try {
        setSubmitting(true);
        
        // Actualización optimista inmediata
        const updatedServicio = { ...editingServicio, ...nuevoServicio, nombre };
        setServicios(prev => prev.map(s => s.id === editingServicio.id ? updatedServicio : s));
        setPagedServicios(prev => prev.map(s => s.id === editingServicio.id ? updatedServicio : s));

        await apiService.updateServicio(editingServicio.id, {
          ...nuevoServicio,
          nombre,
          duracion,
          precio,
        });
        await loadServicios(true); // Recargar sin parpadear la tabla
        setEditingServicio(null);
        setNuevoServicio({ nombre: '', descripcion: '', duracion: 30, precio: 0, estado: true, imagen: '' });
        setPrecioServicioInput('');
        setImageFile(null);
        setImagePreview(null);
        setShowServicioFormErrors(false);
        setIsDialogOpen(false);

        // Subir imagen si se seleccionó una nueva
        if (imageFile && editingServicio.id) {
          try {
            await apiService.uploadServicioImagen(editingServicio.id, imageFile);
            await loadServicios(true);
          } catch (imgErr) {
            console.error('Error subiendo imagen:', imgErr);
            showErrorAlert("Cambios guardados, pero...", "No se pudo subir la nueva imagen.");
          }
        }

        edited("Servicio editado ✔️", `El servicio "${nuevoServicio.nombre}" ha sido actualizado exitosamente.`);
      } catch (err: any) {
        console.error('Error actualizando servicio:', err);
        setError(err.message || 'Error al actualizar el servicio');
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const handleDeleteServicio = (servicio: Servicio) => {
    setServicioToDelete(servicio);
    (async () => {
      await handleConfirmDelete();
    })();
  };

  const handleConfirmDelete = async () => {
    if (servicioToDelete) {
      try {
        const servicio = servicioToDelete;
        // Intentar eliminar en el backend primero
        await apiService.deleteServicio(servicio.id);

        const latest = await apiService.getServicios();
        setServicios(latest);
        const stillExists = latest.find(s => s.id === servicio.id);
        setIsDeleteDialogOpen(false);
        if (stillExists) {
          showErrorAlert('No se eliminó el servicio', ' Debes desasociarlo de paquetes, ventas o citas y reintentar.');
        } else {
          deleted("Servicio eliminado ✔️", `El servicio "${servicio.nombre}" ha sido eliminado exitosamente del catálogo.`);
        }
        setServicioToDelete(null);
      } catch (err: any) {
        console.error('Error eliminando servicio:', err);
        setError(err.message || 'Error al eliminar el servicio');
        const rawMsg = String(err?.message || '').toLowerCase();
        const isFkConflict = rawMsg.includes('foreign') || rawMsg.includes('constraint') || rawMsg.includes('referenc') || rawMsg.includes('conflict') || rawMsg.includes('no se puede eliminar');
        if (isFkConflict) {
          showErrorAlert('No se puede eliminar el servicio', 'Este servicio está asociado a ventas, paquetes o citas. Debes eliminar o desasociar esos registros antes de eliminarlo.');
        } else {
          showErrorAlert('Error al eliminar servicio', 'El servidor rechazó la eliminación. Revisa que no tenga dependencias activas.');
        }
        // Asegurar que la lista quede sincronizada con el backend aunque falle la eliminación (sin parpadear)
        await loadServicios(true);
        setIsDeleteDialogOpen(false);
        setServicioToDelete(null);
      }
    }
  };

  const toggleActivo = async (servicioId: number) => {
    const servicio = servicios.find(s => s.id === servicioId);
    if (!servicio) return;

    const nuevoEstado = !servicio.estado;

    // Marcar que estamos en medio de un toggle para evitar que el useEffect cargue datos de la API
    setIsTogglingStatus(true);

    // Actualización optimista — actualizamos tanto servicios como pagedServicios para un cambio visual inmediato
    setServicios(prev =>
      prev.map(s => s.id === servicioId ? { ...s, estado: nuevoEstado, activo: nuevoEstado } : s)
    );
    setPagedServicios(prev =>
      prev.map(s => s.id === servicioId ? { ...s, estado: nuevoEstado, activo: nuevoEstado } : s)
    );

    try {
      await apiService.updateServicioStatus(servicioId, nuevoEstado);
      edited(`Servicio ${nuevoEstado ? 'activado' : 'desactivado'} ✔️`, `El servicio "${servicio.nombre}" ha sido ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente.`);
    } catch (err: any) {
      // Revertir si falla
      setServicios(prev =>
        prev.map(s => s.id === servicioId ? { ...s, estado: !nuevoEstado, activo: !nuevoEstado } : s)
      );
      setPagedServicios(prev =>
        prev.map(s => s.id === servicioId ? { ...s, estado: !nuevoEstado, activo: !nuevoEstado } : s)
      );
      console.error('Error actualizando estado del servicio:', err);
      setError(err.message || 'Error al actualizar el estado del servicio');
      loadServicios(true);
    } finally {
      // Desmarcar el toggle después de que todo haya terminado
      setIsTogglingStatus(false);
    }
  };

  const resetForm = () => {
    setNuevoServicio({ nombre: '', descripcion: '', duracion: 30, precio: 0, estado: true, imagen: '' });
    setPrecioServicioInput('');
    setImageFile(null);
    setImagePreview(null);
    setShowServicioFormErrors(false);
    setNombreServicioDuplicado(false);
    setNombreServicioError(null);
    setServicioValidationAttempt(0);
    setImageError(null);
  };

  const isFormDirty = (): boolean => {
    if (editingServicio) {
      return (
        nuevoServicio.nombre !== editingServicio.nombre ||
        nuevoServicio.descripcion !== editingServicio.descripcion ||
        nuevoServicio.duracion !== editingServicio.duracion ||
        nuevoServicio.precio !== editingServicio.precio ||
        nuevoServicio.estado !== editingServicio.estado ||
        imageFile !== null
      );
    }
    return (
      nuevoServicio.nombre !== '' ||
      nuevoServicio.descripcion !== '' ||
      nuevoServicio.duracion !== 30 ||
      nuevoServicio.precio !== 0 ||
      nuevoServicio.estado !== true ||
      precioServicioInput !== '' ||
      imageFile !== null ||
      imagePreview !== null
    );
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && isFormDirty()) {
      setIsConfirmDiscardOpen(true);
      return;
    }
    if (!open) {
      resetForm();
      setEditingServicio(null);
    }
    setIsDialogOpen(open);
  };

  return (
    <>
      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Tabla de Servicios */}
        <div className="std-card">
          {/* Controles y Filtros */}
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <button
                    className="btn-std-primary"
                    onClick={() => {
                      setEditingServicio(null);
                      setNuevoServicio({ nombre: '', descripcion: '', duracion: 30, precio: 0, estado: true, imagen: '' });
                      setPrecioServicioInput('');
                      setImageFile(null);
                      setImagePreview(null);
                      setShowServicioFormErrors(false);
                      setNombreServicioDuplicado(false);
                      setNombreServicioError(null);
                      setServicioValidationAttempt(0);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Servicio
                  </button>
                </DialogTrigger>
              </Dialog>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar servicios..."
            statusFilter={{
              value: statusFilter,
              onChange: (value) => {
                setStatusFilter(value as "all" | "active" | "inactive");
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ],
            }}
            recordsText={`Mostrando ${displayedServicios.length} de ${totalCountApi} servicios`}
            recordsPlacement="right"
          />

          {error ? (
            <div className="text-center py-8">
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                <h3 className="text-lg font-semibold text-red-400 mb-2">Error al cargar los servicios</h3>
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={() => loadServicios()}
                  className="px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-primary/80 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : (
            <StandardTable<Record<string, unknown>>
              columns={[
                {
                  key: "imagen",
                  header: "Imagen",
                  primary: true,
                  render: (_v, row) => {
                    const s = row as unknown as Servicio;
                    return (
                      <div className="flex justify-start">
                        <ImageRenderer
                          url={s.imagen}
                          alt={s.nombre}
                          className="w-12 h-12 object-cover rounded-lg"
                          fallbackVariant="product"
                          showLabel={false}
                        />
                      </div>
                    );
                  },
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "nombre",
                  header: "Nombre del servicio",
                  render: (_v, row) => (row as unknown as Servicio).nombre,
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "descripcion",
                  header: "Descripción",
                  render: (_v, row) => (row as unknown as Servicio).descripcion,
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "duracion",
                  header: "Duración",
                  render: (_v, row) => formatDuracion((row as unknown as Servicio).duracion),
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "precio",
                  header: "Precio",
                  render: (_v, row) => `$${((row as unknown as Servicio).precio ?? 0).toLocaleString('es-CO')}`,
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "estado",
                  header: "Estado",
                  render: (_v, row) => {
                    const s = row as unknown as Servicio;
                    const label = s.estado ? "Activo" : "Inactivo";
                    return (
                      <StandardTable.StatusBadge
                        variant={resolveStatusVariant(label)}
                        label={label}
                      />
                    );
                  },
                } as ColumnDef<Record<string, unknown>>,
                {
                  key: "acciones",
                  header: "Acciones",
                  render: (_v, row) => {
                    const servicio = row as unknown as Servicio;
                    return (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => toggleActivo(servicio.id)}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                          title="Cambiar estado"
                        >
                          {servicio.estado ? (
                            <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedServicio(servicio);
                            setIsDetailDialogOpen(true);
                          }}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                        </button>
                        <button
                          onClick={() => handleEditServicio(servicio)}
                          disabled={!servicio.estado}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={servicio.estado ? "Editar" : "Servicio inactivo (solo historial)"}
                        >
                          <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteServicio(servicio)}
                          disabled={!servicio.estado}
                          className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                          title={servicio.estado ? "Eliminar" : "Servicio inactivo (solo historial)"}
                        >
                          <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                        </button>
                      </div>
                    );
                  },
                } as ColumnDef<Record<string, unknown>>,
              ]}
              data={displayedServicios as unknown as Record<string, unknown>[]}
              loading={loading}
              emptyTitle="No se encontraron servicios"
              emptyMessage="Ajusta los filtros o recarga la tabla para actualizar los resultados."
              onReload={loadServicios}
              rowKey={(row) => String((row as unknown as Servicio).id)}
              renderMobileCard={(row) => {
                const servicio = row as unknown as Servicio;
                return (
                  <div className="std-mobile-card">
                    <div className="std-mobile-card-avatar">
                      <ImageRenderer url={servicio.imagen} alt={servicio.nombre} className="w-full h-full object-cover" fallbackVariant="product" showLabel={false} />
                    </div>
                    <div className="std-mobile-card-info">
                      <div className="std-mobile-card-row">
                        <span className="std-mobile-card-title">{servicio.nombre}</span>
                        <span className={`std-badge ${servicio.estado ? 'std-badge-positive' : 'std-badge-negative'}`}>
                          {servicio.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <span className="std-mobile-card-sub">{servicio.descripcion}</span>
                      <span className="std-mobile-card-meta">
                        ${servicio.precio.toLocaleString('es-CO')}  ·  {formatDuracion(servicio.duracion)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => toggleActivo(servicio.id)}
                        className="p-1"
                        title={servicio.estado ? "Desactivar" : "Activar"}
                      >
                        {servicio.estado ? (
                          <ToggleRight className="w-6 h-6 text-orange-primary" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-light" />
                        )}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-gray-darker transition-colors">
                            <MoreVertical className="w-4 h-4 text-gray-lightest" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-darkest border-gray-dark min-w-[140px]" align="end">
                          <DropdownMenuItem className="text-gray-lightest cursor-pointer" onSelect={() => { setSelectedServicio(servicio); setIsDetailDialogOpen(true); }}>
                            Detalles
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-gray-lightest cursor-pointer" disabled={!servicio.estado} onSelect={() => handleEditServicio(servicio)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-400 cursor-pointer" disabled={!servicio.estado} onSelect={() => handleDeleteServicio(servicio)}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              }}
            />
          )}

          {/* Paginación */}
          <div className="std-pagination">
            <div className="std-pag-info">
              Página {currentPage} de {totalPages}
            </div>
            <EllipsisPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={(page) => setCurrentPage(page)}
            />
          </div>
        </div>

        {/* Dialog de Creación/Edición */}
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-lightest flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-primary" />
                {editingServicio ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                {editingServicio ? 'Modifica los datos del servicio' : 'Completa la información para el nuevo servicio'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-gray-lightest text-xs flex items-center gap-1.5 py-2">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Nombre del Servicio *
                    </Label>
                    <NameInput
                      value={nuevoServicio.nombre}
                      onChange={(val) => {
                        const capped = val.slice(0, NOMBRE_MAX);
                        setNuevoServicio({ ...nuevoServicio, nombre: capped });
                        if (nombreServicioError) setNombreServicioError(null);
                        if (nombreServicioDuplicado) setNombreServicioDuplicado(false);
                      }}
                      placeholder="Ej: Corte Moderno"
                      className={`elegante-input h-9 text-sm ${
                        showServicioFormErrors && (nombreServicioError || nombreServicioDuplicado)
                          ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                    />
                    {showServicioFormErrors && nombreServicioError && (
                      <p className="text-[10px] text-red-400 mt-1">{nombreServicioError}</p>
                    )}
                    {showServicioFormErrors && nombreServicioDuplicado && (
                      <p className="text-[10px] text-red-400 mt-1">Ya existe un servicio con ese nombre.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Precio ($) *
                    </Label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={precioServicioInput}
                      onChange={(e) => {
                        // Quitar todo excepto dígitos
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw.length <= 12) {
                          // Formatear con puntos de miles
                          const formatted = raw === '' ? '' : Number(raw).toLocaleString('es-CO');
                          setPrecioServicioInput(formatted);
                          setNuevoServicio(prev => ({
                            ...prev,
                            precio: raw === '' ? 0 : Math.max(0, Number(raw))
                          }));
                        }
                      }}
                      className={`elegante-input h-9 text-sm no-spin ${
                        showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                      placeholder="0"
                    />
                    {showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 && (
                      <p className="text-[10px] text-red-400 mt-1">El precio debe ser mayor a cero.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Duración (minutos) *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={600}
                      step={5}
                      value={nuevoServicio.duracion || ''}
                      onChange={(e) => {
                        const raw = parseInt(e.target.value, 10) || 0;
                        setNuevoServicio({ ...nuevoServicio, duracion: raw > 600 ? 600 : raw });
                      }}
                      placeholder="Ej: 30"
                      className={`elegante-input h-9 text-sm no-spin ${
                        showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                    />
                    {showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 && (
                      <p className="text-[10px] text-red-400 mt-1">La duración debe ser mayor a 0.</p>
                    )}
                    {(nuevoServicio.duracion || 0) > 0 && (
                      <p className="text-[10px] text-orange-primary font-semibold mt-1">
                        = {formatDuracion(nuevoServicio.duracion)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 h-9">
                    <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-primary" />
                      Imagen del Servicio
                    </Label>
                    <button
                      type="button"
                      onClick={triggerFileSelect}
                      disabled={uploadingImage}
                      className="elegante-button-secondary px-4 py-4 gap-2 flex items-center text-xs disabled:opacity-50 shrink-0"
                    >
                      {uploadingImage ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Subiendo...</>
                      ) : (
                        <><Camera className="w-4 h-4" /> {imagePreview ? 'Cambiar' : 'Subir Imagen'}</>
                      )}
                    </button>
                  </div>
                  <div className={`w-full rounded-lg border-2 border-dashed border-gray-dark bg-gray-darker flex items-center justify-center overflow-hidden relative ${imagePreview ? 'h-52' : 'min-h-[280px]'}`}>
                    {imagePreview ? (
                      <div className="relative w-full h-full group">
                        <ImageRenderer
                          url={imagePreview}
                          alt="Vista previa"
                          className="w-full h-full border-0 bg-transparent object-cover"
                          fallbackVariant="product"
                          showLabel={false}
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            type="button"
                            onClick={editingServicio && !imageFile ? handleDeleteImage : removeSelectedImage}
                            disabled={isDeletingImage}
                            className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50"
                            title="Eliminar imagen"
                          >
                            {isDeletingImage ? <Loader2 className="w-5 h-5 animate-spin" /> : <X className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-lightest opacity-50">
                        <ImageIcon className="w-12 h-12" />
                        <span className="text-xs">Sin imagen</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-lightest px-1 flex items-center gap-1.5 opacity-80">
                    <Info className="w-3 h-3 text-orange-primary" />
                    Tamaño máx: {MAX_IMAGE_MB}MB. Formatos: JPG, PNG, GIF, WEBP.
                  </p>
                  {imageError && (
                    <p className="text-[10px] text-red-400 font-medium">{imageError}</p>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white-primary text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-orange-primary" />
                  Descripción
                </Label>
                <Textarea
                  value={nuevoServicio.descripcion}
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                  placeholder="Describe el servicio detalladamente"
                  className="elegante-input w-full min-h-[120px] resize-none text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                <button onClick={() => setIsDialogOpen(false)} className="elegante-button-secondary px-6">
                  Cancelar
                </button>
                <button
                  onClick={editingServicio ? handleUpdateServicio : handleCreateServicio}
                  className="elegante-button-primary px-8"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                      {editingServicio ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>{editingServicio ? 'Actualizar' : 'Crear'} Servicio</>
                  )}
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalle */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-gray-lightest flex items-center gap-2">
                <Scissors className="w-5 h-5 text-orange-primary" />
                Detalle del Servicio
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa del servicio
              </DialogDescription>
            </DialogHeader>
            {selectedServicio && (
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Nombre
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {selectedServicio.nombre}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Precio
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        ${(selectedServicio.precio ?? 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Duración
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {formatDuracion(selectedServicio.duracion)}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                        Estado
                      </Label>
                      <div className={`elegante-input h-9 text-sm flex items-center px-3 border ${
                        selectedServicio.estado
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {selectedServicio.estado ? 'Activo' : 'Inactivo'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-orange-primary" />
                      Imagen del Servicio
                    </Label>
                    <div className="w-full min-h-[200px] rounded-lg border-2 border-gray-dark bg-gray-darker flex items-center justify-center overflow-hidden">
                      <ImageRenderer
                        url={selectedServicio.imagen}
                        alt={selectedServicio.nombre}
                        className="w-full h-full min-h-[200px] border-0 bg-transparent object-cover"
                        fallbackVariant="product"
                        showLabel={false}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-lightest text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-primary" />
                    Descripción
                  </Label>
                  <div className="elegante-input w-full min-h-[120px] text-sm p-3 rounded-md border border-gray-dark bg-gray-darker overflow-y-auto">
                    {selectedServicio.descripcion || 'Sin descripción'}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                  <button
                    onClick={() => setIsDetailDialogOpen(false)}
                    className="elegante-button-secondary px-6"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo de Confirmación para Eliminar */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-darkest border-gray-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white-primary flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-400" />
                Confirmar Eliminación
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-lightest">
                ¿Estás seguro de que deseas eliminar el servicio{' '}
                <span className="font-semibold text-orange-primary">
                  "{servicioToDelete?.nombre}"
                </span>?
                <br />
                <br />
                <span className="text-red-400 font-medium">
                  Esta acción no se puede deshacer.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="elegante-button-secondary">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                Eliminar Servicio
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DiscardChangesDialog
          open={isConfirmDiscardOpen}
          onKeepEditing={() => setIsConfirmDiscardOpen(false)}
          onDiscard={() => { setIsConfirmDiscardOpen(false); resetForm(); setIsDialogOpen(false); setEditingServicio(null); }}
        />

        {AlertContainer}
      </main>
    </>
  );
}
