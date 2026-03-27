import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useNetPosition, type PositionRow } from '../../hooks/useNetPosition';
import { SegmentedControl } from '../shared/SegmentedControl';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatBasis, formatCurrency } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { THRESHOLDS } from '../../utils/alerts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend, Cell } from 'recharts';
import { CrossModuleLink } from '../shared/CrossModuleLink';

const col = createColumnHelper<PositionRow>();

const columns = [
  col.accessor('futureMonthShort', { header: 'Futures Month' }),
  col.accessor('longBushels', {
    header: 'Long (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  col.accessor('shortBushels', {
    header: 'Short (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  col.accessor('netBushels', {
    header: 'Net (Bu)',
    cell: (info) => {
      const v = info.getValue();
      const isShort = v < 0;
      return (
        <span className={isShort ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400'}>
          {formatBushelsShort(v)}
        </span>
      );
    },
  }),
  col.accessor('avgBuyBasisLocked', {
    header: 'Buy Basis (Locked)',
    cell: (info) => formatBasis(info.getValue()),
  }),
  col.accessor('avgSellBasisLocked', {
    header: 'Sell Basis (Locked)',
    cell: (info) => formatBasis(info.getValue()),
  }),
  col.accessor('grossSpreadLocked', {
    header: 'Spread (Locked)',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      const isNeg = v < 0;
      return (
        <span className={isNeg ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
          {formatCurrency(v)}
        </span>
      );
    },
  }),
  col.accessor('avgBuyBasisPosition', {
    header: 'Buy Basis (Position)',
    cell: (info) => formatBasis(info.getValue()),
  }),
  col.accessor('avgSellBasisPosition', {
    header: 'Sell Basis (Position)',
    cell: (info) => formatBasis(info.getValue()),
  }),
  col.accessor('contractCount', { header: '# Contracts' }),
  col.display({
    id: 'alert',
    header: 'Status',
    cell: (info) => {
      const row = info.row.original;
      if (row.isNetShort) return <AlertBadge level="critical">NET SHORT</AlertBadge>;
      return <AlertBadge level="ok">OK</AlertBadge>;
    },
  }),
];

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'charts', label: 'Charts' },
  { key: 'tables', label: 'Tables' },
];

export function NetPositionDashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { summaries, deltas, openContractCount } = useNetPosition();

  const totalLong = summaries.reduce((s, c) => s + c.totalLong, 0);
  const totalShort = summaries.reduce((s, c) => s + c.totalShort, 0);
  const totalNet = totalLong - totalShort;
  const shortAlerts = summaries.flatMap((s) => s.rows.filter((r) => r.isNetShort));

  // Chart data for top 3 commodities
  const chartData = useMemo(() => {
    return summaries.slice(0, 3).map((s) => ({
      commodity: s.commodity,
      rows: s.rows.map((r) => ({
        month: r.futureMonthShort,
        long: r.longBushels,
        short: -r.shortBushels,
      })),
    }));
  }, [summaries]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Net Position Dashboard</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {openContractCount} open contracts
        </span>
      </div>

      <SegmentedControl segments={TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Summary cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Long" value={formatBushelsShort(totalLong)} />
        <StatCard label="Total Short" value={formatBushelsShort(totalShort)} />
        <StatCard
          label="Total Net"
          value={formatBushelsShort(totalNet)}
          deltaDirection={totalNet >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Short Alerts"
          value={String(shortAlerts.length)}
          colorClass={shortAlerts.length > 0 ? 'border-red-300 dark:border-red-700' : ''}
        />
      </div>

      {/* Charts — Overview shows top 3, Charts tab shows all */}
      {(activeTab === 'overview' || activeTab === 'charts') && chartData.map((cd) => (
        <div key={cd.commodity} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3" style={{ color: getCommodityColor(cd.commodity) }}>
            {cd.commodity}
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={cd.rows} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => formatBushelsShort(Math.abs(value))}
                labelFormatter={(label: string) => `Futures Month: ${label}`}
              />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              <Bar dataKey="long" name="Long (Purchase)" fill="#22C55E" radius={[4, 4, 0, 0]}>
                {cd.rows.map((_, i) => (
                  <Cell key={i} fill="#22C55E" />
                ))}
              </Bar>
              <Bar dataKey="short" name="Short (Sale)" fill="#EF4444" radius={[0, 0, 4, 4]}>
                {cd.rows.map((_, i) => (
                  <Cell key={i} fill="#EF4444" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ))}

      {/* Day-over-day deltas — overview only */}
      {(activeTab === 'overview') && deltas.size > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <h4 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Position Changes Since Last Upload</h4>
          <div className="space-y-1 text-sm">
            {[...deltas.entries()].map(([commodity, delta]) => (
              <div key={commodity} className="flex gap-2">
                <span className="font-medium">{commodity}:</span>
                <span className={Math.abs(delta) > THRESHOLDS.positionSwingBushels ? 'text-amber-700 dark:text-amber-300 font-semibold' : ''}>
                  {delta > 0 ? '+' : ''}{formatBushelsShort(delta)} bu
                </span>
                {Math.abs(delta) > THRESHOLDS.positionSwingBushels && (
                  <AlertBadge level="warning">SIGNIFICANT</AlertBadge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Position tables by commodity — overview + tables tab */}
      {(activeTab === 'overview' || activeTab === 'tables') && summaries.map((summary) => (
        <div key={summary.commodity}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(summary.commodity) }} />
            <h3 className="text-lg font-semibold">{summary.commodity}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Net: {formatBushelsShort(summary.totalNet)} bu
            </span>
          </div>
          <DataTable
            data={summary.rows}
            columns={columns}
            footerRow={{
              futureMonthShort: 'TOTAL',
              longBushels: formatBushelsShort(summary.totalLong),
              shortBushels: formatBushelsShort(summary.totalShort),
              netBushels: formatBushelsShort(summary.totalNet),
              contractCount: String(summary.rows.reduce((s, r) => s + r.contractCount, 0)),
            }}
          />
        </div>
      ))}

      {/* Cross-module links */}
      {onNavigate && (
        <div className="flex gap-6 pt-2">
          <CrossModuleLink label="View unpriced contracts" moduleId="unpriced-exposure" onNavigate={onNavigate} />
          <CrossModuleLink label="Check delivery timeline" moduleId="delivery-timeline" onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}
