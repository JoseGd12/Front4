/**
 * Servicio para Solicitudes de Cambio de Horario.
 * Endpoints API:
 *   - POST   /api/SolicitudesCambioHorario               (barbero crea)
 *   - GET    /api/SolicitudesCambioHorario               (lista)
 *   - GET    /api/SolicitudesCambioHorario/{id}          (detalle)
 *   - POST   /api/SolicitudesCambioHorario/{id}/aprobar  (admin aprueba)
 *   - POST   /api/SolicitudesCambioHorario/{id}/rechazar (admin rechaza/contrapropone)
 *   - POST   /api/SolicitudesCambioHorario/{id}/responder (barbero responde a contrapropuesta)
 */

const API_BASE_URL = '/api';
import { auth } from '../../../shared/services/firebase';

export type EstadoSolicitud = 'Pendiente' | 'Sugerida' | 'Aprobada' | 'Rechazada';
export type OrigenSugerencia = 'Barbero' | 'Admin';

export interface SugerenciaInput {
  /** Fecha del día sugerido en formato ISO (YYYY-MM-DDTHH:mm:ss). */
  diaSugerido: string;
  /** Hora 24h "HH:mm" o "HH:mm:ss". */
  horaInicio: string;
  /** Hora 24h "HH:mm" o "HH:mm:ss". */
  horaFin: string;
}

export interface Sugerencia {
  id: number;
  diaSugerido: string;
  horaInicio: string;
  horaFin: string;
  origen: OrigenSugerencia;
}

export interface SolicitudCambioHorario {
  id: number;
  barberoId: number;
  barberoNombre: string;
  motivoCategoria: string;
  motivoDetalle: string | null;
  fechaReferencia: string;
  estado: EstadoSolicitud;
  observacionAdmin: string | null;
  fechaCreacion: string;
  fechaResolucion: string | null;
  usuarioResolucionNombre?: string | null;
  sugerencias: Sugerencia[];
}

export interface CreateSolicitudInput {
  barberoId: number;
  motivoCategoria: string;
  motivoDetalle?: string;
  /** ISO datetime */
  fechaReferencia: string;
  sugerencias: SugerenciaInput[];
}

export interface RechazarInput {
  observacion?: string;
  /** Si se envía, el estado pasa a "Sugerida" en lugar de "Rechazada". */
  sugerencias?: SugerenciaInput[];
}

export interface ResponderInput {
  /** true = barbero acepta la contrapropuesta del admin. */
  acepta: boolean;
  observacion?: string;
}

class SolicitudesCambioHorarioService {
  private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${API_BASE_URL}${endpoint}`;
    const currentUser = auth.currentUser;
    const token = currentUser ? await currentUser.getIdToken() : null;
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
    };
    const response = await fetch(url, config);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error ${response.status}: ${errText || response.statusText}`);
    }
    return response;
  }

  async crearSolicitud(input: CreateSolicitudInput): Promise<{ id: number; estado: EstadoSolicitud }> {
    const response = await this.request('/SolicitudesCambioHorario', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.json();
  }

  async getSolicitudes(filtros?: {
    estado?: EstadoSolicitud;
    barberoId?: number;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: SolicitudCambioHorario[]; totalCount: number; page: number; pageSize: number; totalPages: number }> {
    const params = new URLSearchParams();
    if (filtros?.estado) params.append('estado', filtros.estado);
    if (filtros?.barberoId) params.append('barberoId', String(filtros.barberoId));
    params.append('page', String(filtros?.page ?? 1));
    params.append('pageSize', String(filtros?.pageSize ?? 20));

    const response = await this.request(`/SolicitudesCambioHorario?${params.toString()}`);
    return response.json();
  }

  async getSolicitud(id: number): Promise<SolicitudCambioHorario> {
    const response = await this.request(`/SolicitudesCambioHorario/${id}`);
    return response.json();
  }

  async aprobarSolicitud(id: number, usuarioId: number): Promise<{ id: number; estado: EstadoSolicitud }> {
    const response = await this.request(`/SolicitudesCambioHorario/${id}/aprobar?usuarioId=${usuarioId}`, {
      method: 'POST',
    });
    return response.json();
  }

  async rechazarSolicitud(id: number, usuarioId: number, input: RechazarInput): Promise<{ id: number; estado: EstadoSolicitud }> {
    const response = await this.request(`/SolicitudesCambioHorario/${id}/rechazar?usuarioId=${usuarioId}`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.json();
  }

  async responderSugerencia(id: number, input: ResponderInput): Promise<{ id: number; estado: EstadoSolicitud }> {
    const response = await this.request(`/SolicitudesCambioHorario/${id}/responder`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.json();
  }
}

export const solicitudesCambioHorarioService = new SolicitudesCambioHorarioService();
