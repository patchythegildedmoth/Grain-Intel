/**
 * ISO 8601 week number utility.
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
