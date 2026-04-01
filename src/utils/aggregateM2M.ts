/**
 * Aggregates per-contract M2M results into commodity summaries with
 * futures-month breakdowns and exposure waterfall tiers.
 * Pure function — no store dependencies.
 */

import { groupBy } from './groupBy';
import { getDeliveryMonth } from './futureMonth';
import { sortByCommodityOrder } from './commodityColors';
import { weightedAverage } from './weightedAverage';
import { adjustBasisForFreight } from './freightTiers';
import type { ContractM2M, MarketLookups } from './resolveContractM2M';

export interface FuturesMonthM2M {
  futuresMonth: string;
  sortKey: string;
  longBushels: number;
  shortBushels: number;
  netBushels: number;
  avgBuyBasis: number | null;
  avgSellBasis: number | null;
  marketBasis: number | null;
  futuresPnl: number;
  basisPnl: number;
  totalPnl: number;
  contractCount: number;
}

export interface WaterfallTier {
  label: string;
  bushels: number;
  pnl: number;
  description: string;
}

export interface CommodityM2MSummary {
  commodity: string;
  longBushels: number;
  shortBushels: number;
  netBushels: number;
  inTransit: number;
  htaPaired: number;
  openExposure: number;
  totalPnl: number;
  openPnl: number;
  futuresPnl: number;
  basisPnl: number;
  markableContracts: number;
  unmarkableContracts: number;
  contracts: ContractM2M[];
  byFuturesMonth: FuturesMonthM2M[];
  waterfall: WaterfallTier[];
}

export function aggregateM2M(
  allContractM2M: ContractM2M[],
  inTransit: Record<string, number>,
  htaPaired: Record<string, number>,
  lookups: MarketLookups,
): CommodityM2MSummary[] {
  const byCommodity = groupBy(allContractM2M, (cm) => cm.contract.commodityCode);
  const commodityKeys = [...byCommodity.keys()].sort(sortByCommodityOrder);

  return commodityKeys.map((commodity) => {
    const group = byCommodity.get(commodity)!;

    let longBushels = 0;
    let shortBushels = 0;
    let totalPnl = 0;
    let futuresPnl = 0;
    let basisPnl = 0;
    let markableCount = 0;
    let unmarkableCount = 0;

    for (const cm of group) {
      if (cm.contract.contractType === 'Purchase') longBushels += cm.contract.balance;
      else shortBushels += cm.contract.balance;

      if (cm.m2m.isMarkable) {
        markableCount++;
        totalPnl += cm.m2m.totalPnl;
        futuresPnl += cm.m2m.futuresPnl ?? 0;
        basisPnl += cm.m2m.basisPnl ?? 0;
      } else {
        unmarkableCount++;
      }
    }

    const netBushels = longBushels - shortBushels;
    const inTransitBu = inTransit[commodity] ?? 0;
    const htaPairedBu = htaPaired[commodity] ?? 0;
    const openExposure = Math.max(0, netBushels - inTransitBu - htaPairedBu);

    // Exposure waterfall: in-transit P&L proxy from avg cash prices
    const purchasePriced = group.filter(
      (cm) => cm.contract.contractType === 'Purchase' && cm.contract.pricingType === 'Priced' && cm.contract.cashPrice !== null,
    );
    const salePriced = group.filter(
      (cm) => cm.contract.contractType === 'Sale' && cm.contract.pricingType === 'Priced' && cm.contract.cashPrice !== null,
    );

    const avgBuyCash = weightedAverage(
      purchasePriced.map((cm) => ({ value: cm.contract.cashPrice, weight: cm.contract.balance })),
    );
    const avgSellCash = weightedAverage(
      salePriced.map((cm) => ({ value: cm.contract.cashPrice, weight: cm.contract.balance })),
    );

    const inTransitPnl =
      avgBuyCash !== null && avgSellCash !== null ? (avgSellCash - avgBuyCash) * inTransitBu : 0;

    const openPnl = totalPnl - inTransitPnl;

    const waterfall: WaterfallTier[] = [
      { label: 'Total Position', bushels: netBushels, pnl: totalPnl, description: 'Full book unrealized P&L' },
      { label: 'Less: In-Transit', bushels: -inTransitBu, pnl: -inTransitPnl, description: 'Locked margin — does not change with market' },
      { label: 'Less: HTA-Paired', bushels: -htaPairedBu, pnl: 0, description: 'Basis-only exposure — changes with basis, not futures' },
      { label: 'True Open Exposure', bushels: openExposure, pnl: openPnl, description: 'Full market risk — changes with futures + basis' },
    ];

    // FM breakdown
    const byFM = groupBy(group, (cm) => cm.contract.futureMonthSortKey);
    const byFuturesMonth: FuturesMonthM2M[] = [...byFM.entries()]
      .map(([sortKey, fmGroup]) => {
        let fmLong = 0;
        let fmShort = 0;
        let fmFuturesPnl = 0;
        let fmBasisPnl = 0;
        let fmTotalPnl = 0;

        for (const cm of fmGroup) {
          if (cm.contract.contractType === 'Purchase') fmLong += cm.contract.balance;
          else fmShort += cm.contract.balance;
          if (cm.m2m.isMarkable) {
            fmFuturesPnl += cm.m2m.futuresPnl ?? 0;
            fmBasisPnl += cm.m2m.basisPnl ?? 0;
            fmTotalPnl += cm.m2m.totalPnl;
          }
        }

        const avgBuy = weightedAverage(
          fmGroup
            .filter((cm) => cm.contract.contractType === 'Purchase' && cm.contract.basis !== null)
            .map((cm) => ({
              value: adjustBasisForFreight(cm.contract.basis, cm.contract.contractNumber, cm.contract.freightTier, lookups.freightTiers),
              weight: cm.contract.balance,
            })),
        );
        const avgSell = weightedAverage(
          fmGroup
            .filter((cm) => cm.contract.contractType === 'Sale' && cm.contract.basis !== null)
            .map((cm) => ({
              value: adjustBasisForFreight(cm.contract.basis, cm.contract.contractNumber, cm.contract.freightTier, lookups.freightTiers),
              weight: cm.contract.balance,
            })),
        );

        const firstContract = fmGroup[0];
        const delMonth = firstContract ? getDeliveryMonth(firstContract.contract.endDate) : null;
        const mktBasis = delMonth ? (lookups.basisMap.get(`${commodity}|${delMonth}`) ?? null) : null;

        return {
          futuresMonth: fmGroup[0]?.contract.futureMonthShort ?? 'Unknown',
          sortKey,
          longBushels: fmLong,
          shortBushels: fmShort,
          netBushels: fmLong - fmShort,
          avgBuyBasis: avgBuy,
          avgSellBasis: avgSell,
          marketBasis: mktBasis,
          futuresPnl: fmFuturesPnl,
          basisPnl: fmBasisPnl,
          totalPnl: fmTotalPnl,
          contractCount: fmGroup.length,
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return {
      commodity,
      longBushels,
      shortBushels,
      netBushels,
      inTransit: inTransitBu,
      htaPaired: htaPairedBu,
      openExposure,
      totalPnl,
      openPnl,
      futuresPnl,
      basisPnl,
      markableContracts: markableCount,
      unmarkableContracts: unmarkableCount,
      contracts: group,
      byFuturesMonth,
      waterfall,
    };
  });
}
