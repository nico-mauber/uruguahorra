import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Icon } from '@/components';
import type { IconName } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { BillingService, SUBSCRIPTION_PLANS, type PlanType } from '@/services/BillingService';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';

/** Pantalla `/paywall`. Fuente: docs/features/billing/{functional,ui-ux}. */
const FEATURES: { icon: IconName; title: string; desc: string }[] = [
  { icon: 'flag', title: 'Metas ilimitadas', desc: 'Crea todas las metas que necesites' },
  { icon: 'analytics', title: 'Reportes avanzados', desc: 'Análisis detallado de tus gastos' },
  { icon: 'people', title: 'Pods de ahorro', desc: 'Ahorra en grupo con amigos' },
  { icon: 'diamond', title: 'Contenido educativo completo', desc: 'Acceso a todos los cursos' },
  { icon: 'trophy', title: 'Retos exclusivos', desc: 'Desafíos especiales con más XP' },
];

export function PaywallScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isPremium = useAuthStore((s) => s.isPremium);
  const refreshPremiumStatus = useAuthStore((s) => s.refreshPremiumStatus);

  const [selected, setSelected] = useState<PlanType>('annual');
  const [busy, setBusy] = useState(false);
  const [awaiting, setAwaiting] = useState(false);

  useEffect(() => {
    void refreshPremiumStatus();
  }, [refreshPremiumStatus]);

  const plan = SUBSCRIPTION_PLANS.find((p) => p.type === selected)!;

  async function subscribe() {
    if (!userId) {
      ToastService.warning('Inicia sesión', 'Debes iniciar sesión para suscribirte');
      return;
    }
    if (isPremium) {
      ToastService.info('Ya tienes una suscripción activa');
      return;
    }
    setBusy(true);
    try {
      const res = await BillingService.createSubscription(selected);
      window.open(res.checkout_url, '_blank');
      setAwaiting(true);
    } catch (error) {
      ToastService.error('No se pudo procesar el pago', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    await refreshPremiumStatus();
    if (useAuthStore.getState().isPremium) {
      ToastService.success('¡Ya eres Premium!');
      navigate('/', { replace: true });
    } else {
      ToastService.info('Aún no se confirma', 'La activación puede demorar unos minutos');
    }
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: 20, paddingBottom: 'var(--space-4xl)' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-warning) 12%, transparent)', color: 'var(--color-warning)', fontSize: 14, fontWeight: 600 }}>PREMIUM</span>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>Desbloquea todo el potencial</h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginTop: 4 }}>Lleva tu ahorro al siguiente nivel con funciones exclusivas</p>
        {isPremium && (
          <div style={{ marginTop: 12, padding: '6px 12px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-info) 12%, transparent)', color: 'var(--color-info)', fontSize: 12, fontWeight: 600, display: 'inline-block' }}>Ya eres Premium</div>
        )}
      </div>

      {/* Planes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {SUBSCRIPTION_PLANS.map((p) => {
          const sel = p.type === selected;
          return (
            <Card key={p.id} onClick={() => setSelected(p.type)}
              style={{ cursor: 'pointer', border: sel ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                  <div>
                    <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-primary)' }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{p.period}</span>
                  </div>
                  {p.note && <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{p.note}</div>}
                </div>
                {p.badge && (
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-success) 12%, transparent)', color: 'var(--color-success)', fontSize: 12, fontWeight: 600 }}>{p.badge}</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Features */}
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Todo lo que incluye Premium</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }}>
              <Icon name={f.icon} size={20} color="var(--color-primary)" />
            </span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{f.title}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      {awaiting ? (
        <Card style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600 }}>🕐 Esperando confirmación de pago…</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '8px 0' }}>Si ya pagaste, la activación puede demorar unos minutos.</p>
          <Button onClick={() => void verify()}>Verificar estado</Button>
          <Button variant="ghost" onClick={() => setAwaiting(false)}>¿Problemas? Reintentar</Button>
        </Card>
      ) : (
        <Button size="large" style={{ width: '100%' }} loading={busy} disabled={isPremium}
          onClick={() => void subscribe()}>
          Suscribirse por {plan.price}{plan.period}
        </Button>
      )}

      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
        Puedes cancelar en cualquier momento desde tu perfil.<br />
        Los pagos se procesan de forma segura a través de MercadoPago.<br />
        Incluye 7 días de prueba gratis.
      </p>
    </div>
  );
}
