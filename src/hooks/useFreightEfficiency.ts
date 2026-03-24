import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { THRESHOLDS, type AlertLevel } from '../utils/alerts';
import {
  resolveContractFreight,
  calcMarginByTier,
  calcTierImbalance,
  calcBlendedFreightCost,
  calcFreightMarginPercent,
  type CommodityMarginSummary,
  type ImbalanceSummary,
  type FreightMarginSummary,
} from '../utils/freightMarginCalc';

export interface FreightCostTrend {
  currentAvgCost: number | null;
  historicalPoints: { date: string; avgCost: number }[];
  delta7d: number | null;
  delta30d: number | null;
  delta90d: number | null;
  alerts: { level: AlertLevel; message: string }[];
}

export interface FreightEfficiencyResult {
  marginAnalysis: CommodityMarginSummary[];
  imbalance: ImbalanceSummary;
  costTrend: FreightCostTrend;
  freightMargin: FreightMarginSummary;
  summaryAlerts: { level: AlertLevel; message: string }[];
  blendedFreightCost: number | null;
  totalFreightAdjustedBushels: number;
}

// Re-export types consumers need
export type {
  CommodityMarginSummary,
  FreightAdjustedMargin,
  ImbalanceSummary,
  TierImbalance,
  FreightMarginSummary,
  FreightMarginContract,
  EntityFreightSummary,
} from '../utils/freightMarginCalc';

export function useFreightEfficiency(): FreightEfficiencyResult {
  const contracts = useContractStore((s) => s.contracts);
  const sellBasis = useMarketDataStore((s) => s.current.sellBasis);
  const freightTiers = useMarketDataStore((s) => s.current.freightTiers);
  const m2mSnapshots = useMarketDataStore((s) => s.m2mSnapshots);

  return useMemo(() => {
    // Enrich contracts with freight data
    const enriched = resolveContractFreight(contracts, freightTiers, sellBasis);

    // Feature 1: Margin by commodity × tier
    const marginAnalysis = calcMarginByTier(enriched);

    // Feature 2: Buy/sell imbalance
    const imbalance = calcTierImbalance(enriched);

    // Feature 3: Blended freight cost + trend
    const currentAvgCost = calcBlendedFreightCost(enriched);
    const costTrend = buildCostTrend(currentAvgCost, m2mSnapshots);

    // Feature 4+5: Freight % of margin with entity breakdown
    const freightMargin = calcFreightMarginPercent(enriched);

    // Total bushels for snapshot persistence
    const purchases = enriched.filter((c) => c.contractType === 'Purchase');
    const totalFreightAdjustedBushels = purchases.reduce((s, c) => s + c.balance, 0);

    // Collect summary alerts from all features (critical first)
    const summaryAlerts = [
      ...marginAnalysis.flatMap((m) => m.alerts),
      ...imbalance.alerts,
      ...costTrend.alerts,
      ...freightMargin.alerts,
    ].sort((a, b) => {
      const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2, ok: 3 };
      return order[a.level] - order[b.level];
    });

    return {
      marginAnalysis,
      imbalance,
      costTrend,
      freightMargin,
      summaryAlerts,
      blendedFreightCost: currentAvgCost,
      totalFreightAdjustedBushels,
    };
  }, [contracts, sellBasis, freightTiers, m2mSnapshots]);
}

// ─── Trend calculation from M2M snapshots ───────────────────────────────────

function buildCostTrend(
  currentAvgCost: number | null,
  snapshots: Record<string, { avgFreightCostPerBu?: number; timestamp: string }>,
): FreightCostTrend {
  // Extract historical freight cost points from snapshots
  const historicalPoints: { date: string; avgCost: number }[] = [];

  for (const [date, snapshot] of Object.entries(snapshots)) {
    if (snapshot.avgFreightCostPerBu !== undefined && snapshot.avgFreightCostPerBu !== null) {
      historicalPoints.push({ date, avgCost: snapshot.avgFreightCostPerBu });
    }
  }

  // Sort chronologically
  historicalPoints.sort((a, b) => a.date.localeCompare(b.date));

  // Compute deltas
  const today = new Date();
  const delta7d = findDelta(currentAvgCost, historicalPoints, today, 7);
  const delta30d = findDelta(currentAvgCost, historicalPoints, today, 30);
  const delta90d = findDelta(currentAvgCost, historicalPoints, today, 90);

  // Alerts
  const alerts: { level: AlertLevel; message: string }[] = [];
  if (delta30d !== null && delta30d > THRESHOLDS.freightCostTrendDelta) {
    alerts.push({
      level: 'warning',
      message: `Blended freight cost up $${delta30d.toFixed(2)}/bu vs 30-day average`,
    });
  }

  if (historicalPoints.length === 0 && currentAvgCost !== null) {
    alerts.push({
      level: 'info',
      message: 'Freight cost trend data will populate as daily snapshots are saved',
    });
  }

  return { currentAvgCost, historicalPoints, delta7d, delta30d, delta90d, alerts };
}

/**
 * Find the delta between current value and the nearest snapshot N days ago.
 */
function findDelta(
  current: number | null,
  points: { date: string; avgCost: number }[],
  today: Date,
  daysAgo: number,
): number | null {
  if (current === null || points.length === 0) return null;

  const target = new Date(today);
  target.setDate(target.getDate() - daysAgo);

  // Find nearest point to target date
  let nearest: { date: string; avgCost: number } | null = null;
  let nearestDist = Infinity;

  for (const p of points) {
    const dist = Math.abs(new Date(p.date).getTime() - target.getTime());
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = p;
    }
  }

  // Only use if within 3 days of target
  if (!nearest || nearestDist > 3 * 24 * 60 * 60 * 1000) return null;
  return current - nearest.avgCost;
}
