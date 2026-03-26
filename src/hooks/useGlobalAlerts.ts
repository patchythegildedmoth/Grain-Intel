import { useMemo } from 'react';
import { useNetPosition } from './useNetPosition';
import { useUnpricedExposure } from './useUnpricedExposure';
import { useDeliveryTimeline } from './useDeliveryTimeline';
import { useBasisSpread } from './useBasisSpread';
import { useRiskProfile } from './useRiskProfile';
import { useMarkToMarket } from './useMarkToMarket';
import { usePriceLaterExposure } from './usePriceLaterExposure';
import { useFreightEfficiency } from './useFreightEfficiency';
import { useMarketDataStore } from '../store/useMarketDataStore';
import type { AlertLevel } from '../utils/alerts';
import type { ModuleId } from '../components/layout/Sidebar';

export interface GlobalAlert {
  level: AlertLevel;
  message: string;
  module: string;
  moduleId: ModuleId;
  commodity?: string;
}

export function useGlobalAlerts() {
  const { summaries: netSummaries } = useNetPosition();
  const { totalOverdue, totalUrgent } = useUnpricedExposure();
  const { pastDueMonths } = useDeliveryTimeline();
  const { summaries: spreadSummaries } = useBasisSpread();
  const { profiles } = useRiskProfile();
  const { alerts: m2mAlerts } = useMarkToMarket();
  const { summaryAlerts: freightAlerts } = useFreightEfficiency();
  const { totalDailyCarry } = usePriceLaterExposure();
  const hasMarketData = useMarketDataStore((s) => s.lastUpdated !== null);

  return useMemo(() => {
    const alerts: GlobalAlert[] = [];

    // Net Position: net short positions
    const netShortCount = netSummaries.flatMap((s) => s.rows.filter((r) => r.isNetShort)).length;
    if (netShortCount > 0) {
      alerts.push({ level: 'critical', message: `${netShortCount} net short position${netShortCount > 1 ? 's' : ''}`, module: 'Position', moduleId: 'net-position' });
    }

    // Unpriced: overdue + urgent
    if (totalOverdue > 0) {
      alerts.push({ level: 'critical', message: `${totalOverdue} overdue unpriced contract${totalOverdue > 1 ? 's' : ''}`, module: 'Unpriced', moduleId: 'unpriced-exposure' });
    }
    if (totalUrgent > 0) {
      alerts.push({ level: 'warning', message: `${totalUrgent} urgent unpriced contract${totalUrgent > 1 ? 's' : ''} (≤14 days)`, module: 'Unpriced', moduleId: 'unpriced-exposure' });
    }

    // Delivery: past due
    if (pastDueMonths.length > 0) {
      const totalPastDue = pastDueMonths.reduce((s, m) => s + m.contracts.length, 0);
      alerts.push({ level: 'critical', message: `${totalPastDue} contracts in ${pastDueMonths.length} past-due delivery month${pastDueMonths.length > 1 ? 's' : ''}`, module: 'Delivery', moduleId: 'delivery-timeline' });
    }

    // Spreads: negative
    for (const sp of spreadSummaries) {
      if (sp.overallSpread !== null && sp.overallSpread < 0) {
        alerts.push({ level: 'warning', message: `${sp.commodity}: negative spread`, module: 'Spread', moduleId: 'basis-spread', commodity: sp.commodity });
      }
    }

    // Risk Profile: per-commodity alerts
    for (const p of profiles) {
      for (const a of p.alerts.filter((a) => a.level === 'warning' || a.level === 'critical')) {
        alerts.push({ level: a.level, message: `${p.commodity}: ${a.message}`, module: 'Risk', moduleId: 'risk-profile', commodity: p.commodity });
      }
    }

    // M2M alerts
    if (hasMarketData) {
      for (const a of m2mAlerts) {
        alerts.push({
          level: a.severity === 'red' ? 'critical' : a.severity === 'amber' ? 'warning' : 'info',
          message: a.message,
          module: 'M2M',
          moduleId: 'mark-to-market',
        });
      }
    }

    // Freight
    for (const a of freightAlerts) {
      alerts.push({ level: a.level, message: a.message, module: 'Freight', moduleId: 'freight-efficiency' });
    }

    // Carry cost
    if (hasMarketData && totalDailyCarry > 500) {
      alerts.push({ level: 'warning', message: `Daily carry cost: $${Math.round(totalDailyCarry)}`, module: 'Price-Later', moduleId: 'price-later' });
    }

    // Sort: critical first, then warning, then info
    const levelOrder: Record<string, number> = { critical: 0, warning: 1, info: 2, ok: 3 };
    alerts.sort((a, b) => (levelOrder[a.level] ?? 3) - (levelOrder[b.level] ?? 3));

    const criticalCount = alerts.filter((a) => a.level === 'critical').length;
    const warningCount = alerts.filter((a) => a.level === 'warning').length;

    // Group by module
    const byModule = new Map<string, GlobalAlert[]>();
    for (const a of alerts) {
      if (!byModule.has(a.moduleId)) byModule.set(a.moduleId, []);
      byModule.get(a.moduleId)!.push(a);
    }

    return { alerts, criticalCount, warningCount, byModule };
  }, [netSummaries, totalOverdue, totalUrgent, pastDueMonths, spreadSummaries, profiles, m2mAlerts, freightAlerts, totalDailyCarry, hasMarketData]);
}
