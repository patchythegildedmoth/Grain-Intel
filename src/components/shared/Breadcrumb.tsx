import { NAV_ITEMS } from '../layout/Sidebar';

interface BreadcrumbProps {
  activeModule: string;
  activeTab?: string;
  onNavigate: (moduleId: string) => void;
}

export function Breadcrumb({ activeModule, activeTab, onNavigate }: BreadcrumbProps) {
  const moduleInfo = NAV_ITEMS.find((n) => n.id === activeModule);
  if (!moduleInfo) return null;

  const groupLabels: Record<string, string> = {
    positions: 'Positions',
    market: 'Market',
    'market-factors': 'Market Factors',
    tools: 'Tools',
    // legacy aliases
    main: 'Analytics',
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] no-print" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate('morning-brief')}
        className="hover:text-[var(--accent)] dark:hover:text-blue-400 transition-colors"
      >
        Home
      </button>
      <span className="text-[var(--text-muted)] dark:text-[var(--text-secondary)]">/</span>
      <span>{groupLabels[moduleInfo.group] ?? moduleInfo.group}</span>
      <span className="text-[var(--text-muted)] dark:text-[var(--text-secondary)]">/</span>
      <span className="text-[var(--text-secondary)] font-medium">
        {moduleInfo.icon} {moduleInfo.label}
      </span>
      {activeTab && (
        <>
          <span className="text-[var(--text-muted)] dark:text-[var(--text-secondary)]">/</span>
          <span className="text-[var(--text-secondary)] font-medium capitalize">
            {activeTab.replace(/-/g, ' ')}
          </span>
        </>
      )}
    </nav>
  );
}
