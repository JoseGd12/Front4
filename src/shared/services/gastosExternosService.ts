import { httpClient } from './httpClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface GastoExterno {
  id: number;
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string; // ISO date string "yyyy-MM-dd"
  usuarioId: number;
  usuarioNombre: string;
  notas?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GastoExternoInput {
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string; // "yyyy-MM-dd"
  notas?: string;
}

export interface ResumenDia {
  fecha: string;
  ingresosVentas: number;
  ingresosAgendamientos: number;
  ingresosTotal: number;
  gastosExternos: number;
  gananciaNeta: number;
  cantidadGastos: number;
  gastos: GastoExterno[];
}

export const CATEGORIAS_GASTO = [
  'Servicios',
  'Suministros',
  'Mantenimiento',
  'Utilities',
  'Alquiler',
  'Personal',
  'Otros',
] as const;

export type CategoriaGasto = (typeof CATEGORIAS_GASTO)[number];

// ── Service ────────────────────────────────────────────────────────────────

class GastosExternosService {
  private readonly base = '/GastosExternos';

  async create(data: GastoExternoInput): Promise<GastoExterno> {
    return httpClient.post<GastoExterno>(this.base, data);
  }

  async getById(id: number): Promise<GastoExterno> {
    return httpClient.get<GastoExterno>(`${this.base}/${id}`, { useCache: false });
  }

  async getByDate(fecha: string): Promise<GastoExterno[]> {
    return httpClient.get<GastoExterno[]>(`${this.base}/fecha/${fecha}`, { useCache: false });
  }

  async getToday(): Promise<GastoExterno[]> {
    return httpClient.get<GastoExterno[]>(`${this.base}/dia/actual`, { useCache: false });
  }

  async getByDateRange(from: string, to: string): Promise<GastoExterno[]> {
    return httpClient.get<GastoExterno[]>(
      `${this.base}/rango?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { useCache: false },
    );
  }

  async update(id: number, data: GastoExternoInput): Promise<GastoExterno> {
    return httpClient.put<GastoExterno>(`${this.base}/${id}`, data);
  }

  async delete(id: number): Promise<void> {
    await httpClient.delete(`${this.base}/${id}`);
  }

  async getResumenDia(fecha?: string): Promise<ResumenDia> {
    const query = fecha ? `?fecha=${encodeURIComponent(fecha)}` : '';
    return httpClient.get<ResumenDia>(`/Dashboard/resumen-dia${query}`, { useCache: false });
  }
}

export const gastosExternosService = new GastosExternosService();
export default gastosExternosService;
