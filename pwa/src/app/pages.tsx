/**
 * Barrel de páginas: cada ruta re-exporta su feature real.
 * Fuente del mapa de rutas: docs/architecture/pwa-and-offline-strategy §7.
 */

export { DashboardScreen as DashboardPage } from '@/features/dashboard/DashboardScreen';

export { GoalsScreen as GoalsPage } from '@/features/goals/GoalsScreen';

export { ChallengesScreen as ChallengesPage } from '@/features/challenges/ChallengesScreen';

export { AnalyticsScreen as AnalyticsPage } from '@/features/analytics/AnalyticsScreen';

export { ProfileScreen as ProfilePage } from '@/features/profile/ProfileScreen';

export { OnboardingScreen as OnboardingPage } from '@/features/auth/OnboardingScreen';

export { TransactionsScreen as TransactionsPage } from '@/features/transactions/TransactionsScreen';

export { CreateGoalScreen as CreateGoalPage } from '@/features/goals/CreateGoalScreen';

export { PaywallScreen as PaywallPage } from '@/features/billing/PaywallScreen';

export { SquadDetailScreen as SquadDetailPage } from '@/features/pods/SquadDetailScreen';

export { NotificationsScreen as NotificationsPage } from '@/features/profile/NotificationsScreen';

export { AnalyticsSettingsScreen as AnalyticsSettingsPage } from '@/features/analytics/AnalyticsSettingsScreen';

export { PrivacyPolicyScreen as PrivacyPolicyPage } from '@/features/profile/PrivacyPolicyScreen';

export { SubscriptionSuccessScreen as SubscriptionSuccessPage } from '@/features/billing/SubscriptionReturnScreens';
export { SubscriptionFailureScreen as SubscriptionFailurePage } from '@/features/billing/SubscriptionReturnScreens';
export { SubscriptionPendingScreen as SubscriptionPendingPage } from '@/features/billing/SubscriptionReturnScreens';
