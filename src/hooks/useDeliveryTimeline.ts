import { useMemo } from 'react';
import { useContractStore } from '../store/useContractStore';
import type { Contract } from '../types/contracts';
import { sortByCommodityOrder } from '../utils/commodityColors';
import { THRESHOLDS } from '../utils/alerts';
import type { AlertLevel } from '../utils/alerts';

export interface DeliveryMonthSummary {
  monthKey: string;
  monthLabel: string;
  inboundBushels: number;
  outboundBushels: number;
  netFlow: number;
  commodityBreakdown: { commodity: string; inbound: number; outbound: number }[];
  freightBreakdown: { term: string; inbound: number; outbound: number }[];
  contracts: Contract[];
  alerts: { level: AlertLevel; message: string }[];
}

export function useDeliveryTimeline() {
  const contracts = useContractStore((s) => s.contracts);

  return useMemo(() => {
    const openContracts = contracts.filter((c) => c.isOpen);

    // Group by delivery month (endDate month)
    const byMonth = new Map<string, Contract[]>();
    for (const c of openContracts) {
      const d = c.endDate;
      if (!d || !(d instanceof Date) || isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(c);
    }

    // Sort months chronologically
    const sortedMonths = [...byMonth.keys()].sort();

    const monthSummaries: DeliveryMonthSummary[] = sortedMonths.map((monthKey) => {
      const group = byMonth.get(monthKey)!;
      const [year, month] = monthKey.split('-');
      const monthDate = new Date(parseInt(year), parseInt(month) - 1);
      const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      const purchases = group.filter((c) => c.contractType === 'Purchase');
      const sales = group.filter((c) => c.contractType === 'Sale');

      const inboundBushels = purchases.reduce((s, c) => s + c.balance, 0);
      const outboundBushels = sales.reduce((s, c) => s + c.balance, 0);
      const netFlow = inboundBushels - outboundBushels;

      // Commodity breakdown
      const commodityMap = new Map<string, { inbound: number; outbound: number }>();
      for (const c of group) {
        if (!commodityMap.has(c.commodityCode)) {
          commodityMap.set(c.commodityCode, { inbound: 0, outbound: 0 });
        }
        const entry = commodityMap.get(c.commodityCode)!;
        if (c.contractType === 'Purchase') entry.inbound += c.balance;
        else entry.outbound += c.balance;
      }
      const commodityBreakdown = [...commodityMap.entries()]
        .map(([commodity, data]) => ({ commodity, ...data }))
        .sort((a, b) => sortByCommodityOrder(a.commodity, b.commodity));

      // Freight term breakdown
      const freightMap = new Map<string, { inbound: number; outbound: number }>();
      for (const c of group) {
        const ft = c.freightTerm || 'Unknown';
        if (!freightMap.has(ft)) freightMap.set(ft, { inbound: 0, outbound: 0 });
        const entry = freightMap.get(ft)!;
        if (c.contractType === 'Purchase') entry.inbound += c.balance;
        else entry.outbound += c.balance;
      }
      const freightBreakdown = [...freightMap.entries()]
        .map(([term, data]) => ({ term, ...data }))
        .sort((a, b) => (b.inbound + b.outbound) - (a.inbound + a.outbound));

      // Alerts
      const alerts: { level: AlertLevel; message: string }[] = [];

      // Outbound > inbound by threshold
      if (inboundBushels > 0 && outboundBushels > inboundBushels * (1 + THRESHOLDS.outboundExceedsInboundPercent)) {
        alerts.push({
          level: 'warning',
          message: `Outbound exceeds inbound by ${Math.round(((outboundBushels / inboundBushels) - 1) * 100)}%`,
        });
      } else if (inboundBushels === 0 && outboundBushels > 0) {
        alerts.push({
          level: 'critical',
          message: 'Outbound commitments with zero inbound',
        });
      }

      // Large month volume
      const totalVolume = inboundBushels + outboundBushels;
      if (totalVolume > THRESHOLDS.monthlyCapacityBushels) {
        alerts.push({
          level: 'warning',
          message: `Total volume ${(totalVolume / 1000).toFixed(0)}K bu exceeds ${(THRESHOLDS.monthlyCapacityBushels / 1000).toFixed(0)}K capacity`,
        });
      }

      // Overdue deliveries
      const now = new Date();
      const monthEnd = new Date(parseInt(year), parseInt(month), 0);
      if (monthEnd < now) {
        const overdueContracts = group.filter((c) => c.isOverdue);
        if (overdueContracts.length > 0) {
          alerts.push({
            level: 'critical',
            message: `${overdueContracts.length} overdue deliveries`,
          });
        }
      }

      // Entity concentration
      const entityVolume = new Map<string, number>();
      for (const c of group) {
        entityVolume.set(c.entity, (entityVolume.get(c.entity) || 0) + c.balance);
      }
      for (const [entity, volume] of entityVolume) {
        if (totalVolume > 0 && volume / totalVolume > THRESHOLDS.entityMonthConcentrationPercent) {
          alerts.push({
            level: 'info',
            message: `${entity}: ${Math.round((volume / totalVolume) * 100)}% of month volume`,
          });
        }
      }

      return {
        monthKey,
        monthLabel,
        inboundBushels,
        outboundBushels,
        netFlow,
        commodityBreakdown,
        freightBreakdown,
        contracts: group.sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
        alerts,
      };
    });

    // Identify current and next month
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1);
    const nextMonthKey = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;

    const currentMonth = monthSummaries.find((m) => m.monthKey === currentMonthKey) || null;
    const nextMonthSummary = monthSummaries.find((m) => m.monthKey === nextMonthKey) || null;

    // Past-due months (before current month)
    const pastDueMonths = monthSummaries.filter((m) => m.monthKey < currentMonthKey);

    // Forward-looking months for chart (current + next 5)
    const forwardMonths = monthSummaries.filter(
      (m) => m.monthKey >= currentMonthKey
    ).slice(0, 6);

    const totalInbound = monthSummaries.reduce((s, m) => s + m.inboundBushels, 0);
    const totalOutbound = monthSummaries.reduce((s, m) => s + m.outboundBushels, 0);

    return {
      monthSummaries,
      currentMonth,
      nextMonth: nextMonthSummary,
      pastDueMonths,
      forwardMonths,
      totalInbound,
      totalOutbound,
      totalNet: totalInbound - totalOutbound,
    };
  }, [contracts]);
}
