import { AnimatedNumber } from './AnimatedNumber';

interface StatCardProps {
  label: string;
  /** Static display string — used when numericValue is not provided */
  value: string;
  /** When provided, the value animates via count-up on mount/change */
  numericValue?: number;
  /** Formatter for numericValue animation. Required when numericValue is set. */
  formatValue?: (n: number) => string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  colorClass?: string;
  /** 'hero' renders the value at text-3xl for the lead KPI on each screen */
  size?: 'default' | 'hero';
  /** Optional sparkline data points (rendered as 24px SVG path) */
  sparkline?: number[];
}

export function StatCard({
  label,
  value,
  numericValue,
  formatValue,
  delta,
  deltaDirection,
  colorClass,
  size = 'default',
  sparkline,
}: StatCardProps) {
  const deltaColor =
    deltaDirection === 'up'
      ? 'text-[var(--positive)]'
      : deltaDirection === 'down'
        ? 'text-[var(--negative)]'
        : 'text-[var(--text-muted)]';

  const valueSize = size === 'hero' ? 'text-3xl' : 'text-2xl';

  return (
    <div
      className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 ${colorClass ?? ''} hover:-translate-y-px hover:shadow-md transition-[transform,box-shadow,border-color] duration-150`}
    >
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </p>

      <p className={`mt-1 font-bold font-data text-[var(--text-primary)] ${valueSize}`}>
        {numericValue !== undefined && formatValue ? (
          <AnimatedNumber value={numericValue} format={formatValue} />
        ) : (
          value
        )}
      </p>

      {delta && (
        <p className={`mt-1 text-sm font-medium animate-delta-in ${deltaColor}`}>
          {deltaDirection === 'up' && '↑ '}
          {deltaDirection === 'down' && '↓ '}
          {delta}
        </p>
      )}

      {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} />}
    </div>
  );
}

/** Tiny 24px-tall SVG sparkline. Green if trending up, red if down. */
function Sparkline({ data }: { data: number[] }) {
  const height = 24;
  const width = 80;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2; // 2px padding
    return `${x},${y}`;
  });

  const trending = data[data.length - 1] >= data[0];
  const color = trending ? 'var(--positive)' : 'var(--negative)';

  return (
    <svg
      width={width}
      height={height}
      className="mt-1.5 opacity-60"
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
