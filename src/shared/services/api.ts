import { auth } from './firebase';

const API_BASE_URL = '/api';

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiUser {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  rolId: number | null;
  tipoDocumento: string | null;
  documento: string | null;
  telefono: string | null;
  direccion: string | null;
  barrio: string | null;
  fechaNacimiento: string | null;
  fotoPerfil: string | null;
  estado: boolean;
  rol?: {
    id: number;
    nombre: string;
    descripcion: string;
    estado: boolean;
  };
}

export interface UserRole {
  id: number;
  nombre: string;
  descripcion: string;
  estado: boolean;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion: number;
  precio: number;
  estado: boolean;
  imagen?: string;
}

export interface Paquete {
  id: number;
  nombre: string;
  descripcion: string;
  servicios: string[];
  duracion: number;
  precio: number;
  descuento: number;
  precioOriginal: number;
  clientesAtendidos: number;
  categoria: string;
  activo: boolean;
  imagen?: string;
}

export interface DetallePaquete {
  id: number;
  paqueteId: number;
  servicioId: number;
  nombreServicio: string;
  precioServicio: number;
  cantidad: number;
  subtotal: number;
}

class ApiService {
  // Caché en memoria con TTL para reducir peticiones repetidas
  private _cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 30000; // 30 segundos

  private getCached<T>(key: string): T | null {
    const entry = this._cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data as T;
    }
    this._cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this._cache.set(key, { data, timestamp: Date.now() });
  }

  invalidateCache(prefix?: string): void {
    if (!prefix) {
      this._cache.clear();
      return;
    }
    for (const key of this._cache.keys()) {
      if (key.startsWith(prefix)) this._cache.delete(key);
    }
  }

  async uploadImage(file: File, opts?: { productoId?: number; usuarioId?: number }): Promise<string> {
    const formData = new FormData();
    // Campo requerido por el backend: "imagen"
    formData.append('imagen', file);
    if (opts?.productoId != null) formData.append('productoId', String(opts.productoId));
    if (opts?.usuarioId != null) formData.append('usuarioId', String(opts.usuarioId));

    try {
      const url = `${API_BASE_URL}/images/subir`;
      console.log(`API [POST]: ${url} (multipart/form-data)`);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error [${response.status}]: ${errorText}`);
        throw new Error(`Error al subir imagen (${response.status}): ${errorText || response.statusText}`);
      }

      const result = await response.json();
      const imageUrl = result.url || result;
      console.log('📤 URL recibida:', imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  async uploadProductoImagen(productoId: number, file: File): Promise<{ url: string; publicId?: string }> {
    const formData = new FormData();
    formData.append('imagen', file);
    const url = `${API_BASE_URL}/productos/${productoId}/imagen`;
    const resp = await fetch(url, { method: 'POST', body: formData });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error subiendo imagen de producto (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  async uploadUsuarioFoto(usuarioId: number, file: File): Promise<{ url: string; publicId?: string }> {
    const formData = new FormData();
    formData.append('imagen', file);
    const url = `${API_BASE_URL}/usuarios/${usuarioId}/foto`;
    const resp = await fetch(url, { method: 'POST', body: formData });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error subiendo foto de usuario (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  async uploadServicioImagen(servicioId: number, file: File): Promise<{ url: string; publicId?: string }> {
    const formData = new FormData();
    formData.append('imagen', file);
    const url = `${API_BASE_URL}/servicios/${servicioId}/imagen`;
    const resp = await fetch(url, { method: 'POST', body: formData });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error subiendo imagen de servicio (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  async deleteProductoImagen(productoId: number, borrarCloud = true): Promise<{ eliminado: boolean; publicId?: string }> {
    const url = `${API_BASE_URL}/images/producto/${productoId}?borrarCloud=${borrarCloud ? 'true' : 'false'}`;
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error eliminando imagen de producto (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  async deleteUsuarioFoto(usuarioId: number, borrarCloud = true): Promise<{ eliminado: boolean; publicId?: string }> {
    const url = `${API_BASE_URL}/images/usuario/${usuarioId}?borrarCloud=${borrarCloud ? 'true' : 'false'}`;
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error eliminando foto de usuario (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  async deleteServicioImagen(servicioId: number, borrarCloud = true): Promise<{ eliminado: boolean; publicId?: string }> {
    const url = `${API_BASE_URL}/servicios/${servicioId}/imagen?borrarCloud=${borrarCloud ? 'true' : 'false'}`;
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Error eliminando imagen de servicio (${resp.status}): ${text || resp.statusText}`);
    }
    return await resp.json();
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const method = (options.method || 'GET').toUpperCase();
    const isGet = method === 'GET';
    const buildUrl = () => {
      return `${API_BASE_URL}${endpoint}`;
    };

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    let token = null;
    if (auth.currentUser) {
      token = await auth.currentUser.getIdToken();
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
    };

    const maxAttempts = isGet ? 2 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const url = buildUrl();
      try {
        console.log(`API [${method}] (intento ${attempt}/${maxAttempts}): ${url}`);
        if (config.body) {
          console.log(`📤 Request Body:`, config.body);
        }

        const response = await fetch(url, config);
        if (response.ok) return response;

        const errorText = await response.text();
        const looksLikeIisNotFound =
          response.status === 404 &&
          /<!doctype html|http error 404|not found/i.test(errorText);

        if (looksLikeIisNotFound && attempt < maxAttempts) {
          console.warn(`⚠️ API 404 transitorio detectado en ${endpoint}. Reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 900));
          continue;
        }

        console.error(`❌ API Error [${response.status}]: ${errorText}`);
        throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          console.warn(`⚠️ Error de red transitorio en ${endpoint}. Reintentando...`);
          await new Promise(resolve => setTimeout(resolve, 900));
          continue;
        }
        console.error('Network/API Error:', error);
        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Error inesperado de red/API');
  }

  private buildQuery(params: Record<string, any>): string {
    const qs = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qs.append(k, String(v));
    });
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  private extractArrayFromRaw(raw: any): any[] {
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

  private async fetchAllPages(endpoint: string, pageSize = 100): Promise<any[]> {
    const query = endpoint.includes('?') ? '&' : '?';
    const firstResponse = await this.request(`${endpoint}${query}page=1&pageSize=${pageSize}`);
    const firstText = await firstResponse.text();
    const firstRaw = firstText ? JSON.parse(firstText) : [];
    const firstItems = this.extractArrayFromRaw(firstRaw);
    const allItems: any[] = [...firstItems];
    let totalPages = 1;
    if (firstRaw && typeof firstRaw === 'object' && !Array.isArray(firstRaw)) {
      const tp = Number((firstRaw as any).totalPages ?? 0);
      const tc = Number((firstRaw as any).totalCount ?? 0);
      if (tp > 0) totalPages = tp;
      else if (tc > 0) totalPages = Math.max(1, Math.ceil(tc / pageSize));
    }
    totalPages = Math.min(Math.max(1, totalPages), 200);
    if (totalPages <= 1) return allItems;
    const promises: Promise<any[]>[] = [];
    for (let page = 2; page <= totalPages; page++) {
      promises.push((async () => {
        const response = await this.request(`${endpoint}${query}page=${page}&pageSize=${pageSize}`);
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        return this.extractArrayFromRaw(raw);
      })());
    }
    const rest = await Promise.all(promises);
    rest.forEach(items => allItems.push(...items));
    return allItems;
  }

  // ==================== MÉTODOS PARA AUTENTICACIÓN ====================
  async confirmPasswordChange(): Promise<void> {
    try {
      console.log('🔄 Confirmando cambio de contraseña en backend...');
      const url = '/auth/password-changed';
      await this.request(url, { method: 'POST' });
      console.log('✅ Cambio de contraseña confirmado exitosamente');
    } catch (error) {
      console.error('❌ Error confirmando cambio de contraseña:', error);
      throw error;
    }
  }

  // Mapear objeto a PascalCase para las peticiones (POST/PUT)
  private mapToApiFormat(data: any): any {
    if (!data) return data;

    const mapped: any = {};

    if (data.id !== undefined) {
      mapped.Id = data.id;
      mapped.id = data.id;
    }
    if (data.nombre !== undefined || data.name !== undefined) {
      const nameValue = data.nombre || data.name;
      mapped.Nombre = nameValue;
      mapped.nombre = nameValue;
    }
    if (data.apellido !== undefined) {
      mapped.Apellido = data.apellido;
      mapped.apellido = data.apellido;
    }
    if (data.correo !== undefined || data.email !== undefined) {
      const emailValue = data.correo || data.email;
      mapped.Correo = emailValue;
      mapped.correo = emailValue;
      mapped.Email = emailValue;
      mapped.email = emailValue;
    }
    if (data.contrasena !== undefined) {
      mapped.Contrasena = data.contrasena;
      mapped.contrasena = data.contrasena;
    }
    if (data.rolId !== undefined) {
      const rId = data.rolId === null ? null : Number(data.rolId);
      mapped.RolId = rId;
      mapped.rolId = rId;
    }
    if (data.tipoDocumento !== undefined) {
      mapped.TipoDocumento = data.tipoDocumento;
      mapped.tipoDocumento = data.tipoDocumento;
    }
    if (data.documento !== undefined) {
      mapped.Documento = data.documento;
      mapped.documento = data.documento;
    }
    if (data.telefono !== undefined) {
      mapped.Telefono = data.telefono;
      mapped.telefono = data.telefono;
    }
    if (data.direccion !== undefined) {
      mapped.Direccion = data.direccion;
      mapped.direccion = data.direccion;
    }
    if (data.barrio !== undefined) {
      mapped.Barrio = data.barrio;
      mapped.barrio = data.barrio;
    }
    if (data.fechaNacimiento !== undefined) {
      mapped.FechaNacimiento = data.fechaNacimiento;
      mapped.fechaNacimiento = data.fechaNacimiento;
    }
    if (data.fotoPerfil !== undefined) {
      mapped.FotoPerfil = data.fotoPerfil;
      mapped.fotoPerfil = data.fotoPerfil;
    }
    if (data.usuarioId !== undefined) {
      const uId = Number(data.usuarioId);
      mapped.UsuarioId = uId;
      mapped.usuarioId = uId;
    }

    // Estado/Activo (Resiliencia total)
    if (data.estado !== undefined) {
      const e = !!data.estado;
      mapped.Estado = e;
      mapped.estado = e;
      mapped.Activo = e;
      mapped.activo = e;
    }

    // Campos para Servicios y Paquetes
    if (data.descripcion !== undefined) {
      mapped.Descripcion = data.descripcion;
      mapped.descripcion = data.descripcion;
    }
    if (data.duracion !== undefined) {
      const d = Number(data.duracion);
      mapped.Duracion = d;
      mapped.DuracionMinutos = d;
      mapped.DuracionMinutes = d;
      mapped.duracion = d;
      mapped.duracionMinutos = d;
      mapped.duracionMinutes = d;
    }
    if (data.precio !== undefined) {
      const p = Number(data.precio);
      mapped.Precio = p;
      mapped.precio = p;
    }
    if (data.imagen !== undefined) {
      mapped.Imagen = data.imagen;
      mapped.imagen = data.imagen;
    }
    if (data.servicios !== undefined) mapped.Servicios = data.servicios;

    // 🔥 Para creación completa de paquetes
    if (data.detalles !== undefined) {
      mapped.Detalles = data.detalles.map((d: any) => ({
        ServicioId: Number(d.servicioId),
        Cantidad: Number(d.cantidad || 1)
      }));
    }

    // Campos para DetallePaquete (Minimalistas para EF Core)
    if (data.paqueteId !== undefined) mapped.PaqueteId = Number(data.paqueteId);
    if (data.servicioId !== undefined) mapped.ServicioId = Number(data.servicioId);
    if (data.cantidad !== undefined) mapped.Cantidad = Number(data.cantidad);

    return mapped;
  }

  // Normalizar datos
  private normalizeServicioData(data: any): Servicio {
    return {
      id: Number(data.id || data.Id) || 0,
      nombre: String(data.nombre || data.Nombre || ''),
      descripcion: String(data.descripcion || data.Descripcion || ''),
      duracion: Number(
        data.duracionMinutos || data.DuracionMinutos ||
        data.duracionMinutes || data.DuracionMinutes ||
        data.duracion || data.Duracion || 0
      ),
      precio: Number(data.precio || data.Precio || 0),
      estado: Boolean(
        data.estado === true ||
        data.estado === 'true' ||
        data.estado === 1 ||
        data.estado === '1' ||
        data.Estado === true ||
        data.Estado === 'true' ||
        data.Estado === 1 ||
        data.Estado === '1' ||
        (data.estado !== null && data.estado !== undefined && data.estado !== false && data.estado !== 'false' && data.estado !== 0 && data.estado !== '0')
      ),
      imagen: data.imagen || data.Imagen || undefined
    };
  }

  private normalizePaqueteData(data: any): Paquete {
    const rawDetalles = data.detallePaquetes || data.DetallePaquetes || data.detalles || data.Detalles || [];
    let serviciosStrings: string[] = [];

    if (Array.isArray(rawDetalles) && rawDetalles.length > 0) {
      serviciosStrings = rawDetalles.map((dp: any) =>
        (dp.servicioNombre || dp.ServicioNombre || dp.nombreServicio || dp.NombreServicio || dp.servicio?.nombre || dp.servicio?.Nombre || dp.Nombre || dp.nombre || 'Servicio')
      );
    } else if (Array.isArray(data.servicios || data.Servicios)) {
      serviciosStrings = data.servicios || data.Servicios;
    } else if (Array.isArray(data.serviciosNombres || data.ServiciosNombres)) {
      serviciosStrings = data.serviciosNombres || data.ServiciosNombres;
    }

    return {
      id: Number(data.id || data.Id) || 0,
      nombre: String(data.nombre || data.Nombre || ''),
      descripcion: String(data.descripcion || data.Descripcion || ''),
      servicios: serviciosStrings,
      duracion: Number(
        data.duracionMinutos || data.DuracionMinutos ||
        data.duracionMinutes || data.DuracionMinutes ||
        data.duracion || data.Duracion || 0
      ),
      precio: Number(data.precio || data.Precio || 0),
      descuento: Number(data.descuento || data.Descuento || 0),
      precioOriginal: Number(data.precioOriginal || data.PrecioOriginal) || Number(data.precio || data.Precio || 0) || 0,
      clientesAtendidos: Number(data.clientesAtendidos || data.ClientesAtendidos || 0),
      categoria: String(data.categoria || data.Categoria || 'General'),
      activo: Boolean(
        data.activo === true || data.activo === 'true' || data.activo === 1 ||
        data.Activo === true || data.estado === true || data.Estado === true
      ),
      imagen: data.imagen || data.Imagen || data.imagenUrl || data.ImagenUrl || undefined
    };
  }

  private normalizeDetallePaqueteData(data: any): DetallePaquete {
    const servicio = data.servicio || data.Servicio;
    return {
      id: Number(data.id || data.Id) || 0,
      paqueteId: Number(data.paqueteId || data.PaqueteId) || 0,
      servicioId: Number(data.servicioId || data.ServicioId || servicio?.id || servicio?.Id) || 0,
      nombreServicio: String(data.servicioNombre || data.ServicioNombre || data.nombreServicio || data.NombreServicio || servicio?.nombre || servicio?.Nombre || 'Servicio'),
      precioServicio: Number(data.servicioPrecio || data.ServicioPrecio || data.precioServicio || data.PrecioServicio || servicio?.precio || servicio?.Precio || data.precio || data.Precio || 0),
      cantidad: Number(data.cantidad || data.Cantidad) || 1,
      subtotal: Number(data.subtotal || data.Subtotal) || (Number(data.servicioPrecio || data.ServicioPrecio || data.precioServicio || data.PrecioServicio || servicio?.precio || servicio?.Precio || 0) * (Number(data.cantidad || data.Cantidad) || 1))
    };
  }

  async getUsuarios(): Promise<ApiUser[]> {
    const cached = this.getCached<ApiUser[]>('usuarios');
    if (cached) return cached;
    try {
      const items = await this.fetchAllPages('/Usuarios');

      const normalizedData = items.map((item: any) => ({
        id: item.id || item.Id,
        nombre: item.nombre || item.Nombre,
        apellido: item.apellido || item.Apellido,
        correo: item.correo || item.Correo || item.email || item.Email,
        contrasena: item.contrasena || item.Contrasena,
        rolId: item.rolId || item.RolId,
        tipoDocumento: item.tipoDocumento || item.TipoDocumento,
        documento: item.documento || item.Documento,
        telefono: item.telefono || item.Telefono,
        direccion: item.direccion || item.Direccion,
        barrio: item.barrio || item.Barrio,
        fechaNacimiento: (item.fechaNacimiento || item.FechaNacimiento) ? String(item.fechaNacimiento || item.FechaNacimiento).split('T')[0] : "",
        fotoPerfil: item.fotoPerfil || item.FotoPerfil,
        estado: item.estado === true || item.Estado === true || item.activo === true || item.Activo === true,
        rol: item.rol || item.Rol ? {
          id: item.rol?.id || item.Rol?.Id || item.rol?.id || item.Rol?.id,
          nombre: item.rol?.nombre || item.Rol?.Nombre,
          descripcion: item.rol?.descripcion || item.Rol?.Descripcion,
          estado: item.rol?.estado === true || item.Rol?.Estado === true
        } : undefined
      }));

      this.setCache('usuarios', normalizedData);
      return normalizedData;
    } catch (error) {
      console.error('Error fetching usuarios:', error);
      throw error;
    }
  }

  async getUsuarioById(id: number): Promise<ApiUser | null> {
    try {
      const response = await this.request(`/Usuarios/${id}`);
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error('Error fetching usuario by ID:', error);
      return null;
    }
  }

  async createUsuario(userData: Partial<ApiUser>): Promise<ApiUser> {
    try {
      const apiBody = this.mapToApiFormat(userData);
      const response = await this.request('/Usuarios', {
        method: 'POST',
        body: JSON.stringify(apiBody),
      });
      const text = await response.text();
      return text ? JSON.parse(text) : { ...userData, id: 0 } as ApiUser;
    } catch (error) {
      console.error('Error creating usuario:', error);
      throw error;
    }
  }

  async updateUsuario(id: number, userData: Partial<ApiUser>): Promise<ApiUser> {
    try {
      const apiBody = this.mapToApiFormat(userData);
      apiBody.Id = id;
      const response = await this.request(`/Usuarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(apiBody),
      });
      const text = await response.text();
      return text ? JSON.parse(text) : { ...userData, id } as ApiUser;
    } catch (error) {
      console.error('Error updating usuario:', error);
      throw error;
    }
  }

  async updateUsuarioStatus(id: number, estado: boolean): Promise<void> {
    try {
      console.log(`🔄 [POST] Actualizando estado del usuario ${id} a ${estado}`);
      await this.request(`/Usuarios/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado: estado }),
      });
      console.log(`✅ Estado del usuario ${id} actualizado`);
    } catch (error) {
      console.error('Error updating usuario status:', error);
      throw error;
    }
  }

  async deleteUsuario(id: number): Promise<{ message: string; anonimizado: boolean }> {
    try {
      const response = await this.request(`/Usuarios/${id}`, { method: 'DELETE' });
      const text = await response.text();
      if (text) {
        try { return JSON.parse(text); } catch { /* no json */ }
      }
      return { message: 'Eliminado', anonimizado: false };
    } catch (error: any) {
      console.error('Error deleting usuario:', error);
      throw error;
    }
  }

  async authenticateUser(correo: string, contrasena: string): Promise<ApiUser | null> {
    try {
      // Este método ahora solo debe usarse para sincronización con Firebase
      // La autenticación principal debe manejarse a través de Firebase Auth
      console.warn('⚠️ authenticateUser está deprecado. Usa Firebase Auth para autenticación.');

      const usuarios = await this.getUsuarios();
      const user = usuarios.find(u => u.correo === correo);

      if (!user) {
        console.log('Usuario no encontrado:', correo);
        return null;
      }

      // Solo permitir autenticación local para usuarios sincronizados con Firebase
      if (user.contrasena === 'firebase_auth') {
        console.log('Usuario sincronizado con Firebase. Usa Firebase Auth para autenticación.');
        return null;
      }

      // Comparación normal de contraseñas para usuarios legacy
      if (user.contrasena === contrasena) {
        console.log('Autenticación local exitosa (legacy):', user.correo);
        return user;
      }

      console.log('Contraseña incorrecta para:', correo);
      return null;
    } catch (error: any) {
      console.error('Error en autenticación:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA ROLES ====================
  async getRoles(): Promise<any[]> {
    const cached = this.getCached<any[]>('roles');
    if (cached) return cached;
    try {
      console.log('📥 Obteniendo roles desde:', `${API_BASE_URL}/Roles`);
      const data = await this.fetchAllPages('/Roles');
      console.log('✅ Roles obtenidos:', data);
      const result = Array.isArray(data) ? data : [];
      this.setCache('roles', result);
      return result;
    } catch (error: any) {
      console.error('❌ Error obteniendo roles:', error);
      throw error;
    }
  }

  async getRoleById(id: number): Promise<any> {
    try {
      console.log(`📥 Obteniendo rol ${id} desde:`, `${API_BASE_URL}/Roles/${id}`);
      const response = await this.request(`/Roles/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Rol ${id} obtenido:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error obteniendo rol ${id}:`, error);
      throw error;
    }
  }

  async createRole(roleData: any): Promise<any> {
    try {
      const mapped = this.mapToApiFormat({ ...roleData, Nombre: roleData.nombre, Descripcion: roleData.descripcion });
      console.log('📤 Creando rol:', mapped);
      const response = await this.request('/Roles', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Rol creado:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error creando rol:', error);
      throw error;
    }
  }

  async updateRole(id: number, roleData: any): Promise<any> {
    try {
      const mapped = this.mapToApiFormat({ ...roleData, id });
      console.log(`📤 Actualizando rol ${id}:`, mapped);
      const response = await this.request(`/Roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Rol ${id} actualizado:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error actualizando rol ${id}:`, error);
      throw error;
    }
  }

  async deleteRole(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando rol ${id}...`);
      await this.request(`/Roles/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Rol ${id} eliminado`);
    } catch (error: any) {
      console.error(`❌ Error eliminando rol ${id}:`, error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA MÓDULOS ====================
  async getModulos(): Promise<any[]> {
    const cached = this.getCached<any[]>('modulos');
    if (cached) return cached;
    try {
      console.log('📥 Obteniendo módulos desde:', `${API_BASE_URL}/Modulos`);
      const data = await this.fetchAllPages('/Modulos');
      console.log('✅ Módulos obtenidos:', data);
      const result = Array.isArray(data) ? data : [];
      this.setCache('modulos', result);
      return result;
    } catch (error: any) {
      console.error('❌ Error obteniendo módulos:', error);
      throw error;
    }
  }

  async getModuloById(id: number): Promise<any> {
    try {
      console.log(`📥 Obteniendo módulo ${id}...`);
      const response = await this.request(`/Modulos/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Módulo ${id} obtenido:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error obteniendo módulo ${id}:`, error);
      throw error;
    }
  }

  async createModulo(moduloData: any): Promise<any> {
    try {
      const mapped = this.mapToApiFormat(moduloData);
      console.log('📤 Creando módulo:', mapped);
      const response = await this.request('/Modulos', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Módulo creado:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error creando módulo:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA ROLES-MÓDULOS ====================
  async getRolesModulos(): Promise<any[]> {
    try {
      console.log('📥 Obteniendo asignaciones rol-módulo desde:', `${API_BASE_URL}/RolesModulos`);
      const data = await this.fetchAllPages('/RolesModulos', 5);
      console.log('✅ Asignaciones rol-módulo obtenidas:', data);
      return Array.isArray(data) ? data : [];
    } catch (error: any) {
      console.error('❌ Error obteniendo asignaciones rol-módulo:', error);
      throw error;
    }
  }

  async getRolesModulosByRolId(rolId: number): Promise<any[]> {
    try {
      console.log(`📥 Obteniendo módulos del rol ${rolId}...`);
      const rolesModulos = await this.getRolesModulos();
      const filtered = rolesModulos.filter((rm: any) => rm.rolId === rolId);
      console.log(`✅ Módulos del rol ${rolId}:`, filtered);
      return filtered;
    } catch (error: any) {
      console.error(`❌ Error obteniendo módulos del rol ${rolId}:`, error);
      throw error;
    }
  }

  async createRolModulo(rolModuloData: any): Promise<any> {
    try {
      const mapped = {
        RolId: rolModuloData.rolId || rolModuloData.RolId,
        ModuloId: rolModuloData.moduloId || rolModuloData.ModuloId,
        PuedeVer: !!rolModuloData.puedeVer || !!rolModuloData.PuedeVer || true,
        PuedeCrear: !!rolModuloData.puedeCrear || !!rolModuloData.PuedeCrear || false,
        PuedeEditar: !!rolModuloData.puedeEditar || !!rolModuloData.PuedeEditar || false,
        PuedeEliminar: !!rolModuloData.puedeEliminar || !!rolModuloData.PuedeEliminar || false,
      };
      console.log('📤 Asignando módulo a rol:', mapped);
      const response = await this.request('/RolesModulos', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Módulo asignado al rol:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error asignando módulo a rol:', error);
      throw error;
    }
  }

  async updateRolModulo(id: number, rolModuloData: any): Promise<any> {
    try {
      const mapped = {
        Id: id,
        RolId: rolModuloData.rolId || rolModuloData.RolId,
        ModuloId: rolModuloData.moduloId || rolModuloData.ModuloId,
        PuedeVer: !!rolModuloData.puedeVer || !!rolModuloData.PuedeVer,
        PuedeCrear: !!rolModuloData.puedeCrear || !!rolModuloData.PuedeCrear,
        PuedeEditar: !!rolModuloData.puedeEditar || !!rolModuloData.PuedeEditar,
        PuedeEliminar: !!rolModuloData.puedeEliminar || !!rolModuloData.PuedeEliminar,
      };
      console.log(`📤 Actualizando asignación rol-módulo ${id}:`, mapped);
      const response = await this.request(`/RolesModulos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Asignación rol-módulo ${id} actualizada:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error actualizando asignación rol-módulo ${id}:`, error);
      throw error;
    }
  }

  async deleteRolModulo(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando asignación rol-módulo ${id}...`);
      await this.request(`/RolesModulos/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Asignación rol-módulo ${id} eliminada`);
    } catch (error: any) {
      console.error(`❌ Error eliminando asignación rol-módulo ${id}:`, error);
      throw error;
    }
  }

  async deleteRolesModulosByRolId(rolId: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando todas las asignaciones del rol ${rolId}...`);
      const rolesModulos = await this.getRolesModulos();
      const modulosDelRol = rolesModulos.filter((rm: any) => rm.rolId === rolId);

      for (const rm of modulosDelRol) {
        if (rm.id) {
          await this.deleteRolModulo(rm.id);
        }
      }
      console.log(`✅ Todas las asignaciones del rol ${rolId} han sido eliminadas`);
    } catch (error: any) {
      console.error(`❌ Error eliminando asignaciones del rol ${rolId}:`, error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA SERVICIOS ====================
  async getServicios(): Promise<Servicio[]> {
    const cached = this.getCached<Servicio[]>('servicios');
    if (cached) return cached;
    try {
      console.log('📥 Obteniendo servicios desde:', `${API_BASE_URL}/Servicios`);
      const arr = await this.fetchAllPages('/Servicios');
      const normalizedData = arr.map(item => this.normalizeServicioData(item));
      console.log('✅ Servicios normalizados:', normalizedData);
      this.setCache('servicios', normalizedData);
      return normalizedData;
    } catch (error: any) {
      console.error('❌ Error obteniendo servicios:', error);
      throw error;
    }
  }

  async getServiciosPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<PagedResponse<Servicio>> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 5));
    const q = args.q ?? '';
    const extra = { ...args };
    delete extra.page;
    delete extra.pageSize;
    delete extra.q;

    const query = this.buildQuery({ page, pageSize, q, ...extra });
    console.log('📥 Listando servicios paginados:', `${API_BASE_URL}/Servicios${query}`);
    const resp = await this.request(`/Servicios${query}`);
    const text = await resp.text();
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
      const normalizedItems = Array.isArray(data.items) ? data.items.map((i: any) => this.normalizeServicioData(i)) : [];
      const totalCount = Number(data.totalCount ?? normalizedItems.length);
      const totalPages = Number(data.totalPages ?? Math.max(1, Math.ceil(totalCount / (Number(data.pageSize) || pageSize))));
      return {
        items: normalizedItems,
        totalCount,
        page: Number(data.page ?? page),
        pageSize: Number(data.pageSize ?? pageSize),
        totalPages
      };
    }
    const arr: any[] = Array.isArray(data) ? data : [];
    const normalized = arr.map(item => this.normalizeServicioData(item));
    const totalCount = normalized.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const items = normalized.slice(start, start + pageSize);
    return { items, totalCount, page, pageSize, totalPages };
  }

  async getServicioById(id: number): Promise<Servicio | null> {
    try {
      console.log(`📥 Obteniendo servicio ${id} desde:`, `${API_BASE_URL}/Servicios/${id}`);
      const response = await this.request(`/Servicios/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Servicio ${id} obtenido:`, data);
      return data ? this.normalizeServicioData(data) : null;
    } catch (error: any) {
      console.error(`❌ Error obteniendo servicio ${id}:`, error);
      throw error;
    }
  }

  async createServicio(servicioData: Partial<Servicio>): Promise<Servicio> {
    try {
      const mapped = this.mapToApiFormat(servicioData);
      console.log('📤 Creando servicio:', mapped);
      const response = await this.request('/Servicios', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn('⚠️ Respuesta vacía al crear servicio en /Servicios');
        return this.normalizeServicioData(servicioData);
      }
      const data = JSON.parse(text);
      console.log('✅ Servicio creado:', data);
      return this.normalizeServicioData(data);
    } catch (error: any) {
      console.warn('❌ Error creando servicio en /Servicios, probando endpoint alterno /servicios...', error);
      const mapped = this.mapToApiFormat(servicioData);
      const response = await this.request('/servicios', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      if (!text || text.trim() === '') {
        console.warn('⚠️ Respuesta vacía al crear servicio en /servicios');
        return this.normalizeServicioData(servicioData);
      }
      const data = JSON.parse(text);
      console.log('✅ Servicio creado (fallback):', data);
      return this.normalizeServicioData(data);
    }
  }

  async updateServicio(id: number, servicioData: Partial<Servicio>): Promise<Servicio> {
    try {
      const mapped = this.mapToApiFormat({ ...servicioData, id });
      console.log(`📤 Actualizando servicio ${id}:`, mapped);
      const response = await this.request(`/Servicios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Servicio ${id} actualizado:`, data);
      return this.normalizeServicioData(data);
    } catch (error: any) {
      console.warn(`❌ Error actualizando servicio ${id} en /Servicios, probando /servicios...`, error);
      const mapped = this.mapToApiFormat({ ...servicioData, id });
      const response = await this.request(`/servicios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Servicio ${id} actualizado (fallback):`, data);
      return this.normalizeServicioData(data);
    }
  }

  async deleteServicio(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando servicio ${id}...`);
      await this.request(`/Servicios/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Servicio ${id} eliminado`);
    } catch (error: any) {
      console.warn(`❌ Error eliminando servicio ${id} en /Servicios, probando /servicios...`, error);
      await this.request(`/servicios/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Servicio ${id} eliminado (fallback)`);
    }
  }

  async updateServicioStatus(id: number, estado: boolean): Promise<void> {
    try {
      console.log(`🔄 Actualizando estado del servicio ${id} a ${estado}`);

      await this.request(`/Servicios/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: estado }),
      });

      console.log(`✅ Estado del servicio ${id} actualizado a ${estado}`);
    } catch (error: any) {
      console.warn(`❌ Error actualizando estado del servicio ${id} (PUT /Servicios), probando fallbacks...`, error);
      try {
        await this.request(`/Servicios/${id}/estado`, {
          method: 'POST',
          body: JSON.stringify({ estado: estado, Estado: estado }),
        });
        console.log(`✅ Estado del servicio ${id} actualizado (fallback POST /Servicios)`);
        return;
      } catch (e1) {
        console.warn(`❌ Falló POST /Servicios/${id}/estado, probando /servicios...`, e1);
      }
      try {
        await this.request(`/servicios/${id}/estado`, {
          method: 'PUT',
          body: JSON.stringify({ estado: estado, Estado: estado }),
        });
        console.log(`✅ Estado del servicio ${id} actualizado (fallback PUT /servicios)`);
        return;
      } catch (e2) {
        console.warn(`❌ Falló PUT /servicios/${id}/estado, probando POST /servicios...`, e2);
      }
      await this.request(`/servicios/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado: estado, Estado: estado }),
      });
      console.log(`✅ Estado del servicio ${id} actualizado (fallback POST /servicios)`);
    }
  }

  // ==================== MÉTODOS PARA PAQUETES ====================
  async getPaquetes(): Promise<Paquete[]> {
    const cached = this.getCached<Paquete[]>('paquetes');
    if (cached) return cached;
    try {
      console.log('📥 Obteniendo paquetes desde:', `${API_BASE_URL}/Paquetes`);
      const parsed = await this.fetchAllPages('/Paquetes');
      console.log('✅ Paquetes obtenidos');
      const arr: any[] = Array.isArray(parsed) ? parsed : [];
      const normalizedData = arr.map(item => this.normalizePaqueteData(item));
      console.log('✅ Paquetes normalizados:', normalizedData.length);
      this.setCache('paquetes', normalizedData);
      return normalizedData;
    } catch (error: any) {
      console.error('❌ Error obteniendo paquetes:', error);
      throw error;
    }
  }

  async getPaquetesPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<PagedResponse<Paquete>> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 5));
    const q = args.q ?? '';
    const extra = { ...args };
    delete extra.page;
    delete extra.pageSize;
    delete extra.q;

    const query = this.buildQuery({ page, pageSize, q, ...extra });
    console.log('📥 Listando paquetes paginados:', `${API_BASE_URL}/Paquetes${query}`);
    const resp = await this.request(`/Paquetes${query}`);
    const text = await resp.text();
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
      const normalizedItems = Array.isArray(data.items) ? data.items.map((i: any) => this.normalizePaqueteData(i)) : [];
      const totalCount = Number(data.totalCount ?? normalizedItems.length);
      const totalPages = Number(data.totalPages ?? Math.max(1, Math.ceil(totalCount / (Number(data.pageSize) || pageSize))));
      return {
        items: normalizedItems,
        totalCount,
        page: Number(data.page ?? page),
        pageSize: Number(data.pageSize ?? pageSize),
        totalPages
      };
    }
    const arr: any[] = Array.isArray(data) ? data : [];
    const normalized = arr.map(item => this.normalizePaqueteData(item));
    const totalCount = normalized.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const items = normalized.slice(start, start + pageSize);
    return { items, totalCount, page, pageSize, totalPages };
  }

  async getPaqueteById(id: number): Promise<Paquete | null> {
    try {
      console.log(`📥 Obteniendo paquete ${id} desde:`, `${API_BASE_URL}/Paquetes/${id}`);
      const response = await this.request(`/Paquetes/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Paquete ${id} obtenido:`, data);
      return data ? this.normalizePaqueteData(data) : null;
    } catch (error: any) {
      console.error(`❌ Error obteniendo paquete ${id}:`, error);
      throw error;
    }
  }

  async createPaquete(paqueteData: Partial<Paquete>): Promise<Paquete> {
    try {
      const mapped = this.mapToApiFormat(paqueteData);
      console.log('📤 Creando paquete:', mapped);
      const response = await this.request('/Paquetes', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Paquete creado:', data);
      return this.normalizePaqueteData(data);
    } catch (error: any) {
      console.error('❌ Error creando paquete:', error);
      throw error;
    }
  }

  async createPaqueteCompleto(paqueteData: any): Promise<Paquete> {
    try {
      const mapped = this.mapToApiFormat(paqueteData);
      console.log('📤 Creando paquete completo:', mapped);
      const response = await this.request('/Paquetes/completo', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Paquete completo creado:', data);
      return this.normalizePaqueteData(data);
    } catch (error: any) {
      console.error('❌ Error creando paquete completo:', error);
      throw error;
    }
  }

  async updatePaquete(id: number, paqueteData: Partial<Paquete>): Promise<Paquete> {
    try {
      const mapped = this.mapToApiFormat({ ...paqueteData, id });
      console.log(`📤 Actualizando paquete ${id}:`, mapped);
      const response = await this.request(`/Paquetes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Paquete ${id} actualizado:`, data);
      return this.normalizePaqueteData(data);
    } catch (error: any) {
      console.error(`❌ Error actualizando paquete ${id}:`, error);
      throw error;
    }
  }

  async updatePaqueteDetalles(id: number, detalles: Array<{ servicioId: number; cantidad: number }>): Promise<Paquete> {
    try {
      const mapped = this.mapToApiFormat({ detalles });
      console.log(`📤 Actualizando detalles del paquete ${id}:`, mapped);
      const response = await this.request(`/Paquetes/${id}/detalles`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Detalles del paquete ${id} actualizados:`, data);
      return data ? this.normalizePaqueteData(data) : await this.getPaqueteById(id) as Paquete;
    } catch (error: any) {
      console.error(`❌ Error actualizando detalles del paquete ${id}:`, error);
      throw error;
    }
  }

  async deletePaquete(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando paquete ${id}...`);
      await this.request(`/Paquetes/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Paquete ${id} eliminado`);
    } catch (error: any) {
      console.error(`❌ Error eliminando paquete ${id}:`, error);
      throw error;
    }
  }

  async updatePaqueteStatus(id: number, activo: boolean): Promise<void> {
    try {
      console.log(`📤 Actualizando estado del paquete ${id} a ${activo}...`);
      await this.request(`/Paquetes/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: activo }),
      });
      console.log(`✅ Estado del paquete ${id} actualizado`);
    } catch (error: any) {
      console.error(`❌ Error actualizando estado del paquete ${id}:`, error);
      throw error;
    }
  }

  // ==================== MÉTODOS PARA DETALLE PAQUETES ====================
  async getDetallePaquetes(): Promise<DetallePaquete[]> {
    try {
      console.log('📥 Obteniendo detalles de paquetes desde:', `${API_BASE_URL}/DetallePaquetes`);
      const data = await this.fetchAllPages('/DetallePaquetes', 5);
      console.log('✅ Detalles de paquetes obtenidos');
      const normalizedData = Array.isArray(data) ? data.map(item => this.normalizeDetallePaqueteData(item)) : [];
      console.log('✅ Detalles de paquetes normalizados:', normalizedData.length);
      return normalizedData;
    } catch (error: any) {
      console.error('❌ Error obteniendo detalles de paquetes:', error);
      throw error;
    }
  }

  async getDetallePaquetesByPaqueteId(paqueteId: number): Promise<DetallePaquete[]> {
    try {
      console.log(`📥 Obteniendo detalles del paquete ${paqueteId}...`);
      const data = await this.fetchAllPages(`/DetallePaquetes/paquete/${paqueteId}`, 5);
      const normalizedData = Array.isArray(data) ? data.map(item => this.normalizeDetallePaqueteData(item)) : [];
      console.log(`✅ Detalles del paquete ${paqueteId}:`, normalizedData.length);
      return normalizedData;
    } catch (error: any) {
      console.error(`❌ Error obteniendo detalles del paquete ${paqueteId}:`, error);
      throw error;
    }
  }

  async createDetallePaquete(detalleData: Partial<DetallePaquete>): Promise<DetallePaquete> {
    try {
      const mapped = this.mapToApiFormat(detalleData);
      console.log('📤 Creando detalle de paquete:', mapped);
      const response = await this.request('/DetallePaquetes', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Detalle de paquete creado:', data);
      return this.normalizeDetallePaqueteData(data);
    } catch (error: any) {
      console.error('❌ Error creando detalle de paquete:', error);
      throw error;
    }
  }

  async updateDetallePaquete(id: number, detalleData: Partial<DetallePaquete>): Promise<DetallePaquete> {
    try {
      const mapped = this.mapToApiFormat({ ...detalleData, id });
      console.log(`📤 Actualizando detalle de paquete ${id}:`, mapped);
      const response = await this.request(`/DetallePaquetes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Detalle de paquete ${id} actualizado:`, data);
      return this.normalizeDetallePaqueteData(data);
    } catch (error: any) {
      console.error(`❌ Error actualizando detalle de paquete ${id}:`, error);
      throw error;
    }
  }

  async deleteDetallePaquete(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando detalle de paquete ${id}...`);
      await this.request(`/DetallePaquetes/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Detalle de paquete ${id} eliminado`);
    } catch (error: any) {
      console.error(`❌ Error eliminando detalle de paquete ${id}:`, error);
      throw error;
    }
  }

  async deleteDetallePaquetesByPaqueteId(paqueteId: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando todos los detalles del paquete ${paqueteId}...`);
      const detalles = await this.getDetallePaquetesByPaqueteId(paqueteId);

      for (const detalle of detalles) {
        if (detalle.id) {
          await this.deleteDetallePaquete(detalle.id);
        }
      }
      console.log(`✅ Todos los detalles del paquete ${paqueteId} han sido eliminados`);
    } catch (error: any) {
      console.error(`❌ Error eliminando detalles del paquete ${paqueteId}:`, error);
      throw error;
    }
  }
}

export const apiService = new ApiService();
