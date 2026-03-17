const API_BASE_URL = '/api';

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
    entregaId?: number;
    entregaEstado?: string;
    entregaFecha?: string;
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

  async createDevolucionInsumosBarbero(input: {
      barberoId: number;
      usuarioId: number;
      motivoCategoria?: string;
      motivoDetalle?: string;
      observaciones?: string;
      detalles: Array<{ productoId: number; cantidad: number; precioHistorico?: number }>;
  }): Promise<{ id?: number; cantidadTotal?: number; valorTotal?: number; estado?: string }> {
      try {
          const payload = {
              BarberoId: input.barberoId,
              UsuarioId: input.usuarioId,
              MotivoCategoria: input.motivoCategoria ?? '',
              MotivoDetalle: input.motivoDetalle ?? '',
              Observaciones: input.observaciones ?? '',
              Detalles: input.detalles.map(d => ({
                  ProductoId: d.productoId,
                  Cantidad: d.cantidad,
                  // El backend tolera null; si no enviamos, usará PrecioVenta
                  PrecioHistorico: d.precioHistorico ?? null
              }))
          };
          console.log('📤 Registrando devolución de insumos desde barbero:', payload);
          const resp = await this.request('/Devoluciones/insumos/barbero', {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          const text = await resp.text();
          return text ? JSON.parse(text) : {};
      } catch (error) {
          console.error('Error creando devolución de insumos de barbero:', error);
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
        const entrega = data.entrega || data.Entrega;

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
            entregaId: entrega ? Number(entrega.id || entrega.Id || 0) : (data.entregaId || data.EntregaId || undefined),
            entregaEstado: entrega ? (entrega.estado || entrega.Estado || '') : (data.entregaEstado || data.EntregaEstado || ''),
            entregaFecha: entrega ? (entrega.fecha || entrega.Fecha || '') : (data.entregaFecha || data.EntregaFecha || '')
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
            const arr: any[] = [];
            const extract = (parsed: any): any[] => Array.isArray(parsed)
              ? parsed
              : (parsed && typeof parsed === 'object' && Array.isArray(parsed.items)) ? parsed.items
              : (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) ? parsed.data
              : (parsed && typeof parsed === 'object' && Array.isArray(parsed.$values)) ? parsed.$values
              : [];
            const firstResponse = await this.request('/Devoluciones?page=1&pageSize=5');
            const firstText = await firstResponse.text();
            const firstParsed = firstText ? JSON.parse(firstText) : [];
            arr.push(...extract(firstParsed));
            let totalPages = firstParsed && typeof firstParsed === 'object' && !Array.isArray(firstParsed)
                ? Number((firstParsed as any).totalPages ?? 1)
                : 1;
            totalPages = Math.min(Math.max(1, totalPages), 200);
            if (totalPages > 1) {
                const promises: Promise<any[]>[] = [];
                for (let page = 2; page <= totalPages; page++) {
                    promises.push((async () => {
                        const response = await this.request(`/Devoluciones?page=${page}&pageSize=5`);
                        const text = await response.text();
                        const parsed = text ? JSON.parse(text) : [];
                        return extract(parsed);
                    })());
                }
                const rest = await Promise.all(promises);
                rest.forEach(items => arr.push(...items));
            }
            return await Promise.all(arr.map((item: any) => this.normalizeDevolucionData(item)));
        } catch (error) {
            console.error('Error fetching devoluciones:', error);
            throw error;
        }
    }

    private mapToApiFormat(data: CreateDevolucionRequest): any {
        // Función interna para asegurar que enviamos null si el ID no es válido (> 0)
        // Esto permite que el operador ?? en tu C# funcione correctamente.
        const cleanId = (id: any) => {
            const num = Number(id);
            return (isNaN(num) || num <= 0) ? null : num;
        };

        return {
            VentaId: cleanId(data.ventaId),
            ClienteId: cleanId(data.clienteId),
            UsuarioId: cleanId(data.usuarioId),
            ProductoId: cleanId(data.productoId),
            Cantidad: Number(data.cantidad),
            MotivoCategoria: data.motivoCategoria,
            MotivoDetalle: data.motivoDetalle || '',
            Observaciones: data.observaciones || '',
            MontoDevuelto: Number(data.montoDevuelto),
            SaldoAFavor: Number(data.saldoAFavor)
        };
    }

    async createDevolucion(devolucionData: CreateDevolucionRequest): Promise<Devolucion> {
        try {
            const apiBody = this.mapToApiFormat(devolucionData);
            console.log('📤 Creando devolución - Datos mapeados:', apiBody);

            const response = await this.request('/Devoluciones', {
                method: 'POST',
                body: JSON.stringify(apiBody),
            });
            const data = await response.json();
            return await this.normalizeDevolucionData(data);
        } catch (error) {
            console.error('Error creating devolucion:', error);
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

    async getEntregasDevolucionesResumen(filters: { barberoId?: number; entregaId?: number; desde?: string; hasta?: string }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters.barberoId) params.append('barberoId', String(filters.barberoId));
        if (filters.entregaId) params.append('entregaId', String(filters.entregaId));
        if (filters.desde) params.append('desde', filters.desde);
        if (filters.hasta) params.append('hasta', filters.hasta);
        const resp = await this.request(`/EntregasInsumos/devoluciones/resumen?${params.toString()}`);
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    }

    async getEntregasDevoluciones(filters: { barberoId?: number; entregaId?: number; desde?: string; hasta?: string }): Promise<any[]> {
        const params = new URLSearchParams();
        if (filters.barberoId) params.append('barberoId', String(filters.barberoId));
        if (filters.entregaId) params.append('entregaId', String(filters.entregaId));
        if (filters.desde) params.append('desde', filters.desde);
        if (filters.hasta) params.append('hasta', filters.hasta);
        const resp = await this.request(`/EntregasInsumos/devoluciones?${params.toString()}`);
        const data = await resp.json();
        return Array.isArray(data) ? data : [];
    }

    async createDevolucionBatch(input: {
        ventaId: number;
        clienteId: number | null;
        usuarioId: number;
        motivoCategoria: string;
        observaciones?: string;
        items: Array<{ productoId: number; cantidad: number; montoDevuelto: number }>;
    }): Promise<void> {
        try {
            const payload = {
                VentaId: input.ventaId,
                ClienteId: input.clienteId,
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
            await this.request(`/Devoluciones/${id}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error(`Error deleting devolucion ${id}:`, error);
            throw error;
        }
    }
}

export const devolucionService = new DevolucionService();
export default devolucionService;
