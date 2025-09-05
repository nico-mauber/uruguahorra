import Constants from 'expo-constants';
import { usePostHog } from 'posthog-react-native';
import PostHog from 'posthog-react-native';

// Common properties that will be merged with all events
interface CommonProps {
  country?: string;
  currency?: string;
  plan?: string;
  app_version?: string;
  platform?: string;
}

class AnalyticsClient {
  private isInitialized = false;
  private commonProps: CommonProps = {};
  private userId: string | null = null;
  private posthogInstance: typeof PostHog | null = null;

  /**
   * Initialize PostHog analytics
   * Works on all React Native platforms
   */
  async init(): Promise<void> {
    try {
      const posthogKey =
        Constants.expoConfig?.extra?.posthogKey ||
        process.env.EXPO_PUBLIC_POSTHOG_KEY;

      if (!posthogKey) {
        console.warn('[Analytics] PostHog API key not found');
        return;
      }

      await PostHog.initAsync(posthogKey, {
        host: 'https://us.i.posthog.com',
        captureApplicationLifecycleEvents: true,
        captureDeepLinks: true,
        recordScreenViews: true,
        flushAt: 20,
        flushInterval: 30,
      });

      this.posthogInstance = PostHog;
      this.isInitialized = true;

      // Set common properties
      this.setContext({
        app_version: this.getAppVersion(),
        platform: 'react-native',
        country: 'UY', // Default to Uruguay
        currency: 'UYU', // Default currency
      });

      console.log('[Analytics] PostHog initialized successfully');
    } catch (error) {
      console.error('[Analytics] Failed to initialize PostHog:', error);
    }
  }

  /**
   * Track an analytics event
   */
  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.isInitialized) {
      console.log(`[Analytics] Event ${event} skipped - not initialized`);
      return;
    }

    try {
      const finalProps = {
        ...this.commonProps,
        ...properties,
        timestamp: new Date().toISOString(),
      };

      PostHog.capture(event, finalProps);
      console.log(`[Analytics] Event tracked: ${event}`, finalProps);
    } catch (error) {
      console.error(`[Analytics] Error tracking event ${event}:`, error);
    }
  }

  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.isInitialized) {
      console.log(`[Analytics] Identify ${userId} skipped - not initialized`);
      return;
    }

    try {
      this.userId = userId;
      const finalTraits = {
        ...traits,
        ...this.commonProps,
        user_id: userId,
      };

      PostHog.identify(userId, finalTraits);
      console.log(`[Analytics] User identified: ${userId}`, finalTraits);
    } catch (error) {
      console.error(`[Analytics] Error identifying user ${userId}:`, error);
    }
  }

  /**
   * Set common context properties for all events
   */
  setContext(context: CommonProps): void {
    this.commonProps = {
      ...this.commonProps,
      ...context,
    };
    console.log('[Analytics] Context updated:', this.commonProps);
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(flagKey: string): boolean {
    if (!this.isInitialized || !this.posthogInstance) {
      console.log(
        `[Analytics] Feature flag ${flagKey} defaulting to false - not initialized`
      );
      return false;
    }

    try {
      return this.posthogInstance.isFeatureEnabled(flagKey) || false;
    } catch (error) {
      console.error(
        `[Analytics] Error checking feature flag ${flagKey}:`,
        error
      );
      return false;
    }
  }

  /**
   * Reset analytics (logout)
   */
  reset(): void {
    if (!this.isInitialized || !this.posthogInstance) {
      return;
    }

    try {
      this.posthogInstance.reset();
      this.userId = null;
      console.log('[Analytics] Analytics reset');
    } catch (error) {
      console.error('[Analytics] Error resetting analytics:', error);
    }
  }

  /**
   * Get current app version
   */
  private getAppVersion(): string {
    return (
      Constants.expoConfig?.extra?.appVersion ||
      Constants.expoConfig?.version ||
      process.env.EXPO_PUBLIC_APP_VERSION ||
      process.env.NEXT_PUBLIC_APP_VERSION ||
      process.env.VITE_APP_VERSION ||
      '1.0.0'
    );
  }
}

// Export singleton instance
export const posthogClient = new AnalyticsClient();

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
}

export interface ContributionEventProps {
  contribution_id: string;
  goal_id: string;
  amount: number;
  method?: string;
}

export interface ChallengeEventProps {
  challenge_id: string;
  challenge_type: string;
  difficulty?: string;
  reward_xp?: number;
}

export interface SubscriptionEventProps {
  plan_id: string;
  plan_type: 'premium_monthly' | 'premium_yearly';
  amount: number;
  currency: string;
  period: 'monthly' | 'yearly';
  source?: string;
  coupon?: string;
}

export interface ErrorEventProps {
  error_message: string;
  error_code?: string;
  error_stack?: string;
  user_action?: string;
  screen?: string;
}

// Helper functions for common event tracking
export const trackGoalEvent = (event: string, props: GoalEventProps) => {
  posthogClient.track(event, props);
};

export const trackContributionEvent = (
  event: string,
  props: ContributionEventProps
) => {
  posthogClient.track(event, props);
};

export const trackChallengeEvent = (
  event: string,
  props: ChallengeEventProps
) => {
  posthogClient.track(event, props);
};

export const trackSubscriptionEvent = (
  event: string,
  props: SubscriptionEventProps
) => {
  posthogClient.track(event, props);
};

export const trackErrorEvent = (
  error: Error,
  context?: { screen?: string; userAction?: string }
) => {
  posthogClient.track(AnalyticsEvents.ERROR_OCCURRED, {
    error_message: error.message,
    error_stack: error.stack,
    error_name: error.name,
    ...context,
  });
};
