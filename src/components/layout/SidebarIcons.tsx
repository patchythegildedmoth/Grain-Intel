/**
 * SVG sidebar icons — replaces emoji for a cleaner, more professional look.
 * Each icon is 16x16 (text-base equivalent) with currentColor stroke/fill.
 */

const S = 16; // icon size
const sw = 1.5; // stroke width

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={S} height={S} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}

// Morning Brief — clipboard/document
export function IconBrief() {
  return <Icon><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></Icon>;
}

// Net Position — bar chart
export function IconBarChart() {
  return <Icon><rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" /></Icon>;
}

// Unpriced Exposure — alert triangle
export function IconAlert() {
  return <Icon><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>;
}

// Delivery Timeline — truck
export function IconTruck() {
  return <Icon><rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" fill="currentColor" stroke="none" /><circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" stroke="none" /></Icon>;
}

// Basis Spread — trending up
export function IconTrending() {
  return <Icon><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></Icon>;
}

// Customers — users
export function IconUsers() {
  return <Icon><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></Icon>;
}

// Risk Profile — shield
export function IconShield() {
  return <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon>;
}

// Daily Inputs — edit/pencil
export function IconEdit() {
  return <Icon><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Icon>;
}

// Price-Later — clock
export function IconClock() {
  return <Icon><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Icon>;
}

// Mark-to-Market — dollar sign
export function IconDollar() {
  return <Icon><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Icon>;
}

// Freight Efficiency — package/box
export function IconPackage() {
  return <Icon><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Icon>;
}

// Weather — cloud sun
export function IconWeather() {
  return <Icon><path d="M12 2v2" /><path d="M4.93 4.93l1.41 1.41" /><path d="M20 12h2" /><path d="M17.66 17.66l1.41 1.41" /><path d="M2 12h2" /><path d="M6.34 17.66l-1.41 1.41" /><path d="M19.07 4.93l-1.41 1.41" /><circle cx="12" cy="12" r="4" /></Icon>;
}

// Entity Map — map pin
export function IconMapPin() {
  return <Icon><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></Icon>;
}

// Scenario — sliders
export function IconSliders() {
  return <Icon><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></Icon>;
}

// Data Health — search/inspect
export function IconSearch() {
  return <Icon><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
}

/** Map module IDs to icon components */
export const MODULE_ICONS: Record<string, () => React.ReactNode> = {
  'morning-brief': IconBrief,
  'net-position': IconBarChart,
  'unpriced-exposure': IconAlert,
  'delivery-timeline': IconTruck,
  'basis-spread': IconTrending,
  'customer-concentration': IconUsers,
  'risk-profile': IconShield,
  'daily-inputs': IconEdit,
  'price-later': IconClock,
  'mark-to-market': IconDollar,
  'freight-efficiency': IconPackage,
  'weather': IconWeather,
  'entity-map': IconMapPin,
  'scenario': IconSliders,
  'data-health': IconSearch,
};
