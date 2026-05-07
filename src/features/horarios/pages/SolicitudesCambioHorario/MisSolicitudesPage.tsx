import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle, Clock, Eye, MessageSquare, Plus, X, XCircle } from 'lucide-react';

import {
  solicitudesCambioHorarioService,
  type EstadoSolicitud,
  type SolicitudCambioHorario,
} from '../../services/solicitudesCambioHorarioService';
import { formatDateShort, formatTo12h } from '../../../../shared/utils/dateUtils';
import { useCustomAlert } from '../../../../shared/components/ui/custom-alert';
import { TableHeaderSection } from '../../../../shared/components/ui/table-header-section';
import { TableLoadingStateRow } from '../../../../shared/components/ui/table-loading-state-row';
import { TableEmptyStateRow } from '../../../../shared/components/ui/table-empty-state-row';

const COLORES_ESTADO: Record<EstadoSolicitud, { bg: string; text: string; border: string; label: string; icon: any }> = {
  Pendiente: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: '#fbbf24', label: 'Pendiente', icon: Clock },
  Sugerida: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6', label: 'Contrapropuesta', icon: MessageSquare },
  Aprobada: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', label: 'Aprobada', icon: CheckCircle },
  Rechazada: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444', label: 'Rechazada', icon: XCircle },
};

interface Props {
  /** ID del barbero logueado (idealmente desde context auth) */
  barberoId?: number;
  onNavigate?: (tab: string) => void;
}

export default function MisSolicitudesPage({ barberoId, onNavigate }: Props) {
  const { error, edited, AlertContainer } = useCustomAlert();

  const [solicitudes, setSolicitudes] = useState<SolicitudCambioHorario[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | ''>('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SolicitudCambioHorario | null>(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await solicitudesCambioHorarioService.getSolicitudes({
        barberoId,
        estado: filtroEstado || undefined,
        page: 1,
        pageSize: 50,
      });
      setSolicitudes(r.items);
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudieron cargar las solicitudes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barberoId, filtroEstado]);

  const sugerenciasAdmin = useMemo(
    () => (selected?.sugerencias ?? []).filter((s) => s.origen === 'Admin'),
    [selected]
  );
  const sugerenciasBarbero = useMemo(
    () => (selected?.sugerencias ?? []).filter((s) => s.origen === 'Barbero'),
    [selected]
  );

  const handleResponder = async (acepta: boolean) => {
    if (!selected) return;
    try {
      await solicitudesCambioHorarioService.responderSugerencia(selected.id, { acepta });
      edited(
        acepta ? 'Contrapropuesta aceptada' : 'Contrapropuesta rechazada',
        acepta
          ? 'Tu nuevo horario fue aplicado.'
          : 'La solicitud fue rechazada definitivamente.'
      );
      setSelected(null);
      await cargar();
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudo procesar la respuesta.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AlertContainer />

      <TableHeaderSection
        variant="dark"
        leftContent={(
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-primary/10 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white-primary">Mis Solicitudes</h1>
              <p className="text-xs text-gray-lighter">Gestiona tus peticiones de cambio.</p>
            </div>
          </div>
        )}
        rightContent={(
          <div className="flex items-center gap-4">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoSolicitud | '')}
              className="bg-gray-dark border border-gray-medium text-white-primary text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-primary/50 transition-colors min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Aprobada">Aprobadas</option>
              <option value="Rechazada">Rechazadas</option>
              <option value="Sugerida">Contrapropuestas</option>
            </select>

            <button
              onClick={() => onNavigate?.('crear-solicitud')}
              className="btn-std-primary"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </button>
          </div>
        )}
      />

      <div className="std-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black-secondary/50">
              <tr className="text-left text-gray-lighter text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Fecha creación</th>
                <th className="px-6 py-4 font-semibold">Motivo</th>
                <th className="px-6 py-4 font-semibold">Fecha referencia</th>
                <th className="px-6 py-4 font-semibold">Sugerencias</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-dark/50">
              {loading ? (
                <TableLoadingStateRow colSpan={6} />
              ) : solicitudes.length === 0 ? (
                <TableEmptyStateRow colSpan={6} message="No tienes solicitudes registradas." />
              ) : (
                solicitudes.map((s) => {
                  const c = COLORES_ESTADO[s.estado];
                  const Icon = c.icon;
                  return (
                    <tr key={s.id} className="text-white-secondary text-sm hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-lighter text-xs">
                        {formatDateShort(s.fechaCreacion)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white-primary">{s.motivoCategoria}</div>
                        {s.motivoDetalle && (
                          <div className="text-xs text-gray-lighter truncate max-w-[200px]">{s.motivoDetalle}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-orange-primary/90">
                        {formatDateShort(s.fechaReferencia)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="w-6 h-6 rounded-full bg-gray-dark flex items-center justify-center text-[10px] font-bold text-white-primary">
                            {s.sugerencias.length}
                          </span>
                          <span className="text-xs text-gray-lighter">opciones</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                          style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}40` }}
                        >
                          <Icon className="w-3 h-3" />
                          {c.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelected(s)}
                          className="p-2 rounded-lg bg-white/5 text-gray-lighter hover:bg-orange-primary hover:text-black-primary transition-all duration-200 shadow-sm"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detalle */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="elegante-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-dark">
              <h2 className="text-xl font-bold text-white-primary flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-primary" />
                Detalle de Solicitud
              </h2>
              <button onClick={() => setSelected(null)} className="text-gray-lightest hover:text-white-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-lightest">Estado</p>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1"
                    style={{
                      background: COLORES_ESTADO[selected.estado].bg,
                      color: COLORES_ESTADO[selected.estado].text,
                      border: `1px solid ${COLORES_ESTADO[selected.estado].border}`,
                    }}
                  >
                    {COLORES_ESTADO[selected.estado].label}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-lightest">Fecha referencia</p>
                  <p className="text-white-primary">{formatDateShort(selected.fechaReferencia)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-lightest">Motivo</p>
                <p className="text-white-primary font-medium">{selected.motivoCategoria}</p>
                {selected.motivoDetalle && <p className="text-gray-lightest mt-1">{selected.motivoDetalle}</p>}
              </div>

              {/* Mis sugerencias */}
              <div>
                <p className="text-xs text-gray-lightest mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Mis sugerencias
                </p>
                {sugerenciasBarbero.length > 0 ? (
                  <table className="w-full text-xs border border-gray-dark rounded">
                    <thead className="bg-gray-darker">
                      <tr className="text-gray-lightest">
                        <th className="px-2 py-1 text-left">Día</th>
                        <th className="px-2 py-1 text-left">Inicio</th>
                        <th className="px-2 py-1 text-left">Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sugerenciasBarbero.map((s) => (
                        <tr key={s.id} className="border-t border-gray-dark text-white-primary">
                          <td className="px-2 py-1">{formatDateShort(s.diaSugerido)}</td>
                          <td className="px-2 py-1">{formatTo12h(s.horaInicio)}</td>
                          <td className="px-2 py-1">{formatTo12h(s.horaFin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-lightest italic">Sin sugerencias</p>
                )}
              </div>

              {/* Contrapropuesta del admin si existe */}
              {sugerenciasAdmin.length > 0 && (
                <div>
                  <p className="text-xs text-blue-400 mb-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Contrapropuesta del administrador
                  </p>
                  <table className="w-full text-xs border border-blue-400/30 rounded bg-blue-500/5">
                    <thead className="bg-blue-500/10">
                      <tr className="text-blue-300">
                        <th className="px-2 py-1 text-left">Día</th>
                        <th className="px-2 py-1 text-left">Inicio</th>
                        <th className="px-2 py-1 text-left">Fin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sugerenciasAdmin.map((s) => (
                        <tr key={s.id} className="border-t border-blue-400/20 text-white-primary">
                          <td className="px-2 py-1">{formatDateShort(s.diaSugerido)}</td>
                          <td className="px-2 py-1">{formatTo12h(s.horaInicio)}</td>
                          <td className="px-2 py-1">{formatTo12h(s.horaFin)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Observación admin */}
              {selected.observacionAdmin && (
                <div className="p-3 rounded bg-gray-darker border border-gray-dark">
                  <p className="text-xs text-gray-lightest mb-1">Observación del administrador</p>
                  <p className="text-white-primary text-sm">{selected.observacionAdmin}</p>
                </div>
              )}

              {/* Acciones por estado */}
              {selected.estado === 'Sugerida' && (
                <div className="flex gap-3 pt-4 border-t border-gray-dark">
                  <button
                    onClick={() => handleResponder(true)}
                    className="flex-1 elegante-button-primary py-2 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Aceptar contrapropuesta
                  </button>
                  <button
                    onClick={() => handleResponder(false)}
                    className="flex-1 elegante-button-secondary py-2 flex items-center justify-center gap-2 text-red-400"
                  >
                    <XCircle className="w-4 h-4" />
                    Rechazar contrapropuesta
                  </button>
                </div>
              )}

              {selected.estado === 'Rechazada' && (
                <div className="pt-4 border-t border-gray-dark">
                  <button
                    onClick={() => onNavigate?.('crear-solicitud')}
                    className="elegante-button-primary px-6 py-2 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Crear nueva solicitud
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
