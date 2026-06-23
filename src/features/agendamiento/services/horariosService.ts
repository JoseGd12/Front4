import { normalizeDiaNombre } from '../utils/scheduleUtils';
import { auth } from '../../../shared/services/firebase';

const API_BASE_URL = '/api';

export interface HorarioBarbero {
    id?: number;
    barberoId: number;
    dia: string; // "Lunes", "Martes", etc.
    horaInicio: string; // "HH:mm"
    horaFin: string; // "HH:mm"
    estado?: boolean;
    horarioSemanalId?: number;
    fechaInicioSemana?: string; // ISO date "YYYY-MM-DD"
    fechaFinSemana?: string;    // ISO date "YYYY-MM-DD"
}

export interface HorarioSemanalApi {
    id: number;
    barberoId: number;
    barberoNombre: string | null;
    fechaInicioSemana: string;
    fechaFinSemana: string;
    estado: string; // "Activo", "Pendiente", "Finalizado"
    detalles: DetalleHorarioDiaApi[];
}

export interface DetalleHorarioDiaApi {
    id: number;
    horarioSemanalId: number;
    diaSemana: number; // 1=Lunes, 7=Domingo
    horaInicio: string; // "HH:mm"
    horaFin: string; // "HH:mm"
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

class HorariosService {
    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        // Obtener token de Firebase para el header Authorization
        const currentUser = auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : null;

        const config: RequestInit = {
            ...options,
            headers: {
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...options.headers,
            },
        };

        if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
            (config.headers as any)['Content-Type'] = 'application/json';
        }

        try {
            console.log(`Resources API [${config.method || 'GET'}]: ${url}`);
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }
            return response;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    private parseItems(raw: any): any[] {
        if (Array.isArray(raw)) return raw;
        if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.items)) return raw.items;
            if (Array.isArray(raw.data)) return raw.data;
            if (Array.isArray(raw.$values)) return raw.$values;
            const firstArray = Object.values(raw).find((v: any) => Array.isArray(v));
            return (firstArray as any[]) || [];
        }
        return [];
    }

    private diaSemanaToNombre(diaSemana: number): string {
        if (diaSemana === 7 || diaSemana === 0) return "Domingo";
        if (diaSemana >= 1 && diaSemana <= 6) return DIAS[diaSemana];
        return "Desconocido";
    }

    private diaNumFromNombre(dia: string): number {
        const normalizado = normalizeDiaNombre(dia);
        const idx = DIAS.indexOf(normalizado);
        if (idx === 0) return 7; // Domingo
        return idx > 0 ? idx : 0;
    }

    private flattenSemanalToHorarioBarbero(semanal: HorarioSemanalApi): HorarioBarbero[] {
        const estadoActivo = semanal.estado === "Activo";
        // Guard: detalles can arrive as {$values:[...]} from EF Core ref-tracking serialization
        const detalles: DetalleHorarioDiaApi[] = Array.isArray(semanal.detalles)
            ? semanal.detalles
            : Array.isArray((semanal.detalles as any)?.$values)
                ? (semanal.detalles as any).$values
                : [];
        return detalles.map(d => ({
            id: d.id,
            barberoId: semanal.barberoId,
            dia: normalizeDiaNombre(this.diaSemanaToNombre(d.diaSemana)),
            horaInicio: String(d.horaInicio).substring(0, 5),
            horaFin: String(d.horaFin).substring(0, 5),
            estado: estadoActivo,
            horarioSemanalId: semanal.id,
            fechaInicioSemana: String(semanal.fechaInicioSemana || '').slice(0, 10) || undefined,
            fechaFinSemana: String(semanal.fechaFinSemana || '').slice(0, 10) || undefined,
        }));
    }

    // ── Métodos que devuelven la estructura plana (compatibilidad) ──

    async getHorarios(): Promise<HorarioBarbero[]> {
        const response = await this.request('/HorariosBarberos?page=1&pageSize=200');
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        const items: HorarioSemanalApi[] = this.parseItems(raw);
        return items.flatMap(s => this.flattenSemanalToHorarioBarbero(s));
    }

    async getHorariosByBarberoId(barberoId: number): Promise<HorarioBarbero[]> {
        const response = await this.request(`/HorariosBarberos/barbero/${barberoId}?page=1&pageSize=200`);
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        const items: HorarioSemanalApi[] = this.parseItems(raw);
        return items.flatMap(s => this.flattenSemanalToHorarioBarbero(s));
    }

    // ── Métodos que devuelven la estructura semanal ──

    async getHorariosSemanales(): Promise<HorarioSemanalApi[]> {
        const response = await this.request('/HorariosBarberos?page=1&pageSize=200');
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        return this.parseItems(raw);
    }

    async getHorariosSemanalesByBarbero(barberoId: number): Promise<HorarioSemanalApi[]> {
        const response = await this.request(`/HorariosBarberos/barbero/${barberoId}?page=1&pageSize=200`);
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        return this.parseItems(raw);
    }

    async getHorarioSemanalById(id: number): Promise<HorarioSemanalApi> {
        const response = await this.request(`/HorariosBarberos/${id}`);
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    // ── CRUD Semanal ──

    async createHorarioSemanal(input: {
        barberoId: number;
        fechaInicioSemana: string;
        fechaFinSemana: string;
        detalles: Array<{ diaSemana: number; horaInicio: string; horaFin: string }>;
    }): Promise<HorarioSemanalApi | null> {
        const payload = {
            barberoId: input.barberoId,
            fechaInicioSemana: input.fechaInicioSemana,
            fechaFinSemana: input.fechaFinSemana,
            detalles: input.detalles.map(d => ({
                diaSemana: d.diaSemana,
                horaInicio: d.horaInicio.length === 5 ? `${d.horaInicio}:00` : d.horaInicio,
                horaFin: d.horaFin.length === 5 ? `${d.horaFin}:00` : d.horaFin
            }))
        };
        const response = await this.request('/HorariosBarberos', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async updateHorarioSemanal(id: number, input: {
        fechaInicioSemana?: string;
        fechaFinSemana?: string;
        estado?: string;
        detalles?: Array<{ diaSemana: number; horaInicio: string; horaFin: string }>;
    }): Promise<HorarioSemanalApi | null> {
        const payload: any = {};
        if (input.fechaInicioSemana) payload.fechaInicioSemana = input.fechaInicioSemana;
        if (input.fechaFinSemana) payload.fechaFinSemana = input.fechaFinSemana;
        if (input.estado) payload.estado = input.estado;
        if (input.detalles) {
            payload.detalles = input.detalles.map(d => ({
                diaSemana: d.diaSemana,
                horaInicio: d.horaInicio.length === 5 ? `${d.horaInicio}:00` : d.horaInicio,
                horaFin: d.horaFin.length === 5 ? `${d.horaFin}:00` : d.horaFin
            }));
        }
        const response = await this.request(`/HorariosBarberos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    async deleteHorarioSemanal(id: number): Promise<void> {
        await this.request(`/HorariosBarberos/${id}`, {
            method: 'DELETE',
        });
    }

    // ── Compatibilidad: adaptar edición de un día individual ──

    async updateHorario(detalleId: number, horario: HorarioBarbero): Promise<HorarioBarbero> {
        const semanalId = horario.horarioSemanalId;
        if (!semanalId) {
            throw new Error("horarioSemanalId requerido para actualizar un detalle individual");
        }
        const semanal = await this.getHorarioSemanalById(semanalId);
        if (!semanal) throw new Error("HorarioSemanal no encontrado");

        const diaSemanaNum = this.diaNumFromNombre(horario.dia);
        const nuevosDetalles = semanal.detalles.map(d => {
            if (d.id === detalleId) {
                return {
                    diaSemana: diaSemanaNum || d.diaSemana,
                    horaInicio: horario.horaInicio,
                    horaFin: horario.horaFin
                };
            }
            return {
                diaSemana: d.diaSemana,
                horaInicio: String(d.horaInicio).substring(0, 5),
                horaFin: String(d.horaFin).substring(0, 5)
            };
        });

        const updated = await this.updateHorarioSemanal(semanalId, { detalles: nuevosDetalles });
        const flatList = this.flattenSemanalToHorarioBarbero(updated);
        return flatList.find(h => h.dia === normalizeDiaNombre(horario.dia)) || flatList[0] || horario;
    }

    // ── Estado y cancelación ──

    async toggleEstado(id: number, estado: boolean, options?: {
        usuarioSolicitanteId?: number;
        fechaReferencia?: string;
        motivo?: string;
        cantidadSugerencias?: number;
    }): Promise<any> {
        const payload: any = { estado };

        if (!estado) {
            if (options?.usuarioSolicitanteId) {
                payload.usuarioSolicitanteId = Number(options.usuarioSolicitanteId);
            }
            if (options?.fechaReferencia) {
                payload.fechaReferencia = options.fechaReferencia.includes('T')
                    ? options.fechaReferencia
                    : options.fechaReferencia + 'T00:00:00';
            }
            if (options?.motivo) {
                payload.motivo = options.motivo;
            }
            payload.cantidadSugerencias = options?.cantidadSugerencias && options.cantidadSugerencias > 0
                ? Number(options.cantidadSugerencias)
                : 3;
        }

        const response = await this.request(`/HorariosBarberos/${id}/estado`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    async cancelarDiaPorBarbero(barberoId: number, options: {
        usuarioSolicitanteId: number;
        fechaReferencia: string;
        motivo?: string;
        cantidadSugerencias?: number;
    }): Promise<any> {
        const payload: any = {
            estado: false,
            usuarioSolicitanteId: Number(options.usuarioSolicitanteId),
            fechaReferencia: options.fechaReferencia.includes('T')
                ? options.fechaReferencia
                : options.fechaReferencia + 'T00:00:00',
            motivo: options.motivo || "Día cancelado por administración.",
            cantidadSugerencias: options.cantidadSugerencias && options.cantidadSugerencias > 0
                ? Number(options.cantidadSugerencias)
                : 3
        };
        const response = await this.request(`/HorariosBarberos/barbero/${barberoId}/cancelar-dia`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }

    // ── Helpers para la página de horarios ──

    diaNumeroFromNombre(dia: string): number {
        return this.diaNumFromNombre(dia);
    }
}

export const horariosService = new HorariosService();
