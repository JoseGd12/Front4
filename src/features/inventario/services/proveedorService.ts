const API_BASE_URL = '/api';

export interface Proveedor {
  id?: number;

  // 1. Tipo de Proveedor
  tipoProveedor?: 'Juridico' | 'Natural';

  // 2. Nombre proveedor
  nombre: string;

  // 3. Tipo identificación prov.
  tipoIdentificacionProveedor?: string | null;

  // 4. Identificación
  identificacion?: string;

  // 5. Correo
  correo?: string;

  // 6. Teléfono
  telefono?: string | null;

  // 7. Dirección
  direccion?: string;

  // 8. Ciudad
  ciudad?: string;

  // 9. Departamento
  departamento?: string;

  // 10. Representante legal
  representanteLegal?: string;

  // 11. Tipo identificación rep.
  tipoIdentificacionRepresentante?: string | null;

  // 12. Identificación rep.
  identificacionRepresentante?: string | null;

  // 13. Correo representante
  correoRepresentante?: string;

  // 14. Teléfono representante
  telefonoRepresentante?: string;

  estado?: boolean;

  // Relaciones
  compras?: any[];

  // Aliases / compat de UI (no se envían a la API)
  numero?: string;
  activo?: boolean;
  fechaCreacion?: string;

  // ===== Aliases legacy mantenidos para no romper componentes que aún los usan =====
  /** @deprecated Usar identificacion */
  nit?: string;
  /** @deprecated Usar identificacionRepresentante */
  numeroIdentificacion?: string | null;
  /** @deprecated Usar tipoIdentificacionRepresentante */
  tipoIdentificacion?: string | null;
  /** @deprecated Usar representanteLegal */
  contacto?: string | null;
  /** @deprecated No existe en API */
  razonSocial?: string;
  /** @deprecated No existe en API */
  numeroIdentificacionRepLegal?: string;
  /** @deprecated No existe en API */
  cargoRepLegal?: string;
  /** @deprecated No existe en API */
  tipoDocumentoRepresentante?: string;
  /** @deprecated No existe en API */
  documentoRepresentante?: string;
  /** @deprecated No existe en API */
  sectorEconomico?: string;
  /** @deprecated No existe en API */
  anosOperacion?: number;
  /** @deprecated No existe en API */
  paginaWeb?: string;
  /** @deprecated Usar representanteLegal */
  personaContacto?: string;
  /** @deprecated No existe en API */
  apellidos?: string;
  /** @deprecated */
  tipoDocumentoContactoAdicional?: string;
  /** @deprecated */
  documentoContactoAdicional?: string;
  /** @deprecated */
  telefonoContactoAdicional?: string;
  /** @deprecated */
  correoContactoAdicional?: string;
}

class ProveedorService {
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
      console.log(`Proveedor API [${config.method || 'GET'}]: ${url}`);
      if (config.body) {
        console.log(`📤 Proveedor Request Body:`, config.body);
      }

      const response = await fetch(url, config);

      if (!response.ok) {
        const errorText = await response.text();
        const allowHeader = response.headers.get('allow');
        const allowInfo = allowHeader ? ` (Allow: ${allowHeader})` : '';
        console.error(`❌ Proveedor API Error [${response.status}]${allowInfo}: ${errorText}`);
        throw new Error(`Error del servidor (${response.status})${allowInfo}: ${errorText || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Proveedor Network/API Error:', error);
      throw error;
    }
  }

  /**
   * Mapeo del Proveedor al formato JSON que espera la API.
   * Solo incluye los 14 campos definidos en la entidad Proveedor del backend.
   */
  private mapToApiFormatJson(data: Partial<Proveedor>): any {
    const tipo = data.tipoProveedor || 'Juridico';
    const tipoIdentProv = data.tipoIdentificacionProveedor || (tipo === 'Natural' ? 'CC' : 'NIT');
    const tipoIdentRep = data.tipoIdentificacionRepresentante || data.tipoIdentificacion || (tipo === 'Juridico' ? 'CC' : null);
    const identificacion = data.identificacion || data.nit || '';
    const identificacionRep = data.identificacionRepresentante || data.numeroIdentificacion || '';
    const representante = data.representanteLegal || data.personaContacto || data.contacto || '';

    return {
      // 1
      TipoProveedor: tipo,
      // 2
      Nombre: data.nombre || '',
      // 3
      TipoIdentificacionProveedor: tipoIdentProv,
      // 4
      Identificacion: identificacion,
      // 5
      Correo: data.correo || '',
      // 6
      Telefono: data.numero || data.telefono || '',
      // 7
      Direccion: data.direccion || '',
      // 8
      Ciudad: data.ciudad || '',
      // 9
      Departamento: data.departamento || '',
      // 10
      RepresentanteLegal: representante,
      // 11
      TipoIdentificacionRepresentante: tipoIdentRep,
      // 12
      IdentificacionRepresentante: identificacionRep,
      // 13
      CorreoRepresentante: data.correoRepresentante || '',
      // 14
      TelefonoRepresentante: data.telefonoRepresentante || ''
    };
  }

  /**
   * Mapeo desde la respuesta de la API al modelo del Front.
   */
  private mapFromApi(apiData: any): Proveedor {
    if (!apiData) return { nombre: '', id: 0 };

    const rawTipo = apiData.tipoProveedor ?? apiData.TipoProveedor ?? 'Juridico';
    const tipo = String(rawTipo).toLowerCase() === 'natural' ? 'Natural' : 'Juridico';

    const identificacionValue = apiData.identificacion || apiData.Identificacion
      || apiData.nit || apiData.NIT || '';

    const identificacionRepValue = apiData.identificacionRepresentante || apiData.IdentificacionRepresentante
      || apiData.numeroIdentificacion || apiData.NumeroIdentificacion || '';

    const tipoIdentRepValue = apiData.tipoIdentificacionRepresentante || apiData.TipoIdentificacionRepresentante
      || apiData.tipoIdentificacion || apiData.TipoIdentificacion || '';

    const tipoIdentProvValue = apiData.tipoIdentificacionProveedor || apiData.TipoIdentificacionProveedor
      || (tipo === 'Natural' ? 'CC' : 'NIT');

    const rawEstado = apiData.estado ?? apiData.Estado ?? apiData.activo ?? apiData.Activo;
    let isEstadoTrue = true;
    if (rawEstado !== undefined && rawEstado !== null) {
      isEstadoTrue = rawEstado === true ||
        rawEstado === 1 ||
        String(rawEstado).toLowerCase() === 'true' ||
        String(rawEstado).toLowerCase() === '1' ||
        String(rawEstado).toLowerCase() === 'activo';
    }

    return {
      id: Number(apiData.id || apiData.Id || 0),
      // 1
      tipoProveedor: tipo,
      // 2
      nombre: apiData.nombre || apiData.Nombre || '',
      // 3
      tipoIdentificacionProveedor: tipoIdentProvValue,
      // 4
      identificacion: identificacionValue,
      // 5
      correo: apiData.correo || apiData.Correo || '',
      // 6
      telefono: apiData.telefono || apiData.Telefono || apiData.numero || apiData.Numero || '',
      // 7
      direccion: apiData.direccion || apiData.Direccion || '',
      // 8
      ciudad: apiData.ciudad || apiData.Ciudad || '',
      // 9
      departamento: apiData.departamento || apiData.Departamento || '',
      // 10
      representanteLegal: apiData.representanteLegal || apiData.RepresentanteLegal || '',
      // 11
      tipoIdentificacionRepresentante: tipoIdentRepValue,
      // 12
      identificacionRepresentante: identificacionRepValue,
      // 13
      correoRepresentante: apiData.correoRepresentante || apiData.CorreoRepresentante || '',
      // 14
      telefonoRepresentante: apiData.telefonoRepresentante || apiData.TelefonoRepresentante || '',

      estado: isEstadoTrue,
      compras: apiData.compras || apiData.Compras || [],

      // Aliases para compatibilidad con UI legacy
      nit: identificacionValue,
      numeroIdentificacion: identificacionRepValue,
      tipoIdentificacion: tipoIdentRepValue,
      numero: apiData.telefono || apiData.Telefono || apiData.numero || apiData.Numero || '',
      activo: isEstadoTrue,
      fechaCreacion: apiData.fechaCreacion || apiData.FechaCreacion || new Date().toLocaleDateString('es-CO'),
      contacto: apiData.representanteLegal || apiData.RepresentanteLegal || '',
      personaContacto: apiData.representanteLegal || apiData.RepresentanteLegal || ''
    };
  }

  async obtenerProveedores(): Promise<Proveedor[]> {
    try {
      const arr: any[] = [];
      const extract = (data: any): any[] => {
        if (data && typeof data === 'object' && !Array.isArray(data) && data.$values) data = data.$values;
        return Array.isArray(data)
          ? data
          : (data && typeof data === 'object' && Array.isArray((data as any).items)) ? (data as any).items
          : (data && typeof data === 'object' && Array.isArray((data as any).data)) ? (data as any).data
          : [];
      };
      const firstResponse = await this.request('/Proveedores?page=1&pageSize=100');
      const firstText = await firstResponse.text();
      const firstData = firstText ? JSON.parse(firstText) : [];
      arr.push(...extract(firstData));
      let totalPages = firstData && typeof firstData === 'object' && !Array.isArray(firstData)
        ? Number((firstData as any).totalPages ?? 1)
        : 1;
      totalPages = Math.min(Math.max(1, totalPages), 200);
      if (totalPages > 1) {
        const promises: Promise<any[]>[] = [];
        for (let page = 2; page <= totalPages; page++) {
          promises.push((async () => {
            const response = await this.request(`/Proveedores?page=${page}&pageSize=100`);
            const text = await response.text();
            const data = text ? JSON.parse(text) : [];
            return extract(data);
          })());
        }
        const rest = await Promise.all(promises);
        rest.forEach(items => arr.push(...items));
      }
      if (!Array.isArray(arr)) {
        return [];
      }
      return arr.map(item => this.mapFromApi(item));
    } catch (error) {
      console.error('❌ Error obteniendo proveedores:', error);
      throw error;
    }
  }

  async obtenerProveedoresJuridicos(): Promise<Proveedor[]> {
    return this.obtenerProveedores();
  }

  async obtenerProveedorPorId(id: number): Promise<Proveedor | null> {
    try {
      const response = await this.request(`/Proveedores/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      return data ? this.mapFromApi(data) : null;
    } catch (error) {
      console.error(`❌ Error obteniendo proveedor ${id}:`, error);
      return null;
    }
  }

  async crearProveedor(proveedorData: Partial<Proveedor>): Promise<Proveedor> {
    try {
      if (!proveedorData.tipoProveedor) {
        throw new Error('El tipoProveedor es obligatorio (Natural o Juridico)');
      }

      const apiBody = this.mapToApiFormatJson(proveedorData);
      console.log('🔵 Creando proveedor - Body enviado:', apiBody);

      const response = await this.request('/Proveedores', {
        method: 'POST',
        body: JSON.stringify(apiBody),
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};
      return this.mapFromApi(result);
    } catch (error: any) {
      console.error('❌ Error creando proveedor:', error);
      throw error;
    }
  }

  async actualizarProveedor(id: number, proveedorData: Partial<Proveedor>): Promise<Proveedor> {
    try {
      const base = this.mapToApiFormatJson(proveedorData);
      const apiBody = {
        Id: id,
        ...base,
        Estado: proveedorData.estado !== undefined ? !!proveedorData.estado : undefined
      };

      const response = await this.request(`/Proveedores/${id}`, {
        method: 'PUT',
        body: JSON.stringify(apiBody),
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : { Id: id, ...apiBody };
      return this.mapFromApi(result);
    } catch (error) {
      console.error('Error actualizando proveedor:', error);
      throw error;
    }
  }

  async eliminarProveedor(id: number): Promise<void> {
    try {
      await this.request(`/Proveedores/${id}`, { method: 'DELETE' });
    } catch (error: any) {
      console.error('❌ Error eliminando proveedor:', error);
      throw error;
    }
  }

  async cambiarEstadoProveedor(id: number, estado: boolean): Promise<void> {
    try {
      await this.request(`/Proveedores/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado }),
      });
    } catch (error) {
      console.error('❌ Error actualizando estado del proveedor:', error);
      throw error;
    }
  }
}

export const proveedorService = new ProveedorService();
