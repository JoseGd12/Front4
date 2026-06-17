type PaquetePrecio = {
  precio?: number | string | null;
  descuento?: number | string | null;
};

/** Precio final del paquete tras aplicar su descuento interno (%). */
export function calcularPrecioPaqueteConDescuento(
  paquete: PaquetePrecio | null | undefined,
  fallbackPrecio = 0
): number {
  if (!paquete) return fallbackPrecio;
  const precioOriginal = Number(paquete.precio ?? fallbackPrecio) || 0;
  const descuentoPaquete = Number(paquete.descuento ?? 0) || 0;
  if (descuentoPaquete <= 0) return precioOriginal;
  return precioOriginal - (precioOriginal * descuentoPaquete / 100);
}

/** Aplica descuento promocional del día (%) sobre un precio base. */
export function aplicarDescuentoDia(precioBase: number, descuentoDiaPct: number): number {
  const pct = Number(descuentoDiaPct) || 0;
  if (pct <= 0) return precioBase;
  return precioBase * (1 - pct / 100);
}
