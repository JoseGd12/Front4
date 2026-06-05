import { httpClient } from '../../../shared/services/httpClient';

/** Genera un ID aleatorio de 12 caracteres hex usando crypto. */
function generarIdAleatorio(): string {
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
}

/** Genera una contraseña aleatoria de 16 caracteres hex. No predecible por timestamp. */
function generarContrasenaAleatoria(): string {
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  return 'Tmp' + Array.from(arr, b => b.toString(16).padStart(2, '0')).join('') + '!';
}

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
  usuarioId?: number;
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

export interface PagedClientes {
  items: Cliente[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ClientesService {
  // Mapear datos de la API al formato del componente (usando campos aplanados)
  mapApiToComponent(apiCliente: any): Cliente {
    const documentoStr = apiCliente.documento || (apiCliente.usuario?.documento) || '';
    const partesDocumento = documentoStr.split(' ');
    const tipoDocumento = partesDocumento.length > 1 ? partesDocumento[0] : 'CC';
    const numeroDocumento = partesDocumento.length > 1 ? partesDocumento.slice(1).join(' ') : documentoStr;

    return {
      id: (apiCliente.id || apiCliente.Id || 0).toString(),
      usuarioId: apiCliente.usuarioId || apiCliente.UsuarioId || (apiCliente.usuario?.id || apiCliente.usuario?.Id || 0),
      tipoDocumento: tipoDocumento || 'CC',
      numeroDocumento: numeroDocumento,
      nombre: apiCliente.nombre || apiCliente.Nombre || '',
      apellido: apiCliente.apellido || apiCliente.Apellido || '',
      email: apiCliente.correo || apiCliente.Correo || '',
      telefono: apiCliente.telefono || apiCliente.Telefono || '',
      direccion: apiCliente.direccion || apiCliente.Direccion || '',
      barrio: apiCliente.barrio || apiCliente.Barrio || '',
      fechaNacimiento: (apiCliente.fechaNacimiento || apiCliente.FechaNacimiento) ? String(apiCliente.fechaNacimiento || apiCliente.FechaNacimiento).split('T')[0] : '',
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
      Estado: data.estado !== undefined ? data.estado : true,
      UsuarioId: data.usuarioId
    };
  }

  private extractItems(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') {
      if (Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw.data)) return raw.data;
      if (Array.isArray(raw.$values)) return raw.$values;
    }
    return [];
  }

  /**
   * Obtiene una página de clientes (FE-M12: Optimización de paginación)
   */
  async getClientesPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<PagedClientes> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 50));
    const q = args.q ?? '';
    
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (q) params.append('q', q);

    Object.entries(args).forEach(([k, v]) => {
      if (['page', 'pageSize', 'q'].includes(k)) return;
      if (v != null && v !== '') params.append(k, String(v));
    });

    try {
      const data = await httpClient.get(`/Clientes?${params.toString()}`);
      const rawItems = this.extractItems(data);
      
      const items = rawItems.map((item: any) => this.mapApiToComponent({
        ...item,
        usuario: item.usuario || item.Usuario
      }));

      return {
        items,
        totalCount: Number(data.totalCount ?? items.length),
        page: Number(data.page ?? page),
        pageSize: Number(data.pageSize ?? pageSize),
        totalPages: Number(data.totalPages ?? 1)
      };
    } catch (error) {
      console.error('Error fetching clientes paged:', error);
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }
  }

  /**
   * @deprecated Usar getClientesPaged para mejor rendimiento.
   */
  async getClientes(): Promise<ClienteAPI[]> {
    const res = await this.getClientesPaged({ page: 1, pageSize: 100 });
    return res.items.map(c => ({
      id: Number(c.id),
      nombre: c.nombre,
      apellido: c.apellido,
      documento: c.numeroDocumento,
      correo: c.email,
      telefono: c.telefono,
      direccion: c.direccion,
      barrio: c.barrio,
      fechaNacimiento: c.fechaNacimiento,
      fotoPerfil: c.fotoPerfil,
      estado: c.activo,
      usuarioId: c.usuarioId
    }));
  }

  async getClienteById(id: number): Promise<ClienteAPI> {
    return await httpClient.get(`/Clientes/${id}`);
  }

  async createCliente(data: CreateClienteData): Promise<ClienteAPI> {
    const apiData = this.mapToApiFormat(data);
    return await httpClient.post('/Clientes', apiData);
  }

  async createClienteWithUser(data: CreateClienteData): Promise<any> {
    const password = generarContrasenaAleatoria();
    const userData = {
      Nombre: data.nombre,
      Apellido: data.apellido,
      Documento: data.documento,
      Correo: data.correo,
      Contrasena: password,
      RolId: 3, // Cliente
      Telefono: data.telefono,
      Direccion: data.direccion,
      Barrio: data.barrio,
      FechaNacimiento: data.fechaNacimiento,
      Estado: true,
      FotoPerfil: data.fotoPerfil || ''
    };

    const userResult = await httpClient.post('/Usuarios', userData);
    return {
      cliente: this.mapApiToComponent(userResult),
      contrasena: password
    };
  }

  async updateCliente(id: number, data: Partial<Cliente>): Promise<ClienteAPI> {
    const apiData = this.mapToApiFormat(data);
    return await httpClient.put(`/Clientes/${id}`, apiData);
  }

  async deleteCliente(id: number): Promise<void> {
    await httpClient.delete(`/Clientes/${id}`);
  }

  async getClientesDeBarbero(barberoId: number): Promise<Cliente[]> {
    const data = await httpClient.get(`/Clientes/barbero/${barberoId}`);
    const items = this.extractItems(data);
    return items.map(c => this.mapApiToComponent(c));
  }
}

export const clientesService = new ClientesService();
export default clientesService;
