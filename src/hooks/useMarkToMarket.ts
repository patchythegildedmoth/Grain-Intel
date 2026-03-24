import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { groupBy } from '../utils/groupBy';
import { getDeliveryMonth } from '../utils/futureMonth';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { getFreightCost } from '../utils/freightTiers';
import { weightedAverage } from '../utils/weightedAverage';
import {
  calcPricedPurchaseM2M,
  calcPricedSaleM2M,
  calcBasisM2M,
  calcHTAM2M,
  calcCashM2M,
  unmmarkableResult,
  type M2MResult,
} from '../utils/m2mCalc';
import type { Contract } from '../types/contracts';

export interface ContractM2M {
  contract: Contract;
  deliveryMonth: string;
  m2m: M2MResult;
  currentFutures: number | null;
  currentSellBasis: number | null;
  currentMarketValue: number | null;
}

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

export interface M2MAlert {
  severity: 'red' | 'amber' | 'blue';
  message: string;
}

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

    // Basis CAN legitimately be zero or negative, so include all entries
    // that were explicitly saved (non-null in store means user entered it)
    const basisMap = new Map<string, number>();
    for (const b of sellBasis) {
      basisMap.set(`${b.commodity}|${b.deliveryMonth}`, b.basis);
    }

    // Calculate M2M for each contract
    const allContractM2M: ContractM2M[] = openContracts.map((c) => {
      const deliveryMonth = getDeliveryMonth(c.endDate) ?? 'Unknown';
      const currentFutures = settlementMap.get(`${c.commodityCode}|${c.futureMonthShort}`) ?? null;
      const rawSellBasis = basisMap.get(`${c.commodityCode}|${deliveryMonth}`) ?? null;
      // Freight adjustment: look up tier from Excel upload > iRely column > none
      const tier = freightTiers?.[c.contractNumber] ?? c.freightTier ?? null;
      const freightCost = getFreightCost(tier);
      const currentSellBasis = rawSellBasis !== null && freightCost > 0
        ? rawSellBasis - freightCost
        : rawSellBasis;
      const currentMarketValue =
        currentFutures !== null && currentSellBasis !== null
          ? currentFutures + currentSellBasis
          : null;

      let m2m: M2MResult;

      switch (c.pricingType) {
        case 'Priced': {
          if (c.futures === null || c.basis === null || c.cashPrice === null) {
            m2m = unmmarkableResult('Missing contract price data');
            break;
          }
          if (currentFutures === null) {
            m2m = unmmarkableResult(`No settlement for ${c.futureMonthShort}`);
            break;
          }
          if (currentSellBasis === null) {
            m2m = unmmarkableResult(`No sell basis for ${deliveryMonth}`);
            break;
          }
          m2m =
            c.contractType === 'Purchase'
              ? calcPricedPurchaseM2M(c.futures, c.basis, c.cashPrice, c.balance, currentFutures, currentSellBasis)
              : calcPricedSaleM2M(c.futures, c.basis, c.cashPrice, c.balance, currentFutures, currentSellBasis);
          break;
        }
        case 'Basis': {
          if (c.basis === null) {
            m2m = unmmarkableResult('No locked basis on contract');
            break;
          }
          if (currentSellBasis === null) {
            m2m = unmmarkableResult(`No sell basis for ${deliveryMonth}`);
            break;
          }
          m2m = calcBasisM2M(c.basis, c.contractType, c.pricedQty, currentSellBasis);
          break;
        }
        case 'HTA': {
          if (c.futures === null) {
            m2m = unmmarkableResult('No locked futures on HTA contract');
            break;
          }
          if (currentFutures === null) {
            m2m = unmmarkableResult(`No settlement for ${c.futureMonthShort}`);
            break;
          }
          m2m = calcHTAM2M(c.futures, c.contractType, c.balance, currentFutures);
          break;
        }
        case 'Cash': {
          if (c.cashPrice === null) {
            m2m = unmmarkableResult('No cash price on contract');
            break;
          }
          if (currentFutures === null || currentSellBasis === null) {
            m2m = unmmarkableResult('Missing market data for cash contract');
            break;
          }
          m2m = calcCashM2M(c.cashPrice, c.contractType, c.balance, currentFutures, currentSellBasis);
          break;
        }
        default:
          m2m = unmmarkableResult(`Unknown pricing type: ${c.pricingType}`);
      }

      return { contract: c, deliveryMonth, m2m, currentFutures, currentSellBasis, currentMarketValue };
    });

    // Group by commodity
    const byCommodity = groupBy(allContractM2M, (cm) => cm.contract.commodityCode);
    const commodityKeys = [...byCommodity.keys()].sort(sortByCommodityOrder);
    const alerts: M2MAlert[] = [];

    const commoditySummaries: CommodityM2MSummary[] = commodityKeys.map((commodity) => {
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

      // Exposure waterfall
      // In-transit P&L: use average buy/sell cash prices as proxy
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

      // HTA-paired P&L: simplified — shown as separate tier in waterfall
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
              .map((cm) => ({ value: cm.contract.basis, weight: cm.contract.balance })),
          );
          const avgSell = weightedAverage(
            fmGroup
              .filter((cm) => cm.contract.contractType === 'Sale' && cm.contract.basis !== null)
              .map((cm) => ({ value: cm.contract.basis, weight: cm.contract.balance })),
          );

          // Get the market basis for this FM's contracts
          const firstContract = fmGroup[0];
          const delMonth = firstContract ? getDeliveryMonth(firstContract.contract.endDate) : null;
          const mktBasis = delMonth ? (basisMap.get(`${commodity}|${delMonth}`) ?? null) : null;

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

      // Alerts per commodity
      if (totalPnl < 0) {
        alerts.push({
          severity: 'red',
          message: `${commodity}: book P&L is negative (${formatDollar(totalPnl)})`,
        });
      }
      for (const fm of byFuturesMonth) {
        if (fm.totalPnl < -25_000) {
          alerts.push({
            severity: 'amber',
            message: `${commodity} ${fm.futuresMonth}: unrealized loss of ${formatDollar(fm.totalPnl)}`,
          });
        }
        // Check basis/futures divergence
        if (fm.futuresPnl !== 0 && fm.basisPnl !== 0 && Math.sign(fm.futuresPnl) !== Math.sign(fm.basisPnl)) {
          alerts.push({
            severity: 'blue',
            message: `${commodity} ${fm.futuresMonth}: basis and futures P&L diverging (futures: ${formatDollar(fm.futuresPnl)}, basis: ${formatDollar(fm.basisPnl)})`,
          });
        }
      }
      if (unmarkableCount > 0) {
        alerts.push({
          severity: 'amber',
          message: `${commodity}: ${unmarkableCount} contract${unmarkableCount > 1 ? 's' : ''} excluded — missing market data`,
        });
      }

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

    const totalBookPnl = commoditySummaries.reduce((s, c) => s + c.totalPnl, 0);
    const totalOpenPnl = commoditySummaries.reduce((s, c) => s + c.openPnl, 0);
    const totalFuturesPnl = commoditySummaries.reduce((s, c) => s + c.futuresPnl, 0);
    const totalBasisPnl = commoditySummaries.reduce((s, c) => s + c.basisPnl, 0);

    // Global alerts
    if (totalBookPnl < 0) {
      alerts.unshift({
        severity: 'red',
        message: `Total book P&L is NEGATIVE: ${formatDollar(totalBookPnl)}`,
      });
    }

    return {
      commoditySummaries,
      alerts,
      totalBookPnl,
      totalOpenPnl,
      totalFuturesPnl,
      totalBasisPnl,
      hasMarketData,
      allContracts: allContractM2M,
    };
  }, [contracts, settlements, sellBasis, inTransit, htaPaired, freightTiers, hasMarketData]);
}

function formatDollar(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
