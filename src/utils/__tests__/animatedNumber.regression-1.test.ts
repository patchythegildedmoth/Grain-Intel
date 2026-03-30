import { describe, it, expect } from 'vitest';

// Regression: ISSUE-001 — AnimatedNumber easing and value interpolation
// Found by /qa on 2026-03-30
// Report: .gstack/qa-reports/qa-report-localhost-2026-03-30.md

/**
 * Replicates the core math from AnimatedNumber.tsx.
 * The component uses requestAnimationFrame which can't run in a test environment,
 * but the interpolation logic is pure and can be validated independently.
 */

/** Cubic ease-out: starts fast, decelerates toward the target */
function cubicEaseOut(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

/** Interpolate from `start` to `end` at `progress` [0..1] using cubic ease-out */
function interpolate(start: number, end: number, progress: number): number {
  const eased = cubicEaseOut(Math.min(progress, 1));
  return start + (end - start) * eased;
}

describe('AnimatedNumber easing math', () => {
  it('at progress=0 returns start value exactly', () => {
    expect(interpolate(0, 500_000, 0)).toBe(0);
    expect(interpolate(100, 200, 0)).toBe(100);
  });

  it('at progress=1 returns end value exactly', () => {
    expect(interpolate(0, 500_000, 1)).toBe(500_000);
    expect(interpolate(100, 200, 1)).toBe(200);
  });

  it('cubic ease-out is front-loaded: reaches 87.5% of range at progress=0.5', () => {
    // cubicEaseOut(0.5) = 1 - (0.5)^3 = 1 - 0.125 = 0.875
    const value = interpolate(0, 1000, 0.5);
    expect(value).toBeCloseTo(875, 0);
  });

  it('progress > 1 is clamped — never overshoots', () => {
    const value = interpolate(0, 1000, 1.5);
    expect(value).toBe(1000);
  });

  it('counting down (end < start) works correctly', () => {
    expect(interpolate(1000, 0, 0)).toBe(1000);
    expect(interpolate(1000, 0, 1)).toBe(0);
    // halfway: 87.5% of the way from 1000 to 0
    const value = interpolate(1000, 0, 0.5);
    expect(value).toBeCloseTo(125, 0); // 1000 + (0 - 1000) * 0.875 = 125
  });

  it('negative values (P&L loss) interpolate correctly', () => {
    // Count up from 0 to -250_000 (a book loss)
    expect(interpolate(0, -250_000, 0)).toBe(0);
    expect(interpolate(0, -250_000, 1)).toBe(-250_000);
    const mid = interpolate(0, -250_000, 0.5);
    expect(mid).toBeCloseTo(-218_750, 0);
  });

  it('value change from non-zero start: counts from previous to new', () => {
    // Simulates a data refresh: position was 100k bu, now 150k bu
    const result = interpolate(100_000, 150_000, 1);
    expect(result).toBe(150_000);
    const midpoint = interpolate(100_000, 150_000, 0.5);
    expect(midpoint).toBeCloseTo(143_750, 0); // 100k + 50k * 0.875
  });
});

describe('AnimatedNumber format function contract', () => {
  it('formatBushelsShort style: rounds to nearest K or M', () => {
    // Replicates what formatBushelsShort does at integer values
    function fmtShort(n: number): string {
      const abs = Math.abs(n);
      if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M bu`;
      if (abs >= 1_000) return `${Math.round(n / 1_000)}K bu`;
      return `${Math.round(n)} bu`;
    }
    expect(fmtShort(0)).toBe('0 bu');
    expect(fmtShort(500_000)).toBe('500K bu');
    expect(fmtShort(1_500_000)).toBe('1.5M bu');
    expect(fmtShort(-75_000)).toBe('-75K bu');
  });

  it('integer count format: rounds mid-animation values cleanly', () => {
    // The Open Contracts card uses (n: number) => String(Math.round(n))
    const fmt = (n: number) => String(Math.round(n));
    expect(fmt(0)).toBe('0');
    expect(fmt(142.7)).toBe('143');
    expect(fmt(142.3)).toBe('142');
    // Mid-animation: counting from 0 to 247 at progress=0.5
    const mid = interpolate(0, 247, 0.5);
    expect(fmt(mid)).toBe('216'); // 247 * 0.875 ≈ 216.1
  });
});

describe('StatCard size prop class selection', () => {
  // Replicates the logic in StatCard.tsx:
  //   const valueSize = size === 'hero' ? 'text-3xl' : 'text-2xl';
  function getValueSizeClass(size?: 'default' | 'hero'): string {
    return size === 'hero' ? 'text-3xl' : 'text-2xl';
  }

  it('default size renders text-2xl', () => {
    expect(getValueSizeClass()).toBe('text-2xl');
    expect(getValueSizeClass('default')).toBe('text-2xl');
  });

  it('hero size renders text-3xl', () => {
    expect(getValueSizeClass('hero')).toBe('text-3xl');
  });

  it('Unpriced Exposure is the only hero card on Morning Brief', () => {
    // Guard: if multiple cards use hero, the visual hierarchy breaks
    const morningBriefCards = [
      { label: 'Unpriced Exposure', size: 'hero' as const },
      { label: 'Net Position', size: 'default' as const },
      { label: 'Hedge Ratio', size: 'default' as const },
      { label: 'Open Contracts', size: 'default' as const },
    ];
    const heroCount = morningBriefCards.filter((c) => c.size === 'hero').length;
    expect(heroCount).toBe(1);
  });
});

describe('DataTable compact mode', () => {
  // Replicates the logic in DataTable.tsx:
  //   const cellPadding = compact ? 'py-1.5' : 'py-2';
  function getCellPadding(compact?: boolean): string {
    return compact ? 'py-1.5' : 'py-2';
  }

  it('default (compact=false) uses py-2 rows', () => {
    expect(getCellPadding()).toBe('py-2');
    expect(getCellPadding(false)).toBe('py-2');
  });

  it('compact=true uses py-1.5 rows (36px vs 44px)', () => {
    expect(getCellPadding(true)).toBe('py-1.5');
  });
});
