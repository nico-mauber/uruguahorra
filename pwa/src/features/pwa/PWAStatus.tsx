import { Button } from '@/components';
import { useUIStore } from '@/store/useUIStore';
import { useOnline } from './useOnline';
import { usePWAInstall } from './usePWAInstall';
import { pendingUpdate } from '@/lib/pwa';

/**
 * Banners de PWA: offline, actualización disponible e instalación.
 * Fuente: docs/architecture/pwa-and-offline-strategy §2, §3.3, §4.1.
 * Se monta una vez a nivel de App.
 */
export function PWAStatus() {
  useOnline();
  const isOnline = useUIStore((s) => s.isOnline);
  const swUpdate = useUIStore((s) => s.swUpdateAvailable);
  const { isInstallable, install, dismiss } = usePWAInstall();

  return (
    <>
      {/* Offline */}
      {!isOnline && (
        <div style={bannerStyle('var(--color-warning)')}>
          Sin conexión — tus cambios se guardarán localmente
        </div>
      )}

      {/* Actualización disponible */}
      {swUpdate && (
        <div style={{ ...bannerStyle('var(--color-primary)'), display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
          Nueva versión disponible
          <button onClick={() => pendingUpdate?.()} style={inlineBtn}>Actualizar</button>
        </div>
      )}

      {/* Instalación */}
      {isInstallable && (
        <div style={{
          position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--touch-fab) + 24px)',
          zIndex: 'var(--z-fixed)', background: 'var(--color-card)', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: 12, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'var(--content-max-width)', margin: '0 auto',
        }}>
          <span style={{ fontSize: 24 }}>📲</span>
          <span style={{ flex: 1, fontSize: 14 }}>Instala UruguAhorra en tu dispositivo</span>
          <Button size="small" onClick={() => void install()}>Instalar</Button>
          <button onClick={dismiss} aria-label="Descartar" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--color-text-secondary)' }}>✕</button>
        </div>
      )}
    </>
  );
}

function bannerStyle(bg: string): React.CSSProperties {
  return {
    position: 'sticky', top: 0, zIndex: 'var(--z-sticky)' as unknown as number,
    background: bg, color: '#fff', textAlign: 'center', padding: '6px 12px', fontSize: 13, fontWeight: 600,
  };
}

const inlineBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.25)', border: 'none', color: '#fff',
  borderRadius: 8, padding: '2px 10px', cursor: 'pointer', fontWeight: 600,
};
