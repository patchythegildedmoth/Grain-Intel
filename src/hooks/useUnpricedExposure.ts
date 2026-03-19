import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import type { Contract } from '../types/contracts';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';

export interface UnpricedContract extends Contract {
  exposureBushels: number;
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

export interface UnpricedAlert {
  level: AlertLevel;
  message: string;
}

export interface CommodityExposureSummary {
  commodity: string;
  totalExposure: number;
  overdueContracts: number;
  urgentContracts: number;
  contracts: UnpricedContract[];
  summaryRows: UnpricedSummaryRow[];
  alerts: UnpricedAlert[];
}

export function useUnpricedExposure() {
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Find unpriced contracts:
    // 1. Contracts with unpricedQty > 0 (Basis contracts with futures unpriced)
    // 2. HTA contracts with balance > 0 (basis is unpriced even though futures are set)
    const unpricedContracts: UnpricedContract[] = [];

    for (const c of openContracts) {
      if (c.unpricedQty > 0) {
        unpricedContracts.push({
          ...c,
          exposureBushels: c.unpricedQty,
          exposureType: 'Futures Unpriced',
        });
      } else if (c.pricingType === 'HTA' && c.balance > 0) {
        unpricedContracts.push({
          ...c,
          exposureBushels: c.balance,
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

    // Build commodity summaries
    const commodities = [...byCommodity.keys()].sort(sortByCommodityOrder);

    const commoditySummaries: CommodityExposureSummary[] = commodities.map((commodity) => {
      const group = byCommodity.get(commodity)!;
      const totalExposure = group.reduce((s, c) => s + c.exposureBushels, 0);
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
        overdueContracts,
        urgentContracts,
        contracts: sortedContracts,
        summaryRows,
        alerts,
      };
    });

    // Global stats
    const totalExposure = commoditySummaries.reduce((s, c) => s + c.totalExposure, 0);
    const totalOverdue = commoditySummaries.reduce((s, c) => s + c.overdueContracts, 0);
    const totalUrgent = commoditySummaries.reduce((s, c) => s + c.urgentContracts, 0);
    const totalContracts = unpricedContracts.length;

    return {
      commoditySummaries,
      totalExposure,
      totalOverdue,
      totalUrgent,
      totalContracts,
    };
  }, [contracts]);
}
