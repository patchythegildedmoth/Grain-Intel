import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { getDeliveryMonth, getDeliveryMonthSortKey } from '../utils/futureMonth';
import { sortByCommodityOrder } from '../utils/commodityColors';

export interface ScaffoldBasisRow {
  commodity: string;
  deliveryMonth: string;
  sortKey: string;
  basis: number | null; // pre-filled from previous inputs or null
  futuresRef: string; // pre-filled or empty
  openContractCount: number;
  openBushels: number;
}

export interface ScaffoldSettlementRow {
  commodity: string;
  contractMonth: string; // e.g., "May 26"
  monthCode: string; // e.g., "K"
  sortKey: string;
  price: number | null;
  openContractCount: number;
  openBushels: number;
}

export interface MissingDataGap {
  type: 'basis' | 'settlement';
  commodity: string;
  month: string;
  contractCount: number;
}

/**
 * Auto-generates daily input table rows from open contracts.
 * Cross-references existing inputs to find gaps.
 */
export function useDailyInputScaffold() {
  const contracts = useContractStore((s) => s.contracts);
  const isLoaded = useContractStore((s) => s.isLoaded);
  const current = useMarketDataStore((s) => s.current);

  return useMemo(() => {
    if (!isLoaded) {
      return {
        basisRows: [] as ScaffoldBasisRow[],
        settlementRows: [] as ScaffoldSettlementRow[],
        commodities: [] as string[],
        gaps: [] as MissingDataGap[],
      };
    }

    const openContracts = contracts.filter((c) => c.isOpen && c.balance > 0);

    // --- Sell Basis rows: group by commodity × delivery month ---
    const basisRowMap = new Map<string, ScaffoldBasisRow>();
    for (const c of openContracts) {
      const deliveryMonth = getDeliveryMonth(c.endDate);
      if (!deliveryMonth) continue;

      const key = `${c.commodityCode}|${deliveryMonth}`;
      if (!basisRowMap.has(key)) {
        // Try to pre-fill from current inputs
        const existing = current.sellBasis.find(
          (b) => b.commodity === c.commodityCode && b.deliveryMonth === deliveryMonth,
        );
        basisRowMap.set(key, {
          commodity: c.commodityCode,
          deliveryMonth,
          sortKey: getDeliveryMonthSortKey(deliveryMonth),
          basis: existing?.basis ?? null,
          futuresRef: existing?.futuresRef ?? '',
          openContractCount: 0,
          openBushels: 0,
        });
      }
      const row = basisRowMap.get(key)!;
      row.openContractCount++;
      row.openBushels += c.balance;
    }

    const basisRows = [...basisRowMap.values()].sort((a, b) => {
      const commodityDiff = sortByCommodityOrder(a.commodity, b.commodity);
      if (commodityDiff !== 0) return commodityDiff;
      return a.sortKey.localeCompare(b.sortKey);
    });

    // --- Settlement rows: group by commodity × futures month ---
    const settlementRowMap = new Map<string, ScaffoldSettlementRow>();
    for (const c of openContracts) {
      if (!c.futureMonth) continue;

      const key = `${c.commodityCode}|${c.futureMonthSortKey}`;
      if (!settlementRowMap.has(key)) {
        // Extract month code from futureMonthShort (e.g., "May 26" → "K")
        const monthMatch = c.futureMonthShort.match(/^(\w{3})/);
        const monthName = monthMatch?.[1] ?? '';
        const monthCodes: Record<string, string> = {
          Jan: 'F', Feb: 'G', Mar: 'H', Apr: 'J', May: 'K', Jun: 'M',
          Jul: 'N', Aug: 'Q', Sep: 'U', Oct: 'V', Nov: 'X', Dec: 'Z',
        };
        const monthCode = monthCodes[monthName] ?? '';

        // Try to pre-fill from current inputs
        const existing = current.settlements.find(
          (s) => s.commodity === c.commodityCode && s.contractMonth === c.futureMonthShort,
        );

        settlementRowMap.set(key, {
          commodity: c.commodityCode,
          contractMonth: c.futureMonthShort,
          monthCode,
          sortKey: c.futureMonthSortKey,
          price: existing?.price ?? null,
          openContractCount: 0,
          openBushels: 0,
        });
      }
      const row = settlementRowMap.get(key)!;
      row.openContractCount++;
      row.openBushels += c.balance;
    }

    const settlementRows = [...settlementRowMap.values()].sort((a, b) => {
      const commodityDiff = sortByCommodityOrder(a.commodity, b.commodity);
      if (commodityDiff !== 0) return commodityDiff;
      return a.sortKey.localeCompare(b.sortKey);
    });

    // --- Commodities with open positions ---
    const commoditySet = new Set<string>();
    for (const c of openContracts) commoditySet.add(c.commodityCode);
    const commodities = [...commoditySet].sort(sortByCommodityOrder);

    // --- Find gaps: months with open contracts but no market data ---
    const gaps: MissingDataGap[] = [];
    for (const row of basisRows) {
      if (row.basis === null) {
        gaps.push({
          type: 'basis',
          commodity: row.commodity,
          month: row.deliveryMonth,
          contractCount: row.openContractCount,
        });
      }
    }
    for (const row of settlementRows) {
      if (row.price === null) {
        gaps.push({
          type: 'settlement',
          commodity: row.commodity,
          month: row.contractMonth,
          contractCount: row.openContractCount,
        });
      }
    }

    return { basisRows, settlementRows, commodities, gaps };
  }, [contracts, isLoaded, current]);
}
