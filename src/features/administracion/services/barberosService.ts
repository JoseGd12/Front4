import { httpClient } from '../../../shared/services/httpClient';
import { apiService, type ApiUser } from '../../../shared/services/api';
import { logger } from '../../../shared/utils/logger';

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
  saldoDisponible?: number;
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
      fechaNacimiento: (api.fechaNacimiento || api.FechaNacimiento || usuario.fechaNacimiento || usuario.FechaNacimiento) 
        ? String(api.fechaNacimiento || api.FechaNacimiento || usuario.fechaNacimiento || usuario.FechaNacimiento).split('T')[0] 
        : "No especificada",
      rol: api.rol || api.Rol || (usuario.rol?.nombre) || (usuario.Rol?.Nombre) || 'Barbero',
      status: isActive ? 'active' : 'inactive',
      estado: isActive,
      fotoPerfil: api.fotoPerfil || api.FotoPerfil || api.imagenUrl || api.ImagenUrl || usuario.fotoPerfil || usuario.FotoPerfil || "",
      especialidad: api.especialidad || api.Especialidad || 'General',
      saldoDisponible: api.saldoDisponible ?? api.SaldoDisponible ?? 200000,
      usuarioId: api.usuarioId || api.UsuarioId || (api.Id && api.Id !== api.id ? api.Id : 0) || (usuario.id || api.Id || 0),
      fechaCreacion: api.fechaContratacion || api.FechaContratacion || api.fechaCreacion || api.FechaCreacion || "No especificada"
    };
  }

  mapComponentToApi(data: any): any {
    const isStatusActive = data.estado !== undefined ? data.estado : (data.status === 'active');
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
      estado: isStatusActive,
      Estado: isStatusActive,
      fotoPerfil: data.fotoPerfil || undefined,
      usuarioId: data.usuarioId
    };
  }

  private extract(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.$values)) return raw.$values;
      const firstArray = Object.values(raw).find((v: any) => Array.isArray(v)) as any[] | undefined;
      return firstArray || [];
    }
    return [];
  }

  async getBarberos(_page = 1, _pageSize = 100): Promise<Barbero[]> {
    // Fetch both sources in parallel: the dedicated Barberos table and all Users
    // filtered to the barber role. This ensures users whose role was changed to
    // "barbero" always appear even if they don't yet have a row in the Barberos table.
    const [barberosRaw, usuariosRaw] = await Promise.allSettled([
      (async () => {
        const firstRaw = await httpClient.get(`/Barberos?page=1&pageSize=100`);
        const merged: any[] = [...this.extract(firstRaw)];
        let totalPages = firstRaw && typeof firstRaw === 'object' && !Array.isArray(firstRaw)
          ? Number((firstRaw as any).totalPages ?? 1) : 1;
        totalPages = Math.min(Math.max(1, totalPages), 200);
        if (totalPages > 1) {
          const pages = await Promise.all(
            Array.from({ length: totalPages - 1 }, (_, i) =>
              httpClient.get(`/Barberos?page=${i + 2}&pageSize=100`).then(r => this.extract(r))
            )
          );
          pages.forEach(items => merged.push(...items));
        }
        return merged;
      })(),
      (async () => {
        const usuarios: ApiUser[] = await apiService.getUsuarios();
        return usuarios.filter(u => {
          const rolNombre = (u.rol?.nombre || '').toLowerCase();
          return rolNombre === 'barbero';
        });
      })(),
    ]);

    const barberRows: Barbero[] =
      barberosRaw.status === 'fulfilled'
        ? barberosRaw.value.map((item: any) => this.mapApiToComponent(item))
        : [];

    const usuarioRows: Barbero[] =
      usuariosRaw.status === 'fulfilled'
        ? usuariosRaw.value.map((u: any) => this.mapApiToComponent(u))
        : [];

    if (barberRows.length === 0 && usuarioRows.length === 0) {
      logger.warn('No se pudieron obtener barberos de ninguna fuente');
      return [];
    }

    // Merge: /Barberos has richer data (profile, especialidad, saldo) so it wins.
    // Fill in any barbero-role users that are NOT yet in the Barberos table.
    const seenIds = new Set<number>();
    const result: Barbero[] = [];

    for (const b of barberRows) {
      const uid = b.usuarioId || b.id;
      seenIds.add(uid);
      result.push(b);
    }

    for (const u of usuarioRows) {
      const uid = u.usuarioId || u.id;
      if (!seenIds.has(uid)) {
        seenIds.add(uid);
        result.push(u);
      }
    }

    return result;
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

    return httpClient.post('/Usuarios', apiData);
  }

  async getBarberoById(id: number): Promise<Barbero> {
    const data = await httpClient.get(`/Barberos/${id}`);
    return this.mapApiToComponent(data);
  }

  async updateBarbero(id: number, data: Partial<Barbero>): Promise<any> {
    const mapped = this.mapComponentToApi(data);
    return httpClient.put(`/Barberos/${id}`, mapped);
  }

  async deleteBarbero(id: number, _options?: any): Promise<void> {
    await httpClient.delete(`/Barberos/${id}`);
  }

  async updateBarberoStatus(id: number, active: boolean): Promise<void> {
    await httpClient.post(`/Barberos/${id}/estado`, { estado: active });
  }
}

export const barberosService = new BarberosService();
export default barberosService;
