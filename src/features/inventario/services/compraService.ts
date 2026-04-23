const API_BASE_URL = '/api';

export interface Compra {
    id: number;
    numeroCompra?: string;
    numeroFactura?: string;
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
    cantidadVentas?: number;
    cantidadInsumos?: number;
}

export interface CreateCompraRequest {
    proveedorId: number;
    numeroFactura?: string; // Opcional desde front, pero backend lo usa
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
        cantidadVentas?: number;
        cantidadInsumos?: number;
    }[];
}

class CompraService {
    // ... (request method stays the same) ...
    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const config: RequestInit = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        };

        try {
            console.log(`CompraService [${config.method || 'GET'}]: ${url}`);
            if (config.body) {
                console.log(`📤 Request Body:`, config.body);
            }

            const response = await fetch(url, config);

            if (!response.ok) {
                const errorText = await response.text();
                // No logueamos error aquí para evitar duplicidad en consola si el catch superior lo maneja
                throw new Error(errorText || `Error del servidor (${response.status})`);
            }

            return response;
        } catch (error) {
            console.error('CompraService Network/API Error:', error);
            throw error;
        }
    }

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
        if (value === null || value === undefined) return fallback;
        const n = Number(value as any);
        return Number.isFinite(n) ? n : fallback;
    }

    private mapToApiFormat(data: CreateCompraRequest): any {
        // Generar un número de factura temporal si no se proporciona, para evitar error 500 en backend
        const facturaDefault = Date.now().toString().slice(-6);

        return {
            proveedorId: data.proveedorId,
            usuarioId: data.usuarioId,
            numeroFactura: data.numeroFactura || facturaDefault,
            fechaFactura: data.fechaFactura, // DateOnly en backend, string YYYY-MM-DD funciona
            metodoPago: data.metodoPago,
            iva: data.iva,
            descuento: data.descuento,
            detalles: data.detalles.map(d => ({
                productoId: d.productoId,
                cantidad: this.toFiniteNumber(d.cantidad, 0),
                precioUnitario: this.toFiniteNumber(d.precioUnitario, 0),
                cantidadVentas: this.toFiniteNumber(d.cantidadVentas, 0),
                cantidadInsumos: this.toFiniteNumber(d.cantidadInsumos, 0)
            }))
        };
    }

    private normalizeSearchText(value: unknown): string {
        return String(value ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    private extractArray(data: any): any[] {
        if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.$values)) {
            return data.$values;
        }
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray(data.items)) return data.items;
        if (data && typeof data === 'object' && Array.isArray(data.data)) return data.data;
        if (data && typeof data === 'object' && data.data && Array.isArray(data.data.$values)) {
            return data.data.$values;
        }
        if (data && typeof data === 'object' && data.items && Array.isArray(data.items.$values)) {
            return data.items.$values;
        }
        return [];
    }

    private normalizeCompraData(data: any): Compra & { searchString: string } {
        if (!data) return {} as any;

        const detallesApi = this.extractArray(
            data.detalleCompras || data.DetalleCompras || data.detalles || data.Detalles || []
        );

        // Attempt to get names for consistency in UI
        let proveedorNombre = 'Proveedor desconocido';
        let proveedorDocumento = '';
        
        // Prioridad 1: Propiedades planas (DTO optimizado)
        if (data.proveedorNombre || data.ProveedorNombre) {
            proveedorNombre = data.proveedorNombre || data.ProveedorNombre;
        }
        if (data.proveedorNIT || data.ProveedorNIT || data.nitProveedor || data.NitProveedor) {
            proveedorDocumento = String(data.proveedorNIT || data.ProveedorNIT || data.nitProveedor || data.NitProveedor);
        }

        // Prioridad 2: Objeto anidado (Retrocompatibilidad)
        const prov = data.proveedor || data.Proveedor;
        if (prov) {
            if (proveedorNombre === 'Proveedor desconocido') {
                proveedorNombre = prov.nombre || prov.Nombre || proveedorNombre;
            }
            if (!proveedorDocumento) {
                proveedorDocumento = String(
                    prov.nit ??
                    prov.Nit ??
                    prov.numeroIdentificacion ??
                    prov.NumeroIdentificacion ??
                    prov.documento ??
                    prov.Documento ??
                    ''
                );
            }
        }

        const user = data.usuario || data.Usuario;
        let responsableNombre = 'Administrador';
        if (user) {
            responsableNombre = `${user.nombre || user.Nombre || ''} ${user.apellido || user.Apellido || ''}`.trim() || 'Administrador';
        }

        const detalles: DetalleCompra[] = detallesApi.map((d: any) => ({
            id: d.id || d.Id,
            productoId: d.productoId || d.ProductoId,
            productoNombre: d.productoNombre || d.ProductoNombre || d.producto?.nombre || d.producto?.Nombre || d.Producto?.Nombre || d.Producto?.nombre || 'Producto',
            productoImagen: d.productoImagen || d.ProductoImagen || d.producto?.imagenProduc || d.producto?.ImagenProduc || d.Producto?.ImagenProduc || d.Producto?.imagenProduc || '',
            cantidad: d.cantidad || d.Cantidad || 0,
            precioUnitario: d.precioUnitario || d.PrecioUnitario || d.precioCompra || d.PrecioCompra || 0,
            subtotal: (Number(d.cantidad || d.Cantidad || 0)) * (Number(d.precioUnitario || d.PrecioUnitario || 0)),
            cantidadVentas: d.cantidadVentas || d.CantidadVentas || 0,
            cantidadInsumos: d.cantidadInsumos || d.CantidadInsumos || 0
        }));

        const id = data.id || data.Id || 0;
        const total = Number(data.total || data.Total || 0);

        const compra = {
            id: id,
            numeroCompra: `CPR-${String(id).padStart(3, '0')}`,
            numeroFactura: data.numeroFactura || data.NumeroFactura || data.numeroCompra || data.NumeroCompra || `CPR-${id}`,
            proveedorId: data.proveedorId || data.ProveedorId || 0,
            proveedorNombre: proveedorNombre,
            proveedorDocumento: proveedorDocumento,
            fecha: data.fechaRegistro || data.FechaRegistro || data.fecha || data.Fecha || new Date().toISOString(),
            fechaFactura: data.fechaFactura || data.FechaFactura || '',
            metodoPago: data.metodoPago || data.MetodoPago || 'Efectivo',
            subtotal: data.subtotal || data.Subtotal || 0,
            iva: data.iva || data.Iva || 0,
            descuento: data.descuento || data.Descuento || 0,
            total: total,
            usuarioId: data.usuarioId || data.UsuarioId || 0,
            responsableNombre: responsableNombre,
            estado: data.estado || data.Estado || 'Completada',
            detalles: detalles
        };

        // Pre-calculate search string for O(1) matching in UI
        const searchString = this.normalizeSearchText([
            compra.id,
            compra.numeroCompra,
            compra.numeroFactura,
            compra.proveedorDocumento,
            compra.proveedorNombre,
            compra.total,
            compra.fecha,
            compra.estado,
            compra.metodoPago
        ].join(' '));

        return { ...compra, searchString };
    }

    async getCompras(): Promise<Array<Compra & { searchString: string }>> {
        try {
            const arr: any[] = [];
            const firstResponse = await this.request('/Compras?page=1&pageSize=100');
            const firstText = await firstResponse.text();
            const firstData: any = firstText ? JSON.parse(firstText) : [];
            arr.push(...this.extractArray(firstData));
            let totalPages = firstData && typeof firstData === 'object' && !Array.isArray(firstData)
                ? Number((firstData as any).totalPages ?? 1)
                : 1;
            totalPages = Math.min(Math.max(1, totalPages), 200);
            if (totalPages > 1) {
                const promises: Promise<any[]>[] = [];
                for (let page = 2; page <= totalPages; page++) {
                    promises.push((async () => {
                        const response = await this.request(`/Compras?page=${page}&pageSize=100`);
                        const text = await response.text();
                        const data: any = text ? JSON.parse(text) : [];
                        return this.extractArray(data);
                    })());
                }
                const rest = await Promise.all(promises);
                rest.forEach(items => arr.push(...items));
            }
            if (!Array.isArray(arr)) {
                console.warn('⚠️ Respuesta de /Compras no es un array ni envelope válido, retornando lista vacía');
                return [];
            }
            return arr.map((item: any) => this.normalizeCompraData(item));
        } catch (error) {
            console.error('Error fetching compras:', error);
            throw error;
        }
    }

    async createCompra(compraData: CreateCompraRequest): Promise<Compra> {
        try {
            const mapped = this.mapToApiFormat(compraData);
            const response = await this.request('/Compras', {
                method: 'POST',
                body: JSON.stringify(mapped),
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : {};
            return this.normalizeCompraData(data);
        } catch (error) {
            console.error('Error creating compra:', error);
            throw error;
        }
    }

    async updateCompra(id: number, compraData: CreateCompraRequest): Promise<Compra> {
        try {
            const mapped = this.mapToApiFormat(compraData);
            const response = await this.request(`/Compras/${id}`, {
                method: 'PUT',
                body: JSON.stringify(mapped),
            });
            const text = await response.text();
            const data = text ? JSON.parse(text) : {};
            return this.normalizeCompraData(data);
        } catch (error) {
            console.error('Error updating compra:', error);
            throw error;
        }
    }

    async anularCompra(id: number): Promise<void> {
        try {
            await this.request(`/Compras/${id}`, {
                method: 'DELETE'
            });
        } catch (error: any) {
            // Si el error es que ya está anulada, lo dejamos pasar como éxito para el flujo del front
            if (error.message?.includes("ya está anulada") || error.message?.includes("ya esta anulada")) {
                console.warn(`⚠️ Intento de anular compra ${id} que ya estaba anulada.`);
                return;
            }
            throw error;
        }
    }
    async getDetallesPorCompra(compraId: number): Promise<DetalleCompra[]> {
        try {
            const response = await this.request(`/DetallesCompra/compra/${compraId}`);
            const text = await response.text();
            const data = text ? JSON.parse(text) : [];
            const detalles = this.extractArray(data);

            const catFromDetalle = (d: any): string => {
                const prod = d.producto || d.Producto;
                const cat = d.categoria ?? d.Categoria ?? prod?.categoria ?? prod?.Categoria;
                if (typeof cat === 'string' && cat.trim()) return String(cat).trim();
                if (cat && typeof cat === 'object') return String(cat.nombre ?? cat.Nombre ?? '').trim();
                return '';
            };
            return detalles.map((d: any) => ({
                id: d.id || d.Id,
                productoId: d.productoId || d.ProductoId,
                productoNombre: d.producto?.nombre || d.producto?.Nombre || d.Producto?.Nombre || d.Producto?.nombre || 'Producto',
                productoImagen: d.producto?.imagenProduc || d.producto?.ImagenProduc || d.Producto?.ImagenProduc || d.Producto?.imagenProduc || '',
                categoria: catFromDetalle(d) || undefined,
                cantidad: d.cantidad || d.Cantidad || 0,
                precioUnitario: d.precioUnitario || d.PrecioUnitario || d.precioCompra || d.PrecioCompra || 0,
                subtotal: (Number(d.cantidad || d.Cantidad || 0)) * (Number(d.precioUnitario || d.PrecioUnitario || d.precioCompra || d.PrecioCompra || 0)),
                cantidadVentas: d.cantidadVentas || d.CantidadVentas || 0,
                cantidadInsumos: d.cantidadInsumos || d.CantidadInsumos || 0
            }));
        } catch (error) {
            console.error('Error fetching detalles compra:', error);
            // Return empty array to avoid breaking UI, or throw if critical
            return [];
        }
    }
}

export const compraService = new CompraService();
export default compraService;
