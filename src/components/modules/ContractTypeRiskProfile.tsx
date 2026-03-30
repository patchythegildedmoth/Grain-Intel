import { createColumnHelper } from '@tanstack/react-table';
import { useRiskProfile, type PricingTypeBreakdown, type FuturesMonthDetail } from '../../hooks/useRiskProfile';
import { DataTable } from '../shared/DataTable';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatBushelsShort, formatPercent } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';

const PRICING_COLORS: Record<string, string> = {
  Priced: '#22C55E',
  Basis: '#F59E0B',
  HTA: '#3B82F6',
  Cash: '#6B7280',
};

const breakdownCol = createColumnHelper<PricingTypeBreakdown>();
const breakdownColumns = [
  breakdownCol.accessor('pricingType', { header: 'Pricing Type' }),
  breakdownCol.accessor('bushels', {
    header: 'Bushels',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  breakdownCol.accessor('percent', {
    header: '% of Total',
    cell: (info) => formatPercent(info.getValue()),
  }),
  breakdownCol.accessor('contractCount', { header: '# Contracts' }),
];

const fmCol = createColumnHelper<FuturesMonthDetail>();
const fmColumns = [
  fmCol.accessor('futureMonthShort', { header: 'Futures Month' }),
  fmCol.accessor('pricingType', { header: 'Pricing Type' }),
  fmCol.accessor('bushels', {
    header: 'Bushels',
    cell: (info) => formatBushelsShort(info.getValue()),
  }),
  fmCol.accessor('freightMix', { header: 'Freight' }),
  fmCol.accessor('contractCount', { header: '# Contracts' }),
  fmCol.display({
    id: 'status',
    header: 'Timing',
    cell: (info) => {
      if (info.row.original.isNearby) return <AlertBadge level="warning">NEARBY</AlertBadge>;
      return <AlertBadge level="ok">DEFERRED</AlertBadge>;
    },
  }),
];

export function ContractTypeRiskProfile() {
  const { profiles, overallHedgeRatio, totalOpen } = useRiskProfile();

  const totalAlerts = profiles.reduce((s, p) => s + p.alerts.length, 0);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Contract Type Risk Profile</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Commodities" value={String(profiles.length)} />
        <StatCard label="Total Open" value={formatBushelsShort(totalOpen)} />
        <StatCard
          label="Overall Hedge Ratio"
          value={formatPercent(overallHedgeRatio)}
          deltaDirection={overallHedgeRatio >= 0.7 ? 'up' : 'down'}
        />
        <StatCard
          label="Risk Alerts"
          value={String(totalAlerts)}
          colorClass={totalAlerts > 0 ? 'border-amber-300 dark:border-amber-700' : ''}
        />
      </div>

      {/* Per-commodity sections */}
      {profiles.map((profile) => (
        <div key={profile.commodity} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(profile.commodity) }} />
            <h3 className="text-lg font-semibold">{profile.commodity}</h3>
            <span className="text-sm text-[var(--text-muted)]">
              Hedge: {formatPercent(profile.hedgeRatio)}
            </span>
          </div>

          {/* Alerts */}
          {profile.alerts.length > 0 && (
            <div className="space-y-1">
              {profile.alerts.map((alert, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <AlertBadge level={alert.level}>
                    {alert.level === 'critical' ? 'ALERT' : 'WARN'}
                  </AlertBadge>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie chart */}
            <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Composition</h4>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={profile.breakdown}
                    dataKey="bushels"
                    nameKey="pricingType"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {profile.breakdown.map((b) => (
                      <Cell key={b.pricingType} fill={PRICING_COLORS[b.pricingType] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Stacked bar showing Basis/HTA by futures month */}
            {profile.futuresMonthDetail.length > 0 && (
              <div className="bg-[var(--bg-surface)] rounded-lg border border-[var(--border-default)] p-4">
                <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Basis & HTA by Futures Month</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={(() => {
                      // Aggregate by futures month for stacked display
                      const months = new Map<string, { month: string; Basis: number; HTA: number }>();
                      for (const fm of profile.futuresMonthDetail) {
                        if (!months.has(fm.futureMonthSortKey)) {
                          months.set(fm.futureMonthSortKey, { month: fm.futureMonthShort, Basis: 0, HTA: 0 });
                        }
                        const entry = months.get(fm.futureMonthSortKey)!;
                        if (fm.pricingType === 'Basis') entry.Basis += fm.bushels;
                        if (fm.pricingType === 'HTA') entry.HTA += fm.bushels;
                      }
                      return [...months.values()];
                    })()}
                    margin={{ top: 5, right: 10, bottom: 5, left: 10 }}
                  >
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => formatBushelsShort(value)} />
                    <Legend />
                    <Bar dataKey="Basis" stackId="a" fill={PRICING_COLORS.Basis} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="HTA" stackId="a" fill={PRICING_COLORS.HTA} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Breakdown table */}
          <DataTable
            data={profile.breakdown}
            columns={breakdownColumns}
            footerRow={{
              pricingType: 'TOTAL',
              bushels: formatBushelsShort(profile.totalOpenBushels),
              percent: '100.0%',
              contractCount: String(profile.breakdown.reduce((s, b) => s + b.contractCount, 0)),
            }}
          />

          {/* Futures month detail for Basis/HTA */}
          {profile.futuresMonthDetail.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-1">
                Basis & HTA Futures Month Detail
              </h4>
              <DataTable data={profile.futuresMonthDetail} columns={fmColumns} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
