import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { CheckCircle, AlertTriangle, X, Info, AlertCircle, Trash2, Edit, Plus } from "lucide-react";
import { normalizeNotificationMessage, normalizeNotificationTitle } from "../../utils/notificationText";

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'created' | 'edited' | 'deleted';

interface CustomAlertProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title: string;
  message?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

type AlertItem = {
  id: string;
  type: AlertType;
  title: string;
  message?: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
};

type AlertContextValue = {
  alerts: AlertItem[];
  add: (a: AlertItem) => void;
  remove: (id: string) => void;
};

const AlertContext = createContext<AlertContextValue | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const add = (a: AlertItem) => {
    setAlerts(prev => {
      const exists = prev.some(p => p.type === a.type && p.title === a.title && (p.message || '') === (a.message || ''));
      if (exists) return prev;
      return [a, ...prev];
    });
  };
  const remove = (id: string) => setAlerts(prev => prev.filter(al => al.id !== id));
  return (
    <AlertContext.Provider value={{ alerts, add, remove }}>
      {children}
    </AlertContext.Provider>
  );
}

const alertIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  created: Plus,
  edited: Edit,
  deleted: Trash2,
};

const alertStyles = {
  success: {
    iconColor: "text-green-400",
    borderColor: "border-green-400",
    bgColor: "bg-green-400/10"
  },
  error: {
    iconColor: "text-red-400",
    borderColor: "border-red-400",
    bgColor: "bg-red-400/10"
  },
  warning: {
    iconColor: "text-orange-secondary",
    borderColor: "border-orange-secondary",
    bgColor: "bg-orange-secondary/10"
  },
  info: {
    iconColor: "text-blue-400",
    borderColor: "border-blue-400",
    bgColor: "bg-blue-400/10"
  },
  created: {
    iconColor: "text-orange-primary",
    borderColor: "border-orange-primary",
    bgColor: "bg-orange-primary/10"
  },
  edited: {
    iconColor: "text-orange-primary",
    borderColor: "border-orange-primary",
    bgColor: "bg-orange-primary/10"
  },
  deleted: {
    iconColor: "text-red-400",
    borderColor: "border-red-400",
    bgColor: "bg-red-400/10"
  }
};

export function CustomAlert({
  isOpen,
  onClose,
  type,
  title,
  message,
  autoClose = true,
  autoCloseDelay = 8000
}: CustomAlertProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, autoClose, autoCloseDelay]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  if (!isOpen) return null;

  const Icon = alertIcons[type];
  const styles = alertStyles[type];

  return (
    <div
      data-alert-container="true"
      className={`relative elegante-card ${styles.bgColor} border-2 ${styles.borderColor} w-80 max-w-[92vw] shadow-lg transition-all duration-700 ease-out will-change-transform will-change-opacity transform ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
      style={{ pointerEvents: 'all' }}
      onPointerDownCapture={(e) => { e.stopPropagation(); }}
      onMouseDownCapture={(e) => { e.stopPropagation(); }}
      onClick={(e) => { e.stopPropagation(); }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); handleClose(); }}
        onMouseDown={(e) => { e.stopPropagation(); }}
        onPointerDown={(e) => { e.stopPropagation(); }}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-gray-darker transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4 text-gray-lighter" />
      </button>
      <div className="pr-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={`w-6 h-6 ${styles.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0 break-words whitespace-pre-wrap">
            <h3 className="text-white-primary font-semibold text-base mb-1">
              {title}
            </h3>
            {message && (
              <p className="text-gray-lightest text-sm leading-relaxed">
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook para manejar alertas
export function useCustomAlert() {
  const ctx = useContext(AlertContext);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const showAlert = (
    type: AlertType,
    title: string,
    message?: string,
    options?: {
      autoClose?: boolean;
      autoCloseDelay?: number;
    }
  ) => {
    const id = Date.now().toString();
    const normalizedTitle = normalizeNotificationTitle(title);
    const normalizedMessage = normalizeNotificationMessage(message);
    const alert: AlertItem = {
      id,
      type,
      title: normalizedTitle,
      message: normalizedMessage,
      autoClose: options?.autoClose ?? true,
      autoCloseDelay: options?.autoCloseDelay ?? 8000,
    };

    if (ctx) {
      ctx.add(alert);
    } else {
      setAlerts(prev => [alert, ...prev]);
    }

    return id;
  };

  const removeAlert = (id: string) => {
    if (ctx) ctx.remove(id);
    else setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const success = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('success', title, message, options);

  const error = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('error', title, message, options);

  const warning = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('warning', title, message, options);

  const info = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('info', title, message, options);

  const created = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('created', title, message, options);

  const edited = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('edited', title, message, options);

  const deleted = (title: string, message?: string, options?: { autoClose?: boolean; autoCloseDelay?: number }) =>
    showAlert('deleted', title, message, options);

  const AlertContainer = () => {
    if (ctx) return null;
    return (
      <div
        data-alert-root="true"
        className="fixed z-alert flex flex-col items-end gap-3 pointer-events-none"
        style={{
          bottom: `max(env(safe-area-inset-bottom), 24px)`,
          right: `max(env(safe-area-inset-right), 24px)`,
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          paddingLeft: '12px'
        }}
      >
        {alerts.map((alert) => (
          <div key={alert.id} className="pointer-events-auto">
            <CustomAlert
              // Marca cada alerta para facilitar detección de clic externo
              isOpen={true}
              onClose={() => removeAlert(alert.id)}
              type={alert.type}
              title={alert.title}
              message={alert.message}
              autoClose={alert.autoClose}
              autoCloseDelay={Math.max(8000, alert.autoCloseDelay ?? 8000)}
            />
          </div>
        ))}
      </div>
    );
  };

  return {
    success,
    error,
    warning,
    info,
    created,
    edited,
    deleted,
    AlertContainer,
  };
}

export function GlobalAlertContainer() {
  const ctx = useContext(AlertContext);
  if (!ctx) return null;
  return (
    <div
      data-alert-root="true"
      className="fixed z-alert flex flex-col items-end gap-3 pointer-events-none"
      style={{
        bottom: `max(env(safe-area-inset-bottom), 24px)`,
        right: `max(env(safe-area-inset-right), 24px)`,
        maxHeight: 'calc(100vh - 48px)',
        overflowY: 'auto',
        paddingLeft: '12px'
      }}
    >
      {ctx.alerts.map((alert) => (
        <div key={alert.id} className="pointer-events-auto">
          <CustomAlert
            isOpen={true}
            onClose={() => ctx.remove(alert.id)}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            autoClose={alert.autoClose}
            autoCloseDelay={Math.max(8000, alert.autoCloseDelay ?? 8000)}
          />
        </div>
      ))}
    </div>
  );
}
