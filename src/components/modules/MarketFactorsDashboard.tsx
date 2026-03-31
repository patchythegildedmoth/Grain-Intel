/**
 * MarketFactorsDashboard — hub container for Market Factors group.
 * Tabs: This Week (default) · Weather · Seasonal Patterns · Crop Progress
 *
 * Tab state is controlled externally (App.tsx ↔ SectionNav ↔ here) so SectionNav
 * always reflects the active sub-tab correctly.
 */

import { lazy, Suspense } from 'react';
import type { MarketFactorsTab } from '../layout/SectionNav';
import { WeatherDashboard } from './WeatherDashboard';

// Lazy-load heavier tabs to keep initial bundle small
const SeasonalPatternsTab = lazy(() =>
  import('./SeasonalPatternsTab').then((m) => ({ default: m.SeasonalPatternsTab })),
);
const CropProgressTab = lazy(() =>
  import('./CropProgressTab').then((m) => ({ default: m.CropProgressTab })),
);
const ThisWeekTab = lazy(() =>
  import('./ThisWeekTab').then((m) => ({ default: m.ThisWeekTab })),
);

function TabLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent)] rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );
}

interface MarketFactorsDashboardProps {
  activeTab: MarketFactorsTab;
  onTabChange: (tab: MarketFactorsTab) => void;
  onNavigate: (moduleId: string) => void;
}

export function MarketFactorsDashboard({ activeTab, onTabChange, onNavigate }: MarketFactorsDashboardProps) {
  return (
    <div className="flex flex-col h-full">
      {activeTab === 'this-week' && (
        <Suspense fallback={<TabLoadingSpinner />}>
          <ThisWeekTab onTabChange={onTabChange} />
        </Suspense>
      )}

      {activeTab === 'weather' && (
        // WeatherDashboard is already loaded — no lazy wrapper needed
        <WeatherDashboard onNavigate={onNavigate} />
      )}

      {activeTab === 'seasonal' && (
        <Suspense fallback={<TabLoadingSpinner />}>
          <SeasonalPatternsTab />
        </Suspense>
      )}

      {activeTab === 'crop-progress' && (
        <Suspense fallback={<TabLoadingSpinner />}>
          <CropProgressTab />
        </Suspense>
      )}
    </div>
  );
}
