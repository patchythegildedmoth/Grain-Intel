import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useUnpricedExposure, type UnpricedSummaryRow, type UnpricedContract } from '../../hooks/useUnpricedExposure';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatDate, formatBasis, formatCurrency } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const summaryCol = createColumnHelper<UnpricedSummaryRow>();
const summaryColumns = [
  summaryCol.accessor('contractType', { header: 'Side' }),
  summaryCol.accessor('pricingType', { header: 'Pricing Type' }),
  summaryCol.accessor('exposureType', { header: 'Exposure Type' }),
  summaryCol.accessor('contractCount', { header: '# Contracts' }),
  summaryCol.accessor('totalExposureBushels', {
    header: 'Exposure (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  summaryCol.accessor('avgDaysToExpiry', {
    header: 'Avg Days to Expiry',
    cell: (info) => {
      const v = info.getValue();
      if (v < 0) return <span className="text-red-600 dark:text-red-400 font-semibold">{v}d (overdue)</span>;
      if (v <= 14) return <span className="text-amber-600 dark:text-amber-400 font-semibold">{v}d</span>;
      return `${v}d`;
    },
  }),
  summaryCol.accessor('overdueCount', {
    header: 'Overdue',
    cell: (info) => {
      const v = info.getValue();
      if (v > 0) return <AlertBadge level="critical">{v}</AlertBadge>;
      return '0';
    },
  }),
  summaryCol.accessor('urgentCount', {
    header: 'Urgent',
    cell: (info) => {
      const v = info.getValue();
      if (v > 0) return <AlertBadge level="warning">{v}</AlertBadge>;
      return '0';
    },
  }),
];

const detailCol = createColumnHelper<UnpricedContract>();
const detailColumns = [
  detailCol.accessor('contractNumber', { header: 'Contract #' }),
  detailCol.accessor('entity', { header: 'Entity' }),
  detailCol.accessor('contractType', { header: 'Side' }),
  detailCol.accessor('pricingType', { header: 'Pricing' }),
  detailCol.accessor('exposureType', { header: 'Exposure' }),
  detailCol.accessor('exposureBushels', {
    header: 'Exposure (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  detailCol.accessor('futures', {
    header: 'Futures',
    cell: (info) => formatCurrency(info.getValue()),
  }),
  detailCol.accessor('basis', {
    header: 'Basis',
    cell: (info) => formatBasis(info.getValue()),
  }),
  detailCol.accessor('futureMonthShort', { header: 'Futures Month' }),
  detailCol.accessor('freightTerm', {
    header: 'Freight',
    cell: (info) => info.getValue() || '—',
  }),
  detailCol.accessor('endDate', {
    header: 'End Date',
    cell: (info) => formatDate(info.getValue()),
  }),
  detailCol.accessor('daysUntilDeliveryEnd', {
    header: 'Days Left',
    cell: (info) => {
      const v = info.getValue();
      if (v < 0) return <span className="text-red-600 dark:text-red-400 font-semibold">{v}d</span>;
      if (v <= 14) return <span className="text-amber-600 dark:text-amber-400 font-semibold">{v}d</span>;
      return `${v}d`;
    },
  }),
  detailCol.display({
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const row = info.row.original;
      if (row.isOverdue) return <AlertBadge level="critical">OVERDUE</AlertBadge>;
      if (row.isUrgent) return <AlertBadge level="warning">URGENT</AlertBadge>;
      return <AlertBadge level="ok">OK</AlertBadge>;
    },
  }),
];

export function UnpricedExposureReport() {
  const { commoditySummaries, totalExposure, totalOverdue, totalUrgent, totalContracts } = useUnpricedExposure();

  const chartData = useMemo(() => {
    return commoditySummaries.map((cs) => ({
      commodity: cs.commodity,
      exposure: cs.totalExposure,
      color: getCommodityColor(cs.commodity),
    }));
  }, [commoditySummaries]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Unpriced Exposure Report</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalContracts} unpriced contracts
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Exposure" value={formatBushelsShort(totalExposure)} />
        <StatCard label="Unpriced Contracts" value={String(totalContracts)} />
        <StatCard
          label="Overdue"
          value={String(totalOverdue)}
          colorClass={totalOverdue > 0 ? 'border-red-300 dark:border-red-700' : ''}
        />
        <StatCard
          label="Urgent (≤14d)"
          value={String(totalUrgent)}
          colorClass={totalUrgent > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
        />
      </div>

      {/* Exposure by commodity chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3">Unpriced Exposure by Commodity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis dataKey="commodity" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
              <Bar dataKey="exposure" name="Unpriced (Bu)" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-commodity sections */}
      {commoditySummaries.map((cs) => (
        <div key={cs.commodity} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(cs.commodity) }} />
            <h3 className="text-lg font-semibold">{cs.commodity}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatBushelsShort(cs.totalExposure)} bu exposure
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

          {/* Section A: Summary table */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Summary by Type</h4>
            <DataTable
              data={cs.summaryRows}
              columns={summaryColumns}
              footerRow={{
                contractType: 'TOTAL',
                contractCount: String(cs.contracts.length),
                totalExposureBushels: formatBushelsShort(cs.totalExposure),
                overdueCount: String(cs.overdueContracts),
                urgentCount: String(cs.urgentContracts),
              }}
            />
          </div>

          {/* Section B: Contract detail */}
          <div>
            <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Contract Detail ({cs.contracts.length} contracts)
            </h4>
            <DataTable data={cs.contracts} columns={detailColumns} />
          </div>
        </div>
      ))}

      {totalContracts === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No unpriced exposure found in current contracts.
        </div>
      )}
    </div>
  );
}
