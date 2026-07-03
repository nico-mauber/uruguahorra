/**
 * Registro del Service Worker y control de actualización.
 * Fuente: docs/architecture/pwa-and-offline-strategy §3.3.
 * Al detectar nueva versión → toast "Actualizar"; al aceptar → SKIP_WAITING + reload.
 */
import { registerSW } from 'virtual:pwa-register';
import { ToastService } from './toast';
import { useUIStore } from '@/store/useUIStore';
import { logger, LogModule } from './logger';

export function initPWA(): void {
  if (import.meta.env.DEV) return; // SW sólo en producción.

  const updateSW = registerSW({
    onNeedRefresh() {
      useUIStore.getState().setSwUpdate(true);
      ToastService.info('Nueva versión disponible', 'Toca para actualizar');
      // Aplicar en el próximo gesto explícito desde el banner (PWAStatus) o aquí:
      // exponer la función de actualización global para el banner.
      pendingUpdate = () => void updateSW(true);
    },
    onOfflineReady() {
      logger.info(LogModule.CACHE, 'App lista para funcionar offline');
    },
    onRegisterError(error) {
      logger.warn(LogModule.CACHE, 'Error registrando SW', error);
    },
  });
}

/** Función para aplicar la actualización pendiente (la usa el banner PWAStatus). */
export let pendingUpdate: (() => void) | null = null;

/** Envía un mensaje al SW activo (p.ej. limpiar caché en logout). */
export function messageSW(type: string): void {
  navigator.serviceWorker?.controller?.postMessage({ type });
}
