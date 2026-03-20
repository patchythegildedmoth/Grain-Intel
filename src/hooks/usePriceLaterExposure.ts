import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { useMarketDataStore } from '../store/useMarketDataStore';
import { groupBy } from '../utils/groupBy';
import { calcCarrySpread, calcDailyCarryCost, calcPerPennyBasisRisk } from '../utils/carryCalc';
import type { CarrySpread } from '../utils/carryCalc';
import { getDeliveryMonth } from '../utils/futureMonth';
import { sortByCommodityOrder } from '../utils/commodityColors';

export interface BasisContractDetail {
  contractNumber: string;
  entity: string;
  commodity: string;
  futuresMonth: string;
  lockedBasis: number;
  unpricedBushels: number;
  currentFuturesPrice: number | null;
  currentMarketCashValue: number | null;
  daysUntilEnd: number;
  isOverdue: boolean;
  isUrgent: boolean;
  dailyCarryCost: number | null;
  carrySpread: CarrySpread | null;
}

export interface HTAContractDetail {
  contractNumber: string;
  entity: string;
  commodity: string;
  futuresMonth: string;
  deliveryMonth: string;
  lockedFutures: number;
  unpricedBushels: number;
  currentSellBasis: number | null;
  expectedCashPrice: number | null;
  daysUntilEnd: number;
  isOverdue: boolean;
  isUrgent: boolean;
}

export interface CommodityPriceLaterSummary {
  commodity: string;
  basisBushels: number;
  htaBushels: number;
  totalUnpriced: number;
  dailyCarryCost: number;
  perPennyBasisRisk: number;
  overdueBushels: number;
  basisContracts: BasisContractDetail[];
  htaContracts: HTAContractDetail[];
  carrySpread: CarrySpread | null; // nearby→deferred spread
}

export interface PriceLaterAlert {
  severity: 'red' | 'amber' | 'blue';
  message: string;
  commodity: string;
}

export function usePriceLaterExposure() {
  const contracts = useContractStore((s) => s.contracts);
  const { settlements, sellBasis } = useMarketDataStore((s) => s.current);
  const hasMarketData = useMarketDataStore((s) => s.lastUpdated !== null);

  return useMemo(() => {
    // Filter: open, Basis or HTA, with unpriced qty
    const unpricedContracts = contracts.filter(
      (c) =>
        c.isOpen &&
        (c.pricingType === 'Basis' || c.pricingType === 'HTA') &&
        (c.unpricedQty > 0 || (c.pricingType === 'HTA' && c.balance > 0)),
    );

    // Build lookup maps for market data
    const settlementMap = new Map<string, number>();
    for (const s of settlements) {
      settlementMap.set(`${s.commodity}|${s.contractMonth}`, s.price);
    }

    const basisMap = new Map<string, { basis: number; futuresRef: string }>();
    for (const b of sellBasis) {
      basisMap.set(`${b.commodity}|${b.deliveryMonth}`, { basis: b.basis, futuresRef: b.futuresRef });
    }

    // Build sorted settlement list per commodity for carry spread calc
    const settlementsByCommodity = new Map<string, { month: string; price: number; sortKey: string }[]>();
    for (const s of settlements) {
      if (!settlementsByCommodity.has(s.commodity)) settlementsByCommodity.set(s.commodity, []);
      settlementsByCommodity.get(s.commodity)!.push({
        month: s.contractMonth,
        price: s.price,
        sortKey: s.contractMonth, // sort by month label
      });
    }
    for (const [, arr] of settlementsByCommodity) {
      arr.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    }

    // Find next deferred settlement for carry calc
    const findDeferredPrice = (commodity: string, currentMonth: string): { month: string; price: number } | null => {
      const arr = settlementsByCommodity.get(commodity);
      if (!arr) return null;
      const currentIdx = arr.findIndex((s) => s.month === currentMonth);
      if (currentIdx === -1 || currentIdx >= arr.length - 1) return null;
      return { month: arr[currentIdx + 1].month, price: arr[currentIdx + 1].price };
    };

    const byCommodity = groupBy(unpricedContracts, (c) => c.commodityCode);
    const commodityKeys = [...byCommodity.keys()].sort(sortByCommodityOrder);

    const alerts: PriceLaterAlert[] = [];
    const summaries: CommodityPriceLaterSummary[] = commodityKeys.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const basisContracts: BasisContractDetail[] = [];
      const htaContracts: HTAContractDetail[] = [];
      let basisBushels = 0;
      let htaBushels = 0;
      let totalDailyCarry = 0;
      let overdueBushels = 0;
      let primaryCarrySpread: CarrySpread | null = null;

      for (const c of group) {
        if (c.pricingType === 'Basis' && c.contractType === 'Purchase') {
          const unpricedBu = c.unpricedQty;
          basisBushels += unpricedBu;

          const currentFutures = settlementMap.get(`${commodity}|${c.futureMonthShort}`) ?? null;

          let dailyCarryCost: number | null = null;
          let carrySpread: CarrySpread | null = null;

          if (currentFutures !== null) {
            const deferred = findDeferredPrice(commodity, c.futureMonthShort);
            if (deferred) {
              carrySpread = calcCarrySpread(c.futureMonthShort, deferred.month, currentFutures, deferred.price);
              dailyCarryCost = calcDailyCarryCost(unpricedBu, carrySpread.dailyRate);
              totalDailyCarry += dailyCarryCost;
              if (!primaryCarrySpread) primaryCarrySpread = carrySpread;
            }
          }

          if (c.isOverdue) overdueBushels += unpricedBu;

          basisContracts.push({
            contractNumber: c.contractNumber,
            entity: c.entity,
            commodity,
            futuresMonth: c.futureMonthShort,
            lockedBasis: c.basis ?? 0,
            unpricedBushels: unpricedBu,
            currentFuturesPrice: currentFutures,
            currentMarketCashValue:
              currentFutures !== null && c.basis !== null ? currentFutures + c.basis : null,
            daysUntilEnd: c.daysUntilDeliveryEnd,
            isOverdue: c.isOverdue,
            isUrgent: c.isUrgent,
            dailyCarryCost,
            carrySpread,
          });
        } else if (c.pricingType === 'HTA') {
          const unpricedBu = c.unpricedQty > 0 ? c.unpricedQty : c.balance;
          htaBushels += unpricedBu;

          const deliveryMonth = getDeliveryMonth(c.endDate) ?? 'Unknown';
          const basisEntry = basisMap.get(`${commodity}|${deliveryMonth}`);

          if (c.isOverdue) overdueBushels += unpricedBu;

          htaContracts.push({
            contractNumber: c.contractNumber,
            entity: c.entity,
            commodity,
            futuresMonth: c.futureMonthShort,
            deliveryMonth,
            lockedFutures: c.futures ?? 0,
            unpricedBushels: unpricedBu,
            currentSellBasis: basisEntry?.basis ?? null,
            expectedCashPrice:
              c.futures !== null && basisEntry ? c.futures + basisEntry.basis : null,
            daysUntilEnd: c.daysUntilDeliveryEnd,
            isOverdue: c.isOverdue,
            isUrgent: c.isUrgent,
          });
        }
      }

      // Sort by days until end (most urgent first)
      basisContracts.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);
      htaContracts.sort((a, b) => a.daysUntilEnd - b.daysUntilEnd);

      const perPennyBasisRisk = calcPerPennyBasisRisk(htaBushels);

      // Alerts
      if (overdueBushels > 0) {
        alerts.push({
          severity: 'red',
          message: `${commodity}: ${(overdueBushels / 1000).toFixed(0)}K unpriced bushels past delivery date`,
          commodity,
        });
      }
      if (Math.abs(totalDailyCarry) > 500) {
        alerts.push({
          severity: 'amber',
          message: `${commodity}: daily carry cost is $${Math.abs(totalDailyCarry).toFixed(0)}/day${totalDailyCarry < 0 ? ' (BENEFIT — inverted market)' : ''}`,
          commodity,
        });
      }
      // Check for entity concentration
      const entityBushels = new Map<string, number>();
      for (const c of [...basisContracts, ...htaContracts]) {
        entityBushels.set(c.entity, (entityBushels.get(c.entity) ?? 0) + c.unpricedBushels);
      }
      for (const [entity, bu] of entityBushels) {
        if (bu > 100_000) {
          alerts.push({
            severity: 'amber',
            message: `${commodity}: ${entity} has ${(bu / 1000).toFixed(0)}K unpriced bushels`,
            commodity,
          });
        }
      }
      if (primaryCarrySpread?.isInverted) {
        alerts.push({
          severity: 'blue',
          message: `${commodity}: market is INVERTED (${primaryCarrySpread.nearbyMonth}→${primaryCarrySpread.deferredMonth}: $${primaryCarrySpread.spread.toFixed(4)}) — carry cost is a benefit`,
          commodity,
        });
      }

      return {
        commodity,
        basisBushels,
        htaBushels,
        totalUnpriced: basisBushels + htaBushels,
        dailyCarryCost: totalDailyCarry,
        perPennyBasisRisk,
        overdueBushels,
        basisContracts,
        htaContracts,
        carrySpread: primaryCarrySpread,
      };
    });

    const totalDailyCarry = summaries.reduce((s, c) => s + c.dailyCarryCost, 0);
    const totalPerPennyRisk = summaries.reduce((s, c) => s + c.perPennyBasisRisk, 0);
    const totalBasisBushels = summaries.reduce((s, c) => s + c.basisBushels, 0);
    const totalHTABushels = summaries.reduce((s, c) => s + c.htaBushels, 0);

    return {
      summaries,
      alerts,
      totalDailyCarry,
      totalPerPennyRisk,
      totalBasisBushels,
      totalHTABushels,
      hasMarketData,
    };
  }, [contracts, settlements, sellBasis, hasMarketData]);
}
