import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useBasisSpread, type SpreadRow, type HistoricalSpread, type FreightBasisBreakdown } from '../../hooks/useBasisSpread';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBasis, formatCurrency, formatBushelsShort } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

function FreightBreakdownCell({ items }: { items: FreightBasisBreakdown[] }) {
  if (items.length <= 1) return null;
  return (
    <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5">
      {items.map((fb) => (
        <div key={fb.freightTerm}>
          <span className="font-medium">{fb.freightTerm}:</span>{' '}
          {fb.avgBasis !== null ? formatBasis(fb.avgBasis) : '—'}{' '}
          <span className="text-[var(--text-muted)]">({formatBushelsShort(fb.bushels)})</span>
        </div>
      ))}
    </div>
  );
}

const spreadCol = createColumnHelper<SpreadRow>();
const spreadColumns = [
  spreadCol.accessor('futureMonthShort', { header: 'Futures Month' }),
  spreadCol.accessor('avgBuyBasis', {
    header: 'Avg Buy Basis (dlvd equiv)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBasis(info.getValue())}</div>
          <FreightBreakdownCell items={row.buyByFreight} />
        </div>
      );
    },
  }),
  spreadCol.accessor('avgSellBasis', {
    header: 'Avg Sell Basis (dlvd equiv)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBasis(info.getValue())}</div>
          <FreightBreakdownCell items={row.sellByFreight} />
        </div>
      );
    },
  }),
  spreadCol.accessor('grossSpread', {
    header: 'Gross Spread',
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
  spreadCol.accessor('buyBushels', {
    header: 'Buy Vol (Bu)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBushelsShort(info.getValue())}</div>
          {row.buyByFreight.length > 1 && (
            <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5">
              {row.buyByFreight.map((fb) => (
                <div key={fb.freightTerm}>
                  {fb.freightTerm}: {formatBushelsShort(fb.bushels)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  }),
  spreadCol.accessor('sellBushels', {
    header: 'Sell Vol (Bu)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBushelsShort(info.getValue())}</div>
          {row.sellByFreight.length > 1 && (
            <div className="text-xs text-[var(--text-muted)] mt-1 space-y-0.5">
              {row.sellByFreight.map((fb) => (
                <div key={fb.freightTerm}>
                  {fb.freightTerm}: {formatBushelsShort(fb.bushels)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    },
  }),
  spreadCol.accessor('contractCount', { header: '# Contracts' }),
];

const histCol = createColumnHelper<HistoricalSpread>();
const histColumns = [
  histCol.accessor('year', { header: 'Year' }),
  histCol.accessor('avgBuyBasis', {
    header: 'Avg Buy Basis (dlvd equiv)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBasis(info.getValue())}</div>
          <FreightBreakdownCell items={row.buyByFreight} />
        </div>
      );
    },
  }),
  histCol.accessor('avgSellBasis', {
    header: 'Avg Sell Basis (dlvd equiv)',
    cell: (info) => {
      const row = info.row.original;
      return (
        <div>
          <div>{formatBasis(info.getValue())}</div>
          <FreightBreakdownCell items={row.sellByFreight} />
        </div>
      );
    },
  }),
  histCol.accessor('grossSpread', {
    header: 'Gross Spread',
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
  histCol.accessor('completedBushels', {
    header: 'Volume (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  histCol.accessor('contractCount', { header: '# Contracts' }),
];

export function BasisSpreadAnalysis() {
  const { summaries } = useBasisSpread();

  const overallStats = useMemo(() => {
    const withSpread = summaries.filter((s) => s.overallSpread !== null);
    const negativeCount = withSpread.filter((s) => s.overallSpread! < 0).length;
    const avgSpread = withSpread.length > 0
      ? withSpread.reduce((s, c) => s + (c.overallSpread || 0), 0) / withSpread.length
      : null;
    const totalAlerts = summaries.reduce((s, c) => s + c.alerts.length, 0);
    return { avgSpread, negativeCount, totalAlerts, commodityCount: summaries.length };
  }, [summaries]);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Buy/Sell Basis Spread Analysis</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Commodities" value={String(overallStats.commodityCount)} />
        <StatCard
          label="Avg Spread"
          value={overallStats.avgSpread !== null ? formatCurrency(overallStats.avgSpread) : '—'}
        />
        <StatCard
          label="Negative Spreads"
          value={String(overallStats.negativeCount)}
          colorClass={overallStats.negativeCount > 0 ? 'border-red-600/20 dark:border-red-700' : ''}
        />
        <StatCard
          label="Alerts"
          value={String(overallStats.totalAlerts)}
          colorClass={overallStats.totalAlerts > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
        />
      </div>

      {/* Per-commodity sections */}
      {summaries.map((cs) => (
        <div key={cs.commodity} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(cs.commodity) }} />
            <h3 className="text-lg font-semibold">{cs.commodity}</h3>
            <span className="text-sm text-[var(--text-muted)]">
              Spread: {cs.overallSpread !== null ? formatCurrency(cs.overallSpread) : '—'}/bu
            </span>
          </div>

          {/* Alerts */}
          {cs.alerts.length > 0 && (
            <div className="space-y-1">
              {cs.alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertBadge level={alert.level}>
                    {alert.level === 'critical' ? 'ALERT' : 'WARN'}
                  </AlertBadge>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current book spread table */}
          {cs.currentBook.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Current Book</h4>
              <DataTable
                data={cs.currentBook}
                columns={spreadColumns}
                footerRow={{
                  futureMonthShort: 'OVERALL',
                  avgBuyBasis: formatBasis(cs.overallAvgBuyBasis),
                  avgSellBasis: formatBasis(cs.overallAvgSellBasis),
                  grossSpread: cs.overallSpread !== null ? formatCurrency(cs.overallSpread) : '—',
                  contractCount: String(cs.currentBook.reduce((s, r) => s + r.contractCount, 0)),
                }}
              />
            </div>
          )}

          {/* Monthly trend chart */}
          {cs.monthlyTrend.length > 1 && (
            <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">Spread Trend (Last 12 Months)</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cs.monthlyTrend} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="avgBuyBasis" name="Buy Basis" stroke="#EF4444" dot={{ r: 3 }} strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="avgSellBasis" name="Sell Basis" stroke="#22C55E" dot={{ r: 3 }} strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="grossSpread" name="Spread" stroke={getCommodityColor(cs.commodity)} dot={{ r: 3 }} strokeWidth={2} strokeDasharray="5 5" connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Historical spreads */}
          {cs.historicalSpreads.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Historical (Completed Trades)</h4>
              <DataTable data={cs.historicalSpreads} columns={histColumns} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
