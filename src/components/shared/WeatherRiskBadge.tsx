import { useState, useRef, useEffect } from 'react';
import type { WeatherRisk, WeatherSeverity } from '../../types/weather';

interface WeatherRiskBadgeProps {
  risk: WeatherRisk | null;
  compact?: boolean;
}

const SEVERITY_STYLES: Record<WeatherSeverity, { bg: string; text: string; label: string }> = {
  extreme: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-400', label: 'Extreme' },
  high: { bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'High' },
  moderate: { bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Moderate' },
  low: { bg: 'bg-green-50 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', label: 'Low' },
};

const EVENT_LABELS: Record<string, string> = {
  drought: 'Drought', freeze: 'Freeze', 'excess-rain': 'Excess Rain',
  'heat-stress': 'Heat Stress', normal: 'Normal',
};

export function WeatherRiskBadge({ risk, compact }: WeatherRiskBadgeProps) {
  const [showPopover, setShowPopover] = useState(false);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPopover) return;
    const handler = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node) &&
          popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showPopover]);

  if (!risk || risk.severity === 'low') {
    if (compact) return <span className="text-xs text-gray-400 dark:text-gray-600">&mdash;</span>;
    return null;
  }

  const style = SEVERITY_STYLES[risk.severity];

  return (
    <span className="relative inline-block">
      <button
        ref={badgeRef}
        onMouseEnter={() => setShowPopover(true)}
        onMouseLeave={() => setShowPopover(false)}
        onFocus={() => setShowPopover(true)}
        onBlur={() => setShowPopover(false)}
        onClick={() => setShowPopover((p) => !p)}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold cursor-pointer transition-colors ${style.bg} ${style.text}`}
        aria-label={`${style.label} weather risk: ${risk.event} at ${risk.locationName}`}
        role="status"
      >
        {compact ? style.label.charAt(0) : style.label}
      </button>
      {showPopover && (
        <div ref={popoverRef} className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{EVENT_LABELS[risk.event] ?? risk.event}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{risk.locationName}</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">7-day precip</span><span className="font-mono text-gray-900 dark:text-gray-100">{risk.precipForecastMm.toFixed(1)} mm</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Min temp</span><span className="font-mono text-gray-900 dark:text-gray-100">{risk.tempMinC.toFixed(1)}&deg;C</span></div>
            <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Soil moisture</span><span className="font-mono text-gray-900 dark:text-gray-100">{risk.soilMoisture.toFixed(0)}%</span></div>
            {risk.daysOut <= 3 && (<div className="mt-1 text-red-600 dark:text-red-400 font-medium">{risk.daysOut === 0 ? 'Active now' : `In ${risk.daysOut} day${risk.daysOut > 1 ? 's' : ''}`}</div>)}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px"><div className="w-2 h-2 rotate-45 bg-white dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700" /></div>
        </div>
      )}
    </span>
  );
}
