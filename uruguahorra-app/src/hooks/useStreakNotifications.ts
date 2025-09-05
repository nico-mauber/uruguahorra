import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationsService } from '@/services/notifications.service';
import { StreaksService } from '@/features/gamification';
import { useAuth } from '@/contexts';
import { logger, LogModule } from '@/utils/logger';
import { storage } from '@/lib/storage';

export interface StreakNotificationSettings {
  enabled: boolean;
}

export interface UseStreakNotificationsReturn {
  // Estado
  isInitialized: boolean;
  permissionsGranted: boolean;
  settings: StreakNotificationSettings;
  scheduledNotifications: number;

  // Acciones
  initialize: () => Promise<boolean>;
  requestPermissions: () => Promise<boolean>;
  setupDailyReminder: () => Promise<boolean>;
  setupAutomaticStreakWarnings: (userId: string) => Promise<boolean>;
  cancelAllNotifications: () => Promise<void>;
  updateSettings: (
    newSettings: Partial<StreakNotificationSettings>
  ) => Promise<void>;
  checkUserStreakStatus: () => Promise<void>;
}

const DEFAULT_SETTINGS: StreakNotificationSettings = {
  enabled: true,
};

// Configuración fija para recordatorio diario
const DAILY_REMINDER_TIME = {
  hour: 20, // 8:00 PM
  minute: 0,
} as const;

// Configuración fija de alertas escalonadas antes de perder la racha
const STREAK_WARNING_INTERVALS = [
  {
    hours: 12,
    title: '🔥 Tu racha necesita atención',
    body: 'Tu racha se romperá en 12 horas. ¡Haz tu microaporte pronto!',
  },
  {
    hours: 6,
    title: '⚠️ Racha en riesgo',
    body: 'Solo quedan 6 horas para mantener tu racha. ¡No la pierdas!',
  },
  {
    hours: 3,
    title: '🚨 ¡Últimas horas!',
    body: 'Tu racha se romperá en 3 horas. ¡Actúa ahora!',
  },
  {
    hours: 0.5,
    title: '💥 ¡URGENTE!',
    body: '¡Solo 30 minutos para salvar tu racha! Haz tu microaporte YA.',
  },
] as const;

const SETTINGS_STORAGE_KEY = 'streak_notification_settings';

/**
 * Verificar si la plataforma soporta notificaciones locales
 */
function isPlatformSupported(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function useStreakNotifications(): UseStreakNotificationsReturn {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [settings, setSettings] =
    useState<StreakNotificationSettings>(DEFAULT_SETTINGS);
  const [scheduledNotifications, setScheduledNotifications] = useState(0);

  // Ref para evitar reinicialización múltiple
  const initializationAttempted = useRef(false);

  // Cargar configuración guardada
  useEffect(() => {
    loadSettings();
  }, []);

  // Inicializar cuando el usuario esté disponible (solo una vez)
  useEffect(() => {
    if (user && !isInitialized && !initializationAttempted.current) {
      initializationAttempted.current = true;
      initialize();
    }
  }, [user, isInitialized]);

  // Listener para notificaciones recibidas
  useEffect(() => {
    if (!isInitialized) return;

    const subscription = Notifications.addNotificationReceivedListener(
      handleNotificationReceived
    );

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse
      );

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [isInitialized]);

  /**
   * Cargar configuración desde storage
   */
  const loadSettings = async () => {
    try {
      const savedSettings = await storage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as StreakNotificationSettings;
        setSettings(parsed);
      }
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error cargando configuración de notificaciones',
        error
      );
    }
  };

  /**
   * Guardar configuración en storage
   */
  const saveSettings = async (newSettings: StreakNotificationSettings) => {
    try {
      await storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error guardando configuración de notificaciones',
        error
      );
    }
  };

  /**
   * Manejar notificación recibida
   */
  const handleNotificationReceived = (
    notification: Notifications.Notification
  ) => {
    const { data } = notification.request.content;

    logger.info(LogModule.API, 'Notificación de racha recibida', {
      type: data?.type,
      timestamp: data?.timestamp,
    });

    // Aquí podrías agregar lógica adicional como analytics
  };

  /**
   * Manejar respuesta del usuario a la notificación
   */
  const handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ) => {
    const { data } = response.notification.request.content;

    logger.info(LogModule.API, 'Usuario interactuó con notificación de racha', {
      type: data?.type,
      actionIdentifier: response.actionIdentifier,
    });

    // Si el usuario toca la notificación, podrías navegar a la pantalla de contribuciones
    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // Aquí podrías usar navigation para ir a la pantalla de metas/contribuciones
    }
  };

  /**
   * Inicializar el sistema de notificaciones
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    try {
      logger.start(LogModule.API, 'Inicializando notificaciones de racha');

      const success = await NotificationsService.initialize();

      if (success) {
        const granted = await NotificationsService.areNotificationsEnabled();
        setPermissionsGranted(granted);
        setIsInitialized(true);

        // Si las notificaciones están habilitadas y el usuario las quiere
        if (granted && settings.enabled && user) {
          await setupNotifications();
        }

        logger.success(LogModule.API, 'Notificaciones de racha inicializadas');
        return true;
      }

      return false;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error inicializando notificaciones de racha',
        error
      );
      return false;
    }
  }, [settings.enabled]);

  /**
   * Solicitar permisos de notificación
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await NotificationsService.requestPermissions();
      setPermissionsGranted(granted);

      if (granted && settings.enabled && user) {
        await setupNotifications();
      }

      return granted;
    } catch (error) {
      logger.error(LogModule.API, 'Error solicitando permisos', error);
      return false;
    }
  }, [settings.enabled]);

  /**
   * Configurar todas las notificaciones según la configuración actual
   */
  const setupNotifications = async () => {
    if (!permissionsGranted || !settings.enabled || !user) return;

    await setupDailyReminder();
    await setupAutomaticStreakWarnings(user.id);
    await updateScheduledCount();
  };

  /**
   * Configurar recordatorio diario
   */
  const setupDailyReminder = useCallback(async (): Promise<boolean> => {
    try {
      // Verificar compatibilidad de plataforma
      if (!isPlatformSupported()) {
        logger.info(LogModule.API, 'Recordatorio no disponible en web');
        return false;
      }

      if (!permissionsGranted) {
        logger.warn(
          LogModule.API,
          'No hay permisos para programar notificación'
        );
        return false;
      }

      // Cancelar recordatorio anterior
      await NotificationsService.cancelStreakReminder();

      // Programar notificación diaria a horario fijo
      const trigger = {
        hour: DAILY_REMINDER_TIME.hour,
        minute: DAILY_REMINDER_TIME.minute,
        repeats: true,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 ¡Mantén tu racha viva!',
          body: '¿Ya hiciste tu microaporte de hoy? No dejes que se rompa tu racha de ahorro.',
          data: {
            type: 'streak_reminder',
            timestamp: Date.now(),
          },
        },
        trigger,
      });

      logger.success(
        LogModule.API,
        'Recordatorio diario configurado (horario fijo)',
        {
          notificationId,
          time: `${DAILY_REMINDER_TIME.hour}:${DAILY_REMINDER_TIME.minute.toString().padStart(2, '0')}`,
        }
      );

      await updateScheduledCount();
      return true;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error configurando recordatorio diario',
        error
      );
      return false;
    }
  }, [permissionsGranted]);

  /**
   * Configurar alertas automáticas escalonadas de racha
   */
  const setupAutomaticStreakWarnings = useCallback(
    async (userId: string): Promise<boolean> => {
      try {
        // Verificar compatibilidad de plataforma
        if (!isPlatformSupported()) {
          logger.info(LogModule.API, 'Alertas no disponibles en web');
          return false;
        }

        if (!permissionsGranted) {
          return false;
        }

        // Cancelar alertas anteriores
        await NotificationsService.cancelAllStreakWarnings();

        // Obtener información de la racha actual
        const streak = await StreaksService.getUserStreak(userId);
        if (!streak || streak.current_streak === 0) {
          logger.info(LogModule.API, 'No hay racha activa para proteger');
          return false;
        }

        const lastActivity = new Date(streak.last_activity_at);
        const now = new Date();
        const streakDeadline = new Date(lastActivity);
        streakDeadline.setHours(lastActivity.getHours() + 24);

        // Verificar si la racha ya expiró
        if (streakDeadline <= now) {
          logger.warn(LogModule.API, 'La racha ya ha expirado');
          return false;
        }

        let scheduledCount = 0;

        // Programar cada alerta del sistema escalonado
        for (const warning of STREAK_WARNING_INTERVALS) {
          const alertTime = new Date(streakDeadline);
          const hoursInMs = warning.hours * 60 * 60 * 1000;
          alertTime.setTime(alertTime.getTime() - hoursInMs);

          // Solo programar si la alerta es en el futuro
          if (alertTime > now) {
            const secondsUntilAlert = Math.floor(
              (alertTime.getTime() - now.getTime()) / 1000
            );

            const notificationId =
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: warning.title,
                  body: warning.body.replace(
                    /\d+/,
                    streak.current_streak.toString()
                  ),
                  data: {
                    type: 'streak_warning_auto',
                    timestamp: Date.now(),
                    hoursLeft: warning.hours,
                    currentStreak: streak.current_streak,
                    warningLevel: warning.hours,
                  },
                },
                trigger: {
                  seconds: secondsUntilAlert,
                },
              });

            scheduledCount++;
            logger.info(LogModule.API, `Alerta ${warning.hours}h programada`, {
              notificationId,
              alertTime: alertTime.toISOString(),
              secondsUntilAlert,
            });
          }
        }

        logger.success(
          LogModule.API,
          'Alertas automáticas de racha configuradas',
          {
            streakLength: streak.current_streak,
            scheduledWarnings: scheduledCount,
            streakDeadline: streakDeadline.toISOString(),
          }
        );

        return scheduledCount > 0;
      } catch (error) {
        logger.error(
          LogModule.API,
          'Error configurando alertas automáticas de racha',
          error
        );
        return false;
      }
    },
    [permissionsGranted]
  );

  /**
   * Cancelar todas las notificaciones
   */
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await NotificationsService.cancelAllStreakNotifications();
    await updateScheduledCount();
  }, []);

  /**
   * Actualizar configuración
   */
  const updateSettings = useCallback(
    async (newSettings: Partial<StreakNotificationSettings>): Promise<void> => {
      const updatedSettings = { ...settings, ...newSettings };
      await saveSettings(updatedSettings);

      // Reconfigurar notificaciones si están habilitadas
      if (updatedSettings.enabled && permissionsGranted && user) {
        await setupNotifications();
      } else if (!updatedSettings.enabled) {
        await cancelAllNotifications();
      }
    },
    [settings, permissionsGranted]
  );

  /**
   * Verificar estado de racha del usuario y configurar alertas automáticas
   */
  const checkUserStreakStatus = useCallback(async (): Promise<void> => {
    if (!user || !settings.enabled || !permissionsGranted) return;

    try {
      await setupAutomaticStreakWarnings(user.id);
    } catch (error) {
      logger.error(LogModule.API, 'Error verificando estado de racha', error);
    }
  }, [user, settings, permissionsGranted, setupAutomaticStreakWarnings]);

  /**
   * Actualizar contador de notificaciones programadas
   */
  const updateScheduledCount = async () => {
    try {
      const notifications =
        await NotificationsService.getScheduledNotifications();
      const streakNotifications = notifications.filter((notif) =>
        notif.content.data?.type?.includes('streak')
      );
      setScheduledNotifications(streakNotifications.length);
    } catch (error) {
      logger.error(LogModule.API, 'Error contando notificaciones', error);
    }
  };

  return {
    // Estado
    isInitialized,
    permissionsGranted,
    settings,
    scheduledNotifications,

    // Acciones
    initialize,
    requestPermissions,
    setupDailyReminder,
    setupAutomaticStreakWarnings,
    cancelAllNotifications,
    updateSettings,
    checkUserStreakStatus,
  };
}
