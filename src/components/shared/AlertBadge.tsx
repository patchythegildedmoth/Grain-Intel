import type { AlertLevel } from '../../utils/alerts';

const STYLES: Record<AlertLevel, string> = {
  critical: 'bg-red-600/10 text-[var(--negative)] dark:text-[var(--negative)] border-red-600/20 dark:border-red-800',
  warning: 'bg-amber-500/10 text-[var(--warning)] dark:text-[var(--warning)] border-amber-500/20 dark:border-amber-500/20',
  info: 'bg-blue-600/10 text-[var(--accent)] border-blue-600/20 dark:border-blue-600/20',
  ok: 'bg-green-600/10 text-[var(--positive)] dark:text-[var(--positive)] border-green-600/20 dark:border-green-600/20',
};

interface AlertBadgeProps {
  level: AlertLevel;
  children: React.ReactNode;
}

export function AlertBadge({ level, children }: AlertBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STYLES[level]}`}>
      {children}
    </span>
  );
}
