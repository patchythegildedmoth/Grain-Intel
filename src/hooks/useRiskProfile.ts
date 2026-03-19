import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';
import type { PricingType } from '../types/contracts';

export interface PricingTypeBreakdown {
  pricingType: PricingType;
  bushels: number;
  percent: number;
  contractCount: number;
}

export interface FuturesMonthDetail {
  futureMonthShort: string;
  futureMonthSortKey: string;
  pricingType: PricingType;
  bushels: number;
  contractCount: number;
  isNearby: boolean;
}

export interface CommodityRiskProfile {
  commodity: string;
  totalOpenBushels: number;
  breakdown: PricingTypeBreakdown[];
  hedgeRatio: number;
  unpricedRatio: number;
  futuresMonthDetail: FuturesMonthDetail[];
  alerts: { level: AlertLevel; message: string }[];
}

export function useRiskProfile() {
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Group by commodity
    const byCommodity = new Map<string, typeof openContracts>();
    for (const c of openContracts) {
      if (!byCommodity.has(c.commodityCode)) byCommodity.set(c.commodityCode, []);
      byCommodity.get(c.commodityCode)!.push(c);
    }

    const commodities = [...byCommodity.keys()].sort(sortByCommodityOrder);

    // Determine "nearby" months (current month + next 2)
    const now = new Date();
    const nearbyKeys = new Set<string>();
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i);
      nearbyKeys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const profiles: CommodityRiskProfile[] = commodities.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const totalOpenBushels = group.reduce((s, c) => s + c.balance, 0);

      // Pricing type breakdown
      const typeMap = new Map<PricingType, { bushels: number; count: number }>();
      for (const c of group) {
        if (!typeMap.has(c.pricingType)) typeMap.set(c.pricingType, { bushels: 0, count: 0 });
        const entry = typeMap.get(c.pricingType)!;
        entry.bushels += c.balance;
        entry.count++;
      }

      const breakdown: PricingTypeBreakdown[] = (['Priced', 'Basis', 'HTA', 'Cash'] as PricingType[])
        .filter((pt) => typeMap.has(pt))
        .map((pt) => {
          const entry = typeMap.get(pt)!;
          return {
            pricingType: pt,
            bushels: entry.bushels,
            percent: totalOpenBushels > 0 ? entry.bushels / totalOpenBushels : 0,
            contractCount: entry.count,
          };
        });

      // Hedge ratio: (Priced + HTA) / total (both have futures locked)
      const pricedBu = typeMap.get('Priced')?.bushels || 0;
      const htaBu = typeMap.get('HTA')?.bushels || 0;
      const hedgeRatio = totalOpenBushels > 0 ? (pricedBu + htaBu) / totalOpenBushels : 0;

      // Unpriced ratio: (Basis + Cash) / total
      const basisBu = typeMap.get('Basis')?.bushels || 0;
      const cashBu = typeMap.get('Cash')?.bushels || 0;
      const unpricedRatio = totalOpenBushels > 0 ? (basisBu + cashBu) / totalOpenBushels : 0;

      // Futures month detail for Basis and HTA contracts
      const detailContracts = group.filter((c) => c.pricingType === 'Basis' || c.pricingType === 'HTA');
      const fmMap = new Map<string, FuturesMonthDetail>();
      for (const c of detailContracts) {
        const key = `${c.futureMonthSortKey}|||${c.pricingType}`;
        if (!fmMap.has(key)) {
          fmMap.set(key, {
            futureMonthShort: c.futureMonthShort,
            futureMonthSortKey: c.futureMonthSortKey,
            pricingType: c.pricingType,
            bushels: 0,
            contractCount: 0,
            isNearby: nearbyKeys.has(c.futureMonthSortKey.substring(0, 7)),
          });
        }
        const entry = fmMap.get(key)!;
        entry.bushels += c.balance;
        entry.contractCount++;
      }
      const futuresMonthDetail = [...fmMap.values()]
        .sort((a, b) => a.futureMonthSortKey.localeCompare(b.futureMonthSortKey));

      // Alerts
      const alerts: { level: AlertLevel; message: string }[] = [];

      if (unpricedRatio > THRESHOLDS.unpricedRatioThreshold) {
        alerts.push({
          level: 'warning',
          message: `Unpriced ${Math.round(unpricedRatio * 100)}% of position (>${Math.round(THRESHOLDS.unpricedRatioThreshold * 100)}% threshold)`,
        });
      }

      // Concentrated Basis in single nearby month
      const nearbyBasis = futuresMonthDetail.filter((fm) => fm.isNearby && fm.pricingType === 'Basis');
      for (const fm of nearbyBasis) {
        if (fm.bushels > 50_000) {
          alerts.push({
            level: 'warning',
            message: `${formatBuK(fm.bushels)} Basis contracts in nearby ${fm.futureMonthShort}`,
          });
        }
      }

      return {
        commodity,
        totalOpenBushels,
        breakdown,
        hedgeRatio,
        unpricedRatio,
        futuresMonthDetail,
        alerts,
      };
    });

    // Overall stats
    const totalOpen = profiles.reduce((s, p) => s + p.totalOpenBushels, 0);
    const overallHedgeRatio = totalOpen > 0
      ? profiles.reduce((s, p) => s + (p.hedgeRatio * p.totalOpenBushels), 0) / totalOpen
      : 0;

    return { profiles, overallHedgeRatio, totalOpen };
  }, [contracts]);
}

function formatBuK(n: number): string {
  return `${(n / 1000).toFixed(0)}K bu`;
}
