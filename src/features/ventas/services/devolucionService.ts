import { httpClient } from '../../../shared/services/httpClient';

export interface Devolucion {
    id: number;
    ventaId: number;
    clienteId: number | null;
    clienteNombre?: string;
    clienteDocumento?: string;
    productoId: number;
    productoNombre?: string;
    cantidad: number;
    monto: number;
    saldoAFavor: number;
    motivo: string;
    fecha: string;
    estado: string;
    usuarioId: number;
    responsableNombre?: string;
    observaciones?: string;
    barberoId?: number;
    barberoNombre?: string;
}

export interface CreateDevolucionRequest {
    ventaId: number;
    productoId: number;
    servicioId?: number;
    clienteId: number | null;
    cantidad: number;
    motivoCategoria: string;
    motivoDetalle: string;
    montoDevuelto: number;
    saldoAFavor: number;
    usuarioId: number;
    observaciones?: string;
}

class DevolucionService {
    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
        };

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            console.log(`🚀 DevolucionService [${config.method || 'GET'}]: ${url}`);
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ DevolucionService Error [${response.status}]: ${errorText}`);
                throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
            }

            return response;
        } catch (error: any) {
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                console.error('🛑 ERROR DE RED/CORS: La petición fue bloqueada o el servidor cerró la conexión.');
                console.warn('Posibles causas:\n1. Referencias circulares en C# (quita los .Include del PUT).\n2. El hosting Somee bloquea verbos PUT/DELETE.\n3. Error de CORS en el Preflight (OPTIONS).');
            }
            console.error('DevolucionService Network/API Error:', error);
            throw error;
        }
    }

    private async normalizeDevolucionData(data: any): Promise<Devolucion> {
        if (!data) return {} as Devolucion;

        // La API ahora usa proyecciones (Select) y devuelve objetos planos
        const producto = data.producto || data.Producto;
        const usuario = data.usuario || data.Usuario;
        const cliente = data.cliente || data.Cliente;
        const barbero = data.barbero || data.Barbero;

        return {
            id: Number(data.id || data.Id),
            ventaId: data.ventaId || data.VentaId || 0,
            clienteId: data.clienteId || data.ClienteId || null,
            clienteNombre: cliente
                ? (cliente.nombre || cliente.Nombre || 'Cliente')
                : (data.clienteNombre || data.ClienteNombre || 'Cliente'),
            clienteDocumento: cliente
                ? (cliente.documento || cliente.Documento || cliente.usuario?.documento || cliente.usuario?.Documento || '')
                : (data.clienteDocumento || data.ClienteDocumento || data.cliente?.documento || data.cliente?.Documento || ''),
            productoId: data.productoId || data.ProductoId || 0,
            productoNombre: producto?.nombre || producto?.Nombre || 'Producto',
            cantidad: Number(data.cantidad || data.Cantidad || 0),
            monto: Number(data.montoDevuelto || data.MontoDevuelto || 0),
            saldoAFavor: Number(data.saldoAFavor || data.SaldoAFavor || 0),
            motivo: data.motivoCategoria || data.MotivoCategoria || '',
            fecha: data.fecha || data.Fecha || new Date().toISOString(),
            estado: (() => {
                const raw = (data.estado || data.Estado || 'Activo').toString().trim().toLowerCase();
                if (raw === 'activo' || raw === 'completada' || raw === 'completado') return 'Completada';
                if (raw === 'anulado' || raw === 'anulada') return 'Anulada';
                if (raw === 'pendiente') return 'Pendiente';
                if (raw === 'procesado') return 'Procesado';
                return 'Completada';
            })(),
            usuarioId: data.usuarioId || data.UsuarioId || 0,
            responsableNombre: usuario
                ? (usuario.nombre || usuario.Nombre || 'Responsable')
                : 'Responsable',
            observaciones: data.observaciones || data.Observaciones || '',
            barberoId: barbero ? Number(barbero.id || barbero.Id || 0) : (data.barberoId || data.BarberoId || undefined),
            barberoNombre: barbero
                ? (barbero.nombre || barbero.Nombre || barbero.usuario?.nombre || barbero.Usuario?.Nombre || 'Barbero')
                : (data.barberoNombre || data.BarberoNombre || undefined),
        };
    }

  async getDevolucionesByClienteId(clienteId: number): Promise<Devolucion[]> {
    try {
        const response = await this.request(`/Devoluciones/cliente/${clienteId}`);
        const text = await response.text();
        const parsed = text ? JSON.parse(text) : [];
        const arr: any[] = Array.isArray(parsed)
          ? parsed
          : (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) ? parsed.items : [];
        return await Promise.all(arr.map((item: any) => this.normalizeDevolucionData(item)));
    } catch (error) {
        console.warn('Error fetching devoluciones by clienteId, filtering local:', error);
        const all = await this.getDevoluciones();
        return all.filter(d => Number(d.clienteId) === Number(clienteId));
    }
  }

  async getDevoluciones(): Promise<Devolucion[]> {
    try {
      const data = await httpClient.get('/Devoluciones');
      const items = Array.isArray(data) ? data : (data.items || []);
      return await Promise.all(items.map(v => this.normalizeDevolucionData(v)));
    } catch (error: any) {
      console.error('❌ Error obteniendo devoluciones:', error);
      throw error;
    }
  }

  async createDevolucion(data: CreateDevolucionRequest): Promise<Devolucion> {
    try {
      const result = await httpClient.post('/Devoluciones', data);
      return await this.normalizeDevolucionData(result);
    } catch (error: any) {
      console.error('❌ Error creando devolución:', error);
      throw error;
    }
  }

    async updateDevolucionStatus(id: number, estado: string): Promise<void> {
        try {
            console.log(`📤 [POST] Actualizando estado devolución ${id} a: ${estado}`);

            // Cambiamos a POST para evitar bloqueos del servidor Somee
            await this.request(`/Devoluciones/${id}/estado`, {
                method: 'POST',
                body: JSON.stringify({ estado: estado }),
            });
        } catch (error) {
            console.error(`Error al actualizar estado de Devolucion ${id}:`, error);
            throw error;
        }
    }

    async createDevolucionBatch(input: {
        ventaId: number;
        clienteId: number | null;
        barberoId?: number | null;
        usuarioId: number;
        motivoCategoria: string;
        observaciones?: string;
        items: Array<{ productoId: number; cantidad: number; montoDevuelto: number }>;
    }): Promise<void> {
        try {
            const payload = {
                VentaId: input.ventaId,
                ClienteId: input.clienteId,
                BarberoId: input.barberoId,
                UsuarioId: input.usuarioId,
                MotivoCategoria: input.motivoCategoria,
                Observaciones: input.observaciones || '',
                Items: input.items.map(it => ({
                    ProductoId: it.productoId,
                    Cantidad: it.cantidad,
                    MontoDevuelto: it.montoDevuelto
                }))
            };
            console.log('📤 Creando devolución en lote:', payload);
            await this.request('/Devoluciones/lote', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (error) {
            console.error('Error creating devolucion batch:', error);
            throw error;
        }
    }

  async deleteDevolucion(id: number): Promise<void> {
    try {
      await httpClient.delete(`/Devoluciones/${id}`);
    } catch (error: any) {
      console.error(`❌ Error eliminando devolución ${id}:`, error);
      throw error;
    }
  }

    /**
     * Anula una devolución (soft delete).
     * Endpoint API: POST /Devoluciones/{id}/anular
     */
    async anularDevolucion(id: number): Promise<void> {
        try {
            await this.request(`/Devoluciones/${id}/anular`, {
                method: 'POST',
            });
        } catch (error) {
            console.error(`Error anulando devolucion ${id}:`, error);
            throw error;
        }
    }

    /**
     * Obtiene devoluciones filtradas por cliente.
     * Endpoint API: GET /Devoluciones/cliente/{clienteId}
     */
    async getDevolucionesPorCliente(clienteId: number, page = 1, pageSize = 20): Promise<any> {
        try {
            const response = await this.request(`/Devoluciones/cliente/${clienteId}?page=${page}&pageSize=${pageSize}`);
            const text = await response.text();
            return text ? JSON.parse(text) : { items: [], totalCount: 0 };
        } catch (error) {
            console.error(`Error obteniendo devoluciones del cliente ${clienteId}:`, error);
            throw error;
        }
    }
}

export const devolucionService = new DevolucionService();
export default devolucionService;
