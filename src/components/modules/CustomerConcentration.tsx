import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useCustomerAnalysis, type CustomerSummary, type CustomerProfitability } from '../../hooks/useCustomerAnalysis';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
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
  profitCol.accessor('entity', { header: 'Entity' }),
  profitCol.accessor('avgSellBasis', {
    header: 'Avg Sell Basis',
    cell: (info) => {
      const v = info.getValue();
      if (v === null) return '—';
      return formatCurrency(v);
    },
  }),
  profitCol.accessor('marketAvgBuyBasis', {
    header: 'Market Avg Buy',
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
        <span className={v < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400'}>
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

export function CustomerConcentration() {
  const { customerSummaries, profitability, top10, othersTotal, totalOpenBushels, uniqueEntities } = useCustomerAnalysis();

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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Customer Concentration & Profitability</h2>

      {/* Summary cards */}
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
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
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

      {/* Profitability table */}
      {profitability.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Customer Profitability (Completed Trades)</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Approximate margin = Customer avg sell basis - Market avg buy basis
          </p>
          <DataTable data={profitability} columns={profitColumns} />
          <div className="mt-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-semibold">Note:</span> Margin estimates do not include freight costs.
              Delivered customers may have lower true margins than shown.
              Pickup and FOB customers may have higher true margins than shown.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
