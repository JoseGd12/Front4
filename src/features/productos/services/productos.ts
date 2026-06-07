import { httpClient } from '../../../shared/services/httpClient';

// =============================================================================
// MÓDULO COMPLETO DE PRODUCTOS - TODO EN UN SOLO ARCHIVO
// =============================================================================

// -----------------------------------------------------------------------------
// INTERFACES Y TIPOS
// -----------------------------------------------------------------------------

export interface ApiProducto {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: {
    id: number;
    nombre: string;
  } | null;
  precioBase: number;
  precio: number;
  tipo?: string;
  precioVenta?: number;
  precioCompra?: number;
  iva: number;
  porcentajeIva: number;
  stock: number;
  cantidad: number;
  /** @deprecated StockMinimo ya no existe en la API. Mantenido solo para compat de UI. */
  minCantidad?: number;
  marca: string | null;
  imagenProduc: string | null;
  activo: boolean;
}

export interface ApiCategoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
}

// -----------------------------------------------------------------------------
// SERVICIO DE PRODUCTOS
// -----------------------------------------------------------------------------

// FE-B4: Encapsular estado de categorías
const categoriasState = {
  map: {} as Record<string, number>,
  loaded: false
};

class ProductoService {
  async getProductosPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<{ items: ApiProducto[]; totalCount: number; page: number; pageSize: number; totalPages: number; }> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 50));
    const q = args.q ?? '';
    const extra = { ...args };
    delete extra.page;
    delete extra.pageSize;
    delete extra.q;

    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      q
    });
    
    Object.entries(extra).forEach(([k, v]) => {
      if (v != null && v !== '') queryParams.append(k, String(v));
    });

    try {
      const data = await httpClient.get(`/Productos?${queryParams.toString()}`);
      
      const rawItems = Array.isArray(data)
        ? data
        : (data.items || data.data || data.$values || []);
      
      const items = rawItems.map((p: any) => this.normalizeProducto(p));
      
      return {
        items,
        totalCount: Number(data.totalCount || items.length),
        page: Number(data.page || page),
        pageSize: Number(data.pageSize || pageSize),
        totalPages: Number(data.totalPages || 1)
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo productos paginados:', error);
      throw error;
    }
  }

  async getProductos(): Promise<ApiProducto[]> {
    try {
      const data = await httpClient.get('/Productos?page=1&pageSize=200');
      const rawItems = Array.isArray(data)
        ? data
        : (data.items || data.data || data.$values || []);
      return rawItems.map((p: any) => this.normalizeProducto(p));
    } catch (error: any) {
      console.error('❌ Error obteniendo todos los productos:', error);
      throw error;
    }
  }

  async getProductoById(id: number): Promise<ApiProducto> {
    const data = await httpClient.get(`/Productos/${id}`);
    return this.normalizeProducto(data);
  }

  async createProducto(data: any): Promise<ApiProducto> {
    // Si envían categoría por nombre, intentar resolver ID
    if (typeof data.categoria === 'string' && categoriasState.loaded) {
      const id = categoriasState.map[data.categoria.toLowerCase()];
      if (id) data.categoriaId = id;
    }
    
    const mapped = this.mapToApi(data);
    const result = await httpClient.post('/Productos', mapped);
    return this.normalizeProducto(result);
  }

  async updateProducto(id: number, data: any): Promise<ApiProducto> {
    const mapped = this.mapToApi(data);
    const result = await httpClient.put(`/Productos/${id}`, mapped);
    return this.normalizeProducto(result);
  }

  async deleteProducto(id: number): Promise<void> {
    await httpClient.delete(`/Productos/${id}`);
  }

  async updateProductoStatus(id: number, activo: boolean): Promise<void> {
    await httpClient.put(`/Productos/${id}/estado`, { estado: activo });
  }

  async adjustStock(id: number, delta: number, mode: 'increment' | 'decrement' = 'increment'): Promise<void> {
    // FE-M2: ajuste atómico vía endpoint dedicado del backend
    // (POST /Productos/{id}/ajustar-stock hace Stock = Stock + delta en una sola
    // operación SQL). Evita el patrón read-modify-write que perdía actualizaciones
    // concurrentes.
    const finalDelta = mode === 'increment' ? delta : -delta;
    await httpClient.post(`/Productos/${id}/ajustar-stock`, { delta: finalDelta });
  }

  async getCategorias(): Promise<ApiCategoria[]> {
    try {
      const data = await httpClient.get('/Categorias');
      const items = Array.isArray(data) ? data : (data.items || data.$values || []);
      
      // Actualizar mapa de categorías (FE-B4)
      items.forEach((c: any) => {
        if (c.nombre) categoriasState.map[c.nombre.toLowerCase()] = c.id;
      });
      categoriasState.loaded = true;
      
      return items;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  private normalizeProducto(p: any): ApiProducto {
    const cat = p.categoria || p.Categoria || null;
    const stock = Number(p.stock ?? p.Stock ?? p.cantidad ?? p.Cantidad ?? 0);
    const precio = Number(p.precio ?? p.Precio ?? p.precioVenta ?? p.PrecioVenta ?? 0);

    return {
      id: Number(p.id || p.Id),
      nombre: String(p.nombre || p.Nombre || ''),
      descripcion: p.descripcion || p.Descripcion || null,
      categoria: cat ? {
        id: Number(cat.id || cat.Id),
        nombre: String(cat.nombre || cat.Nombre || '')
      } : null,
      precioBase: Number(p.precioBase || p.PrecioBase || precio),
      precio,
      tipo: p.tipo || p.Tipo || 'Producto',
      precioVenta: precio,
      precioCompra: Number(p.precioCompra || p.PrecioCompra || 0),
      iva: Number(p.iva || p.Iva || 0),
      porcentajeIva: Number(p.porcentajeIva || p.PorcentajeIva || 0),
      stock,
      cantidad: stock,
      marca: p.marca || p.Marca || null,
      imagenProduc: p.imagenProduc || p.ImagenProduc || p.imagen || p.Imagen || null,
      activo: p.activo === true || p.Activo === true || p.estado === true || p.Estado === true
    };
  }

  private mapToApi(p: any): any {
    return {
      Id: p.id,
      Nombre: p.nombre,
      Descripcion: p.descripcion,
      CategoriaId: p.categoriaId || p.categoria?.id,
      PrecioVenta: p.precioVenta ?? p.precio,
      PrecioCompra: p.precioCompra,
      Stock: p.stock ?? p.cantidad,
      Marca: p.marca,
      ImagenProduc: p.imagenProduc || p.imagen,
      Estado: p.activo ?? p.estado,
      IVA: p.iva,
      PorcentajeIva: p.porcentajeIva
    };
  }

  // Compatibility methods
  async revertirStockProducto(id: number, delta: number): Promise<void> {
    await this.adjustStock(id, delta);
  }

  async getPrecioCompraPromedio(id: number): Promise<any> {
    try {
      const data = await httpClient.get(`/Productos/${id}/precio-compra-promedio`);
      return data;
    } catch {
      const p = await this.getProductoById(id);
      return {
        precioCompraPromedio: p.precioCompra || 0,
        cantidadComprasConsideradas: 0,
        cantidadTotalComprada: 0,
        ultimasCompras: []
      };
    }
  }

  async toggleProductoActivo(id: number, active?: boolean): Promise<void> {
    if (active === undefined) {
      const p = await this.getProductoById(id);
      active = !p.activo;
    }
    await this.updateProductoStatus(id, active);
  }

  async setProductoActivo(id: number, active: boolean): Promise<void> {
    await this.updateProductoStatus(id, active);
  }
}

export const productoService = new ProductoService();
export default productoService;
