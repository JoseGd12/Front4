import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
  User as UserIcon,
  ChevronDown,
  Wallet,
  Hash,
  Receipt,
  FileText,
  RefreshCw,
  CalendarClock,
  TrendingUp,
} from "lucide-react";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  .cred-root { min-height:100vh; background:var(--black-primary); color:var(--white-primary); padding:0; overflow-x:hidden; }
  .cred-card { background:var(--gray-darkest); border:1px solid var(--gray-darker); border-radius:14px; overflow:hidden; }

  /* Toolbar */
  .cred-search-wrap { position:relative; flex:1; min-width:180px; max-width:360px; }
  .cred-count { margin-left:auto; font-size:13px; color:var(--gray-lightest); white-space:nowrap; }

  /* Main table */
  .cred-table { width:100%; border-collapse:collapse; table-layout:fixed; }
  .cred-thead th {
    padding:13px 16px; font-size:11px; font-weight:700; color:var(--gray-lightest);
    text-align:center; letter-spacing:.06em; text-transform:uppercase;
    border-bottom:1px solid var(--gray-darker); white-space:nowrap; background:var(--gray-darkest);
  }
  .cred-thead th:first-child { text-align:left; padding-left:24px; }
  .cred-thead th:last-child { text-align:right; padding-right:24px; }

  /* Group row */
  .cred-group-row { background:var(--gray-darkest); border-bottom:1px solid var(--gray-darker); cursor:pointer; transition:background .15s; }
  .cred-group-row:hover { background:var(--gray-dark); }
  .cred-group-cell { padding:14px 16px; }
  .cred-group-cell:first-child { padding-left:24px; }
  .cred-group-cell:last-child { padding-right:24px; }
  .cred-group-inner { display:flex; align-items:center; gap:12px; }
  .cred-avatar {
    width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:12px; font-weight:700; color:var(--black-primary);
    flex-shrink:0; background:var(--orange-primary);
  }
  .cred-barber-name { font-size:14px; font-weight:400; color:var(--gray-lightest); line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .cred-barber-sub  { font-size:12px; color:var(--gray-dark); margin-top:1px; }

  /* Accent button (expand) */
  .cred-expand-btn {
    background:rgba(216,176,129,0.08); border:1px solid rgba(216,176,129,0.2); border-radius:7px;
    padding:6px 13px; color:var(--gray-lightest); cursor:pointer; font-size:12px; font-weight:500;
    display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-family:inherit;
    transition:background .15s, border-color .15s, color .15s;
  }
  .cred-expand-btn:hover { background:rgba(216,176,129,0.15); border-color:var(--orange-primary); color:var(--orange-primary); }

  /* Accent action button (toolbar / accordion) */
  .cred-action-btn {
    background:rgba(216,176,129,0.08); border:1px solid rgba(216,176,129,0.2); border-radius:8px;
    padding:7px 14px; color:var(--orange-primary); cursor:pointer; font-size:12px; font-weight:600;
    display:inline-flex; align-items:center; gap:7px; white-space:nowrap; font-family:inherit;
    transition:background .15s, border-color .15s;
  }
  .cred-action-btn:hover { background:rgba(216,176,129,0.15); border-color:var(--orange-primary); }
  .cred-action-btn:disabled { opacity:.4; cursor:not-allowed; }

  /* Blue-tinted action (extender plazo) */
  .cred-action-btn-ext {
    background:rgba(122,171,138,0.08); border:1px solid rgba(122,171,138,0.25); border-radius:8px;
    padding:7px 14px; color:var(--status-green); cursor:pointer; font-size:12px; font-weight:600;
    display:inline-flex; align-items:center; gap:7px; white-space:nowrap; font-family:inherit;
    transition:background .15s, border-color .15s;
  }
  .cred-action-btn-ext:hover { background:rgba(122,171,138,0.15); border-color:var(--status-green); }
  .cred-action-btn-ext:disabled { opacity:.4; cursor:not-allowed; }

  /* General td */
  .cred-td { padding:12px 16px; font-size:13px; color:var(--gray-lightest); text-align:center; vertical-align:middle; }
  .cred-td:last-child { padding-right:24px; }
  .cred-num { display:inline-flex; align-items:center; gap:4px; font-weight:600; color:var(--orange-primary); }

  /* Badges */
  .badge { display:inline-block; padding:3px 11px; border-radius:999px; font-size:11px; font-weight:600; white-space:nowrap; }
  .badge-activo          { background:#f0d9b5; color:#7a4f1e; border:1px solid #d4b483; }
  .badge-pagado          { background:#c8e6c9; color:#2e7d32; border:1px solid #a5d6a7; }
  .badge-bloqueado       { background:#7a5230; color:#f0d9b5; border:1px solid #5c3a1e; }
  .badge-bloqueado-rojo  { background:#5c2020; color:#f5c6c6; border:1px solid #8b2020; }
  .badge-anulada         { background:#7a5230; color:#f0d9b5; border:1px solid #5c3a1e; }

  /* Icon buttons */
  .cred-icon-btn {
    background:none; border:none; cursor:pointer; color:var(--gray-lightest); padding:6px;
    border-radius:7px; display:inline-flex; align-items:center; transition:background .12s, color .12s;
  }
  .cred-icon-btn:hover        { background:var(--gray-darker); }
  .cred-icon-btn:disabled     { opacity:.35; cursor:not-allowed; }

  /* Expanded accordion cell */
  .cred-exp-cell { padding:0; background:var(--black-secondary); }
  .cred-exp-cell:has(.cred-accordion-wrap.open) {
    border-bottom:2px solid rgba(216,176,129,0.18);
    border-left:3px solid var(--orange-primary);
  }
  .cred-accordion-wrap { display:grid; grid-template-rows:0fr; transition:grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1); overflow:hidden; }
  .cred-accordion-wrap.open { grid-template-rows:1fr; }
  .cred-accordion-inner { overflow:hidden; }
  .chev-custom { display:inline-flex; transition:transform .2s; }
  .chev-custom.open { transform:rotate(180deg); }

  /* Stats bar */
  .cred-stats-bar {
    display:flex; flex-wrap:wrap; gap:20px 36px; align-items:center;
    padding:14px 20px; border-bottom:1px solid var(--gray-darker); background:rgba(26,25,25,0.5);
  }
  .cred-stat-item  { display:flex; flex-direction:column; gap:3px; }
  .cred-stat-label { font-size:10px; text-transform:uppercase; letter-spacing:.06em; font-weight:700; color:var(--gray-dark); }
  .cred-stat-val   { font-size:13px; font-weight:600; color:var(--white-primary); }

  /* Tab pills */
  .cred-tabs {
    display:flex; gap:6px; padding:10px 20px; align-items:center;
    border-bottom:1px solid var(--gray-darker); background:rgba(17,17,17,0.4);
  }
  .cred-tab {
    padding:4px 14px; border-radius:999px; font-size:12px; font-weight:500;
    cursor:pointer; border:1px solid var(--gray-darker); background:none;
    color:var(--gray-lightest); font-family:inherit; transition:all .15s;
    display:inline-flex; align-items:center; gap:5px;
  }
  .cred-tab:hover  { border-color:var(--orange-primary); color:var(--orange-primary); }
  .cred-tab.active {
    background:rgba(216,176,129,0.11); border-color:var(--orange-primary);
    color:var(--orange-primary); font-weight:600;
  }

  /* Sub-label (same pattern as dev-sub-label in DevolucionesPage) */
  .cred-sub-label {
    padding:10px 20px 8px 20px; font-size:12px; color:var(--gray-lightest);
    border-bottom:1px solid var(--gray-darker); letter-spacing:.02em;
  }

  /* Sub-table header */
  .cred-sub-header th {
    padding:9px 16px; font-size:10px; font-weight:700; color:var(--gray-dark);
    text-align:center; text-transform:uppercase; letter-spacing:.06em;
    background:rgba(17,17,17,0.5); border-bottom:1px solid var(--gray-darker); white-space:nowrap;
  }
  .cred-sub-header th:first-child { text-align:left; padding-left:36px; }
  .cred-item-row { border-bottom:1px solid rgba(42,42,42,0.8); background:var(--black-secondary); transition:background .12s; }
  .cred-item-row:hover { background:var(--gray-darkest); }
  .cred-sub-td { padding:11px 16px; font-size:13px; color:var(--gray-lightest); text-align:center; vertical-align:middle; }

  /* Inline abono rows */
  .cred-abono-row {
    display:flex; align-items:center; gap:12px; padding:10px 20px;
    border-bottom:1px solid var(--gray-darker); transition:background .12s;
  }
  .cred-abono-row:hover { background:rgba(255,255,255,0.015); }

  /* Actions bar */
  .cred-actions-bar {
    display:flex; justify-content:flex-end; gap:10px; padding:12px 20px;
    border-top:1px solid var(--gray-darker); background:rgba(26,25,25,0.4); flex-wrap:wrap;
  }

  /* Progress bar */
  .cred-progress-wrap  { display:flex; align-items:center; gap:8px; min-width:120px; }
  .cred-progress-track { flex:1; height:5px; border-radius:99px; overflow:hidden; background:var(--gray-dark); }
  .cred-progress-fill  { height:100%; border-radius:99px; transition:width .3s; }

  /* Modal barbero selector */
  .cred-selector-list { max-height:280px; overflow-y:auto; display:flex; flex-direction:column; gap:3px; }
  .cred-selector-item {
    display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px;
    cursor:pointer; border:1px solid transparent; transition:background .12s, border-color .12s;
  }
  .cred-selector-item:hover   { background:rgba(216,176,129,0.06); border-color:var(--gray-darker); }
  .cred-selector-item.selected { background:rgba(216,176,129,0.1); border-color:var(--orange-primary); }

  /* Vencimiento warning chip */
  .cred-venc-chip {
    display:inline-flex; align-items:center; gap:5px; font-size:11px;
    padding:2px 8px; border-radius:999px; font-weight:600;
  }
  .cred-venc-chip.ok      { background:rgba(122,171,138,0.12); color:var(--status-green); border:1px solid rgba(122,171,138,0.3); }
  .cred-venc-chip.warn    { background:rgba(216,176,129,0.12); color:var(--orange-primary); border:1px solid rgba(216,176,129,0.3); }
  .cred-venc-chip.expired { background:rgba(176,112,112,0.12); color:var(--status-red); border:1px solid rgba(176,112,112,0.3); }

  /* Tooltip para icon-only actions */
  .cred-icon-action {
    position: relative;
  }
  .cred-icon-action[data-tip]::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 7px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--gray-darkest);
    color: var(--white-primary);
    font-size: 11px;
    font-weight: 500;
    padding: 4px 9px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity .15s;
    border: 1px solid var(--gray-dark);
    z-index: 20;
  }
  .cred-icon-action[data-tip]:hover::after { opacity: 1; }

  /* Boton subir limite */
  .cred-action-btn-warn {
    background:rgba(216,176,129,0.08); border:1px solid rgba(216,176,129,0.25); border-radius:8px;
    padding:7px 14px; color:var(--orange-primary); cursor:pointer; font-size:12px; font-weight:600;
    display:inline-flex; align-items:center; gap:7px; white-space:nowrap; font-family:inherit;
    transition:background .15s, border-color .15s;
  }
  .cred-action-btn-warn:hover { background:rgba(216,176,129,0.15); border-color:var(--orange-primary); }
  .cred-action-btn-warn:disabled { opacity:.4; cursor:not-allowed; }
`;

import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../../../shared/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../../shared/components/ui/select";
import { Label }  from "../../../shared/components/ui/label";
import { Input }  from "../../../shared/components/ui/input";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useAuth } from "../../../shared/contexts/AuthContext";
import ImageRenderer from "../../../shared/components/ui/ImageRenderer";
import { barberosService, type Barbero } from "../../administracion/services/barberosService";
import { ventaService } from "../../ventas/services/ventaService";
import {
  creditoBarberoService,
  CreditoBarberoDto,
  AbonoCreditoBarberoDto,
} from "../services/creditoBarberoService";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (v: number) => `$${(v ?? 0).toLocaleString("es-CO")}`;

const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDateTime = (s: string | null | undefined) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Dias restantes hasta vencimiento (puede ser negativo si ya venció) */
const diasHastaVencimiento = (fechaVenc: string): number => {
  if (!fechaVenc) return 0;
  const ahora = Date.now();
  const venc  = new Date(fechaVenc).getTime();
  return Math.ceil((venc - ahora) / (1000 * 60 * 60 * 24));
};

/** Prioridad de orden: bloqueados primero, luego activo, luego pagado */
const estadoPrioridad = (e: string): number => {
  const l = e.toLowerCase();
  if (l.startsWith("bloqueado")) return 0;
  if (l === "activo")            return 1;
  if (l === "pagado")            return 2;
  return 3;
};

const esBloqueado = (e: string) => e.toLowerCase().startsWith("bloqueado");
const esPagado    = (e: string) => e.toLowerCase() === "pagado";

// ─── Sub-components ───────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const l = (estado || "").toLowerCase();

  if (l === "activo" || l === "completado" || l === "completada")
    return <span className="badge badge-activo">{estado}</span>;

  if (l === "pagado")
    return <span className="badge badge-pagado">Pagado</span>;

  if (l === "bloqueadolimiteyVencimiento" || l === "bloqueadolimitoyvencimiento")
    return <span className="badge badge-bloqueado-rojo">Bloqueado (limite + vencido)</span>;

  if (l === "bloqueadovencimiento")
    return <span className="badge badge-bloqueado-rojo">Bloqueado (vencido)</span>;

  if (l === "bloqueadolimite")
    return <span className="badge badge-bloqueado">Bloqueado (limite)</span>;

  if (l === "bloqueado" || l === "anulada" || l === "anulado")
    return <span className="badge badge-bloqueado">{estado}</span>;

  return <span className="badge" style={{ background: "var(--gray-medium)", color: "var(--gray-lightest)" }}>{estado}</span>;
}

function VencimientoChip({ fechaVenc, estado }: { fechaVenc: string; estado: string }) {
  if (esPagado(estado)) return null;
  const dias = diasHastaVencimiento(fechaVenc);
  if (dias > 3)  return <span className="cred-venc-chip ok">{dias}d restantes</span>;
  if (dias >= 0) return <span className="cred-venc-chip warn">{dias === 0 ? "Vence hoy" : `${dias}d restantes`}</span>;
  return <span className="cred-venc-chip expired">Vencido hace {Math.abs(dias)}d</span>;
}

function BarraProgreso({ saldo, cupo }: { saldo: number; cupo: number }) {
  const pct = cupo > 0 ? Math.min(100, (saldo / cupo) * 100) : 0;
  const color = pct >= 90 ? "var(--status-red)" : pct >= 60 ? "var(--orange-primary)" : "var(--status-green)";
  return (
    <div className="cred-progress-wrap">
      <div className="cred-progress-track">
        <div className="cred-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span style={{ fontSize: 11, color: "var(--gray-lightest)", minWidth: 34 }}>{Math.round(pct)}%</span>
    </div>
  );
}

function AvatarCell({ barbero }: { barbero?: Barbero }) {
  const hasFoto = barbero?.fotoPerfil && barbero.fotoPerfil.trim() && barbero.fotoPerfil !== "No especificada";
  return (
    <div className="cred-avatar" style={{ overflow: "hidden", background: hasFoto ? "transparent" : "var(--orange-primary)" }}>
      {hasFoto ? (
        <ImageRenderer url={barbero!.fotoPerfil!} className="w-full h-full object-cover" fallbackVariant="person" showLabel={false} />
      ) : (
        <UserIcon className="w-5 h-5" style={{ color: "var(--black-primary)" }} />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CreditoBarberosPage() {
  const { user } = useAuth();
  const { created, error: showErrorAlert, AlertContainer } = useCustomAlert();

  // ── Lista principal ──────────────────────────────────────────────────────────
  const [creditos, setCreditos]     = useState<CreditoBarberoDto[]>([]);
  const [loading, setLoading]       = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const PAGE_SIZE = 5;

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("sin-pagar");
  const [expandedId,  setExpandedId]  = useState<number | null>(null);
  const SUBTAB_PAGE_SIZE = 5;
  const [ventasPage, setVentasPage] = useState<Record<number, number>>({});
  const [abonosPage, setAbonosPage] = useState<Record<number, number>>({});

  const [barberosMap, setBarberosMap]       = useState<Record<number, Barbero>>({});
  const [ventasCreditoLazy, setVentasCreditoLazy] = useState<Record<number, any[]>>({});
  const [loadingVentasLazy, setLoadingVentasLazy] = useState<Record<number, boolean>>({});
  const [abonosStats, setAbonosStats]       = useState<Record<number, string>>({});

  // ── Tab por barbero ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Record<number, "ventas" | "abonos" | "stats">>({});
  const [inlineAbonos, setInlineAbonos]                     = useState<Record<number, AbonoCreditoBarberoDto[]>>({});
  const [loadingInlineAbonos, setLoadingInlineAbonos]       = useState<Record<number, boolean>>({});
  const [showHistorial, setShowHistorial] = useState<Record<number, boolean>>({});

  // ── Modal: registrar abono ───────────────────────────────────────────────────
  const [registrarOpen,    setRegistrarOpen]    = useState(false);
  const [registrarStep,    setRegistrarStep]    = useState<"select" | "form">("select");
  const [barberoSearch,    setBarberoSearch]    = useState("");
  const [registrarCredito, setRegistrarCredito] = useState<CreditoBarberoDto | null>(null);
  const [selectedVentaAbono, setSelectedVentaAbono] = useState<any | null>(null);
  const [montoInput,       setMontoInput]       = useState("");
  const [metodoPago,       setMetodoPago]       = useState("Efectivo");
  const [notasInput,       setNotasInput]       = useState("");
  const [submitting,         setSubmitting]         = useState(false);
  const [showFormErrors,     setShowFormErrors]     = useState(false);
  const [montoShakeCount,    setMontoShakeCount]    = useState(0);
  const [abonoApiError,      setAbonoApiError]      = useState<string | null>(null);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);

  // ── Modal: detalle abono ─────────────────────────────────────────────────────
  const [detalleAbonoOpen,   setDetalleAbonoOpen]   = useState(false);
  const [detalleAbono,       setDetalleAbono]       = useState<AbonoCreditoBarberoDto | null>(null);

  // ── Modal: detalle venta ─────────────────────────────────────────────────────
  const [detalleVentaOpen,   setDetalleVentaOpen]   = useState(false);
  const [detalleVenta,       setDetalleVenta]       = useState<any | null>(null);

// ── Modal: extender plazo ────────────────────────────────────────────────────
  const [extenderOpen,    setExtenderOpen]    = useState(false);
  const [extenderCredito, setExtenderCredito] = useState<CreditoBarberoDto | null>(null);
  const [extendiendo,     setExtendiendo]     = useState(false);

  // ── Modal: subir limite de credito ──────────────────────────────────────────
  const [subirLimiteOpen,    setSubirLimiteOpen]    = useState(false);
  const [subirLimiteCredito, setSubirLimiteCredito] = useState<CreditoBarberoDto | null>(null);
  const [subiendoLimite,     setSubiendoLimite]     = useState(false);
  const [incrementoRaw,      setIncrementoRaw]      = useState('');

  // ── Carga principal ──────────────────────────────────────────────────────────
  const fetchCreditos = useCallback(async (page: number, q: string, estado: string) => {
    try {
      setLoading(true);
      const [res, barberos] = await Promise.all([
        creditoBarberoService.getAll(page, PAGE_SIZE, q, estado),
        barberosService.getBarberos().catch(() => []),
      ]);

      const bMap: Record<number, Barbero> = {};
      (barberos || []).forEach((b: any) => { if (b.id) bMap[b.id] = b; });
      setBarberosMap(bMap);

      // UltimoAbono y VentasCicloCount vienen calculados desde el backend
      const aStats: Record<number, string> = {};
      res.items.forEach((c: any) => { if (c.ultimoAbono) aStats[c.barberoId] = c.ultimoAbono; });
      setAbonosStats(aStats);

      // Limpiar caché de ventas lazy para que se recarguen al expandir
      setVentasCreditoLazy({});
      setLoadingVentasLazy({});

      setCreditos(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo cargar el listado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCreditos(1, searchTerm, statusFilter); }, [searchTerm, statusFilter, fetchCreditos]);

  // Cargar abonos y ventas lazy al expandir una fila
  useEffect(() => {
    if (expandedId === null) return;
    const cred = creditos.find(c => c.barberoId === expandedId);
    if (!cred) return;
    if (inlineAbonos[expandedId] === undefined && !loadingInlineAbonos[expandedId]) {
      loadInlineAbonos(expandedId);
    }
    loadVentasCredito(expandedId);
  }, [expandedId]);

  // El backend ya filtra por estado y búsqueda; solo se usa para el modal de barbero search
  const filteredAndOrdered = creditos;

  // ── Abonos inline ────────────────────────────────────────────────────────────
  const loadInlineAbonos = useCallback(async (barberoId: number) => {
    setLoadingInlineAbonos(prev => ({ ...prev, [barberoId]: true }));
    try {
      const r = await creditoBarberoService.getAllAbonosByBarbero(barberoId, 1, 100);
      setInlineAbonos(prev => ({ ...prev, [barberoId]: r.items }));
    } catch {
      setInlineAbonos(prev => ({ ...prev, [barberoId]: [] }));
    } finally {
      setLoadingInlineAbonos(prev => ({ ...prev, [barberoId]: false }));
    }
  }, []);

  const loadVentasCredito = useCallback(async (barberoId: number) => {
    if (ventasCreditoLazy[barberoId] !== undefined || loadingVentasLazy[barberoId]) return;
    setLoadingVentasLazy(prev => ({ ...prev, [barberoId]: true }));
    try {
      const r = await ventaService.getVentasCredito(barberoId);
      const sorted = [...r.items].sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
      setVentasCreditoLazy(prev => ({ ...prev, [barberoId]: sorted }));
    } catch {
      setVentasCreditoLazy(prev => ({ ...prev, [barberoId]: [] }));
    } finally {
      setLoadingVentasLazy(prev => ({ ...prev, [barberoId]: false }));
    }
  }, [ventasCreditoLazy, loadingVentasLazy]);

  const handleSwitchTab = useCallback((barberoId: number, tab: "ventas" | "abonos" | "stats") => {
    setActiveTab(prev => ({ ...prev, [barberoId]: tab }));
    setVentasPage(prev => ({ ...prev, [barberoId]: 1 }));
    setAbonosPage(prev => ({ ...prev, [barberoId]: 1 }));
    if (tab === "abonos") {
      loadInlineAbonos(barberoId);
    }
  }, [loadInlineAbonos]);

  // ── Registrar abono ──────────────────────────────────────────────────────────
  const isAbonoFormDirty = () => {
    return registrarStep === 'form' && (montoInput.trim() !== '' || notasInput.trim() !== '' || metodoPago !== 'Efectivo');
  };

  const handleRegistrarDialogClose = (open: boolean) => {
    if (submitting) return;
    if (!open) {
      if (isAbonoFormDirty()) {
        setIsConfirmDiscardOpen(true);
      } else {
        setShowFormErrors(false);
        setRegistrarOpen(false);
      }
    } else {
      setRegistrarOpen(true);
    }
  };

  const openRegistrar = (credito: CreditoBarberoDto | null, venta: any | null = null) => {
    setMontoInput("");
    setMetodoPago("Efectivo");
    setNotasInput("");
    setShowFormErrors(false);
    setAbonoApiError(null);
    setMontoShakeCount(0);
    setSelectedVentaAbono(venta);

    if (credito) {
      setRegistrarCredito(credito);
      setRegistrarStep("form");
    } else {
      setRegistrarCredito(null);
      setRegistrarStep("select");
      setBarberoSearch("");
    }
    setRegistrarOpen(true);
  };

  const handleSelectBarberoEnModal = (credito: CreditoBarberoDto) => {
    setRegistrarCredito(credito);
    setSelectedVentaAbono(null);
    setRegistrarStep("form");
  };

  const handleRegistrarAbono = async () => {
    setShowFormErrors(true);
    setAbonoApiError(null);
    const monto = Number(montoInput);
    if (!monto || monto < 5000 || monto % 50 !== 0 || (registrarCredito && monto > registrarCredito.saldoDeuda)) {
      setMontoShakeCount(n => n + 1);
      return;
    }

    try {
      setSubmitting(true);
      await creditoBarberoService.registrarAbono(registrarCredito!.barberoId, {
        usuarioId: Number(user?.id ?? 0),
        monto,
        metodoPago,
        notas: notasInput.trim() || undefined,
        ventaId: selectedVentaAbono?.id ?? null,
      });
      created("Abono registrado", `Abono de ${formatCurrency(monto)} registrado exitosamente.`);
      setShowFormErrors(false);
      setRegistrarOpen(false);
      if (inlineAbonos[registrarCredito!.barberoId] !== undefined) {
        loadInlineAbonos(registrarCredito!.barberoId);
      }
      fetchCreditos(1, searchTerm, statusFilter);
    } catch (err: any) {
      const raw: string = err?.message || "No se pudo registrar el abono";
      setAbonoApiError(raw.replace(/^Error del servidor \(\d+\):\s*/i, "").trim());
      setMontoShakeCount(n => n + 1);
    } finally {
      setSubmitting(false);
    }
  };

// ── Extender plazo ───────────────────────────────────────────────────────────
  const handleExtenderPlazo = async () => {
    if (!extenderCredito) return;
    try {
      setExtendiendo(true);
      await creditoBarberoService.extenderPlazo(extenderCredito.barberoId, {
        usuarioId: Number(user?.id ?? 0),
      });
      created("Plazo extendido", `El plazo del ciclo de ${extenderCredito.barberoNombre} se extendió a 14 dias.`);
      setExtenderOpen(false);
      fetchCreditos(1, searchTerm, statusFilter);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo extender el plazo");
    } finally {
      setExtendiendo(false);
    }
  };

  // ── Subir limite de credito ─────────────────────────────────────────────────
  const incrementoTotal = Math.min(200000, Number(incrementoRaw) || 0);

  const handleSubirLimite = async () => {
    if (!subirLimiteCredito) return;
    try {
      setSubiendoLimite(true);
      await creditoBarberoService.subirLimiteCredito(subirLimiteCredito.barberoId, {
        usuarioId: Number(user?.id ?? 0),
        incremento: incrementoTotal,
      });
      created("Limite aumentado", `El limite de credito de ${subirLimiteCredito.barberoNombre} se aumento en ${formatCurrency(incrementoTotal)}.`);
      setSubirLimiteOpen(false);
      setIncrementoVeces(1);
      fetchCreditos(1, searchTerm, statusFilter);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo aumentar el limite");
    } finally {
      setSubiendoLimite(false);
    }
  };

  // ── Computed para formulario ──────────────────────────────────────────────────
  const montoNum       = Number(montoInput);
  const montoValido    = montoNum >= 5000 && montoNum % 50 === 0 && (!registrarCredito || montoNum <= registrarCredito.saldoDeuda);
  const saldoTrasAbono = registrarCredito ? Math.max(0, registrarCredito.saldoDeuda - montoNum) : 0;

  const handleSearch = (val: string) => {
    setSearchInput(val);
    setSearchTerm(val);
  };

  const creditosFiltradosModal = useMemo(() => {
    const q = barberoSearch.toLowerCase().trim();
    if (!q) return filteredAndOrdered;
    return filteredAndOrdered.filter(c =>
      (c.barberoNombre || "").toLowerCase().includes(q) ||
      String(c.barberoId).includes(q)
    );
  }, [filteredAndOrdered, barberoSearch]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="cred-root">
      <style>{css}</style>
      <AlertContainer />

      <div className="p-6">
        <div className="std-card">

          {/* Toolbar */}
          <TableHeaderSection
            variant="dark"
            leftContent={(
              <button className="btn-std-primary" onClick={() => openRegistrar(null)}>
                <Wallet className="w-4 h-4" />
                Registrar Abono
              </button>
            )}
            searchValue={searchInput}
            onSearchChange={handleSearch}
            searchPlaceholder="Buscar por nombre de barbero..."
            statusFilter={{
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: "sin-pagar", label: "Sin pagar (Deuda)" },
                { value: "todos", label: "Todos los estados" },
                { value: "activo", label: "Solo Activos" },
                { value: "pagado", label: "Solo Pagados" },
                { value: "bloqueado", label: "Solo Bloqueados" },
              ],
            }}
            recordsText={`${filteredAndOrdered.length} registro${filteredAndOrdered.length !== 1 ? "s" : ""}`}
            recordsPlacement="right"
          />

          {/* Table */}
          <div className="std-table-wrapper" style={{ overflowX: "auto" }}>
            <table className="cred-table">
              <thead className="cred-thead">
                <tr>
                  <th style={{ textAlign: "left" }}>Documento</th>
                  <th style={{ textAlign: "left" }}>Barbero</th>
                  <th>Ventas a Credito</th>
                  <th>Saldo Deuda</th>
                  <th>Ultimo Abono</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--gray-dark)" }}>
                      Cargando creditos...
                    </td>
                  </tr>
                ) : creditos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--gray-dark)" }}>
                      No hay barberos con credito registrado.
                    </td>
                  </tr>
                ) : creditos.map(c => {
                  const isOpen     = expandedId === c.barberoId;
                  const barbero    = barberosMap[c.barberoId];
                  const todasVentasCred = (ventasCreditoLazy[c.barberoId] || []).filter((v: any) =>
                    String(v.estado || "").toLowerCase() !== "anulada"
                  );
                  const inicioDia = new Date(c.fechaInicio);
                  inicioDia.setHours(0, 0, 0, 0);
                  const cierreMs = c.fechaCierre ? new Date(c.fechaCierre).getTime() : Infinity;
                  const ventasCiclo = todasVentasCred.filter((v: any) => {
                    const t = new Date(v.fecha).getTime();
                    return t >= inicioDia.getTime() && t <= cierreMs;
                  });
                  const ventasHistoricas = todasVentasCred.filter((v: any) =>
                    new Date(v.fecha).getTime() < inicioDia.getTime()
                  );
                  const deudaActiva = c.saldoDeuda > 0 && !esPagado(c.estado);
                  const verHistorial = showHistorial[c.barberoId] || false;
                  const ventasCred = deudaActiva
                    ? (verHistorial ? todasVentasCred : ventasCiclo)
                    : (verHistorial ? todasVentasCred : []);
                  const ventasCargando = loadingVentasLazy[c.barberoId] || false;
                  const tab        = activeTab[c.barberoId] || "ventas";

                  // Condiciones para botones especiales
                  const puedeExtender = !c.extensionUsada && !esPagado(c.estado) && new Date(c.fechaVencimiento).getTime() < Date.now();

                  return (
                    <React.Fragment key={c.id || c.barberoId}>
                      {/* Fila principal */}
                      <tr className="cred-group-row" onClick={() => {
                          if (isOpen && (activeTab[c.barberoId] ?? "ventas") === "ventas") {
                            setExpandedId(null);
                          } else {
                            setExpandedId(c.barberoId);
                            setActiveTab(prev => ({ ...prev, [c.barberoId]: "ventas" }));
                          }
                        }}>
                        {/* Documento */}
                        <td className="cred-group-cell">
                          <span style={{ fontWeight: 400, color: "var(--gray-lightest)" }}>
                            {barbero?.tipoDocumento || "CC"} {barbero?.documento || "—"}
                          </span>
                        </td>

                        {/* Barbero */}
                        <td className="cred-group-cell">
                          <div className="cred-group-inner">
                            <AvatarCell barbero={barbero} />
                            <div>
                              <div className="cred-barber-name">{c.barberoNombre || `Barbero #${c.barberoId}`}</div>
                              <div className="cred-barber-sub"><EstadoBadge estado={c.estado} /></div>
                            </div>
                          </div>
                        </td>

                        {/* Ventas a credito */}
                        <td className="cred-td">
                          <span className="cred-num" style={{ color: "var(--white-primary)" }}>
                            {c.ventasCicloCount}
                          </span>
                        </td>

                        {/* Saldo deuda */}
                        <td className="cred-td">
                          <span className="cred-num" style={{
                            color: "var(--white-primary)",
                          }}>
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatCurrency(c.saldoDeuda)}
                          </span>
                        </td>

                        {/* Ultimo abono */}
                        <td className="cred-td" style={{ fontSize: 12 }}>
                          {formatDate(abonosStats[c.barberoId] || c.fechaInicio || null)}
                        </td>

                        {/* Acciones */}
                        <td className="cred-td" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              className="cred-icon-action p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              data-tip="Registrar Abono"
                              onClick={() => openRegistrar(c)}
                            >
                              <Wallet className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary transition-colors" />
                            </button>
                            <button
                              className="cred-icon-action p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              data-tip="Ver Abonos"
                              onClick={() => {
                                if (isOpen && activeTab[c.barberoId] === "abonos") {
                                  setExpandedId(null);
                                } else {
                                  setExpandedId(c.barberoId);
                                  handleSwitchTab(c.barberoId, "abonos");
                                }
                              }}
                            >
                              <FileText className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary transition-colors" />
                            </button>
                            <button
                              className="cred-icon-action p-2 hover:bg-gray-darker rounded-lg transition-colors group"
                              data-tip="Ver Credito"
                              onClick={() => {
                                if (isOpen && activeTab[c.barberoId] === "stats") {
                                  setExpandedId(null);
                                } else {
                                  setExpandedId(c.barberoId);
                                  handleSwitchTab(c.barberoId, "stats");
                                }
                              }}
                            >
                              <DollarSign className="w-4 h-4 text-gray-lightest group-hover:text-orange-primary transition-colors" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Acordeon */}
                      <tr key={`exp-${c.barberoId}`}>
                        <td colSpan={6} className="cred-exp-cell">
                          <div className={`cred-accordion-wrap${isOpen ? " open" : ""}`}>
                            <div className="cred-accordion-inner">

                              {/* Vista: Ver Credito */}
                              {tab === "stats" && (
                                <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                                  {/* Fila 1: Deuda + barra de progreso + estado */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                                    <div style={{ flex: "0 0 auto" }}>
                                      <div style={{ fontSize: 11, color: "var(--gray-light)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 4 }}>Deuda actual</div>
                                      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--white-primary)" }}>
                                        {formatCurrency(c.saldoDeuda)}
                                      </div>
                                    </div>
                                    <div style={{ flex: 1, minWidth: 140 }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: "var(--gray-light)" }}>Uso del cupo</span>
                                        <span style={{ fontSize: 11, color: "var(--gray-lightest)" }}>{formatCurrency(c.saldoDeuda)} / {formatCurrency(c.cupoMaximo)}</span>
                                      </div>
                                      <BarraProgreso saldo={c.saldoDeuda} cupo={c.cupoMaximo} />
                                      <div style={{ fontSize: 11, color: "var(--gray-light)", marginTop: 4 }}>
                                        Disponible: <span style={{ color: "var(--status-green)", fontWeight: 600 }}>{formatCurrency(c.cupoDisponible)}</span>
                                      </div>
                                    </div>
                                    <div style={{ flex: "0 0 auto" }}>
                                      <EstadoBadge estado={c.estado} />
                                    </div>
                                  </div>

                                  {/* Fila 2: Info del ciclo en grid limpio */}
                                  <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                                    gap: 1,
                                    background: "var(--gray-darker)",
                                    borderRadius: 10,
                                    overflow: "hidden",
                                  }}>
                                    {[
                                      { label: "Plazo", value: `${c.plazoDias} dias${c.extensionUsada ? " (extendido)" : ""}` },
                                      { label: "Inicio ciclo", value: formatDate(c.fechaInicio) },
                                      {
                                        label: "Vencimiento",
                                        value: formatDate(c.fechaVencimiento),
                                        extra: <VencimientoChip fechaVenc={c.fechaVencimiento} estado={c.estado} />,
                                      },
                                      ...(c.fechaCierre ? [{ label: "Cierre", value: formatDate(c.fechaCierre), green: true }] : []),
                                    ].map((item: any, i) => (
                                      <div key={i} style={{ background: "var(--black-secondary)", padding: "12px 16px" }}>
                                        <div style={{ fontSize: 10, color: "var(--gray-light)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700, marginBottom: 4 }}>{item.label}</div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: item.green ? "var(--status-green)" : "var(--white-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                          {item.value}
                                          {item.extra}
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Fila 3: Acciones */}
                                  {(puedeExtender || !esPagado(c.estado)) && (
                                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                      {!esPagado(c.estado) && (
                                        <button className="cred-action-btn-warn" onClick={() => { setSubirLimiteCredito(c); setIncrementoRaw(''); setSubirLimiteOpen(true); }}>
                                          <TrendingUp className="w-4 h-4" />
                                          Subir Limite (+$10.000)
                                        </button>
                                      )}
                                      {puedeExtender && (
                                        <button className="cred-action-btn-ext" onClick={() => { setExtenderCredito(c); setExtenderOpen(true); }}>
                                          <CalendarClock className="w-4 h-4" />
                                          Extender Plazo
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Vista: Ventas a Credito */}
                              {tab === "ventas" && (() => {
                                if (ventasCargando) return (
                                  <div style={{ padding: 32, textAlign: "center" }}>
                                    <RefreshCw className="w-5 h-5 animate-spin inline-block" style={{ color: "var(--orange-primary)" }} />
                                  </div>
                                );
                                const vPage = ventasPage[c.barberoId] || 1;
                                const ventasTotalPages = Math.ceil(ventasCred.length / SUBTAB_PAGE_SIZE);
                                const ventasPaginadas = ventasCred.slice((vPage - 1) * SUBTAB_PAGE_SIZE, vPage * SUBTAB_PAGE_SIZE);
                                return (
                                <>
                                  <div className="cred-sub-label">
                                    {verHistorial ? "Historial completo" : "Ventas del ciclo actual"} de{" "}
                                    <span style={{ color: "var(--orange-primary)", fontWeight: 600 }}>
                                      {c.barberoNombre || `Barbero #${c.barberoId}`}
                                    </span>
                                  </div>
                                  <table className="cred-table" style={{ borderTop: "none" }}>
                                    <colgroup>
                                      <col style={{ width: "10%" }} />
                                      <col style={{ width: "14%" }} />
                                      <col style={{ width: "32%" }} />
                                      <col style={{ width: "15%" }} />
                                      <col style={{ width: "14%" }} />
                                      <col style={{ width: "15%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr className="cred-sub-header">
                                        <th>Numero</th>
                                        <th>Fecha</th>
                                        <th style={{ textAlign: "left", paddingLeft: 36 }}>Productos / Servicios</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                        <th>Accion</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ventasCred.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} style={{ padding: 20, textAlign: "center", fontSize: 13 }}>
                                            <span style={{ color: "var(--gray-dark)" }}>
                                              {!deudaActiva && todasVentasCred.length > 0
                                                ? "Deuda saldada. No hay ventas pendientes en este ciclo."
                                                : deudaActiva && ventasHistoricas.length > 0
                                                  ? "Sin ventas en el ciclo actual."
                                                  : "Sin ventas a credito registradas."}
                                            </span>
                                          </td>
                                        </tr>
                                      ) : ventasPaginadas.map((v: any) => {
                                        const productos = (v.productosDetalle || []) as any[];
                                        const servicios = (v.serviciosDetalle || []) as any[];
                                        const total = productos.length + servicios.length;
                                        const itemsLabel = [
                                          ...productos.map((p: any) => p.nombre || "Producto"),
                                          ...servicios.map((s: any) => s.nombre || "Servicio"),
                                        ].slice(0, 2).join(", ") + (total > 2 ? "..." : "");

                                        return (
                                          <tr key={v.id} className="cred-item-row" style={{ cursor: "pointer" }} onClick={() => { setDetalleVenta(v); setDetalleVentaOpen(true); }}>
                                            <td className="cred-sub-td" style={{ paddingLeft: 36, textAlign: "left" }}>
                                              <span className="cred-num">
                                                <Hash className="w-3 h-3" />
                                                {v.numeroVenta || v.id}
                                              </span>
                                            </td>
                                            <td className="cred-sub-td" style={{ fontSize: 12 }}>
                                              {formatDate(v.fecha)}
                                            </td>
                                            <td className="cred-sub-td" style={{ textAlign: "left", fontSize: 12 }}>
                                              {itemsLabel || <span style={{ color: "var(--gray-dark)", fontStyle: "italic" }}>Sin detalle</span>}
                                            </td>
                                            <td className="cred-sub-td">
                                              <span style={{ fontWeight: 600, color: "var(--status-red)" }}>
                                                {formatCurrency(Number(v.subtotal || v.total || 0))}
                                              </span>
                                            </td>
                                            <td className="cred-sub-td">
                                              <EstadoBadge estado={v.estado || "Completada"} />
                                            </td>
                                            <td className="cred-sub-td">
                                              {(() => {
                                                const anulada = String(v.estado || "").toLowerCase() === "anulada";
                                                const abonosCargados = inlineAbonos[c.barberoId] !== undefined && !loadingInlineAbonos[c.barberoId];
                                                const tieneAbono = abonosCargados && (inlineAbonos[c.barberoId] || []).some(
                                                  a => a.ventaId === v.id
                                                );
                                                if (anulada || !abonosCargados || tieneAbono) return null;
                                                return (
                                                  <button
                                                    className="cred-icon-btn"
                                                    onClick={(e) => { e.stopPropagation(); openRegistrar(c, v); }}
                                                    title="Registrar abono a esta venta"
                                                    style={{ color: "var(--gray-lightest)" }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = "var(--orange-primary)")}
                                                    onMouseLeave={e => (e.currentTarget.style.color = "var(--gray-lightest)")}
                                                  >
                                                    <Wallet className="w-4 h-4" />
                                                  </button>
                                                );
                                              })()}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>

                                  {/* Barra de acciones — tab ventas */}
                                  <div className="cred-actions-bar">
                                    {verHistorial ? (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowHistorial(prev => ({ ...prev, [c.barberoId]: false })); setVentasPage(prev => ({ ...prev, [c.barberoId]: 1 })); }}
                                        style={{
                                          background: "none", border: "1px solid var(--gray-dark)",
                                          color: "var(--orange-primary)", padding: "3px 12px", borderRadius: 6, fontSize: 11,
                                          cursor: "pointer", fontWeight: 500
                                        }}
                                      >
                                        Ocultar historial
                                      </button>
                                    ) : ventasHistoricas.length > 0 && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowHistorial(prev => ({ ...prev, [c.barberoId]: true })); setVentasPage(prev => ({ ...prev, [c.barberoId]: 1 })); }}
                                        style={{
                                          background: "none", border: "1px solid var(--gray-dark)",
                                          color: "var(--gray-lightest)", padding: "3px 12px", borderRadius: 6, fontSize: 11,
                                          cursor: "pointer", fontWeight: 500
                                        }}
                                      >
                                        Ver historial completo ({todasVentasCred.length})
                                      </button>
                                    )}
                                    {/* Paginacion ventas */}
                                    {ventasTotalPages > 1 && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <button
                                          className="cred-icon-btn"
                                          disabled={vPage <= 1}
                                          onClick={() => setVentasPage(prev => ({ ...prev, [c.barberoId]: vPage - 1 }))}
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span style={{ fontSize: 12, color: "var(--gray-lightest)", minWidth: 52, textAlign: "center" }}>
                                          {vPage} / {ventasTotalPages}
                                        </span>
                                        <button
                                          className="cred-icon-btn"
                                          disabled={vPage >= ventasTotalPages}
                                          onClick={() => setVentasPage(prev => ({ ...prev, [c.barberoId]: vPage + 1 }))}
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                                );
                              })()}

                              {/* Vista: Ver Abonos */}
                              {tab === "abonos" && (() => {
                                const aPage = abonosPage[c.barberoId] || 1;
                                const todosAbonos = inlineAbonos[c.barberoId] || [];
                                const abonosTotalPages = Math.ceil(todosAbonos.length / SUBTAB_PAGE_SIZE);
                                const abonosPaginados = todosAbonos.slice((aPage - 1) * SUBTAB_PAGE_SIZE, aPage * SUBTAB_PAGE_SIZE);
                                return (
                                <>
                                  <div className="cred-sub-label">
                                    Todos los abonos de{" "}
                                    <span style={{ color: "var(--orange-primary)", fontWeight: 600 }}>
                                      {c.barberoNombre || `Barbero #${c.barberoId}`}
                                    </span>
                                  </div>
                                  <table className="cred-table" style={{ borderTop: "none" }}>
                                    <colgroup>
                                      <col style={{ width: "20%" }} />
                                      <col style={{ width: "30%" }} />
                                      <col style={{ width: "25%" }} />
                                      <col style={{ width: "25%" }} />
                                    </colgroup>
                                    <thead>
                                      <tr className="cred-sub-header">
                                        <th>Monto</th>
                                        <th>Fecha</th>
                                        <th>Metodo de Pago</th>
                                        <th>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                  {loadingInlineAbonos[c.barberoId] ? (
                                    <tr>
                                      <td colSpan={4} style={{ padding: 28, textAlign: "center" }}>
                                        <RefreshCw className="w-5 h-5 animate-spin inline-block" style={{ color: "var(--orange-primary)" }} />
                                      </td>
                                    </tr>
                                  ) : todosAbonos.length === 0 ? (
                                    <tr>
                                      <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "var(--gray-dark)", fontSize: 13 }}>
                                        Sin abonos registrados.
                                      </td>
                                    </tr>
                                  ) : abonosPaginados.map(a => (
                                    <tr
                                      key={a.id}
                                      className="cred-item-row"
                                      style={{ cursor: "pointer" }}
                                      onClick={() => { setDetalleAbono(a); setDetalleAbonoOpen(true); }}
                                    >
                                      <td className="cred-sub-td">
                                        <span style={{ fontWeight: 600, color: "var(--status-green)" }}>
                                          +{formatCurrency(a.monto)}
                                        </span>
                                      </td>
                                      <td className="cred-sub-td" style={{ fontSize: 12 }}>
                                        {formatDateTime(a.fecha)}
                                      </td>
                                      <td className="cred-sub-td" style={{ fontSize: 12 }}>
                                        {a.metodoPago ?? "—"}
                                      </td>
                                      <td className="cred-sub-td">
                                        <EstadoBadge estado={a.estado} />
                                      </td>
                                    </tr>
                                  ))}
                                    </tbody>
                                  </table>

                                  {/* Acciones abonos */}
                                  <div className="cred-actions-bar">
                                    <button
                                      className="cred-icon-btn"
                                      style={{ background: "rgba(255,255,255,0.03)", padding: "6px 12px", color: "var(--gray-lightest)" }}
                                      onClick={() => { loadInlineAbonos(c.barberoId); setAbonosPage(prev => ({ ...prev, [c.barberoId]: 1 })); }}
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                      <span style={{ fontSize: 12 }}>Actualizar</span>
                                    </button>
                                    {/* Paginacion abonos */}
                                    {abonosTotalPages > 1 && (
                                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: "auto" }}>
                                        <button
                                          className="cred-icon-btn"
                                          disabled={aPage <= 1}
                                          onClick={() => setAbonosPage(prev => ({ ...prev, [c.barberoId]: aPage - 1 }))}
                                        >
                                          <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <span style={{ fontSize: 12, color: "var(--gray-lightest)", minWidth: 52, textAlign: "center" }}>
                                          {aPage} / {abonosTotalPages}
                                        </span>
                                        <button
                                          className="cred-icon-btn"
                                          disabled={aPage >= abonosTotalPages}
                                          onClick={() => setAbonosPage(prev => ({ ...prev, [c.barberoId]: aPage + 1 }))}
                                        >
                                          <ChevronRight className="w-4 h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </>
                                );
                              })()}

                            </div>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginacion */}
          <div className="std-pagination">
            <span className="std-pag-info">Pagina {currentPage} de {totalPages}</span>
            <EllipsisPagination currentPage={currentPage} totalPages={totalPages} onPageChange={(p) => { setCurrentPage(p); fetchCreditos(p, searchTerm, statusFilter); }} />
          </div>
        </div>
      </div>

      {/* Modal: Registrar Abono */}
      <Dialog open={registrarOpen} onOpenChange={handleRegistrarDialogClose}>
        <DialogContent className="max-w-md bg-gray-darkest border-gray-dark">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <Wallet className="w-5 h-5 text-orange-primary" />
              Registrar Abono
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              {registrarStep === "select"
                ? "Selecciona el barbero al que deseas registrar el abono."
                : (
                  <>
                    {registrarCredito?.barberoNombre}
                    {selectedVentaAbono ? ` — Venta #${selectedVentaAbono.numeroVenta || selectedVentaAbono.id}` : ""}
                    {" · Deuda: "}
                    <strong style={{ color: "var(--orange-primary)" }}>{formatCurrency(registrarCredito?.saldoDeuda ?? 0)}</strong>
                  </>
                )
              }
            </DialogDescription>
          </DialogHeader>

          {/* Paso 1: Seleccionar barbero */}
          {registrarStep === "select" && (
            <div className="space-y-3 pt-1">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--gray-dark)", display: "flex", pointerEvents: "none" }}>
                  <Search className="w-4 h-4" />
                </span>
                <input
                  className="cred-search"
                  style={{ paddingLeft: 36 }}
                  placeholder="Buscar barbero por nombre..."
                  value={barberoSearch}
                  onChange={e => setBarberoSearch(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="cred-selector-list">
                {creditosFiltradosModal.length === 0 ? (
                  <div style={{ padding: "16px 0", textAlign: "center", color: "var(--gray-dark)", fontSize: 13 }}>
                    Sin resultados
                  </div>
                ) : creditosFiltradosModal.map(c => {
                  const barbero = barberosMap[c.barberoId];
                  return (
                    <div
                      key={c.id || c.barberoId}
                      className={`cred-selector-item${registrarCredito?.barberoId === c.barberoId ? " selected" : ""}`}
                      onClick={() => handleSelectBarberoEnModal(c)}
                    >
                      <div className="cred-avatar" style={{ width: 32, height: 32, fontSize: 11, overflow: "hidden", background: (barbero?.fotoPerfil && barbero.fotoPerfil.trim() && barbero.fotoPerfil !== "No especificada") ? "transparent" : "var(--orange-primary)" }}>
                        {(barbero?.fotoPerfil && barbero.fotoPerfil.trim() && barbero.fotoPerfil !== "No especificada") ? (
                          <ImageRenderer url={barbero.fotoPerfil} className="w-full h-full object-cover" fallbackVariant="person" showLabel={false} />
                        ) : (
                          <UserIcon className="w-4 h-4" style={{ color: "var(--black-primary)" }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: "var(--white-primary)", fontWeight: 500 }}>
                          {c.barberoNombre || `Barbero #${c.barberoId}`}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--gray-lighter)" }}>
                          Deuda:{" "}
                          <span style={{
                            color: "var(--white-primary)",
                            fontWeight: 600,
                          }}>
                            {formatCurrency(c.saldoDeuda)}
                          </span>
                        </div>
                      </div>
                      <EstadoBadge estado={c.estado} />
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-1 border-t border-gray-dark">
                <button onClick={() => { setShowFormErrors(false); setRegistrarOpen(false); }} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Paso 2: Formulario de abono */}
          {registrarStep === "form" && (
            <div className="space-y-4 pt-2">

              {selectedVentaAbono && (
                <div className="bg-gray-darker rounded-xl p-3 border border-gray-dark text-sm space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Venta</span>
                    <span className="text-white-primary font-medium">
                      #{selectedVentaAbono.numeroVenta || selectedVentaAbono.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Fecha</span>
                    <span className="text-white-primary">{formatDate(selectedVentaAbono.fecha)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-lightest">Monto venta</span>
                    <span className="text-orange-primary font-bold">
                      {formatCurrency(Number(selectedVentaAbono.subtotal || selectedVentaAbono.total || 0))}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-white-primary text-sm">Monto del abono *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={montoInput ? Number(montoInput).toLocaleString("es-CO") : ""}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "");
                    setAbonoApiError(null);
                    if (!digits) { setMontoInput(""); return; }
                    const n = Number(digits);
                    const max = Math.min(registrarCredito?.saldoDeuda ?? 999_999, 999_999);
                    setMontoInput(String(Math.min(n, max)));
                  }}
                  onBlur={() => {
                    if (!montoInput) return;
                    const max = registrarCredito?.saldoDeuda ?? 999_999;
                    let n = Number(montoInput);
                    if (n < 5000) n = 5000;
                    else if (n % 50 !== 0) n = Math.ceil(n / 50) * 50;
                    n = Math.min(n, max);
                    setMontoInput(String(n));
                  }}
                  placeholder="Ej: 50.000"
                  className={`elegante-input ${(showFormErrors && !montoValido) || abonoApiError ? "border-destructive ring-1 ring-destructive" : ""} ${montoShakeCount % 2 === 1 ? "input-required-shake-a" : montoShakeCount > 0 ? "input-required-shake-b" : ""}`}
                />
                {montoNum > 0 && montoNum < 5000 && (
                  <p style={{ color: "var(--status-red)", fontSize: 13, fontWeight: 600 }}>
                    Minimo $5.000 — se ajustara automaticamente
                  </p>
                )}
                {montoNum >= 5000 && montoNum % 50 !== 0 && (
                  <p style={{ color: "var(--status-red)", fontSize: 13, fontWeight: 600 }}>
                    La denominacion es de $50 — se ajustara a {formatCurrency(Math.ceil(montoNum / 50) * 50)}
                  </p>
                )}
                {showFormErrors && !montoValido && montoNum === 0 && (
                  <p style={{ color: "var(--status-red)", fontSize: 14, fontWeight: 600 }}>El monto debe ser mayor a 0</p>
                )}
                {showFormErrors && !montoValido && montoNum > 0 && montoNum >= 5000 && montoNum % 50 === 0 && (
                  <p style={{ color: "var(--status-red)", fontSize: 14, fontWeight: 600 }}>
                    Maximo: {formatCurrency(registrarCredito?.saldoDeuda ?? 0)}
                  </p>
                )}
                {abonoApiError && (
                  <p className="text-xs text-status-red">{abonoApiError}</p>
                )}
                {montoNum > 0 && montoValido && !abonoApiError && (
                  <div className="flex justify-between text-xs px-1 text-gray-lighter">
                    <span>Saldo tras abono:</span>
                    <span style={{ color: saldoTrasAbono === 0 ? "var(--status-green)" : "var(--orange-primary)", fontWeight: 600 }}>
                      {formatCurrency(saldoTrasAbono)}{saldoTrasAbono === 0 ? " — Deuda saldada" : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-white-primary text-sm">Metodo de pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger className="elegante-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-darkest border-gray-dark">
                    {["Efectivo", "Transferencia", "Tarjeta", "Nequi", "Daviplata", "Otro"].map(m => (
                      <SelectItem key={m} value={m} className="text-white-primary">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-white-primary text-sm">Notas (opcional)</Label>
                <textarea
                  value={notasInput}
                  onChange={e => setNotasInput(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="elegante-input w-full resize-none px-3 py-2 text-sm rounded-md text-gray-lightest"
                />
              </div>

              <div className="flex justify-between gap-3 pt-2 border-t border-gray-dark">
                <button
                  onClick={() => { setRegistrarStep("select"); setBarberoSearch(""); }}
                  disabled={submitting}
                  className="elegante-button-secondary flex items-center gap-1.5"
                  style={{ padding: "0.45rem 1rem", fontSize: "13px" }}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Cambiar barbero
                </button>
                <div className="flex gap-2">
                  <button onClick={() => { setShowFormErrors(false); setRegistrarOpen(false); }} disabled={submitting} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
                    Cancelar
                  </button>
                  <button
                    onClick={handleRegistrarAbono}
                    disabled={submitting}
                    className="elegante-button-primary flex items-center gap-2"
                    style={{ padding: "0.45rem 1rem", fontSize: "13px" }}
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    {submitting ? "Registrando..." : "Registrar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Extender Plazo */}
      <Dialog open={extenderOpen} onOpenChange={open => { if (!extendiendo) setExtenderOpen(open); }}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <CalendarClock className="w-5 h-5" style={{ color: "var(--status-green)" }} />
              Extender Plazo del Ciclo
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Se agregaran 7 dias adicionales al plazo del ciclo. Solo se puede usar una vez por ciclo.
            </DialogDescription>
          </DialogHeader>

          {extenderCredito && (
            <div className="space-y-3 pt-1">
              <div className="bg-gray-darker p-3 rounded-lg space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Barbero</span>
                  <span className="text-white-primary font-medium">{extenderCredito.barberoNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Vencimiento actual</span>
                  <span className="text-orange-primary">{formatDate(extenderCredito.fechaVencimiento)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Nuevo vencimiento</span>
                  <span className="text-status-green font-semibold">
                    {formatDate(new Date(Date.now() + 7 * 86400000).toISOString())}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Deuda actual</span>
                  <span style={{ color: "var(--white-primary)", fontWeight: 600 }}>{formatCurrency(extenderCredito.saldoDeuda)}</span>
                </div>
              </div>
              <p className="text-xs text-gray-lighter px-1">
                Esta extension no se puede revertir y solo se permite una vez por ciclo.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setExtenderOpen(false)} disabled={extendiendo} className="elegante-button-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleExtenderPlazo}
                  disabled={extendiendo}
                  className="elegante-button-primary flex items-center gap-2"
                  style={{ padding: "0.45rem 1.2rem", fontSize: "13px" }}
                >
                  {extendiendo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />}
                  {extendiendo ? "Extendiendo..." : "Confirmar Extension"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Subir Limite de Credito */}
      <Dialog open={subirLimiteOpen} onOpenChange={open => { if (!subiendoLimite) { setSubirLimiteOpen(open); if (!open) setIncrementoRaw(''); } }}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-primary" />
              Subir Limite de Credito
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Ingresa el monto a agregar al limite de credito (maximo $200.000).
            </DialogDescription>
          </DialogHeader>

          {subirLimiteCredito && (
            <div className="space-y-4 pt-1">
              {/* Input de incremento */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0" }}>
                <span style={{ fontSize: 11, color: "var(--gray-lighter)", textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 700 }}>Incremento a aplicar</span>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "var(--orange-primary)", lineHeight: 1, marginBottom: 8 }}>
                    {incrementoTotal > 0 ? formatCurrency(incrementoTotal) : <span style={{ color: "var(--gray-dark)" }}>$0</span>}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={subiendoLimite}
                    value={incrementoRaw ? Number(incrementoRaw).toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '');
                      const num = Math.min(200000, Number(digits) || 0);
                      setIncrementoRaw(num > 0 ? String(num) : '');
                    }}
                    placeholder="Ej: 50.000"
                    style={{
                      background: "var(--gray-darker)", border: "1px solid var(--gray-dark)",
                      borderRadius: 8, color: "var(--white-primary)", fontSize: 15, fontWeight: 600,
                      padding: "8px 14px", textAlign: "center", width: 160, outline: "none",
                    }}
                    onFocus={e => (e.target.style.borderColor = "var(--orange-primary)")}
                    onBlur={e => (e.target.style.borderColor = "var(--gray-dark)")}
                  />
                  {incrementoTotal >= 200000 && (
                    <div style={{ fontSize: 11, color: "var(--orange-primary)", marginTop: 4 }}>Maximo alcanzado</div>
                  )}
                </div>
              </div>

              <div className="bg-gray-darker p-3 rounded-lg space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Barbero</span>
                  <span className="text-white-primary font-medium">{subirLimiteCredito.barberoNombre}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Limite actual</span>
                  <span className="text-white-primary font-semibold">{formatCurrency(subirLimiteCredito.cupoMaximo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Nuevo limite</span>
                  <span style={{ color: "var(--orange-primary)", fontWeight: 700 }}>{formatCurrency(subirLimiteCredito.cupoMaximo + incrementoTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Deuda actual</span>
                  <span style={{ color: "var(--status-red)", fontWeight: 600 }}>{formatCurrency(subirLimiteCredito.saldoDeuda)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Disponible tras aumento</span>
                  <span style={{ color: "var(--status-green)", fontWeight: 600 }}>
                    {formatCurrency((subirLimiteCredito.cupoMaximo + incrementoTotal) - subirLimiteCredito.saldoDeuda)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => { setSubirLimiteOpen(false); setIncrementoRaw(''); }} disabled={subiendoLimite} className="elegante-button-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleSubirLimite}
                  disabled={subiendoLimite || incrementoTotal <= 0}
                  className="elegante-button-primary flex items-center gap-2"
                  style={{ padding: "0.45rem 1.2rem", fontSize: "13px" }}
                >
                  {subiendoLimite ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                  {subiendoLimite ? "Aumentando..." : incrementoTotal > 0 ? `Aumentar ${formatCurrency(incrementoTotal)}` : "Ingresa un monto"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de Venta */}
      <Dialog open={detalleVentaOpen} onOpenChange={setDetalleVentaOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <Receipt className="w-5 h-5 text-orange-primary" />
              Detalle de Venta
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Venta #{detalleVenta?.numeroVenta || detalleVenta?.id}
            </DialogDescription>
          </DialogHeader>

          {detalleVenta && (() => {
            const productos = (detalleVenta.productosDetalle || []) as any[];
            const servicios = (detalleVenta.serviciosDetalle || []) as any[];
            return (
              <div className="space-y-3 pt-1">
                <div className="bg-gray-darker p-4 rounded-xl border border-gray-dark space-y-3">

                  <div className="flex justify-between items-center pb-3 border-b border-gray-dark">
                    <span style={{ fontSize: 13, color: "var(--gray-lighter)" }}>Total</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: "var(--status-red)" }}>
                      {formatCurrency(Number(detalleVenta.subtotal || detalleVenta.total || 0))}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--gray-lighter)" }}>Estado</span>
                    <EstadoBadge estado={detalleVenta.estado || "Completada"} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--gray-lighter)" }}>Fecha</span>
                    <span style={{ color: "var(--white-primary)" }}>{formatDate(detalleVenta.fecha)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--gray-lighter)" }}>Método de pago</span>
                    <span style={{ color: "var(--white-primary)" }}>{detalleVenta.metodoPago ?? "—"}</span>
                  </div>
                  {detalleVenta.numeroRecibo && (
                    <div className="flex justify-between text-sm">
                      <span style={{ color: "var(--gray-lighter)" }}>Recibo</span>
                      <span style={{ color: "var(--white-primary)" }}>#{detalleVenta.numeroRecibo}</span>
                    </div>
                  )}

                  {(productos.length > 0 || servicios.length > 0) && (
                    <div className="pt-3 border-t border-gray-dark space-y-2">
                      {[...productos.map((p: any) => ({ ...p, _tipo: "producto" })),
                        ...servicios.map((s: any) => ({ ...s, _tipo: "servicio" }))
                      ].map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3">
                          <div style={{
                            width: 40, height: 40, borderRadius: 8, flexShrink: 0, overflow: "hidden",
                            background: "var(--gray-dark)", display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {item.imagen && item.imagen.trim() && item.imagen !== "No especificada" ? (
                              <ImageRenderer url={item.imagen} className="w-full h-full object-cover" fallbackVariant="product" showLabel={false} />
                            ) : (
                              <span style={{ fontSize: 16 }}>📦</span>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: "var(--white-primary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.nombre}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--gray-lighter)" }}>
                              {item._tipo === "producto" ? "Producto" : "Servicio"} · x{item.cantidad ?? 1}
                            </div>
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--orange-primary)", flexShrink: 0 }}>
                            {formatCurrency(Number(item.precio || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button onClick={() => setDetalleVentaOpen(false)} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
                    Cerrar
                  </button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de Abono */}
      <Dialog open={detalleAbonoOpen} onOpenChange={setDetalleAbonoOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-primary" />
              Detalle del Abono
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Abono #{detalleAbono?.id}
            </DialogDescription>
          </DialogHeader>

          {detalleAbono && (
            <div className="space-y-3 pt-1">
              <div className="bg-gray-darker p-4 rounded-xl border border-gray-dark space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-dark">
                  <span style={{ fontSize: 13, color: "var(--gray-lighter)" }}>Monto</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--status-green)" }}>
                    +{formatCurrency(detalleAbono.monto)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--gray-lighter)" }}>Estado</span>
                  <EstadoBadge estado={detalleAbono.estado} />
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--gray-lighter)" }}>Fecha</span>
                  <span style={{ color: "var(--white-primary)" }}>{formatDateTime(detalleAbono.fecha)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--gray-lighter)" }}>Método de pago</span>
                  <span style={{ color: "var(--white-primary)" }}>{detalleAbono.metodoPago ?? "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--gray-lighter)" }}>Registrado por</span>
                  <span style={{ color: "var(--white-primary)" }}>{detalleAbono.usuarioNombre ?? "Sistema"}</span>
                </div>
                {detalleAbono.ventaId && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: "var(--gray-lighter)" }}>Venta asociada</span>
                    <span style={{ color: "var(--orange-primary)", fontWeight: 600 }}>#{detalleAbono.ventaId}</span>
                  </div>
                )}
                {detalleAbono.notas && (
                  <div className="pt-3 border-t border-gray-dark">
                    <span style={{ fontSize: 11, color: "var(--gray-lighter)", display: "block", marginBottom: 4 }}>Notas</span>
                    <p style={{ fontSize: 13, color: "var(--gray-lightest)", fontStyle: "italic" }}>{detalleAbono.notas}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-1">
                <button onClick={() => setDetalleAbonoOpen(false)} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDiscardOpen} onOpenChange={setIsConfirmDiscardOpen}>
        <AlertDialogContent className="bg-gray-darkest border border-gray-dark">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white-primary text-xl">¿Descartar cambios?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-lightest font-medium">Tienes cambios sin guardar en el formulario. ¿Deseas seguir editando o descartar los cambios realizados?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <button onClick={() => setIsConfirmDiscardOpen(false)} className="elegante-button-secondary bg-transparent border-gray-dark text-white-primary hover:bg-gray-darker px-4 py-2 rounded-md">Seguir editando</button>
            <button onClick={() => { setIsConfirmDiscardOpen(false); setShowFormErrors(false); setMontoInput(''); setMetodoPago('Efectivo'); setNotasInput(''); setAbonoApiError(null); setRegistrarOpen(false); }} className="elegante-button-primary bg-red-600 text-white hover:bg-red-700 px-4 py-2 rounded-md font-semibold">Descartar cambios</button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
