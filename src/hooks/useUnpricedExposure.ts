import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import type { Contract } from '../types/contracts';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';
import { groupByFreightTerm, type FreightNetExposure } from '../utils/freightBreakdown';

export interface UnpricedContract extends Contract {
  exposureBushels: number;
  signedExposureBushels: number; // +purchase, -sale
  exposureType: 'Futures Unpriced' | 'Basis Unpriced';
}

export interface UnpricedSummaryRow {
  commodity: string;
  contractType: string;
  pricingType: string;
  exposureType: string;
  contractCount: number;
  totalExposureBushels: number;
  avgDaysToExpiry: number;
  overdueCount: number;
  urgentCount: number;
}

export interface FuturesMonthExposure {
  futureMonthShort: string;
  futureMonthSortKey: string;
  grossExposure: number;
  netExposure: number;
  purchaseExposure: number;
  saleExposure: number;
  contractCount: number;
  freightBreakdown: FreightNetExposure[];
}

export interface UnpricedAlert {
  level: AlertLevel;
  message: string;
}

export interface CommodityExposureSummary {
  commodity: string;
  totalExposure: number; // gross
  netExposure: number;
  purchaseExposure: number;
  saleExposure: number;
  overdueContracts: number;
  urgentContracts: number;
  contracts: UnpricedContract[];
  summaryRows: UnpricedSummaryRow[];
  futuresMonthBreakdown: FuturesMonthExposure[];
  freightBreakdown: FreightNetExposure[]; // derived from FM-level sums
  alerts: UnpricedAlert[];
}

export { type FreightNetExposure } from '../utils/freightBreakdown';

export function useUnpricedExposure() {
  const contracts = useContractStore((s) => s.contracts);
  const previousSnapshot = useContractStore((s) => s.previousSnapshot);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Find unpriced contracts:
    // 1. Contracts with unpricedQty > 0 (Basis contracts with futures unpriced)
    // 2. HTA contracts with balance > 0 (basis is unpriced even though futures are set)
    const unpricedContracts: UnpricedContract[] = [];

    for (const c of openContracts) {
      if (c.unpricedQty > 0) {
        const sign = c.contractType === 'Purchase' ? 1 : -1;
        unpricedContracts.push({
          ...c,
          exposureBushels: c.unpricedQty,
          signedExposureBushels: c.unpricedQty * sign,
          exposureType: 'Futures Unpriced',
        });
      } else if (c.pricingType === 'HTA' && c.balance > 0) {
        const sign = c.contractType === 'Purchase' ? 1 : -1;
        unpricedContracts.push({
          ...c,
          exposureBushels: c.balance,
          signedExposureBushels: c.balance * sign,
          exposureType: 'Basis Unpriced',
        });
      }
    }

    // Group by commodity
    const byCommodity = new Map<string, UnpricedContract[]>();
    for (const c of unpricedContracts) {
      if (!byCommodity.has(c.commodityCode)) byCommodity.set(c.commodityCode, []);
      byCommodity.get(c.commodityCode)!.push(c);
    }

    // Previous exposure for day-over-day delta
    const previousExposure = previousSnapshot?.exposure ?? null;

    // Build commodity summaries
    const commodities = [...byCommodity.keys()].sort(sortByCommodityOrder);

    const commoditySummaries: CommodityExposureSummary[] = commodities.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const totalExposure = group.reduce((s, c) => s + c.exposureBushels, 0);

      // Net exposure: purchase minus sale
      const purchaseContracts = group.filter((c) => c.contractType === 'Purchase');
      const saleContracts = group.filter((c) => c.contractType === 'Sale');
      const purchaseExposure = purchaseContracts.reduce((s, c) => s + c.exposureBushels, 0);
      const saleExposure = saleContracts.reduce((s, c) => s + c.exposureBushels, 0);
      const netExposure = purchaseExposure - saleExposure;

      const overdueContracts = group.filter((c) => c.isOverdue).length;
      const urgentContracts = group.filter((c) => c.isUrgent && !c.isOverdue).length;

      // Build summary rows grouped by contractType + pricingType + exposureType
      const summaryMap = new Map<string, UnpricedSummaryRow>();
      for (const c of group) {
        const key = `${c.contractType}|||${c.pricingType}|||${c.exposureType}`;
        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            commodity,
            contractType: c.contractType,
            pricingType: c.pricingType,
            exposureType: c.exposureType,
            contractCount: 0,
            totalExposureBushels: 0,
            avgDaysToExpiry: 0,
            overdueCount: 0,
            urgentCount: 0,
          });
        }
        const row = summaryMap.get(key)!;
        row.contractCount++;
        row.totalExposureBushels += c.exposureBushels;
        row.avgDaysToExpiry += c.daysUntilDeliveryEnd;
        if (c.isOverdue) row.overdueCount++;
        if (c.isUrgent && !c.isOverdue) row.urgentCount++;
      }

      // Compute averages
      const summaryRows = [...summaryMap.values()];
      for (const row of summaryRows) {
        row.avgDaysToExpiry = row.contractCount > 0
          ? Math.round(row.avgDaysToExpiry / row.contractCount)
          : 0;
      }

      // Futures month breakdown
      const fmMap = new Map<string, { short: string; sortKey: string; purchase: number; sale: number; count: number; contracts: UnpricedContract[] }>();
      for (const c of group) {
        const key = c.futureMonthSortKey;
        if (!fmMap.has(key)) {
          fmMap.set(key, { short: c.futureMonthShort, sortKey: key, purchase: 0, sale: 0, count: 0, contracts: [] });
        }
        const entry = fmMap.get(key)!;
        entry.count++;
        entry.contracts.push(c);
        if (c.contractType === 'Purchase') {
          entry.purchase += c.exposureBushels;
        } else {
          entry.sale += c.exposureBushels;
        }
      }

      const futuresMonthBreakdown: FuturesMonthExposure[] = [...fmMap.values()]
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map((fm) => ({
          futureMonthShort: fm.short,
          futureMonthSortKey: fm.sortKey,
          grossExposure: fm.purchase + fm.sale,
          netExposure: fm.purchase - fm.sale,
          purchaseExposure: fm.purchase,
          saleExposure: fm.sale,
          contractCount: fm.count,
          freightBreakdown: groupByFreightTerm(fm.contracts),
        }));

      // Commodity-level freight: derived from FM-level sums (DRY — single source of truth)
      const freightAgg = new Map<string, { purchase: number; sale: number }>();
      for (const fm of futuresMonthBreakdown) {
        for (const fb of fm.freightBreakdown) {
          if (!freightAgg.has(fb.freightTerm)) freightAgg.set(fb.freightTerm, { purchase: 0, sale: 0 });
          const entry = freightAgg.get(fb.freightTerm)!;
          entry.purchase += fb.purchaseExposure;
          entry.sale += fb.saleExposure;
        }
      }
      const freightBreakdown: FreightNetExposure[] = [...freightAgg.entries()]
        .map(([freightTerm, data]) => ({
          freightTerm,
          purchaseExposure: data.purchase,
          saleExposure: data.sale,
          netExposure: data.purchase - data.sale,
          grossExposure: data.purchase + data.sale,
        }))
        .sort((a, b) => b.grossExposure - a.grossExposure);

      // Generate alerts
      const alerts: UnpricedAlert[] = [];

      if (overdueContracts > 0) {
        alerts.push({
          level: 'critical',
          message: `${overdueContracts} overdue contract${overdueContracts > 1 ? 's' : ''} with unpriced exposure`,
        });
      }

      if (urgentContracts > 0) {
        alerts.push({
          level: 'warning',
          message: `${urgentContracts} contract${urgentContracts > 1 ? 's' : ''} expiring within ${THRESHOLDS.unpricedUrgentDays} days`,
        });
      }

      if (totalExposure > THRESHOLDS.unpricedCommodityBushels) {
        alerts.push({
          level: 'warning',
          message: `Total unpriced exposure exceeds ${(THRESHOLDS.unpricedCommodityBushels / 1000).toFixed(0)}K bu`,
        });
      }

      // Net exposure alert
      if (Math.abs(netExposure) > THRESHOLDS.netExposureCommodityBushels) {
        const direction = netExposure > 0 ? 'Net Long' : 'Net Short';
        alerts.push({
          level: 'warning',
          message: `${direction} ${(Math.abs(netExposure) / 1000).toFixed(0)}K bu (>${(THRESHOLDS.netExposureCommodityBushels / 1000).toFixed(0)}K threshold)`,
        });
      }

      // Entity concentration check
      const entityExposure = new Map<string, number>();
      for (const c of group) {
        entityExposure.set(c.entity, (entityExposure.get(c.entity) || 0) + c.exposureBushels);
      }
      for (const [entity, exposure] of entityExposure) {
        if (exposure > THRESHOLDS.unpricedEntityBushels) {
          alerts.push({
            level: 'warning',
            message: `${entity}: ${(exposure / 1000).toFixed(0)}K bu unpriced (>${(THRESHOLDS.unpricedEntityBushels / 1000).toFixed(0)}K threshold)`,
          });
        }
      }

      // Sort contracts: overdue first, then by end date ascending
      const sortedContracts = [...group].sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        return a.endDate.getTime() - b.endDate.getTime();
      });

      return {
        commodity,
        totalExposure,
        netExposure,
        purchaseExposure,
        saleExposure,
        overdueContracts,
        urgentContracts,
        contracts: sortedContracts,
        summaryRows,
        futuresMonthBreakdown,
        freightBreakdown,
        alerts,
      };
    });

    // Global stats
    const totalExposure = commoditySummaries.reduce((s, c) => s + c.totalExposure, 0);
    const totalNetExposure = commoditySummaries.reduce((s, c) => s + c.netExposure, 0);
    const totalPurchaseExposure = commoditySummaries.reduce((s, c) => s + c.purchaseExposure, 0);
    const totalSaleExposure = commoditySummaries.reduce((s, c) => s + c.saleExposure, 0);
    const totalOverdue = commoditySummaries.reduce((s, c) => s + c.overdueContracts, 0);
    const totalUrgent = commoditySummaries.reduce((s, c) => s + c.urgentContracts, 0);
    const totalContracts = unpricedContracts.length;

    return {
      commoditySummaries,
      totalExposure,
      totalNetExposure,
      totalPurchaseExposure,
      totalSaleExposure,
      totalOverdue,
      totalUrgent,
      totalContracts,
      previousExposure,
    };
  }, [contracts, previousSnapshot]);
}
