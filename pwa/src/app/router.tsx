import { createBrowserRouter } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { TabsLayout } from './TabsLayout';
import {
  DashboardPage,
  GoalsPage,
  ChallengesPage,
  AnalyticsPage,
  ProfilePage,
  OnboardingPage,
  TransactionsPage,
  CreateGoalPage,
  PaywallPage,
  SquadDetailPage,
  NotificationsPage,
  AnalyticsSettingsPage,
  PrivacyPolicyPage,
  SubscriptionSuccessPage,
  SubscriptionFailurePage,
  SubscriptionPendingPage,
  BudgetsPage,
} from './pages';

/** Router. Mapa 1:1 con docs/architecture/pwa-and-offline-strategy §7. */
export const router = createBrowserRouter([
  // Públicas
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/privacy-policy', element: <PrivacyPolicyPage /> },
  { path: '/subscription-success', element: <SubscriptionSuccessPage /> },
  { path: '/subscription-failure', element: <SubscriptionFailurePage /> },
  { path: '/subscription-pending', element: <SubscriptionPendingPage /> },

  // Privadas
  {
    element: <RequireAuth />,
    children: [
      {
        element: <TabsLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/challenges', element: <ChallengesPage /> },
          { path: '/analytics', element: <AnalyticsPage /> },
          { path: '/profile', element: <ProfilePage /> },
        ],
      },
      // Privadas sin tab bar
      { path: '/transactions', element: <TransactionsPage /> },
      { path: '/budgets', element: <BudgetsPage /> },
      { path: '/create-goal', element: <CreateGoalPage /> },
      { path: '/paywall', element: <PaywallPage /> },
      { path: '/squad/:id', element: <SquadDetailPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/analytics-settings', element: <AnalyticsSettingsPage /> },
    ],
  },

  // Catch-all → onboarding (o dashboard si hay sesión; RequireAuth decide)
  { path: '*', element: <OnboardingPage /> },
]);
