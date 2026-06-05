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
    const data = await httpClient.get<PagedResult<CreditoBarberoDto>>(`/CreditoBarbero?page=${page}&pageSize=${pageSize}`);
    return {
      ...data,
      items: (data.items || []).map(this.normalize)
    };
  }

  async getCreditoById(id: number): Promise<CreditoBarberoDto> {
    const data = await httpClient.get(`/CreditoBarbero/${id}`);
    return this.normalize(data);
  }

  async getCreditoByBarberoId(barberoId: number): Promise<CreditoBarberoDto | null> {
    try {
      const data = await httpClient.get(`/CreditoBarbero/barbero/${barberoId}`);
      return this.normalize(data);
    } catch (error: any) {
      if (error.message.includes('404')) return null;
      throw error;
    }
  }

  async crearAbono(creditoId: number, input: AbonoInput): Promise<AbonoCreditoBarberoDto> {
    const data = await httpClient.post(`/CreditoBarbero/${creditoId}/abono`, input);
    return this.normalizeAbono(data);
  }

  async extenderPlazo(creditoId: number, input: ExtenderPlazoInput): Promise<CreditoBarberoDto> {
    const data = await httpClient.post(`/CreditoBarbero/${creditoId}/extender-plazo`, input);
    return this.normalize(data);
  }

  async iniciarNuevoCiclo(creditoId: number, input: NuevoCicloInput): Promise<CreditoBarberoDto> {
    const data = await httpClient.post(`/CreditoBarbero/${creditoId}/nuevo-ciclo`, input);
    return this.normalize(data);
  }

  async getHistorialAbonos(creditoId: number, page = 1, pageSize = 20): Promise<PagedResult<AbonoCreditoBarberoDto>> {
    const data = await httpClient.get<PagedResult<AbonoCreditoBarberoDto>>(`/CreditoBarbero/${creditoId}/abonos?page=${page}&pageSize=${pageSize}`);
    return {
      ...data,
      items: (data.items || []).map(this.normalizeAbono)
    };
  }
}

export const creditoBarberoService = new CreditoBarberoService();
