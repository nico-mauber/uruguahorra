/**
 * Hook personalizado para manejar funcionalidades PWA
 */
import { useEffect, useState, useCallback } from 'react';

interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
  isStandalone: boolean;
}

interface PWAActions {
  promptInstall: () => Promise<void>;
  updateApp: () => void;
  share: (data: ShareData) => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

interface UsePWAReturn extends PWAState, PWAActions {
  supportsNotifications: boolean;
  supportsShare: boolean;
}

export function usePWA(): UsePWAReturn {
  // Detectar si estamos en React Native o en el navegador
  const isReactNative =
    typeof navigator !== 'undefined' &&
    (navigator.product === 'ReactNative' ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function');

  const [pwaState, setPWAState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: !isReactNative, // Solo puede ser instalable en navegadores
    isOnline: true, // Por defecto true para evitar problemas de hidratación
    hasUpdate: false,
    isStandalone: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Inicializar estado de conexión después del montaje
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      setPWAState((prev) => ({
        ...prev,
        isOnline: navigator.onLine,
      }));
    }
  }, []);

  // Detectar si la app está en modo standalone (instalada)
  useEffect(() => {
    if (typeof window === 'undefined' || isReactNative) return;

    // Verificar si matchMedia está disponible (solo en navegadores web)
    const hasMatchMedia = typeof window.matchMedia === 'function';

    const isStandalone = hasMatchMedia
      ? window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      : false; // En React Native, no es standalone por defecto

    setPWAState((prev) => ({
      ...prev,
      isStandalone,
      isInstalled: isStandalone,
    }));
  }, [isReactNative]);

  // Manejar prompt de instalación (solo en navegadores web)
  useEffect(() => {
    if (typeof window === 'undefined' || isReactNative) return;

    // Solo configurar eventos de PWA si estamos en un navegador web
    const isWeb =
      typeof window.addEventListener === 'function' &&
      typeof window.matchMedia === 'function';

    if (!isWeb) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPWAState((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setPWAState((prev) => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        isStandalone: true,
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isReactNative]);

  // Manejar cambios de conectividad
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      isReactNative
    )
      return;

    // Verificar si los eventos están disponibles
    const hasOnlineEvents = typeof window.addEventListener === 'function';

    if (!hasOnlineEvents) {
      // En React Native, asumir que está online por defecto
      setPWAState((prev) => ({ ...prev, isOnline: true }));
      return;
    }

    const handleOnline = () => {
      setPWAState((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setPWAState((prev) => ({ ...prev, isOnline: false }));
    };

    const handleConnectionChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.online === 'boolean') {
        setPWAState((prev) => ({ ...prev, isOnline: event.detail.online }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener(
      'connectionchange',
      handleConnectionChange as EventListener
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener(
        'connectionchange',
        handleConnectionChange as EventListener
      );
    };
  }, [isReactNative]);

  // Detectar actualizaciones del Service Worker
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      isReactNative
    )
      return;

    navigator.serviceWorker.ready
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (
                newWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                setPWAState((prev) => ({ ...prev, hasUpdate: true }));
              }
            });
          }
        });
      })
      .catch((error) => {
        console.warn('Service Worker not available:', error);
      });

    // Escuchar mensajes del Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        setPWAState((prev) => ({ ...prev, hasUpdate: true }));
      }
    });
  }, [isReactNative]);

  // Función para promover instalación
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      throw new Error('Install prompt not available');
    }

    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;

      if (result && result.outcome === 'accepted') {
        console.log('✅ Usuario aceptó instalación PWA');
      } else {
        console.log('❌ Usuario rechazó instalación PWA');
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    }

    setDeferredPrompt(null);
    setPWAState((prev) => ({ ...prev, isInstallable: false }));
  }, [deferredPrompt]);

  // Función para actualizar la app
  const updateApp = useCallback(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      isReactNative
    )
      return;

    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    });
  }, [isReactNative]);

  // Función para compartir
  const share = useCallback(async (shareData: ShareData): Promise<boolean> => {
    if (typeof navigator === 'undefined') return false;

    if ('share' in navigator) {
      try {
        await navigator.share(shareData);
        return true;
      } catch (error) {
        console.error('Error sharing:', error);
        return false;
      }
    }

    // Fallback: copiar al clipboard
    if ('clipboard' in navigator && shareData.url) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }

    return false;
  }, []);

  // Función para solicitar permisos de notificaciones
  const requestNotificationPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (
        typeof window === 'undefined' ||
        !('Notification' in window) ||
        isReactNative
      ) {
        return 'denied';
      }

      if (Notification.permission === 'granted') {
        return 'granted';
      }

      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
      }

      return Notification.permission;
    }, [isReactNative]);

  // Capacidades del navegador
  const supportsNotifications =
    !isReactNative &&
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;
  const supportsShare =
    !isReactNative && typeof navigator !== 'undefined' && 'share' in navigator;

  return {
    ...pwaState,
    promptInstall,
    updateApp,
    share,
    requestNotificationPermission,
    supportsNotifications,
    supportsShare,
  };
}
