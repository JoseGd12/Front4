import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RotateCcw,
  Loader2,
  ReceiptText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  GastoExterno,
  ResumenDia,
  gastosExternosService,
} from '../../../shared/services/gastosExternosService';
import GastoExternoModal from './GastoExternoModal';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const todayISO = () => new Date().toISOString().slice(0, 10);

const CATEGORIA_COLORS: Record<string, string> = {
  Servicios: '#6ea8fe',
  Suministros: '#a78bfa',
  Mantenimiento: '#fb923c',
  Utilities: '#34d399',
  Alquiler: '#f472b6',
  Personal: '#fbbf24',
  Otros: '#94a3b8',
};

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  /** Optional date override for the resumen (defaults to today) */
  fecha?: string;
}

export default function GastosExternos({ fecha }: Props) {
  const targetDate = fecha ?? todayISO();

  const [resumen, setResumen] = useState<ResumenDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoExterno | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Collapsible
  const [tableOpen, setTableOpen] = useState(true);

  // ── Data loading ──────────────────────────────────────────────────────

  const loadResumen = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await gastosExternosService.getResumenDia(targetDate);
      setResumen(data);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar el resumen del día.');
    } finally {
      setLoading(false);
    }
  }, [targetDate]);

  useEffect(() => {
    loadResumen();
  }, [loadResumen]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingGasto(null);
    setModalOpen(true);
  };

  const openEdit = (g: GastoExterno) => {
    setEditingGasto(g);
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await gastosExternosService.delete(id);
      await loadResumen();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo eliminar el gasto.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    loadResumen();
  };

  // ── Computed ──────────────────────────────────────────────────────────

  const isProfit = (resumen?.gananciaNeta ?? 0) >= 0;

  // ── Skeleton ──────────────────────────────────────────────────────────

  if (loading && !resumen) {
    return (
      <div className="rounded-2xl bg-gray-darkest border border-gray-dark p-6 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-gray-dark rounded-lg" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-dark" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-gray-dark" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-gray-dark overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #171717 0%, #111111 100%)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
        }}
      >
        {/* ── Section header ────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-dark flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-orange-primary/30 bg-orange-primary/10">
              <ReceiptText className="w-5 h-5 text-orange-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white-primary leading-tight">Gastos Externos</h3>
              <p className="text-xs text-gray-lightest mt-0.5">
                Registro de egresos del día • {new Date(targetDate + 'T12:00:00').toLocaleDateString('es-CO', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadResumen}
              disabled={loading}
              className="w-8 h-8 rounded-lg border border-gray-dark text-gray-lightest hover:text-white-primary hover:bg-white/5 flex items-center justify-center transition-colors"
              title="Actualizar"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={openCreate}
              className="elegante-button-primary flex items-center gap-2 text-sm py-2 px-4"
            >
              <Plus className="w-4 h-4" />
              Nuevo Gasto
            </button>
          </div>
        </div>

        {/* ── Error message ─────────────────────────────────────────────── */}
        {error && (
          <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-900/20 px-4 py-3 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
          {/* Ingresos Totales */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: 'rgba(52, 211, 153, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-lightest uppercase tracking-wider">Ingresos del día</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {resumen ? formatMoney(resumen.ingresosTotal) : '—'}
            </p>
            {resumen && (
              <p className="text-xs text-gray-lightest mt-1">
                Servicios: {formatMoney(resumen.ingresosAgendamientos)} · Ventas: {formatMoney(resumen.ingresosVentas)}
              </p>
            )}
          </div>

          {/* Gastos Externos */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: 'rgba(251, 146, 60, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-lightest uppercase tracking-wider">Gastos externos</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.15)' }}>
                <TrendingDown className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-400">
              {resumen ? formatMoney(resumen.gastosExternos) : '—'}
            </p>
            {resumen && (
              <p className="text-xs text-gray-lightest mt-1">
                {resumen.cantidadGastos} registro{resumen.cantidadGastos !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Ganancia Neta */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: isProfit ? 'rgba(96, 165, 250, 0.06)' : 'rgba(239, 68, 68, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-lightest uppercase tracking-wider">Ganancia neta</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isProfit ? 'rgba(96,165,250,0.15)' : 'rgba(239,68,68,0.15)' }}
              >
                <DollarSign className={`w-4 h-4 ${isProfit ? 'text-blue-400' : 'text-red-400'}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${isProfit ? 'text-blue-400' : 'text-red-400'}`}>
              {resumen ? formatMoney(resumen.gananciaNeta) : '—'}
            </p>
            <p className="text-xs text-gray-lightest mt-1">
              {isProfit ? 'Resultado positivo 🎉' : 'Gastos superan ingresos'}
            </p>
          </div>
        </div>

        {/* ── Expenses Table ────────────────────────────────────────────── */}
        <div className="px-6 pb-6">
          {/* Table header toggle */}
          <button
            onClick={() => setTableOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-dark bg-gray-darker/40 hover:bg-gray-darker transition-colors mb-3"
          >
            <span className="text-sm font-semibold text-white-primary">
              Gastos del día ({resumen?.gastos?.length ?? 0})
            </span>
            {tableOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-lightest" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-lightest" />
            )}
          </button>

          {tableOpen && (
            resumen?.gastos && resumen.gastos.length > 0 ? (
              <div className="rounded-xl border border-gray-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-dark bg-gray-darker/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider">Descripción</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider">Monto</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider hidden md:table-cell">Registrado por</th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.gastos.map((g, idx) => (
                      <tr
                        key={g.id}
                        className={`border-b border-gray-dark/40 hover:bg-white/[0.02] transition-colors ${
                          idx === resumen.gastos.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white-primary">{g.descripcion}</p>
                          {g.notas && (
                            <p className="text-xs text-gray-lightest mt-0.5 truncate max-w-[200px]">{g.notas}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              background: `${CATEGORIA_COLORS[g.categoria] ?? '#94a3b8'}20`,
                              color: CATEGORIA_COLORS[g.categoria] ?? '#94a3b8',
                              border: `1px solid ${CATEGORIA_COLORS[g.categoria] ?? '#94a3b8'}40`,
                            }}
                          >
                            {g.categoria}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-orange-400">
                          {formatMoney(g.monto)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-lightest hidden md:table-cell">
                          {g.usuarioNombre}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(g)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-lightest hover:text-white-primary hover:bg-white/10 transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(g.id)}
                              disabled={deletingId === g.id}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-lightest hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                              title="Eliminar"
                            >
                              {deletingId === g.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-dark py-10 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border border-gray-dark bg-gray-darker flex items-center justify-center">
                  <ReceiptText className="w-6 h-6 text-gray-medium" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white-primary">Sin gastos registrados</p>
                  <p className="text-xs text-gray-lightest mt-0.5">No hay gastos externos para este día.</p>
                </div>
                <button
                  onClick={openCreate}
                  className="elegante-button-primary flex items-center gap-2 text-sm py-2 px-4 mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Registrar primer gasto
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Modal */}
      <GastoExternoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        gasto={editingGasto}
        defaultDate={targetDate}
      />
    </>
  );
}
