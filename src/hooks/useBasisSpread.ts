import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { weightedAverage } from '../utils/weightedAverage';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';

export interface FreightBasisBreakdown {
  freightTerm: string;
  avgBasis: number | null;
  bushels: number;
  contractCount: number;
}

export interface SpreadRow {
  commodity: string;
  futureMonthShort: string;
  futureMonthSortKey: string;
  avgBuyBasis: number | null;
  avgSellBasis: number | null;
  grossSpread: number | null;
  buyBushels: number;
  sellBushels: number;
  contractCount: number;
  buyByFreight: FreightBasisBreakdown[];
  sellByFreight: FreightBasisBreakdown[];
}

export interface HistoricalSpread {
  commodity: string;
  year: number;
  avgBuyBasis: number | null;
  avgSellBasis: number | null;
  grossSpread: number | null;
  completedBushels: number;
  contractCount: number;
  buyByFreight: FreightBasisBreakdown[];
  sellByFreight: FreightBasisBreakdown[];
}

export interface MonthlyTrend {
  monthKey: string;
  monthLabel: string;
  commodity: string;
  avgBuyBasis: number | null;
  avgSellBasis: number | null;
  grossSpread: number | null;
  completedBushels: number;
}

export interface CommoditySpreadSummary {
  commodity: string;
  currentBook: SpreadRow[];
  overallAvgBuyBasis: number | null;
  overallAvgSellBasis: number | null;
  overallSpread: number | null;
  historicalSpreads: HistoricalSpread[];
  monthlyTrend: MonthlyTrend[];
  alerts: { level: AlertLevel; message: string }[];
}

function computeFreightBreakdown(
  contracts: { freightTerm: string | null; basis: number | null; pricedQty: number; balance: number }[],
): FreightBasisBreakdown[] {
  const map = new Map<string, { totalBasis: number; totalWeight: number; count: number }>();
  for (const c of contracts) {
    const ft = c.freightTerm || 'Unknown';
    if (!map.has(ft)) map.set(ft, { totalBasis: 0, totalWeight: 0, count: 0 });
    const entry = map.get(ft)!;
    entry.count++;
    if (c.basis !== null && c.pricedQty > 0) {
      entry.totalBasis += c.basis * c.pricedQty;
      entry.totalWeight += c.pricedQty;
    }
  }
  return [...map.entries()]
    .map(([freightTerm, data]) => ({
      freightTerm,
      avgBasis: data.totalWeight > 0 ? data.totalBasis / data.totalWeight : null,
      bushels: contracts.filter((c) => (c.freightTerm || 'Unknown') === freightTerm).reduce((s, c) => s + c.balance, 0),
      contractCount: data.count,
    }))
    .sort((a, b) => b.bushels - a.bushels);
}

export function useBasisSpread() {
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);
    const completedContracts = contracts.filter((c) => c.isCompleted);

    // --- Current Book: open contracts by commodity + futureMonth ---
    const openGroups = new Map<string, typeof openContracts>();
    for (const c of openContracts) {
      const key = `${c.commodityCode}|||${c.futureMonthSortKey}`;
      if (!openGroups.has(key)) openGroups.set(key, []);
      openGroups.get(key)!.push(c);
    }

    const spreadsByCommodity = new Map<string, SpreadRow[]>();
    for (const [key, group] of openGroups) {
      const [commodity] = key.split('|||');
      const purchases = group.filter((c) => c.contractType === 'Purchase');
      const sales = group.filter((c) => c.contractType === 'Sale');

      const avgBuyBasis = weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.pricedQty })));
      const avgSellBasis = weightedAverage(sales.map((c) => ({ value: c.basis, weight: c.pricedQty })));

      const row: SpreadRow = {
        commodity,
        futureMonthShort: group[0].futureMonthShort,
        futureMonthSortKey: group[0].futureMonthSortKey,
        avgBuyBasis,
        avgSellBasis,
        grossSpread: avgBuyBasis !== null && avgSellBasis !== null ? avgSellBasis - avgBuyBasis : null,
        buyBushels: purchases.reduce((s, c) => s + c.balance, 0),
        sellBushels: sales.reduce((s, c) => s + c.balance, 0),
        contractCount: group.length,
        buyByFreight: computeFreightBreakdown(purchases),
        sellByFreight: computeFreightBreakdown(sales),
      };

      if (!spreadsByCommodity.has(commodity)) spreadsByCommodity.set(commodity, []);
      spreadsByCommodity.get(commodity)!.push(row);
    }

    // --- Historical: completed trades by commodity + year ---
    const histGroups = new Map<string, typeof completedContracts>();
    for (const c of completedContracts) {
      const year = c.endDate.getFullYear();
      const key = `${c.commodityCode}|||${year}`;
      if (!histGroups.has(key)) histGroups.set(key, []);
      histGroups.get(key)!.push(c);
    }

    const historicalByCommodity = new Map<string, HistoricalSpread[]>();
    for (const [key, group] of histGroups) {
      const [commodity, yearStr] = key.split('|||');
      const purchases = group.filter((c) => c.contractType === 'Purchase');
      const sales = group.filter((c) => c.contractType === 'Sale');

      const avgBuyBasis = weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.pricedQty })));
      const avgSellBasis = weightedAverage(sales.map((c) => ({ value: c.basis, weight: c.pricedQty })));

      const entry: HistoricalSpread = {
        commodity,
        year: parseInt(yearStr),
        avgBuyBasis,
        avgSellBasis,
        grossSpread: avgBuyBasis !== null && avgSellBasis !== null ? avgSellBasis - avgBuyBasis : null,
        completedBushels: group.reduce((s, c) => s + c.pricedQty, 0),
        contractCount: group.length,
        buyByFreight: computeFreightBreakdown(purchases),
        sellByFreight: computeFreightBreakdown(sales),
      };

      if (!historicalByCommodity.has(commodity)) historicalByCommodity.set(commodity, []);
      historicalByCommodity.get(commodity)!.push(entry);
    }

    // --- Monthly trend: last 12 months of completed trades ---
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const recentCompleted = completedContracts.filter((c) => c.endDate >= twelveMonthsAgo);
    const trendGroups = new Map<string, typeof completedContracts>();
    for (const c of recentCompleted) {
      const d = c.endDate;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const key = `${c.commodityCode}|||${monthKey}`;
      if (!trendGroups.has(key)) trendGroups.set(key, []);
      trendGroups.get(key)!.push(c);
    }

    const trendByCommodity = new Map<string, MonthlyTrend[]>();
    for (const [key, group] of trendGroups) {
      const [commodity, monthKey] = key.split('|||');
      const [year, month] = monthKey.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const purchases = group.filter((c) => c.contractType === 'Purchase');
      const sales = group.filter((c) => c.contractType === 'Sale');

      const avgBuyBasis = weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.pricedQty })));
      const avgSellBasis = weightedAverage(sales.map((c) => ({ value: c.basis, weight: c.pricedQty })));

      const trend: MonthlyTrend = {
        monthKey,
        monthLabel,
        commodity,
        avgBuyBasis,
        avgSellBasis,
        grossSpread: avgBuyBasis !== null && avgSellBasis !== null ? avgSellBasis - avgBuyBasis : null,
        completedBushels: group.reduce((s, c) => s + c.pricedQty, 0),
      };

      if (!trendByCommodity.has(commodity)) trendByCommodity.set(commodity, []);
      trendByCommodity.get(commodity)!.push(trend);
    }

    // --- Build commodity summaries ---
    const allCommodities = new Set<string>();
    for (const k of spreadsByCommodity.keys()) allCommodities.add(k);
    for (const k of historicalByCommodity.keys()) allCommodities.add(k);

    const commodities = [...allCommodities].sort(sortByCommodityOrder);

    const summaries: CommoditySpreadSummary[] = commodities.map((commodity) => {
      const currentBook = (spreadsByCommodity.get(commodity) || [])
        .sort((a, b) => a.futureMonthSortKey.localeCompare(b.futureMonthSortKey));

      const historicalSpreads = (historicalByCommodity.get(commodity) || [])
        .sort((a, b) => a.year - b.year);

      const monthlyTrend = (trendByCommodity.get(commodity) || [])
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      // Overall weighted avg for current book
      const allOpenPurchases = openContracts.filter((c) => c.commodityCode === commodity && c.contractType === 'Purchase');
      const allOpenSales = openContracts.filter((c) => c.commodityCode === commodity && c.contractType === 'Sale');
      const overallAvgBuyBasis = weightedAverage(allOpenPurchases.map((c) => ({ value: c.basis, weight: c.pricedQty })));
      const overallAvgSellBasis = weightedAverage(allOpenSales.map((c) => ({ value: c.basis, weight: c.pricedQty })));
      const overallSpread = overallAvgBuyBasis !== null && overallAvgSellBasis !== null
        ? overallAvgSellBasis - overallAvgBuyBasis : null;

      // Alerts
      const alerts: { level: AlertLevel; message: string }[] = [];

      // Negative spread
      if (overallSpread !== null && overallSpread < 0) {
        alerts.push({
          level: 'critical',
          message: `Negative spread: ${overallSpread.toFixed(4)}/bu`,
        });
      }

      // Spread compression vs historical
      if (overallSpread !== null && historicalSpreads.length > 0) {
        const historicalAvgSpread = historicalSpreads
          .filter((h) => h.grossSpread !== null)
          .reduce((sum, h, _, arr) => sum + (h.grossSpread! / arr.length), 0);

        if (historicalAvgSpread > 0 && overallSpread < historicalAvgSpread * (1 - THRESHOLDS.spreadCompressionPercent)) {
          alerts.push({
            level: 'warning',
            message: `Spread compressed ${Math.round((1 - overallSpread / historicalAvgSpread) * 100)}% vs historical avg`,
          });
        }
      }

      // Per-month negative spreads
      for (const row of currentBook) {
        if (row.grossSpread !== null && row.grossSpread < 0) {
          alerts.push({
            level: 'warning',
            message: `Negative spread in ${row.futureMonthShort}: ${row.grossSpread.toFixed(4)}/bu`,
          });
        }
      }

      return {
        commodity,
        currentBook,
        overallAvgBuyBasis,
        overallAvgSellBasis,
        overallSpread,
        historicalSpreads,
        monthlyTrend,
        alerts,
      };
    });

    return { summaries };
  }, [contracts]);
}
