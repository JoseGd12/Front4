export const PRODUCT_USAGE_KEY = 'product_usage_preferences';

export type ProductUsage = 'solo_venta' | 'venta_e_insumo';

const isValidUsage = (value: any): value is ProductUsage =>
  value === 'solo_venta' || value === 'venta_e_insumo';

const parsePreferences = (): Record<string, ProductUsage> => {
  try {
    const stored = localStorage.getItem(PRODUCT_USAGE_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const sanitized: Record<string, ProductUsage> = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (isValidUsage(value)) sanitized[String(key)] = value;
    });
    return sanitized;
  } catch {
    return {};
  }
};

export const getStoredUsage = (productId: number): ProductUsage | null => {
  const preferences = parsePreferences();
  const usage = preferences[String(productId)];
  return isValidUsage(usage) ? usage : null;
};

export const saveStoredUsage = (productId: number, usage: ProductUsage) => {
  if (!isValidUsage(usage)) return;
  const preferences = parsePreferences();
  preferences[String(productId)] = usage;
  localStorage.setItem(PRODUCT_USAGE_KEY, JSON.stringify(preferences));
};

export const removeStoredUsage = (productId: number) => {
  const preferences = parsePreferences();
  delete preferences[String(productId)];
  localStorage.setItem(PRODUCT_USAGE_KEY, JSON.stringify(preferences));
};
