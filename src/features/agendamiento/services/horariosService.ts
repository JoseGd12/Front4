const API_BASE_URL = '/api';

export interface HorarioBarbero {
    id?: number;
    barberoId: number;
    dia: string; // "Lunes", "Martes", etc.
    horaInicio: string; // "HH:mm"
    horaFin: string; // "HH:mm"
    estado?: boolean;
}

// DTOs internos para comunicación con API
interface HorarioBarberoApi {
    id: number;
    barberoId: number;
    diaSemana: number; // 1=Lunes, 7=Domingo
    horaInicio: string; // "HH:mm:ss"
    horaFin: string; // "HH:mm:ss"
    estado: boolean;
}

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

class HorariosService {
    private async request(endpoint: string, options: RequestInit = {}): Promise<Response> {
        const url = `${API_BASE_URL}${endpoint}`;

        const config: RequestInit = {
            ...options,
            headers: {
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

    private mapApiToLocal(apiData: any): HorarioBarbero {
        const diaNum = apiData.diaSemana ?? apiData.DiaSemana;
        const diaNombre = apiData.dia ?? apiData.Dia;
        let diaStr = "Desconocido";
        if (typeof diaNombre === 'string' && diaNombre.trim()) {
            diaStr = String(diaNombre);
        } else if (typeof diaNum === 'number') {
            if (diaNum === 7) diaStr = "Domingo";
            else if (diaNum >= 1 && diaNum <= 6) diaStr = DIAS[diaNum];
        }
        const hIniRaw = apiData.horaInicio ?? apiData.HoraInicio ?? "00:00";
        const hFinRaw = apiData.horaFin ?? apiData.HoraFin ?? "00:00";
        const hInicio = String(hIniRaw).substring(0, 5);
        const hFin = String(hFinRaw).substring(0, 5);
        return {
            id: apiData.id ?? apiData.Id,
            barberoId: apiData.barberoId ?? apiData.BarberoId,
            dia: diaStr,
            horaInicio: hInicio,
            horaFin: hFin,
            estado: (apiData.estado ?? apiData.Estado ?? true)
        };
    }

    private mapLocalToApiCreate(local: HorarioBarbero): any {
        let diaInt = DIAS.indexOf(local.dia);
        if (local.dia === "Domingo") diaInt = 7;

        return {
            BarberoId: local.barberoId,
            DiaSemana: diaInt,
            HoraInicio: local.horaInicio.length === 5 ? `${local.horaInicio}:00` : local.horaInicio,
            HoraFin: local.horaFin.length === 5 ? `${local.horaFin}:00` : local.horaFin
        };
    }

    private mapLocalToApiUpdate(local: HorarioBarbero): any {
        let diaInt = DIAS.indexOf(local.dia);
        if (local.dia === "Domingo") diaInt = 7;

        return {
            BarberoId: local.barberoId,
            DiaSemana: diaInt,
            HoraInicio: local.horaInicio.length === 5 ? `${local.horaInicio}:00` : local.horaInicio,
            HoraFin: local.horaFin.length === 5 ? `${local.horaFin}:00` : local.horaFin,
            Estado: local.estado ?? true
        };
    }

    async getHorarios(): Promise<HorarioBarbero[]> {
        const response = await this.request('/HorariosBarberos?page=1&pageSize=100');
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        let items: any[] = [];
        if (Array.isArray(raw)) {
            items = raw;
        } else if (raw && typeof raw === 'object') {
            if (Array.isArray(raw.items)) items = raw.items;
            else if (Array.isArray(raw.data)) items = raw.data;
            else if (Array.isArray(raw.$values)) items = raw.$values;
            else {
                const firstArray = Object.values(raw).find((v: any) => Array.isArray(v));
                items = firstArray || [];
            }
        }
        return items.map(d => this.mapApiToLocal(d));
    }

    async getHorariosByBarberoId(barberoId: number): Promise<HorarioBarbero[]> {
        const response = await this.request(`/HorariosBarberos/barbero/${barberoId}?page=1&pageSize=100`);
        const text = await response.text();
        const raw = text ? JSON.parse(text) : [];
        const data = Array.isArray(raw)
            ? raw
            : (raw && typeof raw === 'object' && Array.isArray((raw.items ?? raw.data ?? raw.$values))) ? (raw.items ?? raw.data ?? raw.$values) : [];
        return data.map(d => this.mapApiToLocal(d));
    }

    async createHorario(horario: HorarioBarbero): Promise<HorarioBarbero> {
        const payload = this.mapLocalToApiCreate(horario);
        const response = await this.request('/HorariosBarberos', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        const data: HorarioBarberoApi = text ? JSON.parse(text) : {};
        return this.mapApiToLocal(data);
    }

    async updateHorario(id: number, horario: HorarioBarbero): Promise<HorarioBarbero> {
        const payload = this.mapLocalToApiUpdate(horario);
        const response = await this.request(`/HorariosBarberos/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        const text = await response.text();
        const data: HorarioBarberoApi = text ? JSON.parse(text) : {};
        return this.mapApiToLocal(data);
    }

    async deleteHorario(id: number): Promise<void> {
        await this.request(`/HorariosBarberos/${id}`, {
            method: 'DELETE',
        });
    }

    async toggleEstado(id: number, estado: boolean, options?: {
        usuarioSolicitanteId?: number;
        fechaReferencia?: string;
        motivo?: string;
        cantidadSugerencias?: number;
    }): Promise<any> {
        const payload: any = {
            estado
        };

        if (!estado) {
            if (options?.usuarioSolicitanteId) {
                payload.UsuarioSolicitanteId = Number(options.usuarioSolicitanteId);
            }
            if (options?.fechaReferencia) {
                payload.FechaReferencia = options.fechaReferencia;
            }
            if (options?.motivo) {
                payload.Motivo = options.motivo;
            }
            payload.CantidadSugerencias = options?.cantidadSugerencias && options.cantidadSugerencias > 0
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
            UsuarioSolicitanteId: Number(options.usuarioSolicitanteId),
            FechaReferencia: options.fechaReferencia,
            Motivo: options.motivo,
            CantidadSugerencias: options.cantidadSugerencias && options.cantidadSugerencias > 0
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
}

export const horariosService = new HorariosService();
