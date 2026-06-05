import { httpClient } from '../../../shared/services/httpClient';

/**
 * Servicio para gestión de Insumos/Productos
 */

export interface Insumo {
  id: number;
  nombre: string;
  categoria: string;
  stock: number;
  minimo: number;
  precio: number;
  imagen: string;
  activo?: boolean;
}

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

  // Obtener todos los insumos
  async getInsumos(): Promise<Insumo[]> {
    try {
      const raw = await httpClient.get('/Productos');
      const data = this.extractArray(raw);
      
      return data.map((item: any) => ({
        id: item.id || item.Id || 0,
        nombre: item.nombre || item.Nombre || 'Sin nombre',
        categoria: item.categoria?.nombre || item.Categoria?.Nombre || 'General',
        stock: pickNumber(item, ['stock', 'Stock', 'cantidad', 'Cantidad']),
        minimo: inferNumberByKeyMatch(item, k => k.toLowerCase().includes('minimo')),
        precio: pickNumber(item, ['precio', 'Precio', 'costo', 'Costo']),
        imagen: item.imagenProduc || item.ImagenProduc || item.imagen || item.Imagen || '',
        activo: item.estado === true || item.Estado === true || item.activo === true || item.Activo === true
      }));
    } catch (error: any) {
      console.error('❌ Error obteniendo insumos:', error);
      throw error;
    }
  }

  // Actualizar stock de un insumo
  async updateStock(id: number, nuevoStock: number): Promise<void> {
    try {
      // Intentar primero con un endpoint específico de stock si existe
      // o usar el update normal de producto
      await httpClient.put(`/Productos/${id}`, { stock: nuevoStock });
    } catch (error: any) {
      console.error(`❌ Error actualizando stock de insumo ${id}:`, error);
      throw error;
    }
  }
}

export const insumosService = new InsumosService();
export default insumosService;
