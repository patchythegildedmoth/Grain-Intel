export interface ParsedFutureMonth {
  sortKey: string;
  shortLabel: string;
  date: Date;
}

const FUTURE_MONTH_RE = /^(\d{4}-\d{2})\s+\((.+)\)$/;

export function parseFutureMonth(raw: string | null): ParsedFutureMonth | null {
  if (!raw || typeof raw !== 'string') return null;
  const match = raw.match(FUTURE_MONTH_RE);
  if (!match) return null;
  return {
    sortKey: match[1],
    shortLabel: match[2],
    date: new Date(match[1] + '-01'),
  };
}

export function getFutureMonthSortKey(raw: string | null): string {
  const parsed = parseFutureMonth(raw);
  return parsed?.sortKey ?? 'zz-cash';
}

export function getFutureMonthShortLabel(raw: string | null): string {
  const parsed = parseFutureMonth(raw);
  return parsed?.shortLabel ?? 'Cash / No Futures';
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Derive a delivery month label from an End Date.
 * Returns "Mar 26" format matching the daily input sell basis table.
 */
export function getDeliveryMonth(endDate: Date | null): string | null {
  if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) return null;
  const month = SHORT_MONTHS[endDate.getMonth()];
  const year = String(endDate.getFullYear()).slice(2); // "26"
  return `${month} ${year}`;
}

/**
 * Get a sort key for a delivery month label like "Mar 26".
 * Returns "2026-03" format for chronological sorting.
 */
export function getDeliveryMonthSortKey(label: string): string {
  const match = label.match(/(\w{3})\s+(\d{2})/);
  if (!match) return 'zz-unknown';
  const monthIdx = SHORT_MONTHS.indexOf(match[1]);
  if (monthIdx === -1) return 'zz-unknown';
  const year = 2000 + parseInt(match[2]);
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
}
