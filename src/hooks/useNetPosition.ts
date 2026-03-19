import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { weightedAverage } from '../utils/weightedAverage';
import { sortByCommodityOrder } from '../utils/commodityColors';

export interface PositionRow {
  commodity: string;
  futureMonthShort: string;
  futureMonthSortKey: string;
  longBushels: number;
  shortBushels: number;
  netBushels: number;
  avgBuyBasisLocked: number | null;
  avgSellBasisLocked: number | null;
  avgBuyBasisPosition: number | null;
  avgSellBasisPosition: number | null;
  grossSpreadLocked: number | null;
  grossSpreadPosition: number | null;
  avgBuyFutures: number | null;
  avgSellFutures: number | null;
  contractCount: number;
  isNetShort: boolean;
}

export interface CommoditySummary {
  commodity: string;
  totalLong: number;
  totalShort: number;
  totalNet: number;
  rows: PositionRow[];
}

export function useNetPosition() {
  const contracts = useContractStore((s) => s.contracts);
  const previousSnapshot = useContractStore((s) => s.previousSnapshot);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Group by commodity + futureMonthSortKey
    const groups = new Map<string, typeof openContracts>();
    for (const c of openContracts) {
      const key = `${c.commodityCode}|||${c.futureMonthSortKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(c);
    }

    // Build position rows
    const rowsByCommodity = new Map<string, PositionRow[]>();

    for (const [key, group] of groups) {
      const [commodity] = key.split('|||');
      const purchases = group.filter((c) => c.contractType === 'Purchase');
      const sales = group.filter((c) => c.contractType === 'Sale');

      const longBushels = purchases.reduce((sum, c) => sum + c.balance, 0);
      const shortBushels = sales.reduce((sum, c) => sum + c.balance, 0);

      const row: PositionRow = {
        commodity,
        futureMonthShort: group[0].futureMonthShort,
        futureMonthSortKey: group[0].futureMonthSortKey,
        longBushels,
        shortBushels,
        netBushels: longBushels - shortBushels,
        avgBuyBasisLocked: weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.pricedQty }))),
        avgSellBasisLocked: weightedAverage(sales.map((c) => ({ value: c.basis, weight: c.pricedQty }))),
        avgBuyBasisPosition: weightedAverage(purchases.map((c) => ({ value: c.basis, weight: c.balance }))),
        avgSellBasisPosition: weightedAverage(sales.map((c) => ({ value: c.basis, weight: c.balance }))),
        grossSpreadLocked: null,
        grossSpreadPosition: null,
        avgBuyFutures: weightedAverage(purchases.map((c) => ({ value: c.futures, weight: c.pricedQty }))),
        avgSellFutures: weightedAverage(sales.map((c) => ({ value: c.futures, weight: c.pricedQty }))),
        contractCount: group.length,
        isNetShort: longBushels - shortBushels < 0,
      };

      // Compute spreads
      if (row.avgBuyBasisLocked !== null && row.avgSellBasisLocked !== null) {
        row.grossSpreadLocked = row.avgSellBasisLocked - row.avgBuyBasisLocked;
      }
      if (row.avgBuyBasisPosition !== null && row.avgSellBasisPosition !== null) {
        row.grossSpreadPosition = row.avgSellBasisPosition - row.avgBuyBasisPosition;
      }

      if (!rowsByCommodity.has(commodity)) rowsByCommodity.set(commodity, []);
      rowsByCommodity.get(commodity)!.push(row);
    }

    // Sort and build summaries
    const commodities = [...rowsByCommodity.keys()].sort(sortByCommodityOrder);

    const summaries: CommoditySummary[] = commodities.map((commodity) => {
      const rows = rowsByCommodity.get(commodity)!.sort((a, b) =>
        a.futureMonthSortKey.localeCompare(b.futureMonthSortKey)
      );
      return {
        commodity,
        totalLong: rows.reduce((s, r) => s + r.longBushels, 0),
        totalShort: rows.reduce((s, r) => s + r.shortBushels, 0),
        totalNet: rows.reduce((s, r) => s + r.netBushels, 0),
        rows,
      };
    });

    // Delta from previous snapshot
    const deltas = new Map<string, number>();
    if (previousSnapshot) {
      for (const summary of summaries) {
        const prevCommodity = previousSnapshot.positions[summary.commodity];
        if (!prevCommodity) continue;
        const prevTotal = Object.values(prevCommodity).reduce((s, p) => s + p.net, 0);
        const delta = summary.totalNet - prevTotal;
        if (Math.abs(delta) > 0) {
          deltas.set(summary.commodity, delta);
        }
      }
    }

    return { summaries, deltas, openContractCount: openContracts.length };
  }, [contracts, previousSnapshot]);
}
