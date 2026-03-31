/**
 * Sidebar — exports NAV_ITEMS for CommandPalette, Cmd+1-9 shortcuts, and Breadcrumb.
 * The sidebar rendering has been replaced by TopNavBar + SectionNav in AppShell.
 * This file is kept for its exports only.
 */

export const NAV_ITEMS = [
  { id: 'morning-brief', label: 'Morning Brief', icon: '📋', group: 'positions' },
  { id: 'net-position', label: '1. Net Position', icon: '📊', group: 'positions' },
  { id: 'unpriced-exposure', label: '2. Unpriced Exposure', icon: '⚠️', group: 'positions' },
  { id: 'delivery-timeline', label: '3. Delivery Timeline', icon: '🚛', group: 'positions' },
  { id: 'basis-spread', label: '4. Basis Spread', icon: '📈', group: 'positions' },
  { id: 'customer-concentration', label: '5. Customers', icon: '👥', group: 'positions' },
  { id: 'risk-profile', label: '6. Risk Profile', icon: '🛡️', group: 'positions' },
  { id: 'daily-inputs', label: 'Daily Inputs', icon: '✏️', group: 'market' },
  { id: 'price-later', label: '7. Price-Later', icon: '⏳', group: 'market' },
  { id: 'mark-to-market', label: '8. Mark-to-Market', icon: '💰', group: 'market' },
  { id: 'freight-efficiency', label: '9. Freight Efficiency', icon: '🚚', group: 'market' },
  { id: 'weather', label: 'Weather', icon: '🌦️', group: 'market-factors' },
  { id: 'entity-map', label: 'Entity Map', icon: '📍', group: 'tools' },
  { id: 'scenario', label: 'What-If Scenario', icon: '🔮', group: 'tools' },
  { id: 'data-health', label: 'Data Health', icon: '🔍', group: 'tools' },
] as const;

export type ModuleId = (typeof NAV_ITEMS)[number]['id'];
