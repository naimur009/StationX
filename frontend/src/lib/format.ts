const CURRENCY_SYMBOL = '৳';

export function formatCurrency(amount: number): string {
  const formatted = amount.toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${CURRENCY_SYMBOL}${formatted}`;
}
