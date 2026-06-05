import { httpClient } from '../../../shared/services/httpClient';

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
  /**
   * Normaliza la respuesta de la API convirtiendo rolesModulos a array de IDs y extrae permisos
   */
  private normalizeRole(apiRole: any): RoleWithModules {
    let moduloIds: string[] = [];
    let permisosPorModulo: Record<string, PermisoModulo> = {};

    // Si viene del array rolesModulos, extraer los IDs y permisos
    const rolesModulosRaw = apiRole.rolesModulos || apiRole.RolesModulos || apiRole.roles_modulos;
    
    if (Array.isArray(rolesModulosRaw)) {
      moduloIds = rolesModulosRaw.map(rm => String(rm.moduloId || rm.ModuloId || ''));
      
      rolesModulosRaw.forEach(rm => {
        const modId = String(rm.moduloId || rm.ModuloId || '');
        if (modId) {
          permisosPorModulo[modId] = {
            puedeVer: rm.puedeVer ?? rm.PuedeVer ?? false,
            puedeCrear: rm.puedeCrear ?? rm.PuedeCrear ?? false,
            puedeEditar: rm.puedeEditar ?? rm.PuedeEditar ?? false,
            puedeEliminar: rm.puedeEliminar ?? rm.PuedeEliminar ?? false
          };
        }
      });
    }

    return {
      id: String(apiRole.id || apiRole.Id || ''),
      nombre: apiRole.nombre || apiRole.Nombre || 'Sin nombre',
      descripcion: apiRole.descripcion || apiRole.Descripcion || '',
      estado: Boolean(apiRole.estado ?? apiRole.Estado ?? true),
      modulos: moduloIds,
      usuariosAsignados: Number(apiRole.usuariosAsignados || apiRole.UsuariosAsignados || 0),
      fechaCreacion: apiRole.fechaCreacion || apiRole.FechaCreacion || new Date().toISOString(),
      rolesModulos: rolesModulosRaw,
      permisosPorModulo
    };
  }

  async getRoles(): Promise<RoleWithModules[]> {
    const data = await httpClient.get('/Roles');
    const items = Array.isArray(data) ? data : (data.items || data.$values || []);
    return items.map((r: any) => this.normalizeRole(r));
  }

  async getRoleById(id: string | number): Promise<RoleWithModules> {
    const data = await httpClient.get(`/Roles/${id}`);
    return this.normalizeRole(data);
  }

  async createRole(data: CreateRoleData): Promise<RoleWithModules> {
    // Mapeo a PascalCase para el backend
    const apiData = {
      Nombre: data.nombre,
      Descripcion: data.descripcion || '',
      Modulos: data.modulos,
      Permisos: data.permisos || {}
    };

    const result = await httpClient.post('/Roles', apiData);
    return this.normalizeRole(result);
  }

  async updateRole(id: string | number, data: UpdateRoleData): Promise<RoleWithModules> {
    const apiData = {
      Id: id,
      Nombre: data.nombre,
      Descripcion: data.descripcion || '',
      Estado: data.estado,
      Modulos: data.modulos,
      Permisos: data.permisos || {}
    };

    const result = await httpClient.put(`/Roles/${id}`, apiData);
    return this.normalizeRole(result);
  }

  async deleteRole(id: string | number): Promise<void> {
    await httpClient.delete(`/Roles/${id}`);
  }

  // Aliases for compatibility
  async getRolesWithModules(): Promise<RoleWithModules[]> {
    return this.getRoles();
  }

  async createRoleWithModules(data: CreateRoleData): Promise<RoleWithModules> {
    return this.createRole(data);
  }

  async updateRoleWithModules(id: string | number, data: UpdateRoleData): Promise<RoleWithModules> {
    return this.updateRole(id, data);
  }

  async getRoleModules(id: string | number): Promise<RolesModulos[]> {
    const role = await this.getRoleById(id);
    return role.rolesModulos || [];
  }
}

export const rolesApiService = new RolesApiService();
export default rolesApiService;
