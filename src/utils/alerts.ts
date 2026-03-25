export type AlertLevel = 'critical' | 'warning' | 'info' | 'ok';

export interface Alert {
  level: AlertLevel;
  message: string;
  module: string;
}

export const THRESHOLDS = {
  // Module 1: Net Position
  positionSwingBushels: 50_000,
  concentrationPercent: 0.40,

  // Module 2: Unpriced Exposure
  unpricedOverdueDays: 0,
  unpricedUrgentDays: 14,
  unpricedEntityBushels: 50_000,
  unpricedCommodityBushels: 100_000,

  // Module 3: Delivery Timeline
  outboundExceedsInboundPercent: 0.20,
  monthlyCapacityBushels: 500_000,
  entityMonthConcentrationPercent: 0.30,

  // Module 4: Basis Spread
  spreadCompressionPercent: 0.20,

  // Module 5: Customer Concentration
  customerConcentrationPercent: 0.25,

  // Module 2: Net Exposure
  netExposureCommodityBushels: 75_000,

  // Module 6: Risk Profile
  unpricedRatioThreshold: 0.30,

  // Module 9: Freight Efficiency
  freightPercentCritical: 0.50,
  freightPercentWarning: 0.30,
  freightExpensiveTierThreshold: 0.60,
  freightCostTrendDelta: 0.05,
  freightNegativeMarginContracts: 5,
} as const;
