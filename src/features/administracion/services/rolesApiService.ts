const API_BASE_URL = '/api';
import { auth } from "../../../shared/services/firebase";

// Tipos para RolesModulos (Permisos Granulares) - Basado en estructura del backend
export interface PermisoModulo {
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

// Estructura de la tabla intermedia RolesModulos
export interface RolesModulos {
  id: number;
  rolId: number;
  moduloId: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  modulo?: {
    id: string;
    nombre: string;
    descripcion: string;
  };
}

// Estructura de la entidad Modulo
export interface Modulo {
  id: string;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

// Estructura de la entidad Role
export interface Role {
  id: string;
  nombre: string;
  descripcion?: string; // Renombrado de observaciones para consistencia
  estado: boolean; // boolean en backend, no string
  fechaCreacion: string;
  usuariosAsignados?: number;
}

export interface ModuloAcceso {
  id: string;
  nombre: string;
  descripcion: string;
  icono: any;
  color: string;
}

export interface RoleWithModules {
  id: string;
  nombre: string;
  descripcion?: string;
  estado: boolean; // boolean para consistencia con backend
  modulos: string[]; // Array de IDs de módulos
  usuariosAsignados: number;
  fechaCreacion: string;
  rolesModulos?: RolesModulos[]; // Relación raw de la API
  permisosPorModulo?: Record<string, PermisoModulo>; // Permisos por módulo
}

export interface CreateRoleData {
  nombre: string;
  descripcion?: string;
  modulos: string[];
  permisos?: Record<string, PermisoModulo>; // Permisos granulares
}

export interface UpdateRoleData extends CreateRoleData {
  estado: boolean;
  permisos?: Record<string, PermisoModulo>;
}

// ==================== SERVICIO ADAPTER ====================

class RolesApiService {
  private async getHeadersWithFirebaseAuth(): Promise<Record<string, string>> {
    let token = localStorage.getItem('authToken');
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  /**
   * Normaliza la respuesta de la API convirtiendo rolesModulos a array de IDs y extrae permisos
   */
  private normalizeRole(apiRole: any): RoleWithModules {
    let moduloIds: string[] = [];
    let permisosPorModulo: Record<string, PermisoModulo> = {};

    // Si viene del array rolesModulos, extraer los IDs y permisos
    const rolesModulosRaw = apiRole.rolesModulos || apiRole.RolesModulos || apiRole.roles_modulos;
    if (rolesModulosRaw && Array.isArray(rolesModulosRaw)) {
      moduloIds = rolesModulosRaw.map((rm: RolesModulos) => String((rm as any).moduloId ?? (rm as any).ModuloId));

      // Mapear permisos por módulo
      rolesModulosRaw.forEach((rm: RolesModulos | any) => {
        const key = String((rm.moduloId ?? rm.ModuloId));
        permisosPorModulo[key] = {
          puedeVer: !!(rm.puedeVer ?? rm.PuedeVer),
          puedeCrear: !!(rm.puedeCrear ?? rm.PuedeCrear),
          puedeEditar: !!(rm.puedeEditar ?? rm.PuedeEditar),
          puedeEliminar: !!(rm.puedeEliminar ?? rm.PuedeEliminar)
        };
      });
    }
    // Si ya viene como array de números (desde el nuevo RoleDto), convertir a strings
    else if (Array.isArray(apiRole.modulos || apiRole.Modulos)) {
      const arr = apiRole.modulos || apiRole.Modulos;
      moduloIds = arr.map((id: any) => String(id));
      
      // Si no hay rolesModulos detallados, al menos inicializamos el objeto de permisos si existen en el objeto
      if (apiRole.permisosPorModulo || apiRole.PermisosPorModulo) {
        permisosPorModulo = apiRole.permisosPorModulo || apiRole.PermisosPorModulo;
      }
    }

    return {
      id: String(apiRole.id ?? apiRole.Id ?? ''),
      nombre: (apiRole.nombre ?? apiRole.Nombre ?? '').toString(),
      descripcion: (apiRole.descripcion ?? apiRole.Descripcion ?? '').toString().trim(),
      estado: !!(apiRole.estado === true || apiRole.Estado === true || apiRole.activo === true || apiRole.Activo === true),
      modulos: moduloIds,
      usuariosAsignados: apiRole.usuariosAsignados ?? apiRole.UsuariosAsignados ?? 0,
      fechaCreacion: apiRole.fechaCreacion ?? apiRole.FechaCreacion ?? new Date().toISOString(),
      rolesModulos: rolesModulosRaw,
      permisosPorModulo
    };
  }

  /**
   * Obtiene todos los roles con sus módulos de forma eficiente
   */
  async getRolesWithModules(): Promise<RoleWithModules[]> {
    try {
      console.time('🚀 Fetch Roles');
      const headers = await this.getHeadersWithFirebaseAuth();
      const response = await fetch(`${API_BASE_URL}/Roles`, { headers });
      
      if (!response.ok) throw new Error(`Error roles: ${response.status}`);

      const rolesRaw = await response.json() as any;
      let roles: any[] = [];
      if (Array.isArray(rolesRaw)) {
        roles = rolesRaw;
      } else if (rolesRaw && typeof rolesRaw === 'object') {
        if (Array.isArray(rolesRaw.items)) roles = rolesRaw.items;
        else if (Array.isArray(rolesRaw.data)) roles = rolesRaw.data;
        else if (Array.isArray(rolesRaw.$values)) roles = rolesRaw.$values;
        else if (Array.isArray(rolesRaw.Items)) roles = rolesRaw.Items;
        else if (Array.isArray(rolesRaw.Data)) roles = rolesRaw.Data;
        else if (Array.isArray((rolesRaw.result))) roles = rolesRaw.result;
        else if (Array.isArray((rolesRaw.results))) roles = rolesRaw.results;
        else {
          const firstArray = Object.values(rolesRaw).find(v => Array.isArray(v)) as any[] | undefined;
          roles = firstArray || [];
        }
      }

      // Normalizar cada rol (ahora mucho más rápido ya que el backend trae los conteos y IDs)
      const normalizedRoles = roles.map((role: any) => this.normalizeRole(role));

      console.timeEnd('🚀 Fetch Roles');
      console.log('✅ Roles procesados:', normalizedRoles.length);
      return normalizedRoles;
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw error;
    }
  }

  /**
   * Obtiene un rol específico con sus módulos y permisos
   */
  async getRoleById(roleId: number): Promise<RoleWithModules> {
    try {
      const headers = await this.getHeadersWithFirebaseAuth();
      const response = await fetch(`${API_BASE_URL}/Roles/${roleId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return this.normalizeRole(data);
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo rol con sus módulos y permisos
   */
  async createRoleWithModules(roleData: CreateRoleData): Promise<RoleWithModules> {
    try {
      if (!roleData.nombre?.trim()) {
        throw new Error('El nombre del rol es requerido');
      }
      /*
      if (!roleData.modulos || roleData.modulos.length === 0) {
        throw new Error('Debe seleccionar al menos un módulo');
      }
      */

      // Preparar payload - Crear el rol primero
      const rolePayload = {
        Nombre: roleData.nombre.trim(),
        Descripcion: roleData.descripcion?.trim() || '',
        Estado: true
      };

      const headers = await this.getHeadersWithFirebaseAuth();
      const roleResponse = await fetch(`${API_BASE_URL}/Roles`, {
        method: 'POST',
        headers,
        body: JSON.stringify(rolePayload),
      });

      if (!roleResponse.ok) {
        const error = await roleResponse.json();
        throw new Error(error.message || `Error: ${roleResponse.status}`);
      }

      const createdRole = await roleResponse.json();
      console.log('✅ Rol base creado:', createdRole);
      const roleId = createdRole.id; // Puede ser id o Id dependiendo del backend

      // Asignar módulos con los permisos enviados desde el frontend
      for (const moduloIdStr of roleData.modulos) {
        const moduloId = parseInt(moduloIdStr, 10); // Asegurar que sea número
        const permisosDelModulo = roleData.permisos?.[moduloIdStr] || {
          puedeVer: true,
          puedeCrear: true,
          puedeEditar: true,
          puedeEliminar: true
        };

        const rolesModulosPayload = {
          Id: 0,
          RolId: typeof roleId === 'string' ? parseInt(roleId, 10) : roleId,
          ModuloId: moduloId,
          PuedeVer: permisosDelModulo.puedeVer,
          PuedeCrear: permisosDelModulo.puedeCrear,
          PuedeEditar: permisosDelModulo.puedeEditar,
          PuedeEliminar: permisosDelModulo.puedeEliminar
        };

        console.log(`📤 Enviando asignación módulo ${moduloId}:`, rolesModulosPayload);

        const response = await fetch(`${API_BASE_URL}/RolesModulos`, {
          method: 'POST',
          headers,
          body: JSON.stringify(rolesModulosPayload),
        });

        if (!response.ok) {
          console.error(`❌ Error asignando módulo ${moduloId}. Status: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Body:', errorText);
        } else {
          console.log(`✅ Módulo ${moduloId} asignado correctamente`);
        }
      }

      // Obtener el rol completo con módulos
      return this.getRoleById(roleId);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error;
    }
  }

  /**
   * Actualiza un rol existente
   */
  async updateRoleWithModules(roleId: number, roleData: UpdateRoleData): Promise<RoleWithModules> {
    try {
      if (!roleData.nombre?.trim()) {
        throw new Error('El nombre del rol es requerido');
      }
      /*
      if (!roleData.modulos || roleData.modulos.length === 0) {
        throw new Error('Debe seleccionar al menos un módulo');
      }
      */

      // Actualizar datos básicos del rol
      const updatePayload = {
        Id: roleId,
        Nombre: roleData.nombre.trim(),
        Descripcion: roleData.descripcion?.trim() || '',
        Estado: roleData.estado
      };

      const headers = await this.getHeadersWithFirebaseAuth();
      const updateResponse = await fetch(`${API_BASE_URL}/Roles/${roleId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || `Error: ${updateResponse.status}`);
      }

      const currentAssignments = await this.getRoleModules(roleId);
      const currentModulos = currentAssignments.map(rm => String((rm as any).moduloId));

      // Módulos a eliminar
      const modulosToDelete = currentModulos.filter(m => !roleData.modulos.includes(m));

      // Módulos a agregar
      const modulosToAdd = roleData.modulos.filter(m => !currentModulos.includes(m));

      // Eliminar módulos no seleccionados
      for (const moduloId of modulosToDelete) {
        const rolesModulo = currentAssignments.find(rm => String((rm as any).moduloId) === String(moduloId));
        if (rolesModulo && (rolesModulo as any).id != null) {
          await fetch(`${API_BASE_URL}/RolesModulos/${(rolesModulo as any).id}`, {
            method: 'DELETE',
            headers,
          });
        }
      }

      // Agregar nuevos módulos
      const permisosDefault: PermisoModulo = {
        puedeVer: true,
        puedeCrear: false,
        puedeEditar: false,
        puedeEliminar: false
      };

      for (const moduloId of modulosToAdd) {
        const moduloIdInt = parseInt(moduloId, 10);
        const rolesModulosPayload = {
          Id: 0,
          RolId: typeof roleId === 'string' ? parseInt(roleId, 10) : roleId,
          ModuloId: moduloIdInt,
          PuedeVer: permisosDefault.puedeVer,
          PuedeCrear: permisosDefault.puedeCrear,
          PuedeEditar: permisosDefault.puedeEditar,
          PuedeEliminar: permisosDefault.puedeEliminar
        };

        const response = await fetch(`${API_BASE_URL}/RolesModulos`, {
          method: 'POST',
          headers,
          body: JSON.stringify(rolesModulosPayload),
        });

        if (!response.ok) {
          console.error(`❌ Error asignando módulo ${moduloId}:`, await response.text());
        }
      }

      // Actualizar permisos si se proporcionan
      if (roleData.permisos) {
        for (const [moduloId, permisos] of Object.entries(roleData.permisos)) {
          const rolesModulo = currentAssignments.find(rm => String((rm as any).moduloId) === String(moduloId));
          if (rolesModulo && (rolesModulo as any).id != null) {
            const response = await fetch(`${API_BASE_URL}/RolesModulos/${(rolesModulo as any).id}`, {
              method: 'PUT',
              headers,
              body: JSON.stringify({
                Id: (rolesModulo as any).id,
                RolId: typeof roleId === 'string' ? parseInt(roleId, 10) : roleId,
                ModuloId: typeof moduloId === 'string' ? parseInt(moduloId, 10) : moduloId,
                PuedeVer: permisos.puedeVer,
                PuedeCrear: permisos.puedeCrear,
                PuedeEditar: permisos.puedeEditar,
                PuedeEliminar: permisos.puedeEliminar
              }),
            });

            if (!response.ok) {
              console.error(`❌ Error actualizando permisos módulo ${moduloId}:`, await response.text());
            }
          }
        }
      }

      const updatedBase = await this.getRoleById(roleId);
      const updatedAssignments = await this.getRoleModules(roleId);
      const moduloIds = updatedAssignments.map(rm => String((rm as any).moduloId));
      const permisosPorModulo: Record<string, PermisoModulo> = {};
      updatedAssignments.forEach((rm: any) => {
        const key = String(rm.moduloId);
        permisosPorModulo[key] = {
          puedeVer: !!rm.puedeVer,
          puedeCrear: !!rm.puedeCrear,
          puedeEditar: !!rm.puedeEditar,
          puedeEliminar: !!rm.puedeEliminar
        };
      });
      return {
        ...updatedBase,
        modulos: moduloIds,
        rolesModulos: updatedAssignments as any,
        permisosPorModulo
      };
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }

  /**
   * Elimina un rol (soft delete)
   */
  async deleteRole(roleId: number): Promise<void> {
    try {
      const headers = await this.getHeadersWithFirebaseAuth();
      const response = await fetch(`${API_BASE_URL}/Roles/${roleId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Error: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }

  /**
   * Obtiene los módulos de un rol específico
   */
  async getRoleModules(roleId: number): Promise<RolesModulos[]> {
    try {
      const headers = await this.getHeadersWithFirebaseAuth();
      const response = await fetch(`${API_BASE_URL}/RolesModulos/role/${roleId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    } catch (error) {
      console.error('Error fetching role modules:', error);
      throw error;
    }
  }
};

export const rolesApiService = new RolesApiService();
