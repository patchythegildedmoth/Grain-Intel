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
