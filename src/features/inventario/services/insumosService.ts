/**
 * Servicio para gestión de Insumos/Productos
 * API: http://edwisbarber.somee.com/api/Productos
 */

export interface Insumo {
  id: number;
  nombre: string;
  categoria: string;
  stock: number;
  stockVentas?: number;
  stockInsumos?: number;
  minimo: number;
  precio: number;
  imagen: string;
  activo?: boolean;
}

const API_BASE_URL = '/api';

const pickNumber = (obj: any, keys: string[], fallback = 0) => {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return Number(v);
  }
  return fallback;
};

const inferNumberByKeyMatch = (
  obj: any,
  matcher: (key: string) => boolean,
  fallback = 0
) => {
  if (!obj || typeof obj !== 'object') return fallback;

  for (const [k, v] of Object.entries(obj)) {
    if (!matcher(k)) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }

  return fallback;
};

class InsumosService {
  private extractArray(data: any): any[] {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      if (Array.isArray(data.$values)) return data.$values;
      if (Array.isArray(data.items)) return data.items;
      if (Array.isArray(data.data)) return data.data;
      if (data.data && Array.isArray(data.data.$values)) return data.data.$values;
      if (data.items && Array.isArray(data.items.$values)) return data.items.$values;
    }
    return [];
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorText = await response.text();
        console.error('❌ Respuesta de error del servidor:', errorText);
        errorMessage += ` - ${errorText}`;
      } catch (e) {
        console.error('❌ No se pudo leer el error del servidor');
      }
      throw new Error(errorMessage);
    }

    return response;
  }

  // Obtener todos los insumos
  async getInsumos(): Promise<Insumo[]> {
    try {
      console.log('📋 Obteniendo insumos...');
      const response = await this.request('/Productos');
      const text = await response.text();
      const raw = text ? JSON.parse(text) : [];

      const rawArray = this.extractArray(raw);

      if (rawArray.length > 0) {
        console.log('🧪 Producto raw[0] desde API:', rawArray[0]);
      }

      const data: Insumo[] = rawArray.map((p: any) => {
        const categoria = (() => {
          if (typeof p?.categoria === 'string') return p.categoria;
          const candidates = [
            p?.categoria?.nombre,
            p?.Categoria?.Nombre,
            p?.categoria?.name,
            p?.categoriaNombre,
            p?.CategoriaNombre,
            p?.producto?.categoria?.nombre,
            p?.Producto?.Categoria?.Nombre,
            p?.producto?.categoriaNombre,
            p?.Producto?.CategoriaNombre,
          ];
          const found = candidates.find((v) => typeof v === 'string' && v);
          return found ?? '';
        })();

        const stockVentas = pickNumber(p, ['stockVentas', 'StockVentas', 'stockVenta', 'StockVenta'], Number.NaN);
        const stockInsumos = pickNumber(p, ['stockInsumos', 'StockInsumos'], Number.NaN);

        return {
          id: Number(p?.id ?? p?.productoId ?? 0),
          nombre: String(p?.nombre ?? p?.nombreProducto ?? p?.descripcion ?? ''),
          categoria: String(categoria),
          stock: (() => {
            const direct = pickNumber(p, ['stockInsumos', 'StockInsumos', 'stock', 'Stock', 'existencia', 'Existencia', 'cantidad', 'Cantidad', 'stockActual', 'StockActual', 'cantidadDisponible', 'CantidadDisponible'], Number.NaN);
            if (!Number.isNaN(direct)) return direct;

            const inferred = inferNumberByKeyMatch(
              p,
              (k) => /stock|exist/i.test(k) && !/min|max/i.test(k),
              Number.NaN
            );

            if (!Number.isNaN(inferred)) return inferred;

            // Nested common shapes
            const nested = pickNumber(p?.inventario, ['stock', 'Stock', 'existencia', 'Existencia'], 0);
            return nested;
          })(),
          stockVentas: Number.isNaN(stockVentas) ? undefined : stockVentas,
          stockInsumos: Number.isNaN(stockInsumos) ? undefined : stockInsumos,
          minimo: (() => {
            const direct = pickNumber(p, ['minimo', 'Minimo', 'stockMinimo', 'StockMinimo', 'minStock', 'MinStock'], Number.NaN);
            if (!Number.isNaN(direct)) return direct;

            const inferred = inferNumberByKeyMatch(
              p,
              (k) => /(minimo|min)/i.test(k) && /stock/i.test(k),
              Number.NaN
            );

            if (!Number.isNaN(inferred)) return inferred;

            const nested = pickNumber(p?.inventario, ['minimo', 'Minimo', 'stockMinimo', 'StockMinimo'], 0);
            return nested;
          })(),
          // Precio de venta (lo que se debe sumar en el resumen)
          precio: (() => {
            const direct = pickNumber(
              p,
              [
                'PrecioVenta',
                'precioVenta',
                'precio_venta',
                'precioVentaUnitario',
                'precio',
                'Precio',
                'valor',
                'Valor',
              ],
              Number.NaN
            );

            if (!Number.isNaN(direct)) return direct;

            // A veces viene en PascalCase/camelCase distinto o anidado
            const inferred = inferNumberByKeyMatch(
              p,
              (k) => /precio.*venta|venta.*precio/i.test(k),
              Number.NaN
            );
            if (!Number.isNaN(inferred)) return inferred;

            const nested = pickNumber(p?.producto ?? p?.detalle, ['PrecioVenta', 'precioVenta', 'precio', 'Precio'], 0);
            return nested;
          })(),
          imagen: String(p?.imagen ?? p?.Imagen ?? p?.imagenProduc ?? p?.ImagenProduc ?? p?.imagenUrl ?? p?.ImagenUrl ?? ''),
          activo: Boolean(
            p?.activo === true || p?.Activo === true ||
            p?.estado === true || p?.Estado === true ||
            p?.active === true || p?.Active === true ||
            (p?.activo !== false && p?.Activo !== false && p?.estado !== false && p?.Estado !== false && p?.active !== false && p?.Active !== false)
          )
        };
      });

      console.log('✅ Insumos obtenidos:', data);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo insumos:', error);
      throw error;
    }
  }

  // Obtener un insumo por ID
  async getInsumoById(id: number): Promise<Insumo | null> {
    try {
      console.log(`🔍 Obteniendo insumo ${id}...`);
      const response = await this.request(`/Productos/${id}`);
      const text = await response.text();

      if (!text) return null;

      const p: any = JSON.parse(text);
      const categoria = (() => {
        if (typeof p?.categoria === 'string') return p.categoria;
        const candidates = [
          p?.categoria?.nombre,
          p?.Categoria?.Nombre,
          p?.categoria?.name,
          p?.categoriaNombre,
          p?.CategoriaNombre,
          p?.producto?.categoria?.nombre,
          p?.Producto?.Categoria?.Nombre,
          p?.producto?.categoriaNombre,
          p?.Producto?.CategoriaNombre,
        ];
        const found = candidates.find((v) => typeof v === 'string' && v);
        return found ?? '';
      })();

      const stockVentas = pickNumber(p, ['stockVentas', 'StockVentas', 'stockVenta', 'StockVenta'], Number.NaN);
      const stockInsumos = pickNumber(p, ['stockInsumos', 'StockInsumos'], Number.NaN);
      const stock = pickNumber(p, ['stockInsumos', 'StockInsumos', 'stock', 'Stock', 'existencia', 'Existencia', 'cantidad', 'Cantidad'], 0);
      const minimo = pickNumber(p, ['minimo', 'Minimo', 'stockMinimo', 'StockMinimo'], 0);
      const precio = pickNumber(p, ['PrecioVenta', 'precioVenta', 'precio', 'Precio', 'valor', 'Valor'], 0);

      const data: Insumo = {
        id: Number(p?.id ?? p?.productoId ?? id),
        nombre: String(p?.nombre ?? p?.nombreProducto ?? p?.descripcion ?? ''),
        categoria: String(categoria),
        stock,
        stockVentas: Number.isNaN(stockVentas) ? undefined : stockVentas,
        stockInsumos: Number.isNaN(stockInsumos) ? undefined : stockInsumos,
        minimo,
        precio,
        imagen: String(p?.imagen ?? p?.Imagen ?? p?.imagenProduc ?? p?.ImagenProduc ?? p?.imagenUrl ?? p?.ImagenUrl ?? ''),
        activo: Boolean(
          p?.activo === true || p?.Activo === true ||
          p?.estado === true || p?.Estado === true ||
          p?.active === true || p?.Active === true ||
          (p?.activo !== false && p?.Activo !== false && p?.estado !== false && p?.Estado !== false && p?.active !== false && p?.Active !== false)
        )
      };

      console.log(`✅ Insumo ${id} obtenido:`, data);
      return data;
    } catch (error) {
      console.error(`❌ Error obteniendo insumo ${id}:`, error);
      return null;
    }
  }
}

export const insumosService = new InsumosService();
