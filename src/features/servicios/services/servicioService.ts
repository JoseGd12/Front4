import { httpClient } from '../../../shared/services/httpClient';

export interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  duracion?: number;
  estado?: boolean; // Add state field
  imagen?: string;
}

export interface PagedServicios {
  items: Servicio[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ServicioService {
  private extract(parsed: any): any[] {
    return Array.isArray(parsed)
      ? parsed
      : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) ? (parsed as any).items
      : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).data)) ? (parsed as any).data
      : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).$values)) ? (parsed as any).$values
      : [];
  }

  private normalize(item: any): Servicio {
    return {
      id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      precio: item.precio || item.Precio,
      descripcion: item.descripcion || item.Descripcion,
      duracion: item.duracion || item.Duracion || item.duracionMinutes || item.DuracionMinutes || item.duracionMinutos || item.DuracionMinutos,
      estado: item.estado === true || item.Estado === true || item.estado === 1 || item.Estado === 1,
      imagen: item.imagen || item.Imagen
    };
  }

  /**
   * Obtiene una página de servicios (FE-M12: Optimización de paginación)
   */
  async getServiciosPaged(page = 1, pageSize = 50): Promise<PagedServicios> {
    try {
      const raw = await httpClient.get(`/servicios?page=${page}&pageSize=${pageSize}`);
      const rawItems = this.extract(raw);
      const items = rawItems.map(item => this.normalize(item));

      return {
        items,
        totalCount: Number(raw?.totalCount ?? items.length),
        page: Number(raw?.page ?? page),
        pageSize: Number(raw?.pageSize ?? pageSize),
        totalPages: Number(raw?.totalPages ?? 1)
      };
    } catch (error: any) {
      console.error('❌ Error obteniendo servicios paginados:', error);
      return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
    }
  }

  /**
   * @deprecated Usar getServiciosPaged para mejor rendimiento.
   */
  async getServicios(): Promise<Servicio[]> {
    const res = await this.getServiciosPaged(1, 100);
    return res.items;
  }

  async getServicioById(id: number): Promise<Servicio> {
    const data = await httpClient.get(`/servicios/${id}`);
    return this.normalize(data);
  }

  async createServicio(data: Partial<Servicio>): Promise<Servicio> {
    const result = await httpClient.post('/servicios', data);
    return this.normalize(result);
  }

  async updateServicio(id: number, data: Partial<Servicio>): Promise<Servicio> {
    const result = await httpClient.put(`/servicios/${id}`, data);
    return this.normalize(result);
  }

  async deleteServicio(id: number): Promise<void> {
    await httpClient.delete(`/servicios/${id}`);
  }

  async updateServicioStatus(id: number, estado: boolean): Promise<void> {
    await httpClient.post(`/servicios/${id}/estado`, { estado });
  }
}

export const servicioService = new ServicioService();
export default servicioService;
