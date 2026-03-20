import { usePriceLaterExposure } from '../../hooks/usePriceLaterExposure';
import { StatCard } from '../shared/StatCard';
import { AlertBadge } from '../shared/AlertBadge';
import { formatCurrency, formatBushels, formatBasis, formatNumber } from '../../utils/formatters';
import { getCommodityColor } from '../../utils/commodityColors';

export function PriceLaterExposure() {
  const {
    summaries,
    alerts,
    totalDailyCarry,
    totalPerPennyRisk,
    totalBasisBushels,
    totalHTABushels,
    hasMarketData,
  } = usePriceLaterExposure();

  if (!hasMarketData) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">Enter Market Data First</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Go to Daily Inputs to enter current futures settlements and sell basis levels.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Price-Later & Deferred Pricing Exposure</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Basis Unpriced" value={formatBushels(totalBasisBushels)} />
        <StatCard label="HTA Unpriced" value={formatBushels(totalHTABushels)} />
        <StatCard
          label="Daily Carry Cost"
          value={formatCurrency(Math.abs(totalDailyCarry))}
          delta={totalDailyCarry < 0 ? 'BENEFIT' : undefined}
          deltaDirection={totalDailyCarry < 0 ? 'up' : totalDailyCarry > 500 ? 'down' : undefined}
        />
        <StatCard
          label="$/Penny Basis Risk"
          value={formatCurrency(totalPerPennyRisk)}
          delta={`${formatNumber(totalHTABushels)} HTA bu`}
        />
        <StatCard
          label="Total Unpriced"
          value={formatBushels(totalBasisBushels + totalHTABushels)}
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

      {/* Summary Table */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Commodity Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                <th className="px-4 py-2">Commodity</th>
                <th className="px-4 py-2 text-right">Basis Bu</th>
                <th className="px-4 py-2 text-right">HTA Bu</th>
                <th className="px-4 py-2 text-right">Total Unpriced</th>
                <th className="px-4 py-2 text-right">Daily Carry $</th>
                <th className="px-4 py-2 text-right">$/Penny Basis</th>
                <th className="px-4 py-2 text-right">Overdue Bu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {summaries.map((s) => (
                <tr key={s.commodity} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-2 font-medium">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: getCommodityColor(s.commodity) }} />
                    {s.commodity}
                  </td>
                  <td className="px-4 py-2 text-right">{formatNumber(s.basisBushels)}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(s.htaBushels)}</td>
                  <td className="px-4 py-2 text-right font-medium">{formatNumber(s.totalUnpriced)}</td>
                  <td className={`px-4 py-2 text-right ${s.dailyCarryCost < 0 ? 'text-green-600 dark:text-green-400' : s.dailyCarryCost > 500 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {s.dailyCarryCost < 0 ? '(' : ''}{formatCurrency(Math.abs(s.dailyCarryCost))}{s.dailyCarryCost < 0 ? ')' : ''}
                    {s.carrySpread?.isInverted && <span className="ml-1 text-xs text-green-600 dark:text-green-400">INV</span>}
                  </td>
                  <td className="px-4 py-2 text-right">{formatCurrency(s.perPennyBasisRisk)}</td>
                  <td className={`px-4 py-2 text-right ${s.overdueBushels > 0 ? 'text-red-600 dark:text-red-400 font-medium' : ''}`}>
                    {s.overdueBushels > 0 ? formatNumber(s.overdueBushels) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-750 font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-4 py-2">Total</td>
                <td className="px-4 py-2 text-right">{formatNumber(totalBasisBushels)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(totalHTABushels)}</td>
                <td className="px-4 py-2 text-right">{formatNumber(totalBasisBushels + totalHTABushels)}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(Math.abs(totalDailyCarry))}</td>
                <td className="px-4 py-2 text-right">{formatCurrency(totalPerPennyRisk)}</td>
                <td className="px-4 py-2 text-right">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Per-commodity detail: Basis Contracts */}
      {summaries.map((s) => (
        <div key={s.commodity} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: getCommodityColor(s.commodity) }} />
            {s.commodity}
            {s.carrySpread && (
              <span className={`text-sm font-normal px-2 py-0.5 rounded ${s.carrySpread.isInverted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                {s.carrySpread.isInverted ? 'INVERTED' : 'CARRY'}: {s.carrySpread.nearbyMonth}→{s.carrySpread.deferredMonth} = {formatBasis(s.carrySpread.spread)}
              </span>
            )}
          </h3>

          {/* Basis Contracts */}
          {s.basisContracts.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Basis Contracts — Futures Unpriced ({s.basisContracts.length} contracts, {formatBushels(s.basisBushels)})
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <th className="px-3 py-2">Contract</th>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Futures Mo</th>
                      <th className="px-3 py-2 text-right">Locked Basis</th>
                      <th className="px-3 py-2 text-right">Unpriced Bu</th>
                      <th className="px-3 py-2 text-right">Cur. Futures</th>
                      <th className="px-3 py-2 text-right">Cash Value</th>
                      <th className="px-3 py-2 text-right">Daily Carry</th>
                      <th className="px-3 py-2 text-right">Days Left</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {s.basisContracts.map((bc) => (
                      <tr key={bc.contractNumber} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-1.5 font-mono">{bc.contractNumber}</td>
                        <td className="px-3 py-1.5 truncate max-w-[120px]">{bc.entity}</td>
                        <td className="px-3 py-1.5">{bc.futuresMonth}</td>
                        <td className="px-3 py-1.5 text-right">{formatBasis(bc.lockedBasis)}</td>
                        <td className="px-3 py-1.5 text-right">{formatNumber(bc.unpricedBushels)}</td>
                        <td className="px-3 py-1.5 text-right">{bc.currentFuturesPrice !== null ? formatCurrency(bc.currentFuturesPrice) : '—'}</td>
                        <td className="px-3 py-1.5 text-right">{bc.currentMarketCashValue !== null ? formatCurrency(bc.currentMarketCashValue) : '—'}</td>
                        <td className={`px-3 py-1.5 text-right ${bc.dailyCarryCost !== null && bc.dailyCarryCost < 0 ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {bc.dailyCarryCost !== null ? formatCurrency(Math.abs(bc.dailyCarryCost)) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right">{bc.daysUntilEnd}</td>
                        <td className="px-3 py-1.5">
                          {bc.isOverdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">OVERDUE</span>}
                          {bc.isUrgent && !bc.isOverdue && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium">URGENT</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* HTA Contracts */}
          {s.htaContracts.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
                <h4 className="text-sm font-medium text-purple-800 dark:text-purple-300">
                  HTA Contracts — Basis Unpriced ({s.htaContracts.length} contracts, {formatBushels(s.htaBushels)})
                  <span className="ml-2 text-xs font-normal">$/penny risk: {formatCurrency(s.perPennyBasisRisk)}</span>
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      <th className="px-3 py-2">Contract</th>
                      <th className="px-3 py-2">Entity</th>
                      <th className="px-3 py-2">Futures Mo</th>
                      <th className="px-3 py-2">Delivery Mo</th>
                      <th className="px-3 py-2 text-right">Locked Futures</th>
                      <th className="px-3 py-2 text-right">Unpriced Bu</th>
                      <th className="px-3 py-2 text-right">Cur. Sell Basis</th>
                      <th className="px-3 py-2 text-right">Expected Cash</th>
                      <th className="px-3 py-2 text-right">Days Left</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {s.htaContracts.map((hta) => (
                      <tr key={hta.contractNumber} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td className="px-3 py-1.5 font-mono">{hta.contractNumber}</td>
                        <td className="px-3 py-1.5 truncate max-w-[120px]">{hta.entity}</td>
                        <td className="px-3 py-1.5">{hta.futuresMonth}</td>
                        <td className="px-3 py-1.5">{hta.deliveryMonth}</td>
                        <td className="px-3 py-1.5 text-right">{formatCurrency(hta.lockedFutures)}</td>
                        <td className="px-3 py-1.5 text-right">{formatNumber(hta.unpricedBushels)}</td>
                        <td className="px-3 py-1.5 text-right">{hta.currentSellBasis !== null ? formatBasis(hta.currentSellBasis) : '—'}</td>
                        <td className="px-3 py-1.5 text-right">{hta.expectedCashPrice !== null ? formatCurrency(hta.expectedCashPrice) : '—'}</td>
                        <td className="px-3 py-1.5 text-right">{hta.daysUntilEnd}</td>
                        <td className="px-3 py-1.5">
                          {hta.isOverdue && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded text-xs font-medium">OVERDUE</span>}
                          {hta.isUrgent && !hta.isOverdue && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded text-xs font-medium">URGENT</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      ))}
    </div>
  );
}
