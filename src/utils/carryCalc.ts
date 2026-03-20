/**
 * Carry cost calculations for unpriced Basis contracts.
 *
 * In a carry market (deferred > nearby), every day a farmer waits to price
 * the futures component costs the elevator the daily carry rate.
 * In an inverted market (nearby > deferred), waiting benefits the elevator.
 */

export interface CarrySpread {
  nearbyMonth: string;
  deferredMonth: string;
  nearbyPrice: number;
  deferredPrice: number;
  spread: number; // deferred - nearby (positive = carry, negative = inverted)
  dailyRate: number; // spread / approx days between months
  isInverted: boolean;
}

/**
 * Approximate trading days between two futures contract months.
 * Uses ~21 trading days per month as standard.
 */
function approxDaysBetweenMonths(nearbyMonth: string, deferredMonth: string): number {
  // Extract year and month from "May 26 (K)" or "2026-05 (May 26)" formats
  const parseMonth = (s: string): { year: number; month: number } | null => {
    // Try "2026-05" format first
    const isoMatch = s.match(/(\d{4})-(\d{2})/);
    if (isoMatch) return { year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]) };

    // Try "May 26" or "May 26 (K)" format
    const months: Record<string, number> = {
      Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
      Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
    };
    const labelMatch = s.match(/(\w{3})\s+(\d{2})/);
    if (labelMatch) {
      const mon = months[labelMatch[1]];
      if (mon) return { year: 2000 + parseInt(labelMatch[2]), month: mon };
    }
    return null;
  };

  const nearby = parseMonth(nearbyMonth);
  const deferred = parseMonth(deferredMonth);
  if (!nearby || !deferred) return 60; // default ~3 months

  const monthDiff = (deferred.year - nearby.year) * 12 + (deferred.month - nearby.month);
  return Math.max(monthDiff * 21, 1); // ~21 trading days per month, minimum 1
}

/**
 * Calculate the carry spread between two futures months.
 */
export function calcCarrySpread(
  nearbyMonth: string,
  deferredMonth: string,
  nearbyPrice: number,
  deferredPrice: number,
): CarrySpread {
  const spread = deferredPrice - nearbyPrice;
  const days = approxDaysBetweenMonths(nearbyMonth, deferredMonth);
  const dailyRate = spread / days;

  return {
    nearbyMonth,
    deferredMonth,
    nearbyPrice,
    deferredPrice,
    spread,
    dailyRate,
    isInverted: spread < 0,
  };
}

/**
 * Calculate daily carry cost for a set of unpriced bushels.
 * Positive = cost to elevator (carry market).
 * Negative = benefit to elevator (inverted market).
 */
export function calcDailyCarryCost(unpricedBushels: number, dailyRate: number): number {
  return unpricedBushels * dailyRate;
}

/**
 * Calculate per-penny basis risk for HTA contracts.
 * Returns dollar value change per $0.01 of basis movement.
 */
export function calcPerPennyBasisRisk(unpricedBushels: number): number {
  return unpricedBushels * 0.01;
}
