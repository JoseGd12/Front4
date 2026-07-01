import { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import {
  CATEGORIAS_GASTO,
  GastoExterno,
  GastoExternoInput,
  gastosExternosService,
} from '../../../shared/services/gastosExternosService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { apiService } from '../../../shared/services/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When provided, the modal is in edit mode */
  gasto?: GastoExterno | null;
  /** Pre-filled date in ISO format (yyyy-MM-dd) */
  defaultDate?: string;
}

const todayISO = () => {
  // Colombia = UTC-5: always subtract 5h from UTC, independent of browser timezone
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

export default function GastoExternoModal({ isOpen, onClose, onSaved, gasto, defaultDate }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<GastoExternoInput>({
    descripcion: '',
    monto: 0,
    categoria: 'Servicios',
    fecha: defaultDate ?? todayISO(),
    notas: '',
    usuarioId: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [montoDisplay, setMontoDisplay] = useState('');

  const formatMontoDisplay = (n: number) =>
    n > 0 ? n.toLocaleString('es-CO') : '';

  // Populate form when editing
  useEffect(() => {
    if (gasto) {
      setForm({
        descripcion: gasto.descripcion,
        monto: gasto.monto,
        categoria: gasto.categoria,
        fecha: gasto.fecha,
        notas: gasto.notas ?? '',
        usuarioId: gasto.usuarioId,
      });
      setMontoDisplay(formatMontoDisplay(gasto.monto));
    } else {
      setForm({
        descripcion: '',
        monto: 0,
        categoria: 'Servicios',
        fecha: defaultDate ?? todayISO(),
        notas: '',
        usuarioId: 0,
      });
      setMontoDisplay('');
    }
    setError('');
  }, [gasto, isOpen, defaultDate]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMontoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '');
    if (raw === '') {
      setMontoDisplay('');
      setForm((prev) => ({ ...prev, monto: 0 }));
      return;
    }
    const num = parseInt(raw, 10);
    setMontoDisplay(num.toLocaleString('es-CO'));
    setForm((prev) => ({ ...prev, monto: num }));
  };

  const validate = (): string => {
    if (!form.descripcion.trim()) return 'La descripción es requerida.';
    if (form.monto <= 0) return 'El monto debe ser mayor a cero.';
    if (form.monto > 999_999.99) return 'El monto no puede superar 999,999.99.';
    if (!form.categoria) return 'La categoría es requerida.';
    if (!form.fecha) return 'La fecha es requerida.';
    if (form.fecha > todayISO()) return 'La fecha no puede ser futura.';
    return '';
  };

  const resolveUsuarioId = async (): Promise<number> => {
    if (!user) return 0;
    const numericId = Number(user.id);
    if (Number.isFinite(numericId) && numericId > 0) return numericId;
    try {
      const all = await apiService.getUsuarios();
      const matched = (all || []).find(
        (u) => String(u.correo || "").toLowerCase() === String(user.email || "").toLowerCase()
      );
      if (matched?.id && Number.isFinite(Number(matched.id))) return Number(matched.id);
    } catch {}
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError('');
    try {
      const usuarioIdNum = await resolveUsuarioId();
      if (!Number.isFinite(usuarioIdNum) || usuarioIdNum <= 0) {
        setError("Tu sesión está activa pero no se pudo vincular tu cuenta con el sistema. Cierra sesión y vuelve a ingresar.");
        return;
      }

      const dataToSend: GastoExternoInput = {
        ...form,
        usuarioId: usuarioIdNum
      };

      if (gasto) {
        await gastosExternosService.update(gasto.id, dataToSend);
      } else {
        await gastosExternosService.create(dataToSend);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Ocurrió un error al guardar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const isEdit = !!gasto;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdrop}
      style={{ animationDuration: '150ms' }}
    >
      <div
        className="relative w-full max-w-md mx-4 rounded-2xl border border-gray-dark bg-gray-darkest shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #1a1a1a 0%, #141414 100%)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-dark">
          <div>
            <h2 className="text-lg font-bold text-white-primary">
              {isEdit ? 'Editar Gasto' : 'Nuevo Gasto Externo'}
            </h2>
            <p className="text-xs text-gray-lightest mt-0.5">
              {isEdit ? 'Modifica los datos del gasto.' : 'Registra un gasto externo del día.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-lightest hover:text-white-primary hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-gray-lightest uppercase tracking-wider mb-1.5">
              Descripción <span className="text-orange-primary">*</span>
            </label>
            <input
              ref={firstInputRef}
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              maxLength={500}
              placeholder="Ej: Pago de servicios de agua"
              className="w-full px-3 py-2.5 rounded-lg bg-gray-darker border border-gray-dark text-white-primary placeholder:text-gray-medium text-sm focus:outline-none focus:border-orange-primary/60 transition-colors"
            />
          </div>

          {/* Monto + Categoría row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-lightest uppercase tracking-wider mb-1.5">
                Monto ($) <span className="text-orange-primary">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-primary text-sm font-bold pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoDisplay}
                  onChange={handleMontoChange}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg bg-gray-darker border border-gray-dark text-white-primary placeholder:text-gray-medium text-sm focus:outline-none focus:border-orange-primary/60 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-lightest uppercase tracking-wider mb-1.5">
                Categoría <span className="text-orange-primary">*</span>
              </label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-gray-darker border border-gray-dark text-white-primary text-sm focus:outline-none focus:border-orange-primary/60 transition-colors appearance-none"
              >
                {CATEGORIAS_GASTO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-semibold text-gray-lightest uppercase tracking-wider mb-1.5">
              Fecha <span className="text-orange-primary">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              value={form.fecha}
              max={todayISO()}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-darker border border-gray-dark text-white-primary text-sm focus:outline-none focus:border-orange-primary/60 transition-colors"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-lightest uppercase tracking-wider mb-1.5">
              Notas <span className="text-gray-medium font-normal">(opcional)</span>
            </label>
            <textarea
              name="notas"
              value={form.notas ?? ''}
              onChange={handleChange}
              rows={2}
              maxLength={1000}
              placeholder="Información adicional sobre el gasto..."
              className="w-full px-3 py-2.5 rounded-lg bg-gray-darker border border-gray-dark text-white-primary placeholder:text-gray-medium text-sm focus:outline-none focus:border-orange-primary/60 transition-colors resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-900/20 px-3 py-2.5 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg border border-gray-dark text-gray-lightest hover:text-white-primary hover:bg-white/5 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 elegante-button-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
                'Guardar cambios'
              ) : (
                'Registrar Gasto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
