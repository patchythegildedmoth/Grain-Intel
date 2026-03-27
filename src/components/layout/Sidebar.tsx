import { useState } from 'react';

export const NAV_ITEMS = [
  { id: 'morning-brief', label: 'Morning Brief', icon: '📋', group: 'main' },
  { id: 'net-position', label: '1. Net Position', icon: '📊', group: 'main' },
  { id: 'unpriced-exposure', label: '2. Unpriced Exposure', icon: '⚠️', group: 'main' },
  { id: 'delivery-timeline', label: '3. Delivery Timeline', icon: '🚛', group: 'main' },
  { id: 'basis-spread', label: '4. Basis Spread', icon: '📈', group: 'main' },
  { id: 'customer-concentration', label: '5. Customers', icon: '👥', group: 'main' },
  { id: 'risk-profile', label: '6. Risk Profile', icon: '🛡️', group: 'main' },
  { id: 'daily-inputs', label: 'Daily Inputs', icon: '✏️', group: 'market' },
  { id: 'price-later', label: '7. Price-Later', icon: '⏳', group: 'market' },
  { id: 'mark-to-market', label: '8. Mark-to-Market', icon: '💰', group: 'market' },
  { id: 'freight-efficiency', label: '9. Freight Efficiency', icon: '🚚', group: 'market' },
  { id: 'scenario', label: 'What-If Scenario', icon: '🔮', group: 'tools' },
  { id: 'data-health', label: 'Data Health', icon: '🔍', group: 'tools' },
] as const;

export type ModuleId = (typeof NAV_ITEMS)[number]['id'];

interface SidebarProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
}

export function Sidebar({ activeModule, onModuleChange }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  let lastGroup = '';

  const navContent = (collapsed: boolean) => (
    <nav className={collapsed ? 'p-2 space-y-1' : 'p-3 space-y-1'}>
      {NAV_ITEMS.map((item) => {
        const showDivider = lastGroup !== '' && item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <div key={item.id}>
            {showDivider && (
              <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
            )}
            <button
              onClick={() => { onModuleChange(item.id); setMobileOpen(false); }}
              title={collapsed ? item.label : undefined}
              className={`w-full text-left rounded-lg text-sm font-medium transition-colors flex items-center
                ${collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5 gap-2.5'}
                ${activeModule === item.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
            >
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          </div>
        );
      })}
    </nav>
  );

  // Reset lastGroup for each render of navContent
  const renderNav = (collapsed: boolean) => {
    lastGroup = '';
    return navContent(collapsed);
  };

  return (
    <>
      {/* Mobile hamburger button — visible below md */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center text-xl no-print"
        aria-label="Toggle navigation"
      >
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile slide-out drawer — below md */}
      <aside
        className={`md:hidden fixed left-0 top-14 bottom-0 z-40 w-56 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform no-print
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {renderNav(false)}
      </aside>

      {/* Tablet icon rail — md to lg */}
      <aside className="hidden md:block lg:hidden w-14 shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto no-print">
        {renderNav(true)}
      </aside>

      {/* Desktop full sidebar — lg and up */}
      <aside className="hidden lg:block w-56 shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-y-auto no-print">
        {renderNav(false)}
      </aside>
    </>
  );
}
