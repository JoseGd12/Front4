import React, { useState, useEffect } from "react";
import { Button } from "../../../shared/components/ui/button";
import { Input } from "../../../shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import {
  Tags,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Power,
  PowerOff,
  ToggleRight,
  ToggleLeft,
  Hash,
  X
} from "lucide-react";
import { Switch } from "../../../shared/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { Label } from "../../../shared/components/ui/label";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useDoubleConfirmation } from "../../../shared/components/ui/double-confirmation";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { categoriaService, Categoria } from "../services/categoriaService";
import { productoService, ApiProducto } from "../../productos/services/productos";


export function CategoriasPage() {
  const { created, edited, error: showAlertError, AlertContainer } = useCustomAlert();
  const { confirmDeleteAction, DoubleConfirmationContainer } = useDoubleConfirmation();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedCategoria, setSelectedCategoria] = useState<Categoria | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [productos, setProductos] = useState<ApiProducto[]>([]);

  const [nuevaCategoria, setNuevaCategoria] = useState({
    nombre: '',
    descripcion: '',
    estado: true
  });

  const [editCategoria, setEditCategoria] = useState({
    nombre: '',
    descripcion: '',
    estado: true
  });

  const [showCategoriaFormErrors, setShowCategoriaFormErrors] = useState(false);
  const [categoriaValidationAttempt, setCategoriaValidationAttempt] = useState(0);
  const shakeClass = categoriaValidationAttempt % 2 === 0 ? 'input-required-shake-a' : 'input-required-shake-b';
  const [duplicateNombreCreate, setDuplicateNombreCreate] = useState(false);
  const [duplicateNombreEdit, setDuplicateNombreEdit] = useState(false);
  const normalizeText = (s: string) => (s || '').trim().toLowerCase();

  // Cargar categorías desde la API
  const loadCategorias = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      const [categoriasData, productosData] = await Promise.all([
        categoriaService.getCategorias().catch(err => {
          console.error('❌ Error cargando categorías:', err);
          return [];
        }),
        productoService.getProductos().catch(err => {
          console.error('❌ Error cargando productos:', err);
          return [];
        })
      ]);
      setCategorias(categoriasData);
      setProductos(productosData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      setError('Error al cargar la información');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadCategorias();
  }, []);

  const filteredCategorias = categorias.filter(categoria => {
    const searchMatch = categoria.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      categoria.id.toString().includes(searchTerm);

    const statusMatch = filterStatus === "all" ||
      (filterStatus === "active" && categoria.estado) ||
      (filterStatus === "inactive" && !categoria.estado);

    return searchMatch && statusMatch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCategorias.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedCategorias = filteredCategorias.slice(startIndex, startIndex + itemsPerPage);

  const validateForm = (form: any, isEdit: boolean = false) => {
    if (!form.nombre || form.nombre.trim().length === 0) {
      setError('');
      return false;
    }

    if (form.nombre.length < 3 || form.nombre.length > 50) {
      setError('El nombre debe tener entre 3 y 50 caracteres');
      return false;
    }

    if (form.descripcion && form.descripcion.length > 200) {
      setError('La descripción no puede exceder los 200 caracteres');
      return false;
    }

    const targetName = normalizeText(form.nombre);
    const nombreExiste = categorias.some(c => {
      const same = normalizeText(c.nombre) === targetName;
      if (isEdit) {
        return same && c.id !== selectedCategoria?.id;
      }
      return same;
    });
    if (isEdit) setDuplicateNombreEdit(nombreExiste);
    else setDuplicateNombreCreate(nombreExiste);
    if (nombreExiste) return false;

    return true;
  };

  const handleCreateCategoria = async () => {
    if (!validateForm(nuevaCategoria)) {
      setShowCategoriaFormErrors(true);
      setCategoriaValidationAttempt(prev => prev + 1);
      if (!nuevaCategoria.nombre.trim()) {
        showAlertError("Campos obligatorios", "Por favor completa el nombre de la categoría.");
      } else if (duplicateNombreCreate) {
        showAlertError("Nombre duplicado", "Ya existe una categoría con este nombre.");
      }
      return;
    }

    try {
      const creada = await categoriaService.createCategoria({
        nombre: nuevaCategoria.nombre,
        descripcion: nuevaCategoria.descripcion,
        estado: nuevaCategoria.estado
      });
      if (creada && nuevaCategoria.estado === false) {
        const idCreada = (creada as any)?.id ?? (creada as any)?.Id;
        if (idCreada) {
          try {
            await categoriaService.updateCategoriaStatus(Number(idCreada), false);
          } catch {}
        }
      }

      await loadCategorias(true); // Recargar sin parpadear

      setIsDialogOpen(false);
      setNuevaCategoria({
        nombre: '',
        descripcion: '',
        estado: true
      });
      setError('');
      setShowCategoriaFormErrors(false);
      setCategoriaValidationAttempt(0);

      created(nuevaCategoria.nombre, 'Categoría creada exitosamente');
    } catch (error) {
      console.error('Error creando categoría:', error);
      setError('Error al crear la categoría');
    }
  };

  const handleEditClick = (categoria: Categoria) => {
    setSelectedCategoria(categoria);
    setEditCategoria({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      estado: categoria.estado
    });
    setError('');
    setShowCategoriaFormErrors(false);
    setCategoriaValidationAttempt(0);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCategoria = async () => {
    if (!selectedCategoria || !validateForm(editCategoria, true)) {
      setShowCategoriaFormErrors(true);
      setCategoriaValidationAttempt(prev => prev + 1);
      if (!editCategoria.nombre.trim()) {
        showAlertError("Campos obligatorios", "Por favor completa el nombre de la categoría.");
      } else if (duplicateNombreEdit) {
        showAlertError("Nombre duplicado", "Ya existe una categoría con este nombre.");
      }
      return;
    }

    try {
      await categoriaService.updateCategoria(selectedCategoria.id, {
        id: selectedCategoria.id,
        nombre: editCategoria.nombre,
        descripcion: editCategoria.descripcion,
        estado: editCategoria.estado
      });

      await loadCategorias(true); // Recargar sin parpadear

      setIsEditDialogOpen(false);
      setSelectedCategoria(null);
      setError('');
      setShowCategoriaFormErrors(false);
      setCategoriaValidationAttempt(0);

      edited(editCategoria.nombre, 'Categoría actualizada exitosamente');
    } catch (error) {
      console.error('Error actualizando categoría:', error);
      setError('Error al actualizar la categoría');
    }
  };
  const handleDeleteClick = async (categoria: Categoria) => {
    // 1. Verificar si hay productos asociados a esta categoría
    const productosAsociados = productos.filter(p =>
      p.categoria && (p.categoria.id === categoria.id || p.categoria.nombre === categoria.nombre)
    );

    if (productosAsociados.length > 0) {
      // Si hay productos asociados, no permitir la eliminación y mostrar mensaje de error
      showAlertError(
        "No se puede eliminar",
        `La categoría "${categoria.nombre}" tiene ${productosAsociados.length} productos asociados. Por favor, remueva o cambie la categoría de estos productos antes de eliminarla.`
      );
      return;
    }

    // 2. Si no hay productos asociados, mostrar confirmación
    confirmDeleteAction(
      categoria.nombre,
      async () => {
        try {
          await categoriaService.deleteCategoria(categoria.id);
          await loadCategorias(true); // Recargar sin parpadear y productos
        } catch (error) {
          console.error('Error eliminando categoría:', error);
          setError('Error al eliminar la categoría');
          throw error;
        }
      },
      {
        confirmMessage: `¿Estás seguro de que deseas eliminar la categoría "${categoria.nombre}"? esta acción no se puede deshacer.`,
        successMessage: `La categoría "${categoria.nombre}" ha sido eliminada exitosamente.`,
        requireInput: false
      }
    );
  };

  const handleToggleStatus = async (categoria: Categoria) => {
    try {
      await categoriaService.updateCategoriaStatus(categoria.id, !categoria.estado);
      await loadCategorias(true);
      edited(categoria.nombre, `Categoría ${!categoria.estado ? 'activada' : 'desactivada'} exitosamente`);
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setError('Error al cambiar el estado de la categoría');
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-black-primary border-b border-gray-dark px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-lightest">Gestión de Categorías</h1>
            <p className="text-sm text-gray-lightest mt-1">Administra las categorías de productos</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-black-primary">
        {/* Sección Principal */}
        <div className="std-card">
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button
                    className="btn-std-primary"
                    onClick={() => {
                      setNuevaCategoria({
                        nombre: '',
                        descripcion: '',
                        estado: true
                      });
                      setError('');
                      setShowCategoriaFormErrors(false);
                      setCategoriaValidationAttempt(0);
                      setDuplicateNombreCreate(false);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                    Nueva Categoría
                  </button>
                </DialogTrigger>
                <DialogContent
                  className="bg-gray-darkest border-gray-dark max-w-3xl"
                  onInteractOutside={(e: any) => {
                    const target = e.target as HTMLElement | null;
                    if (target?.closest('[data-alert-container="true"]')) {
                      e.preventDefault();
                    }
                  }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-gray-lightest flex items-center gap-2">
                      <Plus className="w-5 h-5 text-orange-primary" />
                      Crear Nueva Categoría
                    </DialogTitle>
                    <DialogDescription className="text-gray-lightest">
                      Completa la información de la categoría
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    {error && (
                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 text-sm">{error}</span>
                      </div>
                    )}

                    <div className="space-y-2">
                    <Label className="text-gray-lightest">Nombre de la Categoría *</Label>
                    <Input
                      value={nuevaCategoria.nombre}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNuevaCategoria({ ...nuevaCategoria, nombre: v });
                        if (showCategoriaFormErrors && v.trim()) setShowCategoriaFormErrors(false);
                        const norm = normalizeText(v);
                        if (!norm) {
                          setDuplicateNombreCreate(false);
                        } else {
                          const dup = categorias.some(c => normalizeText(c.nombre) === norm);
                          setDuplicateNombreCreate(dup);
                        }
                      }}
                      placeholder="Ej: Cuidado Capilar"
                      className="elegante-input"
                    />
                    {showCategoriaFormErrors && !nuevaCategoria.nombre.trim() ? (
                      <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                    ) : (nuevaCategoria.nombre.trim() && duplicateNombreCreate) ? (
                      <p className="text-xs text-red-400">Ya existe una categoría con este nombre.</p>
                    ) : null}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest">Descripción</Label>
                      <textarea
                        value={nuevaCategoria.descripcion}
                        onChange={(e) => setNuevaCategoria({ ...nuevaCategoria, descripcion: e.target.value })}
                        placeholder="Descripción de la categoría..."
                        className="elegante-input w-full min-h-[180px] resize-none"
                        rows={7}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-lightest">Estado</Label>
                      <div className="flex items-center space-x-3">
                        <Switch
                          checked={nuevaCategoria.estado}
                          onCheckedChange={(checked) => setNuevaCategoria({ ...nuevaCategoria, estado: checked })}
                          className="data-[state=checked]:bg-orange-primary"
                        />
                        <span className={`text-sm font-medium ${nuevaCategoria.estado ? 'text-orange-primary' : 'text-gray-lightest'}`}>
                          {nuevaCategoria.estado ? 'Activa' : 'Inactiva'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-lightest">
                      * Campos obligatorios
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
                    <button onClick={() => {
                      setIsDialogOpen(false);
                      setError('');
                      setShowCategoriaFormErrors(false);
                      setCategoriaValidationAttempt(0);
                      setDuplicateNombreCreate(false);
                    }} className="elegante-button-secondary">
                      Cancelar
                    </button>
                    <button
                      onClick={handleCreateCategoria}
                      className="elegante-button-primary"
                    >
                      Crear Categoría
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            searchValue={searchTerm}
            onSearchChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            searchPlaceholder="Buscar categorías..."
            statusFilter={{
              value: filterStatus,
              onChange: (value) => {
                setFilterStatus(value as "all" | "active" | "inactive");
                setCurrentPage(1);
              },
              options: [
                { value: "all", label: "Todos" },
                { value: "active", label: "Activos" },
                { value: "inactive", label: "Inactivos" },
              ],
            }}
            recordsText={`Mostrando ${displayedCategorias.length} de ${filteredCategorias.length} categorías`}
            recordsPlacement="right"
          />

          {/* Tabla de Categorías */}
          <div className="std-table-wrapper">
            <table className="std-table">
              <thead className={loading ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody className="std-tbody">
                {loading ? (
                  <TableLoadingStateRow
                    colSpan={4}
                    title="Cargando categorías..."
                  />
                ) : displayedCategorias.length === 0 ? (
                  <TableEmptyStateRow
                    colSpan={4}
                    title="No se encontraron categorías"
                    description="Ajusta los filtros o recarga la tabla para actualizar los resultados."
                    onReload={() => loadCategorias()}
                  />
                ) : (
                  displayedCategorias.map((categoria) => (
                    <tr key={categoria.id}>
                      <td className="std-td-primary">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-orange-primary rounded-lg flex items-center justify-center">
                            <Tags className="w-4 h-4 text-black-primary" />
                          </div>
                          <span className="text-gray-lightest">{categoria.nombre}</span>
                        </div>
                      </td>
                      <td className="std-td">
                        <span className="text-sm">{categoria.descripcion || 'Sin descripción'}</span>
                      </td>
                      <td className="std-td">
                        <span className={`std-badge ${categoria.estado ? 'std-badge-positive' : 'std-badge-neutral'}`}>
                          {categoria.estado ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="std-td">
                        <div className="flex items-center justify-center gap-2">
                        <button
                            onClick={() => handleToggleStatus(categoria)}
                            className="p-2 hover:bg-gray-dark rounded-lg transition-colors group"
                            title={categoria.estado ? "Desactivar" : "Activar"}
                          >
                            {categoria.estado ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCategoria(categoria);
                              setIsDetailDialogOpen(true);
                            }}
                            className="p-2 hover:bg-gray-dark rounded-lg transition-colors group"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={() => handleEditClick(categoria)}
                            disabled={!categoria.estado}
                            className="p-2 hover:bg-gray-dark rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={categoria.estado ? "Editar" : "Categoría inactiva (solo historial)"}
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteClick(categoria)}
                            disabled={!categoria.estado}
                            className="p-2 hover:bg-gray-dark rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={categoria.estado ? "Eliminar" : "Categoría inactiva (solo historial)"}
                          >
                            <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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

          {/* Tabla antigua - OLD */}
          <div style={{ display: 'none' }}>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-lighter" />
              <Input
                placeholder="Buscar categoría por nombre o ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="elegante-input pl-10 w-80"
              />
            </div>
          </div>
        </div>



        {/* Dialog de Edición */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent
            className="bg-gray-darkest border-gray-dark max-w-3xl"
            onInteractOutside={(e: any) => {
              const target = e.target as HTMLElement | null;
              if (target?.closest('[data-alert-container="true"]')) {
                e.preventDefault();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-gray-lightest flex items-center gap-2">
                <Edit className="w-5 h-5 text-orange-primary" />
                Editar Categoría
              </DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Modifica la información de la categoría
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              {error && (
                <div className="flex items-center space-x-2 p-3 rounded-lg bg-red-900/20 border border-red-600/30">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 text-sm">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-gray-lightest">Nombre de la Categoría *</Label>
                <Input
                  value={editCategoria.nombre}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditCategoria({ ...editCategoria, nombre: v });
                    if (showCategoriaFormErrors && v.trim()) setShowCategoriaFormErrors(false);
                    const norm = normalizeText(v);
                    if (!norm) {
                      setDuplicateNombreEdit(false);
                    } else {
                      const dup = categorias.some(c => {
                        const same = normalizeText(c.nombre) === norm;
                        return selectedCategoria ? same && c.id !== selectedCategoria.id : same;
                      });
                      setDuplicateNombreEdit(dup);
                    }
                  }}
                  placeholder="Ej: Cuidado Capilar"
                  className="elegante-input"
                />
                {showCategoriaFormErrors && !editCategoria.nombre.trim() ? (
                  <p className="text-xs text-red-400">Este campo es obligatorio.</p>
                ) : (editCategoria.nombre.trim() && duplicateNombreEdit) ? (
                  <p className="text-xs text-red-400">Ya existe una categoría con este nombre.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-gray-lightest">Descripción</Label>
                <textarea
                  value={editCategoria.descripcion}
                  onChange={(e) => setEditCategoria({ ...editCategoria, descripcion: e.target.value })}
                  placeholder="Descripción de la categoría..."
                  className="elegante-input w-full min-h-[180px] resize-none"
                  rows={7}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-lightest">Estado</Label>
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={editCategoria.estado}
                    onCheckedChange={(checked) => setEditCategoria({ ...editCategoria, estado: checked })}
                    className="data-[state=checked]:bg-orange-primary"
                  />
                  <span className={`text-sm font-medium ${editCategoria.estado ? 'text-orange-primary' : 'text-gray-lightest'}`}>
                    {editCategoria.estado ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-lightest">
                * Campos obligatorios
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button onClick={() => {
                setIsEditDialogOpen(false);
                setError('');
                setSelectedCategoria(null);
                setShowCategoriaFormErrors(false);
                setCategoriaValidationAttempt(0);
                setDuplicateNombreEdit(false);
              }} className="elegante-button-secondary">
                Cancelar
              </button>
              <button
                onClick={handleUpdateCategoria}
                className="elegante-button-primary"
              >
                Guardar Cambios
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalle */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-gray-lightest">Detalle de Categoría</DialogTitle>
              
            </DialogHeader>
            {selectedCategoria && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-light">ID de Categoría</p>
                    <p className="text-orange-primary">{selectedCategoria.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-light">Estado</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedCategoria.estado ? (
                        <Power className="w-4 h-4 text-orange-primary" />
                      ) : (
                        <PowerOff className="w-4 h-4 text-gray-lightest" />
                      )}
                      <span className={` ${selectedCategoria.estado ? 'text-orange-primary' : 'text-gray-lightest'}`}>
                        {selectedCategoria.estado ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-light">Nombre</p>
                  <p className="text-gray-lightest text-lg">{selectedCategoria.nombre}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-light">Descripción</p>
                  <p className="text-gray-lightest">{selectedCategoria.descripcion || 'Sin descripción'}</p>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-dark">
                  <button
                    onClick={() => setIsDetailDialogOpen(false)}
                    className="elegante-button-primary"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>


      </main>

      <AlertContainer />
      <DoubleConfirmationContainer />
    </>
  );
}
