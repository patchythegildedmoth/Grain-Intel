import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { useDeliveryTimeline, type DeliveryMonthSummary } from '../../hooks/useDeliveryTimeline';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatDate } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import type { Contract } from '../../types/contracts';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { SegmentedControl } from '../shared/SegmentedControl';

const monthCol = createColumnHelper<DeliveryMonthSummary>();
const monthColumns = [
  monthCol.accessor('monthLabel', { header: 'Month' }),
  monthCol.accessor('inboundBushels', {
    header: 'Inbound (Bu)',
    cell: (info) => <span className="text-[var(--positive)]">{formatBushelsShort(info.getValue())}</span>,
  }),
  monthCol.accessor('outboundBushels', {
    header: 'Outbound (Bu)',
    cell: (info) => <span className="text-[var(--negative)]">{formatBushelsShort(info.getValue())}</span>,
  }),
  monthCol.accessor('netFlow', {
    header: 'Net Flow (Bu)',
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={v < 0 ? 'text-[var(--negative)] font-semibold' : 'text-[var(--positive)]'}>
          {formatBushelsShort(v)}
        </span>
      );
    },
  }),
  monthCol.display({
    id: 'freightBreakdown',
    header: 'Freight Mix',
    cell: (info) => {
      const fb = info.row.original.freightBreakdown;
      if (fb.length === 0) return '—';
      return (
        <div className="text-xs space-y-0.5">
          {fb.map((f) => (
            <div key={f.term}>
              <span className="font-medium">{f.term}:</span>{' '}
              <span className="text-[var(--positive)]">{formatBushelsShort(f.inbound)}</span>
              {' / '}
              <span className="text-[var(--negative)]">{formatBushelsShort(f.outbound)}</span>
            </div>
          ))}
        </div>
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
      if (v < 0) return <span className="text-[var(--negative)] font-semibold">{v}d</span>;
      if (v <= 14) return <span className="text-[var(--warning)] font-semibold">{v}d</span>;
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

const TIMELINE_TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'this-month', label: 'This Month' },
  { key: 'next-month', label: 'Next Month' },
];

function PastDueSection({ pastDueMonths }: { pastDueMonths: DeliveryMonthSummary[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_COUNT = 3;
  // Show the most recent past-due months first (they have the largest volumes)
  const sorted = [...pastDueMonths].reverse();
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_COUNT);
  const hiddenCount = sorted.length - VISIBLE_COUNT;

  return (
    <div className="bg-red-600/10 dark:bg-red-600/10 border border-red-600/20 dark:border-red-800 rounded-lg p-4">
      <h4 className="font-semibold text-[var(--negative)] dark:text-[var(--negative)] mb-2">
        Past-Due Deliveries ({pastDueMonths.length} months)
      </h4>
      <div className="space-y-2 text-sm">
        {visible.map((m) => (
          <div key={m.monthKey} className="flex items-center gap-2">
            <AlertBadge level="critical">OVERDUE</AlertBadge>
            <span className="font-medium">{m.monthLabel}:</span>
            <span>{m.contracts.length} contracts, {formatBushelsShort(m.inboundBushels + m.outboundBushels)} bu total</span>
          </div>
        ))}
        {hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-1 py-0.5"
          >
            {expanded ? 'Show fewer' : `Show ${hiddenCount} more past-due month${hiddenCount === 1 ? '' : 's'}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function DeliveryTimeline() {
  const [activeTab, setActiveTab] = useState('overview');
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
        <span className="text-sm text-[var(--text-muted)]">
          {monthSummaries.length} delivery months
        </span>
      </div>

      <SegmentedControl segments={TIMELINE_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Summary cards — always visible */}
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
          colorClass={pastDueMonths.length > 0 ? 'border-red-600/20 dark:border-red-700' : ''}
        />
      </div>

      {/* Overview tab content */}
      {activeTab === 'overview' && pastDueMonths.length > 0 && (
        <PastDueSection pastDueMonths={pastDueMonths} />
      )}

      {activeTab === 'overview' && chartData.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
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

      {/* Monthly summary table — overview tab */}
      {activeTab === 'overview' && <div>
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
      </div>}

      {/* Current month detail — overview + this-month tab */}
      {(activeTab === 'overview' || activeTab === 'this-month') && currentMonth && (
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

      {/* Next month detail — overview + next-month tab */}
      {(activeTab === 'overview' || activeTab === 'next-month') && nextMonth && (
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
