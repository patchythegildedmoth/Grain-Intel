import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { weightedAverage } from '../utils/weightedAverage';
import { getFreightCost } from '../utils/freightTiers';
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
  avgSellBasis: number | null;
  marketAvgBuyBasis: number | null;
  approxMargin: number | null;
  completedBushels: number;
  contractCount: number;
  primaryFreightTerm: string;
  freightMixLabel: string;
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

    // --- Profitability: completed trades ---
    // Market avg buy basis by commodity
    const marketAvgBuyBasis = new Map<string, number | null>();
    const commoditiesInCompleted = new Set<string>();
    for (const c of completedContracts) commoditiesInCompleted.add(c.commodityCode);
    for (const commodity of commoditiesInCompleted) {
      const purchases = completedContracts.filter((c) => c.commodityCode === commodity && c.contractType === 'Purchase');
      marketAvgBuyBasis.set(commodity, weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.pricedQty }))));
    }

    // Per-entity sell basis
    const entitySales = new Map<string, typeof completedContracts>();
    for (const c of completedContracts) {
      if (c.contractType !== 'Sale') continue;
      if (!entitySales.has(c.entity)) entitySales.set(c.entity, []);
      entitySales.get(c.entity)!.push(c);
    }

    const profitability: CustomerProfitability[] = [...entitySales.entries()]
      .map(([entity, sales]) => {
        // Adjust sell basis for freight: FOB/Pickup contracts have a tier assigned.
        // The contract's locked basis is the FOB price (lower than delivered). Adding back
        // the freight cost gives the true realized margin vs. a delivered buy basis.
        const avgSellBasis = weightedAverage(sales.map((c) => {
          const tier = freightTiers?.[c.contractNumber] ?? c.freightTier ?? null;
          const freightCost = getFreightCost(tier);
          const effectiveBasis = c.basis !== null && freightCost > 0 ? c.basis + freightCost : c.basis;
          return { value: effectiveBasis, weight: c.pricedQty };
        }));
        const completedBushels = sales.reduce((s, c) => s + c.pricedQty, 0);

        // Weighted market buy basis across commodities this customer sold
        const commoditySales = new Map<string, number>();
        for (const c of sales) {
          commoditySales.set(c.commodityCode, (commoditySales.get(c.commodityCode) || 0) + c.pricedQty);
        }
        let weightedMarketBasis = 0;
        let totalWeight = 0;
        for (const [commodity, qty] of commoditySales) {
          const mktBasis = marketAvgBuyBasis.get(commodity);
          if (mktBasis !== null && mktBasis !== undefined) {
            weightedMarketBasis += mktBasis * qty;
            totalWeight += qty;
          }
        }
        const mktAvg = totalWeight > 0 ? weightedMarketBasis / totalWeight : null;

        // Freight term mix for this customer's sales
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

        return {
          entity,
          avgSellBasis,
          marketAvgBuyBasis: mktAvg,
          approxMargin: avgSellBasis !== null && mktAvg !== null ? avgSellBasis - mktAvg : null,
          completedBushels,
          contractCount: sales.length,
          primaryFreightTerm,
          freightMixLabel,
        };
      })
      .sort((a, b) => b.completedBushels - a.completedBushels);

    // Check profitability alerts
    for (const p of profitability) {
      if (p.approxMargin !== null && p.approxMargin < 0) {
        const cs = customerSummaries.find((c) => c.entity === p.entity);
        if (cs) {
          cs.alerts.push({
            level: 'warning',
            message: `Negative historical spread: ${p.approxMargin.toFixed(4)}/bu`,
          });
        }
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
