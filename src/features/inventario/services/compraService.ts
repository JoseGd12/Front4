import { httpClient } from '../../../shared/services/httpClient';

export interface Compra {
    id: number;
    numeroCompra?: string;
    numeroFactura?: string;
    numeroRecibo?: string;
    proveedorId: number;
    proveedorNombre?: string;
    proveedorDocumento?: string;
    fecha: string;
    fechaFactura: string;
    metodoPago: string;
    subtotal: number;
    iva: number;
    descuento: number;
    total: number;
    usuarioId: number;
    responsableNombre?: string;
    estado: string;
    detalles: DetalleCompra[];
}

export interface DetalleCompra {
    id?: number;
    productoId: number;
    productoNombre?: string;
    productoImagen?: string;
    /** Nombre de la categoría del producto (para listados y reportes) */
    categoria?: string;
    cantidad: number;
    precioUnitario: number;
    subtotal?: number;
}

export interface CreateCompraRequest {
    proveedorId: number;
    numeroFactura?: string;
    numeroRecibo?: string;
    fecha: string; // Fecha Registro
    fechaFactura: string;
    metodoPago: string;
    iva: number;
    descuento: number;
    usuarioId: number;
    detalles: {
        productoId: number;
        cantidad: number;
        precioUnitario: number;
    }[];
}

class CompraService {
    private toFiniteNumber(value: unknown, fallback = 0): number {
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : fallback;
        }
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return fallback;
            const n = Number(trimmed);
            return Number.isFinite(n) ? n : fallback;
        }
        return fallback;
    }

    private normalize(raw: any): Compra {
        if (!raw) return {} as Compra;

        const prov = raw.proveedor || raw.Proveedor || {};
        const usuario = raw.usuario || raw.Usuario || {};
        const rawDetalles = raw.detalles || raw.Detalles || raw.detalleCompras || raw.DetalleCompras || [];

        const detalles: DetalleCompra[] = Array.isArray(rawDetalles)
            ? rawDetalles.map((d: any) => ({
                id: d.id || d.Id,
                productoId: d.productoId || d.ProductoId || d.producto?.id || d.producto?.Id || 0,
                productoNombre: d.productoNombre || d.ProductoNombre || d.producto?.nombre || d.producto?.Nombre || 'Producto',
                productoImagen: d.producto?.imagenProduc || d.producto?.imagen || d.producto?.ImagenProduc || d.producto?.Imagen || '',
                categoria: d.producto?.categoria?.nombre || d.producto?.Categoria?.Nombre || 'Sin categoría',
                cantidad: this.toFiniteNumber(d.cantidad || d.Cantidad),
                precioUnitario: this.toFiniteNumber(d.precioUnitario || d.PrecioUnitario),
                subtotal: this.toFiniteNumber(d.subtotal || d.Subtotal)
            }))
            : [];

        return {
            id: Number(raw.id || raw.Id),
            numeroCompra: String(raw.numeroCompra || raw.NumeroCompra || ''),
            numeroFactura: String(raw.numeroFactura || raw.NumeroFactura || ''),
            numeroRecibo: String(raw.numeroRecibo || raw.NumeroRecibo || ''),
            proveedorId: Number(raw.proveedorId || raw.ProveedorId || prov.id || prov.Id || 0),
            proveedorNombre: String(prov.nombre || prov.Nombre || raw.proveedorNombre || raw.ProveedorNombre || 'Proveedor'),
            proveedorDocumento: String(raw.proveedorNIT || raw.ProveedorNIT || prov.identificacion || prov.Identificacion || prov.documento || prov.Documento || prov.nit || prov.Nit || ''),
            fecha: String(raw.fechaRegistro || raw.FechaRegistro || raw.fecha || raw.Fecha || ''),
            fechaFactura: String(raw.fechaFactura || raw.FechaFactura || ''),
            metodoPago: String(raw.metodoPago || raw.MetodoPago || 'Efectivo'),
            subtotal: this.toFiniteNumber(raw.subtotal || raw.Subtotal),
            iva: this.toFiniteNumber(raw.iva || raw.Iva || raw.IVA),
            descuento: this.toFiniteNumber(raw.descuento || raw.Descuento),
            total: this.toFiniteNumber(raw.total || raw.Total),
            usuarioId: Number(raw.usuarioId || raw.UsuarioId || usuario.id || usuario.Id || 0),
            responsableNombre: String(usuario.nombre || usuario.Nombre || raw.responsableNombre || raw.ResponsableNombre || 'Responsable'),
            estado: String(raw.estado || raw.Estado || 'Completada'),
            detalles
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

    async getCompras(page = 1, pageSize = 20): Promise<Compra[]> {
        try {
            const raw = await httpClient.get(`/Compras?page=${page}&pageSize=${pageSize}`);
            const items = this.extractItems(raw);
            return items.map(c => this.normalize(c));
        } catch (error: any) {
            console.error('❌ Error obteniendo compras:', error);
            throw error;
        }
    }

    async getCompraById(id: number): Promise<Compra> {
        try {
            const data = await httpClient.get(`/Compras/${id}`);
            return this.normalize(data);
        } catch (error: any) {
            console.error(`❌ Error obteniendo compra ${id}:`, error);
            throw error;
        }
    }

    async createCompra(data: CreateCompraRequest): Promise<Compra> {
        try {
            // Mapeo a PascalCase para el backend si es necesario
            const body = {
                ProveedorId: data.proveedorId,
                NumeroFactura: data.numeroFactura,
                NumeroRecibo: data.numeroRecibo,
                Fecha: data.fecha,
                FechaFactura: data.fechaFactura,
                MetodoPago: data.metodoPago,
                IVA: data.iva,
                Descuento: data.descuento,
                UsuarioId: data.usuarioId,
                Detalles: data.detalles.map(d => ({
                    ProductoId: d.productoId,
                    Cantidad: d.cantidad,
                    PrecioUnitario: d.precioUnitario
                }))
            };

            const result = await httpClient.post('/Compras', body);
            return this.normalize(result);
        } catch (error: any) {
            console.error('❌ Error creando compra:', error);
            throw error;
        }
    }

    async anularCompra(id: number): Promise<void> {
    try {
      await httpClient.put(`/Compras/${id}/anular`);
    } catch (error: any) {
      console.error(`❌ Error anulando compra ${id}:`, error);
      throw error;
    }
  }

  // Compatibility methods
  async getDetallesPorCompra(id: number): Promise<DetalleCompra[]> {
    const compra = await this.getCompraById(id);
    return compra.detalles || [];
  }
}

export const compraService = new CompraService();
export default compraService;
