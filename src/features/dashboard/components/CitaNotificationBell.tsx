import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, X, Clock, User, Scissors, CalendarDays, ListChecks } from "lucide-react";
import { agendamientoService, type Agendamiento } from "../../agendamiento/services/agendamientoService";
import { clientesService } from "../../clientes/services/clientesService";
import { useCustomAlert } from "../../../shared/components/ui/custom-alert";
import { ModalCompletarParcialmente } from "../../agendamiento/components/ModalCompletarParcialmente";
import { Tooltip, TooltipTrigger, TooltipContent } from "../../../shared/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../../shared/components/ui/alert-dialog";

interface CitaNotification {
  id: string;
  citaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteFotoPerfil: string | null;
  servicioNombre: string;
  barberoNombre: string;
  hora: string;
  fecha: string;
  minutosRestantes: number;
  createdAt: number;
}

interface CitaNotificationBellProps {
  isOnAgendamientos: boolean;
  onNavigateToAgendamientos: () => void;
}

const ACTIONED_KEY = "cita_notifications_actioned";
const CREATED_AT_KEY = "cita_notifications_created_at";
const CACHE_KEY = "cita_notifications_cache";

const loadNotificationsCache = (): CitaNotification[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
};

const saveNotificationsCache = (notifs: CitaNotification[]) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(notifs)); } catch {}
};

const loadCreatedAtMap = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(CREATED_AT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const saveCreatedAtMap = (map: Record<string, number>) => {
  try { localStorage.setItem(CREATED_AT_KEY, JSON.stringify(map)); } catch {}
};

const getHaceMinutos = (createdAt: number): string => {
  const diffMinutes = Math.floor((Date.now() - createdAt) / 60000);

  if (diffMinutes < 1) return "Hace un momento";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return hours === 1 ? "Hace 1 h" : `Hace ${hours} h`;
  }

  const days = Math.floor(diffMinutes / 1440);
  return days === 1 ? "Hace 1 d" : `Hace ${days} d`;
};

const getHaceMinutosCompleto = (createdAt: number): string => {
  const diffMinutes = Math.floor((Date.now() - createdAt) / 60000);
  if (diffMinutes < 1) return "Hace un momento";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const days = Math.floor(diffMinutes / 1440);
  const hours = Math.floor((diffMinutes % 1440) / 60);
  const minutes = diffMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return `Hace ${parts.join(" ")}`;
};

// Convierte fecha "YYYY-MM-DD" + hora "HH:MM" a timestamp ms
const citaDateMs = (fecha: string, hora: string): number => {
  const [h, m] = (hora || "00:00").split(":").map(Number);
  const [y, mo, d] = (fecha || "2000-01-01").split("-").map(Number);
  return new Date(y, mo - 1, d, h || 0, m || 0, 0).getTime();
};

const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getInitials = (name: string): string =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type UrgencyTier = "critical" | "warning" | "overdue";

const getUrgencyTier = (min: number): UrgencyTier => {
  if (min === 0) return "overdue";
  if (min <= 3) return "critical";
  return "warning";
};

const tierStyles: Record<
  UrgencyTier,
  { border: string; pill: string; iconColor: string }
> = {
  critical: {
    border: "border-rose-500/70",
    pill: "bg-rose-500/15 border-rose-500/40 text-rose-400",
    iconColor: "text-rose-400",
  },
  warning: {
    border: "border-orange-primary/60",
    pill: "bg-orange-primary/10 border-orange-primary/40 text-orange-primary",
    iconColor: "text-orange-primary",
  },
  overdue: {
    border: "border-gray-dark",
    pill: "bg-gray-darker border-gray-dark text-gray-lightest",
    iconColor: "text-gray-lighter",
  },
};

const loadActionedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(ACTIONED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const saveActionedIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(ACTIONED_KEY, JSON.stringify([...ids]));
  } catch {}
};

export function CitaNotificationBell({ isOnAgendamientos, onNavigateToAgendamientos }: CitaNotificationBellProps) {
  const { success, error: alertError, AlertContainer } = useCustomAlert();
  // Carga cache inmediatamente — muestra notifs aunque API esté caída
  const [notifications, setNotifications] = useState<CitaNotification[]>(() => {
    const cached = loadNotificationsCache();
    const actionedIds = loadActionedIds();
    return cached.filter(n => !actionedIds.has(n.id));
  });
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [showModalParcial, setShowModalParcial] = useState(false);
  const [citaParcialActual, setCitaParcialActual] = useState<Agendamiento | null>(null);
  const [confirmPendiente, setConfirmPendiente] = useState<{ citaId: number; notifId: string; tipo: 'completar' | 'cancelar' } | null>(null);
  const citasMapRef = useRef<Map<number, Agendamiento>>(new Map());
  const [clientesFotoMap, setClientesFotoMap] = useState<Map<number, string>>(new Map());
  // _tick fuerza re-render cada 60s para actualizar "Hace X min" en tiempo real
  const [_tick, setTick] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionedRef = useRef<Set<string>>(loadActionedIds());

  const [fotosListas, setFotosListas] = useState(false);

  // Timer para actualizar textos de tiempo sin depender de checkCitas
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Load client photos once on mount
  useEffect(() => {
    let cancelled = false;
    clientesService.getClientes().then((clientes) => {
      if (cancelled) return;
      const map = new Map<number, string>();
      clientes.forEach((c: any) => {
        const foto = c.fotoPerfil || c.FotoPerfil;
        if (foto && c.id) map.set(Number(c.id), foto);
      });
      setClientesFotoMap(map);
      setFotosListas(true);
    }).catch(() => {
      // photos failed — still run checkCitas without photos
      setFotosListas(true);
    });
    return () => { cancelled = true; };
  }, []);

  const checkCitas = useCallback(async () => {
    try {
      const [porTerminar, todasCitas] = await Promise.all([
        agendamientoService.getCitasPorTerminar(),
        agendamientoService.getAgendamientos(),
      ]);

      const newCitasMap = new Map<number, Agendamiento>();
      [...porTerminar, ...todasCitas].forEach((c) => { if (c.id) newCitasMap.set(c.id, c); });
      citasMapRef.current = newCitasMap;

      const now = new Date();
      const todayStr = toLocalDateString(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const actionedIds = loadActionedIds();
      const createdAtMap = loadCreatedAtMap();
      let createdAtChanged = false;

      const allApiIds = new Set([
        ...porTerminar.map((c) => `cita-${c.id}`),
        ...todasCitas.map((c) => `cita-${c.id}`),
      ]);
      for (const id of [...actionedIds]) {
        if (!allApiIds.has(id)) {
          actionedIds.delete(id);
          actionedRef.current.delete(id);
          if (id in createdAtMap) { delete createdAtMap[id]; createdAtChanged = true; }
        }
      }
      saveActionedIds(actionedIds);

      const notifMap = new Map<string, CitaNotification>();

      porTerminar.forEach((cita) => {
        const notifId = `cita-${cita.id}`;
        if (actionedRef.current.has(notifId)) return;
        // Usar tiempo real de la cita como base — evita "Hace un momento" cuando localStorage se pierde
        const apptMs = citaDateMs(cita.fecha, cita.hora);
        if (!createdAtMap[notifId] || createdAtMap[notifId] > apptMs) {
          createdAtMap[notifId] = apptMs;
          createdAtChanged = true;
        }
        notifMap.set(notifId, {
          id: notifId,
          citaId: cita.id,
          clienteId: cita.clienteId,
          clienteNombre: cita.clienteNombre || "Cliente",
          clienteFotoPerfil: clientesFotoMap.get(cita.clienteId) || null,
          servicioNombre: cita.servicioNombre || cita.paqueteNombre || "Servicio",
          barberoNombre: cita.barberoNombre || "Barbero",
          hora: cita.hora,
          fecha: cita.fecha,
          minutosRestantes: 0,
          createdAt: apptMs,
        });
      });

      // El backend cubre citas ya terminadas. El frontend cubre únicamente
      // las que están en los últimos 10 minutos antes de terminar (ventana en tiempo real).
      todasCitas.forEach((cita) => {
        if (cita.estado === "Cancelada" || cita.estado === "Completada") return;
        if (cita.fecha !== todayStr) return;
        const notifId = `cita-${cita.id}`;
        if (actionedRef.current.has(notifId)) return;
        if (notifMap.has(notifId)) return;

        const [hStr, mStr] = (cita.hora || "00:00").split(":");
        const citaStartMin = parseInt(hStr) * 60 + parseInt(mStr || "0");
        const duracion = Number(cita.duracion || 60);
        const citaEndMin = citaStartMin + duracion;
        const minutosRestantes = citaEndMin - currentMinutes;

        // Mostrar solo cuando falten 10 minutos (o menos) para terminar
        if (minutosRestantes > 0 && minutosRestantes <= 10) {
          const apptMs = citaDateMs(cita.fecha, cita.hora);
          if (!createdAtMap[notifId]) { createdAtMap[notifId] = apptMs; createdAtChanged = true; }
          notifMap.set(notifId, {
            id: notifId,
            citaId: cita.id,
            clienteId: cita.clienteId,
            clienteNombre: cita.clienteNombre || "Cliente",
            clienteFotoPerfil: clientesFotoMap.get(cita.clienteId) || null,
            servicioNombre: cita.servicioNombre || cita.paqueteNombre || "Servicio",
            barberoNombre: cita.barberoNombre || "Barbero",
            hora: cita.hora,
            fecha: cita.fecha,
            minutosRestantes: Math.ceil(minutosRestantes),
            createdAt: apptMs,
          });
        }
      });

      if (createdAtChanged) saveCreatedAtMap(createdAtMap);
      const next = [...notifMap.values()];
      saveNotificationsCache(next);
      setNotifications(next);
    } catch {
      // API down — keep cached notifications visible
    }
  }, [clientesFotoMap]);

  useEffect(() => {
    if (!fotosListas) return; // wait for photos before first run
    checkCitas();
    const interval = setInterval(checkCitas, 60_000);
    return () => clearInterval(interval);
  }, [checkCitas, fotosListas]);

  const removeAfterAction = useCallback((id: string) => {
    actionedRef.current.add(id);
    const actionedIds = loadActionedIds();
    actionedIds.add(id);
    saveActionedIds(actionedIds);
    const createdAtMap = loadCreatedAtMap();
    delete createdAtMap[id];
    saveCreatedAtMap(createdAtMap);
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      saveNotificationsCache(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (showModalParcial) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showModalParcial) setOpen(false);
    };
    // Elimina notif al instante cuando se cambia estado desde detalle de cita
    const onCitaEstadoChanged = (e: Event) => {
      const { citaId, estado } = (e as CustomEvent<{ citaId: number; estado: string }>).detail;
      if (estado === "Completada" || estado === "Cancelada") {
        removeAfterAction(`cita-${citaId}`);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("cita-estado-changed", onCitaEstadoChanged);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("cita-estado-changed", onCitaEstadoChanged);
    };
  }, [removeAfterAction, showModalParcial]);

  const handleAction = async (citaId: number, estado: string, notifId: string) => {
    setLoadingId(citaId);
    try {
      await agendamientoService.updateAgendamientoStatus(citaId, estado);
      removeAfterAction(notifId);
      window.dispatchEvent(new CustomEvent("cita-estado-changed", { detail: { citaId, estado } }));
      if (estado === "Completada") {
        success("Cita completada", "Registrada como venta correctamente.");
      } else {
        success("Cita cancelada", "La cita fue cancelada.");
      }
    } catch (err: any) {
      alertError("Error", err?.message || "No se pudo actualizar el estado.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerCita = (hora: string, fecha: string, citaId: number) => {
    setOpen(false);
    if (isOnAgendamientos) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("scroll-to-cita-hora", { detail: { hora, fecha, citaId } })
        );
      }, 80);
    } else {
      (window as any).__pendingScrollToCita = { hora, fecha, citaId };
      onNavigateToAgendamientos();
    }
  };

  const activeCount = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <div className="relative inline-flex">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Notificaciones de citas"
          aria-expanded={open}
          type="button"
          className="flex items-center justify-center p-1 transition-colors duration-200 cursor-pointer"
        >
          <Bell
            className={`w-8 h-8 transition-colors duration-200 ${
              activeCount > 0
                ? "text-orange-primary fill-orange-primary"
                : "text-gray-lighter hover:text-gray-lightest"
            }`}
          />
        </button>
        {activeCount > 0 && (
          <span className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-none pointer-events-none z-10 border-2 border-gray-darkest">
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-dark/80 bg-gray-darkest shadow-2xl overflow-hidden"
          style={
            {
              "--tw-enter-opacity": "0",
              "--tw-enter-translate-y": "-6px",
              animation: "enter 0.15s ease forwards",
            } as React.CSSProperties
          }
        >
          {/* Overlay cuando modal parcial está abierto — misma intensidad que el backdrop del modal */}
          {showModalParcial && (
            <div className="absolute inset-0 z-10 bg-black/50 rounded-2xl pointer-events-auto" />
          )}
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark/60 bg-gray-darker/40">
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-orange-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white-primary leading-none">Citas por terminar</p>
                {activeCount > 0 && (
                  <p className="text-[10px] text-gray-lighter mt-0.5">
                    {activeCount} requiere{activeCount !== 1 ? "n" : ""} acción
                  </p>
                )}
              </div>
            </div>
            {activeCount > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-primary/15 border border-orange-primary/30 text-[10px] font-bold text-orange-primary">
                {activeCount}
              </span>
            )}
          </div>

          {/* List */}
          <div className="relative">
            <div
              className="overflow-y-auto overscroll-contain custom-scrollbar"
              style={{ maxHeight: "420px" }}
            >
              {activeCount === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gray-darker border border-gray-dark">
                    <CalendarDays className="w-5 h-5 text-gray-lighter opacity-50" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-lightest">Todo al día</p>
                    <p className="text-xs text-gray-lighter mt-0.5">Sin citas por terminar ahora</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 space-y-2.5">
                  {notifications.map((notif) => {
                    const tier = getUrgencyTier(notif.minutosRestantes);
                    const ts = tierStyles[tier];
                    const isLoading = loadingId === notif.citaId;
                    return (
                      <div
                        key={notif.id}
                        className={`rounded-xl border border-l-2 bg-gray-darker/40 hover:bg-gray-darker/60 transition-colors duration-150 overflow-hidden shadow-sm ${ts.border}`}
                      >
                        {/* Clickable info area — avatar + name + service/barber + pill */}
                        <button
                          type="button"
                          onClick={() => handleVerCita(notif.hora, notif.fecha, notif.citaId)}
                          className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/[0.02] transition-colors duration-150 cursor-pointer"
                          aria-label={`Ver cita de ${notif.clienteNombre} en el calendario`}
                        >
                          <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border-2 border-orange-primary/30 bg-orange-primary/10 flex items-center justify-center">
                            {notif.clienteFotoPerfil ? (
                              <img
                                src={notif.clienteFotoPerfil}
                                alt={notif.clienteNombre}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-orange-primary text-xs font-bold">
                                {getInitials(notif.clienteNombre)}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-white-primary truncate leading-tight">
                                {notif.clienteNombre}
                              </p>
                              <span className="shrink-0 text-sm font-normal text-gray-lighter leading-tight">
                                {notif.fecha.split("-").reverse().join("/")}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <User className="w-3 h-3 text-gray-lighter shrink-0" />
                              <span className="text-xs text-gray-lighter truncate">{notif.barberoNombre}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Scissors className="w-3 h-3 text-gray-lighter shrink-0" />
                              <span className="text-xs text-gray-lightest truncate">
                                {notif.servicioNombre}
                              </span>
                            </div>
                          </div>
                        </button>

                        {/* Bottom row: tiempo izq + acciones der */}
                        <div className="flex justify-between items-center px-3 pb-3">
                          {notif.minutosRestantes > 0 ? (
                            <span className="text-[10px] font-normal text-orange-primary">
                              {`Termina en ${notif.minutosRestantes} min`}
                            </span>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-[10px] font-normal text-gray-lighter cursor-default">
                                  {getHaceMinutos(notif.createdAt)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {getHaceMinutosCompleto(notif.createdAt)}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <div className="flex gap-2">
                            {notif.minutosRestantes <= 0 && (
                              <>
                                <button
                                  disabled={isLoading}
                                  onClick={() => setConfirmPendiente({ citaId: notif.citaId, notifId: notif.id, tipo: 'completar' })}
                                  aria-label="Completar cita"
                                  title="Completar"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/30 hover:border-green-500/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  type="button"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  disabled={isLoading}
                                  onClick={async () => {
                                    let fullCita = citasMapRef.current.get(notif.citaId);
                                    if (!fullCita) {
                                      try {
                                        fullCita = await agendamientoService.getAgendamientoById(notif.citaId);
                                        if (fullCita?.id) citasMapRef.current.set(fullCita.id, fullCita);
                                      } catch {
                                        alertError("Error", "No se pudo cargar la cita.");
                                        return;
                                      }
                                    }
                                    setCitaParcialActual(fullCita);
                                    setShowModalParcial(true);
                                  }}
                                  aria-label="Completar parcialmente"
                                  title="Completar parcialmente"
                                  className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-primary/15 border border-orange-primary/40 text-orange-primary hover:bg-orange-primary/25 hover:border-orange-primary/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                  type="button"
                                >
                                  <ListChecks className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            <button
                              disabled={isLoading}
                              onClick={() => setConfirmPendiente({ citaId: notif.citaId, notifId: notif.id, tipo: 'cancelar' })}
                              aria-label="Cancelar cita"
                              title="Cancelar"
                              className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-500/30 text-red-400/70 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              type="button"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {activeCount > 2 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-darkest to-transparent" />
            )}
          </div>
        </div>
      )}
      {showModalParcial && citaParcialActual && (
        <ModalCompletarParcialmente
          isOpen={showModalParcial}
          cita={citaParcialActual}
          onClose={() => {
            setShowModalParcial(false);
            setCitaParcialActual(null);
          }}
          onComplete={async (servicios, productos) => {
            await agendamientoService.completarParcialmente(citaParcialActual.id, {
              serviciosCompletados: servicios,
              productosCompletados: productos,
              estado: "Completada"
            });
            removeAfterAction(`cita-${citaParcialActual.id}`);
            window.dispatchEvent(new CustomEvent("cita-estado-changed", { detail: { citaId: citaParcialActual.id, estado: "Completada" } }));
            success("Cita completada", "El estado ha sido actualizado correctamente.");
          }}
        />
      )}
      <AlertContainer />
    </div>
  );
}