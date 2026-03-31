/**
 * SectionNav — secondary horizontal module row.
 *
 * For Positions / Market / Tools: shows module links with alert badges + unvisited dots.
 * For Market Factors: shows the 4 internal hub tabs instead of module links.
 */

import { useRef, useEffect } from 'react';
import { NAV_ITEMS } from './Sidebar';
import { useGlobalAlerts } from '../../hooks/useGlobalAlerts';
import { MODULE_ICONS, MARKET_FACTORS_TAB_ICONS } from './SidebarIcons';
import type { ModuleId } from './Sidebar';

export type NavGroup = 'positions' | 'market' | 'market-factors' | 'tools';
export type MarketFactorsTab = 'this-week' | 'weather' | 'seasonal' | 'crop-progress';

// Module IDs that belong to each standard group
const GROUP_MODULE_IDS: Record<Exclude<NavGroup, 'market-factors'>, ModuleId[]> = {
  positions: ['morning-brief', 'net-position', 'unpriced-exposure', 'delivery-timeline', 'basis-spread', 'customer-concentration', 'risk-profile'],
  market: ['daily-inputs', 'price-later', 'mark-to-market', 'freight-efficiency'],
  tools: ['entity-map', 'scenario', 'data-health'],
};

const MARKET_FACTORS_TABS: { id: MarketFactorsTab; label: string }[] = [
  { id: 'this-week', label: 'This Week' },
  { id: 'weather', label: 'Weather' },
  { id: 'seasonal', label: 'Seasonal' },
  { id: 'crop-progress', label: 'Crop Progress' },
];

interface SectionNavProps {
  activeGroup: NavGroup;
  activeModule: string;
  onModuleChange: (id: string) => void;
  // Market Factors sub-tab state (only used when activeGroup === 'market-factors')
  activeMarketFactorsTab: MarketFactorsTab;
  onMarketFactorsTabChange: (tab: MarketFactorsTab) => void;
}

export function SectionNav({
  activeGroup,
  activeModule,
  onModuleChange,
  activeMarketFactorsTab,
  onMarketFactorsTabChange,
}: SectionNavProps) {
  const { byModule } = useGlobalAlerts();
  const visitedRef = useRef<Set<string>>(new Set(['morning-brief']));

  // Track visited modules in useEffect (not during render — avoids React 19 concurrent mode issues)
  useEffect(() => {
    if (activeModule) visitedRef.current.add(activeModule);
  }, [activeModule]);

  // Market Factors: render internal hub tabs
  if (activeGroup === 'market-factors') {
    return (
      <nav
        role="tablist"
        aria-label="Market Factors tabs"
        className="flex items-center gap-0.5 px-3 bg-[var(--bg-surface)] border-b border-[var(--border-default)] overflow-x-auto no-print shrink-0"
      >
        {MARKET_FACTORS_TABS.map((tab) => {
          const isActive = activeMarketFactorsTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onMarketFactorsTabChange(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
                border-b-2 -mb-px
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                ${isActive
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
                }
              `}
            >
              <span className="text-sm leading-none">{MARKET_FACTORS_TAB_ICONS[tab.id] ? MARKET_FACTORS_TAB_ICONS[tab.id]() : null}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // Positions / Market / Tools: render module links
  const moduleIds = GROUP_MODULE_IDS[activeGroup as Exclude<NavGroup, 'market-factors'>] ?? [];
  const navItems = moduleIds
    .map((id) => NAV_ITEMS.find((n) => n.id === id))
    .filter(Boolean) as typeof NAV_ITEMS[number][];

  return (
    <nav
      aria-label={`${activeGroup} modules`}
      className="flex items-center gap-0.5 px-3 bg-[var(--bg-surface)] border-b border-[var(--border-default)] overflow-x-auto no-print shrink-0"
    >
      {navItems.map((item) => {
        const isActive = activeModule === item.id;
        const isUnvisited = !visitedRef.current.has(item.id) && !isActive;
        const alerts = byModule.get(item.id as ModuleId);
        const hasCritical = alerts?.some((a) => a.level === 'critical');
        const alertCount = alerts?.length ?? 0;

        return (
          <button
            key={item.id}
            onClick={() => onModuleChange(item.id)}
            className={`
              relative flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap
              border-b-2 -mb-px
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
              ${isActive
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
              }
            `}
          >
            {/* Unvisited blue dot on icon */}
            <span className="relative text-sm leading-none">
              {MODULE_ICONS[item.id] ? MODULE_ICONS[item.id]() : item.icon}
              {isUnvisited && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
              )}
            </span>

            <span>{item.label}</span>

            {/* Alert badge */}
            {alertCount > 0 && (
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                hasCritical
                  ? 'bg-red-600/10 text-[var(--negative)]'
                  : 'bg-amber-500/10 text-[var(--warning)]'
              }`}>
                {alertCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
