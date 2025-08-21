import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { logger, LogModule } from '@/utils/logger';
import { storage } from '@/lib/storage';

// Configuración del comportamiento de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationScheduleConfig {
  title: string;
  body: string;
  identifier: string;
  hour: number; // 0-23
  minute: number; // 0-59
  repeats: boolean;
}

export class NotificationsService {
  private static readonly STORAGE_KEYS = {
    PUSH_TOKEN: 'notification_push_token',
    PERMISSIONS_GRANTED: 'notification_permissions',
    STREAK_REMINDER_ID: 'streak_reminder_notification_id',
    STREAK_WARNING_ID: 'streak_warning_notification_id',
  };

  private static readonly NOTIFICATION_IDS = {
    STREAK_REMINDER: 'streak-reminder-daily',
    STREAK_WARNING: 'streak-warning-24h',
  };

  // Control para evitar spam de logs
  private static lastPermissionWarning = 0;
  private static readonly WARNING_INTERVAL = 30000; // 30 segundos entre warnings
  private static isInitialized = false;

  /**
   * Inicializar el servicio de notificaciones
   * Solicitar permisos y registrar token
   */
  static async initialize(): Promise<boolean> {
    try {
      // Si ya está inicializado, devolver el estado guardado
      if (this.isInitialized) {
        return await this.areNotificationsEnabled();
      }

      logger.start(LogModule.API, 'Inicializando servicio de notificaciones');

      // Verificar si es dispositivo físico
      if (!Device.isDevice) {
        // Solo loggear una vez cada 30 segundos para evitar spam
        const now = Date.now();
        if (now - this.lastPermissionWarning > this.WARNING_INTERVAL) {
          logger.warn(
            LogModule.API,
            'Notificaciones push no funcionan en simulador'
          );
          this.lastPermissionWarning = now;
        }
        return false;
      }

      // Solicitar permisos
      const permissionsGranted = await this.requestPermissions();
      if (!permissionsGranted) {
        // Solo loggear una vez cada 30 segundos para evitar spam
        const now = Date.now();
        if (now - this.lastPermissionWarning > this.WARNING_INTERVAL) {
          logger.warn(
            LogModule.API,
            'Permisos de notificación no concedidos'
          );
          this.lastPermissionWarning = now;
        }
        return false;
      }

      // Registrar token para notificaciones push (si se necesita en el futuro)
      await this.registerPushToken();

      this.isInitialized = true;
      logger.success(
        LogModule.API,
        'Servicio de notificaciones inicializado correctamente'
      );
      return true;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error inicializando servicio de notificaciones',
        error
      );
      return false;
    }
  }

  /**
   * Solicitar permisos de notificación
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      const granted = finalStatus === 'granted';
      await storage.setItem(this.STORAGE_KEYS.PERMISSIONS_GRANTED, granted.toString());

      logger.info(LogModule.API, 'Permisos de notificación', {
        granted,
        status: finalStatus,
      });

      return granted;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error solicitando permisos de notificación',
        error
      );
      return false;
    }
  }

  /**
   * Registrar token de notificaciones push
   */
  private static async registerPushToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
        });
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await storage.setItem(this.STORAGE_KEYS.PUSH_TOKEN, token);

      logger.info(LogModule.API, 'Token de notificación registrado', {
        tokenPrefix: token.substring(0, 20) + '...',
      });

      return token;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error registrando token de notificación',
        error
      );
      return null;
    }
  }

  /**
   * Programar notificación diaria de recordatorio de racha
   */
  static async scheduleStreakReminder(hour: number = 20, minute: number = 0): Promise<boolean> {
    try {
      logger.start(LogModule.API, 'Programando recordatorio diario de racha', {
        hour,
        minute,
      });

      // Cancelar notificación anterior si existe
      await this.cancelStreakReminder();

      const trigger = {
        hour,
        minute,
        repeats: true,
      };

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: this.NOTIFICATION_IDS.STREAK_REMINDER,
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

      await storage.setItem(this.STORAGE_KEYS.STREAK_REMINDER_ID, notificationId);

      logger.success(LogModule.API, 'Recordatorio de racha programado', {
        notificationId,
        time: `${hour}:${minute.toString().padStart(2, '0')}`,
      });

      return true;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error programando recordatorio de racha',
        error
      );
      return false;
    }
  }

  /**
   * Programar notificación de alerta de racha a punto de romperse
   */
  static async scheduleStreakWarning(hoursBeforeBreak: number = 2): Promise<boolean> {
    try {
      logger.start(LogModule.API, 'Programando alerta de racha', {
        hoursBeforeBreak,
      });

      // Cancelar alerta anterior si existe
      await this.cancelStreakWarning();

      // Programar para X horas antes de que se rompa (22 horas después del último día)
      const trigger = {
        type: 'timeInterval',
        seconds: (24 - hoursBeforeBreak) * 60 * 60,
      } as const;

      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: this.NOTIFICATION_IDS.STREAK_WARNING,
        content: {
          title: '⚠️ ¡Tu racha está en peligro!',
          body: `Tu racha se romperá en ${hoursBeforeBreak} horas. ¡Haz un microaporte ahora!`,
          data: {
            type: 'streak_warning',
            timestamp: Date.now(),
            hoursLeft: hoursBeforeBreak,
          },
        },
        trigger,
      });

      await storage.setItem(this.STORAGE_KEYS.STREAK_WARNING_ID, notificationId);

      logger.success(LogModule.API, 'Alerta de racha programada', {
        notificationId,
        hoursBeforeBreak,
      });

      return true;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error programando alerta de racha',
        error
      );
      return false;
    }
  }

  /**
   * Cancelar recordatorio diario de racha
   */
  static async cancelStreakReminder(): Promise<void> {
    try {
      const notificationId = await storage.getItem(this.STORAGE_KEYS.STREAK_REMINDER_ID);
      
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await storage.removeItem(this.STORAGE_KEYS.STREAK_REMINDER_ID);
        
        logger.info(LogModule.API, 'Recordatorio de racha cancelado', {
          notificationId,
        });
      }

      // También cancelar por identificador
      await Notifications.cancelScheduledNotificationAsync(
        this.NOTIFICATION_IDS.STREAK_REMINDER
      );
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error cancelando recordatorio de racha',
        error
      );
    }
  }

  /**
   * Cancelar alerta de racha
   */
  static async cancelStreakWarning(): Promise<void> {
    try {
      const notificationId = await storage.getItem(this.STORAGE_KEYS.STREAK_WARNING_ID);
      
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await storage.removeItem(this.STORAGE_KEYS.STREAK_WARNING_ID);
        
        logger.info(LogModule.API, 'Alerta de racha cancelada', {
          notificationId,
        });
      }

      // También cancelar por identificador
      await Notifications.cancelScheduledNotificationAsync(
        this.NOTIFICATION_IDS.STREAK_WARNING
      );
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error cancelando alerta de racha',
        error
      );
    }
  }

  /**
   * Cancelar todas las notificaciones de racha
   */
  static async cancelAllStreakNotifications(): Promise<void> {
    await Promise.all([
      this.cancelStreakReminder(),
      this.cancelStreakWarning(),
    ]);
  }

  /**
   * Obtener todas las notificaciones programadas
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      
      logger.info(LogModule.API, 'Notificaciones programadas obtenidas', {
        count: notifications.length,
      });

      return notifications;
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error obteniendo notificaciones programadas',
        error
      );
      return [];
    }
  }

  /**
   * Verificar si las notificaciones están habilitadas
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error verificando estado de notificaciones',
        error
      );
      return false;
    }
  }

  /**
   * Limpiar todas las notificaciones del centro de notificaciones
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      logger.info(LogModule.API, 'Todas las notificaciones limpiadas');
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error limpiando notificaciones',
        error
      );
    }
  }

  /**
   * Programar notificación inmediata para testing
   */
  static async scheduleTestNotification(delaySeconds: number = 5): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Notificación de prueba',
        body: 'Esta es una notificación de prueba del sistema de rachas.',
        data: {
          type: 'test',
          timestamp: Date.now(),
        },
      },
      trigger: { 
        type: 'timeInterval',
        seconds: delaySeconds 
      } as const,
    });

    logger.info(LogModule.API, 'Notificación de prueba programada', {
      notificationId,
      delaySeconds,
    });

    return notificationId;
  }

  /**
   * Programar recordatorio de prueba (en segundos en lugar de diario)
   */
  static async scheduleTestStreakReminder(delaySeconds: number = 10): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 ¡Mantén tu racha viva! (PRUEBA)',
        body: '¿Ya hiciste tu microaporte de hoy? No dejes que se rompa tu racha de ahorro.',
        data: {
          type: 'streak_reminder_test',
          timestamp: Date.now(),
        },
      },
      trigger: { 
        type: 'timeInterval',
        seconds: delaySeconds 
      } as const,
    });

    logger.info(LogModule.API, 'Recordatorio de prueba programado', {
      notificationId,
      delaySeconds,
    });

    return notificationId;
  }

  /**
   * Programar alerta de racha de prueba
   */
  static async scheduleTestStreakWarning(delaySeconds: number = 15): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ ¡Tu racha está en peligro! (PRUEBA)',
        body: 'Tu racha se romperá pronto. ¡Haz un microaporte ahora!',
        data: {
          type: 'streak_warning_test',
          timestamp: Date.now(),
          hoursLeft: 2,
        },
      },
      trigger: { 
        type: 'timeInterval',
        seconds: delaySeconds 
      } as const,
    });

    logger.info(LogModule.API, 'Alerta de prueba programada', {
      notificationId,
      delaySeconds,
    });

    return notificationId;
  }

  /**
   * Programar recordatorio con intervalo personalizado (para desarrollo)
   */
  static async scheduleDevReminder(intervalMinutes: number = 1): Promise<string> {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔥 Recordatorio de Desarrollo',
        body: `Recordatorio cada ${intervalMinutes} minuto(s) - ¡Haz tu microaporte!`,
        data: {
          type: 'dev_reminder',
          timestamp: Date.now(),
          intervalMinutes,
        },
      },
      trigger: { 
        type: 'timeInterval',
        seconds: intervalMinutes * 60,
        repeats: true
      } as const,
    });

    logger.info(LogModule.API, 'Recordatorio de desarrollo programado', {
      notificationId,
      intervalMinutes,
    });

    return notificationId;
  }

  /**
   * Cancelar recordatorio de desarrollo
   */
  static async cancelDevReminder(): Promise<void> {
    try {
      // Cancelar todas las notificaciones de desarrollo
      const notifications = await this.getScheduledNotifications();
      const devNotifications = notifications.filter(
        notif => notif.content.data?.type === 'dev_reminder'
      );

      for (const notification of devNotifications) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }

      logger.info(LogModule.API, 'Recordatorios de desarrollo cancelados', {
        count: devNotifications.length,
      });
    } catch (error) {
      logger.error(LogModule.API, 'Error cancelando recordatorios de desarrollo', error);
    }
  }
}
