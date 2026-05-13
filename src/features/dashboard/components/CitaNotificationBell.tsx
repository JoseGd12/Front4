import { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Check, X, Clock, User, Scissors, CalendarDays } from "lucide-react";
import { agendamientoService } from "../../agendamiento/services/agendamientoService";
import { toast } from "../../../shared/components/ui/notify";

interface CitaNotification {
  id: string;
  citaId: number;
  clienteNombre: string;
  servicioNombre: string;
  barberoNombre: string;
  hora: string;
  fecha: string;
  minutosRestantes: number;
}

interface CitaNotificationBellProps {
  isOnAgendamientos: boolean;
  onNavigateToAgendamientos: () => void;
}

const STORAGE_KEY = "cita_notifications_pending";
const ACTIONED_KEY = "cita_notifications_actioned";

const toLocalDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatHora12 = (hora: string): string => {
  const [hStr, mStr] = hora.split(":");
  const h = parseInt(hStr);
  const m = parseInt(mStr || "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

/** Load persisted notification IDs from localStorage */
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

/** Save the current set of pending notification IDs to localStorage */
const savePersistedIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
};

/** Load actioned IDs from localStorage (persists across reloads) */
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

/** Save actioned IDs to localStorage */
const saveActionedIds = (ids: Set<string>) => {
  try {
    localStorage.setItem(ACTIONED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage errors
  }
};

export function CitaNotificationBell({ isOnAgendamientos, onNavigateToAgendamientos }: CitaNotificationBellProps) {
  const [notifications, setNotifications] = useState<CitaNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // In-memory set of IDs that were actioned this session (Completar/Cancelar)
  // These are also removed from localStorage immediately on action.
  const actionedRef = useRef<Set<string>>(loadActionedIds());

  const checkCitas = useCallback(async () => {
    try {
      const citas = await agendamientoService.getAgendamientos();
      const now = new Date();
      const todayStr = toLocalDateString(now);
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Load persisted IDs — citas the admin hasn't acted on yet
      const persistedIds = loadPersistedIds();
      // Load actioned IDs — persists across reloads so resolved citas don't reappear
      const actionedIds = loadActionedIds();

      // Build a set of all cita IDs returned by the API
      const apiCitaIds = new Set(citas.map((c: any) => `cita-${c.id}`));

      // Clean up orphaned IDs from localStorage (citas deleted from backend)
      let persistedChanged = false;
      for (const id of [...persistedIds]) {
        if (!apiCitaIds.has(id)) {
          persistedIds.delete(id);
          persistedChanged = true;
        }
      }
      if (persistedChanged) savePersistedIds(persistedIds);

      // Clean up actioned IDs that are no longer in the API (deleted citas)
      let actionedChanged = false;
      for (const id of [...actionedIds]) {
        if (!apiCitaIds.has(id)) {
          actionedIds.delete(id);
          actionedRef.current.delete(id);
          actionedChanged = true;
        }
      }
      if (actionedChanged) saveActionedIds(actionedIds);

      const incoming: CitaNotification[] = [];

      citas.forEach((cita: any) => {
        const notifId = `cita-${cita.id}`;
        const wasPersisted = persistedIds.has(notifId);

        // If already resolved in backend, clean up persistence regardless of date
        if (cita.estado === "Cancelada" || cita.estado === "Completada") {
          if (wasPersisted) {
            persistedIds.delete(notifId);
            savePersistedIds(persistedIds);
          }
          // Also clean from actioned since backend already reflects the final state
          if (actionedIds.has(notifId)) {
            actionedIds.delete(notifId);
            actionedRef.current.delete(notifId);
            saveActionedIds(actionedIds);
          }
          return;
        }

        // For non-persisted citas, only check today's appointments
        if (!wasPersisted && cita.fecha !== todayStr) return;

        const [hStr, mStr] = (cita.hora || "00:00").split(":");
        const citaStartMin = parseInt(hStr) * 60 + parseInt(mStr || "0");
        const duracion = Number(cita.duracion || 60);
        const citaEndMin = citaStartMin + duracion;

        // For today's citas, compute minutes remaining
        // For persisted citas from other days, minutosRestantes = 0 (overdue)
        let minutosRestantes = 0;
        let inWindow = false;
        if (cita.fecha === todayStr) {
          minutosRestantes = citaEndMin - currentMinutes;
          inWindow = minutosRestantes > 0 && minutosRestantes <= 10 && currentMinutes >= citaStartMin;
        }

        if ((inWindow || wasPersisted) && !actionedRef.current.has(notifId)) {
          // Persist if newly entering the window
          if (inWindow && !wasPersisted) {
            persistedIds.add(notifId);
            savePersistedIds(persistedIds);
          }

          incoming.push({
            id: notifId,
            citaId: cita.id,
            clienteNombre: cita.clienteNombre || "Cliente",
            servicioNombre: cita.servicioNombre || cita.paqueteNombre || "Servicio",
            barberoNombre: cita.barberoNombre || "Barbero",
            hora: cita.hora,
            fecha: cita.fecha,
            minutosRestantes: inWindow ? Math.ceil(minutosRestantes) : 0,
          });
        }
      });

      setNotifications(prev => {
        const incomingMap = new Map(incoming.map(n => [n.id, n]));
        // Keep existing non-actioned notifications, update their countdown
        const updated = prev
          .filter(n => !actionedRef.current.has(n.id))
          .map(n => {
            const fresh = incomingMap.get(n.id);
            return fresh ? { ...n, minutosRestantes: fresh.minutosRestantes } : n;
          });
        // Add brand-new ones not already in the list
        const existingIds = new Set(updated.map(n => n.id));
        const added = incoming.filter(n => !existingIds.has(n.id));
        return [...updated, ...added];
      });
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    checkCitas();
    const interval = setInterval(checkCitas, 60_000);
    return () => clearInterval(interval);
  }, [checkCitas]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const removeAfterAction = (id: string) => {
    // Mark as actioned in memory and persist across reloads
    actionedRef.current.add(id);
    const actionedIds = loadActionedIds();
    actionedIds.add(id);
    saveActionedIds(actionedIds);
    // Remove from pending persistence
    const persistedIds = loadPersistedIds();
    persistedIds.delete(id);
    savePersistedIds(persistedIds);
    // Remove from UI
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

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
    if (!isOnAgendamientos) {
      onNavigateToAgendamientos();
    }
    // Si ya estamos en agendamientos usamos 80 ms (suficiente para cerrar el dropdown
    // y que React procese el setState del cambio de semana antes de recibir el evento).
    // Si hay que navegar primero al módulo, 500 ms para que cargue la página.
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
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gray-darker border border-gray-dark hover:border-orange-primary/50 hover:bg-gray-dark transition-all duration-200"
        title="Notificaciones de citas"
        type="button"
      >
        <Bell className={`w-4 h-4 ${activeCount > 0 ? "text-orange-primary" : "text-gray-lightest"}`} />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 rounded-full bg-orange-primary text-black text-[9px] font-black leading-none animate-pulse">
            {activeCount > 9 ? "9+" : activeCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-gray-dark bg-gray-darkest shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-dark bg-gray-darker/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-primary" />
              <span className="text-sm font-semibold text-white-primary">Notificaciones</span>
            </div>
            {activeCount > 0 && (
              <span className="text-[10px] text-orange-primary font-bold uppercase tracking-wider">
                {activeCount} pendiente{activeCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* List — máx. 2 tarjetas visibles; scroll aislado del resto de la página */}
          <div className="relative">
            <div
              className="overflow-y-auto overscroll-contain custom-scrollbar"
              style={{ maxHeight: '420px' }}
            >
            {activeCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-lighter">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">Sin notificaciones activas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-dark/50">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-4 hover:bg-gray-darker/40 transition-colors">
                    {/* Urgency */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <Clock className="w-3.5 h-3.5 text-orange-primary shrink-0" />
                      <span className="text-[11px] font-bold text-orange-primary uppercase tracking-wider">
                        {notif.minutosRestantes > 0
                          ? `Termina en ${notif.minutosRestantes} min`
                          : "Pendiente de resolución"}
                      </span>
                      {notif.minutosRestantes === 0 && (
                        <span className="text-[10px] text-gray-lighter ml-auto shrink-0">
                          {notif.fecha}
                        </span>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-lighter shrink-0" />
                        <span className="text-sm font-semibold text-white-primary truncate">
                          {notif.clienteNombre}
                        </span>
                        <span className="text-[10px] text-gray-lighter ml-auto shrink-0">
                          {formatHora12(notif.hora)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Scissors className="w-3 h-3 text-gray-lighter shrink-0" />
                        <span className="text-xs text-gray-lightest truncate">{notif.servicioNombre}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-[18px]">
                        <span className="text-[11px] text-gray-lighter truncate">{notif.barberoNombre}</span>
                      </div>
                    </div>

                    {/* Ver cita */}
                    <button
                      onClick={() => handleVerCita(notif.hora, notif.fecha, notif.citaId)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 mb-2 rounded-lg bg-gray-darker border border-gray-dark text-gray-lightest text-xs font-medium hover:border-orange-primary/40 hover:text-orange-primary transition-all"
                      type="button"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      {isOnAgendamientos ? "Ir a la hora en el calendario" : "Ver en calendario"}
                    </button>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        disabled={loadingId === notif.citaId}
                        onClick={() => handleAction(notif.citaId, "Completada", notif.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-green-600/20 border border-green-600/40 text-green-400 text-xs font-semibold hover:bg-green-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {loadingId === notif.citaId ? "Guardando..." : "Completar"}
                      </button>
                      <button
                        disabled={loadingId === notif.citaId}
                        onClick={() => handleAction(notif.citaId, "Cancelada", notif.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 text-xs font-semibold hover:bg-red-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        type="button"
                      >
                        <X className="w-3.5 h-3.5" />
                        {loadingId === notif.citaId ? "Guardando..." : "Cancelar"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
            {/* Degradado inferior: pista visual de scroll cuando hay más de 2 notificaciones */}
            {activeCount > 2 && (
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-darkest to-transparent" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
