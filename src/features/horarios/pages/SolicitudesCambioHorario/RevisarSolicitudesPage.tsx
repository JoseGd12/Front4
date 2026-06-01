import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle, Clock, Eye, MessageSquare, Plus, Trash2, X, XCircle, ArrowLeft } from 'lucide-react';
import {
  solicitudesCambioHorarioService,
  type EstadoSolicitud,
  type SolicitudCambioHorario,
  type SugerenciaInput,
} from '../../services/solicitudesCambioHorarioService';
import { formatDateShort, formatTo12h, parseTo24h } from '../../../../shared/utils/dateUtils';
import { Input } from '../../../../shared/components/ui/input';
import { Label } from '../../../../shared/components/ui/label';
import { useCustomAlert } from '../../../../shared/components/ui/custom-alert';
import { TableHeaderSection } from '../../../../shared/components/ui/table-header-section';
import { TableLoadingStateRow } from '../../../../shared/components/ui/table-loading-state-row';
import { TimeInput12h } from '../../../../shared/components/ui/TimeInput12h';
import { TableEmptyStateRow } from '../../../../shared/components/ui/table-empty-state-row';

const COLORES_ESTADO: Record<EstadoSolicitud, { bg: string; text: string; border: string; label: string; icon: any }> = {
  Pendiente: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: '#fbbf24', label: 'Pendiente', icon: Clock },
  Sugerida: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6', label: 'En espera barbero', icon: MessageSquare },
  Aprobada: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', label: 'Aprobada', icon: CheckCircle },
  Rechazada: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444', label: 'Rechazada', icon: XCircle },
};

interface Props {
  /** ID del usuario admin logueado */
  usuarioId: number;
  /** Callback para navegar hacia atrás */
  onBack?: () => void;
}

export default function RevisarSolicitudesPage({ usuarioId, onBack }: Props) {
  const { error, edited, AlertContainer } = useCustomAlert();

  const [solicitudes, setSolicitudes] = useState<SolicitudCambioHorario[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<EstadoSolicitud | ''>('');
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<SolicitudCambioHorario | null>(null);
  const [observacion, setObservacion] = useState('');

  // Sugerencias del admin (contrapropuesta)
  const [sugerenciasAdmin, setSugerenciasAdmin] = useState<SugerenciaInput[]>([]);
  const [diaTmp, setDiaTmp] = useState('');
  const [horaInicioTmp, setHoraInicioTmp] = useState('');
  const [horaFinTmp, setHoraFinTmp] = useState('');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await solicitudesCambioHorarioService.getSolicitudes({
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
  }, [filtroEstado]);

  const cerrarModal = () => {
    setSelected(null);
    setObservacion('');
    setSugerenciasAdmin([]);
    setDiaTmp('');
    setHoraInicioTmp('');
    setHoraFinTmp('');
  };

  const sugerenciasBarbero = useMemo(
    () => (selected?.sugerencias ?? []).filter((s) => s.origen === 'Barbero'),
    [selected]
  );

  const handleAgregarSugerencia = () => {
    if (!diaTmp || !horaInicioTmp || !horaFinTmp) {
      error('Datos incompletos', 'Completa día y horas de la sugerencia.');
      return;
    }
    if (parseTo24h(horaFinTmp) <= parseTo24h(horaInicioTmp)) {
      error('Horario inválido', 'La hora fin debe ser posterior a la hora inicio.');
      return;
    }
    setSugerenciasAdmin((prev) => [
      ...prev,
      {
        diaSugerido: `${diaTmp}T00:00:00`,
        horaInicio: parseTo24h(horaInicioTmp) || horaInicioTmp,
        horaFin: parseTo24h(horaFinTmp) || horaFinTmp,
      },
    ]);
    setDiaTmp('');
    setHoraInicioTmp('');
    setHoraFinTmp('');
  };

  const handleAprobar = async () => {
    if (!selected) return;
    try {
      await solicitudesCambioHorarioService.aprobarSolicitud(selected.id, usuarioId);
      setSolicitudes(prev => prev.map(s => s.id === selected.id ? { ...s, estado: 'Aprobada' as EstadoSolicitud } : s));
      edited('Solicitud aprobada', 'El horario del barbero fue actualizado.');
      cerrarModal();
      cargar();
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudo aprobar la solicitud.');
    }
  };

  const handleRechazar = async () => {
    if (!selected) return;
    try {
      await solicitudesCambioHorarioService.rechazarSolicitud(selected.id, usuarioId, {
        observacion: observacion || undefined,
      });
      setSolicitudes(prev => prev.map(s => s.id === selected.id ? { ...s, estado: 'Rechazada' as EstadoSolicitud } : s));
      edited('Solicitud rechazada', 'La solicitud fue marcada como rechazada.');
      cerrarModal();
      cargar();
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudo rechazar la solicitud.');
    }
  };

  const handleContraponer = async () => {
    if (!selected) return;
    if (sugerenciasAdmin.length === 0) {
      error('Sin sugerencias', 'Agrega al menos una sugerencia para contraponer.');
      return;
    }
    try {
      await solicitudesCambioHorarioService.rechazarSolicitud(selected.id, usuarioId, {
        observacion: observacion || undefined,
        sugerencias: sugerenciasAdmin,
      });
      setSolicitudes(prev => prev.map(s => s.id === selected.id ? { ...s, estado: 'Sugerida' as EstadoSolicitud } : s));
      edited('Contrapropuesta enviada', 'El barbero recibirá la contrapropuesta para responder.');
      cerrarModal();
      cargar();
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudo enviar la contrapropuesta.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AlertContainer />

      <TableHeaderSection
        variant="dark"
        leftContent={(
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-dark text-gray-lightest hover:text-white-primary transition-colors"
                title="Volver a Horarios"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="p-2.5 bg-orange-primary/10 rounded-xl">
              <Calendar className="w-6 h-6 text-orange-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white-primary">Revisar Solicitudes</h1>
              <p className="text-xs text-gray-lighter">Gestiona las peticiones de los barberos.</p>
            </div>
          </div>
        )}
        rightContent={(
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-lighter font-medium">Filtrar por:</span>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoSolicitud | '')}
              className="bg-gray-dark border border-gray-medium text-white-primary text-xs rounded-lg px-3 py-2 outline-none focus:border-orange-primary/50 transition-colors min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="Pendiente">Pendientes</option>
              <option value="Aprobada">Aprobadas</option>
              <option value="Rechazada">Rechazadas</option>
              <option value="Sugerida">En espera barbero</option>
            </select>
          </div>
        )}
      />

      <div className="std-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-black-secondary/50">
              <tr className="text-left text-gray-lighter text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Barbero</th>
                <th className="px-6 py-4 font-semibold">Motivo</th>
                <th className="px-6 py-4 font-semibold">Fecha referencia</th>
                <th className="px-6 py-4 font-semibold">Sugerencias</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold">Fecha creación</th>
                <th className="px-6 py-4 font-semibold text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-dark/50">
              {loading ? (
                <TableLoadingStateRow colSpan={7} />
              ) : solicitudes.length === 0 ? (
                <TableEmptyStateRow colSpan={7} message="No hay solicitudes con el filtro actual." />
              ) : (
                solicitudes.map((s) => {
                  const c = COLORES_ESTADO[s.estado];
                  const Icon = c.icon;
                  return (
                    <tr key={s.id} className="text-white-secondary text-sm hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-dark flex items-center justify-center border border-gray-medium">
                            <span className="text-xs font-bold text-orange-primary">
                              {s.barberoNombre.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-white-primary">{s.barberoNombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-white-primary">{s.motivoCategoria}</div>
                        {s.motivoDetalle && (
                          <div className="text-xs text-gray-lighter truncate max-w-[150px]">{s.motivoDetalle}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-gray-lighter text-xs">
                        {formatDateShort(s.fechaCreacion)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelected(s)}
                          className="p-2 rounded-lg bg-white/5 text-gray-lighter hover:bg-orange-primary hover:text-black-primary transition-all duration-200 shadow-sm"
                          title="Revisar solicitud"
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

      {/* Modal Revisar */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={cerrarModal}
        >
          <div
            className="elegante-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-dark">
              <h2 className="text-xl font-bold text-white-primary flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-orange-primary" />
                Solicitud de {selected.barberoNombre}
              </h2>
              <button onClick={cerrarModal} className="text-gray-lightest hover:text-white-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-lightest">Motivo</p>
                  <p className="text-white-primary font-medium">{selected.motivoCategoria}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-lightest">Fecha referencia</p>
                  <p className="text-white-primary">{formatDateShort(selected.fechaReferencia)}</p>
                </div>
              </div>

              {selected.motivoDetalle && (
                <div>
                  <p className="text-xs text-gray-lightest">Detalle</p>
                  <p className="text-white-primary">{selected.motivoDetalle}</p>
                </div>
              )}

              {/* Sugerencias del barbero */}
              <div>
                <p className="text-xs text-gray-lightest mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Sugerencias del barbero
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

              {/* Solo permitir acciones si está Pendiente */}
              {selected.estado === 'Pendiente' && (
                <>
                  <div className="border-t border-gray-dark pt-4 space-y-3">
                    <p className="text-sm text-white-primary font-semibold">
                      Contrapropuesta (opcional)
                    </p>

                    {sugerenciasAdmin.length > 0 && (
                      <table className="w-full text-xs border border-blue-400/30 rounded bg-blue-500/5">
                        <thead className="bg-blue-500/10">
                          <tr className="text-blue-300">
                            <th className="px-2 py-1 text-left">Día</th>
                            <th className="px-2 py-1 text-left">Inicio</th>
                            <th className="px-2 py-1 text-left">Fin</th>
                            <th className="px-2 py-1 text-center"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {sugerenciasAdmin.map((s, idx) => (
                            <tr key={idx} className="border-t border-blue-400/20 text-white-primary">
                              <td className="px-2 py-1">{s.diaSugerido.split('T')[0]}</td>
                              <td className="px-2 py-1">{formatTo12h(s.horaInicio)}</td>
                              <td className="px-2 py-1">{formatTo12h(s.horaFin)}</td>
                              <td className="px-2 py-1 text-center">
                                <button
                                  onClick={() => setSugerenciasAdmin((p) => p.filter((_, i) => i !== idx))}
                                  className="text-red-400"
                                >
                                  <Trash2 className="w-3 h-3 inline" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <Input type="date" value={diaTmp} onChange={(e) => setDiaTmp(e.target.value)} className="elegante-input" />
                      <TimeInput12h value={horaInicioTmp} onChange={setHoraInicioTmp} />
                      <TimeInput12h value={horaFinTmp} onChange={setHoraFinTmp} />
                    </div>

                    <button
                      onClick={handleAgregarSugerencia}
                      type="button"
                      className="elegante-button-secondary px-3 py-1 flex items-center gap-2 text-xs"
                    >
                      <Plus className="w-3 h-3" />
                      Agregar
                    </button>
                  </div>

                  <div>
                    <Label className="text-white-primary text-xs">Observación (opcional)</Label>
                    <textarea
                      rows={2}
                      value={observacion}
                      onChange={(e) => setObservacion(e.target.value)}
                      className="elegante-input w-full mt-1"
                      placeholder="Motivo del rechazo o aclaración..."
                    />
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-dark">
                    <button
                      onClick={handleAprobar}
                      className="flex-1 elegante-button-primary py-2 flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprobar
                    </button>
                    {sugerenciasAdmin.length > 0 ? (
                      <button
                        onClick={handleContraponer}
                        className="flex-1 py-2 flex items-center justify-center gap-2 rounded border border-blue-400 text-blue-400 hover:bg-blue-400/10"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Enviar contrapropuesta
                      </button>
                    ) : (
                      <button
                        onClick={handleRechazar}
                        className="flex-1 py-2 flex items-center justify-center gap-2 rounded border border-red-400 text-red-400 hover:bg-red-400/10"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                    )}
                  </div>
                </>
              )}

              {selected.estado !== 'Pendiente' && (
                <div className="pt-4 border-t border-gray-dark text-center text-sm text-gray-lightest italic">
                  Esta solicitud ya fue procesada (estado: {COLORES_ESTADO[selected.estado].label}).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
