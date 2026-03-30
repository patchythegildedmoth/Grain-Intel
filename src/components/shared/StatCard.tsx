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
      className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 ${colorClass ?? ''} hover:-translate-y-px hover:shadow-md transition-all duration-150`}
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
    </div>
  );
}
