interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

export function StatCard({ label, value, delta, deltaDirection, colorClass }: StatCardProps) {
  const deltaColor = deltaDirection === 'up'
    ? 'text-[var(--positive)]'
    : deltaDirection === 'down'
    ? 'text-[var(--negative)]'
    : 'text-[var(--text-muted)]';

  return (
    <div className={`rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 ${colorClass ?? ''}`}>
      <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
        {value}
      </p>
      {delta && (
        <p className={`mt-1 text-sm font-medium ${deltaColor}`}>
          {deltaDirection === 'up' && '↑ '}
          {deltaDirection === 'down' && '↓ '}
          {delta}
        </p>
      )}
    </div>
  );
}
// test marker
