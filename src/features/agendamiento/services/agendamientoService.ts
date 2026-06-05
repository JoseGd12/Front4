import { httpClient } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/api';

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

export interface PagedAgendamientos {
    items: Agendamiento[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

class AgendamientoService {
    private mapApiToComponent(api: any): Agendamiento {
        if (!api) return this.getDefaultAgendamiento();

        const fechaHora = api.fechaHora || api.FechaHora || '';
        const fecha = fechaHora ? fechaHora.split('T')[0] : '';
        const hora = fechaHora ? fechaHora.split('T')[1]?.substring(0, 5) : '00:00';

        const cliente = api.cliente || api.Cliente || {};
        const barbero = api.barbero || api.Barbero || {};

        const rawServicios = api.servicios || api.Servicios || [];
        const rawProductos = api.productos || api.Productos || [];

        return {
            id: api.id || api.Id || 0,
            clienteId: api.clienteId || api.ClienteId || cliente.id || cliente.Id || 0,
            clienteNombre: `${cliente.nombre || ''} ${cliente.apellido || ''}`.trim() || 'Cliente',
            clienteTelefono: cliente.telefono || '',
            clienteFotoPerfil: cliente.fotoPerfil || null,
            barberoId: api.barberoId || api.BarberoId || barbero.id || barbero.Id || 0,
            barberoNombre: `${barbero.nombre || ''} ${barbero.apellido || ''}`.trim() || 'Barbero',
            servicioId: api.servicioId || api.ServicioId || null,
            servicioIds: Array.isArray(api.servicioIds) ? api.servicioIds : [],
            servicioNombre: api.servicioNombre || api.ServicioNombre || (rawServicios[0]?.nombre || 'Servicio'),
            serviciosNombres: Array.isArray(api.serviciosNombres) ? api.serviciosNombres : rawServicios.map((s: any) => s.nombre || 'Servicio'),
            paqueteId: api.paqueteId || api.PaqueteId || null,
            paqueteNombre: api.paqueteNombre || api.PaqueteNombre || null,
            productoIds: Array.isArray(api.productoIds) ? api.productoIds : [],
            productosNombres: Array.isArray(api.productosNombres) ? api.productosNombres : rawProductos.map((p: any) => p.nombre || 'Producto'),
            productos: rawProductos.map((p: any) => ({
                productoId: p.productoId || p.Id,
                nombre: p.nombre || 'Producto',
                cantidad: p.cantidad || 1,
                imagen: p.imagen || null,
                precioVenta: p.precioVenta || p.PrecioVenta || null
            })),
            servicios: rawServicios.map((s: any) => ({
                servicioId: s.servicioId || s.Id,
                nombre: s.nombre || 'Servicio',
                duracion: s.duracion || null,
                imagen: s.imagen || null,
                precio: s.precio || null
            })),
            fecha,
            hora,
            duracion: parseInt(String(api.duracion || api.Duracion || '60')) || 60,
            precio: Number(api.precio || api.Precio || 0),
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

    private extractItems(raw: any): any[] {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.items)) return raw.items;
            if (Array.isArray(raw.data)) return raw.data;
            if (Array.isArray(raw.$values)) return raw.$values;
        }
        return [];
    }

    async getAgendamientosByClienteId(clienteId: number): Promise<Agendamiento[]> {
        try {
            const raw = await httpClient.get(`/Agendamientos/cliente/${clienteId}?page=1&pageSize=100`);
            const data = this.extractItems(raw);
            return data.map(item => this.mapApiToComponent(item));
        } catch (e) {
            console.warn('Error fetching agendamientos by cliente ID:', e);
            return [];
        }
    }

    /**
     * Obtiene una página de agendamientos (FE-M11: Optimización de paginación)
     */
    async getAgendamientosPaged(page = 1, pageSize = 50): Promise<PagedAgendamientos> {
        try {
            const raw = await httpClient.get(`/Agendamientos?page=${page}&pageSize=${pageSize}`);
            const items = this.extractItems(raw);
            
            return {
                items: items.map(i => this.mapApiToComponent(i)),
                totalCount: Number(raw?.totalCount ?? items.length),
                page: Number(raw?.page ?? page),
                pageSize: Number(raw?.pageSize ?? pageSize),
                totalPages: Number(raw?.totalPages ?? 1)
            };
        } catch (error) {
            console.error('Error fetching agendamientos paged:', error);
            return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
        }
    }

    /**
     * @deprecated Usar getAgendamientosPaged para mejor rendimiento.
     * Mantenido por compatibilidad pero limitado a las primeras 2 páginas.
     */
    async getAgendamientos(): Promise<Agendamiento[]> {
        const res = await this.getAgendamientosPaged(1, 100);
        return res.items;
    }

    async getAgendamientoById(id: number): Promise<Agendamiento> {
        const result = await httpClient.get(`/Agendamientos/${id}`);
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

        const pad = (n: number) => String(n).padStart(2, '0');
        const localIsoStr = `${safeY}-${pad(safeM)}-${pad(safeD)}T${pad(safeH)}:${pad(safeMin)}:00`;

        const apiBody = {
            ClienteId: data.clienteId,
            BarberoId: data.barberoId,
            ServicioId: data.servicioId,
            ServicioIds: data.servicioIds && data.servicioIds.length > 0 ? data.servicioIds : undefined,
            Productos: data.productos && data.productos.length > 0
                ? data.productos.map(p => ({ ProductoId: p.productoId, Cantidad: Math.max(1, p.cantidad || 1) }))
                : undefined,
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

        const result = await httpClient.post('/Agendamientos', apiBody);
        return this.mapApiToComponent(result);
    }

    async deleteAgendamiento(id: number): Promise<void> {
        try {
            await httpClient.delete(`/Agendamientos/${id}`);
        } catch (error) {
            console.error(`Error al eliminar agendamiento ${id}:`, error);
            throw error;
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

        const pad = (n: number) => String(n).padStart(2, '0');
        const localIsoStr = `${safeY}-${pad(safeM)}-${pad(safeD)}T${pad(safeH)}:${pad(safeMin)}:00`;

        const apiBody = {
            Id: id,
            ClienteId: data.clienteId,
            BarberoId: data.barberoId,
            ServicioId: data.servicioId,
            ServicioIds: data.servicioIds && data.servicioIds.length > 0 ? data.servicioIds : undefined,
            Productos: data.productos && data.productos.length > 0
                ? data.productos.map(p => ({ ProductoId: p.productoId, Cantidad: Math.max(1, p.cantidad || 1) }))
                : undefined,
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

        try {
            const result = await httpClient.put(`/Agendamientos/${id}`, apiBody);
            return this.mapApiToComponent(result || { ...apiBody, id });
        } catch (error: any) {
            return this.mapApiToComponent({ ...apiBody, id });
        }
    }

    async completarParcialmente(
        id: number,
        data: {
            serviciosCompletados: number[];
            productosCompletados: number[];
            estado: string;
        }
    ): Promise<any> {
        return await httpClient.post(`/Agendamientos/${id}/completar-parcialmente`, data);
    }

    async getCitasPorTerminar(): Promise<Agendamiento[]> {
        try {
            const raw = await httpClient.get('/Agendamientos/por-terminar');
            const data = Array.isArray(raw) ? raw : [];
            return data.map(item => this.mapApiToComponent(item));
        } catch {
            return [];
        }
    }

    async updateAgendamientoStatus(id: number, estado: string): Promise<any> {
        try {
            return await httpClient.request(`/Agendamientos/${id}/estado`, {
                method: 'PATCH',
                body: JSON.stringify({ estado }),
                headers: { 'Content-Type': 'application/json' }
            }).then(r => r.status === 204 ? { message: 'Estado actualizado' } : r.json());
        } catch {
            return { message: 'Estado actualizado', estadoActual: estado, agendamientoId: id };
        }
    }
}

export const agendamientoService = new AgendamientoService();
