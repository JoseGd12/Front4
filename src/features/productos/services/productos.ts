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
  precioVenta?: number;
  precioCompra?: number;
  iva: number;
  porcentajeIva: number;
  stockVentas: number;
  stockInsumos: number;
  cantidad: number;
  minCantidad: number;
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

const API_BASE_URL = '/api';

// Mapeo dinámico de nombres de categorías a IDs (se pobla desde la API)
let CATEGORIA_MAP: { [key: string]: number } = {};
let CATEGORIAS_LOADED = false;

class ProductoService {
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
      const response = await fetch(url, config);
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = response.statusText;
        }
        console.error(`❌ Producto API Error [${response.status}]:`, errorText);
        throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
      }
      return response;
    } catch (error) {
      console.error('Producto API Network/Error:', error);
      throw error;
    }
  }

  async getProductosPaged(args: { page?: number; pageSize?: number; q?: string } & Record<string, any> = {}): Promise<{ items: ApiProducto[]; totalCount: number; page: number; pageSize: number; totalPages: number; }> {
    const page = Math.max(1, Number(args.page ?? 1));
    const pageSize = Math.max(1, Number(args.pageSize ?? 5));
    const q = args.q ?? '';
    const extra = { ...args };
    delete extra.page;
    delete extra.pageSize;
    delete extra.q;
    const qs = new URLSearchParams();
    qs.append('page', String(page));
    qs.append('pageSize', String(pageSize));
    if (q) qs.append('q', q);
    Object.entries(extra).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      qs.append(k, String(v));
    });
    const query = qs.toString() ? `?${qs.toString()}` : '';
    const response = await this.request(`/Productos${query}`);
    const text = await response.text();
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
      const arr = Array.isArray(data.items) ? data.items : [];
      const items = arr.map((item: any) => this.mapFromApiFormat(item));
      const totalCount = Number(data.totalCount ?? items.length);
      const totalPages = Number(data.totalPages ?? Math.max(1, Math.ceil(totalCount / (Number(data.pageSize) || pageSize))));
      return {
        items,
        totalCount,
        page: Number(data.page ?? page),
        pageSize: Number(data.pageSize ?? pageSize),
        totalPages
      };
    }
    const arr: any[] = Array.isArray(data) ? data : [];
    const normalized = arr.map(item => this.mapFromApiFormat(item));
    const totalCount = normalized.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const items = normalized.slice(start, start + pageSize);
    return { items, totalCount, page, pageSize, totalPages };
  }

  private mapFromApiFormat(data: any): ApiProducto {
    if (!data) return data as any;

    // Normalizar categoría: leer id y nombre desde objeto, ID suelto o nombres en raíz
    const catRaw = data.Categoria || data.categoria;
    const catIdRaw = data.CategoriaId || data.categoriaId || data.IdCategoria || data.idCategoria;
    const nombreDesdeRaiz = [
      data.CategoriaNombre,
      data.categoriaNombre,
      data.NombreCategoria,
      data.nombreCategoria,
      data.productoCategoria,
      data.ProductoCategoria
    ].find((v) => typeof v === 'string' && v.trim()) as string | undefined;
    const nombreCategoriaRaiz = nombreDesdeRaiz ? String(nombreDesdeRaiz).trim() : '';

    let categoriaNormalizada: { id: number; nombre: string } | null = null;

    if (catRaw && typeof catRaw === 'object') {
      const id = Number(catRaw.Id || catRaw.id || catIdRaw || 0);
      const nombre = String(catRaw.Nombre || catRaw.nombre || nombreCategoriaRaiz || '').trim();
      categoriaNormalizada = { id, nombre: nombre || '' };
    } else if (catIdRaw || (catRaw && typeof catRaw === 'number')) {
      categoriaNormalizada = {
        id: Number(catIdRaw || catRaw),
        nombre: nombreCategoriaRaiz
      };
    } else if (nombreCategoriaRaiz) {
      categoriaNormalizada = { id: Number(catIdRaw || 0), nombre: nombreCategoriaRaiz };
    }

    // Normalizar flags de estado/activo provenientes de la API
    const estadoRaw = (data as any).Estado ?? (data as any).estado;
    let activoNormalizado: boolean;

    if (
      (data as any).Activo !== undefined ||
      (data as any).activo !== undefined ||
      estadoRaw !== undefined
    ) {
      // Si la API envía explícitamente alguno de los flags, usamos su valor
      const flag =
        (data as any).Activo ??
        (data as any).activo ??
        estadoRaw;
      activoNormalizado = !!flag;
    } else {
      // Fallback: si no hay ningún flag, asumimos que el producto está activo
      activoNormalizado = true;
    }

    return {
      id: data.Id || data.id,
      nombre: data.Nombre || data.nombre,
      descripcion: data.Descripcion || data.descripcion,
      categoria: categoriaNormalizada,
      precioBase: Number(data.PrecioBase || data.precioBase || data.precioVenta || data.precioCompra || 0),
      precio: Number(data.Precio || data.precio || data.precioVenta || data.precioCompra || 0),
      precioVenta: Number(data.PrecioVenta || data.precioVenta || data.Precio || data.precio || 0),
      precioCompra: Number(data.PrecioCompra || data.precioCompra || data.Precio || data.precio || 0),
      iva: Number(data.Iva || data.iva || 0),
      porcentajeIva: Number(data.PorcentajeIva || data.porcentajeIva || 0),
      stockVentas: Number(data.StockVentas ?? data.stockVentas ?? data.CantidadVentas ?? data.cantidadVentas ?? 0),
      stockInsumos: Number(data.StockInsumos ?? data.stockInsumos ?? data.CantidadInsumos ?? data.cantidadInsumos ?? 0),
      cantidad: Number(data.Cantidad ?? data.cantidad ?? data.StockTotal ?? data.stockTotal ?? 0),
      minCantidad: Number(data.MinCantidad || data.minCantidad || data.stockMinimo || 0),
      marca: data.Marca || data.marca || '',
      imagenProduc: data.imagenProduc || data.ImagenProduc || '',
      activo: activoNormalizado,
    };
  }

  async getProductos(): Promise<ApiProducto[]> {
    try {
      const response = await this.request('/Productos?page=1&pageSize=100');
      const text = await response.text();

      // A veces el backend devuelve 200 con body vacío / no JSON.
      // Evitamos romper la app y simplemente retornamos lista vacía.
      if (!text || !text.trim()) return [];

      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return [];
      }

      // Manejar envoltorio $values común en .NET
      if (data && typeof data === 'object' && !Array.isArray(data) && (data.$values || data.items || data.data)) {
        if (Array.isArray(data.$values)) {
          data = data.$values;
        } else if (Array.isArray(data.items)) {
          data = data.items;
        } else if (Array.isArray(data.data)) {
          data = data.data;
        }
      }
      if (data && typeof data === 'object' && !Array.isArray(data) && data.$values) {
        data = data.$values;
      }

      return Array.isArray(data) ? data.map(item => this.mapFromApiFormat(item)) : [];
    } catch (error) {
      console.error('Error fetching productos:', error);
      throw error;
    }
  }

  async getProductoById(id: number): Promise<ApiProducto | null> {
    try {
      const response = await this.request(`/Productos/${id}`);
      const text = await response.text();
      if (!text || !text.trim()) return null;
      const data = JSON.parse(text);
      return this.mapFromApiFormat(data);
    } catch (error) {
      return null;
    }
  }

  async createProducto(productoData: Partial<ApiProducto>): Promise<ApiProducto> {
    let categoriaId = 0;
    if (typeof (productoData as any).categoriaId === 'number' && (productoData as any).categoriaId > 0) {
      categoriaId = (productoData as any).categoriaId;
    } else if (typeof productoData.categoria === 'object' && productoData.categoria?.id) {
      categoriaId = productoData.categoria.id;
    } else {
      const categoriaName = String(typeof productoData.categoria === 'string' ? productoData.categoria : (productoData.categoria as any)?.nombre || '').trim();
      // Búsqueda insensible a mayúsculas/minúsculas en el mapa
      const mapping = Object.entries(CATEGORIA_MAP).find(([name]) => name.toLowerCase() === categoriaName.toLowerCase());
      categoriaId = mapping ? mapping[1] : (CATEGORIA_MAP[categoriaName] || 1);
    }

    console.log(`📦 Creando producto - CategoriaID resuelto: ${categoriaId} para categoria:`, productoData.categoria);

    const apiBody: any = {
      Nombre: productoData.nombre || '',
      Descripcion: productoData.descripcion || '',
      StockVentas: Number(productoData.stockVentas) || 0,
      StockInsumos: Number(productoData.stockInsumos) || 0,
      StockMinimo: Number(productoData.minCantidad) || 0,
      CategoriaId: categoriaId,
      ImagenProduc: productoData.imagenProduc || '',
      Estado: productoData.activo !== undefined ? !!productoData.activo : true,
      Activo: productoData.activo !== undefined ? !!productoData.activo : true
    };
    // Solo incluir precios si el frontend los define explícitamente
    if ((productoData as any).precioVenta !== undefined) {
      apiBody.PrecioVenta = Number((productoData as any).precioVenta);
    }
    if ((productoData as any).precioCompra !== undefined) {
      apiBody.PrecioCompra = Number((productoData as any).precioCompra);
    }

    const response = await this.request('/Productos', {
      method: 'POST',
      body: JSON.stringify(apiBody),
    });
    const text = await response.text();
    const result = text ? JSON.parse(text) : apiBody;
    return this.mapFromApiFormat(result);
  }

  async updateProducto(id: number, productoData: Partial<ApiProducto>): Promise<ApiProducto> {
    // Intentar obtener el ID de categoría de varias fuentes para evitar errores de mapeo
    let categoriaId = 0;

    // 1. Si ya viene el ID directamente
    if (typeof (productoData as any).categoriaId === 'number' && (productoData as any).categoriaId > 0) {
      categoriaId = (productoData as any).categoriaId;
    }
    // 2. Si viene un objeto categoría con ID
    else if (typeof productoData.categoria === 'object' && productoData.categoria?.id) {
      categoriaId = productoData.categoria.id;
    }
    // 3. Resolución por nombre
    else {
      const categoriaName = String(typeof productoData.categoria === 'string' ? productoData.categoria : (productoData.categoria as any)?.nombre || '').trim();

      // Si tenemos nombre, buscamos en el mapa
      if (categoriaName) {
        // Si no hemos cargado categorías aún, o el mapa está sospechosamente vacío
        if (!CATEGORIAS_LOADED || Object.keys(CATEGORIA_MAP).length === 0) {
          try {
            await this.getCategorias();
          } catch (e) {
            console.warn("⚠️ No se pudieron cargar categorías para resolución de ID");
          }
        }

        const mapping = Object.entries(CATEGORIA_MAP).find(([name]) => name.toLowerCase() === categoriaName.toLowerCase());
        categoriaId = mapping ? mapping[1] : (CATEGORIA_MAP[categoriaName] || 0);
      }
    }

    // 4. Si después de todo seguimos sin ID y es una actualización, intentar obtener el ID actual del producto
    if (categoriaId === 0 && id > 0) {
      try {
        const currentProd = await this.getProductoById(id);
        if (currentProd?.categoria?.id) {
          categoriaId = currentProd.categoria.id;
          console.log(`ℹ️ Usando CategoriaId actual del producto: ${categoriaId}`);
        }
      } catch (e) {
        // silenciar error de fetch
      }
    }

    // 5. Fallback dinámico: Si seguimos sin ID, usar el primero disponible en el mapa
    if (categoriaId === 0) {
      const ids = Object.values(CATEGORIA_MAP);
      if (ids.length > 0 && ids[0] !== undefined) {
        categoriaId = ids[0];
        console.log(`ℹ️ Fallback a primera categoría disponible: ${categoriaId}`);
      } else {
        // Si el mapa aún está vacío, intentar cargar y re-resolver
        try {
          const cats = await this.getCategorias();
          if (cats.length > 0 && cats[0]) {
            categoriaId = cats[0].id;
            console.log(`ℹ️ Fallback tras carga de emergencia: ${categoriaId}`);
          }
        } catch (e) {
          console.error("❌ Fallback fallido: No se pudo obtener ninguna categoría");
        }
      }
    }

    // Último recurso desesperado (aunque ya no debería ser 1 hardcodeado si sabemos que no existe)
    if (categoriaId === 0) categoriaId = 1;

    console.log(`📦 Actualizando producto ${id} - CategoriaId final: ${categoriaId}`);

    let stockVentasFinal = Number(productoData.stockVentas) || 0;
    let stockInsumosFinal = Number(productoData.stockInsumos) || 0;
    const usoProducto = (productoData as any).usoProducto;
    const consolidarStockEnVentas = !!(productoData as any).consolidarStockEnVentas || usoProducto === 'solo_venta';

    if (consolidarStockEnVentas) {
      stockVentasFinal = stockVentasFinal + stockInsumosFinal;
      stockInsumosFinal = 0;
    }

    if (consolidarStockEnVentas && stockInsumosFinal === 0 && id > 0) {
      try {
        const productoActual = await this.getProductoById(id);
        if (productoActual) {
          const stockVentasActual = Number(productoActual.stockVentas) || 0;
          const stockInsumosActual = Number(productoActual.stockInsumos) || 0;
          const totalActual = stockVentasActual + stockInsumosActual;
          if (stockInsumosActual > 0 && stockVentasFinal <= stockVentasActual) {
            stockVentasFinal = totalActual;
          }
        }
      } catch {}
    }

    const totalStockFinal = stockVentasFinal + stockInsumosFinal;
    const apiBody: any = {
      Id: id,
      Nombre: productoData.nombre,
      Descripcion: productoData.descripcion,
      PrecioVenta: (productoData as any).precioVenta !== undefined
        ? Number((productoData as any).precioVenta)
        : Number(productoData.precioBase),
      PrecioCompra: (productoData as any).precioCompra !== undefined
        ? Number((productoData as any).precioCompra)
        : Number(productoData.precioBase),
      StockVentas: stockVentasFinal,
      StockInsumos: stockInsumosFinal,
      CantidadVentas: stockVentasFinal,
      CantidadInsumos: stockInsumosFinal,
      StockTotal: totalStockFinal,
      Cantidad: totalStockFinal,
      stockVentas: stockVentasFinal,
      stockInsumos: stockInsumosFinal,
      cantidadVentas: stockVentasFinal,
      cantidadInsumos: stockInsumosFinal,
      stockTotal: totalStockFinal,
      cantidad: totalStockFinal,
      StockMinimo: Number(productoData.minCantidad),
      CategoriaId: categoriaId,
      Marca: productoData.marca || '',
      ImagenProduc: productoData.imagenProduc || '',
      Estado: productoData.activo !== undefined ? !!productoData.activo : true,
      Activo: productoData.activo !== undefined ? !!productoData.activo : true
    };

    const doUpdate = async (body: any) => {
      const response = await this.request(`/Productos/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      const text = await response.text();
      return text ? JSON.parse(text) : { ...body, id };
    };

    const result = await doUpdate(apiBody);
    const persisted = await this.getProductoById(id);
    const stockPersistidoCoincide = persisted
      ? (
        Number(persisted.stockVentas ?? 0) === Number(stockVentasFinal) &&
        Number(persisted.stockInsumos ?? 0) === Number(stockInsumosFinal)
      )
      : false;
    if (
      persisted &&
      (
        Number(persisted.stockVentas ?? 0) !== Number(stockVentasFinal) ||
        Number(persisted.stockInsumos ?? 0) !== Number(stockInsumosFinal)
      )
    ) {
      await doUpdate({
        ...apiBody,
        StockVentas: stockVentasFinal,
        StockInsumos: stockInsumosFinal,
        StockTotal: totalStockFinal,
        Cantidad: totalStockFinal
      });
      const persistedRetry = await this.getProductoById(id);
      const stockPersistidoTrasRetry = persistedRetry
        ? (
          Number(persistedRetry.stockVentas ?? 0) === Number(stockVentasFinal) &&
          Number(persistedRetry.stockInsumos ?? 0) === Number(stockInsumosFinal)
        )
        : false;
      if (persistedRetry && stockPersistidoTrasRetry) return persistedRetry;
      throw new Error('El servidor no persistió la transferencia de stock solicitada. El cambio no se guardó en base de datos.');
    }
    if (persisted && stockPersistidoCoincide) return persisted;
    if (persisted && !stockPersistidoCoincide) {
      throw new Error('El servidor respondió correctamente pero el stock persistido no coincide con el enviado.');
    }
    return this.mapFromApiFormat(result);
  }

  async deleteProducto(id: number): Promise<void> {
    await this.request(`/Productos/${id}`, { method: 'DELETE' });
  }

  // =============================================================================
  // MÉTODOS DE STOCK Y ESTADO
  // =============================================================================

  async toggleProductoActivo(id: number): Promise<ApiProducto> {
    const producto = await this.getProductoById(id);
    if (!producto) throw new Error('Producto no encontrado');
    const nuevoEstado = !producto.activo;
    await this.request(`/Productos/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ Estado: nuevoEstado, Activo: nuevoEstado }),
    });
    return await this.getProductoById(id) as ApiProducto;
  }

  async updateStock(id: number, stockVentas: number, stockInsumos: number): Promise<ApiProducto> {
    const producto = await this.getProductoById(id);
    if (!producto) throw new Error('Producto no encontrado');
    return await this.updateProducto(id, {
      ...producto,
      stockVentas,
      stockInsumos,
      cantidad: stockVentas + stockInsumos
    });
  }

  async adjustStock(id: number, cantidad: number, type: 'increment' | 'decrement', destino: 'ventas' | 'insumos' = 'insumos'): Promise<ApiProducto> {
    const producto = await this.getProductoById(id);
    if (!producto) throw new Error('Producto no encontrado');
    const factor = type === 'increment' ? 1 : -1;
    let nuevoStockVentas = producto.stockVentas || 0;
    let nuevoStockInsumos = producto.stockInsumos || 0;
    if (destino === 'ventas') nuevoStockVentas += (cantidad * factor);
    else nuevoStockInsumos += (cantidad * factor);
    return await this.updateStock(id, Math.max(0, nuevoStockVentas), Math.max(0, nuevoStockInsumos));
  }

  async revertirStockProducto(id: number, cantidadVentas: number, cantidadInsumos: number): Promise<ApiProducto> {
    const producto = await this.getProductoById(id);
    if (!producto) throw new Error('Producto no encontrado');
    const nuevoStockVentas = Math.max(0, (producto.stockVentas || 0) - (cantidadVentas || 0));
    const nuevoStockInsumos = Math.max(0, (producto.stockInsumos || 0) - (cantidadInsumos || 0));
    return await this.updateStock(id, nuevoStockVentas, nuevoStockInsumos);
  }

  async agregarStockInsumos(id: number, cantidad: number, motive?: string): Promise<ApiProducto> {
    console.log(`📦 Stock Insumos: +${cantidad} (${motive || 'Sin motivo'})`);
    return await this.adjustStock(id, cantidad, 'increment', 'insumos');
  }

  async transferirStock(id: number, cantidad: number, origen: 'ventas' | 'insumos', destino: 'ventas' | 'insumos'): Promise<ApiProducto> {
    try {
      const response = await this.request(`/Productos/${id}/transferir-stock`, {
        method: 'POST',
        body: JSON.stringify({ cantidad, origen, destino }),
      });
      const result = await response.json();
      return this.mapFromApiFormat(result);
    } catch {
      const response = await this.request(`/Productos/${id}/transferir-stock`, {
        method: 'POST',
        body: JSON.stringify({ Cantidad: cantidad, Origen: origen, Destino: destino }),
      });
      const result = await response.json();
      return this.mapFromApiFormat(result);
    }
  }

  async searchProductos(query: string): Promise<ApiProducto[]> {
    const productos = await this.getProductos();
    const q = query.toLowerCase();
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) ||
      p.descripcion?.toLowerCase().includes(q) ||
      p.marca?.toLowerCase().includes(q)
    );
  }

  async getCategorias(): Promise<ApiCategoria[]> {
    try {
      const response = await this.request('/Categorias?page=1&pageSize=100');
      const text = await response.text();
      if (!text || !text.trim()) return [];
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return [];
      }

      // Manejar envoltorio $values
      if (data && typeof data === 'object' && !Array.isArray(data) && data.$values) data = data.$values;
      if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray((data as any).items)) data = (data as any).items;
      if (data && typeof data === 'object' && !Array.isArray(data) && Array.isArray((data as any).data)) data = (data as any).data;

      const normalized = Array.isArray(data) ? data.map((cat: any) => ({
        id: cat.Id || cat.id,
        nombre: cat.Nombre || cat.nombre,
        descripcion: cat.Descripcion || cat.descripcion || null,
        estado: !!(cat.Estado || cat.estado || cat.Activo || cat.activo)
      })) : [];

      // Limpiar y poblar el mapa de categorías
      const nuevoMapa: { [key: string]: number } = {};
      normalized.forEach(cat => {
        if (cat.nombre) {
          nuevoMapa[cat.nombre.trim()] = cat.id;
        }
      });

      CATEGORIA_MAP = nuevoMapa;
      CATEGORIAS_LOADED = true;

      console.log("📂 CATEGORIA_MAP actualizado:", CATEGORIA_MAP);
      return normalized;
    } catch (error) {
      console.error("❌ Error en getCategorias:", error);
      return [];
    }
  }
}

export const productoService = new ProductoService();
export default productoService;

// UTILIDADES EXPORTADAS
export const formatCurrency = (amount: number): string => amount.toLocaleString('es-CO');
export const formatearPrecio = (precio: number): string => `$ ${precio.toLocaleString('es-CO')}`;
