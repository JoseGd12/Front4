import { useState, useEffect, useRef } from "react";
import { Input } from "../../../shared/components/ui/input";
import { Scissors, Plus, Edit, Trash2, Eye, ChevronLeft, ChevronRight, ToggleRight, ToggleLeft, Image as ImageIcon, Upload, X, Loader2, Camera, Info, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { Switch } from "../../../shared/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { apiService, Servicio } from "../../../shared/services/api";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";

export function ServiciosPage() {
  const { created, edited, deleted, error: showErrorAlert, AlertContainer } = useCustomAlert();
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<Servicio | null>(null);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [servicioToDelete, setServicioToDelete] = useState<Servicio | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [precioServicioInput, setPrecioServicioInput] = useState<string>('');
  const [nombreServicioDuplicado, setNombreServicioDuplicado] = useState(false);
  const [showServicioFormErrors, setShowServicioFormErrors] = useState(false);
  const [servicioValidationAttempt, setServicioValidationAttempt] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shakeClass = servicioValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';

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

  const filteredServicios = servicios.filter(servicio => {
    const matchesSearch = servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? servicio.estado === true : servicio.estado === false);
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredServicios.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedServicios = filteredServicios.slice(startIndex, startIndex + itemsPerPage);


  const handleCreateServicio = async () => {
    setShowServicioFormErrors(true);
    setServicioValidationAttempt((prev) => prev + 1);

    const nombre = (nuevoServicio.nombre || '').trim();
    const descripcion = (nuevoServicio.descripcion || '').trim();
    const duracion = Number(nuevoServicio.duracion || 0);
    const precio = Number(nuevoServicio.precio || 0);

    // Validación de campos obligatorios antes de llamar a la API
    if (!nombre || duracion <= 0 || precio <= 0) {
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
    setPrecioServicioInput(servicio.precio != null ? String(servicio.precio) : '');
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

      if (!nombre || duracion <= 0 || precio <= 0) {
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
      try {
        setSubmitting(true);
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
            await loadServicios();
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

    // Actualización optimista local
    setServicios(prev =>
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
      console.error('Error actualizando estado del servicio:', err);
      setError(err.message || 'Error al actualizar el estado del servicio');
      // Intentar recargar para sincronizar sin parpadear
      await loadServicios(true);
    }
  };

  return (
    <>
      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Tabla de Servicios */}
        <div className="elegante-card">
          {/* Controles y Filtros */}
          <TableHeaderSection
            leftContent={(
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="elegante-button-primary gap-2 flex items-center"
                    onClick={() => {
                      setEditingServicio(null);
                      setNuevoServicio({ nombre: '', descripcion: '', duracion: 30, precio: 0, estado: true, imagen: '' });
                      setPrecioServicioInput('');
                      setImageFile(null);
                      setImagePreview(null);
                      setShowServicioFormErrors(false);
                      setNombreServicioDuplicado(false);
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
            recordsText={`Mostrando ${displayedServicios.length} de ${filteredServicios.length} servicios`}
            recordsPlacement="left"
          />

          <div className="overflow-x-auto">
            {error ? (
              <div className="text-center py-8">
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">Error al cargar los servicios</h3>
                  <p className="text-red-300 mb-4">{error}</p>
                  <button
                    onClick={loadServicios}
                    className="px-4 py-2 bg-orange-primary text-white rounded-lg hover:bg-orange-primary/80 transition-colors"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : (
              <table className="w-full">
                <thead className={loading ? "[&_th]:!text-transparent [&_th]:select-none" : undefined}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Imagen</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Nombre del servicio</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Descripción</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Duración</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Precio</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingStateRow
                      colSpan={7}
                      title="Cargando servicios..."
                    />
                  ) : displayedServicios.length > 0 ? displayedServicios.map((servicio) => (
                    <tr key={servicio.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          <ImageRenderer
                            url={servicio.imagen}
                            alt={servicio.nombre}
                            className="w-12 h-12 object-cover rounded-lg"
                            fallbackVariant="product"
                            showLabel={false}
                          />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{servicio.nombre}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{servicio.descripcion}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{servicio.duracion} min</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">${(servicio.precio ?? 0).toLocaleString('es-CO')}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs ${servicio.estado
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                          {servicio.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4">
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
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteServicio(servicio)}
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
                      title="No se encontraron servicios"
                      description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                      onReload={loadServicios}
                      reloadLabel="Recargar tabla"
                    />
                  )}
                </tbody>
              </table>
            )}
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
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[110px] h-8 bg-gray-darker border-gray-dark text-gray-lightest">
                    <SelectValue placeholder={itemsPerPage.toString()} />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark text-gray-lightest">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-lightest" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded text-sm transition-colors ${currentPage === pageNum
                        ? 'bg-orange-primary text-black-primary font-medium'
                        : 'border border-gray-dark hover:bg-gray-darker text-gray-lightest'
                        }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-lightest" />
              </button>
            </div>
          </div>
        </div>

        {/* Dialog de Creación/Edición */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary flex items-center gap-2">
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
                    <Label className="text-white-primary text-xs flex items-center gap-1.5 py-2">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Nombre del Servicio *
                    </Label>
                    <Input
                      value={nuevoServicio.nombre}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                      placeholder="Ej: Corte Moderno"
                      className={`elegante-input h-9 text-sm ${
                        showServicioFormErrors && (!nuevoServicio.nombre.trim() || nombreServicioDuplicado)
                          ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                    />
                    {showServicioFormErrors && !nuevoServicio.nombre.trim() && (
                      <p className="text-[10px] text-red-400 mt-1">Este campo es obligatorio.</p>
                    )}
                    {showServicioFormErrors && nombreServicioDuplicado && nuevoServicio.nombre.trim() && (
                      <p className="text-[10px] text-red-400 mt-1">El nombre ya existe.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Precio ($) *
                    </Label>
                    <Input
                      type="number"
                      value={precioServicioInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.length <= 15) {
                          setPrecioServicioInput(val);
                          setNuevoServicio(prev => ({
                            ...prev,
                            precio: val.trim() === '' ? 0 : Math.max(0, Number(val) || 0)
                          }));
                        }
                      }}
                      className={`elegante-input h-9 text-sm no-spin ${
                        showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                      min={0}
                      step={100}
                    />
                    {showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 && (
                      <p className="text-[10px] text-red-400 mt-1">El precio debe ser mayor a cero.</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                      Duración (minutos) *
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      step={5}
                      value={nuevoServicio.duracion || ''}
                      onChange={(e) => setNuevoServicio({ ...nuevoServicio, duracion: parseInt(e.target.value, 10) || 0 })}
                      placeholder="Ej: 30"
                      className={`elegante-input h-9 text-sm no-spin ${
                        showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''
                      }`}
                    />
                    {showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 && (
                      <p className="text-[10px] text-red-400 mt-1">La duración debe ser mayor a 0.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 h-9">
                    <Label className="text-white-primary text-xs flex items-center gap-1.5">
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

              <div className="space-y-2">
                <Label className="text-white-primary text-xs flex items-center gap-1.5">
                  Estado
                </Label>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={!!nuevoServicio.estado}
                    onCheckedChange={(checked) => setNuevoServicio({ ...nuevoServicio, estado: !!checked })}
                    className="data-[state=checked]:bg-orange-primary"
                  />
                  <span className={`text-sm font-medium ${nuevoServicio.estado ? 'text-orange-primary' : 'text-gray-lightest'}`}>
                    {nuevoServicio.estado ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
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
              <DialogTitle className="text-white-primary flex items-center gap-2">
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
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Nombre
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {selectedServicio.nombre}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Precio
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        ${(selectedServicio.precio ?? 0).toLocaleString('es-CO')}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-orange-primary" />
                        Duración
                      </Label>
                      <div className="elegante-input h-9 text-sm flex items-center px-3 bg-gray-darker border border-gray-dark">
                        {selectedServicio.duracion} min
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white-primary text-xs flex items-center gap-1.5">
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
                  <Label className="text-white-primary text-xs flex items-center gap-1.5">
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

        <AlertContainer />
      </main>
    </>
  );
}
