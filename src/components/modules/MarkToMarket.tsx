import { useEffect, useState, useCallback } from 'react';
import { useMarkToMarket } from '../../hooks/useMarkToMarket';
import { SegmentedControl } from '../shared/SegmentedControl';
import { usePriceLaterExposure } from '../../hooks/usePriceLaterExposure';
import { useFreightEfficiency } from '../../hooks/useFreightEfficiency';
import { useMarketDataStore } from '../../store/useMarketDataStore';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatCurrency, formatBasis, formatNumber } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { CrossModuleLink } from '../shared/CrossModuleLink';
import { InlineScenarioSlider } from '../shared/InlineScenarioSlider';
import { useScenario } from '../../hooks/useScenario';

const M2M_TABS = [
  { key: 'executive', label: 'Executive Summary' },
  { key: 'by-month', label: 'P&L by Month' },
  { key: 'detail', label: 'Contract Detail' },
];

export function MarkToMarket({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [activeTab, setActiveTab] = useState('executive');
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [scenarioPrices, setScenarioPrices] = useState<Record<string, number>>({});
  const [scenarioBasis, setScenarioBasis] = useState<Record<string, number>>({});
  const {
    commoditySummaries,
    alerts,
    totalBookPnl,
    totalOpenPnl,
    totalFuturesPnl,
    totalBasisPnl,
    hasMarketData,
    allContracts,
  } = useMarkToMarket();
  const { totalDailyCarry } = usePriceLaterExposure();
  const { blendedFreightCost, totalFreightAdjustedBushels } = useFreightEfficiency();
  const { m2mSnapshots, saveM2MSnapshot } = useMarketDataStore();
  const { scenarios: whatIfScenarios, totalPnl: whatIfTotalPnl } = useScenario(scenarioPrices, scenarioBasis);

  const handleFuturesChange = useCallback((commodity: string, value: number) => {
    setScenarioPrices((prev) => ({ ...prev, [commodity]: value }));
  }, []);
  const handleBasisChange = useCallback((commodity: string, value: number) => {
    setScenarioBasis((prev) => ({ ...prev, [commodity]: value }));
  }, []);

  // Snapshot M2M results for sparkline history
  useEffect(() => {
    if (hasMarketData && totalBookPnl !== 0) {
      saveM2MSnapshot({
        totalPnl: totalBookPnl,
        openPnl: totalOpenPnl,
        dailyCarryCost: totalDailyCarry,
        avgFreightCostPerBu: blendedFreightCost ?? undefined,
        totalFreightAdjustedBushels: totalFreightAdjustedBushels || undefined,
      });
    }
  }, [totalBookPnl, totalOpenPnl, totalDailyCarry, blendedFreightCost, totalFreightAdjustedBushels, hasMarketData, saveM2MSnapshot]);

  if (!hasMarketData) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-[var(--text-secondary)]">Enter Market Data First</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Go to Daily Inputs to enter current futures settlements and sell basis levels.
        </p>
      </div>
    );
  }

  // Sparkline data from history
  const sparklineData = Object.entries(m2mSnapshots)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, snap]) => ({
      date,
      pnl: snap.totalPnl,
      openPnl: snap.openPnl,
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Mark-to-Market Report</h2>
        {/* Sparkline if we have history */}
        {sparklineData.length > 1 && (
          <div className="w-48 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line
                  type="monotone"
                  dataKey="pnl"
                  stroke={totalBookPnl >= 0 ? '#22c55e' : '#ef4444'}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-[var(--text-muted)] text-center">P&L trend ({sparklineData.length} days)</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Book P&L"
          value={formatCurrency(totalBookPnl)}
          deltaDirection={totalBookPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Open Exposure P&L"
          value={formatCurrency(totalOpenPnl)}
          delta="At-risk P&L"
          deltaDirection={totalOpenPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Futures P&L"
          value={formatCurrency(totalFuturesPnl)}
          delta="Hedgeable component"
          deltaDirection={totalFuturesPnl >= 0 ? 'up' : 'down'}
        />
        <StatCard
          label="Basis P&L"
          value={formatCurrency(totalBasisPnl)}
          delta="Non-hedgeable component"
          deltaDirection={totalBasisPnl >= 0 ? 'up' : 'down'}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((a, i) => (
            <AlertBadge key={i} level={a.severity === 'red' ? 'critical' : a.severity === 'amber' ? 'warning' : 'info'}>
              {a.message}
            </AlertBadge>
          ))}
        </div>
      )}

      <SegmentedControl segments={M2M_TABS} activeKey={activeTab} onChange={setActiveTab} />

      {/* Section A: Executive Summary */}
      {activeTab === 'executive' && <section className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)] dark:bg-gray-750">
          <h3 className="font-semibold text-[var(--text-primary)]">Executive Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--bg-surface-raised)] dark:bg-gray-700 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                <th className="px-4 py-2">Commodity</th>
                <th className="px-4 py-2 text-right">Long Bu</th>
                <th className="px-4 py-2 text-right">Short Bu</th>
                <th className="px-4 py-2 text-right">Net Bu</th>
                <th className="px-4 py-2 text-right">In-Transit</th>
                <th className="px-4 py-2 text-right">HTA-Paired</th>
                <th className="px-4 py-2 text-right">Open Exp.</th>
                <th className="px-4 py-2 text-right">Total P&L</th>
                <th className="px-4 py-2 text-right">Open P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {commoditySummaries.map((cs) => (
                <tr key={cs.commodity} className="hover:bg-[var(--bg-surface-raised)] dark:hover:bg-gray-750">
                  <td className="px-4 py-2 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getCommodityColor(cs.commodity) }} />
                    {cs.commodity}
                  </td>
                  <td className="px-4 py-2 text-right">{formatKBushels(cs.longBushels)}</td>
                  <td className="px-4 py-2 text-right">{formatKBushels(cs.shortBushels)}</td>
                  <td className="px-4 py-2 text-right font-medium">{cs.netBushels >= 0 ? '+' : ''}{formatKBushels(cs.netBushels)}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-muted)]">{formatKBushels(cs.inTransit)}</td>
                  <td className="px-4 py-2 text-right text-[var(--text-muted)]">{formatKBushels(cs.htaPaired)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatKBushels(cs.openExposure)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${cs.totalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                    {formatCurrency(cs.totalPnl)}
                  </td>
                  <td className={`px-4 py-2 text-right font-medium ${cs.openPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                    {formatCurrency(cs.openPnl)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--bg-surface-raised)] dark:bg-gray-750 font-semibold border-t-2 border-[var(--border-default)]">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.longBushels, 0))}</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.shortBushels, 0))}</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.netBushels, 0))}</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.inTransit, 0))}</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.htaPaired, 0))}</td>
                <td className="px-4 py-2 text-right">{formatKBushels(commoditySummaries.reduce((s, c) => s + c.openExposure, 0))}</td>
                <td className={`px-4 py-2 text-right ${totalBookPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {formatCurrency(totalBookPnl)}
                </td>
                <td className={`px-4 py-2 text-right ${totalOpenPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {formatCurrency(totalOpenPnl)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>}

      {/* Inline What-If Drawer — executive tab only */}
      {activeTab === 'executive' && (
        <div className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden no-print">
          <button
            onClick={() => setWhatIfOpen(!whatIfOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-surface-raised)] dark:hover:bg-gray-750 transition-colors"
          >
            <span>
              What-If Scenario
              {whatIfTotalPnl !== 0 && (
                <span className={`ml-2 text-xs font-normal ${whatIfTotalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  ({whatIfTotalPnl >= 0 ? '+' : ''}{formatCurrency(whatIfTotalPnl)} impact)
                </span>
              )}
            </span>
            <svg className={`w-4 h-4 transition-transform ${whatIfOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
          {whatIfOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-[var(--border-default)] pt-3">
              {whatIfScenarios.filter((s) => s.basisContracts > 0 || s.htaContracts > 0).map((sc) => {
                const defaultFutures = sc.currentAvgFutures ?? 5;
                const defaultBasis = sc.currentAvgBasis ?? 0;
                return (
                  <div key={sc.commodity} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-secondary)]">{sc.commodity}</span>
                      {sc.totalPnl !== 0 && (
                        <span className={`text-xs font-semibold ${sc.totalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                          {sc.totalPnl >= 0 ? '+' : ''}{formatCurrency(sc.totalPnl)}
                        </span>
                      )}
                    </div>
                    {sc.basisContracts > 0 && (
                      <InlineScenarioSlider
                        label="Futures"
                        value={scenarioPrices[sc.commodity] ?? defaultFutures}
                        min={Math.max(0, defaultFutures - 2)}
                        max={defaultFutures + 2}
                        step={0.05}
                        defaultValue={defaultFutures}
                        onChange={(v) => handleFuturesChange(sc.commodity, v)}
                        formatValue={(v) => `$${v.toFixed(2)}`}
                      />
                    )}
                    {sc.htaContracts > 0 && (
                      <InlineScenarioSlider
                        label="Basis"
                        value={scenarioBasis[sc.commodity] ?? defaultBasis}
                        min={defaultBasis - 1}
                        max={defaultBasis + 1}
                        step={0.01}
                        defaultValue={defaultBasis}
                        onChange={(v) => handleBasisChange(sc.commodity, v)}
                        formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
                      />
                    )}
                  </div>
                );
              })}
              {whatIfScenarios.filter((s) => s.basisContracts > 0 || s.htaContracts > 0).length === 0 && (
                <p className="text-xs text-[var(--text-muted)]">No Basis or HTA contracts to model. All positions are fully priced.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cross-module links */}
      {activeTab === 'executive' && onNavigate && (
        <div className="flex gap-6 pt-2">
          <CrossModuleLink label="Run what-if scenario" moduleId="scenario" onNavigate={onNavigate} />
          <CrossModuleLink label="View unpriced contracts" moduleId="unpriced-exposure" onNavigate={onNavigate} />
        </div>
      )}

      {/* Per-commodity: FM Breakdown + Waterfall */}
      {activeTab === 'by-month' && commoditySummaries.map((cs) => (
        <div key={cs.commodity} className="space-y-4">
          <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(cs.commodity) }} />
            {cs.commodity} — P&L by Futures Month
          </h3>

          {/* FM Table */}
          <section className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--bg-surface-raised)] dark:bg-gray-700 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                    <th className="px-4 py-2">Futures Mo.</th>
                    <th className="px-4 py-2 text-right">Long</th>
                    <th className="px-4 py-2 text-right">Short</th>
                    <th className="px-4 py-2 text-right">Net</th>
                    <th className="px-4 py-2 text-right">Avg Buy Basis</th>
                    <th className="px-4 py-2 text-right">Avg Sell Basis</th>
                    <th className="px-4 py-2 text-right">Mkt Basis</th>
                    <th className="px-4 py-2 text-right">Futures P&L</th>
                    <th className="px-4 py-2 text-right">Basis P&L</th>
                    <th className="px-4 py-2 text-right">Total P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {cs.byFuturesMonth.map((fm) => (
                    <tr key={fm.sortKey} className="hover:bg-[var(--bg-surface-raised)] dark:hover:bg-gray-750">
                      <td className="px-4 py-2 font-medium">{fm.futuresMonth}</td>
                      <td className="px-4 py-2 text-right">{formatKBushels(fm.longBushels)}</td>
                      <td className="px-4 py-2 text-right">{formatKBushels(fm.shortBushels)}</td>
                      <td className="px-4 py-2 text-right font-medium">{fm.netBushels >= 0 ? '+' : ''}{formatKBushels(fm.netBushels)}</td>
                      <td className="px-4 py-2 text-right">{fm.avgBuyBasis !== null ? formatBasis(fm.avgBuyBasis) : '—'}</td>
                      <td className="px-4 py-2 text-right">{fm.avgSellBasis !== null ? formatBasis(fm.avgSellBasis) : '—'}</td>
                      <td className="px-4 py-2 text-right">{fm.marketBasis !== null ? formatBasis(fm.marketBasis) : '—'}</td>
                      <td className={`px-4 py-2 text-right ${fm.futuresPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {formatCurrency(fm.futuresPnl)}
                      </td>
                      <td className={`px-4 py-2 text-right ${fm.basisPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {formatCurrency(fm.basisPnl)}
                      </td>
                      <td className={`px-4 py-2 text-right font-medium ${fm.totalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                        {formatCurrency(fm.totalPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Waterfall */}
          <section className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)] dark:bg-gray-750">
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">Exposure Waterfall</h4>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {cs.waterfall.map((tier, i) => {
                  const maxBu = Math.max(...cs.waterfall.map((t) => Math.abs(t.bushels)));
                  const width = maxBu > 0 ? (Math.abs(tier.bushels) / maxBu) * 100 : 0;
                  const isSubtraction = tier.bushels < 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-36 text-xs font-medium text-[var(--text-secondary)] text-right">
                        {tier.label}
                      </div>
                      <div className="flex-1 relative h-7 bg-[var(--bg-surface-raised)] dark:bg-gray-700 rounded">
                        <div
                          className={`h-full rounded ${
                            i === cs.waterfall.length - 1
                              ? 'bg-blue-500'
                              : isSubtraction
                                ? 'bg-red-400 dark:bg-red-600'
                                : 'bg-green-400 dark:bg-green-600'
                          }`}
                          style={{ width: `${Math.max(width, 2)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                          <span className={width > 30 ? 'text-white' : 'text-[var(--text-secondary)] ml-1'}>
                            {isSubtraction ? '(' : ''}{formatKBushels(Math.abs(tier.bushels))}{isSubtraction ? ')' : ''}
                            {' · '}
                            {formatCurrency(tier.pnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">{cs.waterfall[cs.waterfall.length - 1]?.description}</p>
            </div>
          </section>
        </div>
      ))}

      {/* Section C: Contract Detail */}
      {activeTab === 'detail' && <section className="bg-[var(--bg-surface)] rounded-xl shadow-sm border border-[var(--border-default)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface-raised)] dark:bg-gray-750">
          <h3 className="font-semibold text-[var(--text-primary)]">
            Contract Detail ({allContracts.length} contracts)
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[var(--bg-surface-raised)] dark:bg-gray-700 text-left text-xs font-medium text-[var(--text-muted)] uppercase">
                <th className="px-3 py-2">Contract</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Cmdty</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Pricing</th>
                <th className="px-3 py-2">FM</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2 text-right">Contract $</th>
                <th className="px-3 py-2 text-right">Market $</th>
                <th className="px-3 py-2 text-right">Futures P&L</th>
                <th className="px-3 py-2 text-right">Basis P&L</th>
                <th className="px-3 py-2 text-right">Total P&L</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {allContracts
                .sort((a, b) => a.m2m.totalPnl - b.m2m.totalPnl)
                .map((cm) => (
                  <tr key={cm.contract.contractNumber} className="hover:bg-[var(--bg-surface-raised)] dark:hover:bg-gray-750">
                    <td className="px-3 py-1.5 font-mono">{cm.contract.contractNumber}</td>
                    <td className="px-3 py-1.5 truncate max-w-[100px]">{cm.contract.entity}</td>
                    <td className="px-3 py-1.5">{cm.contract.commodityCode}</td>
                    <td className="px-3 py-1.5">{cm.contract.contractType}</td>
                    <td className="px-3 py-1.5">{cm.contract.pricingType}</td>
                    <td className="px-3 py-1.5">{cm.contract.futureMonthShort}</td>
                    <td className="px-3 py-1.5 text-right">{formatNumber(cm.contract.balance)}</td>
                    <td className="px-3 py-1.5 text-right">{cm.contract.cashPrice !== null ? formatCurrency(cm.contract.cashPrice) : '—'}</td>
                    <td className="px-3 py-1.5 text-right">{cm.currentMarketValue !== null ? formatCurrency(cm.currentMarketValue) : '—'}</td>
                    <td className={`px-3 py-1.5 text-right ${(cm.m2m.futuresPnl ?? 0) >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {cm.m2m.futuresPnl !== null ? formatCurrency(cm.m2m.futuresPnl) : 'Open'}
                    </td>
                    <td className={`px-3 py-1.5 text-right ${(cm.m2m.basisPnl ?? 0) >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {cm.m2m.basisPnl !== null ? formatCurrency(cm.m2m.basisPnl) : 'Open'}
                    </td>
                    <td className={`px-3 py-1.5 text-right font-medium ${cm.m2m.totalPnl >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {cm.m2m.isMarkable ? formatCurrency(cm.m2m.totalPnl) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      {!cm.m2m.isMarkable && (
                        <span className="px-1.5 py-0.5 bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] dark:bg-gray-700 dark:text-[var(--text-muted)] rounded text-xs" title={cm.m2m.missingReason ?? ''}>
                          No data
                        </span>
                      )}
                      {cm.m2m.isMarkable && cm.m2m.totalPnl < -10_000 && (
                        <span className="px-1.5 py-0.5 bg-red-600/10 text-[var(--negative)] dark:bg-red-600/10/30 dark:text-red-400 rounded text-xs font-medium">
                          LOSS &gt;$10K
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>}
    </div>
  );
}

function formatKBushels(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return formatNumber(n);
}
