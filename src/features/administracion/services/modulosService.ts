import { httpClient } from '../../../shared/services/httpClient';

/* =======================
   INTERFACE
======================= */

export interface Modulo {
  id: number;
  nombre: string;
  estado: boolean;
  rolesModulos?: any[];
}

/* =======================
   SERVICE
======================= */

class ModulosService {

  /* =======================
     GET ALL
  ======================= */

  /**
   * Obtiene TODOS los módulos en una sola llamada.
   * La API permite pageSize hasta 1000.
   */
  async getModulos(q?: string): Promise<Modulo[]> {
    const params = new URLSearchParams();
    params.append('page', '1');
    params.append('pageSize', '1000');
    if (q) params.append('q', q);

    const raw = await httpClient.get<any>(`/Modulos?${params.toString()}`);
    let items: any[] = [];
    if (Array.isArray(raw)) {
      items = raw;
    } else if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.items)) items = raw.items;
      else if (Array.isArray(raw.data)) items = raw.data;
      else if (Array.isArray(raw.$values)) items = raw.$values;
    }
    return items.map((m: any) => ({
      id: Number(m.id ?? m.Id ?? m.moduloId ?? m.ModuloId ?? 0),
      nombre: String(m.nombre ?? m.Nombre ?? ''),
      estado: Boolean(m.estado === true || m.Estado === true || m.activo === true || m.Activo === true),
      rolesModulos: m.rolesModulos ?? m.RolesModulos
    }));
  }

  /* =======================
     GET BY ID
  ======================= */

  async getModuloById(id: number): Promise<Modulo> {
    const raw = await httpClient.get<any>(`/Modulos/${id}`);
    return {
      id: Number(raw.id ?? raw.Id ?? id),
      nombre: String(raw.nombre ?? raw.Nombre ?? ''),
      estado: Boolean(raw.estado === true || raw.Estado === true || raw.activo === true || raw.Activo === true),
      rolesModulos: raw.rolesModulos ?? raw.RolesModulos
    };
  }

  /* =======================
     CREATE
  ======================= */

  async createModulo(data: Partial<Modulo>): Promise<Modulo> {
    const apiData = {
      Nombre: data.nombre,
      Estado: data.estado ?? true
    };
    return httpClient.post('/Modulos', apiData);
  }

  /* =======================
     UPDATE
  ======================= */

  async updateModulo(id: number, data: Partial<Modulo>): Promise<Modulo> {
    const apiData = {
      Id: id,
      Nombre: data.nombre,
      Estado: data.estado
    };
    return httpClient.put(`/Modulos/${id}`, apiData);
  }

  /* =======================
     DELETE
  ======================= */

  async deleteModulo(id: number): Promise<void> {
    await httpClient.delete(`/Modulos/${id}`);
  }
}

export const modulosService = new ModulosService();
export default modulosService;
