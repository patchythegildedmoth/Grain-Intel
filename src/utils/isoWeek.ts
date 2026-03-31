/**
 * ISO 8601 week number utility + price data helpers.
 * Extracted from SeasonalPatternsTab / CropProgressTab / ThisWeekTab — single source of truth.
 * Does NOT use date-fns (not in package.json).
 */

/**
 * Returns the ISO 8601 week number (1–53) for a given Date.
 * Parses input as local-time noon to avoid timezone-induced day shifts.
 */
export function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * Parse an ISO date string ("YYYY-MM-DD") into a local-noon Date to avoid
 * timezone-induced day shifts.
 * `new Date('2026-03-30')` → UTC midnight → in UTC-6 = March 29 local → wrong ISO week.
 * `parseLocalDate('2026-03-30')` → March 30 local noon → always correct.
 */
export function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/**
 * Filter continuous futures price data to remove roll-day discontinuities.
 * Compares each day against the last ACCEPTED value (not the previous raw value)
 * to correctly handle consecutive roll days.
 *
 * @param data - Price records with `date` (ISO string) and `close` fields, sorted by date ascending.
 * @param threshold - Maximum allowed day-over-day change as a fraction (default 0.15 = 15%).
 */
export function filterRollDays<T extends { date: string; close: number }>(
  data: T[],
  threshold = 0.15,
): T[] {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const filtered: T[] = [];
  for (const record of sorted) {
    if (filtered.length === 0) { filtered.push(record); continue; }
    const prev = filtered[filtered.length - 1].close;
    if (prev > 0 && Math.abs((record.close - prev) / prev) > threshold) continue;
    filtered.push(record);
  }
  return filtered;
}
