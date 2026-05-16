import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, X, Clock, User, Scissors, CalendarDays } from "lucide-react";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { clientesService } from "../../clientes/services/clientesService";
import { toast } from "../../../shared/components/ui/notify";

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

const STORAGE_KEY = "cita_notifications_pending";
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
  const diff = Math.floor((Date.now() - createdAt) / 60000);
  if (diff < 1) return "Hace un momento";
  if (diff === 1) return "Hace 1 min";
  return `Hace ${diff} min`;
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

const loadPersistedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

const savePersistedIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {}
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
  // Carga cache inmediatamente — muestra notifs aunque API esté caída
  const [notifications, setNotifications] = useState<CitaNotification[]>(() => {
    const cached = loadNotificationsCache();
    const actionedIds = loadActionedIds();
    return cached.filter(n => !actionedIds.has(n.id));
  });
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
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
      const citas = await agendamientoService.getAgendamientos();
      const now = new Date();
      const todayStr = toLocalDateString(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const persistedIds = loadPersistedIds();
      const actionedIds = loadActionedIds();
      const apiCitaIds = new Set(citas.map((c: any) => `cita-${c.id}`));

      const createdAtMap = loadCreatedAtMap();
      let createdAtChanged = false;

      let persistedChanged = false;
      for (const id of [...persistedIds]) {
        if (!apiCitaIds.has(id)) {
          persistedIds.delete(id);
          persistedChanged = true;
          if (id in createdAtMap) { delete createdAtMap[id]; createdAtChanged = true; }
        }
      }
      if (persistedChanged) savePersistedIds(persistedIds);

      let actionedChanged = false;
      for (const id of [...actionedIds]) {
        if (!apiCitaIds.has(id)) {
          actionedIds.delete(id);
          actionedRef.current.delete(id);
          actionedChanged = true;
          if (id in createdAtMap) { delete createdAtMap[id]; createdAtChanged = true; }
        }
      }
      if (actionedChanged) saveActionedIds(actionedIds);
      if (createdAtChanged) saveCreatedAtMap(createdAtMap);

      const incoming: CitaNotification[] = [];

      citas.forEach((cita: any) => {
        const notifId = `cita-${cita.id}`;
        const wasPersisted = persistedIds.has(notifId);

        if (cita.estado === "Cancelada" || cita.estado === "Completada") {
          if (wasPersisted) {
            persistedIds.delete(notifId);
            savePersistedIds(persistedIds);
          }
          if (actionedIds.has(notifId)) {
            actionedIds.delete(notifId);
            actionedRef.current.delete(notifId);
            saveActionedIds(actionedIds);
          }
          return;
        }

        if (!wasPersisted && cita.fecha !== todayStr) return;

        const [hStr, mStr] = (cita.hora || "00:00").split(":");
        const citaStartMin = parseInt(hStr) * 60 + parseInt(mStr || "0");
        const duracion = Number(cita.duracion || 60);
        const citaEndMin = citaStartMin + duracion;

        let minutosRestantes = 0;
        let inWindow = false;
        if (cita.fecha === todayStr) {
          minutosRestantes = citaEndMin - currentMinutes;
          inWindow = minutosRestantes > 0 && minutosRestantes <= 10 && currentMinutes >= citaStartMin;
        }

        if ((inWindow || wasPersisted) && !actionedRef.current.has(notifId)) {
          if (inWindow && !wasPersisted) {
            persistedIds.add(notifId);
            savePersistedIds(persistedIds);
          }
          if (!createdAtMap[notifId]) {
            createdAtMap[notifId] = Date.now();
            saveCreatedAtMap(createdAtMap);
          }

          incoming.push({
            id: notifId,
            citaId: cita.id,
            clienteId: Number(cita.clienteId),
            clienteNombre: cita.clienteNombre || "Cliente",
            clienteFotoPerfil: clientesFotoMap.get(Number(cita.clienteId)) || null,
            servicioNombre: cita.servicioNombre || cita.paqueteNombre || "Servicio",
            barberoNombre: cita.barberoNombre || "Barbero",
            hora: cita.hora,
            fecha: cita.fecha,
            minutosRestantes: inWindow ? Math.ceil(minutosRestantes) : 0,
            createdAt: createdAtMap[notifId] ?? Date.now(),
          });
        }
      });

      setNotifications((prev) => {
        const incomingMap = new Map(incoming.map((n) => [n.id, n]));
        const updated = prev
          .filter((n) => !actionedRef.current.has(n.id))
          .map((n) => {
            const fresh = incomingMap.get(n.id);
            return fresh ? { ...n, minutosRestantes: fresh.minutosRestantes } : n;
          });
        const existingIds = new Set(updated.map((n) => n.id));
        const added = incoming.filter((n) => !existingIds.has(n.id));
        const next = [...updated, ...added];
        saveNotificationsCache(next);
        return next;
      });
    } catch {
      // API caída — no tocar estado ni cache, notifs del cache siguen visibles
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
    const persistedIds = loadPersistedIds();
    persistedIds.delete(id);
    savePersistedIds(persistedIds);
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
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
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
  }, [removeAfterAction]);

  const handleAction = async (citaId: number, estado: string, notifId: string) => {
    setLoadingId(citaId);
    try {
      await agendamientoService.updateAgendamientoStatus(citaId, estado);
      removeAfterAction(notifId);
      if (estado === "Completada") {
        toast.success("Cita completada", { description: "Registrada como venta correctamente." });
      } else {
        toast.success("Cita cancelada", { description: "La cita fue cancelada." });
      }
    } catch (err: any) {
      toast.error("Error", { description: err?.message || "No se pudo actualizar el estado." });
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerCita = (hora: string, fecha: string, citaId: number) => {
    setOpen(false);
    if (!isOnAgendamientos) onNavigateToAgendamientos();
    const delay = isOnAgendamientos ? 80 : 500;
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("scroll-to-cita-hora", { detail: { hora, fecha, citaId } })
      );
    }, delay);
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
                              <span className="shrink-0 text-[9px] text-gray-lighter">
                                {getHaceMinutos(notif.createdAt)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <Scissors className="w-3 h-3 text-gray-lighter shrink-0" />
                              <span className="text-xs text-gray-lightest truncate max-w-[110px]">
                                {notif.servicioNombre}
                              </span>
                              <span className="text-gray-dark text-xs">·</span>
                              <User className="w-3 h-3 text-gray-lighter shrink-0" />
                              <span className="text-xs text-gray-lighter truncate">{notif.barberoNombre}</span>
                            </div>
                          </div>
                        </button>

                        {/* Bottom row: tiempo restante izq + acciones der */}
                        <div className="flex justify-between items-center px-3 pb-3">
                          <span className={`text-[10px] font-medium ${notif.minutosRestantes > 0 ? "text-orange-primary" : "text-gray-lighter"}`}>
                            {notif.minutosRestantes > 0 ? `Termina en ${notif.minutosRestantes} min` : "Pendiente"}
                          </span>
                          <div className="flex gap-2">
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(notif.citaId, "Completada", notif.id)}
                              aria-label="Completar cita"
                              title="Completar"
                              className="flex items-center justify-center w-8 h-8 rounded-lg bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/30 hover:border-green-500/60 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                              type="button"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(notif.citaId, "Cancelada", notif.id)}
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
    </div>
  );
}