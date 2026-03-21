import { auth } from '../../../shared/services/firebase';
import { apiService, type ApiUser } from '../../../shared/services/api';

const BARBEROS_URL = '/api/Barberos';
const USUARIOS_URL = '/api/Usuarios';

export interface Barbero {
  id: number;
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  documento: string;
  correo: string;
  telefono: string;
  direccion: string;
  barrio: string;
  fechaNacimiento: string;
  rol: string;
  status: 'active' | 'inactive';
  estado?: boolean; // Added for compatibility
  fotoPerfil: string;
  especialidad?: string;
  usuarioId?: number;
  fechaCreacion?: string;
}

export interface CreateBarberoData {
  usuarioId?: number;
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  documento: string;
  correo: string;
  telefono: string;
  direccion: string;
  barrio: string;
  fechaNacimiento: string;
  rol: string;
  status: string;
  fotoPerfil?: string;
  especialidad?: string;
  estado?: boolean;
}

class BarberosService {
  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    let token = null;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    };

    try {
      const response = await fetch(url, config);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Mapeo simplificado (DTO aplanado o con navegación)
  mapApiToComponent(api: any): Barbero {
    const usuario = api.usuario || api.Usuario || {};

    const nombre = api.nombre || api.Nombre || usuario.nombre || usuario.Nombre || "";
    const apellido = api.apellido || api.Apellido || api.apellidos || api.Apellidos || usuario.apellido || usuario.Apellido || usuario.apellidos || usuario.Apellidos || "";
    const isActive = (api.estado ?? api.Estado ?? usuario.estado ?? usuario.Estado ?? true);

    return {
      id: api.id || api.Id || 0,
      nombre: nombre,
      apellido: apellido,
      tipoDocumento: api.tipoDocumento || api.TipoDocumento || usuario.tipoDocumento || usuario.TipoDocumento || "CC",
      documento: api.documento || api.Documento || usuario.documento || usuario.Documento || "",
      correo: api.correo || api.Correo || usuario.correo || usuario.Correo || api.email || api.Email || usuario.email || usuario.Email || "",
      telefono: api.telefono || api.Telefono || api.celular || api.Celular || usuario.telefono || usuario.Telefono || usuario.celular || usuario.Celular || "",
      direccion: api.direccion || api.Direccion || usuario.direccion || usuario.Direction || "",
      barrio: api.barrio || api.Barrio || usuario.barrio || usuario.Barrio || "",
      fechaNacimiento: api.fechaNacimiento || api.FechaNacimiento || usuario.fechaNacimiento || usuario.FechaNacimiento || "No especificada",
      rol: api.rol || api.Rol || (usuario.rol?.nombre) || (usuario.Rol?.Nombre) || 'Barbero',
      status: isActive ? 'active' : 'inactive',
      estado: isActive,
      fotoPerfil: api.fotoPerfil || api.FotoPerfil || api.imagenUrl || api.ImagenUrl || usuario.fotoPerfil || usuario.FotoPerfil || "",
      especialidad: api.especialidad || api.Especialidad || 'General',
      usuarioId: api.usuarioId || api.UsuarioId || (api.Id && api.Id !== api.id ? api.Id : 0) || (usuario.id || api.Id || 0),
      fechaCreacion: api.fechaContratacion || api.FechaContratacion || api.fechaCreacion || api.FechaCreacion || "No especificada"
    };
  }

  mapComponentToApi(data: any): any {
    return {
      nombre: data.nombre,
      apellido: data.apellido,
      documento: data.documento,
      correo: data.correo,
      telefono: data.telefono,
      direccion: data.direccion,
      barrio: data.barrio,
      fechaNacimiento: data.fechaNacimiento,
      especialidad: data.especialidad,
      status: data.status,
      fotoPerfil: data.fotoPerfil
    };
  }

  async getBarberos(): Promise<Barbero[]> {
    try {
      const merged: any[] = [];
      const extract = (raw: any): any[] => {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
          if (Array.isArray(raw.items)) return raw.items;
          if (Array.isArray(raw.data)) return raw.data;
          if (Array.isArray(raw.$values)) return raw.$values;
          const firstArray = Object.values(raw).find((v: any) => Array.isArray(v)) as any[] | undefined;
          return firstArray || [];
        }
        return [];
      };
      const firstResponse = await this.request(`${BARBEROS_URL}?page=1&pageSize=100`);
      const firstRaw = await firstResponse.json();
      merged.push(...extract(firstRaw));
      let totalPages = firstRaw && typeof firstRaw === 'object' && !Array.isArray(firstRaw)
        ? Number((firstRaw as any).totalPages ?? 1)
        : 1;
      totalPages = Math.min(Math.max(1, totalPages), 200);
      if (totalPages > 1) {
        const promises: Promise<any[]>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          promises.push((async () => {
            const response = await this.request(`${BARBEROS_URL}?page=${page}&pageSize=100`);
            const raw = await response.json();
            return extract(raw);
          })());
        }
        const rest = await Promise.all(promises);
        rest.forEach(items => merged.push(...items));
      }
      return merged.map(item => this.mapApiToComponent(item));
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase();
      const is404 = msg.includes('404') || msg.includes('not found');
      if (!is404) throw e;
      try {
        const usuarios: ApiUser[] = await apiService.getUsuarios();
        const soloBarberos = usuarios.filter(u => {
          const rolNombre = (u.rol?.nombre || '').toLowerCase();
          return u.rolId === 2 || rolNombre === 'barbero';
        });
        return soloBarberos.map(u => this.mapApiToComponent(u as any));
      } catch (fallbackErr) {
        throw e;
      }
    }
  }

  // Creación vía Usuarios para sincronizar cuenta y perfil
  async createBarbero(data: CreateBarberoData): Promise<any> {
    const apiData = {
      Nombre: data.nombre,
      Apellido: data.apellido,
      TipoDocumento: data.tipoDocumento || "CC",
      Documento: data.documento,
      Correo: data.correo,
      Contrasena: (data as any).contrasena || data.documento || "Barberia123*",
      RolId: 2, // Barbero
      Telefono: data.telefono,
      Direccion: data.direccion,
      Barrio: data.barrio,
      FechaNacimiento: data.fechaNacimiento,
      Especialidad: data.especialidad || 'General',
      Estado: true,
      FotoPerfil: data.fotoPerfil || ''
    };

    const response = await this.request(USUARIOS_URL, {
      method: 'POST',
      body: JSON.stringify(apiData)
    });
    return await response.json();
  }

  async updateBarbero(id: number, data: any): Promise<any> {
    const apiData = {
      Id: id,
      Nombre: data.nombre,
      Apellido: data.apellido,
      Documento: data.documento,
      Correo: data.correo,
      Telefono: data.telefono,
      Direccion: data.direccion,
      Barrio: data.barrio,
      FechaNacimiento: data.fechaNacimiento,
      Especialidad: data.especialidad,
      Estado: data.status === 'active' || data.estado === true,
      FotoPerfil: data.fotoPerfil || ''
    };

    const response = await this.request(`${BARBEROS_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData)
    });
    return response.status === 204 ? apiData : await response.json();
  }

  async deleteBarbero(id: number, info?: { correo?: string; documento?: string; tipoDocumento?: string }): Promise<void> {
    // 1) Intentar eliminación directa del perfil Barbero
    try {
      const res = await this.request(`${BARBEROS_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) return;
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase();
      const is404 = msg.includes('404') || msg.includes('not found');
      if (!is404) throw e;
    }

    // 2) Fallback: intentar eliminar por /Usuarios/{id}
    try {
      await apiService.deleteUsuario(id);
      return;
    } catch {
      // continuar
    }

    // 3) Buscar usuario por correo o documento y eliminarlo
    try {
      const usuarios: ApiUser[] = await apiService.getUsuarios();
      const correo = info?.correo?.toLowerCase();
      const documento = (info?.documento || '').trim();
      const tipoDoc = (info?.tipoDocumento || '').trim().toUpperCase();
      const docFull = tipoDoc && documento ? `${tipoDoc} ${documento}` : documento;
      const match = usuarios.find(u => {
        const uCorreo = (u.correo || '').toLowerCase();
        const uDoc = (u.documento || '').trim();
        const rolNombre = (u.rol?.nombre || '').toLowerCase();
        const esBarbero = u.rolId === 2 || rolNombre === 'barbero';
        return esBarbero && ((correo && uCorreo === correo) || (documento && (uDoc === documento || uDoc === docFull)));
      });
      if (match?.id) {
        await apiService.deleteUsuario(match.id);
        return;
      }
      throw new Error('Usuario asociado no encontrado para eliminación');
    } catch (err) {
      throw new Error('No se pudo eliminar el barbero ni el usuario asociado');
    }
  }

  async updateBarberoStatus(id: number, estado: boolean): Promise<void> {
    try {
      await this.request(`${BARBEROS_URL}/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado })
      });
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase();
      const is404 = msg.includes('404') || msg.includes('not found');
      if (!is404) throw e;

      // Fallback: Si el perfil Barbero retorna 404, actualizamos directamente en /Usuarios
      try {
        const usuario = await apiService.getUsuarioById(id);
        if (usuario && usuario.id) {
          await apiService.updateUsuario(usuario.id, { ...usuario, estado });
          return;
        }
      } catch (fallbackErr) {
        // Ignorar el error del fallback y lanzar el error original 404
      }
      throw e;
    }
  }
}

export const barberosService = new BarberosService();
