import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  useFreightEfficiency,
  type FreightAdjustedMargin,
  type FreightMarginContract,
  type EntityFreightSummary,
} from '../../hooks/useFreightEfficiency';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { ExportButton } from '../shared/ExportButton';
import { formatCurrency, formatBushelsShort, formatBasis } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import {
  BarChart,
  Bar,
  ComposedChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

// ─── Margin by Tier table columns ───────────────────────────────────────────

const marginCol = createColumnHelper<FreightAdjustedMargin>();
const marginColumns = [
  marginCol.accessor('commodity', {
    header: 'Commodity',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCommodityColor(info.getValue()) }} />
        <span>{info.getValue()}</span>
      </div>
    ),
  }),
  marginCol.accessor('tier', { header: 'Tier' }),
  marginCol.accessor('freightCostPerBu', {
    header: 'Freight $/bu',
    cell: (info) => formatCurrency(info.getValue()),
  }),
  marginCol.accessor('avgBuyBasis', {
    header: 'Avg Buy Basis',
    cell: (info) => formatBasis(info.getValue()),
  }),
  marginCol.accessor('avgSellBasis', {
    header: 'Sell Basis',
    cell: (info) => formatBasis(info.getValue()),
  }),
  marginCol.accessor('grossMarginPerBu', {
    header: 'Gross Margin',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return <span className={v < 0 ? 'text-[var(--negative)] font-semibold' : ''}>{formatCurrency(v)}</span>;
    },
  }),
  marginCol.accessor('netMarginPerBu', {
    header: 'Net Margin',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return (
        <span className={v < 0 ? 'text-[var(--negative)] font-semibold' : 'text-[var(--positive)]'}>
          {formatCurrency(v)}
        </span>
      );
    },
  }),
  marginCol.accessor('totalBushels', {
    header: 'Volume',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  marginCol.accessor('totalNetMargin', {
    header: 'Total $',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return (
        <span className={v < 0 ? 'text-[var(--negative)] font-semibold' : 'text-[var(--positive)]'}>
          {formatCurrency(v)}
        </span>
      );
    },
  }),
];

// ─── Contract Freight Risk table columns ────────────────────────────────────

const riskCol = createColumnHelper<FreightMarginContract>();
const riskColumns = [
  riskCol.accessor('contractNumber', { header: 'Contract #' }),
  riskCol.accessor('entity', { header: 'Entity' }),
  riskCol.accessor('commodity', {
    header: 'Commodity',
    cell: (info) => (
      <div className="flex items-center gap-2">
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: getCommodityColor(info.getValue()) }} />
        <span>{info.getValue()}</span>
      </div>
    ),
  }),
  riskCol.accessor('tier', {
    header: 'Tier',
    cell: (info) => info.getValue() ?? '—',
  }),
  riskCol.accessor('freightCost', {
    header: 'Freight $/bu',
    cell: (info) => formatCurrency(info.getValue()),
  }),
  riskCol.accessor('grossMarginPerBu', {
    header: 'Gross Margin',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return <span className={v <= 0 ? 'text-[var(--negative)] font-semibold' : ''}>{formatCurrency(v)}</span>;
    },
  }),
  riskCol.accessor('freightPercent', {
    header: 'Freight %',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return (
        <span className={v > 50 ? 'text-[var(--negative)] font-semibold' : v > 30 ? 'text-[var(--warning)]' : ''}>
          {v.toFixed(1)}%
        </span>
      );
    },
  }),
  riskCol.accessor('balance', {
    header: 'Balance',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  riskCol.accessor('riskLevel', {
    header: 'Risk',
    cell: (info) => <AlertBadge level={info.getValue()}>{info.getValue()}</AlertBadge>,
  }),
];

// ─── Entity table columns ───────────────────────────────────────────────────

const entityCol = createColumnHelper<EntityFreightSummary>();
const entityColumns = [
  entityCol.accessor('entity', { header: 'Entity' }),
  entityCol.accessor('contractCount', { header: 'Contracts' }),
  entityCol.accessor('avgFreightCostPerBu', {
    header: 'Avg Freight $/bu',
    cell: (info) => {
      const v = info.getValue();
      return v !== null ? formatCurrency(v) : '—';
    },
  }),
  entityCol.accessor('avgFreightPercent', {
    header: 'Avg Freight % of Margin',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return (
        <span className={v > 50 ? 'text-[var(--negative)] font-semibold' : v > 30 ? 'text-[var(--warning)]' : ''}>
          {v.toFixed(1)}%
        </span>
      );
    },
  }),
  entityCol.accessor('totalBushels', {
    header: 'Total Bushels',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
];

// ─── Component ──────────────────────────────────────────────────────────────

export function FreightEfficiencyAnalysis() {
  const {
    marginAnalysis,
    imbalance,
    costTrend,
    freightMargin,
    summaryAlerts,
    blendedFreightCost,
  } = useFreightEfficiency();

  // Flatten margin tiers for the table
  const allMarginTiers = useMemo(
    () => marginAnalysis.flatMap((m) => m.tiers),
    [marginAnalysis],
  );

  // Overall net margin
  const overallNetMargin = useMemo(() => {
    const totalBu = marginAnalysis.reduce((s, m) => s + m.totalBushels, 0);
    if (totalBu === 0) return null;
    const totalMargin = marginAnalysis.reduce(
      (s, m) => s + (m.overallNetMarginPerBu ?? 0) * m.totalBushels,
      0,
    );
    return totalMargin / totalBu;
  }, [marginAnalysis]);

  // Chart data: net margin by tier
  const marginChartData = useMemo(() => {
    const tierMap = new Map<string, Record<string, number>>();
    for (const summary of marginAnalysis) {
      for (const tier of summary.tiers) {
        if (!tierMap.has(tier.tier)) tierMap.set(tier.tier, { tier: tier.tier as unknown as number } as Record<string, number>);
        const row = tierMap.get(tier.tier)!;
        row[summary.commodity] = tier.netMarginPerBu ?? 0;
      }
    }
    return Array.from(tierMap.values()).sort((a, b) => {
      const ta = String(a.tier ?? 'ZZ');
      const tb = String(b.tier ?? 'ZZ');
      return ta.localeCompare(tb);
    });
  }, [marginAnalysis]);

  const commodities = useMemo(
    () => marginAnalysis.map((m) => m.commodity),
    [marginAnalysis],
  );

  // Chart data: imbalance by tier
  const imbalanceChartData = useMemo(
    () =>
      imbalance.tiers.map((t) => ({
        tier: t.tier,
        Purchase: t.purchaseBushels,
        Sale: -t.saleBushels,
        Net: t.netFlow,
      })),
    [imbalance],
  );

  // Distribution buckets for freight % (Feature 4)
  const distribution = useMemo(() => {
    const buckets = { under10: 0, to30: 0, to50: 0, over50: 0 };
    for (const c of freightMargin.contracts) {
      if (c.freightPercent === null) continue;
      if (c.freightPercent < 10) buckets.under10++;
      else if (c.freightPercent < 30) buckets.to30++;
      else if (c.freightPercent < 50) buckets.to50++;
      else buckets.over50++;
    }
    return buckets;
  }, [freightMargin]);

  // Sort contracts by freight % descending for the table
  const sortedRiskContracts = useMemo(
    () =>
      [...freightMargin.contracts].sort(
        (a, b) => (b.freightPercent ?? -1) - (a.freightPercent ?? -1),
      ),
    [freightMargin],
  );

  // Commodity chart data for freight %
  const freightPercentChartData = useMemo(
    () =>
      freightMargin.byCommodity.map((c) => ({
        commodity: c.commodity,
        avgFreightPercent: c.avgFreightPercent ?? 0,
        fill: getCommodityColor(c.commodity),
      })),
    [freightMargin],
  );

  // No-data state
  const hasContracts = marginAnalysis.length > 0 || imbalance.tiers.length > 0;
  if (!hasContracts) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-2">Freight Efficiency Analysis</h2>
        <p className="text-[var(--text-muted)]">
          No open contracts with freight data. Upload iRely contracts to see freight efficiency metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 print:p-2 print:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Freight Efficiency Analysis</h2>
        <ExportButton onClick={() => window.print()} label="Print" />
      </div>

      {/* KPI StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="🚚 Blended Freight Cost"
          value={blendedFreightCost !== null ? `${formatCurrency(blendedFreightCost)}/bu` : '—'}
          delta={costTrend.delta30d !== null ? `${costTrend.delta30d >= 0 ? '+' : ''}${formatCurrency(costTrend.delta30d)} vs 30d` : undefined}
          deltaDirection={costTrend.delta30d !== null ? (costTrend.delta30d > 0.03 ? 'down' : costTrend.delta30d < -0.03 ? 'up' : 'neutral') : undefined}
        />
        <StatCard
          label="Avg Net Margin"
          value={overallNetMargin !== null ? `${formatCurrency(overallNetMargin)}/bu` : '—'}
          deltaDirection={overallNetMargin !== null ? (overallNetMargin >= 0 ? 'up' : 'down') : undefined}
        />
        <StatCard
          label="Freight % of Margin"
          value={freightMargin.avgFreightPercent !== null ? `${freightMargin.avgFreightPercent.toFixed(1)}%` : '—'}
          delta={`${freightMargin.criticalCount} critical, ${freightMargin.warningCount} warning`}
          deltaDirection={freightMargin.criticalCount > 0 ? 'down' : freightMargin.warningCount > 0 ? 'neutral' : 'up'}
        />
        <StatCard
          label="Cost Delta (Buy - Sell)"
          value={imbalance.costDelta !== null ? `${formatCurrency(imbalance.costDelta)}/bu` : '—'}
          delta={imbalance.costDelta !== null && imbalance.costDelta > 0 ? 'Buying from expensive tiers' : imbalance.costDelta !== null && imbalance.costDelta < 0 ? 'Buying from cheap tiers' : undefined}
          deltaDirection={imbalance.costDelta !== null ? (imbalance.costDelta > 0.05 ? 'down' : imbalance.costDelta < -0.05 ? 'up' : 'neutral') : undefined}
        />
      </div>

      {/* Alerts */}
      {summaryAlerts.length > 0 && (
        <div className="space-y-1 no-print">
          {summaryAlerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <AlertBadge level={a.level}>{a.level}</AlertBadge>
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Chart Row 1: Margin by Tier + Imbalance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Net Margin by Tier */}
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="font-semibold mb-3">Net Margin by Tier ($/bu)</h3>
          {marginChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={marginChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                {commodities.map((c) => (
                  <Bar key={c} dataKey={c} fill={getCommodityColor(c)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Enter market data to see margin analysis</p>
          )}
        </div>

        {/* Buy/Sell Volume by Tier */}
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="font-semibold mb-3">Buy vs. Sell Volume by Tier</h3>
          {imbalanceChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={imbalanceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="tier" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => formatBushelsShort(Math.abs(v))} />
                <Tooltip
                  formatter={(value: number, name: string) => [formatBushelsShort(Math.abs(value)), name]}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
                <Bar dataKey="Purchase" fill="#22C55E" />
                <Bar dataKey="Sale" fill="#EF4444" />
                <Line type="monotone" dataKey="Net" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No tier data available</p>
          )}
        </div>
      </div>

      {/* Chart Row 2: Freight Cost Trend (full width) */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4 no-print">
        <h3 className="font-semibold mb-3">Blended Freight Cost Trend</h3>
        {costTrend.historicalPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={costTrend.historicalPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `$${v.toFixed(2)}`} domain={['auto', 'auto']} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(3)}`, 'Avg Freight']}
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Line type="monotone" dataKey="avgCost" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-sm text-[var(--text-muted)] py-8 text-center">
            {costTrend.currentAvgCost !== null
              ? `Current blended cost: ${formatCurrency(costTrend.currentAvgCost)}/bu. Trend data will populate as daily M2M snapshots are saved.`
              : 'No freight tier data available'}
          </div>
        )}
      </div>

      {/* Chart Row 3: Freight % by Commodity + Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 no-print">
        {/* Freight % by Commodity */}
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="font-semibold mb-3">Avg Freight % of Margin by Commodity</h3>
          {freightPercentChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={freightPercentChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="commodity" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `${v.toFixed(0)}%`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, 'Freight % of Margin']}
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <ReferenceLine y={30} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: '30%', position: 'right', fill: '#F59E0B', fontSize: 11 }} />
                <ReferenceLine y={50} stroke="#EF4444" strokeDasharray="3 3" label={{ value: '50%', position: 'right', fill: '#EF4444', fontSize: 11 }} />
                <Bar dataKey="avgFreightPercent" name="Freight %" isAnimationActive={false}>
                  {freightPercentChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">Enter market data to see freight % analysis</p>
          )}
        </div>

        {/* Distribution */}
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="font-semibold mb-3">Freight % Distribution</h3>
          <div className="space-y-3 mt-4">
            <DistributionRow label="< 10%" count={distribution.under10} total={freightMargin.contracts.length} color="bg-green-500" />
            <DistributionRow label="10–30%" count={distribution.to30} total={freightMargin.contracts.length} color="bg-yellow-500" />
            <DistributionRow label="30–50%" count={distribution.to50} total={freightMargin.contracts.length} color="bg-amber-500" />
            <DistributionRow label="> 50%" count={distribution.over50} total={freightMargin.contracts.length} color="bg-red-500" />
          </div>
        </div>
      </div>

      {/* Detail Table 1: Margin by Commodity & Tier */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
        <h3 className="font-semibold mb-3">Margin by Commodity & Tier</h3>
        <DataTable columns={marginColumns} data={allMarginTiers} />
      </div>

      {/* Detail Table 2: Contract Freight Risk (print shows top 5) */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
        <h3 className="font-semibold mb-3">
          Contract Freight Risk
          <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
            ({freightMargin.criticalCount} critical, {freightMargin.warningCount} warning)
          </span>
        </h3>
        {/* Print: show top 5 only */}
        <div className="hidden print:block">
          <DataTable columns={riskColumns} data={sortedRiskContracts.slice(0, 5)} />
        </div>
        {/* Screen: show all */}
        <div className="print:hidden">
          <DataTable columns={riskColumns} data={sortedRiskContracts} />
        </div>
      </div>

      {/* Detail Table 3: Entity Freight Breakdown */}
      <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4 no-print">
        <h3 className="font-semibold mb-3">Freight Efficiency by Entity</h3>
        <DataTable columns={entityColumns} data={freightMargin.byEntity} />
      </div>

      {/* Print footer */}
      <div className="hidden print:block text-center text-xs text-[var(--text-muted)] mt-8 pt-4 border-t">
        Ag Source Grain Intelligence &middot; Freight Efficiency Analysis
      </div>
    </div>
  );
}

// ─── Distribution row helper ────────────────────────────────────────────────

function DistributionRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium w-16 text-right">{label}</span>
      <div className="flex-1 bg-[var(--bg-inset)] dark:bg-gray-700 rounded-full h-5 relative overflow-hidden">
        <div
          className={`h-5 rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-data w-12 text-right">{count}</span>
    </div>
  );
}
