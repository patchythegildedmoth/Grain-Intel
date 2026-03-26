import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { resolveContractM2M, type MarketLookups } from '../utils/resolveContractM2M';
import { aggregateM2M } from '../utils/aggregateM2M';
import { generateM2MAlerts } from '../utils/m2mAlerts';

// Re-export types for consumers
export type { ContractM2M } from '../utils/resolveContractM2M';
export type { FuturesMonthM2M, WaterfallTier, CommodityM2MSummary } from '../utils/aggregateM2M';
export type { M2MAlert } from '../utils/m2mAlerts';

export function useMarkToMarket() {
  const contracts = useContractStore((s) => s.contracts);
  const { settlements, sellBasis, inTransit, htaPaired, freightTiers } = useMarketDataStore((s) => s.current);
  const hasMarketData = useMarketDataStore((s) => s.lastUpdated !== null);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen && c.balance > 0);

    // Build lookup maps — exclude zero prices (unsaved/failed fetches)
    const settlementMap = new Map<string, number>();
    for (const s of settlements) {
      if (s.price > 0) {
        settlementMap.set(`${s.commodity}|${s.contractMonth}`, s.price);
      }
    }

    const basisMap = new Map<string, number>();
    for (const b of sellBasis) {
      basisMap.set(`${b.commodity}|${b.deliveryMonth}`, b.basis);
    }

    const lookups: MarketLookups = { settlementMap, basisMap, freightTiers: freightTiers ?? {} };

    // 1. Resolve each contract
    const allContracts = openContracts.map((c) => resolveContractM2M(c, lookups));

    // 2. Aggregate into commodity summaries
    const commoditySummaries = aggregateM2M(allContracts, inTransit, htaPaired, lookups);

    // 3. Compute totals
    const totalBookPnl = commoditySummaries.reduce((s, c) => s + c.totalPnl, 0);
    const totalOpenPnl = commoditySummaries.reduce((s, c) => s + c.openPnl, 0);
    const totalFuturesPnl = commoditySummaries.reduce((s, c) => s + c.futuresPnl, 0);
    const totalBasisPnl = commoditySummaries.reduce((s, c) => s + c.basisPnl, 0);

    // 4. Generate alerts
    const alerts = generateM2MAlerts(commoditySummaries, totalBookPnl);

    return {
      commoditySummaries,
      alerts,
      totalBookPnl,
      totalOpenPnl,
      totalFuturesPnl,
      totalBasisPnl,
      hasMarketData,
      allContracts,
    };
  }, [contracts, settlements, sellBasis, inTransit, htaPaired, freightTiers, hasMarketData]);
}
