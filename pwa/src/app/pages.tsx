import { useNavigate } from 'react-router-dom';
import { EmptyState, Button, Card } from '@/components';
import { useTheme } from '@/theme/useTheme';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * Páginas placeholder de la Fase 01. Cada una se reemplaza por su feature real
 * en la fase correspondiente (ver docs/README.md).
 */

function pageWrap(children: React.ReactNode) {
  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-lg)',
        paddingBottom: 'calc(var(--touch-fab) + var(--space-2xl))',
      }}
    >
      {children}
    </div>
  );
}

export function DashboardPage() {
  return pageWrap(
    <EmptyState
      icon="home"
      title="Dashboard"
      text="Placeholder — se construye en la Fase 03 (dashboard + metas)."
    />
  );
}

export { GoalsScreen as GoalsPage } from '@/features/goals/GoalsScreen';

export function ChallengesPage() {
  return pageWrap(
    <EmptyState icon="trophy" title="Retos" text="Placeholder — Fase 06." />
  );
}

export function AnalyticsPage() {
  return pageWrap(
    <EmptyState icon="analytics" title="Análisis" text="Placeholder — Fase 08." />
  );
}

export function ProfilePage() {
  const { isDark, toggle } = useTheme();
  const { user, signOut } = useAuthStore();
  return pageWrap(
    <Card>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Perfil</h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }}>
        {user?.email ?? 'Sesión de ejemplo'} · Placeholder — Fase 09.
      </p>
      <Button variant="outline" onClick={toggle} style={{ marginBottom: 12 }}>
        Tema: {isDark ? 'Oscuro' : 'Claro'} (tocar para alternar)
      </Button>
      <Button variant="ghost" onClick={() => void signOut()}>
        Cerrar sesión
      </Button>
    </Card>
  );
}

export { OnboardingScreen as OnboardingPage } from '@/features/auth/OnboardingScreen';

export function TransactionsPage() {
  const navigate = useNavigate();
  return pageWrap(
    <EmptyState
      icon="receipt"
      title="Transacciones"
      text="Placeholder — Fase 05."
      action={
        <Button variant="outline" onClick={() => navigate(-1)}>
          Volver
        </Button>
      }
    />
  );
}

export { CreateGoalScreen as CreateGoalPage } from '@/features/goals/CreateGoalScreen';

export function PaywallPage() {
  return pageWrap(
    <EmptyState icon="diamond" title="Premium" text="Placeholder — Fase 10." />
  );
}

export function SquadDetailPage() {
  return pageWrap(
    <EmptyState icon="people" title="Pod de Ahorro" text="Placeholder — Fase 07." />
  );
}

export function NotificationsPage() {
  return pageWrap(
    <EmptyState
      icon="notifications"
      title="Notificaciones"
      text="Placeholder — Fase 09."
    />
  );
}

export function AnalyticsSettingsPage() {
  return pageWrap(
    <EmptyState
      icon="analytics"
      title="Configuración de Análisis"
      text="Placeholder — Fase 08."
    />
  );
}

export function PrivacyPolicyPage() {
  return pageWrap(
    <EmptyState icon="shield" title="Privacidad" text="Política — placeholder." />
  );
}

function SubscriptionResult({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        maxWidth: 'var(--content-max-width)',
        margin: '0 auto',
        padding: 'var(--space-xl)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-lg)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 64 }}>{emoji}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>
        {title}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 320 }}>{text}</p>
      <Button style={{ maxWidth: 200 }} onClick={() => navigate('/')}>
        Continuar
      </Button>
    </div>
  );
}

export function SubscriptionSuccessPage() {
  return (
    <SubscriptionResult
      emoji="🎉"
      title="¡Suscripción Exitosa!"
      text="Placeholder — Fase 10."
    />
  );
}
export function SubscriptionFailurePage() {
  return (
    <SubscriptionResult emoji="😕" title="Pago no completado" text="Placeholder — Fase 10." />
  );
}
export function SubscriptionPendingPage() {
  return (
    <SubscriptionResult emoji="⏳" title="Pago en proceso" text="Placeholder — Fase 10." />
  );
}
