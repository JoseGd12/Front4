import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import {
  GastoExterno,
  ResumenDia,
  ResumenRango,
  gastosExternosService,
} from '../../../shared/services/gastosExternosService';
import { DatePicker } from '../../../shared/components/ui/DatePicker';
import { Label } from '../../../shared/components/ui/label';
import GastoExternoModal from './GastoExternoModal';

// ── Helpers ────────────────────────────────────────────────────────────────

const formatMoney = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const todayISO = () => {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
};

const formatDateYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDateLabel = (iso: string) => {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

const CATEGORIA_COLORS: Record<string, string> = {
  Servicios: '#6ea8fe',
  Suministros: '#a78bfa',
  Mantenimiento: '#fb923c',
  Utilities: '#34d399',
  Alquiler: '#f472b6',
  Personal: '#fbbf24',
  Otros: '#94a3b8',
};

type Periodo = 'dia' | 'semana' | 'mes' | 'personalizado';

// ── Component ──────────────────────────────────────────────────────────────

export default function GastosExternos() {
  const [periodo, setPeriodo] = useState<Periodo>('dia');

  // Custom date range
  const todayStr = todayISO();
  const [customDesde, setCustomDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return formatDateYMD(d);
  });
  const [customHasta, setCustomHasta] = useState(() => todayISO());

  // Data
  const [resumen, setResumen] = useState<ResumenDia | null>(null);
  const [resumenRango, setResumenRango] = useState<ResumenRango | null>(null);
  const [rangeGastos, setRangeGastos] = useState<GastoExterno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<GastoExterno | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Collapsible
  const [tableOpen, setTableOpen] = useState(true);

  // Pagination
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(0);

  // ── Date range computation ────────────────────────────────────────────
  const { from, to } = useMemo(() => {
    const now = new Date(Date.now() - 5 * 60 * 60 * 1000);
    if (periodo === 'dia') {
      const d = formatDateYMD(now);
      return { from: d, to: d };
    }
    if (periodo === 'semana') {
      const day = now.getDay();
      const diff = day === 0 ? 6 : day - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      return { from: formatDateYMD(monday), to: formatDateYMD(now) };
    }
    if (periodo === 'mes') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDateYMD(first), to: formatDateYMD(now) };
    }
    return { from: customDesde, to: customHasta };
  }, [periodo, customDesde, customHasta]);

  const isDayMode = periodo === 'dia';

  const rangoLabel = useMemo(() => {
    if (periodo === 'dia') return 'hoy';
    if (periodo === 'semana') return 'esta semana';
    if (periodo === 'mes') return 'este mes';
    return `${formatDateLabel(from)} - ${formatDateLabel(to)}`;
  }, [periodo, from, to]);

  // ── Data loading ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isDayMode) {
        const data = await gastosExternosService.getResumenDia(from);
        setResumen(data);
        setResumenRango(null);
        setRangeGastos([]);
      } else {
        const data = await gastosExternosService.getResumenRango(from, to);
        setResumenRango(data);
        setRangeGastos(data.gastos);
        setResumen(null);
      }
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, [isDayMode, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Computed values ───────────────────────────────────────────────────

  useEffect(() => { setPage(0); }, [periodo, from, to]);

  const gastos = resumen?.gastos ?? rangeGastos;
  const totalGastos = isDayMode
    ? (resumen?.gastosExternos ?? 0)
    : rangeGastos.reduce((s, g) => s + g.monto, 0);

  const isProfit = isDayMode
    ? (resumen?.gananciaNeta ?? 0) >= 0
    : (resumenRango?.gananciaNeta ?? 0) >= 0;

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
      await loadData();
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo eliminar el gasto.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    loadData();
  };

  // ── Skeleton ──────────────────────────────────────────────────────────

  if (loading && !resumen && rangeGastos.length === 0) {
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
        <div className="px-4 sm:px-6 py-5 border-b border-gray-dark">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-orange-primary/30 bg-orange-primary/10 shrink-0">
                <ReceiptText className="w-5 h-5 text-orange-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white-primary leading-tight">Gastos Externos</h3>
                <p className="text-xs text-gray-lightest mt-0.5 truncate">
                  Registro de egresos • {rangoLabel}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="w-8 h-8 rounded-lg border border-gray-dark text-gray-lightest hover:text-white-primary hover:bg-white/5 flex items-center justify-center transition-colors shrink-0"
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
                className="elegante-button-primary flex items-center gap-2 text-sm py-2 px-3 sm:px-4 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nuevo Gasto</span>
                <span className="sm:hidden">Nuevo</span>
              </button>
            </div>
          </div>

          {/* ── Period filter ────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <div className="flex items-center rounded-full border border-gray-dark overflow-hidden">
              {(['dia', 'semana', 'mes'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    periodo === p
                      ? 'bg-orange-primary text-black-primary'
                      : 'text-gray-lightest hover:bg-white/5'
                  }`}
                >
                  {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPeriodo(periodo === 'personalizado' ? 'dia' : 'personalizado')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                periodo === 'personalizado'
                  ? 'border-orange-primary bg-orange-primary/10 text-orange-primary'
                  : 'border-gray-dark text-gray-lightest hover:bg-white/5'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Fechas
            </button>
          </div>

          {/* ── Custom date pickers ──────────────────────────────────────── */}
          {periodo === 'personalizado' && (
            <div className="flex items-end gap-3 mt-3 flex-wrap">
              <div className="space-y-1">
                <Label className="text-gray-lightest text-xs">Desde</Label>
                <DatePicker
                  value={customDesde}
                  max={customHasta}
                  onChange={(v) => {
                    const c = v > todayStr ? todayStr : v;
                    setCustomDesde(c);
                    if (customHasta < c) setCustomHasta(c);
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-gray-lightest text-xs">Hasta</Label>
                <DatePicker
                  value={customHasta}
                  max={todayStr}
                  onChange={(v) => {
                    const c = v > todayStr ? todayStr : v;
                    setCustomHasta(c);
                    if (c < customDesde) setCustomDesde(c);
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Error message ─────────────────────────────────────────────── */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-start gap-2 rounded-lg border border-red-600/40 bg-red-900/20 px-4 py-3 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid gap-4 p-4 sm:p-6 grid-cols-1 sm:grid-cols-3">
          {/* Ingresos Totales */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: 'rgba(52, 211, 153, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-lightest uppercase tracking-wider">
                Ingresos {isDayMode ? 'del día' : rangoLabel}
              </span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-emerald-400 truncate">
              {formatMoney(isDayMode ? (resumen?.ingresosTotal ?? 0) : (resumenRango?.ingresosTotal ?? 0))}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-lightest mt-1 truncate">
              Servicios: {formatMoney(isDayMode ? (resumen?.ingresosAgendamientos ?? 0) : (resumenRango?.ingresosAgendamientos ?? 0))} · Ventas: {formatMoney(isDayMode ? (resumen?.ingresosVentas ?? 0) : (resumenRango?.ingresosVentas ?? 0))}
            </p>
          </div>

          {/* Gastos Externos */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: 'rgba(251, 146, 60, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-lightest uppercase tracking-wider">Gastos externos</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(251,146,60,0.15)' }}>
                <TrendingDown className="w-4 h-4 text-orange-400" />
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-orange-400 truncate">
              {formatMoney(isDayMode ? (resumen?.gastosExternos ?? 0) : (resumenRango?.gastosExternos ?? 0))}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-lightest mt-1">
              {(isDayMode ? (resumen?.cantidadGastos ?? 0) : (resumenRango?.cantidadGastos ?? 0))} registro{(isDayMode ? (resumen?.cantidadGastos ?? 0) : (resumenRango?.cantidadGastos ?? 0)) !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Ganancia Neta */}
          <div className="rounded-xl p-4 border border-gray-dark/60"
            style={{ background: isProfit ? 'rgba(96, 165, 250, 0.06)' : 'rgba(239, 68, 68, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] sm:text-xs font-semibold text-gray-lightest uppercase tracking-wider">Ganancia neta</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: isProfit ? 'rgba(96,165,250,0.15)' : 'rgba(239,68,68,0.15)' }}
              >
                <DollarSign className={`w-4 h-4 ${isProfit ? 'text-blue-400' : 'text-red-400'}`} />
              </div>
            </div>
            <p className={`text-xl sm:text-2xl font-bold truncate ${isProfit ? 'text-blue-400' : 'text-red-400'}`}>
              {formatMoney(isDayMode ? (resumen?.gananciaNeta ?? 0) : (resumenRango?.gananciaNeta ?? 0))}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-lightest mt-1">
              {isProfit ? 'Resultado positivo' : 'Gastos superan ingresos'}
            </p>
          </div>
        </div>

        {/* ── Expenses Table ────────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 pb-6">
          {/* Table header toggle */}
          <button
            onClick={() => setTableOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-dark bg-gray-darker/40 hover:bg-gray-darker transition-colors mb-3"
          >
            <span className="text-sm font-semibold text-white-primary">
              Gastos {isDayMode ? 'del día' : `(${rangoLabel})`} ({gastos.length})
            </span>
            {tableOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-lightest" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-lightest" />
            )}
          </button>

          {tableOpen && (() => {
            const totalPages = Math.max(1, Math.ceil(gastos.length / PAGE_SIZE));
            const safePage = Math.min(page, totalPages - 1);
            const pagedGastos = gastos.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

            return gastos.length > 0 ? (
              <>
              <div className="rounded-xl border border-gray-dark overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-dark bg-gray-darker/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider">Descripción</th>
                      {!isDayMode && (
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                      )}
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider">Monto</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-lightest uppercase tracking-wider hidden md:table-cell">Registrado por</th>
                      <th className="px-4 py-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedGastos.map((g, idx) => (
                      <tr
                        key={g.id}
                        className={`border-b border-gray-dark/40 hover:bg-white/[0.02] transition-colors ${
                          idx === pagedGastos.length - 1 ? 'border-b-0' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-white-primary">{g.descripcion}</p>
                          {g.notas && (
                            <p className="text-xs text-gray-lightest mt-0.5 truncate max-w-[200px]">{g.notas}</p>
                          )}
                        </td>
                        {!isDayMode && (
                          <td className="px-4 py-3 text-xs text-gray-lightest hidden lg:table-cell">
                            {formatDateLabel(g.fecha)}
                          </td>
                        )}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 px-1">
                  <p className="text-xs text-gray-lightest">
                    {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, gastos.length)} de {gastos.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="w-8 h-8 rounded-lg border border-gray-dark flex items-center justify-center text-gray-lightest hover:text-white-primary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setPage(i)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          safePage === i
                            ? 'bg-orange-primary text-black-primary'
                            : 'border border-gray-dark text-gray-lightest hover:bg-white/5'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage === totalPages - 1}
                      className="w-8 h-8 rounded-lg border border-gray-dark flex items-center justify-center text-gray-lightest hover:text-white-primary hover:bg-white/5 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-dark py-10 flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-full border border-gray-dark bg-gray-darker flex items-center justify-center">
                  <ReceiptText className="w-6 h-6 text-gray-medium" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white-primary">Sin gastos registrados</p>
                  <p className="text-xs text-gray-lightest mt-0.5">
                    No hay gastos externos {isDayMode ? 'para este día' : `en este periodo`}.
                  </p>
                </div>
                <button
                  onClick={openCreate}
                  className="elegante-button-primary flex items-center gap-2 text-sm py-2 px-4 mt-1"
                >
                  <Plus className="w-4 h-4" />
                  Registrar primer gasto
                </button>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Modal */}
      <GastoExternoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        gasto={editingGasto}
        defaultDate={todayStr}
      />
    </>
  );
}
