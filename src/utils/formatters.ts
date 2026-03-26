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

/** Compact format for alert messages: 50K bu, 1.2M bu */
export function formatBushelsCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M bu`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}K bu`;
  return `${n} bu`;
}
