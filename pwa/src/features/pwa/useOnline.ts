import { useEffect } from 'react';
import { useUIStore } from '@/store/useUIStore';

/**
 * Sincroniza `useUIStore.isOnline` con la conectividad real.
 * Fuente: docs/architecture/pwa-and-offline-strategy §4.1.
 * navigator.onLine + eventos online/offline + verificación activa (HEAD al
 * manifest cada 30s mientras está offline).
 */
export function useOnline(): void {
  const setOnline = useUIStore((s) => s.setOnline);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    // Verificación activa cuando el navegador se cree offline.
    const interval = setInterval(() => {
      if (navigator.onLine) return;
      fetch('/manifest.webmanifest', { method: 'HEAD', cache: 'no-store' })
        .then(() => setOnline(true))
        .catch(() => setOnline(false));
    }, 30_000);

    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      clearInterval(interval);
    };
  }, [setOnline]);
}
