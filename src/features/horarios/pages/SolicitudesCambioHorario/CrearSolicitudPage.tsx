import { useState } from 'react';
import { Calendar, Clock, FileText, Plus, Save, Trash2 } from 'lucide-react';

import {
  solicitudesCambioHorarioService,
  type SugerenciaInput,
} from '../../services/solicitudesCambioHorarioService';
import { Input } from '../../../../shared/components/ui/input';
import { Label } from '../../../../shared/components/ui/label';
import { formatTo12h, parseTo24h } from '../../../../shared/utils/dateUtils';
import { useCustomAlert } from '../../../../shared/components/ui/custom-alert';
import { TableHeaderSection } from '../../../../shared/components/ui/table-header-section';
import { ChevronLeft } from 'lucide-react';

const MOTIVOS = [
  'Conflicto personal',
  'Viaje',
  'Capacitación',
  'Cita médica',
  'Otro',
];

interface Props {
  onNavigate?: (tab: string) => void;
  barberoId?: number;
}

export default function CrearSolicitudPage({ onNavigate, barberoId: propBarberoId }: Props) {
  const { error, created, AlertContainer } = useCustomAlert();

  const [barberoId, setBarberoId] = useState<number>(propBarberoId || 0);
  const [motivoCategoria, setMotivoCategoria] = useState<string>('');
  const [motivoDetalle, setMotivoDetalle] = useState<string>('');
  const [fechaReferencia, setFechaReferencia] = useState<string>('');

  const [sugerencias, setSugerencias] = useState<SugerenciaInput[]>([]);
  const [diaTmp, setDiaTmp] = useState<string>('');
  const [horaInicioTmp, setHoraInicioTmp] = useState<string>('');
  const [horaFinTmp, setHoraFinTmp] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);

  const handleAgregarSugerencia = () => {
    if (!diaTmp || !horaInicioTmp || !horaFinTmp) {
      error('Datos incompletos', 'Completa día, hora inicio y hora fin de la sugerencia.');
      return;
    }
    if (parseTo24h(horaFinTmp) <= parseTo24h(horaInicioTmp)) {
      error('Horario inválido', 'La hora fin debe ser posterior a la hora inicio.');
      return;
    }
    setSugerencias((prev) => [
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

  const handleQuitarSugerencia = (idx: number) => {
    setSugerencias((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!barberoId || !motivoCategoria || !fechaReferencia || sugerencias.length === 0) {
      error('Faltan datos', 'Completa todos los campos y agrega al menos una sugerencia.');
      return;
    }

    setSubmitting(true);
    try {
      await solicitudesCambioHorarioService.crearSolicitud({
        barberoId,
        motivoCategoria,
        motivoDetalle: motivoDetalle || undefined,
        fechaReferencia: `${fechaReferencia}T00:00:00`,
        sugerencias,
      });
      created('Solicitud enviada', 'Tu solicitud de cambio de horario fue enviada al administrador.');
      onNavigate?.('mis-solicitudes');
    } catch (e: any) {
      error('Error', e?.message ?? 'No se pudo enviar la solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <AlertContainer />

      <TableHeaderSection
        variant="dark"
        leftContent={(
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('mis-solicitudes')}
              className="p-2 hover:bg-white/10 rounded-lg text-gray-lighter transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white-primary">Solicitar Cambio</h1>
              <p className="text-xs text-gray-lighter">Crea una nueva petición de horario.</p>
            </div>
          </div>
        )}
      />

      <div className="std-card p-8 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="p-4 bg-orange-primary/5 border border-orange-primary/10 rounded-xl space-y-2">
              <Label className="text-xs font-bold text-orange-primary uppercase tracking-wider">Tu ID de Barbero</Label>
              <Input
                type="number"
                value={barberoId || ''}
                onChange={(e) => setBarberoId(Number(e.target.value) || 0)}
                placeholder="Ingresa tu ID"
                className="bg-black-primary/50 border-orange-primary/20 text-white-primary focus:border-orange-primary"
              />
              <p className="text-[10px] text-gray-lighter">Este campo se completará automáticamente en el futuro.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-white-secondary flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-primary" />
                Motivo del cambio
              </Label>
              <select
                value={motivoCategoria}
                onChange={(e) => setMotivoCategoria(e.target.value)}
                className="elegante-input w-full bg-black-secondary"
              >
                <option value="">Selecciona un motivo...</option>
                {MOTIVOS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-white-secondary">Descripción (opcional)</Label>
              <textarea
                rows={4}
                value={motivoDetalle}
                onChange={(e) => setMotivoDetalle(e.target.value)}
                placeholder="Explica brevemente la razón..."
                className="elegante-input w-full resize-none bg-black-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold text-white-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4 text-orange-primary" />
                Fecha de inicio del cambio
              </Label>
              <Input
                type="date"
                value={fechaReferencia}
                onChange={(e) => setFechaReferencia(e.target.value)}
                className="elegante-input bg-black-secondary"
              />
            </div>
          </div>

          <div className="space-y-6 border-l border-gray-dark pl-0 md:pl-8">
            <h3 className="text-sm font-bold text-white-primary uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-primary" />
              Sugerencias de Horario
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="grid grid-cols-1 gap-2">
                  <Label className="text-[10px] uppercase font-bold text-gray-lighter">Día sugerido</Label>
                  <Input
                    type="date"
                    value={diaTmp}
                    onChange={(e) => setDiaTmp(e.target.value)}
                    className="elegante-input h-9 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-gray-lighter">Hora Inicio</Label>
                    <Input
                      type="time"
                      value={horaInicioTmp}
                      onChange={(e) => setHoraInicioTmp(e.target.value)}
                      className="elegante-input h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold text-gray-lighter">Hora Fin</Label>
                    <Input
                      type="time"
                      value={horaFinTmp}
                      onChange={(e) => setHoraFinTmp(e.target.value)}
                      className="elegante-input h-9 text-xs"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAgregarSugerencia}
                  type="button"
                  className="w-full py-2 bg-orange-primary/10 text-orange-primary hover:bg-orange-primary hover:text-black-primary text-xs font-bold rounded-lg transition-all border border-orange-primary/20 mt-2"
                >
                  <Plus className="w-3 h-3 inline mr-1" />
                  Añadir Opción
                </button>
              </div>

              {sugerencias.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sugerencias.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black-secondary border border-gray-dark rounded-xl group animate-in fade-in slide-in-from-right-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-orange-primary uppercase">{s.diaSugerido.split('T')[0]}</span>
                        <span className="text-xs text-white-secondary font-medium">
                          {formatTo12h(s.horaInicio)} - {formatTo12h(s.horaFin)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleQuitarSugerencia(idx)}
                        className="p-1.5 text-gray-lighter hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-dark rounded-xl">
                  <Clock className="w-8 h-8 text-gray-dark mx-auto mb-2 opacity-50" />
                  <p className="text-xs text-gray-lighter">No has añadido sugerencias</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-dark flex items-center justify-between">
          <p className="text-[10px] text-gray-lighter">* Todos los campos son obligatorios</p>
          <div className="flex gap-4">
            <button
              onClick={() => onNavigate?.('mis-solicitudes')}
              className="px-6 py-2.5 text-xs font-bold text-gray-lighter hover:text-white-primary transition-colors"
              disabled={submitting}
            >
              Descartar
            </button>
            <button
              onClick={handleSubmit}
              className="px-8 py-2.5 bg-orange-primary text-black-primary text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-orange-primary/20 flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-black-primary/30 border-t-black-primary rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
