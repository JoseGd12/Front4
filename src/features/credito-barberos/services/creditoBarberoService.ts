import { httpClient } from '../../../shared/services/httpClient';
import { API_BASE_URL } from '../../../shared/config/api';

export interface CreditoBarberoDto {
  id: number;
  barberoId: number;
  barberoNombre: string | null;
  cupoMaximo: number;
  saldoDeuda: number;
  cupoDisponible: number;
  estado: string;
  plazoDias: number;
  fechaCreacion: string;
  fechaInicio: string;
  fechaVencimiento: string;
  fechaCierre: string | null;
  extensionUsada: boolean;
  fechaActualizacion: string | null;
  ultimoAbono: string | null;
  ventasCicloCount: number;
}

export interface AbonoCreditoBarberoDto {
  id: number;
  creditoBarberoId: number;
  usuarioId: number;
  usuarioNombre: string | null;
  ventaId: number | null;
  monto: number;
  metodoPago: string | null;
  fecha: string;
  notas: string | null;
  estado: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AbonoInput {
  usuarioId: number;
  monto: number;
  metodoPago?: string;
  notas?: string;
  ventaId?: number | null;
}

export interface ExtenderPlazoInput {
  usuarioId: number;
}

export interface NuevoCicloInput {
  usuarioId: number;
  limiteCredito?: number | null;
  plazoDias?: number;
}

export interface SubirLimiteInput {
  usuarioId: number;
  incremento: number;
}

class CreditoBarberoService {
  private normalize(raw: any): CreditoBarberoDto {
    return {
      id: Number(raw.id ?? raw.Id ?? 0),
      barberoId: Number(raw.barberoId ?? raw.BarberoId ?? 0),
      barberoNombre: raw.barberoNombre ?? raw.BarberoNombre ?? null,
      cupoMaximo: Number(raw.cupoMaximo ?? raw.CupoMaximo ?? 200000),
      saldoDeuda: Number(raw.saldoDeuda ?? raw.SaldoDeuda ?? 0),
      cupoDisponible: Number(raw.cupoDisponible ?? raw.CupoDisponible ?? 200000),
      estado: String(raw.estado ?? raw.Estado ?? 'Sin credito'),
      plazoDias: Number(raw.plazoDias ?? raw.PlazoDias ?? 7),
      fechaCreacion: String(raw.fechaCreacion ?? raw.FechaCreacion ?? ''),
      fechaInicio: String(raw.fechaInicio ?? raw.FechaInicio ?? ''),
      fechaVencimiento: String(raw.fechaVencimiento ?? raw.FechaVencimiento ?? ''),
      fechaCierre: raw.fechaCierre ?? raw.FechaCierre ?? null,
      extensionUsada: Boolean(raw.extensionUsada ?? raw.ExtensionUsada ?? false),
      fechaActualizacion: raw.fechaActualizacion ?? raw.FechaActualizacion ?? null,
      ultimoAbono: raw.ultimoAbono ?? raw.UltimoAbono ?? null,
      ventasCicloCount: Number(raw.ventasCicloCount ?? raw.VentasCicloCount ?? 0),
    };
  }

  private normalizeAbono(raw: any): AbonoCreditoBarberoDto {
    return {
      id: Number(raw.id ?? raw.Id ?? 0),
      creditoBarberoId: Number(raw.creditoBarberoId ?? raw.CreditoBarberoId ?? 0),
      usuarioId: Number(raw.usuarioId ?? raw.UsuarioId ?? 0),
      usuarioNombre: raw.usuarioNombre ?? raw.UsuarioNombre ?? null,
      ventaId: raw.ventaId != null ? Number(raw.ventaId) : (raw.VentaId != null ? Number(raw.VentaId) : null),
      monto: Number(raw.monto ?? raw.Monto ?? 0),
      metodoPago: raw.metodoPago ?? raw.MetodoPago ?? null,
      fecha: String(raw.fecha ?? raw.Fecha ?? ''),
      notas: raw.notas ?? raw.Notas ?? null,
      estado: String(raw.estado ?? raw.Estado ?? 'Completado'),
    };
  }

  async getCreditos(page = 1, pageSize = 20): Promise<PagedResult<CreditoBarberoDto>> {
    const data = await httpClient.get<PagedResult<CreditoBarberoDto>>(`/credito-barbero?page=${page}&pageSize=${pageSize}`);
    return {
      ...data,
      items: (data.items || []).map(this.normalize)
    };
  }

  async getCreditoById(id: number): Promise<CreditoBarberoDto> {
    const data = await httpClient.get(`/credito-barbero/${id}`);
    return this.normalize(data);
  }

  async getCreditoByBarberoId(barberoId: number): Promise<CreditoBarberoDto | null> {
    try {
      const data = await httpClient.get(`/credito-barbero/barbero/${barberoId}`);
      return this.normalize(data);
    } catch (error: any) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  }

  async crearAbono(barberoId: number, input: AbonoInput): Promise<AbonoCreditoBarberoDto> {
    const data = await httpClient.post(`/credito-barbero/barbero/${barberoId}/abono`, input);
    return this.normalizeAbono(data);
  }

  async extenderPlazo(barberoId: number, input: ExtenderPlazoInput): Promise<CreditoBarberoDto> {
    const data = await httpClient.put(`/credito-barbero/barbero/${barberoId}/extender-plazo`, input);
    return this.normalize(data);
  }

  async iniciarNuevoCiclo(barberoId: number, input: NuevoCicloInput): Promise<CreditoBarberoDto> {
    const data = await httpClient.post(`/credito-barbero/barbero/${barberoId}/nuevo-ciclo`, input);
    return this.normalize(data);
  }

  async getHistorialAbonos(creditoId: number, page = 1, pageSize = 20): Promise<PagedResult<AbonoCreditoBarberoDto>> {
    const data = await httpClient.get<PagedResult<AbonoCreditoBarberoDto>>(`/credito-barbero/${creditoId}/abonos?page=${page}&pageSize=${pageSize}`);
    return {
      ...data,
      items: (data.items || []).map(this.normalizeAbono)
    };
  }

  // Compatibility methods
  async getAll(page = 1, pageSize = 20, q = ''): Promise<PagedResult<CreditoBarberoDto>> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (q) params.append('q', q);

    const data = await httpClient.get<PagedResult<any>>(`/credito-barbero?${params.toString()}`);
    return {
      ...data,
      items: (data.items || []).map((r: any) => this.normalize(r)),
    };
  }

  // getAbonos recibe barberoId (usado en el listado principal para mostrar el último abono)
  async getAbonos(barberoId: number, page = 1, pageSize = 20): Promise<PagedResult<AbonoCreditoBarberoDto>> {
    try {
      const data = await httpClient.get<PagedResult<AbonoCreditoBarberoDto>>(
        `/credito-barbero/barbero/${barberoId}/abonos?page=${page}&pageSize=${pageSize}`
      );
      return {
        ...data,
        items: (data.items || []).map((r: any) => this.normalizeAbono(r))
      };
    } catch (error: any) {
      if (error.message?.includes('404')) return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
      throw error;
    }
  }

  async getAllAbonosByBarbero(barberoId: number, page = 1, pageSize = 20): Promise<PagedResult<AbonoCreditoBarberoDto>> {
    try {
      const data = await httpClient.get<PagedResult<any>>(
        `/credito-barbero/barbero/${barberoId}/abonos/todos?page=${page}&pageSize=${pageSize}`
      );
      return {
        ...data,
        items: (data.items || []).map((r: any) => this.normalizeAbono(r)),
      };
    } catch (error: any) {
      if (error.message?.includes('404')) return { items: [], totalCount: 0, page, pageSize, totalPages: 0 };
      throw error;
    }
  }

  // Registra un abono directo al barbero — el backend resuelve el ciclo activo internamente
  async registrarAbono(barberoId: number, input: AbonoInput): Promise<AbonoCreditoBarberoDto> {
    return this.crearAbono(barberoId, input);
  }

  async subirLimiteCredito(barberoId: number, input: SubirLimiteInput): Promise<CreditoBarberoDto> {
    const data = await httpClient.put(`/credito-barbero/barbero/${barberoId}/subir-limite`, input);
    return this.normalize(data);
  }

  async getByBarbero(barberoId: number): Promise<CreditoBarberoDto | null> {
    return this.getCreditoByBarberoId(barberoId);
  }
}

export const creditoBarberoService = new CreditoBarberoService();
