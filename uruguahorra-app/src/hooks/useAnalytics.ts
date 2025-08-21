import { usePostHog } from 'posthog-react-native';

/**
 * Hook for analytics tracking using PostHog
 * This replaces the singleton pattern with a hook-based approach
 */
export const useAnalytics = () => {
  const posthog = usePostHog();

  const track = (event: string, properties?: Record<string, unknown>) => {
    try {
      const finalProps = {
        ...properties,
        timestamp: new Date().toISOString(),
      };

      posthog?.capture(event, finalProps);
      console.log(`[Analytics] Event tracked: ${event}`, finalProps);
    } catch (error) {
      console.error(`[Analytics] Error tracking event ${event}:`, error);
    }
  };

  const identify = (userId: string, traits?: Record<string, unknown>) => {
    try {
      posthog?.identify(userId, traits);
      console.log(`[Analytics] User identified: ${userId}`, traits);
    } catch (error) {
      console.error(`[Analytics] Error identifying user ${userId}:`, error);
    }
  };

  const isFeatureEnabled = (flagKey: string): boolean => {
    try {
      return posthog?.isFeatureEnabled(flagKey) || false;
    } catch (error) {
      console.error(
        `[Analytics] Error checking feature flag ${flagKey}:`,
        error
      );
      return false;
    }
  };

  const setContext = (context: Record<string, unknown>) => {
    try {
      posthog?.group('company', 'uruguahorra', context as any);
      console.log('[Analytics] Context set:', context);
    } catch (error) {
      console.error('[Analytics] Error setting context:', error);
    }
  };

  const reset = () => {
    try {
      posthog?.reset();
      console.log('[Analytics] Analytics reset');
    } catch (error) {
      console.error('[Analytics] Error resetting analytics:', error);
    }
  };

  return {
    track,
    identify,
    isFeatureEnabled,
    setContext,
    reset,
  };
};

// Event names constants
export const AnalyticsEvents = {
  // App lifecycle
  APP_OPENED: 'app_opened',
  APP_BACKGROUNDED: 'app_backgrounded',

  // Goals
  GOAL_CREATED: 'goal_created',
  GOAL_UPDATED: 'goal_updated',
  GOAL_COMPLETED: 'goal_completed',
  GOAL_DELETED: 'goal_deleted',

  // Contributions
  MICRO_CONTRIBUTION: 'micro_contribution',
  CONTRIBUTION_CREATED: 'contribution_created',

  // Challenges
  CHALLENGE_STARTED: 'challenge_started',
  CHALLENGE_COMPLETED: 'challenge_completed',
  CHALLENGE_FAILED: 'challenge_failed',

  // Subscription & Billing
  PAYWALL_VIEWED: 'paywall_viewed',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  SUBSCRIPTION_ACTIVE: 'subscription_active',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Authentication
  USER_SIGNED_UP: 'user_signed_up',
  USER_SIGNED_IN: 'user_signed_in',
  USER_SIGNED_OUT: 'user_signed_out',

  // Gamification
  LEVEL_UP: 'level_up',
  XP_EARNED: 'xp_earned',
  STREAK_UPDATED: 'streak_updated',

  // Error tracking
  ERROR_OCCURRED: 'error_occurred',
} as const;

// Common event properties interfaces
export interface GoalEventProps {
  goal_id: string;
  goal_type?: string;
  target_amount?: number;
  current_amount?: number;
  category?: string;
  [key: string]: unknown;
}

export interface ContributionEventProps {
  contribution_id: string;
  goal_id: string;
  amount: number;
  method?: string;
  [key: string]: unknown;
}

export interface ChallengeEventProps {
  challenge_id: string;
  challenge_type: string;
  difficulty?: string;
  reward_xp?: number;
  [key: string]: unknown;
}

export interface SubscriptionEventProps {
  plan_id: string;
  plan_type: 'premium_monthly' | 'premium_yearly';
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  source?: string;
  coupon?: string;
  [key: string]: unknown;
}

export interface ErrorEventProps {
  error_message: string;
  error_code?: string;
  error_stack?: string;
  user_action?: string;
  screen?: string;
  [key: string]: unknown;
}
