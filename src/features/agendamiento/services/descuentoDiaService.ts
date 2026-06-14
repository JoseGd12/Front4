import { httpClient } from '../../../shared/services/httpClient';

/**
 * Servicio de descuentos por día.
 *
 * Los descuentos se persisten en el backend (tabla DescuentosDia) para que se
 * sincronicen entre el panel web y la app móvil. Antes se guardaban en
 * localStorage, por lo que cada plataforma tenía sus propios datos aislados.
 */
class DescuentoDiaService {
    /** Devuelve el mapa { "yyyy-MM-dd": porcentaje } con todos los descuentos. */
    async getDescuentos(): Promise<Record<string, number>> {
        try {
            const data = await httpClient.get<Record<string, number>>('/DescuentosDia', { useCache: false });
            return data && typeof data === 'object' ? data : {};
        } catch (e) {
            console.warn('Error obteniendo descuentos por día:', e);
            return {};
        }
    }

    /** Crea o actualiza el descuento de un día (fecha en formato "yyyy-MM-dd"). */
    async setDescuento(fecha: string, porcentaje: number): Promise<void> {
        await httpClient.put('/DescuentosDia', { fecha, porcentaje });
    }

    /** Elimina el descuento de un día (fecha en formato "yyyy-MM-dd"). */
    async deleteDescuento(fecha: string): Promise<void> {
        await httpClient.delete(`/DescuentosDia/${fecha}`);
    }
}

export const descuentoDiaService = new DescuentoDiaService();
export default descuentoDiaService;
