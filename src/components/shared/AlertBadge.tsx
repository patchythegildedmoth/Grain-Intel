import type { AlertLevel } from '../../utils/alerts';

const STYLES: Record<AlertLevel, string> = {
  critical: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
  warning: 'bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  info: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  ok: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800',
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
