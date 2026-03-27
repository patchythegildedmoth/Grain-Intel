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
    main: 'Analytics',
    market: 'Market Data',
    tools: 'Tools',
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 no-print" aria-label="Breadcrumb">
      <button
        onClick={() => onNavigate('morning-brief')}
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        Home
      </button>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <span>{groupLabels[moduleInfo.group] ?? moduleInfo.group}</span>
      <span className="text-gray-300 dark:text-gray-600">/</span>
      <span className="text-gray-700 dark:text-gray-200 font-medium">
        {moduleInfo.icon} {moduleInfo.label}
      </span>
      {activeTab && (
        <>
          <span className="text-gray-300 dark:text-gray-600">/</span>
          <span className="text-gray-700 dark:text-gray-200 font-medium capitalize">
            {activeTab.replace(/-/g, ' ')}
          </span>
        </>
      )}
    </nav>
  );
}
