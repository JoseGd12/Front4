export type ProductoLike = {
  categoria?: { nombre?: string } | string | null;
  nombre?: string;
};

const SALE_ONLY_CATEGORIES_CANONICAL = new Set([
  'accesorios',
  'gafas',
  'audífonos',
  'audifonos',
  'cadenas'
]);

export const getCategoriaNombre = (p: ProductoLike): string => {
  const c: any = (p as any)?.categoria;
  if (typeof c === 'string') return c;
  if (c && typeof c === 'object') return String(c.nombre || '');
  return '';
};

export const canBeUsedInService = (p: ProductoLike | undefined | null): boolean => {
  if (!p) return true;
  const nombreCategoria = getCategoriaNombre(p).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (!nombreCategoria) return true;
  return !SALE_ONLY_CATEGORIES_CANONICAL.has(nombreCategoria);
};

export const isSaleOnly = (p: ProductoLike | undefined | null): boolean => !canBeUsedInService(p);

export const getUsagePolicyLabel = (p: ProductoLike | undefined | null): 'solo_venta' | 'venta_y_servicio' => {
  return canBeUsedInService(p) ? 'venta_y_servicio' : 'solo_venta';
};

