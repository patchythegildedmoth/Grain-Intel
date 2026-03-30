import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import {
  useUnpricedExposure,
  type UnpricedSummaryRow,
  type UnpricedContract,
  type FuturesMonthExposure,
} from '../../hooks/useUnpricedExposure';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatDate, formatBasis, formatCurrency } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
  ComposedChart, Line, ReferenceLine,
} from 'recharts';
import { SegmentedControl } from '../shared/SegmentedControl';
import { CrossModuleLink } from '../shared/CrossModuleLink';
import { ExposureWaterfall } from '../shared/ExposureWaterfall';
import { useMarketDataStore } from '../../store/useMarketDataStore';

// --- Summary by type table ---
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
      if (v < 0) return <span className="text-[var(--negative)] font-semibold">{v}d (overdue)</span>;
      if (v <= 14) return <span className="text-[var(--warning)] font-semibold">{v}d</span>;
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

// --- Contract detail table ---
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
      if (v < 0) return <span className="text-[var(--negative)] font-semibold">{v}d</span>;
      if (v <= 14) return <span className="text-[var(--warning)] font-semibold">{v}d</span>;
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

// --- Futures Month Exposure table ---
const fmCol = createColumnHelper<FuturesMonthExposure>();
const fmColumns = [
  fmCol.accessor('futureMonthShort', { header: 'Futures Month' }),
  fmCol.accessor('purchaseExposure', {
    header: 'Purchase Unpriced',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  fmCol.accessor('saleExposure', {
    header: 'Sale Unpriced',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  fmCol.accessor('grossExposure', {
    header: 'Gross',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  fmCol.accessor('netExposure', {
    header: 'Net',
    cell: (info) => {
      const v = info.getValue();
      if (v === 0) return '0';
      const label = v > 0 ? 'Long' : 'Short';
      const color = Math.abs(v) > 50_000
        ? 'text-[var(--warning)] font-semibold'
        : v > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]';
      return <span className={color}>{formatBushelsShort(v)} ({label})</span>;
    },
  }),
  fmCol.display({
    id: 'freightMix',
    header: 'Freight Mix',
    cell: (info) => {
      const fb = info.row.original.freightBreakdown;
      if (fb.length === 0) return '—';
      if (fb.length === 1) return fb[0].freightTerm;
      return (
        <div className="text-xs space-y-0.5">
          {fb.map((f) => (
            <div key={f.freightTerm}>
              <span className="font-medium">{f.freightTerm}:</span>{' '}
              <span className={f.netExposure > 0 ? 'text-[var(--positive)]' : f.netExposure < 0 ? 'text-[var(--negative)]' : ''}>
                Net {formatBushelsShort(f.netExposure)}
              </span>
            </div>
          ))}
        </div>
      );
    },
  }),
  fmCol.accessor('contractCount', { header: '# Contracts' }),
];

function formatNetLabel(net: number): string {
  if (net === 0) return 'Flat';
  const dir = net > 0 ? 'Net Long' : 'Net Short';
  return `${dir} ${formatBushelsShort(Math.abs(net))}`;
}

const EXPOSURE_TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'by-month', label: 'By Futures Month' },
  { key: 'contracts', label: 'Contracts' },
];

export function UnpricedExposureReport({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState('summary');
  const {
    commoditySummaries, totalExposure, totalNetExposure,
    totalOverdue, totalUrgent, totalContracts, previousExposure,
  } = useUnpricedExposure();
  const inTransit = useMarketDataStore((s) => s.current.inTransit);
  const htaPaired = useMarketDataStore((s) => s.current.htaPaired);
  const totalInTransit = Object.values(inTransit).reduce((s, v) => s + v, 0);
  const totalHtaPaired = Object.values(htaPaired).reduce((s, v) => s + v, 0);

  // Day-over-day delta for net exposure
  const prevTotalNet = useMemo(() => {
    if (!previousExposure) return null;
    return Object.values(previousExposure).reduce((s, e) => s + e.net, 0);
  }, [previousExposure]);

  const netDelta = prevTotalNet !== null ? totalNetExposure - prevTotalNet : null;

  // Top-level bar chart: gross + net per commodity
  const chartData = useMemo(() => {
    return commoditySummaries.map((cs) => ({
      commodity: cs.commodity,
      gross: cs.totalExposure,
      net: cs.netExposure,
      color: getCommodityColor(cs.commodity),
    }));
  }, [commoditySummaries]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Unpriced Exposure Report</h2>
        <span className="text-sm text-[var(--text-muted)]">
          {totalContracts} unpriced contracts
        </span>
      </div>

      <SegmentedControl segments={EXPOSURE_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Summary cards — always visible */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Gross Exposure" value={formatBushelsShort(totalExposure)} />
        <StatCard
          label="Net Exposure"
          value={formatNetLabel(totalNetExposure)}
          delta={netDelta !== null ? `${netDelta >= 0 ? '+' : ''}${formatBushelsShort(netDelta)} from prev` : undefined}
          deltaDirection={netDelta !== null ? (Math.abs(totalNetExposure) < Math.abs(prevTotalNet!) ? 'up' : 'down') : undefined}
          colorClass={Math.abs(totalNetExposure) > 75_000 ? 'border-amber-300 dark:border-amber-700' : ''}
        />
        <StatCard label="Unpriced Contracts" value={String(totalContracts)} />
        <StatCard
          label="Overdue"
          value={String(totalOverdue)}
          colorClass={totalOverdue > 0 ? 'border-red-600/20 dark:border-red-700' : ''}
        />
        <StatCard
          label="Urgent (≤14d)"
          value={String(totalUrgent)}
          colorClass={totalUrgent > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
        />
      </div>

      {/* Exposure by commodity chart: summary tab only */}
      {activeTab === 'summary' && chartData.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="text-lg font-semibold mb-3">Unpriced Exposure by Commodity</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
              <XAxis dataKey="commodity" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
              <Legend />
              <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
              <Bar dataKey="gross" name="Gross" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.color} fillOpacity={0.4} />
                ))}
              </Bar>
              <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.net >= 0 ? '#22C55E' : '#EF4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exposure Waterfall — summary tab only */}
      {activeTab === 'summary' && totalExposure > 0 && (totalInTransit > 0 || totalHtaPaired > 0) && (
        <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
          <h3 className="text-lg font-semibold mb-3">Exposure Waterfall</h3>
          <ExposureWaterfall
            grossExposure={totalExposure}
            inTransit={totalInTransit}
            htaPaired={totalHtaPaired}
          />
        </div>
      )}

      {/* Per-commodity sections — filtered by active tab */}
      {commoditySummaries.map((cs) => (
        <div key={cs.commodity} className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(cs.commodity) }} />
            <h3 className="text-lg font-semibold">{cs.commodity}</h3>
            <span className="text-sm text-[var(--text-muted)]">
              Gross: {formatBushelsShort(cs.totalExposure)} bu
            </span>
            <span className={`text-sm font-medium ${
              cs.netExposure === 0 ? 'text-[var(--text-muted)]' :
              Math.abs(cs.netExposure) > 50_000 ? 'text-[var(--warning)]' :
              cs.netExposure > 0 ? 'text-[var(--positive)]' :
              'text-[var(--negative)]'
            }`}>
              {formatNetLabel(cs.netExposure)}
            </span>
          </div>

          {/* Alerts — always visible */}
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

          {/* Summary tab: type summary table */}
          {activeTab === 'summary' && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">Summary by Type</h4>
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
          )}

          {/* By Futures Month tab: FM chart + FM table */}
          {activeTab === 'by-month' && (
            <>
              {cs.futuresMonthBreakdown.length > 1 && (
                <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
                  <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
                    Exposure by Futures Month
                  </h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart
                      data={cs.futuresMonthBreakdown}
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}
                    >
                      <XAxis dataKey="futureMonthShort" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                      <Bar dataKey="purchaseExposure" name="Purchase Unpriced" fill="#22C55E" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="saleExposure" name="Sale Unpriced" fill="#EF4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="netExposure" name="Net" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              {cs.futuresMonthBreakdown.length > 0 && (
                <DataTable
                  data={cs.futuresMonthBreakdown}
                  columns={fmColumns}
                  footerRow={{
                    futureMonthShort: 'TOTAL',
                    purchaseExposure: formatBushelsShort(cs.purchaseExposure),
                    saleExposure: formatBushelsShort(cs.saleExposure),
                    grossExposure: formatBushelsShort(cs.totalExposure),
                    netExposure: formatNetLabel(cs.netExposure),
                    contractCount: String(cs.contracts.length),
                  }}
                />
              )}
            </>
          )}

          {/* Contracts tab: full detail table */}
          {activeTab === 'contracts' && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                Contract Detail ({cs.contracts.length} contracts)
              </h4>
              <DataTable data={cs.contracts} columns={detailColumns} />
            </div>
          )}
        </div>
      ))}

      {totalContracts === 0 && (
        <div className="text-center py-12 text-[var(--text-muted)]">
          No unpriced exposure found in current contracts.
        </div>
      )}

      {/* Cross-module links */}
      {onNavigate && totalContracts > 0 && (
        <div className="flex gap-6 pt-2">
          <CrossModuleLink label="Check delivery timeline" moduleId="delivery-timeline" onNavigate={onNavigate} />
          <CrossModuleLink label="Run what-if scenario" moduleId="scenario" onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
}
