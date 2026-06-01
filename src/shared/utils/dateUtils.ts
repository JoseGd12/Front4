/**
 * Utilidades para formateo de fechas y horas.
 *
 * El backend devuelve horas en formato 24h ("14:30" o ISO "2026-05-04T14:30:00").
 * El UI las muestra siempre en formato 12h ("2:30 PM").
 */

/** Formatea minutos: <60 → "30 min" | >=60 → "1h", "1h 30min" */
export function formatDuracion(minutos: number | null | undefined): string {
  const m = Number(minutos) || 0;
  if (m <= 0) return '0 min';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}min`;
}

/**
 * Convierte un string de hora 24h ("14:30" o "14:30:00") a 12h ("2:30 PM").
 * Si recibe un ISO datetime, extrae la parte de hora.
 */
export function formatTo12h(value: string | null | undefined): string {
  if (!value) return '';
  let hours: number;
  let minutes: number;

  // ISO datetime
  if (typeof value === 'string' && value.includes('T')) {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    hours = d.getHours();
    minutes = d.getMinutes();
  } else {
    const parts = String(value).split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return '';
    hours = parts[0];
    minutes = parts[1];
  }

  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Convierte un string de hora 12h ("2:30 PM") a 24h ("14:30") para enviar al backend.
 */
export function parseTo24h(time12: string | null | undefined): string {
  if (!time12) return '';
  const trimmed = String(time12).trim();
  // Si ya es 24h, devolver tal cual (o normalizado)
  if (!/(am|pm)/i.test(trimmed)) {
    const parts = trimmed.split(':').map(Number);
    if (parts.length >= 2 && !parts.some(isNaN)) {
      return `${String(parts[0]).padStart(2, '0')}:${String(parts[1]).padStart(2, '0')}`;
    }
    return '';
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return '';
  let h = Number(match[1]);
  const m = Number(match[2]);
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Convierte un rango de horas 24h a un string legible 12h.
 * Ejemplo: rangeTo12h("09:00", "17:30") -> "9:00 AM - 5:30 PM"
 */
export function rangeTo12h(start: string | null | undefined, end: string | null | undefined): string {
  const s = formatTo12h(start);
  const e = formatTo12h(end);
  if (!s && !e) return '';
  if (!s) return e;
  if (!e) return s;
  return `${s} - ${e}`;
}

/**
 * Formatea una fecha ISO o Date a "DD/MM/YYYY".
 */
export function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Formatea una fecha ISO o Date a "DD/MM/YYYY 2:30 PM".
 */
export function formatDateTime12h(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(d.getTime())) return '';
  const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const hora = formatTo12h(`${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`);
  return `${fecha} ${hora}`;
}
