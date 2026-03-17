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

class CategoriaService {
  private readonly API_BASE_URL = '/api';

  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.API_BASE_URL}${endpoint}`;

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
      console.log(`API [${config.method || 'GET'}]: ${url}`);
      if (config.body) {
        console.log(`📤 Request Body:`, config.body);
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error [${response.status}]: ${errorText}`);
        throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Network/API Error:', error);
      throw error;
    }
  }

  async getCategorias(): Promise<Categoria[]> {
    try {
      console.log('📥 Obteniendo categorías desde:', `${this.API_BASE_URL}/categorias`);
      const response = await this.request('/Categorias');
      const text = await response.text();
      const data = text ? JSON.parse(text) : [];
      console.log('✅ Categorías obtenidas:', data);
      if (Array.isArray(data)) return data;
      if (data && typeof data === 'object' && Array.isArray((data as any).items)) {
        return (data as any).items as Categoria[];
      }
      return [];
    } catch (error: any) {
      console.error('❌ Error obteniendo categorías:', error);
      throw error;
    }
  }

  async getCategoriaById(id: number): Promise<Categoria | null> {
    try {
      console.log(`📥 Obteniendo categoría ${id}...`);
      const response = await this.request(`/Categorias/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Categoría ${id} obtenida:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error obteniendo categoría ${id}:`, error);
      throw error;
    }
  }

  async createCategoria(categoriaData: CategoriaCreateRequest): Promise<Categoria> {
    try {
      const mapped = {
        Nombre: categoriaData.nombre,
        Descripcion: categoriaData.descripcion || null,
        Estado: categoriaData.estado
      };
      console.log('📤 Creando categoría:', mapped);
      const response = await this.request('/Categorias', {
        method: 'POST',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log('✅ Categoría creada:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error creando categoría:', error);
      throw error;
    }
  }

  async updateCategoria(id: number, categoriaData: CategoriaUpdateRequest): Promise<Categoria> {
    try {
      const mapped = {
        Id: id,
        Nombre: categoriaData.nombre,
        Descripcion: categoriaData.descripcion || null,
        Estado: categoriaData.estado
      };
      console.log(`📤 Actualizando categoría ${id}:`, mapped);
      const response = await this.request(`/Categorias/${id}`, {
        method: 'PUT',
        body: JSON.stringify(mapped),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      console.log(`✅ Categoría ${id} actualizada:`, data);
      return data;
    } catch (error: any) {
      console.error(`❌ Error actualizando categoría ${id}:`, error);
      throw error;
    }
  }

  async updateCategoriaStatus(id: number, estado: boolean): Promise<void> {
    try {
      await this.request(`/Categorias/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ Estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado a ${estado}`);
      return;
    } catch (error: any) {
      console.warn(`❌ Error actualizando estado de categoría ${id} (PUT /Categorias), probando fallbacks...`, error);
    }
    try {
      await this.request(`/Categorias/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado a ${estado} (fallback PUT con 'estado')`);
      return;
    } catch (e1) {
      console.warn(`❌ Falló PUT /Categorias/${id}/estado con 'estado', probando POST...`, e1);
    }
    try {
      await this.request(`/Categorias/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ Estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado (fallback POST con 'Estado')`);
      return;
    } catch (e2) {
      console.warn(`❌ Falló POST /Categorias/${id}/estado con 'Estado', probando POST con ambos...`, e2);
    }
    try {
      await this.request(`/Categorias/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado: estado, Estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado (fallback POST con ambos campos)`);
      return;
    } catch (e3) {
      console.warn(`❌ Falló POST /Categorias/${id}/estado con ambos campos, probando rutas en minúscula...`, e3);
    }
    try {
      await this.request(`/categorias/${id}/estado`, {
        method: 'PUT',
        body: JSON.stringify({ Estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado (fallback PUT /categorias)`);
      return;
    } catch (e4) {
      console.warn(`❌ Falló PUT /categorias/${id}/estado, probando POST /categorias...`, e4);
    }
    try {
      await this.request(`/categorias/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ Estado: estado, estado: estado }),
      });
      console.log(`✅ Estado de categoría ${id} actualizado (fallback POST /categorias)`);
      return;
    } catch (e5) {
      console.warn(`❌ Falló POST /categorias/${id}/estado, intentando actualización completa...`, e5);
    }
    try {
      const existing = await this.getCategoriaById(id);
      if (existing) {
        const mapped = {
          Id: id,
          Nombre: existing.nombre,
          Descripcion: existing.descripcion || null,
          Estado: estado
        };
        await this.request(`/Categorias/${id}`, {
          method: 'PUT',
          body: JSON.stringify(mapped),
        });
        console.log(`✅ Estado de categoría ${id} actualizado (fallback PUT /Categorias con entidad completa)`);
        return;
      }
    } catch (e6) {
      console.error(`❌ Error actualizando estado de categoría ${id} tras múltiples intentos:`, e6);
      throw e6;
    }
  }

  async deleteCategoria(id: number): Promise<void> {
    try {
      console.log(`🗑️ Eliminando categoría ${id}...`);
      await this.request(`/Categorias/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Categoría ${id} eliminada`);
    } catch (error: any) {
      console.error(`❌ Error eliminando categoría ${id}:`, error);
      throw error;
    }
  }
}

export const categoriaService = new CategoriaService();
