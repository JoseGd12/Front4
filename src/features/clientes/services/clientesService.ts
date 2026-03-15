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
    const response = await fetch(API_BASE_URL, { headers });
    if (!response.ok) throw new Error(`Error: ${response.status}`);
    const text = await response.text();
    const data = text ? JSON.parse(text) : [];

    // Normalize keys
    return Array.isArray(data) ? data.map((item: any) => ({
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
    })) : [];
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
