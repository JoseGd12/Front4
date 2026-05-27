import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Ban,
  DollarSign,
  User as UserIcon,
  AlertTriangle,
  ChevronDown,
  Wallet,
  Hash,
  Receipt,
  FileText,
  RefreshCw,
} from "lucide-react";

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  .cred-root { min-height:100vh; background:var(--black-primary); color:var(--white-primary); padding:0; }
  .cred-card { background:var(--gray-darkest); border:1px solid var(--gray-darker); border-radius:14px; overflow:hidden; }

  /* Toolbar */
  .cred-toolbar {
    display:flex; align-items:center; gap:14px; padding:16px 20px;
    border-bottom:1px solid var(--gray-darker); flex-wrap:wrap; background:var(--gray-darkest);
  }
  .cred-search-wrap { position:relative; flex:1; min-width:180px; max-width:360px; }
  .cred-search-icon { position:absolute; left:11px; top:50%; transform:translateY(-50%); color:var(--gray-dark); pointer-events:none; display:flex; }
  .cred-search {
    width:100%; padding:9px 14px 9px 36px; background:var(--black-secondary);
    border:1px solid var(--gray-darker); border-radius:8px; color:var(--white-primary);
    font-size:13px; outline:none; font-family:inherit; transition:border-color .15s;
  }
  .cred-search::placeholder { color:var(--gray-dark); }
  .cred-search:focus { border-color:var(--orange-primary); }
  .cred-count { margin-left:auto; font-size:13px; color:var(--gray-lightest); white-space:nowrap; }

  /* Main table */
  .cred-table { width:100%; border-collapse:collapse; }
  .cred-thead th {
    padding:13px 16px; font-size:11px; font-weight:700; color:var(--gray-lightest);
    text-align:center; letter-spacing:.06em; text-transform:uppercase;
    border-bottom:1px solid var(--gray-darker); white-space:nowrap; background:var(--gray-darkest);
  }
  .cred-thead th:first-child { text-align:left; padding-left:20px; }

  /* Group row */
  .cred-group-row { background:var(--gray-darkest); border-bottom:1px solid var(--gray-darker); cursor:pointer; transition:background .15s; }
  .cred-group-row:hover { background:var(--gray-dark); }
  .cred-group-cell { padding:14px 16px; }
  .cred-group-cell:first-child { padding-left:20px; }
  .cred-group-inner { display:flex; align-items:center; gap:12px; }
  .cred-avatar {
    width:36px; height:36px; border-radius:50%; display:flex; align-items:center;
    justify-content:center; font-size:12px; font-weight:700; color:var(--black-primary);
    flex-shrink:0; background:var(--orange-primary);
  }
  .cred-barber-name { font-size:14px; font-weight:400; color:var(--gray-lightest); line-height:1.3; }
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

  /* General td */
  .cred-td { padding:12px 16px; font-size:13px; color:var(--gray-lightest); text-align:center; vertical-align:middle; }
  .cred-num { display:inline-flex; align-items:center; gap:4px; font-weight:600; color:var(--orange-primary); }

  /* Badges */
  .badge { display:inline-block; padding:3px 11px; border-radius:999px; font-size:11px; font-weight:600; white-space:nowrap; }
  .badge-activo     { background:#f0d9b5; color:#7a4f1e; border:1px solid #d4b483; }
  .badge-bloqueado  { background:#7a5230; color:#f0d9b5; border:1px solid #5c3a1e; }
  .badge-completada { background:#f0d9b5; color:#7a4f1e; border:1px solid #d4b483; }
  .badge-anulada    { background:#7a5230; color:#f0d9b5; border:1px solid #5c3a1e; }

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

  /* Tab pills — "villeterita" */
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
    border-top:1px solid var(--gray-darker); background:rgba(26,25,25,0.4);
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
`;

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "../../../shared/components/ui/dialog";
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

const formatDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDateTime = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const l = (estado || "").toLowerCase();
  if (l === "activo" || l === "completada" || l === "completado")
    return <span className="badge badge-activo">{estado}</span>;
  if (l === "bloqueado" || l === "anulada" || l === "anulado")
    return <span className="badge badge-bloqueado">{estado}</span>;
  return <span className="badge" style={{ background: "var(--gray-medium)", color: "var(--gray-lightest)" }}>{estado}</span>;
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
  const PAGE_SIZE = 15;

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [expandedId,  setExpandedId]  = useState<number | null>(null);

  const [barberosMap, setBarberosMap]     = useState<Record<number, Barbero>>({});
  const [ventasCreditoPorBarbero, setVentasCreditoPorBarbero] = useState<Record<number, any[]>>({});
  const [abonosStats, setAbonosStats]     = useState<Record<number, string>>({});

  // ── Tab por barbero ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Record<number, "ventas" | "abonos">>({});
  const [inlineAbonos, setInlineAbonos]                     = useState<Record<number, AbonoCreditoBarberoDto[]>>({});
  const [loadingInlineAbonos, setLoadingInlineAbonos]       = useState<Record<number, boolean>>({});

  // ── Modal: registrar abono ───────────────────────────────────────────────────
  const [registrarOpen,    setRegistrarOpen]    = useState(false);
  const [registrarStep,    setRegistrarStep]    = useState<"select" | "form">("select");
  const [barberoSearch,    setBarberoSearch]    = useState("");
  const [registrarCredito, setRegistrarCredito] = useState<CreditoBarberoDto | null>(null);
  const [selectedVentaAbono, setSelectedVentaAbono] = useState<any | null>(null);
  const [montoInput,       setMontoInput]       = useState("");
  const [metodoPago,       setMetodoPago]       = useState("Efectivo");
  const [notasInput,       setNotasInput]       = useState("");
  const [submitting,       setSubmitting]       = useState(false);
  const [showFormErrors,   setShowFormErrors]   = useState(false);

  // ── Modal: anular abono ──────────────────────────────────────────────────────
  const [anularOpen,         setAnularOpen]         = useState(false);
  const [abonoAnular,        setAbonoAnular]        = useState<AbonoCreditoBarberoDto | null>(null);
  const [abonoAnularBarbId,  setAbonoAnularBarbId]  = useState<number | null>(null);
  const [anulando,           setAnulando]           = useState(false);

  // ── Carga principal ──────────────────────────────────────────────────────────
  const fetchCreditos = useCallback(async (page: number, q: string) => {
    try {
      setLoading(true);
      const [res, barberos, ventas] = await Promise.all([
        creditoBarberoService.getAll(page, PAGE_SIZE, q),
        barberosService.getBarberos().catch(() => []),
        ventaService.getVentas().catch(() => []),
      ]);

      const bMap: Record<number, Barbero> = {};
      (barberos || []).forEach((b: any) => { if (b.id) bMap[b.id] = b; });
      setBarberosMap(bMap);

      const vcMap: Record<number, any[]> = {};
      (ventas || []).forEach((v: any) => {
        const bid = Number(v.barberoId || 0);
        if (bid > 0 && String(v.metodoPago || "").toLowerCase() === "creditobarbero") {
          vcMap[bid] = vcMap[bid] || [];
          vcMap[bid].push(v);
        }
      });
      Object.values(vcMap).forEach(arr =>
        arr.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime())
      );
      setVentasCreditoPorBarbero(vcMap);

      const aStats: Record<number, string> = {};
      await Promise.all(res.items.map(async (c) => {
        try {
          const r = await creditoBarberoService.getAbonos(c.barberoId, 1, 1);
          if (r.items.length > 0) aStats[c.barberoId] = r.items[0].fecha;
        } catch { /* ignore */ }
      }));
      setAbonosStats(aStats);

      setCreditos(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo cargar el listado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCreditos(currentPage, searchTerm); }, [currentPage, searchTerm]);

  // Cargar abonos al expandir una fila para poder saber qué ventas ya tienen abono
  useEffect(() => {
    if (expandedId !== null && inlineAbonos[expandedId] === undefined && !loadingInlineAbonos[expandedId]) {
      loadInlineAbonos(expandedId);
    }
  }, [expandedId]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const ordenados = useMemo(() => {
    const prio = (e: string) => {
      const l = e.toLowerCase();
      return l === "bloqueado" ? 0 : l === "activo" ? 1 : 2;
    };
    return [...creditos].sort((a, b) => prio(a.estado) - prio(b.estado));
  }, [creditos]);

  // ── Abonos inline ────────────────────────────────────────────────────────────
  const loadInlineAbonos = useCallback(async (barberoId: number) => {
    setLoadingInlineAbonos(prev => ({ ...prev, [barberoId]: true }));
    try {
      const r = await creditoBarberoService.getAbonos(barberoId, 1, 50);
      setInlineAbonos(prev => ({ ...prev, [barberoId]: r.items }));
    } catch {
      setInlineAbonos(prev => ({ ...prev, [barberoId]: [] }));
    } finally {
      setLoadingInlineAbonos(prev => ({ ...prev, [barberoId]: false }));
    }
  }, []);

  const handleSwitchTab = useCallback((barberoId: number, tab: "ventas" | "abonos") => {
    setActiveTab(prev => ({ ...prev, [barberoId]: tab }));
    if (tab === "abonos") {
      // Cargar si no están cargados o forzar recarga
      loadInlineAbonos(barberoId);
    }
  }, [loadInlineAbonos]);

  // ── Registrar abono ──────────────────────────────────────────────────────────
  const openRegistrar = (credito: CreditoBarberoDto | null, venta: any | null = null) => {
    setMontoInput("");
    setMetodoPago("Efectivo");
    setNotasInput("");
    setShowFormErrors(false);
    setSelectedVentaAbono(venta);

    if (credito) {
      setRegistrarCredito(credito);
      setRegistrarStep("form");
    } else {
      // Desde toolbar: mostrar selector primero
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
    const monto = Number(montoInput);
    if (!monto || monto <= 0) return;
    if (registrarCredito && monto > registrarCredito.saldoDeuda) return;

    const notasFinales = selectedVentaAbono
      ? `[ventaId:${selectedVentaAbono.id}]${notasInput.trim() ? ` ${notasInput.trim()}` : ""}`
      : (notasInput.trim() || undefined);

    try {
      setSubmitting(true);
      await creditoBarberoService.registrarAbono(registrarCredito!.barberoId, {
        usuarioId: Number(user?.id ?? 0),
        monto,
        metodoPago,
        notas: notasFinales,
      });
      created("Abono registrado", `Abono de ${formatCurrency(monto)} registrado exitosamente.`);
      setRegistrarOpen(false);
      // Refrescar abonos inline si la tab de abonos está visible
      if (inlineAbonos[registrarCredito!.barberoId] !== undefined) {
        loadInlineAbonos(registrarCredito!.barberoId);
      }
      fetchCreditos(currentPage, searchTerm);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo registrar el abono");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Anular abono ─────────────────────────────────────────────────────────────
  const handleAnularAbono = async () => {
    if (!abonoAnular) return;
    try {
      setAnulando(true);
      await creditoBarberoService.anularAbono(abonoAnular.id, Number(user?.id ?? 0));
      created("Abono anulado", `Abono #${abonoAnular.id} anulado correctamente.`);
      setAnularOpen(false);
      if (abonoAnularBarbId) loadInlineAbonos(abonoAnularBarbId);
      fetchCreditos(currentPage, searchTerm);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo anular el abono");
    } finally {
      setAnulando(false);
    }
  };

  // ── Computed para formulario ──────────────────────────────────────────────────
  const montoNum       = Number(montoInput);
  const montoValido    = montoNum > 0 && (!registrarCredito || montoNum <= registrarCredito.saldoDeuda);
  const saldoTrasAbono = registrarCredito ? Math.max(0, registrarCredito.saldoDeuda - montoNum) : 0;

  const creditosFiltradosModal = useMemo(() => {
    const q = barberoSearch.toLowerCase().trim();
    if (!q) return ordenados;
    return ordenados.filter(c =>
      (c.barberoNombre || "").toLowerCase().includes(q) ||
      String(c.barberoId).includes(q)
    );
  }, [ordenados, barberoSearch]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="cred-root">
      <style>{css}</style>
      <AlertContainer />

      <div className="p-6">
        <div className="cred-card">

          {/* Toolbar */}
          <div className="cred-toolbar">
            <button className="btn-std-primary" onClick={() => openRegistrar(null)}>
              <Wallet className="w-4 h-4" />
              Registrar Abono
            </button>

            <div className="cred-search-wrap">
              <span className="cred-search-icon"><Search className="w-4 h-4" /></span>
              <input
                className="cred-search"
                placeholder="Buscar por nombre de barbero o estado..."
                value={searchInput}
                onChange={e => handleSearch(e.target.value)}
              />
            </div>

            <span className="cred-count">{totalCount} registro{totalCount !== 1 ? "s" : ""}</span>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table className="cred-table">
              <thead className="cred-thead">
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: 20 }}>Documento</th>
                  <th>Barbero</th>
                  <th>Ventas a Crédito</th>
                  <th>Saldo Deuda</th>
                  <th>Último Abono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--gray-dark)" }}>
                      Cargando créditos...
                    </td>
                  </tr>
                ) : ordenados.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "var(--gray-dark)" }}>
                      No hay barberos con crédito registrado.
                    </td>
                  </tr>
                ) : ordenados.map(c => {
                  const isOpen     = expandedId === c.barberoId;
                  const barbero    = barberosMap[c.barberoId];
                  const ventasCred = ventasCreditoPorBarbero[c.barberoId] || [];
                  const tab        = activeTab[c.barberoId] || "ventas";

                  return (
                    <React.Fragment key={c.id || c.barberoId}>
                      {/* Fila principal */}
                      <tr className="cred-group-row" onClick={() => setExpandedId(isOpen ? null : c.barberoId)}>
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

                        {/* Ventas a crédito */}
                        <td className="cred-td">
                          <span className="cred-num" style={{ color: "var(--white-primary)" }}>
                            {ventasCred.length}
                          </span>
                        </td>

                        {/* Saldo deuda */}
                        <td className="cred-td">
                          <span className="cred-num" style={{
                            color: c.saldoDeuda > 0 ? "#b07070" : "var(--status-green)",
                          }}>
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatCurrency(c.saldoDeuda)}
                          </span>
                        </td>

                        {/* Último abono */}
                        <td className="cred-td" style={{ fontSize: 12 }}>
                          {formatDate(abonosStats[c.barberoId] || null)}
                        </td>

                        {/* Acciones */}
                        <td className="cred-td" onClick={e => e.stopPropagation()}>
                          <button
                            className="cred-expand-btn"
                            onClick={() => setExpandedId(isOpen ? null : c.barberoId)}
                          >
                            Ver ventas
                            <span className={`chev-custom${isOpen ? " open" : ""}`}>
                              <ChevronDown className="w-4 h-4" />
                            </span>
                          </button>
                        </td>
                      </tr>

                      {/* Acordeón */}
                      <tr key={`exp-${c.barberoId}`}>
                        <td colSpan={6} className="cred-exp-cell">
                          <div className={`cred-accordion-wrap${isOpen ? " open" : ""}`}>
                            <div className="cred-accordion-inner">

                              {/* Stats bar */}
                              <div className="cred-stats-bar">
                                <div className="cred-stat-item">
                                  <span className="cred-stat-label">Uso del Cupo</span>
                                  <BarraProgreso saldo={c.saldoDeuda} cupo={c.cupoMaximo} />
                                </div>
                                <div className="cred-stat-item">
                                  <span className="cred-stat-label">Deuda Actual</span>
                                  <span className="cred-stat-val" style={{ color: c.saldoDeuda > 0 ? "#b07070" : "var(--status-green)" }}>
                                    {formatCurrency(c.saldoDeuda)}
                                  </span>
                                </div>
                                <div className="cred-stat-item">
                                  <span className="cred-stat-label">Cupo Disponible</span>
                                  <span className="cred-stat-val">{formatCurrency(c.cupoDisponible)}</span>
                                </div>
                                <div className="cred-stat-item">
                                  <span className="cred-stat-label">Cupo Máximo</span>
                                  <span className="cred-stat-val">{formatCurrency(c.cupoMaximo)}</span>
                                </div>
                                <div className="cred-stat-item">
                                  <span className="cred-stat-label">Desde</span>
                                  <span className="cred-stat-val">{formatDate(c.fechaCreacion)}</span>
                                </div>
                              </div>

                              {/* Tab pills — "villeterita" */}
                              <div className="cred-tabs">
                                <button
                                  className={`cred-tab${tab === "ventas" ? " active" : ""}`}
                                  onClick={() => handleSwitchTab(c.barberoId, "ventas")}
                                >
                                  <Receipt className="w-3 h-3" />
                                  Ventas a Crédito
                                  <span style={{
                                    marginLeft: 2,
                                    fontSize: 10,
                                    background: tab === "ventas" ? "rgba(216,176,129,0.18)" : "var(--gray-darker)",
                                    borderRadius: 999,
                                    padding: "1px 6px",
                                    fontWeight: 700,
                                  }}>{ventasCred.length}</span>
                                </button>
                                <button
                                  className={`cred-tab${tab === "abonos" ? " active" : ""}`}
                                  onClick={() => handleSwitchTab(c.barberoId, "abonos")}
                                >
                                  <FileText className="w-3 h-3" />
                                  Ver Abonos
                                </button>
                              </div>

                              {/* ── Vista: Ventas a Crédito ── */}
                              {tab === "ventas" && (
                                <>
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
                                        <th>Número</th>
                                        <th>Fecha</th>
                                        <th style={{ textAlign: "left", paddingLeft: 36 }}>Productos / Servicios</th>
                                        <th>Monto</th>
                                        <th>Estado</th>
                                        <th>Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {ventasCred.length === 0 ? (
                                        <tr>
                                          <td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--gray-dark)", fontSize: 13 }}>
                                            Sin ventas a crédito registradas.
                                          </td>
                                        </tr>
                                      ) : ventasCred.map((v: any) => {
                                        const productos = (v.productosDetalle || []) as any[];
                                        const servicios = (v.serviciosDetalle || []) as any[];
                                        const total = productos.length + servicios.length;
                                        const itemsLabel = [
                                          ...productos.map((p: any) => p.nombre || "Producto"),
                                          ...servicios.map((s: any) => s.nombre || "Servicio"),
                                        ].slice(0, 2).join(", ") + (total > 2 ? "..." : "");

                                        return (
                                          <tr key={v.id} className="cred-item-row">
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
                                              <span style={{ fontWeight: 600, color: "#b07070" }}>
                                                {formatCurrency(Number(v.subtotal || v.total || 0))}
                                              </span>
                                            </td>
                                            <td className="cred-sub-td">
                                              <EstadoBadge estado={v.estado || "Completada"} />
                                            </td>
                                            <td className="cred-sub-td">
                                              {(() => {
                                                const anulada = String(v.estado || "").toLowerCase() === "anulada";
                                                const tieneAbono = (inlineAbonos[c.barberoId] || []).some(
                                                  a => a.estado !== "Anulado" && String(a.notas ?? "").includes(`[ventaId:${v.id}]`)
                                                );
                                                if (anulada || tieneAbono) return null;
                                                return (
                                                  <button
                                                    className="cred-icon-btn"
                                                    onClick={() => openRegistrar(c, v)}
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

                                  {/* Barra de acciones — solo en tab ventas */}
                                  {c.saldoDeuda > 0 && (
                                    <div className="cred-actions-bar">
                                      <button
                                        className="cred-action-btn"
                                        onClick={() => openRegistrar(c, null)}
                                      >
                                        <DollarSign className="w-4 h-4" />
                                        Registrar Pago General
                                      </button>
                                    </div>
                                  )}
                                </>
                              )}

                              {/* ── Vista: Ver Abonos ── */}
                              {tab === "abonos" && (
                                <>
                                  {loadingInlineAbonos[c.barberoId] ? (
                                    <div style={{ padding: "28px 0", display: "flex", justifyContent: "center" }}>
                                      <RefreshCw className="w-5 h-5 animate-spin" style={{ color: "var(--orange-primary)" }} />
                                    </div>
                                  ) : (inlineAbonos[c.barberoId] || []).length === 0 ? (
                                    <div style={{ padding: "24px 20px", textAlign: "center", color: "var(--gray-dark)", fontSize: 13 }}>
                                      Sin abonos registrados.
                                    </div>
                                  ) : (inlineAbonos[c.barberoId] || []).map(a => (
                                    <div
                                      key={a.id}
                                      className="cred-abono-row"
                                      style={{ opacity: a.estado === "Anulado" ? 0.5 : 1 }}
                                    >
                                      {/* Monto + estado */}
                                      <div style={{ minWidth: 110 }}>
                                        <span style={{
                                          fontWeight: 700,
                                          fontSize: 14,
                                          color: a.estado === "Anulado" ? "var(--status-red)" : "var(--status-green)",
                                        }}>
                                          {a.estado === "Anulado" ? "−" : "+"}{formatCurrency(a.monto)}
                                        </span>
                                      </div>

                                      {/* Info */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, color: "var(--gray-lighter)" }}>
                                          {formatDateTime(a.fecha)} · {a.metodoPago ?? "—"} · {a.usuarioNombre ?? "Sistema"}
                                        </div>
                                        {a.notas && (
                                          <div style={{ fontSize: 11, color: "var(--gray-dark)", fontStyle: "italic", marginTop: 2 }}>
                                            {a.notas}
                                          </div>
                                        )}
                                      </div>

                                      {/* Estado badge */}
                                      <EstadoBadge estado={a.estado} />

                                      {/* Anular */}
                                      {a.estado !== "Anulado" && (
                                        <button
                                          className="cred-icon-btn"
                                          style={{ color: "var(--gray-lightest)" }}
                                          title="Anular abono"
                                          onClick={() => { setAbonoAnular(a); setAbonoAnularBarbId(c.barberoId); setAnularOpen(true); }}
                                          onMouseEnter={e => (e.currentTarget.style.color = "#b07070")}
                                          onMouseLeave={e => (e.currentTarget.style.color = "var(--gray-lightest)")}
                                        >
                                          <Ban className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  ))}

                                  {/* Acciones abonos */}
                                  <div className="cred-actions-bar">
                                    <button
                                      className="cred-icon-btn"
                                      style={{ background: "rgba(255,255,255,0.03)", padding: "6px 12px", color: "var(--gray-lightest)" }}
                                      onClick={() => loadInlineAbonos(c.barberoId)}
                                    >
                                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                      <span style={{ fontSize: 12 }}>Actualizar</span>
                                    </button>
                                    {c.saldoDeuda > 0 && (
                                      <button
                                        className="cred-action-btn"
                                        onClick={() => openRegistrar(c, null)}
                                      >
                                        <DollarSign className="w-4 h-4" />
                                        Registrar Pago
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}

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

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="std-pagination">
              <span className="std-pag-info">Página {currentPage} de {totalPages}</span>
              <EllipsisPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      </div>

      {/* ═══ Modal: Registrar Abono ══════════════════════════════════════════════ */}
      <Dialog open={registrarOpen} onOpenChange={open => { if (!submitting) setRegistrarOpen(open); }}>
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

          {/* ── Paso 1: Seleccionar barbero ── */}
          {registrarStep === "select" && (
            <div className="space-y-3 pt-1">
              {/* Buscador */}
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

              {/* Lista de barberos */}
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
                            color: c.saldoDeuda > 0 ? "var(--status-red)" : "var(--status-green)",
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
                <button onClick={() => setRegistrarOpen(false)} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* ── Paso 2: Formulario de abono ── */}
          {registrarStep === "form" && (
            <div className="space-y-4 pt-2">

              {/* Tarjeta info venta si viene de una específica */}
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

              {/* Monto */}
              <div className="space-y-1.5">
                <Label className="text-white-primary text-sm">Monto del abono *</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={montoInput ? Number(montoInput).toLocaleString("es-CO") : ""}
                  onChange={e => {
                    const digits = e.target.value.replace(/\D/g, "");
                    if (!digits) { setMontoInput(""); return; }
                    const n = Number(digits);
                    const max = Math.min(registrarCredito?.saldoDeuda ?? 999_999, 999_999);
                    setMontoInput(String(Math.min(n, max)));
                  }}
                  placeholder="Ej: 50.000"
                  className={`elegante-input ${showFormErrors && !montoValido ? "border-destructive ring-1 ring-destructive" : ""}`}
                />
                {showFormErrors && !montoValido && (
                  <p className="text-xs text-status-red">
                    {montoNum <= 0 ? "El monto debe ser mayor a 0" : `Máximo: ${formatCurrency(registrarCredito?.saldoDeuda ?? 0)}`}
                  </p>
                )}
                {montoNum > 0 && montoValido && (
                  <div className="flex justify-between text-xs px-1 text-gray-lighter">
                    <span>Saldo tras abono:</span>
                    <span style={{ color: saldoTrasAbono === 0 ? "var(--status-green)" : "var(--orange-primary)", fontWeight: 600 }}>
                      {formatCurrency(saldoTrasAbono)}{saldoTrasAbono === 0 ? " — Deuda saldada" : ""}
                    </span>
                  </div>
                )}
              </div>

              {/* Método de pago */}
              <div className="space-y-1.5">
                <Label className="text-white-primary text-sm">Método de pago</Label>
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

              {/* Notas */}
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

              {/* Botones */}
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
                  <button onClick={() => setRegistrarOpen(false)} disabled={submitting} className="elegante-button-secondary" style={{ padding: "0.45rem 1rem", fontSize: "13px" }}>
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

      {/* ═══ Modal: Confirmar Anulación de Abono ════════════════════════════════ */}
      <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
        <DialogContent className="bg-gray-darkest border-gray-dark max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white-primary flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-red" />
              Anular Abono
            </DialogTitle>
            <DialogDescription className="text-gray-lightest">
              Esta acción revertirá el monto al saldo de deuda del barbero.
            </DialogDescription>
          </DialogHeader>

          {abonoAnular && (
            <div className="space-y-3 pt-1">
              <div className="bg-gray-darker p-3 rounded-lg space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Abono #</span>
                  <span className="text-gray-lightest">{abonoAnular.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Monto</span>
                  <span className="font-semibold" style={{ color: "var(--status-red)" }}>{formatCurrency(abonoAnular.monto)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Fecha</span>
                  <span className="text-gray-lightest">{formatDateTime(abonoAnular.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-lighter">Método</span>
                  <span className="text-gray-lightest">{abonoAnular.metodoPago ?? "—"}</span>
                </div>
              </div>
              <p className="text-xs text-gray-lighter px-1">
                El saldo de deuda del barbero aumentará en {formatCurrency(abonoAnular.monto)}.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAnularOpen(false)} disabled={anulando} className="elegante-button-secondary">
                  Cancelar
                </button>
                <button
                  onClick={handleAnularAbono}
                  disabled={anulando}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold bg-destructive text-white transition-colors"
                  style={{ opacity: anulando ? 0.7 : 1 }}
                >
                  {anulando ? <RefreshCw className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {anulando ? "Anulando..." : "Confirmar Anulación"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
