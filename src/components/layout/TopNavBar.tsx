/**
 * TopNavBar — horizontal 4-group tab bar.
 * Replaces the vertical sidebar as the primary navigation layer.
 */

import { useGlobalAlerts } from '../../hooks/useGlobalAlerts';
import type { ModuleId } from './Sidebar';
import type { NavGroup } from './SectionNav';

const GROUPS: { id: NavGroup; label: string; icon: string }[] = [
  { id: 'positions', label: 'Positions', icon: '📋' },
  { id: 'market', label: 'Market', icon: '💰' },
  { id: 'market-factors', label: 'Market Factors', icon: '🌦️' },
  { id: 'tools', label: 'Tools', icon: '🔧' },
];

// Module IDs per group — for alert rollup dot
const GROUP_MODULES: Record<NavGroup, string[]> = {
  positions: ['morning-brief', 'net-position', 'unpriced-exposure', 'delivery-timeline', 'basis-spread', 'customer-concentration', 'risk-profile'],
  market: ['daily-inputs', 'price-later', 'mark-to-market', 'freight-efficiency'],
  'market-factors': ['weather', 'market-factors'],
  tools: ['entity-map', 'scenario', 'data-health'],
};

interface TopNavBarProps {
  activeGroup: NavGroup;
  onGroupChange: (group: NavGroup) => void;
}

export function TopNavBar({ activeGroup, onGroupChange }: TopNavBarProps) {
  const { byModule } = useGlobalAlerts();

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onGroupChange(GROUPS[(index + 1) % GROUPS.length].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onGroupChange(GROUPS[(index - 1 + GROUPS.length) % GROUPS.length].id);
    }
  };

  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      className="flex items-center gap-0.5 px-3 bg-[var(--bg-surface)] border-b border-[var(--border-default)] overflow-x-auto no-print shrink-0"
    >
      {GROUPS.map((group, index) => {
        const isActive = activeGroup === group.id;
        const modules = GROUP_MODULES[group.id];

        // Alert rollup: red dot if any critical, amber if any warning
        const hasCritical = modules.some((m) => {
          const alerts = byModule.get(m as ModuleId);
          return alerts?.some((a) => a.level === 'critical');
        });
        const hasWarning = !hasCritical && modules.some((m) => {
          const alerts = byModule.get(m as ModuleId);
          return alerts?.some((a) => a.level === 'warning');
        });

        return (
          <button
            key={group.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onGroupChange(group.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`
              relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap
              border-b-2 -mb-px
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1
              ${isActive
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)]'
              }
            `}
          >
            <span className="text-base leading-none">{group.icon}</span>
            <span>{group.label}</span>

            {/* Alert rollup dot */}
            {(hasCritical || hasWarning) && (
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                aria-label={hasCritical ? 'Critical alerts' : 'Warnings'}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
