const bushelFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormatter = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatBushels(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `${bushelFormatter.format(n)} bu`;
}

export function formatBushelsShort(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return bushelFormatter.format(n);
}

export function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return currencyFormatter.format(n);
}

export function formatBasis(n: number | null): string {
  if (n === null || n === undefined) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${currencyFormatter.format(n)}`;
}

export function formatPercent(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return percentFormatter.format(n);
}

export function formatDate(d: Date | null): string {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return bushelFormatter.format(n);
}
