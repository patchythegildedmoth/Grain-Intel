/**
 * Pure freight margin calculation functions.
 *
 * Shared by useFreightEfficiency (analytics) and useScenario (what-if).
 * All functions are pure — no store access, no side effects.
 *
 * Data flow:
 *   contracts + freightTiers + sellBasis
 *     → resolveContractFreight()    (enrich each contract)
 *     → calcMarginByTier()          (Feature 1: margin by commodity × tier)
 *     → calcTierImbalance()         (Feature 2: buy/sell volume by tier)
 *     → calcBlendedFreightCost()    (Feature 3: volume-weighted avg freight)
 *     → calcFreightMarginPercent()  (Feature 4: freight as % of margin)
 */

import type { Contract } from '../types/contracts';
import type { MarketBasisEntry } from '../types/marketData';
import type { AlertLevel } from './alerts';
import { THRESHOLDS } from './alerts';
import { getFreightCost } from './freightTiers';
import { getDeliveryMonth } from './futureMonth';
import { groupBy } from './groupBy';
import { weightedAverage } from './weightedAverage';
import { sortByCommodityOrder } from './commodityColors';

// ─── Enriched contract type ─────────────────────────────────────────────────

export interface ContractWithFreight extends Contract {
  resolvedTier: string | null;
  freightCost: number;
  deliveryMonth: string;
  currentSellBasis: number | null;
}

// ─── Feature 1: Freight-Adjusted Basis Margin ───────────────────────────────

export interface FreightAdjustedMargin {
  commodity: string;
  tier: string;
  freightCostPerBu: number;
  avgBuyBasis: number | null;
  avgSellBasis: number | null;
  grossMarginPerBu: number | null;
  netMarginPerBu: number | null;
  totalBushels: number;
  totalNetMargin: number | null;
  contractCount: number;
  isProfitable: boolean;
}

export interface CommodityMarginSummary {
  commodity: string;
  tiers: FreightAdjustedMargin[];
  overallNetMarginPerBu: number | null;
  totalBushels: number;
  alerts: { level: AlertLevel; message: string }[];
}

// ─── Feature 2: Geographic Imbalance ────────────────────────────────────────

export interface TierImbalance {
  tier: string;
  tierCost: number;
  purchaseBushels: number;
  saleBushels: number;
  netFlow: number;
  purchaseContractCount: number;
  saleContractCount: number;
}

export interface ImbalanceSummary {
  tiers: TierImbalance[];
  purchaseWeightedAvgTierCost: number | null;
  saleWeightedAvgTierCost: number | null;
  costDelta: number | null;
  alerts: { level: AlertLevel; message: string }[];
}

// ─── Feature 4: Freight as % of Margin ──────────────────────────────────────

export interface FreightMarginContract {
  contractNumber: string;
  commodity: string;
  entity: string;
  contractType: 'Purchase' | 'Sale';
  tier: string | null;
  freightCost: number;
  grossMarginPerBu: number | null;
  freightPercent: number | null;
  balance: number;
  riskLevel: AlertLevel;
}

export interface EntityFreightSummary {
  entity: string;
  contractCount: number;
  avgFreightCostPerBu: number | null;
  avgFreightPercent: number | null;
  totalBushels: number;
}

export interface FreightMarginSummary {
  contracts: FreightMarginContract[];
  avgFreightPercent: number | null;
  byCommodity: { commodity: string; avgFreightPercent: number | null; contractCount: number }[];
  byTier: { tier: string; avgFreightPercent: number | null; contractCount: number }[];
  byEntity: EntityFreightSummary[];
  criticalCount: number;
  warningCount: number;
  alerts: { level: AlertLevel; message: string }[];
}

// ─── Core: Resolve freight data for contracts ───────────────────────────────

/**
 * Enrich open contracts with resolved freight tier, cost, and current sell basis.
 *
 * Freight tier priority: Excel upload > iRely column > null (same as useMarkToMarket).
 * Margin uses the DELIVERED sell basis from market data, NOT from sale contracts.
 */
export function resolveContractFreight(
  contracts: Contract[],
  freightTiers: Record<string, string>,
  sellBasis: MarketBasisEntry[],
): ContractWithFreight[] {
  // Build sell basis lookup: "Corn|Mar 26" → basis value
  const basisMap = new Map<string, number>();
  for (const b of sellBasis) {
    basisMap.set(`${b.commodity}|${b.deliveryMonth}`, b.basis);
  }

  const openContracts = contracts.filter((c) => c.isOpen && c.balance > 0);

  return openContracts.map((c) => {
    const resolvedTier = freightTiers?.[c.contractNumber] ?? c.freightTier ?? null;
    const freightCost = getFreightCost(resolvedTier);
    const deliveryMonth = getDeliveryMonth(c.endDate) ?? 'Unknown';
    const currentSellBasis = basisMap.get(`${c.commodityCode}|${deliveryMonth}`) ?? null;
    return { ...c, resolvedTier, freightCost, deliveryMonth, currentSellBasis };
  });
}

// ─── Feature 1: Margin by Commodity × Tier ──────────────────────────────────

/**
 * Calculate freight-adjusted net margin for purchase contracts, grouped by commodity and tier.
 *
 * For what-if scenarios, pass tierOverrides to simulate different tier assignments.
 * tierOverrides maps contract numbers to override tier letters.
 */
export function calcMarginByTier(
  contracts: ContractWithFreight[],
  tierOverrides?: Record<string, string>,
): CommodityMarginSummary[] {
  const purchases = contracts.filter((c) => c.contractType === 'Purchase');

  // Apply tier overrides if provided (for what-if scenarios)
  const effectiveContracts = tierOverrides
    ? purchases.map((c) => {
        const overrideTier = tierOverrides[c.contractNumber];
        if (overrideTier) {
          return { ...c, resolvedTier: overrideTier, freightCost: getFreightCost(overrideTier) };
        }
        return c;
      })
    : purchases;

  // Group by commodity
  const byCommodity = groupBy(effectiveContracts, (c) => c.commodityCode);
  const summaries: CommodityMarginSummary[] = [];

  for (const [commodity, commodityContracts] of byCommodity) {
    // Group by tier within commodity
    const byTier = groupBy(commodityContracts, (c) => c.resolvedTier ?? 'None');
    const tiers: FreightAdjustedMargin[] = [];

    for (const [tier, tierContracts] of byTier) {
      const freightCostPerBu = tier === 'None' ? 0 : getFreightCost(tier);
      const totalBushels = tierContracts.reduce((s, c) => s + c.balance, 0);

      // Weighted average buy basis (by pricedQty for basis-relevant contracts)
      const avgBuyBasis = weightedAverage(
        tierContracts.map((c) => ({
          value: c.basis,
          weight: c.pricedQty > 0 ? c.pricedQty : c.balance,
        })),
      );

      // Use the first available sell basis for this commodity (all tiers compare to same market)
      const avgSellBasis = tierContracts[0]?.currentSellBasis ?? null;

      let grossMarginPerBu: number | null = null;
      let netMarginPerBu: number | null = null;
      let totalNetMargin: number | null = null;

      if (avgBuyBasis !== null && avgSellBasis !== null) {
        grossMarginPerBu = avgSellBasis - avgBuyBasis;
        netMarginPerBu = grossMarginPerBu - freightCostPerBu;
        totalNetMargin = netMarginPerBu * totalBushels;
      }

      tiers.push({
        commodity,
        tier,
        freightCostPerBu,
        avgBuyBasis,
        avgSellBasis,
        grossMarginPerBu,
        netMarginPerBu,
        totalBushels,
        totalNetMargin,
        contractCount: tierContracts.length,
        isProfitable: netMarginPerBu !== null && netMarginPerBu > 0,
      });
    }

    // Sort tiers by letter
    tiers.sort((a, b) => {
      if (a.tier === 'None') return 1;
      if (b.tier === 'None') return -1;
      return a.tier.localeCompare(b.tier);
    });

    // Overall net margin for this commodity
    const overallNetMarginPerBu = weightedAverage(
      tiers.map((t) => ({ value: t.netMarginPerBu, weight: t.totalBushels })),
    );
    const totalBushels = tiers.reduce((s, t) => s + t.totalBushels, 0);

    // Alerts
    const alerts: { level: AlertLevel; message: string }[] = [];
    const negativeMarginTiers = tiers.filter((t) => t.netMarginPerBu !== null && t.netMarginPerBu < 0);
    if (negativeMarginTiers.length > 0) {
      const tierList = negativeMarginTiers.map((t) => t.tier).join(', ');
      alerts.push({
        level: 'warning',
        message: `Negative net margin after freight in tier${negativeMarginTiers.length > 1 ? 's' : ''} ${tierList}`,
      });
    }

    summaries.push({ commodity, tiers, overallNetMarginPerBu, totalBushels, alerts });
  }

  summaries.sort((a, b) => sortByCommodityOrder(a.commodity, b.commodity));
  return summaries;
}

// ─── Feature 2: Buy/Sell Geographic Imbalance ───────────────────────────────

/**
 * Calculate purchase vs. sale volume distribution across freight tiers.
 * Positive costDelta means buying from more expensive tiers than selling to.
 */
export function calcTierImbalance(contracts: ContractWithFreight[]): ImbalanceSummary {
  const byTier = groupBy(contracts, (c) => c.resolvedTier ?? 'None');
  const tiers: TierImbalance[] = [];

  for (const [tier, tierContracts] of byTier) {
    const purchases = tierContracts.filter((c) => c.contractType === 'Purchase');
    const sales = tierContracts.filter((c) => c.contractType === 'Sale');
    const purchaseBushels = purchases.reduce((s, c) => s + c.balance, 0);
    const saleBushels = sales.reduce((s, c) => s + c.balance, 0);

    tiers.push({
      tier,
      tierCost: tier === 'None' ? 0 : getFreightCost(tier),
      purchaseBushels,
      saleBushels,
      netFlow: purchaseBushels - saleBushels,
      purchaseContractCount: purchases.length,
      saleContractCount: sales.length,
    });
  }

  // Sort by tier letter
  tiers.sort((a, b) => {
    if (a.tier === 'None') return 1;
    if (b.tier === 'None') return -1;
    return a.tier.localeCompare(b.tier);
  });

  // Volume-weighted average tier cost for purchases and sales
  const purchaseWeightedAvgTierCost = weightedAverage(
    tiers.map((t) => ({ value: t.tierCost, weight: t.purchaseBushels })),
  );
  const saleWeightedAvgTierCost = weightedAverage(
    tiers.map((t) => ({ value: t.tierCost, weight: t.saleBushels })),
  );
  const costDelta =
    purchaseWeightedAvgTierCost !== null && saleWeightedAvgTierCost !== null
      ? purchaseWeightedAvgTierCost - saleWeightedAvgTierCost
      : null;

  // Alert: >60% of purchase volume in tiers D+ ($0.45+)
  const alerts: { level: AlertLevel; message: string }[] = [];
  const totalPurchaseBu = tiers.reduce((s, t) => s + t.purchaseBushels, 0);
  if (totalPurchaseBu > 0) {
    const expensivePurchaseBu = tiers
      .filter((t) => t.tierCost >= 0.45)
      .reduce((s, t) => s + t.purchaseBushels, 0);
    const expensivePercent = expensivePurchaseBu / totalPurchaseBu;
    if (expensivePercent > THRESHOLDS.freightExpensiveTierThreshold) {
      alerts.push({
        level: 'warning',
        message: `${Math.round(expensivePercent * 100)}% of purchase volume is in tiers D+ (≥$0.45/bu)`,
      });
    }
  }

  return { tiers, purchaseWeightedAvgTierCost, saleWeightedAvgTierCost, costDelta, alerts };
}

// ─── Feature 3: Volume-Weighted Blended Freight Cost ────────────────────────

/**
 * Calculate the volume-weighted average freight cost per bushel for purchase contracts.
 * Returns null if no purchase contracts have freight tiers.
 */
export function calcBlendedFreightCost(contracts: ContractWithFreight[]): number | null {
  const purchases = contracts.filter((c) => c.contractType === 'Purchase');
  if (purchases.length === 0) return null;

  const totalWeight = purchases.reduce((s, c) => s + c.balance, 0);
  if (totalWeight === 0) return null;

  const weightedSum = purchases.reduce((s, c) => s + c.freightCost * c.balance, 0);
  return weightedSum / totalWeight;
}

// ─── Feature 4: Freight as % of Margin ──────────────────────────────────────

/**
 * Calculate freight cost as a percentage of gross margin for each purchase contract.
 * Includes entity-level aggregation.
 *
 * Edge cases:
 *   - grossMargin ≤ 0: freightPercent = null, riskLevel = critical
 *   - No freight tier (delivered): freightCost = 0, freightPercent = 0
 *   - No sell basis: grossMargin = null, skip
 */
export function calcFreightMarginPercent(contracts: ContractWithFreight[]): FreightMarginSummary {
  const purchases = contracts.filter(
    (c) => c.contractType === 'Purchase' && c.resolvedTier !== null,
  );

  const contractResults: FreightMarginContract[] = purchases.map((c) => {
    let grossMarginPerBu: number | null = null;
    let freightPercent: number | null = null;
    let riskLevel: AlertLevel = 'ok';

    if (c.basis !== null && c.currentSellBasis !== null) {
      grossMarginPerBu = c.currentSellBasis - c.basis;

      if (grossMarginPerBu <= 0) {
        // Negative or zero margin is worse than any freight %
        freightPercent = null;
        riskLevel = 'critical';
      } else {
        freightPercent = (c.freightCost / grossMarginPerBu) * 100;
        if (freightPercent > THRESHOLDS.freightPercentCritical * 100) {
          riskLevel = 'critical';
        } else if (freightPercent > THRESHOLDS.freightPercentWarning * 100) {
          riskLevel = 'warning';
        }
      }
    }

    return {
      contractNumber: c.contractNumber,
      commodity: c.commodityCode,
      entity: c.entity,
      contractType: c.contractType,
      tier: c.resolvedTier,
      freightCost: c.freightCost,
      grossMarginPerBu,
      freightPercent,
      balance: c.balance,
      riskLevel,
    };
  });

  // Aggregate average freight %
  const validContracts = contractResults.filter((c) => c.freightPercent !== null);
  const avgFreightPercent = validContracts.length > 0
    ? weightedAverage(validContracts.map((c) => ({ value: c.freightPercent, weight: c.balance })))
    : null;

  // By commodity
  const byCommodityMap = groupBy(validContracts, (c) => c.commodity);
  const byCommodity = Array.from(byCommodityMap.entries())
    .map(([commodity, cs]) => ({
      commodity,
      avgFreightPercent: weightedAverage(cs.map((c) => ({ value: c.freightPercent, weight: c.balance }))),
      contractCount: cs.length,
    }))
    .sort((a, b) => sortByCommodityOrder(a.commodity, b.commodity));

  // By tier
  const byTierMap = groupBy(validContracts, (c) => c.tier ?? 'None');
  const byTier = Array.from(byTierMap.entries())
    .map(([tier, cs]) => ({
      tier,
      avgFreightPercent: weightedAverage(cs.map((c) => ({ value: c.freightPercent, weight: c.balance }))),
      contractCount: cs.length,
    }))
    .sort((a, b) => a.tier.localeCompare(b.tier));

  // By entity
  const byEntityMap = groupBy(purchases, (c) => c.entity);
  const byEntity: EntityFreightSummary[] = Array.from(byEntityMap.entries())
    .map(([entity, cs]) => {
      const entityContracts = contractResults.filter(
        (cr) => cr.entity === entity && cr.freightPercent !== null,
      );
      return {
        entity,
        contractCount: cs.length,
        avgFreightCostPerBu: weightedAverage(
          cs.map((c) => ({ value: c.freightCost, weight: c.balance })),
        ),
        avgFreightPercent:
          entityContracts.length > 0
            ? weightedAverage(
                entityContracts.map((c) => ({ value: c.freightPercent, weight: c.balance })),
              )
            : null,
        totalBushels: cs.reduce((s, c) => s + c.balance, 0),
      };
    })
    .sort((a, b) => (b.avgFreightPercent ?? 0) - (a.avgFreightPercent ?? 0));

  // Counts
  const criticalCount = contractResults.filter((c) => c.riskLevel === 'critical').length;
  const warningCount = contractResults.filter((c) => c.riskLevel === 'warning').length;

  // Alerts
  const alerts: { level: AlertLevel; message: string }[] = [];
  if (criticalCount > THRESHOLDS.freightNegativeMarginContracts) {
    alerts.push({
      level: 'critical',
      message: `${criticalCount} contracts where freight exceeds 50% of margin or margin is negative`,
    });
  } else if (criticalCount > 0) {
    alerts.push({
      level: 'warning',
      message: `${criticalCount} contract${criticalCount > 1 ? 's' : ''} with freight >50% of margin`,
    });
  }

  return {
    contracts: contractResults,
    avgFreightPercent,
    byCommodity,
    byTier,
    byEntity,
    criticalCount,
    warningCount,
    alerts,
  };
}
