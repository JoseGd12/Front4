const isDev = import.meta.env.DEV;

/**
 * Logger condicional: los mensajes de debug solo se emiten en desarrollo.
 * En producción el build de Vite elimina console.log vía esbuild drop.
 * Nunca loguear tokens, contraseñas ni payloads completos con datos personales.
 */
export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.log(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.info(...args); },
  warn:  (...args: unknown[]) => { console.warn(...args); },
  error: (...args: unknown[]) => { console.error(...args); },
};
