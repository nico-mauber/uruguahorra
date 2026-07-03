import { logger, LogModule } from '@/lib/logger';

/**
 * Servicio de notificaciones de racha (Fase 1 web).
 * Fuente: docs/features/profile/profile-functional-specs §Notificaciones,
 * docs/architecture/pwa-and-offline-strategy §5.
 * Persistencia en localStorage (IndexedDB kv se adopta en la fase PWA).
 */
const SETTINGS_KEY = 'notif-settings';
const SHOWN_KEY = 'notif-shown-stages';

/** Escalones fijos antes del vencimiento (ms). */
export const STAGES = [
  { id: '12h', ms: 12 * 3_600_000 },
  { id: '6h', ms: 6 * 3_600_000 },
  { id: '3h', ms: 3 * 3_600_000 },
  { id: '30m', ms: 30 * 60_000 },
];

const STREAK_WINDOW_MS = 48 * 3_600_000;

interface Settings {
  enabled: boolean;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export const NotificationsService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  },

  getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  },

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      return await Notification.requestPermission();
    } catch (error) {
      logger.warn(LogModule.UI, 'Error solicitando permiso de notificaciones', error);
      return 'denied';
    }
  },

  getSettings(): Settings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? (JSON.parse(raw) as Settings) : { enabled: false };
    } catch {
      return { enabled: false };
    }
  },

  setSettings(settings: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  /** Escalones ya mostrados hoy (se reinician al cambiar de día). */
  getShownStages(): string[] {
    try {
      const raw = localStorage.getItem(SHOWN_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { date: string; stages: string[] };
      return parsed.date === todayKey() ? parsed.stages : [];
    } catch {
      return [];
    }
  },

  markStageShown(stageId: string): void {
    const stages = [...this.getShownStages(), stageId];
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ date: todayKey(), stages }));
  },

  /**
   * Evalúa los escalones de racha y dispara la notificación del que corresponda.
   * `lastActivityAt` ISO y `currentStreak` vienen de la gamificación.
   */
  async checkStreakReminders(currentStreak: number, lastActivityAt: string | null): Promise<void> {
    if (!this.isSupported() || this.getPermission() !== 'granted') return;
    if (!this.getSettings().enabled || currentStreak <= 0 || !lastActivityAt) return;

    const deadline = new Date(lastActivityAt).getTime() + STREAK_WINDOW_MS;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return; // Racha ya vencida.

    const shown = this.getShownStages();
    // Escalón más urgente cuyo umbral se cruzó y no se mostró aún.
    for (const stage of STAGES) {
      if (remaining <= stage.ms && !shown.includes(stage.id)) {
        this.markStageShown(stage.id);
        try {
          const reg = await navigator.serviceWorker?.getRegistration?.();
          const body = `🔥 Tu racha de ${currentStreak} días está por vencer. ¡Registra un ahorro hoy!`;
          if (reg) {
            await reg.showNotification('UruguAhorra', { body, icon: '/icon.png', badge: '/icon.png' });
          } else {
            new Notification('UruguAhorra', { body });
          }
        } catch (error) {
          logger.warn(LogModule.UI, 'No se pudo mostrar la notificación', error);
        }
        break; // Un solo aviso por chequeo.
      }
    }
  },
};
