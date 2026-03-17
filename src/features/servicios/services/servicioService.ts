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
      const response = await this.request('/servicios');
      const text = await response.text();
      const parsed = text ? JSON.parse(text) : [];
      console.log('✅ Servicios obtenidos:', parsed);

      const arr: any[] = Array.isArray(parsed)
        ? parsed
        : (parsed && typeof parsed === 'object' && Array.isArray((parsed as any).items)) ? (parsed as any).items : [];

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
