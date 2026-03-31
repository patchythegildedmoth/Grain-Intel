import { describe, it, expect } from 'vitest';
import { getISOWeek, parseLocalDate, filterRollDays } from '../isoWeek';

// ─── getISOWeek ──────────────────────────────────────────────────────────────

describe('getISOWeek', () => {
  it('returns week 1 for Jan 1 2026 (Thursday)', () => {
    expect(getISOWeek(new Date(2026, 0, 1))).toBe(1);
  });

  it('returns week 52 or 53 for Dec 31', () => {
    // Dec 31 2025 is a Wednesday → ISO week 1 of 2026
    const week = getISOWeek(new Date(2025, 11, 31));
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(53);
  });

  it('handles mid-year date correctly', () => {
    // July 1 2026 is a Wednesday → should be around week 27
    const week = getISOWeek(new Date(2026, 6, 1));
    expect(week).toBeGreaterThanOrEqual(26);
    expect(week).toBeLessThanOrEqual(28);
  });

  it('handles leap year Feb 29', () => {
    // Feb 29 2024 exists (leap year)
    const week = getISOWeek(new Date(2024, 1, 29));
    expect(week).toBe(9);
  });

  it('returns values between 1 and 53', () => {
    for (let month = 0; month < 12; month++) {
      const week = getISOWeek(new Date(2026, month, 15));
      expect(week).toBeGreaterThanOrEqual(1);
      expect(week).toBeLessThanOrEqual(53);
    }
  });
});

// ─── parseLocalDate ──────────────────────────────────────────────────────────

describe('parseLocalDate', () => {
  it('parses YYYY-MM-DD to correct local date', () => {
    const d = parseLocalDate('2026-03-30');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(2); // 0-indexed
    expect(d.getDate()).toBe(30);
  });

  it('sets time to noon to avoid timezone shifts', () => {
    const d = parseLocalDate('2026-01-01');
    expect(d.getHours()).toBe(12);
  });

  it('handles single-digit month and day', () => {
    const d = parseLocalDate('2026-01-05');
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(5);
  });
});

// ─── filterRollDays ──────────────────────────────────────────────────────────

describe('filterRollDays', () => {
  it('passes through data with no roll days', () => {
    const data = [
      { date: '2026-01-01', close: 4.50 },
      { date: '2026-01-02', close: 4.52 },
      { date: '2026-01-03', close: 4.48 },
    ];
    expect(filterRollDays(data)).toHaveLength(3);
  });

  it('filters a single roll day (>15% jump)', () => {
    const data = [
      { date: '2026-01-01', close: 4.50 },
      { date: '2026-01-02', close: 5.50 }, // +22% — roll day
      { date: '2026-01-03', close: 4.55 },
    ];
    const filtered = filterRollDays(data);
    expect(filtered).toHaveLength(2);
    expect(filtered[0].close).toBe(4.50);
    expect(filtered[1].close).toBe(4.55);
  });

  it('filters consecutive roll days correctly', () => {
    // Two consecutive large jumps — both should be filtered
    const data = [
      { date: '2026-01-01', close: 4.50 },
      { date: '2026-01-02', close: 5.50 }, // +22% vs 4.50 — filtered
      { date: '2026-01-03', close: 6.50 }, // +18% vs 4.50 (last accepted) — filtered
      { date: '2026-01-04', close: 4.60 }, // +2% vs 4.50 (last accepted) — kept
    ];
    const filtered = filterRollDays(data);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((d) => d.close)).toEqual([4.50, 4.60]);
  });

  it('handles empty input', () => {
    expect(filterRollDays([])).toEqual([]);
  });

  it('handles single record', () => {
    const data = [{ date: '2026-01-01', close: 4.50 }];
    expect(filterRollDays(data)).toHaveLength(1);
  });

  it('does not filter when prev close is 0', () => {
    const data = [
      { date: '2026-01-01', close: 0 },
      { date: '2026-01-02', close: 4.50 },
    ];
    // Division by zero guard — should keep both
    expect(filterRollDays(data)).toHaveLength(2);
  });

  it('sorts input by date before filtering', () => {
    const data = [
      { date: '2026-01-03', close: 4.48 },
      { date: '2026-01-01', close: 4.50 },
      { date: '2026-01-02', close: 4.52 },
    ];
    const filtered = filterRollDays(data);
    expect(filtered[0].date).toBe('2026-01-01');
    expect(filtered[1].date).toBe('2026-01-02');
    expect(filtered[2].date).toBe('2026-01-03');
  });

  it('respects custom threshold', () => {
    const data = [
      { date: '2026-01-01', close: 4.50 },
      { date: '2026-01-02', close: 4.96 }, // +10.2%
    ];
    // Default 15% — should pass
    expect(filterRollDays(data, 0.15)).toHaveLength(2);
    // Custom 5% — should filter
    expect(filterRollDays(data, 0.05)).toHaveLength(1);
  });

  it('preserves extra fields on records', () => {
    const data = [
      { date: '2026-01-01', close: 4.50, volume: 1000 },
      { date: '2026-01-02', close: 4.52, volume: 2000 },
    ];
    const filtered = filterRollDays(data);
    expect((filtered[0] as typeof data[0]).volume).toBe(1000);
  });
});
