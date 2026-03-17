const API_BASE_URL = '/api';

export interface Servicio {
  id: number;
  nombre: string;
  precio: number;
  descripcion?: string;
  duracion?: number;
  estado?: boolean; // Add state field
  imagen?: string;
}

class ServicioService {
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
      console.log(`ServicioService [${config.method || 'GET'}]: ${url}`);
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ServicioService Error [${response.status}]: ${errorText}`);
        throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('ServicioService Network/API Error:', error);
      throw error;
    }
  }

  async getServicios(): Promise<Servicio[]> {
    try {
      console.log('📥 Obteniendo servicios desde:', `${API_BASE_URL}/servicios`);
      const arr: any[] = [];
      const extract = (parsed: any): any[] => Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) ? (parsed as any).items
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).data)) ? (parsed as any).data
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).$values)) ? (parsed as any).$values
        : [];
      const firstResponse = await this.request('/servicios?page=1&pageSize=5');
      const firstText = await firstResponse.text();
      const firstParsed = firstText ? JSON.parse(firstText) : [];
      arr.push(...extract(firstParsed));
      let totalPages = firstParsed && typeof firstParsed === 'object' && !Array.isArray(firstParsed)
        ? Number((firstParsed as any).totalPages ?? 1)
        : 1;
      totalPages = Math.min(Math.max(1, totalPages), 200);
      if (totalPages > 1) {
        const promises: Promise<any[]>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          promises.push((async () => {
            const response = await this.request(`/servicios?page=${page}&pageSize=5`);
            const text = await response.text();
            const parsed = text ? JSON.parse(text) : [];
            return extract(parsed);
          })());
        }
        const rest = await Promise.all(promises);
        rest.forEach(items => arr.push(...items));
      }

      const normalizedData = arr.map((item: any) => ({
        id: item.id || item.Id,
        nombre: item.nombre || item.Nombre,
        precio: item.precio || item.Precio,
        descripcion: item.descripcion || item.Descripcion,
        duracion: item.duracion || item.Duracion || item.duracionMinutes || item.DuracionMinutes || item.duracionMinutos || item.DuracionMinutos,
        estado: item.estado === true || item.Estado === true || item.estado === 1 || item.Estado === 1,
        imagen: item.imagen || item.Imagen
      }));

      return normalizedData;
    } catch (error: any) {
      console.error('❌ Error obteniendo servicios:', error);
      throw error;
    }
  }
}

export const servicioService = new ServicioService();
export default servicioService;
