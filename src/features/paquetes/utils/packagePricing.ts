export const calculatePackageFinalPrice = (price: number, discount: number = 0): number => {
  if (discount <= 0) return price;
  const discountAmount = price * (discount / 100);
  return price - discountAmount;
};

export const formatCurrency = (amount: number): string => {
  return amount.toLocaleString('es-CO');
};