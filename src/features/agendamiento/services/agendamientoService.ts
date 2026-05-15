import { auth } from '../../../shared/services/firebase';

const API_BASE_URL = '/api';

/** Producto del agendamiento con cantidad e imagen (estructura nueva). */
export interface AgendamientoProductoDTO {
    productoId: number;
    nombre: string;
    cantidad: number;
    imagen?: string | null;
    precioVenta?: number | null;
}

/** Servicio del agendamiento con duración e imagen (estructura nueva). */
export interface AgendamientoServicioDTO {
    servicioId: number;
    nombre: string;
    duracion?: number | null;
    imagen?: string | null;
    precio?: number | null;
}

export interface Agendamiento {
    id: number;
    clienteId: number;
    clienteNombre: string;
    clienteTelefono: string;
    clienteFotoPerfil: string | null;
    barberoId: number;
    barberoNombre: string;
    servicioId: number | null;
    servicioIds: number[];
    servicioNombre: string;
    serviciosNombres: string[];
    paqueteId: number | null;
    paqueteNombre: string | null;
    /** @deprecated usar `productos` */
    productoIds: number[];
    productosNombres: string[];
    /** Productos con cantidad e imagen (estructura nueva de la API). */
    productos: AgendamientoProductoDTO[];
    /** Servicios con duración e imagen (estructura nueva de la API). */
    servicios: AgendamientoServicioDTO[];
    fecha: string;
    hora: string;
    duracion: number;
    precio: number;
    estado: string;
    notas: string;
}

export interface AgendamientoProductoInput {
    productoId: number;
    cantidad: number;
}

export interface CreateAgendamientoData {
    clienteId: number;
    barberoId: number;
    servicioId: number | null;
    servicioIds?: number[];
    /** OBSOLETO: usar `productos: [{productoId, cantidad}]`. Se mantiene por compat. */
    productoIds?: number[];
    /** Productos del agendamiento con cantidad (estructura nueva). */
    productos?: AgendamientoProductoInput[];
    paqueteId: number | null;
    fecha: string;
    hora: string;
    duracion: number;
    precio: number;
    estado: string;
    notas: string;
}

export interface UpdateAgendamientoData extends CreateAgendamientoData {
    id: number;
}

class AgendamientoService {
    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        let token = null;
        if (auth.currentUser) {
            token = await auth.currentUser.getIdToken();
        }

        const config: RequestInit = {
            ...options,
            headers: {
                ...options.headers,
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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

    async getVentaPorAgendamiento(id: number): Promise<any> {
        const response = await this.request(`/Ventas/por-agendamiento/${id}`);
        const text = await response.text();
        try {
            return text ? JSON.parse(text) : {};
        } catch {
            return {};
        }
    }

    mapApiToComponent(api: any): Agendamiento {
        if (!api) return this.getDefaultAgendamiento();

        const fechaHoraStr = api.fechaHora || api.FechaHora || '';
        let fecha = '';
        let hora = '';

        if (fechaHoraStr) {
            // Parsear directamente del string para evitar desfases de zona horaria.
            // El backend devuelve "YYYY-MM-DDTHH:MM:SS" — extraemos los componentes sin
            // pasar por new Date() que convertiría UTC a local y añadiría minutos extra.
            const match = fechaHoraStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
            if (match) {
                fecha = `${match[1]}-${match[2]}-${match[3]}`;
                // Redondear minutos al múltiplo de 30 más cercano para evitar
                // que minutos residuales del servidor desplacen la cita de su franja
                const hh = parseInt(match[4]);
                const mm = parseInt(match[5]);
                const mmRedondeado = mm < 15 ? 0 : mm < 45 ? 30 : 0;
                const hhAjustado = mm >= 45 ? hh + 1 : hh;
                hora = `${String(hhAjustado).padStart(2, '0')}:${String(mmRedondeado).padStart(2, '0')}`;
            } else {
                // Fallback: parsear con Date solo si el string no tiene formato esperado
                const dt = new Date(fechaHoraStr);
                const y = dt.getFullYear();
                const mo = String(dt.getMonth() + 1).padStart(2, '0');
                const d = String(dt.getDate()).padStart(2, '0');
                fecha = `${y}-${mo}-${d}`;
                hora = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
            }
        }

        // Extraer duración numérica (de "60 minutos" a 60)
        let duracionNum = 60;
        const durStr = api.duracion || api.Duracion;
        if (typeof durStr === 'string') {
            duracionNum = parseInt(durStr) || 60;
        } else if (typeof durStr === 'number') {
            duracionNum = durStr;
        }

        // Intento robusto de obtener nombres de cliente, barbero y servicio
        const clienteNom = api.clienteNombre || api.ClienteNombre ||
            api.clienteNombreCompleto || api.ClienteNombreCompleto ||
            (api.cliente ? `${api.cliente.nombre || api.cliente.nombres || api.cliente.Nombre || ''} ${api.cliente.apellido || api.cliente.apellidos || api.cliente.Apellido || ''}`.trim() : '') ||
            'Cliente Desconocido';

        const barberoNom = api.barberoNombre || api.BarberoNombre ||
            api.barberoNombreCompleto || api.BarberoNombreCompleto ||
            (api.barbero ? `${api.barbero.nombre || api.barbero.nombres || api.barbero.Nombre || ''} ${api.barbero.apellido || api.barbero.apellidos || api.barbero.Apellido || ''}`.trim() : '') ||
            'Barbero Desconocido';

        const servicioNom = api.servicioNombre || api.ServicioNombre ||
            api.nombreServicio || api.NombreServicio ||
            api.servicio?.nombre || api.Servicio?.Nombre ||
            (api.paqueteNombre || api.PaqueteNombre) || 'Servicio';
            
        const rawServicioIds = api.servicioIds || api.ServicioIds || [];
        const servicioIds = Array.isArray(rawServicioIds)
            ? rawServicioIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
            : [];
            
        const serviciosNombresRaw = api.serviciosNombres || api.ServiciosNombres || [];
        const serviciosNombres = Array.isArray(serviciosNombresRaw)
            ? serviciosNombresRaw.map((nombre: any) => String(nombre)).filter((nombre: string) => nombre.trim().length > 0)
            : [];
            
        if (servicioIds.length === 0 && (api.servicioId || api.ServicioId)) {
            servicioIds.push(Number(api.servicioId || api.ServicioId));
        }
        if (serviciosNombres.length === 0 && servicioNom) {
            serviciosNombres.push(String(servicioNom));
        }

        // Extraer productos del agendamiento (legacy)
        const rawProductoIds = api.productoIds || api.ProductoIds || [];
        const productoIds = Array.isArray(rawProductoIds)
            ? rawProductoIds.map((id: any) => Number(id)).filter((id: number) => Number.isFinite(id) && id > 0)
            : [];
        const productosNombresRaw = api.productosNombres || api.ProductosNombres || [];
        const productosNombres = Array.isArray(productosNombresRaw)
            ? productosNombresRaw.map((nombre: any) => String(nombre)).filter((nombre: string) => nombre.trim().length > 0)
            : [];

        // Estructura nueva: productos[] con cantidad e imagen
        const productosRaw = api.productos || api.Productos || [];
        const productos: AgendamientoProductoDTO[] = Array.isArray(productosRaw)
            ? productosRaw.map((p: any) => ({
                productoId: Number(p.productoId ?? p.ProductoId ?? 0),
                nombre: String(p.nombre ?? p.Nombre ?? ''),
                cantidad: Number(p.cantidad ?? p.Cantidad ?? 1),
                imagen: p.imagen ?? p.Imagen ?? null,
                precioVenta: p.precioVenta ?? p.PrecioVenta ?? null
            }))
            : [];

        // Estructura nueva: servicios[] con duración e imagen
        const serviciosRaw = api.servicios || api.Servicios || [];
        const servicios: AgendamientoServicioDTO[] = Array.isArray(serviciosRaw)
            ? serviciosRaw.map((s: any) => ({
                servicioId: Number(s.servicioId ?? s.ServicioId ?? 0),
                nombre: String(s.nombre ?? s.Nombre ?? ''),
                duracion: s.duracion ?? s.Duracion ?? null,
                imagen: s.imagen ?? s.Imagen ?? null,
                precio: s.precio ?? s.Precio ?? null
            }))
            : [];

        return {
            id: Number(api.id || api.Id || 0),
            clienteId: Number(api.clienteId || api.ClienteId || 0),
            clienteNombre: clienteNom,
            clienteTelefono: api.clienteTelefono || api.ClienteTelefono || api.cliente?.telefono || api.Cliente?.Telefono || '',
            clienteFotoPerfil: api.clienteFotoPerfil || api.ClienteFotoPerfil || api.cliente?.fotoPerfil || api.Cliente?.FotoPerfil || null,
            barberoId: Number(api.barberoId || api.BarberoId || 0),
            barberoNombre: barberoNom,
            servicioId: api.servicioId || api.ServicioId ? Number(api.servicioId || api.ServicioId) : null,
            servicioIds,
            servicioNombre: servicioNom,
            serviciosNombres,
            paqueteId: api.paqueteId || api.PaqueteId ? Number(api.paqueteId || api.PaqueteId) : null,
            paqueteNombre: api.paqueteNombre || api.PaqueteNombre || null,
            productoIds,
            productosNombres,
            productos,
            servicios,
            fecha: fecha,
            hora: hora,
            duracion: duracionNum,
            precio: api.precio || api.Precio || 0,
            estado: api.estado || api.Estado || 'Pendiente',
            notas: api.notas || api.Notas || ''
        };
    }

    private getDefaultAgendamiento(): Agendamiento {
        return {
            id: 0, clienteId: 0, clienteNombre: 'Desconocido', clienteTelefono: '', clienteFotoPerfil: null,
            barberoId: 0, barberoNombre: 'Desconocido', servicioId: 0, servicioIds: [], servicioNombre: 'Servicio', serviciosNombres: [],
            paqueteId: null, paqueteNombre: null, productoIds: [], productosNombres: [],
            productos: [], servicios: [],
            fecha: '', hora: '', duracion: 60, precio: 0, estado: 'Pendiente', notas: ''
        };
    }

    async getAgendamientosByClienteId(clienteId: number): Promise<Agendamiento[]> {
        const response = await this.request(`/Agendamientos/cliente/${clienteId}?page=1&pageSize=100`);
        const text = await response.text();

        if (!text || !text.trim()) return [];

        try {
            const raw = JSON.parse(text);
            const data = Array.isArray(raw)
                ? raw
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) ? (raw as any).items
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) ? (raw as any).data
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).$values)) ? (raw as any).$values
                : [];
            return data.map(item => this.mapApiToComponent(item));
        } catch (e) {
            console.warn('Error parsing agendamientos by cliente ID:', e);
            return [];
        }
    }

    async getAgendamientos(): Promise<Agendamiento[]> {
        const response = await this.request('/Agendamientos?page=1&pageSize=100');
        let text = await response.text();

        if (!text || !text.trim()) return [];

        try {
            const raw = JSON.parse(text);
            const data = Array.isArray(raw)
                ? raw
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) ? (raw as any).items
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) ? (raw as any).data
                : (raw && typeof raw === 'object' && Array.isArray((raw as any).$values)) ? (raw as any).$values
                : [];
            return data.map(item => this.mapApiToComponent(item));
        } catch (e) {
            console.warn('Reparando JSON truncado...');
            const lastBrace = text.lastIndexOf('}');
            if (lastBrace !== -1) {
                try {
                    const repaired = text.substring(0, lastBrace + 1) + ']';
                    const data = JSON.parse(repaired);
                    return Array.isArray(data) ? data.map(item => this.mapApiToComponent(item)) : [];
                } catch { return []; }
            }
            return [];
        }
    }

    async getAgendamientoById(id: number): Promise<Agendamiento> {
        const response = await this.request(`/Agendamientos/${id}`);
        const result = await response.json();
        return this.mapApiToComponent(result);
    }

    async createAgendamiento(data: CreateAgendamientoData): Promise<Agendamiento> {
        const [y, m, d] = (data.fecha || '').split('-').map(Number);
        const [h, min] = (data.hora || '00:00').split(':').map(Number);

        const safeY = y || new Date().getFullYear();
        const safeM = (m && m >= 1) ? m : new Date().getMonth() + 1;
        const safeD = d || new Date().getDate();
        const safeH = h ?? 0;
        const safeMin = min ?? 0;

        // Construir ISO local (sin Z) para no desplazar por zona horaria
        const pad = (n: number) => String(n).padStart(2, '0');
        const localIsoStr = `${safeY}-${pad(safeM)}-${pad(safeD)}T${pad(safeH)}:${pad(safeMin)}:00`;

        const apiBody = {
            ClienteId: data.clienteId,
            BarberoId: data.barberoId,
            ServicioId: data.servicioId,
            ServicioIds: data.servicioIds && data.servicioIds.length > 0 ? data.servicioIds : undefined,
            // Estructura nueva con cantidad
            Productos: data.productos && data.productos.length > 0
                ? data.productos.map(p => ({ ProductoId: p.productoId, Cantidad: Math.max(1, p.cantidad || 1) }))
                : undefined,
            // Legacy (compat) — solo se envía si no se usó `productos[]`
            ProductoIds: (!data.productos || data.productos.length === 0) && data.productoIds && data.productoIds.length > 0
                ? data.productoIds
                : undefined,
            PaqueteId: data.paqueteId,
            FechaHora: localIsoStr,
            Duracion: `${data.duracion} minutos`,
            Precio: data.precio,
            Notas: data.notas,
            Estado: data.estado || 'Pendiente'
        };

        const response = await this.request('/Agendamientos', {
            method: 'POST',
            body: JSON.stringify(apiBody)
        });
        const result = await response.json();
        return this.mapApiToComponent(result);
    }

    async deleteAgendamiento(id: number): Promise<void> {
        // El usuario indica que PUT/DELETE ya funcionan en el servidor.
        const response = await this.request(`/Agendamientos/${id}`, { method: 'DELETE' });

        if (!response.ok) {
            console.error(`Error al eliminar agendamiento ${id}:`, response.status);
        }
    }

    async updateAgendamiento(id: number, data: CreateAgendamientoData): Promise<Agendamiento> {
        const [y, m, d] = (data.fecha || '').split('-').map(Number);
        const [h, min] = (data.hora || '00:00').split(':').map(Number);

        const safeY = y || new Date().getFullYear();
        const safeM = (m && m >= 1) ? m : new Date().getMonth() + 1;
        const safeD = d || new Date().getDate();
        const safeH = h ?? 0;
        const safeMin = min ?? 0;

        // Construir ISO local (sin Z) para no desplazar por zona horaria
        const pad = (n: number) => String(n).padStart(2, '0');
        const localIsoStr = `${safeY}-${pad(safeM)}-${pad(safeD)}T${pad(safeH)}:${pad(safeMin)}:00`;

        const apiBody = {
            Id: id,
            ClienteId: data.clienteId,
            BarberoId: data.barberoId,
            ServicioId: data.servicioId,
            ServicioIds: data.servicioIds && data.servicioIds.length > 0 ? data.servicioIds : undefined,
            // Estructura nueva con cantidad
            Productos: data.productos && data.productos.length > 0
                ? data.productos.map(p => ({ ProductoId: p.productoId, Cantidad: Math.max(1, p.cantidad || 1) }))
                : undefined,
            // Legacy (compat) — solo se envía si no se usó `productos[]`
            ProductoIds: (!data.productos || data.productos.length === 0) && data.productoIds && data.productoIds.length > 0
                ? data.productoIds
                : undefined,
            PaqueteId: data.paqueteId,
            FechaHora: localIsoStr,
            Duracion: `${data.duracion} minutos`,
            Precio: data.precio,
            Notas: data.notas,
            Estado: data.estado || 'Pendiente'
        };

        const response = await this.request(`/Agendamientos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(apiBody)
        });

        // El backend devuelve NoContent (204), así que no intentamos parsear JSON
        if (response.status === 204) {
            return this.mapApiToComponent({
                ...apiBody,
                id: id
            });
        }

        const result = await response.json();
        return this.mapApiToComponent(result);
    }

    async updateAgendamientoStatus(id: number, estado: string): Promise<any> {
        const response = await this.request(`/Agendamientos/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
        const text = await response.text();
        try {
            const data = text ? JSON.parse(text) : {};
            return data;
        } catch {
            return { message: 'Estado actualizado', estadoActual: estado, agendamientoId: id };
        }
    }
}

export const agendamientoService = new AgendamientoService();
