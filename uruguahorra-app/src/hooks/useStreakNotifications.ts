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
  reminderTime: {
    hour: number;
    minute: number;
  };
  warningHours: number;
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
  setupDailyReminder: (hour: number, minute: number) => Promise<boolean>;
  setupStreakWarning: (hoursBeforeBreak: number) => Promise<boolean>;
  cancelAllNotifications: () => Promise<void>;
  updateSettings: (
    newSettings: Partial<StreakNotificationSettings>
  ) => Promise<void>;
  checkUserStreakStatus: () => Promise<void>;

  // Testing y desarrollo
  sendTestNotification: () => Promise<void>;
  sendTestStreakReminder: (delaySeconds?: number) => Promise<void>;
  sendTestStreakWarning: (delaySeconds?: number) => Promise<void>;
  startDevReminder: (intervalMinutes?: number) => Promise<void>;
  stopDevReminder: () => Promise<void>;
  scheduleQuickTest: () => Promise<void>;
}

const DEFAULT_SETTINGS: StreakNotificationSettings = {
  enabled: true,
  reminderTime: {
    hour: 20, // 8:00 PM
    minute: 0,
  },
  warningHours: 2, // 2 horas antes de que se rompa
};

const SETTINGS_STORAGE_KEY = 'streak_notification_settings';

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
        if (granted && settings.enabled) {
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

      if (granted && settings.enabled) {
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
    if (!permissionsGranted || !settings.enabled) return;

    await setupDailyReminder(
      settings.reminderTime.hour,
      settings.reminderTime.minute
    );
    await updateScheduledCount();
  };

  /**
   * Configurar recordatorio diario
   */
  const setupDailyReminder = useCallback(
    async (hour: number, minute: number): Promise<boolean> => {
      try {
        if (!permissionsGranted) {
          logger.warn(
            LogModule.API,
            'No hay permisos para programar notificación'
          );
          return false;
        }

        // Usar notificaciones locales con un enfoque más simple
        await NotificationsService.cancelStreakReminder();

        // Programar notificación diaria usando el trigger apropiado
        const trigger = {
          hour,
          minute,
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

        logger.success(LogModule.API, 'Recordatorio diario configurado', {
          notificationId,
          time: `${hour}:${minute.toString().padStart(2, '0')}`,
        });

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
    },
    [permissionsGranted]
  );

  /**
   * Configurar alerta de racha en peligro
   */
  const setupStreakWarning = useCallback(
    async (hoursBeforeBreak: number): Promise<boolean> => {
      try {
        if (!permissionsGranted || !user) {
          return false;
        }

        // Obtener información de la racha actual
        const streak = await StreaksService.getUserStreak(user.id);
        if (!streak || streak.current_streak === 0) {
          return false; // No hay racha que proteger
        }

        // Calcular cuándo programar la alerta (basado en última actividad)
        const lastActivity = new Date(streak.last_activity_at);
        const alertTime = new Date(lastActivity);
        alertTime.setHours(lastActivity.getHours() + 24 - hoursBeforeBreak);

        const now = new Date();
        if (alertTime <= now) {
          // La alerta debería haber sido ya mostrada
          return false;
        }

        const secondsUntilAlert = Math.floor(
          (alertTime.getTime() - now.getTime()) / 1000
        );

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚠️ ¡Tu racha está en peligro!',
            body: `Tu racha de ${streak.current_streak} días se romperá en ${hoursBeforeBreak} horas. ¡Haz un microaporte ahora!`,
            data: {
              type: 'streak_warning',
              timestamp: Date.now(),
              hoursLeft: hoursBeforeBreak,
              currentStreak: streak.current_streak,
            },
          },
          trigger: {
            seconds: secondsUntilAlert,
          },
        });

        logger.success(LogModule.API, 'Alerta de racha configurada', {
          notificationId,
          alertTime: alertTime.toISOString(),
          currentStreak: streak.current_streak,
        });

        await updateScheduledCount();
        return true;
      } catch (error) {
        logger.error(
          LogModule.API,
          'Error configurando alerta de racha',
          error
        );
        return false;
      }
    },
    [permissionsGranted, user]
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
      if (updatedSettings.enabled && permissionsGranted) {
        await setupNotifications();
      } else if (!updatedSettings.enabled) {
        await cancelAllNotifications();
      }
    },
    [settings, permissionsGranted]
  );

  /**
   * Verificar estado de racha del usuario y configurar alertas apropiadas
   */
  const checkUserStreakStatus = useCallback(async (): Promise<void> => {
    if (!user || !settings.enabled || !permissionsGranted) return;

    try {
      const streak = await StreaksService.getUserStreak(user.id);

      if (streak && streak.current_streak > 0) {
        // El usuario tiene una racha activa, configurar alerta si es necesario
        const lastActivity = new Date(streak.last_activity_at);
        const now = new Date();
        const hoursSinceLastActivity =
          (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

        // Si han pasado más de 20 horas desde la última actividad, configurar alerta
        if (hoursSinceLastActivity > 20 && hoursSinceLastActivity < 24) {
          await setupStreakWarning(settings.warningHours);
        }
      }
    } catch (error) {
      logger.error(LogModule.API, 'Error verificando estado de racha', error);
    }
  }, [user, settings, permissionsGranted]);

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

  /**
   * Enviar notificación de prueba
   */
  const sendTestNotification = useCallback(async (): Promise<void> => {
    if (!permissionsGranted) {
      logger.warn(
        LogModule.API,
        'No hay permisos para enviar notificación de prueba'
      );
      return;
    }

    await NotificationsService.scheduleTestNotification(3);
    logger.info(LogModule.API, 'Notificación de prueba programada');
  }, [permissionsGranted]);

  /**
   * Funciones de desarrollo/testing
   */
  const sendTestStreakReminder = useCallback(
    async (delaySeconds: number = 10): Promise<void> => {
      if (!permissionsGranted) {
        logger.warn(
          LogModule.API,
          'No hay permisos para enviar recordatorio de prueba'
        );
        return;
      }

      await NotificationsService.scheduleTestStreakReminder(delaySeconds);
      await updateScheduledCount();
      logger.info(LogModule.API, 'Recordatorio de prueba programado', {
        delaySeconds,
      });
    },
    [permissionsGranted]
  );

  const sendTestStreakWarning = useCallback(
    async (delaySeconds: number = 15): Promise<void> => {
      if (!permissionsGranted) {
        logger.warn(
          LogModule.API,
          'No hay permisos para enviar alerta de prueba'
        );
        return;
      }

      await NotificationsService.scheduleTestStreakWarning(delaySeconds);
      await updateScheduledCount();
      logger.info(LogModule.API, 'Alerta de prueba programada', {
        delaySeconds,
      });
    },
    [permissionsGranted]
  );

  const startDevReminder = useCallback(
    async (intervalMinutes: number = 1): Promise<void> => {
      if (!permissionsGranted) {
        logger.warn(
          LogModule.API,
          'No hay permisos para recordatorio de desarrollo'
        );
        return;
      }

      await NotificationsService.scheduleDevReminder(intervalMinutes);
      await updateScheduledCount();
      logger.info(LogModule.API, 'Recordatorio de desarrollo iniciado', {
        intervalMinutes,
      });
    },
    [permissionsGranted]
  );

  const stopDevReminder = useCallback(async (): Promise<void> => {
    await NotificationsService.cancelDevReminder();
    await updateScheduledCount();
    logger.info(LogModule.API, 'Recordatorio de desarrollo detenido');
  }, []);

  const scheduleQuickTest = useCallback(async (): Promise<void> => {
    if (!permissionsGranted) {
      logger.warn(LogModule.API, 'No hay permisos para prueba rápida');
      return;
    }

    // Programar 3 notificaciones de prueba en secuencia
    await NotificationsService.scheduleTestNotification(5); // 5 segundos
    await NotificationsService.scheduleTestStreakReminder(15); // 15 segundos
    await NotificationsService.scheduleTestStreakWarning(25); // 25 segundos

    await updateScheduledCount();
    logger.info(LogModule.API, 'Secuencia de prueba programada (5s, 15s, 25s)');
  }, [permissionsGranted]);

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
    setupStreakWarning,
    cancelAllNotifications,
    updateSettings,
    checkUserStreakStatus,

    // Testing y desarrollo
    sendTestNotification,
    sendTestStreakReminder,
    sendTestStreakWarning,
    startDevReminder,
    stopDevReminder,
    scheduleQuickTest,
  };
}
