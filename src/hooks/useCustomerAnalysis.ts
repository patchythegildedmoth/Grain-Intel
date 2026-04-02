import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { weightedAverage } from '../utils/weightedAverage';
import { adjustBasisForProfitability, computeMedianFreightCost } from '../utils/freightTiers';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';

export interface CustomerRow {
  entity: string;
  commodity: string;
  contractType: string;
  committedBushels: number;
  percentOfCommodity: number;
  percentOfTotal: number;
  avgBasis: number | null;
  contractCount: number;
  freightTerms: string[];
  primaryFreight: string;
}

export interface CustomerProfitability {
  entity: string;
  commodity: string | null;
  avgSellBasis: number | null;
  marketAvgBuyBasis: number | null;
  approxMargin: number | null;
  completedBushels: number;
  contractCount: number;
  primaryFreightTerm: string;
  freightMixLabel: string;
  subRows?: CustomerProfitability[];
}

export interface CustomerSummary {
  entity: string;
  totalCommittedBushels: number;
  percentOfTotal: number;
  commodities: string[];
  openContractCount: number;
  freightMix: { term: string; count: number; percent: number }[];
  alerts: { level: AlertLevel; message: string }[];
}

export function useCustomerAnalysis() {
  const contracts = useContractStore((s) => s.contracts);
  const freightTiers = useMarketDataStore((s) => s.current.freightTiers);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);
    const completedContracts = contracts.filter((c) => c.isCompleted);

    const totalOpenBushels = openContracts.reduce((s, c) => s + c.balance, 0);

    // --- Concentration: rank entities by committed bushels ---
    const entityMap = new Map<string, {
      bushels: number;
      commodities: Set<string>;
      contracts: number;
      freightTerms: Map<string, number>;
    }>();

    for (const c of openContracts) {
      if (!entityMap.has(c.entity)) {
        entityMap.set(c.entity, {
          bushels: 0,
          commodities: new Set(),
          contracts: 0,
          freightTerms: new Map(),
        });
      }
      const entry = entityMap.get(c.entity)!;
      entry.bushels += c.balance;
      entry.commodities.add(c.commodityCode);
      entry.contracts++;
      const ft = c.freightTerm || 'Unknown';
      entry.freightTerms.set(ft, (entry.freightTerms.get(ft) || 0) + 1);
    }

    // Build customer summaries sorted by bushels desc
    const customerSummaries: CustomerSummary[] = [...entityMap.entries()]
      .map(([entity, data]) => {
        const percentOfTotal = totalOpenBushels > 0 ? data.bushels / totalOpenBushels : 0;

        // Freight mix
        const totalFreight = [...data.freightTerms.values()].reduce((s, v) => s + v, 0);
        const freightMix = [...data.freightTerms.entries()]
          .map(([term, count]) => ({ term, count, percent: totalFreight > 0 ? count / totalFreight : 0 }))
          .sort((a, b) => b.count - a.count);

        const alerts: { level: AlertLevel; message: string }[] = [];

        return {
          entity,
          totalCommittedBushels: data.bushels,
          percentOfTotal,
          commodities: [...data.commodities],
          openContractCount: data.contracts,
          freightMix,
          alerts,
        };
      })
      .sort((a, b) => b.totalCommittedBushels - a.totalCommittedBushels);

    // Add alerts after sorting (top 3 always highlighted)
    for (let i = 0; i < customerSummaries.length; i++) {
      const cs = customerSummaries[i];
      if (i < 3) {
        cs.alerts.push({ level: 'info', message: `Top ${i + 1} customer` });
      }
    }

    // Per-commodity concentration alerts
    const commodityTotals = new Map<string, number>();
    for (const c of openContracts) {
      commodityTotals.set(c.commodityCode, (commodityTotals.get(c.commodityCode) || 0) + c.balance);
    }

    const entityCommodityMap = new Map<string, Map<string, number>>();
    for (const c of openContracts) {
      if (!entityCommodityMap.has(c.entity)) entityCommodityMap.set(c.entity, new Map());
      const m = entityCommodityMap.get(c.entity)!;
      m.set(c.commodityCode, (m.get(c.commodityCode) || 0) + c.balance);
    }

    for (const cs of customerSummaries) {
      const entityCommodities = entityCommodityMap.get(cs.entity);
      if (!entityCommodities) continue;
      for (const [commodity, bushels] of entityCommodities) {
        const commodityTotal = commodityTotals.get(commodity) || 0;
        if (commodityTotal > 0 && bushels / commodityTotal > THRESHOLDS.customerConcentrationPercent) {
          cs.alerts.push({
            level: 'warning',
            message: `${Math.round((bushels / commodityTotal) * 100)}% of ${commodity} volume`,
          });
        }
      }
    }

    // --- Profitability: completed trades (rolling 12 months, per-commodity) ---

    // Compute median freight cost per commodity for FOB fallback
    const commoditiesInAll = new Set<string>();
    for (const c of contracts) commoditiesInAll.add(c.commodityCode);
    const defaultFreightByCommodity = new Map<string, number>();
    for (const commodity of commoditiesInAll) {
      defaultFreightByCommodity.set(
        commodity,
        computeMedianFreightCost(commodity, contracts, freightTiers),
      );
    }

    // Rolling 12-month window for market avg buy basis
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const recentPurchases = completedContracts.filter((c) =>
      c.contractType === 'Purchase' &&
      c.endDate instanceof Date && !isNaN(c.endDate.getTime()) &&
      c.endDate >= twelveMonthsAgo,
    );

    // Market avg buy basis by commodity (rolling 12 months, FOB-adjusted)
    const marketAvgBuyBasis = new Map<string, number | null>();
    const commoditiesInRecent = new Set<string>();
    for (const c of recentPurchases) commoditiesInRecent.add(c.commodityCode);
    for (const commodity of commoditiesInRecent) {
      const purchases = recentPurchases.filter((c) => c.commodityCode === commodity);
      const defaultFreight = defaultFreightByCommodity.get(commodity) ?? 0;
      marketAvgBuyBasis.set(commodity, weightedAverage(purchases.map((c) => ({
        value: adjustBasisForProfitability(
          c.basis, c.contractNumber, c.freightTier, freightTiers,
          c.freightTerm, defaultFreight,
        ),
        weight: c.pricedQty,
      }))));
    }

    // Build freight term helper for a set of contracts
    const buildFreightMix = (sales: typeof completedContracts) => {
      const ftMap = new Map<string, number>();
      for (const c of sales) {
        const ft = c.freightTerm || 'Unknown';
        ftMap.set(ft, (ftMap.get(ft) || 0) + c.pricedQty);
      }
      const ftEntries = [...ftMap.entries()].sort((a, b) => b[1] - a[1]);
      const primaryFreightTerm = ftEntries.length > 0 ? ftEntries[0][0] : 'Unknown';
      const totalFtBu = ftEntries.reduce((s, [, v]) => s + v, 0);
      const topPercent = totalFtBu > 0 ? Math.round((ftEntries[0][1] / totalFtBu) * 100) : 0;
      const freightMixLabel = ftEntries.length <= 1
        ? primaryFreightTerm
        : topPercent >= 80
          ? `${primaryFreightTerm} (${topPercent}%)`
          : ftEntries.slice(0, 2).map(([ft, bu]) => `${ft} ${Math.round((bu / totalFtBu) * 100)}%`).join(', ');
      return { primaryFreightTerm, freightMixLabel };
    };

    // Group completed sales by entity → commodity
    const entityCommoditySales = new Map<string, Map<string, typeof completedContracts>>();
    for (const c of completedContracts) {
      if (c.contractType !== 'Sale') continue;
      if (!entityCommoditySales.has(c.entity)) entityCommoditySales.set(c.entity, new Map());
      const commodityMap = entityCommoditySales.get(c.entity)!;
      if (!commodityMap.has(c.commodityCode)) commodityMap.set(c.commodityCode, []);
      commodityMap.get(c.commodityCode)!.push(c);
    }

    // Build per-entity profitability with per-commodity sub-rows
    const profitability: CustomerProfitability[] = [...entityCommoditySales.entries()]
      .map(([entity, commodityMap]) => {
        const subRows: CustomerProfitability[] = [];
        let entityWeightedSell = 0;
        let entityWeightedBuy = 0;
        let entityTotalWeight = 0;
        let entityBushels = 0;
        let entityContractCount = 0;

        // All sales for this entity (for freight mix)
        const allEntitySales: typeof completedContracts = [];
        for (const sales of commodityMap.values()) allEntitySales.push(...sales);

        for (const [commodity, sales] of commodityMap) {
          const defaultFreight = defaultFreightByCommodity.get(commodity) ?? 0;

          const avgSellBasis = weightedAverage(sales.map((c) => ({
            value: adjustBasisForProfitability(
              c.basis, c.contractNumber, c.freightTier, freightTiers,
              c.freightTerm, defaultFreight,
            ),
            weight: c.pricedQty,
          })));
          const completedBushels = sales.reduce((s, c) => s + c.pricedQty, 0);
          const mktBasis = marketAvgBuyBasis.get(commodity) ?? null;
          const margin = avgSellBasis !== null && mktBasis !== null ? avgSellBasis - mktBasis : null;

          const { primaryFreightTerm, freightMixLabel } = buildFreightMix(sales);

          subRows.push({
            entity,
            commodity,
            avgSellBasis,
            marketAvgBuyBasis: mktBasis,
            approxMargin: margin,
            completedBushels,
            contractCount: sales.length,
            primaryFreightTerm,
            freightMixLabel,
          });

          // Accumulate for entity summary
          if (avgSellBasis !== null && completedBushels > 0) {
            entityWeightedSell += avgSellBasis * completedBushels;
            entityTotalWeight += completedBushels;
          }
          if (mktBasis !== null && completedBushels > 0) {
            entityWeightedBuy += mktBasis * completedBushels;
          }
          entityBushels += completedBushels;
          entityContractCount += sales.length;
        }

        const entityAvgSell = entityTotalWeight > 0 ? entityWeightedSell / entityTotalWeight : null;
        const entityAvgBuy = entityTotalWeight > 0 ? entityWeightedBuy / entityTotalWeight : null;
        const entityMargin = entityAvgSell !== null && entityAvgBuy !== null ? entityAvgSell - entityAvgBuy : null;
        const { primaryFreightTerm, freightMixLabel } = buildFreightMix(allEntitySales);

        return {
          entity,
          commodity: null, // summary row
          avgSellBasis: entityAvgSell,
          marketAvgBuyBasis: entityAvgBuy,
          approxMargin: entityMargin,
          completedBushels: entityBushels,
          contractCount: entityContractCount,
          primaryFreightTerm,
          freightMixLabel,
          subRows: subRows.length > 1 ? subRows : undefined, // only expand if multiple commodities
        };
      })
      .sort((a, b) => b.completedBushels - a.completedBushels);

    // Check profitability alerts (per-commodity)
    for (const p of profitability) {
      const cs = customerSummaries.find((c) => c.entity === p.entity);
      if (!cs) continue;

      // Check sub-rows for per-commodity alerts
      if (p.subRows) {
        for (const sub of p.subRows) {
          if (sub.approxMargin !== null && sub.approxMargin < 0) {
            cs.alerts.push({
              level: 'warning',
              message: `Negative ${sub.commodity} spread: ${sub.approxMargin.toFixed(4)}/bu`,
            });
          }
        }
      } else if (p.approxMargin !== null && p.approxMargin < 0) {
        cs.alerts.push({
          level: 'warning',
          message: `Negative historical spread: ${p.approxMargin.toFixed(4)}/bu`,
        });
      }
    }

    // Top 10 for donut chart
    const top10 = customerSummaries.slice(0, 10);
    const othersTotal = customerSummaries.slice(10).reduce((s, c) => s + c.totalCommittedBushels, 0);

    return {
      customerSummaries,
      profitability,
      top10,
      othersTotal,
      totalOpenBushels,
      uniqueEntities: customerSummaries.length,
    };
  }, [contracts, freightTiers]);
}
