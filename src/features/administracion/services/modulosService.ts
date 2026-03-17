const API_BASE_URL = '/api';
import { auth } from "../../../shared/services/firebase";

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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {

    const url = `${API_BASE_URL}${endpoint}`;

    let token = localStorage.getItem('authToken');
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    console.log(`➡️ Request: ${url}`);

    const response = await fetch(url, config);

    console.log(`⬅️ Status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // DELETE puede no devolver contenido
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  /* =======================
     GET ALL
  ======================= */

  async getModulos(): Promise<Modulo[]> {
    const raw = await this.request<any>('/Modulos');
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
    const raw = await this.request<any>(`/Modulos/${id}`);
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

  async createModulo(moduloData: Partial<Modulo>): Promise<Modulo> {
    return this.request<Modulo>('/Modulos', {
      method: 'POST',
      body: JSON.stringify(moduloData),
    });
  }

  /* =======================
     UPDATE
  ======================= */

  async updateModulo(
    id: number,
    moduloData: Partial<Modulo>
  ): Promise<Modulo> {
    return this.request<Modulo>(`/Modulos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(moduloData),
    });
  }

  /* =======================
     DELETE
  ======================= */

  async deleteModulo(id: number): Promise<void> {
    await this.request<void>(`/Modulos/${id}`, {
      method: 'DELETE',
    });
  }
}

/* =======================
   EXPORT
======================= */

export const modulosService = new ModulosService();
