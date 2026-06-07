import { httpClient } from '../../../shared/services/httpClient';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
  estado: boolean;
  productos: any[];
}

export interface CategoriaCreateRequest {
  nombre: string;
  descripcion?: string;
  estado: boolean;
}

export interface CategoriaUpdateRequest {
  id: number;
  nombre: string;
  descripcion?: string;
  estado: boolean;
}

export interface PagedCategorias {
  items: Categoria[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class CategoriaService {
  private extract(raw: any): any[] {
    return Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) ? (raw as any).items
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) ? (raw as any).data
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).$values)) ? (raw as any).$values
      : [];
  }

  /**
   * Obtiene una página de categorías (FE-M12: Optimización de paginación)
   */
  async getCategoriasPaged(page = 1, pageSize = 50): Promise<PagedCategorias> {
    try {
      const raw = await httpClient.get(`/Categorias?page=${page}&pageSize=${pageSize}`);
      const items = this.extract(raw);
      
      return {
        items,
        totalCount: Number(raw?.totalCount ?? items.length),
        page: Number(raw?.page ?? page),
        pageSize: Number(raw?.pageSize ?? pageSize),
        totalPages: Number(raw?.totalPages ?? 1)
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo categorías paginadas:', error);
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }
  }

  /**
   * @deprecated Usar getCategoriasPaged para mejor rendimiento.
   */
  async getCategorias(): Promise<Categoria[]> {
    const res = await this.getCategoriasPaged(1, 100);
    return res.items;
  }

  async getCategoriaById(id: number): Promise<Categoria> {
    try {
      return await httpClient.get(`/Categorias/${id}`);
    } catch (error: any) {
      console.error(`❌ Error obteniendo categoría ${id}:`, error);
      throw error;
    }
  }

  async createCategoria(data: CategoriaCreateRequest): Promise<Categoria> {
    try {
      return await httpClient.post('/Categorias', data);
    } catch (error: any) {
      console.error('❌ Error creando categoría:', error);
      throw error;
    }
  }

  async updateCategoria(id: number, data: CategoriaUpdateRequest): Promise<Categoria> {
    try {
      return await httpClient.put(`/Categorias/${id}`, data);
    } catch (error: any) {
      console.error(`❌ Error actualizando categoría ${id}:`, error);
      throw error;
    }
  }

  async deleteCategoria(id: number): Promise<void> {
    try {
      await httpClient.delete(`/Categorias/${id}`);
    } catch (error: any) {
      console.error(`❌ Error eliminando categoría ${id}:`, error);
      throw error;
    }
  }

  async updateCategoriaStatus(id: number, estado: boolean): Promise<void> {
    try {
      await httpClient.put(`/Categorias/${id}/estado`, { estado });
    } catch (error: any) {
      console.error(`❌ Error actualizando estado de categoría ${id}:`, error);
      throw error;
    }
  }
}

export const categoriaService = new CategoriaService();
export default categoriaService;
