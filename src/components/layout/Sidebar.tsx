const NAV_ITEMS = [
  { id: 'morning-brief', label: 'Morning Brief', icon: '📋' },
  { id: 'net-position', label: '1. Net Position', icon: '📊' },
  { id: 'unpriced-exposure', label: '2. Unpriced Exposure', icon: '⚠️' },
  { id: 'delivery-timeline', label: '3. Delivery Timeline', icon: '🚛' },
  { id: 'basis-spread', label: '4. Basis Spread', icon: '📈' },
  { id: 'customer-concentration', label: '5. Customers', icon: '👥' },
  { id: 'risk-profile', label: '6. Risk Profile', icon: '🛡️' },
  { id: 'scenario', label: 'What-If Scenario', icon: '🔮' },
  { id: 'data-health', label: 'Data Health', icon: '🔍' },
] as const;

export type ModuleId = (typeof NAV_ITEMS)[number]['id'];

interface SidebarProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  return (
    <aside className="w-56 shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto no-print">
      <nav className="p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2.5
              ${activeModule === item.id
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
