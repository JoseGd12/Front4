const RAW_API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_URL) ||
  (typeof window !== 'undefined' && (window as any)?.API_BASE_URL) ||
  '';
const NORMALIZED_BASE = RAW_API_BASE ? String(RAW_API_BASE).replace(/\/+$/, '') : '';
const API_BASE_URL = NORMALIZED_BASE
  ? (NORMALIZED_BASE.endsWith('/api') ? NORMALIZED_BASE : `${NORMALIZED_BASE}/api`)
  : '/api';

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

export interface AnularAbonoInput {
  usuarioId: number;
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
  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    };
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error del servidor (${response.status}): ${errorText || response.statusText}`);
    }
    return response;
  }

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

  async getAll(page = 1, pageSize = 20, q?: string): Promise<PagedResult<CreditoBarberoDto>> {
    let endpoint = `/credito-barbero?page=${page}&pageSize=${pageSize}`;
    if (q?.trim()) endpoint += `&q=${encodeURIComponent(q.trim())}`;
    const res = await this.request(endpoint);
    const data = await res.json();
    const items: any[] = Array.isArray(data) ? data : (data.items ?? data.Items ?? []);
    return {
      items: items.map(i => this.normalize(i)),
      totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
      page: Number(data.page ?? data.Page ?? page),
      pageSize: Number(data.pageSize ?? data.PageSize ?? pageSize),
      totalPages: Number(data.totalPages ?? data.TotalPages ?? 1),
    };
  }

  async getByBarbero(barberoId: number): Promise<CreditoBarberoDto> {
    const res = await this.request(`/credito-barbero/barbero/${barberoId}`);
    const data = await res.json();
    return this.normalize(data);
  }

  async getAbonos(barberoId: number, page = 1, pageSize = 20): Promise<PagedResult<AbonoCreditoBarberoDto>> {
    const res = await this.request(`/credito-barbero/barbero/${barberoId}/abonos?page=${page}&pageSize=${pageSize}`);
    const data = await res.json();
    const items: any[] = Array.isArray(data) ? data : (data.items ?? data.Items ?? []);
    return {
      items: items.map(i => this.normalizeAbono(i)),
      totalCount: Number(data.totalCount ?? data.TotalCount ?? items.length),
      page: Number(data.page ?? data.Page ?? page),
      pageSize: Number(data.pageSize ?? data.PageSize ?? pageSize),
      totalPages: Number(data.totalPages ?? data.TotalPages ?? 1),
    };
  }

  async registrarAbono(barberoId: number, input: AbonoInput): Promise<any> {
    const res = await this.request(`/credito-barbero/barbero/${barberoId}/abono`, {
      method: 'POST',
      body: JSON.stringify({
        UsuarioId: input.usuarioId,
        Monto: input.monto,
        MetodoPago: input.metodoPago ?? 'Efectivo',
        Notas: input.notas ?? null,
        VentaId: input.ventaId ?? null,
      }),
    });
    return res.json();
  }

  async anularAbono(abonoId: number, usuarioId: number): Promise<any> {
    const res = await this.request(`/credito-barbero/abono/${abonoId}/anular`, {
      method: 'POST',
      body: JSON.stringify({ UsuarioId: usuarioId }),
    });
    return res.json();
  }

  async extenderPlazo(barberoId: number, input: ExtenderPlazoInput): Promise<any> {
    const res = await this.request(`/credito-barbero/barbero/${barberoId}/extender-plazo`, {
      method: 'PUT',
      body: JSON.stringify({ UsuarioId: input.usuarioId }),
    });
    return res.json();
  }

  async nuevoCiclo(barberoId: number, input: NuevoCicloInput): Promise<any> {
    const res = await this.request(`/credito-barbero/barbero/${barberoId}/nuevo-ciclo`, {
      method: 'POST',
      body: JSON.stringify({
        UsuarioId: input.usuarioId,
        LimiteCredito: input.limiteCredito ?? null,
        PlazoDias: input.plazoDias ?? 7,
      }),
    });
    return res.json();
  }
}

export const creditoBarberoService = new CreditoBarberoService();
