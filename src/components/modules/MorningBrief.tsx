import { useNetPosition } from '../../hooks/useNetPosition';
import { useUnpricedExposure } from '../../hooks/useUnpricedExposure';
import { useDeliveryTimeline } from '../../hooks/useDeliveryTimeline';
import { useBasisSpread } from '../../hooks/useBasisSpread';
import { useCustomerAnalysis } from '../../hooks/useCustomerAnalysis';
import { useRiskProfile } from '../../hooks/useRiskProfile';
import { useContractStore } from '../../store/useContractStore';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatCurrency, formatPercent, formatDate } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';

export function MorningBrief() {
  const fileName = useContractStore((s) => s.fileName);
  const uploadDate = useContractStore((s) => s.uploadDate);

  const { summaries, openContractCount } = useNetPosition();
  const { totalExposure, totalNetExposure, totalOverdue, totalUrgent, totalContracts: unpricedCount, previousExposure } = useUnpricedExposure();
  const { currentMonth } = useDeliveryTimeline();
  const { summaries: spreadSummaries } = useBasisSpread();
  const { customerSummaries } = useCustomerAnalysis();
  const { overallHedgeRatio, profiles } = useRiskProfile();

  // Net exposure delta for Morning Brief KPI
  const prevTotalNet = previousExposure
    ? Object.values(previousExposure).reduce((s, e) => s + e.net, 0)
    : null;
  const netExposureDelta = prevTotalNet !== null ? totalNetExposure - prevTotalNet : null;
  const netExposureLabel = totalNetExposure === 0 ? 'Flat' :
    `${totalNetExposure > 0 ? 'Net Long' : 'Net Short'} ${formatBushelsShort(Math.abs(totalNetExposure))}`;

  const totalLong = summaries.reduce((s, c) => s + c.totalLong, 0);
  const totalShort = summaries.reduce((s, c) => s + c.totalShort, 0);
  const totalNet = totalLong - totalShort;
  const netShortCount = summaries.flatMap((s) => s.rows.filter((r) => r.isNetShort)).length;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Collect all critical alerts across modules
  const criticalAlerts: { module: string; message: string }[] = [];

  if (netShortCount > 0) {
    criticalAlerts.push({ module: 'Position', message: `${netShortCount} net short position${netShortCount > 1 ? 's' : ''}` });
  }
  if (totalOverdue > 0) {
    criticalAlerts.push({ module: 'Unpriced', message: `${totalOverdue} overdue unpriced contract${totalOverdue > 1 ? 's' : ''}` });
  }
  for (const sp of spreadSummaries) {
    if (sp.overallSpread !== null && sp.overallSpread < 0) {
      criticalAlerts.push({ module: 'Spread', message: `${sp.commodity}: negative spread ${formatCurrency(sp.overallSpread)}/bu` });
    }
  }
  for (const p of profiles) {
    for (const a of p.alerts.filter((a) => a.level === 'warning' || a.level === 'critical')) {
      criticalAlerts.push({ module: 'Risk', message: `${p.commodity}: ${a.message}` });
    }
  }

  return (
    <div className="p-6 space-y-6 print:p-2 print:space-y-4">
      {/* Header */}
      <div className="print:text-center">
        <h2 className="text-2xl font-bold">Morning Brief</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {dateStr} &middot; {fileName} &middot; Uploaded {uploadDate ? formatDate(uploadDate) : '—'}
        </p>
      </div>

      {/* Critical alerts banner */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
            Action Required ({criticalAlerts.length})
          </h3>
          <div className="space-y-1 text-sm">
            {criticalAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <AlertBadge level="critical">{a.module}</AlertBadge>
                <span>{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top-level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Contracts" value={String(openContractCount)} />
        <StatCard
          label="Net Position"
          value={formatBushelsShort(totalNet)}
          deltaDirection={totalNet >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Hedge Ratio"
          value={formatPercent(overallHedgeRatio)}
          deltaDirection={overallHedgeRatio >= 0.7 ? 'up' : 'down'}
        />
        <StatCard
          label="Unpriced Exposure"
          value={formatBushelsShort(totalExposure)}
          delta={`${netExposureLabel}${netExposureDelta !== null ? ` (${netExposureDelta >= 0 ? '+' : ''}${formatBushelsShort(netExposureDelta)})` : ''}`}
          deltaDirection={Math.abs(totalNetExposure) < (prevTotalNet !== null ? Math.abs(prevTotalNet) : Infinity) ? 'up' : totalNetExposure !== 0 ? 'down' : 'neutral'}
          colorClass={totalOverdue > 0 ? 'border-red-300 dark:border-red-700' : ''}
        />
      </div>

      {/* Net Position by Commodity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold mb-3">Net Position by Commodity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map((s) => (
            <div key={s.commodity} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-750">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: getCommodityColor(s.commodity) }} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{s.commodity}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  L: {formatBushelsShort(s.totalLong)} / S: {formatBushelsShort(s.totalShort)}
                </div>
              </div>
              <div className={`text-sm font-semibold ${s.totalNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatBushelsShort(s.totalNet)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Three-column section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unpriced exposure */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-2">Top Unpriced Exposure</h3>
          <div className="text-2xl font-bold">{formatBushelsShort(totalExposure)} bu</div>
          <div className={`text-sm font-medium mt-1 ${
            totalNetExposure === 0 ? 'text-gray-500 dark:text-gray-400' :
            Math.abs(totalNetExposure) > 75_000 ? 'text-amber-600 dark:text-amber-400' :
            'text-gray-600 dark:text-gray-300'
          }`}>
            {netExposureLabel}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {unpricedCount} contracts
            {totalOverdue > 0 && <span className="text-red-600 dark:text-red-400"> ({totalOverdue} overdue)</span>}
            {totalUrgent > 0 && <span className="text-amber-600 dark:text-amber-400"> ({totalUrgent} urgent)</span>}
          </div>
        </div>

        {/* This month deliveries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-2">This Month Deliveries</h3>
          {currentMonth ? (
            <>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Inbound:</span>
                  <span className="text-green-600 dark:text-green-400 font-medium">{formatBushelsShort(currentMonth.inboundBushels)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Outbound:</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">{formatBushelsShort(currentMonth.outboundBushels)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-100 dark:border-gray-700 pt-1">
                  <span className="text-gray-500 dark:text-gray-400">Net:</span>
                  <span className="font-semibold">{formatBushelsShort(currentMonth.netFlow)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">No deliveries this month</div>
          )}
        </div>

        {/* Current spreads */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-2">Current Spreads</h3>
          <div className="space-y-1 text-sm">
            {spreadSummaries.slice(0, 5).map((s) => (
              <div key={s.commodity} className="flex justify-between">
                <span>{s.commodity}</span>
                <span className={
                  s.overallSpread === null ? 'text-gray-400' :
                  s.overallSpread < 0 ? 'text-red-600 dark:text-red-400 font-semibold' :
                  'text-green-600 dark:text-green-400'
                }>
                  {s.overallSpread !== null ? formatCurrency(s.overallSpread) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Customer concentration + Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-2">Top Customer Concentration</h3>
          <div className="space-y-1 text-sm">
            {customerSummaries.slice(0, 5).map((cs, i) => (
              <div key={cs.entity} className="flex justify-between">
                <span className="truncate mr-2">{i + 1}. {cs.entity}</span>
                <span className="font-medium flex-shrink-0">
                  {formatPercent(cs.percentOfTotal)} ({formatBushelsShort(cs.totalCommittedBushels)})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="font-semibold mb-2">Hedge Ratio by Commodity</h3>
          <div className="space-y-1 text-sm">
            {profiles.map((p) => (
              <div key={p.commodity} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getCommodityColor(p.commodity) }} />
                <span className="flex-1">{p.commodity}</span>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${p.hedgeRatio >= 0.7 ? 'bg-green-500' : p.hedgeRatio >= 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(p.hedgeRatio * 100, 100)}%` }}
                  />
                </div>
                <span className="font-mono w-12 text-right">{formatPercent(p.hedgeRatio)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-gray-400 mt-8 pt-4 border-t">
        Ag Source Grain Intelligence &middot; Generated {dateStr}
      </div>
    </div>
  );
}
