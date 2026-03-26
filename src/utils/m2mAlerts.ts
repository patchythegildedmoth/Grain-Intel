/**
 * Generate M2M alert badges from commodity summaries.
 * Pure function — no store or hook dependencies.
 */

import { groupBy } from './groupBy';
import { formatBushelsCompact } from './formatters';
import type { CommodityM2MSummary } from './aggregateM2M';
import type { ContractM2M } from './resolveContractM2M';

export interface M2MAlert {
  severity: 'red' | 'amber' | 'blue';
  message: string;
}

export function generateM2MAlerts(
  summaries: CommodityM2MSummary[],
  totalBookPnl: number,
): M2MAlert[] {
  const alerts: M2MAlert[] = [];

  // Global alert
  if (totalBookPnl < 0) {
    alerts.push({
      severity: 'red',
      message: `Total book P&L is NEGATIVE: ${formatDollar(totalBookPnl)}`,
    });
  }

  for (const summary of summaries) {
    const { commodity, totalPnl, contracts, byFuturesMonth, unmarkableContracts } = summary;

    // Negative book P&L per commodity — with entity context
    if (totalPnl < 0) {
      const entityPnl = new Map<string, number>();
      for (const cm of contracts) {
        if (cm.m2m.isMarkable) {
          const e = cm.contract.entity;
          entityPnl.set(e, (entityPnl.get(e) ?? 0) + cm.m2m.totalPnl);
        }
      }
      const worstEntity = [...entityPnl.entries()].sort((a, b) => a[1] - b[1])[0];
      const entityNote = worstEntity ? ` — largest loss: ${worstEntity[0]} (${formatDollar(worstEntity[1])})` : '';
      alerts.push({
        severity: 'red',
        message: `${commodity}: book P&L is negative (${formatDollar(totalPnl)})${entityNote}`,
      });
    }

    // Per-FM alerts
    const byFM = groupBy(contracts, (cm: ContractM2M) => cm.contract.futureMonthSortKey);
    for (const fm of byFuturesMonth) {
      if (fm.totalPnl < -25_000) {
        const fmGroup = byFM.get(fm.sortKey) ?? [];
        const fmEntityPnl = new Map<string, number>();
        for (const cm of fmGroup) {
          if (cm.m2m.isMarkable) {
            const e = cm.contract.entity;
            fmEntityPnl.set(e, (fmEntityPnl.get(e) ?? 0) + cm.m2m.totalPnl);
          }
        }
        const topLosers = [...fmEntityPnl.entries()].filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).slice(0, 2);
        const loserNote = topLosers.length > 0
          ? ` — ${topLosers.map(([e, v]) => `${e} ${formatDollar(v)}`).join(', ')}`
          : '';
        alerts.push({
          severity: 'amber',
          message: `${commodity} ${fm.futuresMonth}: unrealized loss of ${formatDollar(fm.totalPnl)} (${fm.contractCount} contracts, net ${fm.netBushels >= 0 ? '+' : ''}${formatBushelsCompact(fm.netBushels)})${loserNote}`,
        });
      }
      // Basis/futures divergence
      if (fm.futuresPnl !== 0 && fm.basisPnl !== 0 && Math.sign(fm.futuresPnl) !== Math.sign(fm.basisPnl)) {
        alerts.push({
          severity: 'blue',
          message: `${commodity} ${fm.futuresMonth}: basis and futures P&L diverging (futures: ${formatDollar(fm.futuresPnl)}, basis: ${formatDollar(fm.basisPnl)})`,
        });
      }
    }

    // Unmarkable contracts — with reason detail
    if (unmarkableContracts > 0) {
      const missingReasons = new Map<string, number>();
      for (const cm of contracts) {
        if (!cm.m2m.isMarkable && cm.m2m.missingReason) {
          missingReasons.set(cm.m2m.missingReason, (missingReasons.get(cm.m2m.missingReason) ?? 0) + 1);
        }
      }
      const reasonDetail = [...missingReasons.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([reason, count]) => `${count} ${reason}`)
        .join(', ');
      alerts.push({
        severity: 'amber',
        message: `${commodity}: ${unmarkableContracts} contract${unmarkableContracts > 1 ? 's' : ''} excluded — ${reasonDetail}`,
      });
    }
  }

  return alerts;
}

function formatDollar(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}
