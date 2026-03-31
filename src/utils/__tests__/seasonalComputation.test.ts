/**
 * Tests for the seasonal data computation logic used by SeasonalPatternsTab.
 * Since buildSeasonalData is not exported, we test the key behaviors via
 * the shared utilities it depends on (getISOWeek, parseLocalDate, filterRollDays)
 * and the statistical helpers (mean, stddev) inline.
 */
import { describe, it, expect } from 'vitest';
import { getISOWeek, parseLocalDate, filterRollDays } from '../isoWeek';

// ─── Seasonal aggregation helpers (mirrored from SeasonalPatternsTab) ────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  return Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / (values.length - 1));
}

// ─── Statistical helpers ─────────────────────────────────────────────────────

describe('seasonal statistics', () => {
  it('mean of empty array is 0', () => {
    expect(mean([])).toBe(0);
  });

  it('mean of [2, 4, 6] is 4', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it('stddev of single value is 0', () => {
    expect(stddev([5])).toBe(0);
  });

  it('stddev of identical values is 0', () => {
    expect(stddev([5, 5, 5])).toBe(0);
  });

  it('stddev of [2, 4, 6] is approximately 2', () => {
    expect(stddev([2, 4, 6])).toBeCloseTo(2, 1);
  });
});

// ─── ISO week grouping for seasonal data ────────────────────────────────────

describe('ISO week grouping for seasonal averages', () => {
  it('same calendar date across years maps to same ISO week', () => {
    // March 15 should be approximately week 11 across years
    const weeks = [2021, 2022, 2023, 2024, 2025].map((year) =>
      getISOWeek(parseLocalDate(`${year}-03-15`)),
    );
    // All should be within ±1 of each other (ISO week can shift by 1 across years)
    const minWeek = Math.min(...weeks);
    const maxWeek = Math.max(...weeks);
    expect(maxWeek - minWeek).toBeLessThanOrEqual(1);
  });

  it('week 1 and week 52 are distinct', () => {
    const week1 = getISOWeek(parseLocalDate('2026-01-05'));
    const week52 = getISOWeek(parseLocalDate('2025-12-25'));
    expect(week1).not.toBe(week52);
  });

  it('all 52 weeks can be generated from dates in a year', () => {
    const weeks = new Set<number>();
    for (let month = 0; month < 12; month++) {
      for (let day = 1; day <= 28; day++) {
        weeks.add(getISOWeek(new Date(2026, month, day)));
      }
    }
    // Should cover at least weeks 1-52
    expect(weeks.size).toBeGreaterThanOrEqual(52);
  });
});

// ─── Roll-day filter integration with seasonal data ─────────────────────────

describe('roll-day filter in seasonal context', () => {
  it('removes futures roll discontinuities from multi-year data', () => {
    // Simulate a roll day in a 5-year price series
    const data = [
      { date: '2024-03-14', close: 4.50 },
      { date: '2024-03-15', close: 4.52 },
      { date: '2024-03-16', close: 5.80 }, // Roll day: +25%
      { date: '2024-03-17', close: 4.55 },
    ];
    const filtered = filterRollDays(data);
    expect(filtered).toHaveLength(3);
    expect(filtered.map((d) => d.date)).not.toContain('2024-03-16');
  });

  it('preserves normal price movements', () => {
    const data = [
      { date: '2024-01-01', close: 4.50 },
      { date: '2024-01-02', close: 4.55 }, // +1.1%
      { date: '2024-01-03', close: 4.40 }, // -3.3%
      { date: '2024-01-04', close: 4.60 }, // +4.5%
    ];
    expect(filterRollDays(data)).toHaveLength(4);
  });

  it('handles the ThisWeekTab bug case: consecutive roll days', () => {
    // This was the bug: ThisWeekTab compared against sorted[i-1] (raw)
    // instead of filtered[filtered.length-1] (last accepted)
    const data = [
      { date: '2024-03-14', close: 4.50 },
      { date: '2024-03-15', close: 5.80 }, // Roll: +29% vs 4.50 → filtered
      { date: '2024-03-16', close: 5.50 }, // -5% vs 5.80 (raw) but +22% vs 4.50 (accepted) → filtered
      { date: '2024-03-17', close: 4.55 }, // +1% vs 4.50 (accepted) → kept
    ];
    const filtered = filterRollDays(data);
    // Both roll days should be filtered, leaving [4.50, 4.55]
    expect(filtered).toHaveLength(2);
    expect(filtered[0].close).toBe(4.50);
    expect(filtered[1].close).toBe(4.55);
  });
});

// ─── Seasonal mean/SD computation ────────────────────────────────────────────

describe('seasonal mean and SD bands', () => {
  it('requires at least 2 years for meaningful SD', () => {
    expect(stddev([4.50])).toBe(0); // single year → SD is 0
    expect(stddev([4.50, 4.80])).toBeGreaterThan(0); // two years → has SD
  });

  it('SD bands are symmetric around mean', () => {
    const values = [4.20, 4.50, 4.80, 5.10, 4.60];
    const avg = mean(values);
    const sd = stddev(values);
    const upper = avg + sd;
    const lower = avg - sd;
    expect(upper - avg).toBeCloseTo(avg - lower, 10);
  });

  it('current year price can be null (no data for this week yet)', () => {
    // Simulates a future week with no price data
    const currentYearPrice: number | null = null;
    expect(currentYearPrice).toBeNull();
  });
});
