// Interfaces para la API de clientes
export interface ClienteAPI {
  id: number;
  usuarioId?: number;
  nombre: string;
  apellido: string;
  documento: string;
  correo: string;
  telefono?: string;
  direccion?: string;
  barrio?: string;
  fechaNacimiento?: string;
  estado: boolean;
  fotoPerfil?: string;
  usuario?: any;
}

// Interface para el componente Cliente
export interface Cliente {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  barrio: string;
  fechaNacimiento: string;
  fechaRegistro: string;
  activo: boolean;
  fotoPerfil?: string;
  // Campos para compatibilidad con el frontend
  ultimaVisita?: string;
  saldoAFavor?: number;
  contraseña?: string;
}

// Interface para crear cliente
export interface CreateClienteData {
  usuarioId?: number;
  nombre: string;
  apellido: string;
  documento: string;
  correo: string;
  telefono?: string;
  fechaNacimiento?: string;
  direccion?: string;
  barrio?: string;
  fotoPerfil?: string;
}

const API_BASE_URL = '/api/Clientes';
const USUARIOS_API_URL = '/api/Usuarios';
import { apiService, type ApiUser } from '../../../shared/services/api';
import { auth } from '../../../shared/services/firebase';

class ClientesService {
  private async getAuthHeaders(): Promise<Record<string, string>> {
    let token: string | null = localStorage.getItem('authToken');
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Mapear datos de la API al formato del componente (usando campos aplanados)
  mapApiToComponent(apiCliente: any): Cliente {
    const documentoStr = apiCliente.documento || (apiCliente.usuario?.documento) || '';
    const partesDocumento = documentoStr.split(' ');
    const tipoDocumento = partesDocumento.length > 1 ? partesDocumento[0] : 'CC';
    const numeroDocumento = partesDocumento.length > 1 ? partesDocumento.slice(1).join(' ') : documentoStr;

    return {
      id: (apiCliente.id || apiCliente.Id || 0).toString(),
      tipoDocumento: tipoDocumento || 'CC',
      numeroDocumento: numeroDocumento,
      nombre: apiCliente.nombre || apiCliente.Nombre || '',
      apellido: apiCliente.apellido || apiCliente.Apellido || '',
      email: apiCliente.correo || apiCliente.Correo || '',
      telefono: apiCliente.telefono || apiCliente.Telefono || '',
      direccion: apiCliente.direccion || apiCliente.Direccion || '',
      barrio: apiCliente.barrio || apiCliente.Barrio || '',
      fechaNacimiento: apiCliente.fechaNacimiento || apiCliente.FechaNacimiento || '',
      fechaRegistro: new Date().toLocaleDateString(),
      activo: apiCliente.estado === true || apiCliente.Estado === true,
      fotoPerfil: apiCliente.fotoPerfil || apiCliente.FotoPerfil || apiCliente.imagenUrl || '',
      saldoAFavor: Number(apiCliente.saldoAFavor || apiCliente.SaldoAFavor || 0)
    };
  }

  // Mapear para envío al servidor (PascalCase)
  private mapToApiFormat(data: any): any {
    return {
      Nombre: data.nombre,
      Apellido: data.apellido,
      Documento: data.documento,
      Correo: data.correo,
      Telefono: data.telefono,
      Direccion: data.direccion,
      Barrio: data.barrio,
      FechaNacimiento: data.fechaNacimiento,
      FotoPerfil: data.fotoPerfil || '',
      Estado: true
    };
  }

  async getClientes(): Promise<ClienteAPI[]> {
    const headers = await this.getAuthHeaders();
    const merged: any[] = [];
    const first = await fetch(`${API_BASE_URL}?page=1&pageSize=5`, { headers });
    if (!first.ok) throw new Error(`Error: ${first.status}`);
    const firstText = await first.text();
    const firstRaw = firstText ? JSON.parse(firstText) : [];
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
    merged.push(...extract(firstRaw));
    let totalPages = firstRaw && typeof firstRaw === 'object' && !Array.isArray(firstRaw)
      ? Number((firstRaw as any).totalPages ?? 1)
      : 1;
    totalPages = Math.min(Math.max(1, totalPages), 200);
    if (totalPages > 1) {
      const promises: Promise<any[]>[] = [];
      for (let page = 2; page <= totalPages; page++) {
        promises.push((async () => {
          const response = await fetch(`${API_BASE_URL}?page=${page}&pageSize=5`, { headers });
          if (!response.ok) return [];
          const text = await response.text();
          const raw = text ? JSON.parse(text) : [];
          return extract(raw);
        })());
      }
      const rest = await Promise.all(promises);
      rest.forEach(items => merged.push(...items));
    }
    return merged.map((item: any) => ({
        id: item.id || item.Id,
        nombre: item.nombre || item.Nombre,
        apellido: item.apellido || item.Apellido,
        documento: item.documento || item.Documento,
        correo: item.correo || item.Correo || item.email || item.Email,
        telefono: item.telefono || item.Telefono,
        direccion: item.direccion || item.Direccion,
        barrio: item.barrio || item.Barrio,
        fechaNacimiento: item.fechaNacimiento || item.FechaNacimiento,
        fotoPerfil: item.fotoPerfil || item.FotoPerfil,
        estado: (item.estado === true || item.Estado === true) && (item.usuario || item.Usuario ? ((item.usuario || item.Usuario).estado === true || (item.usuario || item.Usuario).Estado === true) : true),
        usuario: item.usuario || item.Usuario
      }));
  }

  async getClientesPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<{ items: Cliente[]; totalCount: number; page: number; pageSize: number; totalPages: number; }> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 5));
    const q = args.q ?? '';
    const extra = { ...args };
    delete extra.page;
    delete extra.pageSize;
    delete extra.q;

    const headers = await this.getAuthHeaders();
    const qs = new URLSearchParams();
    qs.append('page', String(page));
    qs.append('pageSize', String(pageSize));
    if (q) qs.append('q', q);
    Object.entries(extra).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qs.append(k, String(v));
    });
    const url = `${API_BASE_URL}?${qs.toString()}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const text = await response.text();
    if (!text || !text.trim()) {
      return { items: [], totalCount: 0, page, pageSize, totalPages: 1 };
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }
    if (data && typeof data === 'object' && 'items' in data) {
      const itemsRaw = Array.isArray(data.items) ? data.items : [];
      const items = itemsRaw.map((item: any) => this.mapApiToComponent({
        ...item,
        usuario: item.usuario || item.Usuario
      }));
      const totalCount = Number(data.totalCount ?? items.length);
      const totalPages = Number(data.totalPages ?? Math.max(1, Math.ceil(totalCount / (Number(data.pageSize) || pageSize))));
      return {
        items,
        totalCount,
        page: Number(data.page ?? page),
        pageSize: Number(data.pageSize ?? pageSize),
        totalPages
      };
    }
    const arr: any[] = Array.isArray(data) ? data : [];
    const mapped = arr.map((item: any) => this.mapApiToComponent(item));
    const totalCount = mapped.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const items = mapped.slice(start, start + pageSize);
    return { items, totalCount, page, pageSize, totalPages };
  }

  async getClienteById(id: number): Promise<ClienteAPI> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}`, { headers });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return await response.json();
  }

  // Creación robusta: si ya tiene usuarioId usa POST /api/clientes, si no usa POST /api/Usuarios
  async createCliente(clienteData: CreateClienteData): Promise<any> {
    if (clienteData.usuarioId) {
      // Flujo 1: El usuario ya existe en Usuarios, solo creamos el perfil cliente
      const apiData = {
        ...this.mapToApiFormat(clienteData),
        UsuarioId: clienteData.usuarioId
      };
      console.log('🔵 Creando Perfil Cliente directo en /api/clientes:', apiData.Correo);
      const headers = await this.getAuthHeaders();
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(apiData)
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Error en API Clientes ${response.status}: ${err}`);
      }
      return await response.json();
    }

    // Flujo 2: El usuario no existe, creamos todo vía Usuarios API (que internamente crea el perfil)
    const apiData = {
      ...this.mapToApiFormat(clienteData),
      RolId: 3, // Rol de Cliente
      Contrasena: (clienteData as any).contrasena || clienteData.documento || "Cliente123*" // Contraseña temporal
    };

    console.log('🔵 Creando Usuario+Cliente vía /api/Usuarios:', apiData.Correo);

    const headers = await this.getAuthHeaders();
    const response = await fetch(USUARIOS_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(apiData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error en API Usuarios ${response.status}: ${errorText}`);
    }

    const createdUsuario = await response.json();
    try {
      const todosClientes = await this.getClientes();
      const perfilCliente = (todosClientes || []).find((c: any) => {
        const u = c.usuario || c.Usuario;
        const uId = (u && (u.id || u.Id)) || c.usuarioId;
        const uCorreo = String((u && (u.correo || u.Correo)) || c.correo || '').toLowerCase();
        const createdCorreo = String(createdUsuario?.correo || createdUsuario?.Correo || '').toLowerCase();
        return Number(uId) === Number(createdUsuario?.id || createdUsuario?.Id) || (!!createdCorreo && uCorreo === createdCorreo);
      });
      if (perfilCliente) {
        return perfilCliente;
      }
    } catch {
      // ignorar fallos de búsqueda del perfil y retornar usuario creado
    }
    return createdUsuario;
  }

  async updateCliente(id: number, clienteData: any): Promise<any> {
    const apiData = {
      Id: id,
      ...this.mapToApiFormat(clienteData),
      Estado: clienteData.estado !== undefined ? clienteData.estado : true
    };

    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(apiData),
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return response.status === 204 ? clienteData : await response.json();
  }

  async deleteCliente(id: number, info?: { correo?: string; documento?: string; tipoDocumento?: string }): Promise<void> {
    // 1) Intentar eliminar perfil Cliente directamente
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE', headers });
      if (response.ok) return;
      const errText = await response.text();
      throw new Error(`Error ${response.status}: ${errText}`);
    } catch (e: any) {
      const msg = String(e?.message || '').toLowerCase();
      const is404 = msg.includes('404') || msg.includes('not found');
      if (!is404) throw e;
    }

    // 2) Fallback: El backend no tiene /Clientes o el ID es de Usuario.
    //    Probar eliminar en /Usuarios/{id}
    try {
      await apiService.deleteUsuario(id);
      return;
    } catch (_) {
      // Continuar con búsqueda por correo/documento
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
        return (correo && uCorreo === correo) || (documento && (uDoc === documento || uDoc === docFull));
      });

      if (match?.id) {
        await apiService.deleteUsuario(match.id);
        return;
      }
      throw new Error('Usuario asociado no encontrado para eliminación');
    } catch (err) {
      throw new Error('No se pudo eliminar el cliente ni el usuario asociado');
    }
  }

  async toggleClienteEstado(id: number, estado: boolean): Promise<void> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/${id}/estado`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ estado }),
    });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
  }
}

export const clientesService = new ClientesService();
