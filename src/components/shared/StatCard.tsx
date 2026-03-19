interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  colorClass?: string;
}

export function StatCard({ label, value, delta, deltaDirection, colorClass }: StatCardProps) {
  const deltaColor = deltaDirection === 'up'
    ? 'text-green-600 dark:text-green-400'
    : deltaDirection === 'down'
    ? 'text-red-600 dark:text-red-400'
    : 'text-gray-500 dark:text-gray-400';

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 ${colorClass ?? ''}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
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
