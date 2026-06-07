import { httpClient } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/api';

export interface Venta {
  id: number;
  /** Número de recibo autogenerado por la API. Formato: REC-YYYY-NNNNNN */
  numeroRecibo?: string | null;
  numeroVenta: number;
  tipoVenta?: string;
  cliente: string;
  clienteId: number | null;
  clienteDocumento: string;
  fecha: string;
  servicios: string;
  productos: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  saldoAFavorUsado?: number;
  barbero: string;
  barberoId?: number | null;
  barberoPrestadorId?: number | null;
  barberoPrestadorNombreCompleto?: string | null;
  barberoDocumento?: string;
  responsable?: string;
  estado: string;
  metodoPago: string;
  garantiaMeses: number;
  productosDetalle: ProductoDetalle[];
  serviciosDetalle: ServicioDetalle[];
}

export interface ProductoDetalle {
  id: number | string;
  nombre: string;
  cantidad: number;
  precio: number;
  imagen?: string;
}

export interface ServicioDetalle {
  id: number | string;
  nombre: string;
  cantidad?: number;
  precio: number;
}

export interface CreateVentaRequest {
  /** Si no se envía, la API lo autogenera */
  numeroRecibo?: string;
  /** El backend asigna el número — no enviar desde el cliente */
  numeroVenta?: number;
  tipoVenta?: string;
  clienteNombre?: string;
  clienteId: number | null;
  usuarioId?: number | null;
  clienteDocumento: string;
  fecha: string;
  servicios: string;
  productos: string;
  subtotal: number;
  iva: number;
  descuento: number;
  total: number;
  saldoAFavorUsado?: number;
  barberoId?: number | null;
  barberoPrestadorId?: number | null;
  barberoNombre?: string;
  estado: string;
  metodoPago: string;
  garantiaMeses: number;
  plazoDias?: number | null;
  productosDetalle: ProductoDetalle[];
  serviciosDetalle: ServicioDetalle[];
}

export interface PagedVentas {
  items: Venta[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class VentaService {
  private safeParseJson(text: string): any {
    if (!text || !text.trim()) return [];
    try {
      return JSON.parse(text);
    } catch {
      const cleaned = text
        .replace(/:\s*NaN/g, ':null')
        .replace(/:\s*Infinity/g, ':null')
        .replace(/:\s*-Infinity/g, ':null')
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u0000-\u001F]+/g, ' ');
      try {
        return JSON.parse(cleaned);
      } catch {
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        if (firstBracket >= 0 && lastBracket > firstBracket) {
          const arraySlice = cleaned.slice(firstBracket, lastBracket + 1);
          try {
            return JSON.parse(arraySlice);
          } catch {
            return [];
          }
        }
        return [];
      }
    }
  }

  private extractArrayPayload(payload: any): any[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.items)) return payload.items;
      if (Array.isArray(payload.data)) return payload.data;
      if (Array.isArray(payload.$values)) return payload.$values;
      const firstArray = Object.values(payload).find((v: any) => Array.isArray(v)) as any[] | undefined;
      if (firstArray) return firstArray;
    }
    return [];
  }

  private mapToApiFormat(data: any): any {
    const mapped: any = {};

    // Campos requeridos por el backend (VentaInput)
    if (data.id !== undefined) mapped.Id = data.id;
    if (data.clienteId !== undefined && data.clienteId !== null && Number(data.clienteId) > 0) {
      mapped.ClienteId = Number(data.clienteId);
    }

    // UsuarioId = responsable logeado (NO barbero)
    if (data.usuarioId !== undefined && data.usuarioId !== null) {
      mapped.UsuarioId = Number(data.usuarioId);
    }
    // BarberoId = barbero comprador (en ventas a barbero)
    if (data.barberoId !== undefined && data.barberoId !== null) {
      mapped.BarberoId = Number(data.barberoId);
    }
    // BarberoPrestadorId = barbero que realiza el servicio (distinto del comprador)
    if (data.barberoPrestadorId !== undefined && data.barberoPrestadorId !== null && Number(data.barberoPrestadorId) > 0) {
      mapped.BarberoPrestadorId = Number(data.barberoPrestadorId);
    }

    if (data.metodoPago !== undefined) mapped.MetodoPago = data.metodoPago;
    if (data.tipoVenta !== undefined) mapped.TipoVenta = data.tipoVenta;
    if (data.clienteNombre !== undefined) mapped.ClienteNombre = data.clienteNombre;
    if (data.numeroRecibo !== undefined && data.numeroRecibo !== null) mapped.NumeroRecibo = data.numeroRecibo;
    if (data.numeroVenta !== undefined) mapped.NumeroVenta = Number(data.numeroVenta);
    if (data.fecha !== undefined) mapped.Fecha = data.fecha;
    if (data.estado !== undefined) mapped.Estado = data.estado;
    if (data.descuento !== undefined) mapped.Descuento = Number(data.descuento);
    if (data.iva !== undefined) mapped.IVA = Number(data.iva);
    if (data.subtotal !== undefined) mapped.Subtotal = Number(data.subtotal);
    if (data.total !== undefined) mapped.Total = Number(data.total);
    if (data.garantiaMeses !== undefined) mapped.GarantiaMeses = Number(data.garantiaMeses);
    if (data.saldoAFavorUsado !== undefined) mapped.SaldoAFavorUsado = Number(data.saldoAFavorUsado);
    if (data.plazoDias != null) mapped.PlazoDias = Number(data.plazoDias);

    // Unificar detalles en la propiedad 'Detalles' (PascalCase)
    const detalles: any[] = [];

    if (data.productosDetalle && Array.isArray(data.productosDetalle)) {
      data.productosDetalle.forEach((p: any) => {
        const productoId = Number(p.id);
        if (productoId > 0) {
          detalles.push({
            ProductoId: productoId,
            Cantidad: Number(p.cantidad || 1),
            PrecioUnitario: Number(p.precio || 0)
          });
        }
      });
    }

    if (data.serviciosDetalle && Array.isArray(data.serviciosDetalle)) {
      data.serviciosDetalle.forEach((s: any) => {
        const idStr = String(s.id || '');

        if (idStr.startsWith('PAQ-')) {
          const id = parseInt(idStr.replace('PAQ-', ''));
          if (!isNaN(id) && id > 0) {
            detalles.push({
              PaqueteId: id,
              Cantidad: Number(s.cantidad || 1),
              PrecioUnitario: Number(s.precio || 0)
            });
          }
        } else if (idStr.startsWith('SERV-')) {
          const id = parseInt(idStr.replace('SERV-', ''));
          if (!isNaN(id) && id > 0) {
            detalles.push({
              ServicioId: id,
              Cantidad: Number(s.cantidad || 1),
              PrecioUnitario: Number(s.precio || 0)
            });
          }
        }
      });
    }

    if (detalles.length > 0) {
      mapped.Detalles = detalles;
    }

    return mapped;
  }

  private async normalizeVentaData(data: any): Promise<Venta> {
    if (!data) return {} as Venta;

    const cliente = data.cliente || data.Cliente || {};
    const barberoObj = data.barbero || data.Barbero || {};
    const usuarioResponsable = data.usuario || data.Usuario || {};
    const detallesApi = data.detalles || data.Detalles || data.detalleVenta || data.detalleVentas ||
      data.DetalleVenta || data.DetalleVentas || [];

    const productosDetalle: ProductoDetalle[] = [];
    const serviciosDetalle: ServicioDetalle[] = [];

    for (const d of detallesApi) {
      const p = d.producto || d.Producto;
      const s = d.servicio || d.Servicio;
      const paq = d.paquete || d.Paquete;
      const precioUnit = Number(d.precioUnitario || d.PrecioUnitario || d.precio || d.Precio || 0);
      const cantidad = Number(d.cantidad || d.Cantidad || 1);
      const productoIdPlano = d.productoId || d.ProductoId;
      const servicioIdPlano = d.servicioId || d.ServicioId;
      const paqueteIdPlano = d.paqueteId || d.PaqueteId;

      if (p) {
        productosDetalle.push({
          id: String(p.id || p.Id || d.productoId || d.ProductoId),
          nombre: p.nombre || p.Nombre || d.productoNombre || d.ProductoNombre || 'Producto',
          cantidad,
          precio: precioUnit,
          imagen: p.imagenProduc || p.imagen || p.imagenUrl || p.ImagenProduc || p.Imagen || ''
        });
      } else if (productoIdPlano) {
        productosDetalle.push({
          id: String(productoIdPlano),
          nombre: d.productoNombre || d.ProductoNombre || d.nombreProducto || d.NombreProducto || 'Producto',
          cantidad,
          precio: precioUnit,
          imagen: d.imagenProducto || d.imagenProduc || d.imagen || ''
        });
      } else if (s) {
        serviciosDetalle.push({
          id: `SERV-${String(s.id || s.Id || servicioIdPlano).replace(/^SERV-/, '')}`,
          nombre: s.nombre || s.Nombre || d.servicioNombre || d.ServicioNombre || 'Servicio',
          cantidad,
          precio: precioUnit
        });
      } else if (servicioIdPlano) {
        serviciosDetalle.push({
          id: `SERV-${String(servicioIdPlano).replace(/^SERV-/, '')}`,
          nombre: d.servicioNombre || d.ServicioNombre || d.nombreServicio || d.NombreServicio || 'Servicio',
          cantidad,
          precio: precioUnit
        });
      } else if (paq || paqueteIdPlano) {
        const paqId = paqueteIdPlano || paq?.id || paq?.Id;
        serviciosDetalle.push({
          id: `PAQ-${paqId}`,
          nombre: paq?.nombre || paq?.Nombre || d.paqueteNombre || d.PaqueteNombre || 'Paquete',
          cantidad,
          precio: precioUnit
        });
      }
    }

    if (productosDetalle.length === 0) {
      (data.productosDetalle || data.ProductosDetalle || []).forEach((p: any) => {
        productosDetalle.push({
          id: String(p.id || p.Id || p.productoId || p.ProductoId || ''),
          nombre: p.nombre || p.Nombre || p.productoNombre || p.ProductoNombre || 'Producto',
          cantidad: Number(p.cantidad || p.Cantidad || 1),
          precio: Number(p.precio || p.Precio || p.precioUnitario || p.PrecioUnitario || 0),
          imagen: p.imagenProduc || p.imagen || p.imagenUrl || p.ImagenProduc || p.Imagen || ''
        });
      });
    }
    if (serviciosDetalle.length === 0) {
      (data.serviciosDetalle || data.ServiciosDetalle || []).forEach((s: any) => {
        const rawId = String(s.id || s.Id || s.servicioId || s.ServicioId || '');
        const serviceId = rawId.startsWith('SERV-') || rawId.startsWith('PAQ-')
          ? rawId
          : `SERV-${rawId}`;
        serviciosDetalle.push({
          id: serviceId,
          nombre: s.nombre || s.Nombre || s.servicioNombre || s.ServicioNombre || 'Servicio',
          cantidad: Number(s.cantidad || s.Cantidad || 1),
          precio: Number(s.precio || s.Precio || s.precioUnitario || s.PrecioUnitario || 0)
        });
      });
    }

    const clienteNombre = (data.clienteNombreCompleto || data.ClienteNombreCompleto || data.clienteNombre || data.ClienteNombre)
      ? (data.clienteNombreCompleto || data.ClienteNombreCompleto || data.clienteNombre || data.ClienteNombre)
      : (cliente.nombre || cliente.Nombre)
        ? `${cliente.nombre || cliente.Nombre} ${cliente.apellido || cliente.Apellido || ''}`.trim()
        : (data.nombreCliente || data.NombreCliente || (typeof data.cliente === 'string' ? data.cliente : '') || (typeof data.Cliente === 'string' ? data.Cliente : '') || (cliente.nombreCompleto || cliente.NombreCompleto) || 'Cliente');

    const barberoUsuario = (barberoObj as any).usuario || (barberoObj as any).Usuario || {};
    const barberoNombre = (data.barberoNombreCompleto || data.BarberoNombreCompleto || data.barberoNombre || data.BarberoNombre)
      ? (data.barberoNombreCompleto || data.BarberoNombreCompleto || data.barberoNombre || data.BarberoNombre)
      : (barberoObj.nombre || barberoObj.Nombre)
        ? `${barberoObj.nombre || barberoObj.Nombre} ${barberoObj.apellido || barberoObj.Apellido || ''}`.trim()
        : (barberoUsuario?.nombre || barberoUsuario?.Nombre)
          ? `${barberoUsuario?.nombre || barberoUsuario?.Nombre} ${barberoUsuario?.apellido || barberoUsuario?.Apellido || ''}`.trim()
          : (data.nombreBarbero || data.NombreBarbero || (typeof data.barbero === 'string' ? data.barbero : '') || (typeof data.Barbero === 'string' ? data.Barbero : '') || 'Sin asignar');

    const responsableNombre = (data.usuarioNombreCompleto || data.UsuarioNombreCompleto || data.responsableNombre || data.ResponsableNombre || data.usuarioNombre || data.UsuarioNombre)
      ? (data.usuarioNombreCompleto || data.UsuarioNombreCompleto || data.responsableNombre || data.ResponsableNombre || data.usuarioNombre || data.UsuarioNombre)
      : (usuarioResponsable.nombre || usuarioResponsable.Nombre)
        ? `${usuarioResponsable.nombre || usuarioResponsable.Nombre} ${usuarioResponsable.apellido || usuarioResponsable.Apellido || ''}`.trim()
        : 'Sin asignar';

    const getNumericId = (val: any, fallbackId?: any) => {
      const num = Number(val);
      if (!isNaN(num) && val !== null && val !== "" && typeof val !== 'object' && num > 0) return num;
      const fallbackNum = Number(fallbackId);
      return (!isNaN(fallbackNum) && fallbackId !== null && fallbackId !== "" && fallbackNum > 0) ? fallbackNum : null;
    };

    return {
      id: Number(data.id || data.Id) || 0,
      numeroRecibo: data.numeroRecibo || data.NumeroRecibo || null,
      numeroVenta: Number(data.numeroVenta || data.NumeroVenta || data.id || data.Id || 0),
      tipoVenta: String(data.tipoVenta || data.TipoVenta || 'Venta directa'),
      cliente: clienteNombre,
      clienteId: getNumericId(data.clienteId || data.ClienteId, cliente.id || cliente.Id),
      clienteDocumento: String(cliente.documento || cliente.Documento || data.clienteDocumento || data.ClienteDocumento || ''),
      fecha: String(data.fecha || data.Fecha || ''),
      servicios: data.servicios || data.Servicios ||
        (serviciosDetalle.length > 0 ? serviciosDetalle.map(s => s.nombre).join(', ') : 'Sin servicios'),
      productos: data.productos || data.Productos ||
        (productosDetalle.length > 0 ? productosDetalle.map(p => `${p.nombre} (x${p.cantidad})`).join(', ') : 'Sin productos'),
      subtotal: Number(data.subtotal || data.Subtotal) || 0,
      iva: Number(data.iva || data.Iva || data.IVA || 0),
      descuento: Number(data.descuento || data.Descuento) || 0,
      total: Number(data.total || data.Total) || 0,
      saldoAFavorUsado: Number(data.saldoAFavorUsado || data.SaldoAFavorUsado || 0),
      barbero: barberoNombre,
      barberoId: getNumericId(data.barberoId || data.BarberoId, barberoObj.id || barberoObj.Id),
      barberoPrestadorId: getNumericId(data.barberoPrestadorId || data.BarberoPrestadorId, null),
      barberoPrestadorNombreCompleto: data.barberoPrestadorNombreCompleto || data.BarberoPrestadorNombreCompleto || null,
      barberoDocumento: String(barberoObj.documento || barberoObj.Documento || (barberoUsuario as any)?.documento || (barberoUsuario as any)?.Documento || data.barberoDocumento || data.BarberoDocumento || ''),
      responsable: responsableNombre,
      estado: String(data.estado || data.Estado || 'Completada'),
      metodoPago: String(data.metodoPago || data.MetodoPago || 'Efectivo'),
      garantiaMeses: Number(data.garantiaMeses ?? data.GarantiaMeses ?? 0),
      productosDetalle,
      serviciosDetalle
    };
  }

  async getVentasPaged(page = 1, pageSize = 50): Promise<PagedVentas> {
    try {
      const payload = await httpClient.get(`/Ventas?page=${page}&pageSize=${pageSize}`);
      const rawItems = this.extractArrayPayload(payload);
      const items = await Promise.all(rawItems.map(v => this.normalizeVentaData(v)));
      
      return {
        items,
        totalCount: Number(payload?.totalCount ?? items.length),
        page: Number(payload?.page ?? page),
        pageSize: Number(payload?.pageSize ?? pageSize),
        totalPages: Number(payload?.totalPages ?? 1)
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo ventas paginadas:', error);
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }
  }

  /**
   * @deprecated Usar getVentasPaged para mejor rendimiento.
   */
  async getVentas(page = 1, pageSize = 20): Promise<Venta[]> {
    const res = await this.getVentasPaged(page, pageSize);
    return res.items;
  }

  async getVentasByClienteId(clienteId: number): Promise<Venta[]> {
    try {
      const payload = await httpClient.get(`/Ventas/cliente/${clienteId}`);
      const arr = this.extractArrayPayload(payload);
      return await Promise.all(arr.map(item => this.normalizeVentaData(item)));
    } catch (error) {
      console.warn('Error fetching ventas by clienteId, filtering local:', error);
      const all = await this.getVentas(1, 1000);
      return all.filter(v => Number(v.clienteId) === Number(clienteId));
    }
  }

  async getVentaById(id: number): Promise<Venta | null> {
    try {
      const data = await httpClient.get(`/Ventas/${id}`);
      if (!data) return null;
      return await this.normalizeVentaData(data);
    } catch (error: any) {
      console.error(`❌ Error obteniendo venta ${id}:`, error);
      throw error;
    }
  }

  async createVenta(ventaData: CreateVentaRequest): Promise<Venta> {
    try {
      const payload = this.mapToApiFormat(ventaData);
      if (!payload.Detalles || payload.Detalles.length === 0) {
        throw new Error('La venta debe tener al menos un producto o servicio válido');
      }
      
      const data = await httpClient.post('/Ventas', payload);
      return await this.normalizeVentaData(data);
    } catch (error: any) {
      console.error('❌ Error creando venta:', error);
      throw error;
    }
  }

  async updateVenta(id: number, ventaData: Partial<Venta>): Promise<Venta> {
    try {
      const mapped = this.mapToApiFormat({ ...ventaData, id });
      const data = await httpClient.put(`/Ventas/${id}`, mapped);
      return await this.normalizeVentaData(data);
    } catch (error: any) {
      console.error(`❌ Error actualizando venta ${id}:`, error);
      throw error;
    }
  }

  async anularVenta(id: number): Promise<void> {
    try {
      await httpClient.post(`/Ventas/${id}/anular`);
    } catch (error: any) {
      console.error(`❌ Error anulando venta ${id}:`, error);
      throw error;
    }
  }

  async deleteVenta(id: number): Promise<void> {
    return this.anularVenta(id);
  }

  async getVentasPorCliente(clienteId: number, page = 1, pageSize = 20): Promise<any> {
    try {
      return await httpClient.get(`/Ventas/cliente/${clienteId}?page=${page}&pageSize=${pageSize}`);
    } catch (error) {
      console.error(`❌ Error obteniendo ventas del cliente ${clienteId}:`, error);
      throw error;
    }
  }

  async getVentasByBarbero(barbero: string): Promise<Venta[]> {
    try {
      const ventas = await this.getVentas(1, 1000);
      return ventas.filter(v => v.barbero === barbero);
    } catch (error: any) {
      console.error(`❌ Error obteniendo ventas del barbero ${barbero}:`, error);
      throw error;
    }
  }

  async getVentasByFecha(fechaInicio: string, fechaFin: string): Promise<Venta[]> {
    try {
      const ventas = await this.getVentas(1, 1000);
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);
      return ventas.filter(v => {
        const ventaFecha = new Date(v.fecha);
        return ventaFecha >= inicio && ventaFecha <= fin;
      });
    } catch (error: any) {
      console.error(`❌ Error obteniendo ventas por fecha:`, error);
      throw error;
    }
  }
}

export const ventaService = new VentaService();
export default ventaService;
