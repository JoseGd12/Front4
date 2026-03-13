import { useState, useEffect } from "react";
import { Input } from "../../../shared/components/ui/input";
import { Scissors, Plus, Edit, Trash2, Search, Eye, ChevronLeft, ChevronRight, ToggleRight, ToggleLeft, Image as ImageIcon, Upload, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { Textarea } from "../../../shared/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { apiService, Servicio } from "../../../shared/services/api";

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
  const [submitting, setSubmitting] = useState(false);
  const [precioServicioInput, setPrecioServicioInput] = useState<string>('');
  const [nombreServicioDuplicado, setNombreServicioDuplicado] = useState(false);
  const [showServicioFormErrors, setShowServicioFormErrors] = useState(false);
  const [servicioValidationAttempt, setServicioValidationAttempt] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const shakeClass = servicioValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const itemsPerPage = 5;

  // Cargar servicios desde la API
  const loadServicios = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getServicios();
      setServicios(data);
    } catch (err: any) {
      console.error('Error cargando servicios:', err);
      setError(err.message || 'Error al cargar los servicios');
    } finally {
      setLoading(false);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        showErrorAlert("Archivo demasiado grande", "La imagen no debe superar los 15MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      
      // Recargar lista
      await loadServicios();
      
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
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredServicios.length / itemsPerPage);
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
      await loadServicios(); // Sincronizar con backend por si hay transformaciones
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
          await loadServicios(); // Recargar para obtener la URL de la imagen
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
        await loadServicios(); // Recargar todos los servicios
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
        // Asegurar que la lista quede sincronizada con el backend aunque falle la eliminación
        await loadServicios();
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
      // Intentar recargar para sincronizar
      await loadServicios();
    }
  };

  return (
    <>
      <main className="flex-1 overflow-auto p-8 bg-black-primary">
        {/* Tabla de Servicios */}
        <div className="elegante-card">
          {/* Controles y Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-dark">
            <div className="flex flex-wrap items-center gap-4">
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

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter pointer-events-none z-10" />
                <Input
                  placeholder="Buscar servicios..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="elegante-input pl-11 w-80"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {/* Loading State */}
            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-white-primary mb-2">Cargando servicios...</h3>
                <p className="text-gray-lightest">Por favor espera un momento</p>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
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
            )}

            {/* Data Table */}
            {!loading && !error && (
              <>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-dark">
                      <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Servicio</th>
                      <th className="text-left py-3 px-4 text-white-primary font-bold text-sm">Descripción</th>
                      <th className="text-center py-3 px-4 text-white-primary font-bold text-sm">Duración</th>
                      <th className="text-right py-3 px-4 text-white-primary font-bold text-sm">Precio</th>
                      <th className="text-right py-3 px-4 text-white-primary font-bold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedServicios.map((servicio) => (
                      <tr key={servicio.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-gray-medium overflow-hidden flex items-center justify-center border border-gray-dark">
                              {servicio.imagen ? (
                                <img src={servicio.imagen} alt={servicio.nombre} className="w-full h-full object-cover" />
                              ) : (
                                <Scissors className="w-5 h-5 text-orange-primary" />
                              )}
                            </div>
                            <span className="text-gray-lighter">{servicio.nombre}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-lighter">{servicio.descripcion}</span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-gray-lighter">{servicio.duracion} min</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="text-gray-lighter">${(servicio.precio ?? 0).toLocaleString('es-CO')}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
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
                    ))}
                  </tbody>
                </table>

                {displayedServicios.length === 0 && (
                  <div className="text-center py-8">
                    <Scissors className="w-16 h-16 text-gray-medium mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-white-primary mb-2">No se encontraron servicios</h3>
                    <p className="text-gray-lightest">Intenta con otros términos de búsqueda</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Paginación */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-dark">
            <div className="text-sm text-gray-lightest">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-dark hover:bg-gray-darker disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-lightest" />
              </button>
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
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-md w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary">
                {editingServicio ? 'Editar Servicio' : 'Crear Nuevo Servicio'}
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                {editingServicio ? 'Modifica los datos del servicio' : 'Completa la información para el nuevo servicio'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                <div className="w-52 h-52 rounded-2xl bg-gray-medium border-2 border-dashed border-gray-dark overflow-hidden flex items-center justify-center transition-all">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-4">
                      <ImageIcon className="w-12 h-12 text-gray-lightest mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-gray-lightest opacity-50">Sin imagen</p>
                    </div>
                  )}
                </div>

                {(imagePreview || imageFile) && (
                  <button
                    onClick={imageFile ? removeSelectedImage : handleDeleteImage}
                    className="absolute -top-2 -right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg transition-colors z-10"
                    title="Eliminar imagen"
                    disabled={isDeletingImage}
                  >
                    {isDeletingImage ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
              
              <Label 
                htmlFor="servicio-imagen" 
                className="elegante-button-primary w-fit px-4 flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all text-sm py-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Subir</span>
                <input 
                  id="servicio-imagen" 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </Label>
              <p className="text-[11px] text-gray-lightest mt-2">Formatos permitidos: JPG, PNG, WEBP (Max. 15MB)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label className="text-white-primary flex items-center gap-1">
                  Nombre del Servicio
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={nuevoServicio.nombre}
                  onChange={(e) => setNuevoServicio({ ...nuevoServicio, nombre: e.target.value })}
                  placeholder="Ej: Corte Moderno"
                  className={`elegante-input ${
                    showServicioFormErrors &&
                    (!nuevoServicio.nombre.trim() || nombreServicioDuplicado)
                      ? `border-red-500 ring-1 ring-red-500 ${shakeClass}`
                      : ''
                  }`}
                />
                {showServicioFormErrors && !nuevoServicio.nombre.trim() && (
                  <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                )}
                {showServicioFormErrors && nombreServicioDuplicado && nuevoServicio.nombre.trim() && (
                  <p className="text-xs text-red-400">El nombre ya existe.</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className="text-white-primary flex items-center gap-1">
                  Precio ($)
                  <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  value={precioServicioInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length <= 15) {
                      setPrecioServicioInput(val);
                      if (val.trim() === '') {
                        setNuevoServicio({ ...nuevoServicio, precio: 0 });
                      } else {
                        const numero = Number(val);
                        if (!Number.isNaN(numero)) {
                          setNuevoServicio({ ...nuevoServicio, precio: Math.max(0, numero) });
                        }
                      }
                    }
                  }}
                  className={`elegante-input no-spin ${showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
                  min="0"
                  step="100"
                />
                <div className="flex justify-start mt-1">
                  <span className="text-xs text-gray-500 font-medium">
                    {precioServicioInput.length}/15 caracteres
                  </span>
                </div>
                {showServicioFormErrors && (nuevoServicio.precio || 0) <= 0 && (
                  <p className="text-xs text-red-400">El precio debe ser mayor a cero.</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-1">
              <Label className="text-white-primary flex items-center gap-1">
                Duración (minutos)
                <span className="text-red-400">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                step={5}
                value={nuevoServicio.duracion || ''}
                onChange={(e) => setNuevoServicio({ ...nuevoServicio, duracion: parseInt(e.target.value, 10) || 0 })}
                placeholder="Ej: 30"
                className={`elegante-input no-spin ${showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 ? `border-red-500 ring-1 ring-red-500 ${shakeClass}` : ''}`}
              />
              {showServicioFormErrors && (nuevoServicio.duracion || 0) <= 0 && (
                <p className="text-xs text-red-400">La duración debe ser mayor a 0 minutos.</p>
              )}
                <p className="text-[11px] text-gray-400 mt-1">Ingresa los minutos manualmente.</p>
              </div> <div className="space-y-2 md:col-span-1">
              <Label className="text-white-primary">Descripción</Label>
                  <Textarea
                    value={nuevoServicio.descripcion}
                    onChange={(e) => setNuevoServicio({ ...nuevoServicio, descripcion: e.target.value })}
                    placeholder="Describe el servicio detalladamente"
                    className="elegante-input"
                    rows={3}
                  /> 
              </div>
            </div>
            {/* Vista Previa UI/UX */}
            <div className="bg-gray-darker p-2 rounded-md border border-gray-dark mt-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-lightest text-xs">Vista previa</span>
                <Scissors className="w-3 h-3 text-orange-primary" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <p className="text-[10px] text-gray-400">Nombre</p>
                  <p className="text-white-primary font-medium text-xs truncate">{nuevoServicio.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Duración</p>
                  <p className="text-white-primary font-medium text-xs">{(nuevoServicio.duracion || 0) > 0 ? `${nuevoServicio.duracion} min` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400">Precio</p>
                  <p className="text-orange-primary font-semibold text-xs">${(nuevoServicio.precio || 0).toLocaleString('es-CO')}</p>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-gray-400">Descripción</p>
                <p className="text-gray-lightest text-xs line-clamp-1">{nuevoServicio.descripcion || '—'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={nuevoServicio.estado}
                onChange={(e) => setNuevoServicio({ ...nuevoServicio, estado: e.target.checked })}
                className="rounded"
              />
              <Label className="text-white-primary">Servicio activo</Label>
            </div>
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-dark mt-6">
              <button onClick={() => setIsDialogOpen(false)} className="elegante-button-secondary">
                Cancelar
              </button>
              <button
                onClick={editingServicio ? handleUpdateServicio : handleCreateServicio}
                className="elegante-button-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {editingServicio ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>{editingServicio ? 'Actualizar' : 'Crear'} Servicio</>
                )}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalle */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white-primary">Detalle del Servicio</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa del servicio
              </DialogDescription>
            </DialogHeader>
            {selectedServicio && (
              <div className="grid grid-cols-4 gap-6 pt-4">
                <div className="col-span-4 flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-medium overflow-hidden flex items-center justify-center border border-gray-dark shadow-inner">
                    {selectedServicio.imagen ? (
                      <img src={selectedServicio.imagen} alt={selectedServicio.nombre} className="w-full h-full object-cover" />
                    ) : (
                      <Scissors className="w-8 h-8 text-orange-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white-primary">{selectedServicio.nombre}</h3>
                  </div>
                </div>

                <div className="col-span-4">
                  <p className="text-sm text-gray-light mb-2">Descripción del Servicio</p>
                  <div className="bg-gray-medium p-3 rounded-lg border border-gray-dark">
                    <p className="text-white-primary">{selectedServicio.descripcion}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-light mb-2">Duración</p>
                  <p className="font-semibold text-white-primary text-lg">{selectedServicio.duracion} min</p>
                </div>
                <div>
                  <p className="text-sm text-gray-light mb-2">Precio</p>
                  <p className="font-semibold text-orange-primary text-lg">${(selectedServicio.precio ?? 0).toLocaleString('es-CO')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-light mb-2">Estado del Servicio</p>
                  <button
                    onClick={() => toggleActivo(selectedServicio.id)}
                    className={`px-3 py-1 rounded-lg text-xs transition-colors bg-gray-medium text-gray-lighter`}
                  >
                    {selectedServicio.estado ? 'ACTIVO' : 'INACTIVO'}
                  </button>
                </div>
                <div>
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
