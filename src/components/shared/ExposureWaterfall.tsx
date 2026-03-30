/**
 * Exposure waterfall chart: Gross → In-Transit → HTA-Paired → True Open
 * Mixpanel-style funnel showing how exposure decomposes.
 */

import { formatBushelsShort } from '../../utils/formatters';

interface WaterfallStep {
  label: string;
  value: number;
  color: string;
}

interface ExposureWaterfallProps {
  grossExposure: number;
  inTransit: number;
  htaPaired: number;
}

export function ExposureWaterfall({ grossExposure, inTransit, htaPaired }: ExposureWaterfallProps) {
  if (grossExposure === 0) return null;

  const openExposure = grossExposure - inTransit - htaPaired;

  const steps: WaterfallStep[] = [
    { label: 'Gross Exposure', value: grossExposure, color: 'var(--text-secondary)' },
    { label: 'Less: In-Transit', value: -inTransit, color: 'var(--positive)' },
    { label: 'Less: HTA-Paired', value: -htaPaired, color: 'var(--positive)' },
    { label: 'True Open', value: openExposure, color: openExposure > 75_000 ? 'var(--negative)' : 'var(--warning)' },
  ];

  const maxVal = Math.max(grossExposure, 1);

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const barWidth = Math.abs(step.value) / maxVal * 100;
        const isDeduction = step.value < 0;
        const isResult = i === steps.length - 1;

        return (
          <div key={step.label} className="flex items-center gap-3">
            <span className={`text-xs w-28 text-right shrink-0 ${isResult ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
              {step.label}
            </span>
            <div className="flex-1 relative h-6">
              {isDeduction ? (
                // Deduction bars show offset from previous cumulative
                <div className="h-full flex items-center">
                  <div
                    className="h-4 rounded-r opacity-60"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: step.color,
                      marginLeft: `${((maxVal - Math.abs(step.value)) / maxVal) * 100 * 0}%`,
                    }}
                  />
                </div>
              ) : (
                <div className="h-full flex items-center">
                  <div
                    className={`h-5 rounded ${isResult ? 'rounded-r' : 'rounded-r'}`}
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: step.color,
                      opacity: isResult ? 0.9 : 0.3,
                    }}
                  />
                </div>
              )}
            </div>
            <span className={`text-xs font-data w-20 text-right shrink-0 ${isResult ? 'font-semibold' : ''}`} style={{ color: step.color }}>
              {isDeduction ? '-' : ''}{formatBushelsShort(Math.abs(step.value))}
            </span>
          </div>
        );
      })}
    </div>
  );
}
