// Main exports for the analytics module
export { AnalyticsAggregatorService } from './AnalyticsAggregatorService';
export { SpendingPatternsService } from './SpendingPatternsService';
export { MonthlyInsightsService } from './MonthlyInsightsService';
export { PsychologicalInsightsService } from './PsychologicalInsightsService';
export { ForecastService } from './ForecastService';
export { CacheService, memoize, memoizeFunction } from './CacheService';

// Type exports
export type {
  SpendingPattern,
  MonthlyInsight,
  PsychologicalInsight,
  PsychologicalInsightType,
  SpendingForecast,
  BasicRatios,
  CompleteAnalytics,
  UserDataValidation,
  AnalyticsMetadata,
} from './types';

// Configuration exports
export {
  ALL_INSIGHTS_CONFIG,
  HEALTH_INSIGHTS,
  EFFICIENCY_INSIGHTS,
  PSYCHOLOGICAL_INSIGHTS,
  MOTIVATION_INSIGHTS,
  LEGACY_INSIGHTS,
  CATEGORY_WEIGHTS,
  getTimeBasedBoost,
} from './insights-config';

export type { InsightConfig, InsightAnalysisData } from './insights-config';
