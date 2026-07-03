import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';

/** Pantallas de retorno de MercadoPago. Fuente: docs/features/billing §CU-3, ui-ux. */
function Layout({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{
      maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 'var(--space-xl)',
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 'var(--space-lg)', textAlign: 'center',
    }}>
      <div style={{ fontSize: 64 }}>{emoji}</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>{title}</h1>
      {children}
    </div>
  );
}

export function SubscriptionSuccessScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const refreshPremiumStatus = useAuthStore((s) => s.refreshPremiumStatus);

  useEffect(() => {
    if (user) {
      void refreshProfile();
      void refreshPremiumStatus();
    }
  }, [user, refreshProfile, refreshPremiumStatus]);

  return (
    <Layout emoji="🎉" title="¡Suscripción Exitosa!">
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 320 }}>
        Tu suscripción a UruguAhorra Premium ha sido activada correctamente. Ahora tienes acceso a todas las funciones premium.
      </p>
      <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)', maxWidth: 320 }}>
        Si aún no ves el estado premium, la activación puede demorar unos minutos.
      </p>
      <Button style={{ maxWidth: 200 }} onClick={() => navigate('/', { replace: true })}>Continuar</Button>
    </Layout>
  );
}

export function SubscriptionFailureScreen() {
  const navigate = useNavigate();
  return (
    <Layout emoji="😕" title="Pago no completado">
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 320 }}>
        No pudimos procesar tu pago. No se realizó ningún cobro.
      </p>
      <Button style={{ maxWidth: 200 }} onClick={() => navigate('/paywall')}>Reintentar</Button>
      <Button variant="outline" style={{ maxWidth: 200 }} onClick={() => navigate('/')}>Volver al inicio</Button>
    </Layout>
  );
}

export function SubscriptionPendingScreen() {
  const navigate = useNavigate();
  return (
    <Layout emoji="⏳" title="Pago en proceso">
      <p style={{ color: 'var(--color-text-secondary)', maxWidth: 320 }}>
        Tu pago está siendo verificado por MercadoPago. Te avisaremos cuando se acredite.
      </p>
      <Button style={{ maxWidth: 200 }} onClick={() => navigate('/')}>Volver al inicio</Button>
    </Layout>
  );
}
