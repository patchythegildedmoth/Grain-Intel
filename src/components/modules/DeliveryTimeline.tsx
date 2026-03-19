import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useDeliveryTimeline, type DeliveryMonthSummary } from '../../hooks/useDeliveryTimeline';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatDate } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import type { Contract } from '../../types/contracts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

const monthCol = createColumnHelper<DeliveryMonthSummary>();
const monthColumns = [
  monthCol.accessor('monthLabel', { header: 'Month' }),
  monthCol.accessor('inboundBushels', {
    header: 'Inbound (Bu)',
    cell: (info) => <span className="text-green-600 dark:text-green-400">{formatBushelsShort(info.getValue())}</span>,
  }),
  monthCol.accessor('outboundBushels', {
    header: 'Outbound (Bu)',
    cell: (info) => <span className="text-red-600 dark:text-red-400">{formatBushelsShort(info.getValue())}</span>,
  }),
  monthCol.accessor('netFlow', {
    header: 'Net Flow (Bu)',
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={v < 0 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-green-600 dark:text-green-400'}>
          {formatBushelsShort(v)}
        </span>
      );
    },
  }),
  monthCol.accessor('contracts', {
    header: '# Contracts',
    cell: (info) => info.getValue().length,
  }),
  monthCol.display({
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const alerts = info.row.original.alerts;
      const critical = alerts.find((a) => a.level === 'critical');
      const warning = alerts.find((a) => a.level === 'warning');
      if (critical) return <AlertBadge level="critical">ALERT</AlertBadge>;
      if (warning) return <AlertBadge level="warning">WARN</AlertBadge>;
      return <AlertBadge level="ok">OK</AlertBadge>;
    },
  }),
];

const contractCol = createColumnHelper<Contract>();
const contractColumns = [
  contractCol.accessor('contractNumber', { header: 'Contract #' }),
  contractCol.accessor('entity', { header: 'Entity' }),
  contractCol.accessor('commodityCode', { header: 'Commodity' }),
  contractCol.accessor('contractType', { header: 'Side' }),
  contractCol.accessor('balance', {
    header: 'Balance (Bu)',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  contractCol.accessor('futureMonthShort', { header: 'Futures Month' }),
  contractCol.accessor('endDate', {
    header: 'Delivery End',
    cell: (info) => formatDate(info.getValue()),
  }),
  contractCol.accessor('daysUntilDeliveryEnd', {
    header: 'Days Left',
    cell: (info) => {
      const v = info.getValue();
      if (v < 0) return <span className="text-red-600 dark:text-red-400 font-semibold">{v}d</span>;
      if (v <= 14) return <span className="text-amber-600 dark:text-amber-400 font-semibold">{v}d</span>;
      return `${v}d`;
    },
  }),
  contractCol.accessor('freightTerm', {
    header: 'Freight',
    cell: (info) => info.getValue() || '—',
  }),
  contractCol.display({
    id: 'status',
    header: 'Status',
    cell: (info) => {
      const c = info.row.original;
      if (c.isOverdue) return <AlertBadge level="critical">OVERDUE</AlertBadge>;
      if (c.isUrgent) return <AlertBadge level="warning">URGENT</AlertBadge>;
      return <AlertBadge level="ok">OK</AlertBadge>;
    },
  }),
];

export function DeliveryTimeline() {
  const {
    monthSummaries,
    currentMonth,
    nextMonth,
    pastDueMonths,
    forwardMonths,
    totalInbound,
    totalOutbound,
    totalNet,
  } = useDeliveryTimeline();

  // Chart data: stacked bar by commodity for forward months
  const chartData = useMemo(() => {
    // Collect all commodities across forward months
    const allCommodities = new Set<string>();
    for (const m of forwardMonths) {
      for (const cb of m.commodityBreakdown) allCommodities.add(cb.commodity);
    }

    return forwardMonths.map((m) => {
      const entry: Record<string, string | number> = { month: m.monthLabel };
      for (const cb of m.commodityBreakdown) {
        entry[`${cb.commodity}_in`] = cb.inbound;
        entry[`${cb.commodity}_out`] = -cb.outbound;
      }
      return entry;
    });
  }, [forwardMonths]);

  const chartCommodities = useMemo(() => {
    const set = new Set<string>();
    for (const m of forwardMonths) {
      for (const cb of m.commodityBreakdown) set.add(cb.commodity);
    }
    return [...set];
  }, [forwardMonths]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Delivery Timeline & Logistics</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {monthSummaries.length} delivery months
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Inbound" value={formatBushelsShort(totalInbound)} />
        <StatCard label="Total Outbound" value={formatBushelsShort(totalOutbound)} />
        <StatCard
          label="Net Flow"
          value={formatBushelsShort(totalNet)}
          deltaDirection={totalNet >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Past Due Months"
          value={String(pastDueMonths.length)}
          colorClass={pastDueMonths.length > 0 ? 'border-red-300 dark:border-red-700' : ''}
        />
      </div>

      {/* Past-due alert */}
      {pastDueMonths.length > 0 && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Past-Due Deliveries</h4>
          <div className="space-y-2 text-sm">
            {pastDueMonths.map((m) => (
              <div key={m.monthKey} className="flex items-center gap-2">
                <AlertBadge level="critical">OVERDUE</AlertBadge>
                <span className="font-medium">{m.monthLabel}:</span>
                <span>{m.contracts.length} contracts, {formatBushelsShort(m.inboundBushels + m.outboundBushels)} bu total</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6-month forward chart */}
      {chartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold mb-3">6-Month Forward View</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} stackOffset="sign" margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatBushelsShort(Math.abs(value))} />
              <Legend />
              <ReferenceLine y={0} stroke="#666" />
              {chartCommodities.map((commodity) => (
                <Bar
                  key={`${commodity}_in`}
                  dataKey={`${commodity}_in`}
                  name={`${commodity} In`}
                  fill={getCommodityColor(commodity)}
                  stackId="inbound"
                  radius={[2, 2, 0, 0]}
                />
              ))}
              {chartCommodities.map((commodity) => (
                <Bar
                  key={`${commodity}_out`}
                  dataKey={`${commodity}_out`}
                  name={`${commodity} Out`}
                  fill={getCommodityColor(commodity)}
                  stackId="outbound"
                  radius={[0, 0, 2, 2]}
                  fillOpacity={0.5}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly summary table */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Monthly Summary</h3>
        <DataTable
          data={monthSummaries}
          columns={monthColumns}
          footerRow={{
            monthLabel: 'TOTAL',
            inboundBushels: formatBushelsShort(totalInbound),
            outboundBushels: formatBushelsShort(totalOutbound),
            netFlow: formatBushelsShort(totalNet),
            contracts: String(monthSummaries.reduce((s, m) => s + m.contracts.length, 0)),
          }}
        />
      </div>

      {/* Current month detail */}
      {currentMonth && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">Current Month: {currentMonth.monthLabel}</h3>
            {currentMonth.alerts.map((a, i) => (
              <AlertBadge key={i} level={a.level}>{a.message}</AlertBadge>
            ))}
          </div>
          <DataTable data={currentMonth.contracts} columns={contractColumns} />
        </div>
      )}

      {/* Next month detail */}
      {nextMonth && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">Next Month: {nextMonth.monthLabel}</h3>
            {nextMonth.alerts.map((a, i) => (
              <AlertBadge key={i} level={a.level}>{a.message}</AlertBadge>
            ))}
          </div>
          <DataTable data={nextMonth.contracts} columns={contractColumns} />
        </div>
      )}
    </div>
  );
}
