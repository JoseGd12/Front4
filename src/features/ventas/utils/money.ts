/**
 * Utilidades de aritmética monetaria para COP.
 *
 * COP no tiene centavos en la práctica, así que trabajamos con pesos enteros.
 * Las operaciones se hacen en enteros para evitar errores de punto flotante
 * (ej: 29999 * 0.3333 = 9999.0167... con floats; aquí = 9999 exacto).
 *
 * El backend es la fuente de verdad del total final — estas funciones solo
 * sirven para mostrar feedback al usuario antes de confirmar.
 */

/** Multiplica precio × cantidad retornando pesos enteros. */
export function calcSubtotal(precio: number, cantidad: number): number {
  return Math.round(precio) * Math.round(cantidad);
}

/**
 * Aplica un porcentaje de descuento sobre un subtotal.
 * Redondea al peso más cercano (sin centavos).
 * @param subtotal  Total sobre el que se aplica
 * @param porcentaje  Ej: 15 para 15%
 */
export function calcDescuento(subtotal: number, porcentaje: number): number {
  if (porcentaje <= 0) return 0;
  if (porcentaje >= 100) return Math.round(subtotal);
  // Multiplicamos por 100 para trabajar con enteros y luego dividimos
  return Math.round((Math.round(subtotal) * Math.round(porcentaje * 100)) / 10000);
}

/**
 * Calcula el total final: subtotal - descuento.
 * Garantiza que nunca sea negativo.
 */
export function calcTotal(subtotal: number, descuento: number): number {
  return Math.max(0, Math.round(subtotal) - Math.round(descuento));
}

/**
 * Formatea un valor en pesos colombianos.
 * Ej: 29999 → "$29.999"
 */
export function formatCOP(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}
