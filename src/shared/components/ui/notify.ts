import { toast as sonnerToast } from "sonner";
import { normalizeNotificationMessage, normalizeNotificationTitle } from "../../utils/notificationText";

type ToastOptions = Record<string, any> | undefined;

const normalizeOptions = (options?: ToastOptions): ToastOptions => {
  if (!options) return options;
  const description = normalizeNotificationMessage(options.description);
  return {
    ...options,
    ...(options.description !== undefined ? { description } : {})
  };
};

const titleFrom = (value: any) => normalizeNotificationTitle(typeof value === "string" ? value : String(value ?? ""));

export const toast = {
  success(message: any, options?: ToastOptions) {
    return sonnerToast.success(titleFrom(message), normalizeOptions(options));
  },
  error(message: any, options?: ToastOptions) {
    return sonnerToast.error(titleFrom(message), normalizeOptions(options));
  },
  info(message: any, options?: ToastOptions) {
    return sonnerToast.info(titleFrom(message), normalizeOptions(options));
  },
  warning(message: any, options?: ToastOptions) {
    return sonnerToast.warning(titleFrom(message), normalizeOptions(options));
  },
  loading(message: any, options?: ToastOptions) {
    return sonnerToast.loading(titleFrom(message), normalizeOptions(options));
  },
  message(message: any, options?: ToastOptions) {
    return sonnerToast.message(titleFrom(message), normalizeOptions(options));
  },
  custom: sonnerToast.custom,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss
};
