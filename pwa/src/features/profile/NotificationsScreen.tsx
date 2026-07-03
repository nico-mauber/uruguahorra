import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Icon, Dialog, Button } from '@/components';
import { NotificationsService } from './notificationsService';
import { ToastService } from '@/lib/toast';

/** Pantalla `/notifications`. Fuente: docs/features/profile §Notificaciones, ui-ux. */
type Status = 'init' | 'no-permission' | 'disabled' | 'active';

export function NotificationsScreen() {
  const navigate = useNavigate();
  const supported = NotificationsService.isSupported();

  const [status, setStatus] = useState<Status>('init');
  const [busy, setBusy] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const perm = NotificationsService.getPermission();
    const enabled = NotificationsService.getSettings().enabled;
    setStatus(perm !== 'granted' ? 'no-permission' : enabled ? 'active' : 'disabled');
  }, [supported]);

  async function handleToggle() {
    setBusy(true);
    try {
      const perm = NotificationsService.getPermission();
      if (perm !== 'granted') {
        const result = await NotificationsService.requestPermission();
        if (result !== 'granted') {
          setShowPermDialog(true);
          setStatus('no-permission');
          return;
        }
        NotificationsService.setSettings({ enabled: true });
        setStatus('active');
        ToastService.success('Notificaciones activadas');
        return;
      }
      // Con permiso: alternar.
      const enabled = !NotificationsService.getSettings().enabled;
      NotificationsService.setSettings({ enabled });
      setStatus(enabled ? 'active' : 'disabled');
      ToastService.info(enabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
    } finally {
      setBusy(false);
    }
  }

  const statusMeta: Record<Status, { color: string; text: string }> = {
    init: { color: 'var(--color-warning)', text: 'Inicializando…' },
    'no-permission': { color: 'var(--color-error)', text: 'Sin permisos' },
    disabled: { color: 'var(--color-neutral)', text: 'Desactivadas' },
    active: { color: 'var(--color-success)', text: 'Activas' },
  };
  const meta = statusMeta[status];
  const on = status === 'active';

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'var(--space-2xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="flag" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Notificaciones</h1>
        <span style={{ width: 40 }} />
      </div>

      {!supported ? (
        <div style={{ padding: 20 }}>
          <Card><p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Las notificaciones no están disponibles en este navegador.</p></Card>
        </div>
      ) : (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Estado */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: meta.color }} />
              <strong style={{ fontSize: 18 }}>Estado de Notificaciones</strong>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '4px 0 12px' }}>{meta.text}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>{status === 'no-permission' ? 'Solicitar Permisos' : 'Activar Notificaciones'}</span>
              <button onClick={() => void handleToggle()} disabled={busy} aria-pressed={on}
                style={{ width: 48, height: 28, borderRadius: 14, border: 'none', cursor: busy ? 'wait' : 'pointer', position: 'relative', background: on ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 200ms' }}>
                <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left 200ms' }} />
              </button>
            </div>
          </Card>

          {/* Configuración (solo con permisos) */}
          {status !== 'no-permission' && (
            <Card>
              <strong style={{ fontSize: 16 }}>Alertas Automáticas de Racha</strong>
              <div style={{ background: 'var(--color-background)', borderRadius: 8, padding: 12, marginTop: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Sistema escalonado fijo:</p>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--color-text-secondary)' }}>
                  <li>12 horas antes de perder la racha</li>
                  <li>6 horas antes</li>
                  <li>3 horas antes</li>
                  <li>30 minutos antes</li>
                </ul>
                <p style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: 8 }}>
                  Se activan automáticamente cuando tienes una racha activa.
                </p>
              </div>
            </Card>
          )}

          <p style={{ fontSize: 14, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Las notificaciones te ayudarán a mantener tu racha de ahorro activa. Recibirás recordatorios cuando tu racha esté en riesgo.
          </p>
        </div>
      )}

      {showPermDialog && (
        <Dialog open onClose={() => setShowPermDialog(false)} title="Permisos Requeridos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p>Para recibir notificaciones de racha, necesitas conceder permisos en la configuración de tu navegador.</p>
            <Button onClick={() => setShowPermDialog(false)}>Entendido</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
