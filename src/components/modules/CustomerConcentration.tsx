import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useCustomerAnalysis, type CustomerSummary, type CustomerProfitability } from '../../hooks/useCustomerAnalysis';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { SegmentedControl } from '../shared/SegmentedControl';
import { formatBushelsShort, formatPercent, formatCurrency } from '../../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const DONUT_COLORS = [
  '#3B82F6', '#22C55E', '#EAB308', '#EF4444', '#A855F7',
  '#F59E0B', '#14B8A6', '#EC4899', '#F97316', '#6366F1',
  '#6B7280',
];

const custCol = createColumnHelper<CustomerSummary>();
const custColumns = [
  custCol.display({
    id: 'rank',
    header: '#',
    cell: (info) => info.row.index + 1,
  }),
  custCol.accessor('entity', { header: 'Entity' }),
  custCol.accessor('totalCommittedBushels', {
    header: 'Committed (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  custCol.accessor('percentOfTotal', {
    header: '% of Total',
    cell: (info) => formatPercent(info.getValue()),
  }),
  custCol.accessor('commodities', {
    header: 'Commodities',
    cell: (info) => info.getValue().join(', '),
  }),
  custCol.accessor('openContractCount', { header: '# Contracts' }),
  custCol.accessor('freightMix', {
    header: 'Primary Freight',
    cell: (info) => {
      const mix = info.getValue();
      if (mix.length === 0) return '—';
      return `${mix[0].term} (${Math.round(mix[0].percent * 100)}%)`;
    },
  }),
  custCol.display({
    id: 'alerts',
    header: 'Status',
    cell: (info) => {
      const alerts = info.row.original.alerts;
      if (alerts.length === 0) return <AlertBadge level="ok">OK</AlertBadge>;
      const worst = alerts.find((a) => a.level === 'critical') || alerts.find((a) => a.level === 'warning') || alerts[0];
      return <AlertBadge level={worst.level}>{worst.message}</AlertBadge>;
    },
  }),
];

const profitCol = createColumnHelper<CustomerProfitability>();
const profitColumns = [
  profitCol.accessor('entity', {
    header: 'Entity',
    cell: (info) => {
      const isSubRow = info.row.depth > 0;
      return isSubRow ? '' : info.getValue();
    },
  }),
  profitCol.accessor('commodity', {
    header: 'Commodity',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) {
        // Summary row — show commodity count or single commodity
        const subs = info.row.original.subRows;
        if (!subs || subs.length === 0) return 'All';
        return `${subs.length} commodities`;
      }
      return v;
    },
  }),
  profitCol.accessor('avgSellBasis', {
    header: 'Avg Sell Basis',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return formatCurrency(v);
    },
  }),
  profitCol.accessor('marketAvgBuyBasis', {
    header: 'Mkt Avg Buy (12mo)',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return formatCurrency(v);
    },
  }),
  profitCol.accessor('approxMargin', {
    header: 'Approx Margin',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return (
        <span className={v < 0 ? 'text-[var(--negative)] font-semibold' : 'text-[var(--positive)]'}>
          {formatCurrency(v)}/bu
        </span>
      );
    },
  }),
  profitCol.accessor('freightMixLabel', {
    header: 'Freight Term',
  }),
  profitCol.accessor('completedBushels', {
    header: 'Completed (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  profitCol.accessor('contractCount', { header: '# Sales' }),
];

const getSubRows = (row: CustomerProfitability) => row.subRows;

const TABS = [
  { key: 'concentration', label: 'Concentration' },
  { key: 'profitability', label: 'Profitability' },
];

export function CustomerConcentration() {
  const { customerSummaries, profitability, top10, othersTotal, totalOpenBushels, uniqueEntities } = useCustomerAnalysis();
  const [activeTab, setActiveTab] = useState('concentration');

  const donutData = useMemo(() => {
    const data = top10.map((cs) => ({
      name: cs.entity,
      value: cs.totalCommittedBushels,
    }));
    if (othersTotal > 0) {
      data.push({ name: 'Others', value: othersTotal });
    }
    return data;
  }, [top10, othersTotal]);

  const concentrationAlerts = customerSummaries.filter((cs) =>
    cs.alerts.some((a) => a.level === 'warning' || a.level === 'critical')
  ).length;

  const avgMargin = useMemo(() => {
    const withMargin = profitability.filter((p) => p.approxMargin !== null);
    if (withMargin.length === 0) return null;
    const totalBu = withMargin.reduce((s, p) => s + p.completedBushels, 0);
    return totalBu > 0
      ? withMargin.reduce((s, p) => s + p.approxMargin! * p.completedBushels, 0) / totalBu
      : null;
  }, [profitability]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Customers</h2>
        <SegmentedControl segments={TABS} activeKey={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === 'concentration' && (
        <>
          {/* Concentration stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Unique Entities" value={String(uniqueEntities)} />
            <StatCard label="Total Volume" value={formatBushelsShort(totalOpenBushels)} />
            <StatCard
              label="Top Customer %"
              value={customerSummaries.length > 0 ? formatPercent(customerSummaries[0].percentOfTotal) : '—'}
            />
            <StatCard
              label="Concentration Alerts"
              value={String(concentrationAlerts)}
              colorClass={concentrationAlerts > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
            />
          </div>

          {/* Donut chart */}
          {donutData.length > 0 && (
            <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
              <h3 className="text-lg font-semibold mb-3">Top 10 Customers by Volume</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={donutData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Concentration table */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Customer Concentration (Open Contracts)</h3>
            <DataTable data={customerSummaries} columns={custColumns} />
          </div>
        </>
      )}

      {activeTab === 'profitability' && (
        <>
          {/* Profitability stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Customers w/ History" value={String(profitability.length)} />
            <StatCard
              label="Avg Margin/Bu"
              value={avgMargin !== null ? formatCurrency(avgMargin) : '—'}
              colorClass={avgMargin !== null && avgMargin < 0 ? 'border-red-300 dark:border-red-700' : ''}
            />
            <StatCard
              label="Negative Margin"
              value={String(profitability.filter((p) => p.approxMargin !== null && p.approxMargin < 0).length)}
              colorClass={profitability.some((p) => p.approxMargin !== null && p.approxMargin < 0) ? 'border-red-300 dark:border-red-700' : ''}
            />
            <StatCard
              label="Completed Volume"
              value={formatBushelsShort(profitability.reduce((s, p) => s + p.completedBushels, 0))}
            />
          </div>

          {profitability.length > 0 ? (
            <>
              <div>
                <h3 className="text-lg font-semibold mb-1">Customer Profitability (Completed Trades)</h3>
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  Rolling 12-month market avg buy, FOB freight-adjusted. Click entity rows to expand per-commodity detail.
                </p>
                <DataTable data={profitability} columns={profitColumns} getSubRows={getSubRows} />
              </div>
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-500/20 dark:border-amber-500/20 rounded-lg p-3">
                <p className="text-sm text-[var(--warning)]">
                  <span className="font-semibold">Note:</span> Market avg buy uses rolling 12 months of completed purchases.
                  FOB/Pickup contracts without a freight tier use median freight cost as an estimate.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No completed sale contracts in the current data set.</p>
          )}
        </>
      )}
    </div>
  );
}
