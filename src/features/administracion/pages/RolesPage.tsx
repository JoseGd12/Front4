import { useState, useMemo, useCallback, useEffect } from "react";
import { Input } from "../../../shared/components/ui/input";
import { NameInput } from "../../../shared/components/ui/NameInput";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Settings,
  UserCheck,
  FileText,
  Check,
  Loader2,
  ToggleRight,
  ToggleLeft,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { Label } from "../../../shared/components/ui/label";
import { toast } from "../../../shared/components/ui/notify";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../shared/components/ui/select";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { rolesApiService, RoleWithModules, CreateRoleData, UpdateRoleData, PermisoModulo } from "../services/rolesApiService";
import { modulosService, Modulo } from "../services/modulosService";
import { logger } from "../../../shared/utils/logger";

const API_BASE_URL = '/api';
import { auth } from "../../../shared/services/firebase";

// Headers con token de Firebase (prioridad) o localStorage para compatibilidad
async function getAuthHeaders(): Promise<Record<string, string>> {
  let token: string | null = localStorage.getItem('authToken');
  if (auth.currentUser) {
    token = await auth.currentUser.getIdToken();
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// Interfaz extendida para módulos con propiedades adicionales
interface ModuloExtendido {
  id: string;
  nombre: string;
  estado: boolean;
  icono: any;
  color: string;
  descripcion: string;
  rolesModulos?: any[];
}

export function RolesPage() {
  const { success: showSuccess, error: showError, AlertContainer } = useCustomAlert();
  const [roles, setRoles] = useState<RoleWithModules[]>([]);
  const [modulosProyecto, setModulosProyecto] = useState<ModuloExtendido[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [hasTriedToSubmit, setHasTriedToSubmit] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleWithModules | null>(null);
  const [editingRole, setEditingRole] = useState<RoleWithModules | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<RoleWithModules | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState<'todos' | 'activo' | 'inactivo'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [nuevoRol, setNuevoRol] = useState<CreateRoleData>({
    nombre: '',
    descripcion: '',
    modulos: [],
    permisos: {}
  });

  // Cargar roles desde la API
  const loadRoles = useCallback(async () => {
    try {
      setLoading(true);
      logger.debug('📋 Iniciando carga de roles y módulos...');

      // Cargar roles y módulos en paralelo
      const [rolesData, modulosData] = await Promise.all([
        rolesApiService.getRolesWithModules(),
        modulosService.getModulos()
      ]);

      // Adaptar módulos inline para evitar dependencias circulares
      const modulosAdaptados = modulosData.map(modulo => ({
        ...modulo,
        id: modulo.id.toString(),
        icono: Settings,
        color: 'blue',
        descripcion: modulo.nombre
      }));

      setRoles(rolesData);
      setModulosProyecto(modulosAdaptados);
      logger.debug('✅ Roles cargados correctamente:', rolesData.length);
      logger.debug('✅ Módulos cargados correctamente:', modulosData.length);
    } catch (err) {
      logger.error('❌ Error cargando datos:', err);
      showError('Error al cargar los datos. Por favor, intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [showError]); // Eliminar adaptarModulos de las dependencias

  // Cargar roles al montar el componente
  useEffect(() => {
    loadRoles();
  }, []); // Eliminar dependencia de loadRoles para evitar ciclos infinitos

  // Filtrar roles según el término de búsqueda
  const filteredRoles = useMemo(() => {
    return roles.filter((rol) => {
      const matchSearch = rol.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rol.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchEstado = filterEstado === 'todos' ? true : filterEstado === 'activo' ? rol.estado === true : rol.estado === false;
      return matchSearch && matchEstado;
    });
  }, [roles, searchTerm, filterEstado]);

  // Calcular paginación
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedRoles = filteredRoles.slice(startIndex, startIndex + itemsPerPage);

  // Verificar si el nombre del rol ya existe (case-insensitive)
  const isNombreRolDuplicate = useMemo(() => {
    const val = nuevoRol.nombre.trim().toLowerCase();
    if (!val) return false;
    return roles.some(r => r.nombre.trim().toLowerCase() === val);
  }, [nuevoRol.nombre, roles]);

  // Validación unificada para roles
  const validateRoleData = useCallback((roleData: { nombre: string; modulos: string[] }) => {
    if (!roleData.nombre.trim()) {
      showError("El nombre del rol es obligatorio");
      return false;
    }

    const nombreDuplicado = roles.some(
      r => r.nombre.trim().toLowerCase() === roleData.nombre.trim().toLowerCase()
    );
    if (nombreDuplicado) {
      showError("Nombre duplicado", `Ya existe un rol con el nombre "${roleData.nombre.trim()}".`);
      return false;
    }

    if (!roleData.modulos || roleData.modulos.length === 0) {
      showError("Debe seleccionar al menos un módulo para este rol");
      return false;
    }

    const modulosValidos = roleData.modulos.every(id =>
      modulosProyecto.find(m => m.id === id)
    );
    if (!modulosValidos) {
      showError("Uno o más módulos seleccionados no existen");
      return false;
    }

    return true;
  }, [showError, modulosProyecto]);

  // Funciones para manejar la selección de módulos
  const toggleModulo = useCallback((moduloId: string, isEditing: boolean = false) => {
    if (isEditing) {
      setEditingRole((prev) => {
        if (!prev) return prev;
        const moduloInfo = modulosProyecto.find(m => m.id === moduloId);
        const isRolesModule = !!moduloInfo && String(moduloInfo.nombre || '').toLowerCase().includes('rol');
        const roleName = String(prev.nombre || '').toLowerCase();
        const isSuperAdminOrGerente = ['super administrador', 'gerente', 'super_admin'].includes(roleName);
        if (isSuperAdminOrGerente && isRolesModule && prev.modulos.includes(moduloId)) {
          showError('Módulo obligatorio', 'El módulo "Roles" no puede ser removido de Super Administrador o Gerente.');
          return prev;
        }
        const newModulos = prev.modulos.includes(moduloId)
          ? prev.modulos.filter((id: string) => id !== moduloId)
          : [...prev.modulos, moduloId];

        // Si se selecciona un nuevo módulo, agregar permisos por defecto
        const newPermisosPorModulo = { ...prev.permisosPorModulo };
        if (!prev.modulos.includes(moduloId) && newModulos.includes(moduloId)) {
          newPermisosPorModulo[moduloId] = {
            puedeVer: true,
            puedeCrear: false,
            puedeEditar: false,
            puedeEliminar: false
          };
        }

        return {
          ...prev,
          modulos: newModulos,
          permisosPorModulo: newPermisosPorModulo
        };
      });
    } else {
      setNuevoRol((prev) => {
        const newModulos = prev.modulos.includes(moduloId)
          ? prev.modulos.filter((id: string) => id !== moduloId)
          : [...prev.modulos, moduloId];

        // Si se selecciona un nuevo módulo, agregar todos los permisos por defecto
        const newPermisosPorModulo = { ...(prev.permisos || {}) };
        if (!prev.modulos.includes(moduloId) && newModulos.includes(moduloId)) {
          newPermisosPorModulo[moduloId] = {
            puedeVer: true,
            puedeCrear: true,
            puedeEditar: true,
            puedeEliminar: true
          };
        }

        return {
          ...prev,
          modulos: newModulos,
          permisos: newPermisosPorModulo
        };
      });
    }
  }, [modulosProyecto]);

  // Función para manejar cambios en permisos de módulos
  const togglePermiso = useCallback((moduloId: string, permisoType: keyof PermisoModulo, isEditing: boolean = false) => {
    if (isEditing) {
      setEditingRole((prev) => {
        if (!prev) return prev;

        const newPermisosPorModulo = { ...prev.permisosPorModulo };
        if (!newPermisosPorModulo[moduloId]) {
          newPermisosPorModulo[moduloId] = {
            puedeVer: true,
            puedeCrear: true,
            puedeEditar: true,
            puedeEliminar: true
          };
        }

        newPermisosPorModulo[moduloId] = {
          ...newPermisosPorModulo[moduloId],
          [permisoType]: !newPermisosPorModulo[moduloId][permisoType]
        };

        return {
          ...prev,
          permisosPorModulo: newPermisosPorModulo
        };
      });
    }
  }, []);

  const selectAllModulos = useCallback((isEditing: boolean = false) => {
    const allModulosIds = modulosProyecto.map(m => m.id);
    if (isEditing) {
      setEditingRole((prev) => ({ ...prev!, modulos: allModulosIds }));
    } else {
      setNuevoRol((prev) => ({ ...prev, modulos: allModulosIds }));
    }
  }, [modulosProyecto]);

  const deselectAllModulos = useCallback((isEditing: boolean = false) => {
    if (isEditing) {
      setEditingRole((prev) => {
        if (!prev) return prev!;
        const roleName = String(prev.nombre || '').toLowerCase();
        const isSuperAdminOrGerente = ['super administrador', 'gerente', 'super_admin'].includes(roleName);
        if (!isSuperAdminOrGerente) return { ...prev!, modulos: [] };
        const rolesModulo = modulosProyecto.find(m => String(m.nombre || '').toLowerCase().includes('rol'));
        const keepId = rolesModulo ? rolesModulo.id : undefined;
        const base = keepId ? [keepId] : [];
        return { ...prev!, modulos: base };
      });
    } else {
      setNuevoRol((prev) => ({ ...prev, modulos: [] }));
    }
  }, [modulosProyecto]);

  // Función para crear nuevo rol
  const handleCreateRole = useCallback(async () => {
    setHasTriedToSubmit(true);
    if (!validateRoleData(nuevoRol)) return;

    try {
      setIsCreating(true);
      logger.debug('➕ Creando nuevo rol con módulos:', nuevoRol.modulos);
      logger.debug('🔑 Permisos a enviar:', nuevoRol.permisos);

      const newRole = await rolesApiService.createRoleWithModules({
        nombre: nuevoRol.nombre.trim(),
        descripcion: nuevoRol.descripcion?.trim() || '',
        modulos: nuevoRol.modulos,
        permisos: nuevoRol.permisos || {}
      });

      // Validar que el rol creado tenga módulos
      if (!newRole.modulos || newRole.modulos.length === 0) {
        console.warn('⚠️ Rol creado sin módulos, recargando...');
        await loadRoles();
      } else {
        setRoles(prev => [...prev, newRole]);
        logger.debug('✅ Rol creado con permisos:', newRole.permisosPorModulo);
      }

      setNuevoRol({ nombre: '', descripcion: '', modulos: [], permisos: {} });
      setIsDialogOpen(false);
      showSuccess(`Rol "${newRole.nombre}" creado exitosamente con ${newRole.modulos.length} módulo(s)`);
      logger.debug('✅ Rol creado:', newRole);
    } catch (err) {
      logger.error('❌ Error creando rol:', err);
      showError(err instanceof Error ? err.message : 'Error al crear el rol. Por favor, intente nuevamente.');
    } finally {
      setIsCreating(false);
    }
  }, [nuevoRol, validateRoleData, loadRoles, showSuccess, showError]);

  // Función para editar rol
  const handleEditRole = useCallback(async () => {
    setHasTriedToSubmit(true);
    if (!editingRole || !validateRoleData(editingRole)) return;

    try {
      setIsEditing(true);
      logger.debug('🔧 Actualizando rol con módulos:', editingRole.modulos);
      logger.debug('🔑 Permisos a actualizar:', editingRole.permisosPorModulo);

      const updateData: UpdateRoleData = {
        nombre: editingRole.nombre.trim(),
        descripcion: editingRole.descripcion?.trim() || '',
        modulos: editingRole.modulos,
        permisos: editingRole.permisosPorModulo || {},
        estado: editingRole.estado === true
      };

      const updatedRole = await rolesApiService.updateRoleWithModules(
        parseInt(editingRole.id),
        updateData
      );

      // Validar que el rol actualizado tenga módulos
      if (!updatedRole.modulos || updatedRole.modulos.length === 0) {
        console.warn('⚠️ Rol actualizado sin módulos, recargando...');
        await loadRoles();
      } else {
        setRoles(prev => prev.map(rol =>
          rol.id === editingRole.id ? updatedRole : rol
        ));
        logger.debug('✅ Rol actualizado con permisos:', updatedRole.permisosPorModulo);
      }

      setIsEditDialogOpen(false);
      setEditingRole(null);
      showSuccess(`Rol "${updatedRole.nombre}" actualizado exitosamente`);
      logger.debug('✅ Rol actualizado:', updatedRole);

      // Recargar la página para aplicar los cambios de sesión inmediatamente
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      logger.error('❌ Error actualizando rol:', err);
      showError(err instanceof Error ? err.message : 'Error al actualizar el rol. Por favor, intente nuevamente.');
    } finally {
      setIsEditing(false);
    }
  }, [editingRole, validateRoleData, loadRoles, showSuccess, showError]);

  // Función para cambiar el estado de un rol
  const toggleRoleStatus = useCallback(async (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;

    const newStatus = !role.estado;
    if (!newStatus && role.usuariosAsignados > 0) {
      showError("No se puede desactivar el rol", "Tiene usuarios asignados activos");
      return;
    }

    try {
      const loadingToast = toast.loading("Cambiando estado...");

      // Actualizar el estado del rol
      const updateData: UpdateRoleData = {
        nombre: role.nombre,
        descripcion: role.descripcion || '',
        modulos: role.modulos,
        permisos: role.permisosPorModulo || {},
        estado: newStatus
      };

      const updatedRole = await rolesApiService.updateRoleWithModules(
        parseInt(roleId),
        updateData
      );

      // Actualizar estado localmente
      setRoles(prev =>
        prev.map(r =>
          r.id === roleId
            ? { ...r, estado: newStatus }
            : r
        )
      );

      toast.dismiss(loadingToast);

      showSuccess(
        newStatus ? "Rol activado" : "Rol desactivado",
        `El rol "${role.nombre}" ahora está ${newStatus ? "activo" : "inactivo"}`
      );

    } catch (err) {
      toast.dismiss();
      logger.error('Error cambiando estado del rol:', err);
      showError("Error", "No se pudo cambiar el estado del rol");
    }
  }, [roles, showSuccess, showError]);

  // Función para eliminar rol
  const handleDeleteRole = useCallback(async () => {
    if (roleToDelete) {
      try {
        setIsDeleting(true);
        logger.debug('🗑️ Eliminando rol...');
        await rolesApiService.deleteRole(parseInt(roleToDelete.id));
        setRoles(prev => prev.filter(rol => rol.id !== roleToDelete.id));
        showSuccess(`Rol "${roleToDelete.nombre}" eliminado exitosamente`);
        setIsDeleteDialogOpen(false);
        setRoleToDelete(null);
        logger.debug('✅ Rol eliminado correctamente.');
      } catch (err) {
        logger.error('❌ Error eliminando rol:', err);
        showError('Error al eliminar el rol. Por favor, intente nuevamente.');
      } finally {
        setIsDeleting(false);
      }
    }
  }, [roleToDelete, showSuccess, showError]);

  // Función para cargar los rolesmodulos de un rol específico
  const loadRolesModulosByRole = useCallback(async (roleId: string) => {
    try {
      logger.debug(`📋 Cargando rolesmodulos para rol ${roleId}...`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/RolesModulos/role/${roleId}?pageSize=1000`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const raw = await response.json();
      logger.debug('📋 Datos crudos de rolesmodulos API:', raw);
      // Normalizar: la API puede devolver un array directo o un objeto paginado
      let rolesModulosData: any[] = [];
      if (Array.isArray(raw)) {
        rolesModulosData = raw;
      } else if (raw && typeof raw === 'object') {
        rolesModulosData = raw.items || raw.data || raw.$values || raw.Items || raw.Data || [];
        if (!Array.isArray(rolesModulosData)) {
          const firstArr = Object.values(raw).find(v => Array.isArray(v)) as any[] | undefined;
          rolesModulosData = firstArr || [];
        }
      }
      return rolesModulosData;
    } catch (error) {
      logger.error('Error cargando rolesmodulos:', error);
      return [];
    }
  }, []);

  // Función para manejar el click en "Ver Detalles"
  const handleViewDetails = useCallback(async (rol: RoleWithModules) => {
    setSelectedRole(rol);
    setIsDetailDialogOpen(true);

    // Cargar rolesmodulos específicos del rol
    const rolesModulosData = await loadRolesModulosByRole(rol.id);
    logger.debug('📋 rolesModulosData normalizado:', rolesModulosData);

    // Actualizar el rol seleccionado con los datos de rolesmodulos
    setSelectedRole(prev => ({
      ...prev!,
      rolesModulos: rolesModulosData
    }));
  }, [loadRolesModulosByRole]);

  const getModuloInfo = useCallback((moduloId: string) => {
    return modulosProyecto.find(m => m.id === moduloId);
  }, [modulosProyecto]);

  // Componente para mostrar la selección de módulos con permisos granulares
  const ModuleSelector = useCallback(({
    modulos,
    onToggle,
    onTogglePermiso,
    isEditing = false,
    showSelectAll = true,
    showPermisos = false,
    permisos = {}
  }: {
    modulos: string[];
    onToggle: (id: string, isEdit: boolean) => void;
    onTogglePermiso?: (id: string, permisoType: keyof PermisoModulo, isEdit: boolean) => void;
    isEditing?: boolean;
    showSelectAll?: boolean;
    showPermisos?: boolean;
    permisos?: Record<string, PermisoModulo>;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-white-primary flex items-center gap-2">
          <Settings className="w-4 h-4 text-orange-primary" />
          Acceso a Módulos del Sistema*
        </Label>
        <div className="text-sm text-gray-lightest">
          Seleccionados: {modulos.length} de {modulosProyecto.length}
        </div>
      </div>

      {showSelectAll && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => selectAllModulos(isEditing)}
            className="text-xs px-3 py-1 bg-orange-primary/20 border border-orange-primary/30 rounded-lg text-orange-primary hover:bg-orange-primary/30 transition-colors"
          >
            Seleccionar Todos
          </button>
          <button
            type="button"
            onClick={() => deselectAllModulos(isEditing)}
            className="text-xs px-3 py-1 bg-gray-medium text-gray-lightest rounded-lg hover:bg-gray-light transition-colors"
          >
            Deseleccionar Todos
          </button>
        </div>
      )}

      <div className="p-4 bg-gray-darker rounded-lg space-y-3" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <div className="grid grid-cols-1 gap-3">
          {modulosProyecto.map((modulo) => {
            const IconComponent = modulo.icono;
            const isSelected = modulos.includes(modulo.id);
            const moduloPermisos = permisos[modulo.id];

            return (
              <div
                key={modulo.id}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
                  ? 'border-orange-primary bg-orange-primary/20 shadow-md'
                  : 'border-gray-dark bg-gray-darkest hover:border-gray-medium hover:bg-gray-dark'
                  }`}
                onClick={() => onToggle(modulo.id, isEditing)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-orange-primary/30' : 'bg-gray-medium'
                    }`}>
                    <IconComponent className={`w-5 h-5 ${isSelected ? 'text-orange-primary' : modulo.color
                      }`} />
                  </div>

                  <div className="flex-1">
                    <h4 className="font-semibold text-white-primary text-sm flex items-center gap-2">
                      {modulo.nombre}
                      {isSelected && (
                        <Check className="w-4 h-4 text-orange-primary" />
                      )}
                    </h4>
                    <p className="text-xs text-gray-lightest mt-1">{modulo.descripcion}</p>

                    {showPermisos && isSelected && moduloPermisos && (
                      <div className="mt-2 p-2 bg-gray-darkest rounded text-xs">
                        <div className="grid grid-cols-2 gap-1">
                          <label className="flex items-center gap-1 text-gray-lightest" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={moduloPermisos.puedeVer}
                              onChange={() => onTogglePermiso && onTogglePermiso(modulo.id, 'puedeVer', isEditing)}
                              className="rounded"
                            />
                            <span>Ver</span>
                          </label>
                          <label className="flex items-center gap-1 text-gray-lightest" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={moduloPermisos.puedeCrear}
                              onChange={() => onTogglePermiso && onTogglePermiso(modulo.id, 'puedeCrear', isEditing)}
                              className="rounded"
                            />
                            <span>Crear</span>
                          </label>
                          <label className="flex items-center gap-1 text-gray-lightest" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={moduloPermisos.puedeEditar}
                              onChange={() => onTogglePermiso && onTogglePermiso(modulo.id, 'puedeEditar', isEditing)}
                              className="rounded"
                            />
                            <span>Editar</span>
                          </label>
                          <label className="flex items-center gap-1 text-gray-lightest" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={moduloPermisos.puedeEliminar}
                              onChange={() => onTogglePermiso && onTogglePermiso(modulo.id, 'puedeEliminar', isEditing)}
                              className="rounded"
                            />
                            <span>Eliminar</span>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected
                    ? 'border-orange-primary bg-orange-primary'
                    : 'border-gray-medium'
                    }`}>
                    {isSelected && <Check className="w-3 h-3 text-black-primary" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  ), [selectAllModulos, deselectAllModulos, modulosProyecto]);

  return (
    <div className="w-full bg-black-primary text-white-primary h-full overflow-y-auto">
      <AlertContainer />

      <div>
        <div className="std-card">

          {/* Barra de Controles */}
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <button
                className="btn-std-primary disabled:opacity-50"
                onClick={() => {
                  setNuevoRol({ nombre: '', descripcion: '', modulos: [] });
                  setHasTriedToSubmit(false);
                  setIsDialogOpen(true);
                }}
                disabled={isCreating || isEditing || isDeleting}
              >
                {isCreating || isEditing || isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Nuevo Rol
              </button>
            )}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Buscar roles..."
            statusFilter={{
              value: filterEstado,
              onChange: (val) => {
                setFilterEstado(val as 'todos' | 'activo' | 'inactivo');
                setCurrentPage(1);
              },
              options: [
                { value: 'todos', label: 'Todos' },
                { value: 'activo', label: 'Activos' },
                { value: 'inactivo', label: 'Inactivos' },
              ],
            }}
            recordsText={`Mostrando ${displayedRoles.length} de ${filteredRoles.length} roles`}
            recordsPlacement="right"
          />

          {/* Tabla de Roles */}
          <div className="std-table-wrapper">
            <table className="std-table">
                <thead className={loading && roles.length === 0 ? "std-thead [&_th]:!text-transparent [&_th]:select-none" : "std-thead"}>
                  <tr className="border-b border-gray-dark">
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">ID</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Rol</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Usuarios</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Módulos</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Estado</th>
                    <th className="text-center py-3 px-4 text-gray-lightest font-normal text-sm">Acciones</th>
                  </tr>
                </thead>
                <tbody className="std-tbody">
                  {loading && roles.length === 0 ? (
                    <TableLoadingStateRow
                      colSpan={5}
                      title="Cargando roles..."
                    />
                  ) : displayedRoles.map((rol) => (
                    <tr key={rol.id} className="border-b border-gray-dark hover:bg-gray-darker transition-colors">
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter text-sm">{rol.id}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{rol.nombre}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{rol.usuariosAsignados}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-gray-lighter">{rol.modulos.length}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`std-badge ${rol.estado === true ? 'std-badge-positive' : 'std-badge-neutral'}`}>
                          {rol.estado === true ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleRoleStatus(rol.id)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title={rol.estado ? (rol.usuariosAsignados > 0 ? "No se puede desactivar con usuarios asignados" : "Desactivar rol") : "Activar rol"}
                            disabled={isCreating || isEditing || isDeleting}
                          >
                            {rol.estado ? (
                              <ToggleRight className="w-4 h-4 text-gray-lightest group-hover:text-green-400" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                            )}
                          </button>
                          <button
                            onClick={() => handleViewDetails(rol)}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                            title="Ver Detalle"
                            disabled={isCreating || isEditing || isDeleting}
                          >
                            <Eye className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary" />
                          </button>
                          <button
                            onClick={async () => {
                              setHasTriedToSubmit(false);
                              // Cargar rolesmodulos específicos del rol antes de editar
                              const rolesModulosData = await loadRolesModulosByRole(rol.id);

                              // Construir mapa de permisos y lista de módulos
                              const permisosMap: Record<string, any> = {};
                              const modulosIds: string[] = [];

                              rolesModulosData.forEach((rm: any) => {
                                const modId = String(rm.moduloId ?? rm.ModuloId);
                                modulosIds.push(modId);
                                permisosMap[modId] = {
                                  puedeVer: rm.puedeVer ?? rm.PuedeVer,
                                  puedeCrear: rm.puedeCrear ?? rm.PuedeCrear,
                                  puedeEditar: rm.puedeEditar ?? rm.PuedeEditar,
                                  puedeEliminar: rm.puedeEliminar ?? rm.PuedeEliminar
                                };
                              });

                              // Preparar el rol para edición con los datos frescos
                              const rolParaEditar = {
                                ...rol,
                                modulos: modulosIds,
                                permisosPorModulo: permisosMap
                              };

                              setEditingRole(rolParaEditar);
                              setIsEditDialogOpen(true);
                            }}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={!rol.estado ? "Rol inactivo (solo historial)" : "Editar"}
                            disabled={!rol.estado || isCreating || isEditing || isDeleting}
                          >
                            <Edit className="w-4 h-4 text-gray-lightest group-hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => {
                              if (rol.usuariosAsignados > 0) {
                                showError("Este rol no se puede eliminar porque tiene usuarios activos");
                                return;
                              }
                              setRoleToDelete(rol);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="p-2 hover:bg-gray-darker rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title={!rol.estado ? "Rol inactivo (solo historial)" : "Eliminar"}
                            disabled={!rol.estado || isCreating || isEditing || isDeleting}
                          >
                            <Trash2 className="w-4 h-4 text-gray-lightest group-hover:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {/* Paginación */}
          {totalPages >= 1 && (
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
          )}
        </div>
        {/* Dialog de Creación */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="text-white-primary">Crear Nuevo Rol</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Define el nombre, descripción y módulos de acceso para el nuevo rol
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-orange-primary" />
                    Nombre del Rol *
                  </Label>
                  <NameInput
                    value={nuevoRol.nombre}
                    onChange={(val) => setNuevoRol({ ...nuevoRol, nombre: val })}
                    placeholder="Ej: Content Manager"
                    className={`elegante-input w-full ${hasTriedToSubmit && !nuevoRol.nombre.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  {hasTriedToSubmit && !nuevoRol.nombre.trim() && (
                    <p className="text-xs text-red-500 mt-1">Este campo es obligatorio.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-white-primary flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-primary" />
                    Descripción
                  </Label>
                  <Input
                    value={nuevoRol.descripcion}
                    onChange={(e) => setNuevoRol({ ...nuevoRol, descripcion: e.target.value })}
                    placeholder="Descripción del rol..."
                    className="elegante-input w-full"
                  />
                </div>
              </div>

              <ModuleSelector
                modulos={nuevoRol.modulos}
                onToggle={toggleModulo}
                isEditing={false}
                showPermisos={false}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateRole}
                className="elegante-button-primary disabled:opacity-50"
                disabled={isCreating}
              >
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isCreating ? 'Creando...' : 'Crear Rol'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Detalles */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-2xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="text-white-primary">Detalles del Rol</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Información completa del rol seleccionado
              </DialogDescription>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-lightest">Nombre</Label>
                    <p className="font-semibold text-white-primary">{selectedRole.nombre}</p>
                  </div>
                  <div>
                    <Label className="text-gray-lightest">Fecha de Creación</Label>
                    <p className="text-white-primary">{selectedRole.fechaCreacion}</p>
                  </div>
                  <div>
                    <Label className="text-gray-lightest">Usuarios Asignados</Label>
                    <p className="text-orange-primary font-semibold">{selectedRole.usuariosAsignados}</p>
                  </div>
                  <div>
                    <Label className="text-gray-lightest">Estado</Label>
                    <span className={`std-badge ${selectedRole.estado === true ? 'std-badge-positive' : 'std-badge-neutral'}`}>
                      {selectedRole.estado === true ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-lightest">Descripción</Label>
                  <p className="text-white-primary text-sm mt-1 p-3 bg-gray-darker rounded-lg">
                    {selectedRole.descripcion || "Sin descripción"}
                  </p>
                </div>

                <div>
                  <Label className="text-gray-lightest">Módulos con Acceso ({selectedRole.rolesModulos?.length || selectedRole.modulos?.length || 0})</Label>
                  <div className="mt-2 space-y-2">
                    {selectedRole.rolesModulos && selectedRole.rolesModulos.length > 0 ? (
                      selectedRole.rolesModulos.map((rolModulo: any) => {
                        const moduloId = String(rolModulo.moduloId ?? rolModulo.ModuloId);
                        const modulo = getModuloInfo(moduloId);

                        const IconComponent = modulo?.icono || Settings;
                        const moduloNombre = modulo?.nombre || rolModulo.modulo?.nombre || `Módulo ${moduloId}`;
                        const moduloDesc = modulo?.descripcion || rolModulo.modulo?.descripcion || '';

                        return (
                          <div key={moduloId} className="flex items-center gap-3 p-3 bg-gray-darker rounded-lg">
                            <IconComponent className={`w-4 h-4 ${modulo?.color || 'text-gray-lighter'}`} />
                            <div className="flex-1">
                              <p className="text-white-primary font-medium text-sm">{moduloNombre}</p>
                              {moduloDesc && <p className="text-gray-lightest text-xs">{moduloDesc}</p>}
                              <div className="mt-1 text-xs text-gray-lightest">
                                <span className="text-orange-primary">
                                  Permisos: {(rolModulo.puedeVer ?? rolModulo.PuedeVer) ? '✓' : '✗'} Ver,{' '}
                                  {(rolModulo.puedeCrear ?? rolModulo.PuedeCrear) ? '✓' : '✗'} Crear,{' '}
                                  {(rolModulo.puedeEditar ?? rolModulo.PuedeEditar) ? '✓' : '✗'} Editar,{' '}
                                  {(rolModulo.puedeEliminar ?? rolModulo.PuedeEliminar) ? '✓' : '✗'} Eliminar
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 bg-gray-darker rounded-lg text-center">
                        <p className="text-gray-lightest text-sm">Cargando módulos...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de Edición */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-gray-darkest border-gray-dark max-w-4xl" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <DialogHeader>
              <DialogTitle className="text-white-primary">Editar Rol</DialogTitle>
              <DialogDescription className="text-gray-lightest">
                Modifica los datos y módulos de acceso del rol
              </DialogDescription>
            </DialogHeader>
            {editingRole && (
              <div className="space-y-6 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-white-primary">Nombre del Rol *</Label>
                    <NameInput
                      value={editingRole.nombre}
                      onChange={(val) => setEditingRole({ ...editingRole, nombre: val })}
                      className={`elegante-input w-full ${hasTriedToSubmit && !editingRole.nombre.trim() ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                    />
                    {hasTriedToSubmit && !editingRole.nombre.trim() && (
                      <p className="text-xs text-red-500 mt-1">Este campo es obligatorio.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white-primary">Descripción</Label>
                    <Input
                      value={editingRole.descripcion}
                      onChange={(e) => setEditingRole({ ...editingRole, descripcion: e.target.value })}
                      className="elegante-input"
                    />
                  </div>
                </div>

                <ModuleSelector
                  modulos={editingRole.modulos}
                  onToggle={toggleModulo}
                  onTogglePermiso={togglePermiso}
                  isEditing={true}
                  showPermisos={false} // Ocultar permisos granulares
                  permisos={editingRole.permisosPorModulo || {}}
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-dark">
              <button
                onClick={() => setIsEditDialogOpen(false)}
                className="elegante-button-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditRole}
                className="elegante-button-primary"
                disabled={isEditing}
              >
                {isEditing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isEditing ? 'Actualizando...' : 'Actualizar Rol'}
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog de Eliminación */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="bg-gray-darkest border-gray-dark">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white-primary">¿Eliminar Rol?</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-lightest">
                ¿Estás seguro de que deseas eliminar el rol "{roleToDelete?.nombre}"? Esta acción no se puede deshacer y afectará a {roleToDelete?.usuariosAsignados} usuario(s) asignado(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="elegante-button-secondary">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRole}
                className="bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

