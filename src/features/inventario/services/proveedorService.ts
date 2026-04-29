const API_BASE_URL = '/api';

export interface Proveedor {
  id?: number;
  nombre: string;
  nit?: string;
  correo?: string;
  telefono?: string | null;
  direccion?: string;
  estado?: boolean;
  tipoProveedor?: 'Juridico' | 'Natural';
  // Campos específicos para Jurídico
  razonSocial?: string;
  representanteLegal?: string;
  numeroIdentificacionRepLegal?: string;
  cargoRepLegal?: string;
  ciudad?: string;
  departamento?: string;
  // Campos adicionales que devuelve la API
  contacto?: string | null;
  numeroIdentificacion?: string | null;
  tipoIdentificacion?: string | null;
  compras?: any[];
  // Campos adicionales del frontend
  numero?: string; // Alias para telefono
  activo?: boolean; // Alias para estado
  fechaCreacion?: string;
  // Campos específicos para Jurídico adicionales
  tipoDocumentoRepresentante?: string;
  documentoRepresentante?: string;
  telefonoRepresentante?: string;
  correoRepresentante?: string;
  sectorEconomico?: string;
  anosOperacion?: number;
  paginaWeb?: string;
  // Campo específico para Natural
  personaContacto?: string;
  apellidos?: string;
  // Contacto adicional (Natural)
  tipoDocumentoContactoAdicional?: string;
  documentoContactoAdicional?: string;
  telefonoContactoAdicional?: string;
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


  // Mapeo específico para proveedores Naturales (JSON de envío)
  private mapNatural(data: Partial<Proveedor>) {
    return {
      nombre: data.nombre,
      numeroIdentificacion: data.numeroIdentificacion || data.nit || "",
      tipoIdentificacion: data.tipoIdentificacion || "CC",
      correo: data.correo || "",
      telefono: data.numero || data.telefono || "",
      direccion: data.direccion || "",
      contacto: data.personaContacto || data.contacto || "",
      estado: true,
    };
  }

  // Mapear objeto a PascalCase para las peticiones (POST/PUT) - LEGACY para PUT
  private mapToApiFormat(data: Partial<Proveedor>): any {
    const mapped: any = {};

    if (data.id !== undefined) mapped.Id = data.id;
    if (data.nombre !== undefined) mapped.Nombre = data.nombre;
    if (data.tipoProveedor !== undefined) mapped.TipoProveedor = data.tipoProveedor;
    if (data.nit !== undefined) mapped.Nit = data.nit;
    if (data.correo !== undefined) mapped.Correo = data.correo;

    // El backend espera 'telefono' en minúsculas para el modelo base o Telefono en PascalCase
    // Vamos a enviar ambos para asegurar compatibilidad y que no llegue null
    const tel = data.telefono || data.numero || "";
    mapped.Telefono = tel;
    mapped.telefono = tel;

    // Similar al teléfono, unificamos contacto y personacontacto
    const contactValue = data.contacto || data.personaContacto || "";
    mapped.Contacto = contactValue;
    mapped.contacto = contactValue;
    if (data.direccion !== undefined) mapped.Direccion = data.direccion;
    if (data.fechaCreacion !== undefined) mapped.FechaCreacion = new Date().toISOString();
    // Priorizar estado sobre activo para la API
    if (data.estado !== undefined) mapped.Estado = !!data.estado;
    else if (data.activo !== undefined) mapped.Estado = !!data.activo;

    // Campos específicos para Jurídico (según tu API)
    if (data.razonSocial !== undefined) mapped.RazonSocial = data.razonSocial;
    if (data.representanteLegal !== undefined) mapped.RepresentanteLegal = data.representanteLegal;
    if (data.numeroIdentificacionRepLegal !== undefined) mapped.NumeroIdentificacionRepLegal = data.numeroIdentificacionRepLegal;
    if (data.cargoRepLegal !== undefined) mapped.CargoRepLegal = data.cargoRepLegal;
    if (data.ciudad !== undefined) {
      mapped.Ciudad = data.ciudad || "";
      mapped.ciudad = data.ciudad || "";
    }
    if (data.departamento !== undefined) {
      mapped.Departamento = data.departamento || "";
      mapped.departamento = data.departamento || "";
    }

    // Campos adicionales que tu API podría necesitar
    if (data.documentoRepresentante !== undefined) mapped.DocumentoRepresentante = data.documentoRepresentante;
    if (data.telefonoRepresentante !== undefined) mapped.TelefonoRepresentante = data.telefonoRepresentante;
    if (data.correoRepresentante !== undefined) mapped.CorreoRepresentante = data.correoRepresentante;
    if (data.sectorEconomico !== undefined) mapped.SectorEconomico = data.sectorEconomico;
    if (data.anosOperacion !== undefined) mapped.AnosOperacion = data.anosOperacion;
    if (data.paginaWeb !== undefined) mapped.PaginaWeb = data.paginaWeb;
    if (data.personaContacto !== undefined) mapped.PersonaContacto = data.personaContacto;
    if (data.apellidos !== undefined) mapped.Apellidos = data.apellidos;
    if (data.numeroIdentificacion !== undefined) mapped.NumeroIdentificacion = data.numeroIdentificacion;

    return mapped;
  }

  // Mapeo genérico desde API
  private mapFromApi(apiData: any): Proveedor {
    if (!apiData) return { nombre: "", id: 0 };

    const rawTipo = (apiData.tipoProveedor ?? apiData.TipoProveedor ?? 'Juridico');
    const tipo = String(rawTipo).toLowerCase() === 'natural' ? 'Natural' : 'Juridico';
    // Para personas naturales, si nit está vacío usamos el número de identificación
    const nitValue = apiData.nit || apiData.Nit || apiData.NIT || apiData.numeroIdentificacion || apiData.NumeroIdentificacion || "";

    // Lógica de estado más robusta: Por defecto true si no viene campo de estado
    const rawEstado = apiData.estado ?? apiData.Estado ?? apiData.activo ?? apiData.Activo ?? apiData.active ?? apiData.Active;

    let isEstadoTrue = true;
    if (rawEstado !== undefined && rawEstado !== null) {
      isEstadoTrue = rawEstado === true ||
        rawEstado === 1 ||
        rawEstado === "true" ||
        rawEstado === "t" ||
        rawEstado === "1" ||
        String(rawEstado).toLowerCase() === "activo" ||
        String(rawEstado).toLowerCase() === "true" ||
        String(rawEstado).toLowerCase() === "active";
    }

    return {
      id: Number(apiData.id || apiData.Id || 0),
      nombre: apiData.nombre || apiData.Nombre || "",
      nit: nitValue,
      correo: apiData.correo || apiData.Correo || "",
      telefono: apiData.telefono || apiData.Telefono || apiData.numero || apiData.Numero || "",
      direccion: apiData.direccion || apiData.Direccion || "",
      estado: isEstadoTrue,
      tipoProveedor: tipo,
      razonSocial: apiData.razonSocial || apiData.RazonSocial || "",
      representanteLegal: apiData.representanteLegal || apiData.RepresentanteLegal || "",
      numeroIdentificacionRepLegal: apiData.numeroIdentificacionRepLegal || apiData.NumeroIdentificacionRepLegal || "",
      cargoRepLegal: apiData.cargoRepLegal || apiData.CargoRepLegal || "",
      ciudad: apiData.ciudad || apiData.Ciudad || "",
      departamento: apiData.departamento || apiData.Departamento || "",
      contacto: apiData.contacto || apiData.Contacto || apiData.personaContacto || apiData.PersonaContacto || "",
      numeroIdentificacion: apiData.numeroIdentificacion || apiData.NumeroIdentificacion || nitValue,
      tipoIdentificacion: apiData.tipoIdentificacion || apiData.TipoIdentificacion || "",
      compras: apiData.compras || apiData.Compras || [],
      // Alias para compatibilidad
      numero: apiData.telefono || apiData.Telefono || apiData.numero || apiData.Numero || "",
      activo: isEstadoTrue,
      fechaCreacion: apiData.fechaCreacion || apiData.FechaCreacion || new Date().toLocaleDateString('es-CO'),
      // Campos opcionales que podrían venir
      tipoDocumentoRepresentante: apiData.tipoDocumentoRepresentante || apiData.TipoDocumentoRepresentante || "",
      sectorEconomico: apiData.sectorEconomico || apiData.SectorEconomico || "",
      anosOperacion: apiData.anosOperacion || apiData.AnosOperacion || 0,
      paginaWeb: apiData.paginaWeb || apiData.PaginaWeb || "",
      documentoRepresentante: apiData.documentoRepresentante || apiData.DocumentoRepresentante || "",
      telefonoRepresentante: apiData.telefonoRepresentante || apiData.TelefonoRepresentante || "",
      correoRepresentante: apiData.correoRepresentante || apiData.CorreoRepresentante || "",
      personaContacto: apiData.personaContacto || apiData.PersonaContacto || "",
      apellidos: apiData.apellidos || apiData.Apellidos || "",
      // Contacto adicional (Natural)
      tipoDocumentoContactoAdicional: apiData.tipoDocumentoContactoAdicional || apiData.TipoDocumentoContactoAdicional || "",
      documentoContactoAdicional: apiData.documentoContactoAdicional || apiData.DocumentoContactoAdicional || "",
      telefonoContactoAdicional: apiData.telefonoContactoAdicional || apiData.TelefonoContacto || apiData.telefonoContacto || apiData.telefonoContactoAdicional || "",
      correoContactoAdicional: apiData.correoContactoAdicional || apiData.CorreoContacto || apiData.correoContacto || apiData.correoContactoAdicional || ""
    };
  }

  async obtenerProveedores(): Promise<Proveedor[]> {
    try {
      console.log('📥 Obteniendo todos los proveedores desde:', `${API_BASE_URL}/Proveedores`);
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
      console.log('✅ Proveedores raw desde API:', arr);
      if (!Array.isArray(arr)) {
        console.warn('⚠️ La API no devolvió un array ni envelope válido:', arr);
        return [];
      }

      // Mapear los datos de la API al formato del frontend usando el mapeador genérico
      const mapped = arr.map(item => this.mapFromApi(item));
      
      // LOG DE DIAGNÓSTICO PARA CAMPOS DE CONTACTO
      if (mapped.length > 0) {
        const sample = mapped[0];
        console.log('🔍 Diagnóstico Proveedor [0]:', {
          id: sample.id,
          nombre: sample.nombre,
          telefonoContactoAdicional: sample.telefonoContactoAdicional,
          correoContactoAdicional: sample.correoContactoAdicional,
          raw: arr[0]
        });
      }
      
      return mapped;
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
      console.log(`📥 Obteniendo proveedor ${id} desde:`, `${API_BASE_URL}/proveedores/${id}`);
      const response = await this.request(`/Proveedores/${id}`);
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      console.log(`✅ Proveedor ${id} obtenido:`, data);
      return data ? this.mapFromApi(data) : null;
    } catch (error) {
      console.error(`❌ Error obteniendo proveedor ${id}:`, error);
      return null;
    }
  }

  // Mapeo específico para crear Proveedor Jurídico (JSON de envío)
  private mapToApiFormatJson(data: Partial<Proveedor>): any {
    // Unificación al nuevo contrato de la API (ver FRONT_GUIA_PROVEEDORES_COMPRAS.md)
    const tipo = data.tipoProveedor || 'Juridico';
    const tipoIdent = data.tipoIdentificacion || (tipo === 'Natural' ? 'CC' : 'NIT');
    const correoContacto = data.correoContactoAdicional || '';
    const telefonoContacto = data.telefonoContactoAdicional || '';

    return {
      TipoProveedor: tipo,
      Nombre: data.nombre || '',
      NIT: data.nit || data.numeroIdentificacion || '',
      Correo: data.correo || '',
      Telefono: data.numero || data.telefono || '',
      Direccion: data.direccion || '',
      Contacto: data.contacto || data.personaContacto || '',
      NumeroIdentificacion: data.numeroIdentificacion || data.nit || '',
      TipoIdentificacion: tipoIdent,
      // Enviar en ambos formatos para asegurar compatibilidad
      CorreoContacto: correoContacto,
      correoContacto: correoContacto,
      TelefonoContacto: telefonoContacto,
      telefonoContacto: telefonoContacto
    };
  }

  async crearProveedor(proveedorData: Partial<Proveedor>): Promise<Proveedor> {
    try {
      if (!proveedorData.tipoProveedor) {
        throw new Error("El tipoProveedor es obligatorio (Natural o Juridico)");
      }

      const endpoint = '/Proveedores';
      const apiBody = this.mapToApiFormatJson(proveedorData);

      console.log('🔵 Creando proveedor - Endpoint:', endpoint);
      console.log('🔵 Body enviado:', apiBody);

      const response = await this.request(endpoint, {
        method: 'POST',
        body: JSON.stringify(apiBody),
      });

      const text = await response.text();
      const result = text ? JSON.parse(text) : {};
      console.log('✅ Proveedor creado:', result);

      return this.mapFromApi(result);
    } catch (error: any) {
      console.error('❌ Error creando proveedor:', error);
      throw error;
    }
  }

  async actualizarProveedor(id: number, proveedorData: Partial<Proveedor>): Promise<Proveedor> {
    try {
      // Usar el mismo contrato unificado de creación, incluyendo Id y Estado si aplica
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
      console.log(`🗑️ Intentando eliminar proveedor con ID: ${id}`);
      await this.request(`/Proveedores/${id}`, {
        method: 'DELETE',
      });
      console.log(`✅ Proveedor eliminado exitosamente`);
    } catch (error: any) {
      console.error('❌ Error eliminando proveedor:', error);
      throw error;
    }
  }

  async cambiarEstadoProveedor(id: number, estado: boolean): Promise<void> {
    try {
      console.log(`🔄 Cambiando estado del proveedor ${id} a ${estado}`);

      await this.request(`/Proveedores/${id}/estado`, {
        method: 'POST',
        body: JSON.stringify({ estado: estado }),
      });

      console.log(`✅ Estado del proveedor ${id} actualizado a ${estado}`);
    } catch (error) {
      console.error('❌ Error actualizando estado del proveedor:', error);
      throw error;
    }
  }
}

export const proveedorService = new ProveedorService();
