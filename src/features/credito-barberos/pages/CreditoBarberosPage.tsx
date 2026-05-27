import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  DollarSign,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../shared/components/ui/select";
import { Label } from "../../../shared/components/ui/label";
import { Input } from "../../../shared/components/ui/input";
import { Button } from "../../../shared/components/ui/button";
import { TableHeaderSection } from "../../../shared/components/ui/table-header-section";
import { TableEmptyStateRow } from "../../../shared/components/ui/table-empty-state-row";
import { TableLoadingStateRow } from "../../../shared/components/ui/table-loading-state-row";
import { EllipsisPagination } from "../../../shared/components/ui/pagination";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { useAuth } from "../../../shared/contexts/AuthContext";
import {
  creditoBarberoService,
  CreditoBarberoDto,
  AbonoCreditoBarberoDto,
} from "../services/creditoBarberoService";

const formatCurrency = (v: number) =>
  `$${(v ?? 0).toLocaleString("es-CO")}`;

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

type EstadoBadgeProps = { estado: string };

function EstadoBadge({ estado }: EstadoBadgeProps) {
  const lower = estado.toLowerCase();
  let bg = "color-mix(in srgb, var(--gray-medium) 60%, transparent)";
  let color = "var(--gray-lightest)";
  let Icon = Clock;

  if (lower === "activo") {
    bg = "color-mix(in srgb, var(--status-green) 20%, transparent)";
    color = "var(--status-green)";
    Icon = CheckCircle;
  } else if (lower === "bloqueado") {
    bg = "color-mix(in srgb, var(--status-red) 20%, transparent)";
    color = "var(--status-red)";
    Icon = AlertTriangle;
  } else if (lower === "anulado") {
    bg = "color-mix(in srgb, var(--status-red) 15%, transparent)";
    color = "var(--status-red)";
    Icon = X;
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: bg, color }}
    >
      <Icon className="w-3 h-3" />
      {estado}
    </span>
  );
}

function BarraProgreso({ saldo, cupo }: { saldo: number; cupo: number }) {
  const pct = cupo > 0 ? Math.min(100, (saldo / cupo) * 100) : 0;
  let barColor = "var(--status-green)";
  if (pct >= 90) barColor = "var(--status-red)";
  else if (pct >= 60) barColor = "var(--orange-primary)";

  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--gray-medium)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <span className="text-xs tabular-nums" style={{ color: "var(--gray-lighter)", minWidth: "36px" }}>
        {Math.round(pct)}%
      </span>
    </div>
  );
}

export function CreditoBarberosPage() {
  const { user } = useAuth();
  const { created, error: showErrorAlert, AlertContainer } = useCustomAlert();

  // Lista principal
  const [creditos, setCreditos] = useState<CreditoBarberoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 15;
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Modal abonos
  const [abonosModalOpen, setAbonosModalOpen] = useState(false);
  const [abonosCredito, setAbonosCredito] = useState<CreditoBarberoDto | null>(null);
  const [abonos, setAbonos] = useState<AbonoCreditoBarberoDto[]>([]);
  const [loadingAbonos, setLoadingAbonos] = useState(false);
  const [abonosPage, setAbonosPage] = useState(1);
  const [abonosTotalPages, setAbonosTotalPages] = useState(1);

  // Modal registrar abono
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [registrarCredito, setRegistrarCredito] = useState<CreditoBarberoDto | null>(null);
  const [montoInput, setMontoInput] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [notasInput, setNotasInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showFormErrors, setShowFormErrors] = useState(false);

  // Modal anular abono
  const [anularOpen, setAnularOpen] = useState(false);
  const [abonoAnular, setAbonoAnular] = useState<AbonoCreditoBarberoDto | null>(null);
  const [anulando, setAnulando] = useState(false);

  const fetchCreditos = useCallback(async (page: number, q: string) => {
    try {
      setLoading(true);
      const res = await creditoBarberoService.getAll(page, PAGE_SIZE, q);
      setCreditos(res.items);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo cargar el listado de créditos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCreditos(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  const handleSearch = (val: string) => {
    setSearchInput(val);
    setSearchTerm(val);
    setCurrentPage(1);
  };

  // Ordenar por urgencia: Bloqueado primero, luego Activo, luego Sin crédito
  const ordenados = useMemo(() => {
    const prioridad = (e: string) => {
      const l = e.toLowerCase();
      if (l === "bloqueado") return 0;
      if (l === "activo") return 1;
      return 2;
    };
    return [...creditos].sort((a, b) => prioridad(a.estado) - prioridad(b.estado));
  }, [creditos]);

  // Abrir modal abonos
  const openAbonos = async (credito: CreditoBarberoDto, page = 1) => {
    setAbonosCredito(credito);
    setAbonosPage(page);
    setAbonosModalOpen(true);
    setLoadingAbonos(true);
    try {
      const res = await creditoBarberoService.getAbonos(credito.barberoId, page, 10);
      setAbonos(res.items);
      setAbonosTotalPages(res.totalPages);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudieron cargar los abonos");
    } finally {
      setLoadingAbonos(false);
    }
  };

  // Abrir modal registrar abono
  const openRegistrar = (credito: CreditoBarberoDto) => {
    setRegistrarCredito(credito);
    setMontoInput("");
    setMetodoPago("Efectivo");
    setNotasInput("");
    setShowFormErrors(false);
    setRegistrarOpen(true);
  };

  const handleRegistrarAbono = async () => {
    setShowFormErrors(true);
    const monto = Number(montoInput);
    if (!monto || monto <= 0) return;
    if (registrarCredito && monto > registrarCredito.saldoDeuda) return;

    try {
      setSubmitting(true);
      await creditoBarberoService.registrarAbono(registrarCredito!.barberoId, {
        usuarioId: Number(user?.id ?? 0),
        monto,
        metodoPago,
        notas: notasInput.trim() || undefined,
      });
      created(
        "Abono registrado",
        `Abono de ${formatCurrency(monto)} registrado exitosamente.`
      );
      setRegistrarOpen(false);
      fetchCreditos(currentPage, searchTerm);
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo registrar el abono");
    } finally {
      setSubmitting(false);
    }
  };

  // Anular abono
  const handleAnularAbono = async () => {
    if (!abonoAnular) return;
    try {
      setAnulando(true);
      await creditoBarberoService.anularAbono(abonoAnular.id, Number(user?.id ?? 0));
      created("Abono anulado", `Abono #${abonoAnular.id} anulado correctamente.`);
      setAnularOpen(false);
      if (abonosCredito) {
        openAbonos(abonosCredito, abonosPage);
        fetchCreditos(currentPage, searchTerm);
      }
    } catch (err: any) {
      showErrorAlert("Error", err?.message || "No se pudo anular el abono");
    } finally {
      setAnulando(false);
    }
  };

  const montoNum = Number(montoInput);
  const montoValido = montoNum > 0 && (!registrarCredito || montoNum <= registrarCredito.saldoDeuda);
  const saldoTrasAbono = registrarCredito ? Math.max(0, registrarCredito.saldoDeuda - montoNum) : 0;

  return (
    <div className="space-y-6">
      <AlertContainer />

      <div className="std-card">
        <TableHeaderSection
          variant="dark"
          leftContent={
            <button
              className="btn-std-primary"
              onClick={() => fetchCreditos(currentPage, searchTerm)}
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          }
          searchValue={searchInput}
          onSearchChange={handleSearch}
          searchPlaceholder="Buscar por nombre de barbero o estado..."
          rightContent={
            <span className="std-records-count">
              {totalCount} registro{totalCount !== 1 ? "s" : ""}
            </span>
          }
        />

        <div className="std-table-wrapper">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--gray-darker)", borderBottom: "1px solid var(--gray-dark)" }}>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--gray-lightest)" }}>
                  Barbero
                </th>
                <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--gray-lightest)" }}>
                  Estado
                </th>
                <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--gray-lightest)" }}>
                  Saldo Deuda
                </th>
                <th className="text-right px-4 py-3 font-semibold hidden md:table-cell" style={{ color: "var(--gray-lightest)" }}>
                  Cupo Disponible
                </th>
                <th className="px-4 py-3 font-semibold hidden lg:table-cell" style={{ color: "var(--gray-lightest)" }}>
                  Uso del Cupo
                </th>
                <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell" style={{ color: "var(--gray-lightest)" }}>
                  Actualización
                </th>
                <th className="text-center px-4 py-3 font-semibold" style={{ color: "var(--gray-lightest)" }}>
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableLoadingStateRow colSpan={7} />
              ) : ordenados.length === 0 ? (
                <TableEmptyStateRow
                  colSpan={7}
                  title="Sin registros de crédito"
                  description="No hay barberos con crédito registrado o no coinciden con la búsqueda."
                  onReload={() => fetchCreditos(currentPage, searchTerm)}
                />
              ) : (
                ordenados.map((c, idx) => (
                  <tr
                    key={c.id || `${c.barberoId}-${idx}`}
                    style={{
                      borderBottom: "1px solid var(--gray-dark)",
                      backgroundColor: idx % 2 === 0 ? "transparent" : "color-mix(in srgb, var(--gray-darker) 30%, transparent)",
                    }}
                    className="hover:bg-gray-darker/40 transition-colors"
                  >
                    {/* Barbero */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: "color-mix(in srgb, var(--orange-primary) 15%, transparent)" }}
                        >
                          <User className="w-4 h-4" style={{ color: "var(--orange-primary)" }} />
                        </div>
                        <span className="font-medium" style={{ color: "var(--gray-lightest)" }}>
                          {c.barberoNombre || `Barbero #${c.barberoId}`}
                        </span>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <EstadoBadge estado={c.estado} />
                    </td>

                    {/* Saldo Deuda */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className="font-semibold"
                        style={{
                          color: c.saldoDeuda > 0
                            ? (c.saldoDeuda >= c.cupoMaximo * 0.9 ? "var(--status-red)" : "var(--orange-primary)")
                            : "var(--status-green)",
                        }}
                      >
                        {formatCurrency(c.saldoDeuda)}
                      </span>
                    </td>

                    {/* Cupo Disponible */}
                    <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell" style={{ color: "var(--gray-lightest)" }}>
                      {formatCurrency(c.cupoDisponible)}
                    </td>

                    {/* Barra de progreso */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <BarraProgreso saldo={c.saldoDeuda} cupo={c.cupoMaximo} />
                    </td>

                    {/* Fecha */}
                    <td className="px-4 py-3 hidden xl:table-cell text-xs" style={{ color: "var(--gray-lighter)" }}>
                      {formatDate(c.fechaActualizacion ?? c.fechaCreacion)}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openAbonos(c)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors"
                          style={{
                            borderColor: "var(--gray-dark)",
                            color: "var(--gray-lightest)",
                            backgroundColor: "transparent",
                          }}
                          title="Ver historial de abonos"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Abonos</span>
                        </button>

                        {c.saldoDeuda > 0 && (
                          <button
                            onClick={() => openRegistrar(c)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors"
                            style={{
                              backgroundColor: "var(--orange-primary)",
                              color: "var(--black-primary)",
                            }}
                            title="Registrar abono"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Abonar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="std-full-divider" style={{ borderColor: "var(--gray-dark)" }}>
            <div className="px-6 py-3 flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--gray-lighter)" }}>
                Página {currentPage} de {totalPages}
              </span>
              <EllipsisPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(p) => { setCurrentPage(p); }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal: Historial de Abonos ─── */}
      <Dialog open={abonosModalOpen} onOpenChange={setAbonosModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--gray-darkest)", borderColor: "var(--gray-dark)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--white-primary)" }}>
              <FileText className="w-5 h-5" style={{ color: "var(--orange-primary)" }} />
              Abonos — {abonosCredito?.barberoNombre ?? "Barbero"}
            </DialogTitle>
            <DialogDescription style={{ color: "var(--gray-lightest)" }}>
              Historial de pagos y abonos al crédito. Saldo actual:{" "}
              <strong style={{ color: "var(--orange-primary)" }}>
                {formatCurrency(abonosCredito?.saldoDeuda ?? 0)}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {abonosCredito && abonosCredito.saldoDeuda > 0 && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => {
                  setAbonosModalOpen(false);
                  openRegistrar(abonosCredito);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium"
                style={{ backgroundColor: "var(--orange-primary)", color: "var(--black-primary)" }}
              >
                <DollarSign className="w-4 h-4" />
                Registrar Abono
              </button>
            </div>
          )}

          {loadingAbonos ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--orange-primary)", borderTopColor: "transparent" }} />
            </div>
          ) : abonos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10" style={{ color: "var(--gray-lighter)" }}>
              <CreditCard className="w-10 h-10" style={{ color: "var(--gray-medium)" }} />
              <p className="text-sm">Sin abonos registrados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {abonos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    backgroundColor: "var(--gray-darker)",
                    opacity: a.estado === "Anulado" ? 0.6 : 1,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: a.estado === "Anulado" ? "color-mix(in srgb, var(--status-red) 15%, transparent)" : "color-mix(in srgb, var(--status-green) 15%, transparent)" }}
                  >
                    <DollarSign className="w-4 h-4" style={{ color: a.estado === "Anulado" ? "var(--status-red)" : "var(--status-green)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm" style={{ color: a.estado === "Anulado" ? "var(--status-red)" : "var(--status-green)" }}>
                        {a.estado === "Anulado" ? "-" : "+"}{formatCurrency(a.monto)}
                      </span>
                      <EstadoBadge estado={a.estado} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "var(--gray-lighter)" }}>
                      {formatDateTime(a.fecha)} · {a.metodoPago ?? "—"} · {a.usuarioNombre ?? "Sistema"}
                    </p>
                    {a.notas && (
                      <p className="text-xs mt-0.5 italic" style={{ color: "var(--gray-lighter)" }}>{a.notas}</p>
                    )}
                  </div>
                  {a.estado !== "Anulado" && (
                    <button
                      onClick={() => { setAbonoAnular(a); setAnularOpen(true); }}
                      className="flex-shrink-0 p-1.5 rounded transition-colors hover:bg-red-500/20"
                      title="Anular abono"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {abonosTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={abonosPage <= 1}
                onClick={() => abonosCredito && openAbonos(abonosCredito, abonosPage - 1)}
                className="p-1.5 rounded disabled:opacity-40"
                style={{ color: "var(--gray-lightest)" }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs" style={{ color: "var(--gray-lighter)" }}>
                {abonosPage} / {abonosTotalPages}
              </span>
              <button
                disabled={abonosPage >= abonosTotalPages}
                onClick={() => abonosCredito && openAbonos(abonosCredito, abonosPage + 1)}
                className="p-1.5 rounded disabled:opacity-40"
                style={{ color: "var(--gray-lightest)" }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Registrar Abono ─── */}
      <Dialog open={registrarOpen} onOpenChange={setRegistrarOpen}>
        <DialogContent style={{ backgroundColor: "var(--gray-darkest)", borderColor: "var(--gray-dark)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--white-primary)" }}>
              <DollarSign className="w-5 h-5" style={{ color: "var(--orange-primary)" }} />
              Registrar Abono
            </DialogTitle>
            <DialogDescription style={{ color: "var(--gray-lightest)" }}>
              {registrarCredito?.barberoNombre} · Saldo: {formatCurrency(registrarCredito?.saldoDeuda ?? 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Monto */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--white-primary)", fontSize: "13px" }}>
                Monto del abono *
              </Label>
              <Input
                type="number"
                min={1}
                max={registrarCredito?.saldoDeuda}
                value={montoInput}
                onChange={(e) => setMontoInput(e.target.value)}
                placeholder="Ej: 50000"
                className={`elegante-input ${showFormErrors && !montoValido ? "border-red-500 ring-1 ring-red-500" : ""}`}
              />
              {showFormErrors && !montoValido && (
                <p className="text-xs text-red-400">
                  {montoNum <= 0
                    ? "El monto debe ser mayor a 0"
                    : `El monto no puede superar el saldo (${formatCurrency(registrarCredito?.saldoDeuda ?? 0)})`}
                </p>
              )}

              {montoNum > 0 && montoValido && (
                <div className="flex items-center justify-between text-xs px-1 pt-1" style={{ color: "var(--gray-lighter)" }}>
                  <span>Saldo tras abono:</span>
                  <span className="font-semibold" style={{ color: saldoTrasAbono === 0 ? "var(--status-green)" : "var(--orange-primary)" }}>
                    {formatCurrency(saldoTrasAbono)}
                    {saldoTrasAbono === 0 && " — Deuda saldada"}
                  </span>
                </div>
              )}
            </div>

            {/* Método de pago */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--white-primary)", fontSize: "13px" }}>
                Método de pago
              </Label>
              <Select value={metodoPago} onValueChange={setMetodoPago}>
                <SelectTrigger className="elegante-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Nequi">Nequi</SelectItem>
                  <SelectItem value="Daviplata">Daviplata</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label style={{ color: "var(--white-primary)", fontSize: "13px" }}>
                Notas (opcional)
              </Label>
              <textarea
                value={notasInput}
                onChange={(e) => setNotasInput(e.target.value)}
                placeholder="Observaciones adicionales..."
                rows={2}
                className="elegante-input w-full resize-none px-3 py-2 text-sm rounded-md"
                style={{ color: "var(--gray-lightest)" }}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setRegistrarOpen(false)}
                className="elegante-btn-secondary px-4 py-2 text-sm"
                disabled={submitting}
              >
                Cancelar
              </Button>
              <button
                onClick={handleRegistrarAbono}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-md text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: "var(--orange-primary)",
                  color: "var(--black-primary)",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <DollarSign className="w-4 h-4" />
                )}
                {submitting ? "Registrando..." : "Registrar Abono"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Confirmar Anulación de Abono ─── */}
      <Dialog open={anularOpen} onOpenChange={setAnularOpen}>
        <DialogContent style={{ backgroundColor: "var(--gray-darkest)", borderColor: "var(--gray-dark)" }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{ color: "var(--white-primary)" }}>
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Anular Abono
            </DialogTitle>
            <DialogDescription style={{ color: "var(--gray-lightest)" }}>
              Esta acción revertira el monto al saldo de deuda del barbero.
            </DialogDescription>
          </DialogHeader>

          {abonoAnular && (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-lg space-y-1.5 text-sm" style={{ backgroundColor: "var(--gray-darker)" }}>
                <div className="flex justify-between">
                  <span style={{ color: "var(--gray-lighter)" }}>Abono #</span>
                  <span style={{ color: "var(--gray-lightest)" }}>{abonoAnular.id}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--gray-lighter)" }}>Monto</span>
                  <span className="font-semibold" style={{ color: "var(--status-red)" }}>
                    {formatCurrency(abonoAnular.monto)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--gray-lighter)" }}>Fecha</span>
                  <span style={{ color: "var(--gray-lightest)" }}>{formatDateTime(abonoAnular.fecha)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--gray-lighter)" }}>Método</span>
                  <span style={{ color: "var(--gray-lightest)" }}>{abonoAnular.metodoPago ?? "—"}</span>
                </div>
              </div>

              <p className="text-xs px-1" style={{ color: "var(--gray-lighter)" }}>
                El saldo de deuda del barbero aumentara en {formatCurrency(abonoAnular.monto)}.
              </p>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setAnularOpen(false)}
                  className="elegante-btn-secondary px-4 py-2 text-sm"
                  disabled={anulando}
                >
                  Cancelar
                </Button>
                <button
                  onClick={handleAnularAbono}
                  disabled={anulando}
                  className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: "var(--destructive)",
                    color: "white",
                    opacity: anulando ? 0.7 : 1,
                  }}
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
