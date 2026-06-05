import { httpClient } from '../../../shared/services/httpClient';

export interface Proveedor {
  id?: number;
  tipoProveedor?: 'Juridico' | 'Natural';
  nombre: string;
  razonSocial?: string;
  nit?: string;
  tipoIdentificacion?: string;
  numeroIdentificacion?: string;
  tipoIdentificacionProveedor?: string | null;
  identificacion?: string;
  correo?: string;
  telefono?: string | null;
  direccion?: string;
  ciudad?: string;
  departamento?: string;
  representanteLegal?: string;
  documentoRepresentante?: string;
  sectorEconomico?: string;
  anosOperacion?: number;
  tipoIdentificacionRepresentante?: string | null;
  identificacionRepresentante?: string | null;
  correoRepresentante?: string;
  telefonoRepresentante?: string;
  estado?: boolean;
  compras?: any[];
  numero?: string;
  activo?: boolean;
  fechaCreacion?: string;
}

class ProveedorService {
  private extract(raw: any): any[] {
    return Array.isArray(raw)
      ? raw
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).items)) ? (raw as any).items
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).data)) ? (raw as any).data
      : (raw && typeof raw === 'object' && Array.isArray((raw as any).$values)) ? (raw as any).$values
      : [];
  }

  private normalize(raw: any): Proveedor {
    if (!raw) return {} as Proveedor;
    return {
      ...raw,
      id: Number(raw.id || raw.Id || 0),
      nombre: raw.nombre || raw.Nombre || '',
      estado: raw.estado === true || raw.Estado === true,
      activo: raw.estado === true || raw.Estado === true
    };
  }

  async getProveedores(page = 1, pageSize = 100): Promise<Proveedor[]> {
    try {
      const raw = await httpClient.get(`/Proveedores?page=${page}&pageSize=${pageSize}`);
      const data = this.extract(raw);
      return data.map(p => this.normalize(p));
    } catch (error: any) {
      console.error('❌ Error obteniendo proveedores:', error);
      throw error;
    }
  }

  async getProveedorById(id: number): Promise<Proveedor> {
    try {
      const data = await httpClient.get(`/Proveedores/${id}`);
      return this.normalize(data);
    } catch (error: any) {
      console.error(`❌ Error obteniendo proveedor ${id}:`, error);
      throw error;
    }
  }

  async createProveedor(data: Proveedor): Promise<Proveedor> {
    try {
      const result = await httpClient.post('/Proveedores', data);
      return this.normalize(result);
    } catch (error: any) {
      console.error('❌ Error creando proveedor:', error);
      throw error;
    }
  }

  async updateProveedor(id: number, data: Proveedor): Promise<Proveedor> {
    try {
      const result = await httpClient.put(`/Proveedores/${id}`, data);
      return this.normalize(result);
    } catch (error: any) {
      console.error(`❌ Error actualizando proveedor ${id}:`, error);
      throw error;
    }
  }

  async deleteProveedor(id: number): Promise<void> {
    try {
      await httpClient.delete(`/Proveedores/${id}`);
    } catch (error: any) {
      console.error(`❌ Error eliminando proveedor ${id}:`, error);
      throw error;
    }
  }

  async updateProveedorStatus(id: number, estado: boolean): Promise<void> {
    try {
      await httpClient.post(`/Proveedores/${id}/estado`, { estado });
    } catch (error: any) {
      console.error(`❌ Error actualizando estado de proveedor ${id}:`, error);
      throw error;
    }
  }

  // Compatibility methods
  async obtenerProveedores(): Promise<Proveedor[]> {
    return this.getProveedores();
  }

  async crearProveedor(data: Proveedor): Promise<Proveedor> {
    return this.createProveedor(data);
  }

  async obtenerProveedorPorId(id: number): Promise<Proveedor> {
    return this.getProveedorById(id);
  }

  async actualizarProveedor(id: number, data: Proveedor): Promise<Proveedor> {
    return this.updateProveedor(id, data);
  }

  async eliminarProveedor(id: number): Promise<void> {
    return this.deleteProveedor(id);
  }

  async cambiarEstadoProveedor(id: number, estado: boolean): Promise<void> {
    return this.updateProveedorStatus(id, estado);
  }
}

export const proveedorService = new ProveedorService();
export default proveedorService;
