export const COMMODITY_COLORS: Record<string, string> = {
  'Corn': '#EAB308',
  'Soybeans': '#22C55E',
  'Wheat': '#F59E0B',
  'Barley': '#3B82F6',
  'Milo': '#A855F7',
  'Oats': '#14B8A6',
  'Soybean Meal': '#EC4899',
  'Cottonseed': '#F97316',
  'Commodity Other': '#6B7280',
};

export function getCommodityColor(commodity: string): string {
  return COMMODITY_COLORS[commodity] ?? '#6B7280';
}

// Ordered by typical trading volume at Ag Source
export const COMMODITY_ORDER = [
  'Corn',
  'Soybeans',
  'Wheat',
  'Barley',
  'Milo',
  'Oats',
  'Soybean Meal',
  'Cottonseed',
  'Commodity Other',
];

export function sortByCommodityOrder(a: string, b: string): number {
  const ai = COMMODITY_ORDER.indexOf(a);
  const bi = COMMODITY_ORDER.indexOf(b);
  return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
}
