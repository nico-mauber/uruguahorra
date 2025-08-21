/**
 * Analytics service que puede ser usado fuera de componentes React
 * Nota: Los métodos reales se ejecutarán cuando los componentes usen useAnalytics
 * Este es un placeholder que puede expandirse cuando se necesite tracking fuera de React
 */
class AnalyticsService {
  static track(event: string, properties?: Record<string, unknown>) {
    console.log(`[AnalyticsService] Event queued: ${event}`, properties);
    // En el futuro, podríamos almacenar esto y enviarlo cuando PostHog esté disponible
  }

  static identify(userId: string, traits?: Record<string, unknown>) {
    console.log(`[AnalyticsService] Identify queued: ${userId}`, traits);
  }

  static isFeatureEnabled(flagKey: string): boolean {
    console.log(`[AnalyticsService] Feature flag ${flagKey} check - defaulting to false`);
    return false;
  }

  static reset() {
    console.log('[AnalyticsService] Reset queued');
  }
}

// Helper functions for common event tracking
export const trackGoalEvent = (event: string, props?: Record<string, unknown>) => {
  AnalyticsService.track(event, props);
};

export const trackContributionEvent = (event: string, props?: Record<string, unknown>) => {
  AnalyticsService.track(event, props);
};

export { AnalyticsService };

// Re-export eventos y tipos del hook
export { AnalyticsEvents } from '@/hooks/useAnalytics';
export type {
  GoalEventProps,
  ContributionEventProps,
  ChallengeEventProps,
  SubscriptionEventProps,
  ErrorEventProps,
} from '@/hooks/useAnalytics';
