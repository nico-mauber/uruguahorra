import * as Notifications from 'expo-notifications';
import { logger, LogModule } from '@/utils/logger';
import { NotificationsService } from '@/services/notifications.service';
import type {
  UserChallengeSession,
  ChallengeNotification,
  ChallengeDurationType,
} from '@/types/challenge-system.types';

/**
 * Servicio para gestionar notificaciones específicas de retos
 */
export class ChallengeNotificationsService {
  private static readonly NOTIFICATION_PREFIXES = {
    DAILY_REMINDER: 'challenge-daily-',
    PROGRESS_UPDATE: 'challenge-progress-',
    EXPIRATION_WARNING: 'challenge-expiring-',
    COMPLETION: 'challenge-completed-',
    RENEWAL: 'challenge-renewable-',
  };

  /**
   * Programa todas las notificaciones para una sesión de reto
   */
  static async scheduleSessionNotifications(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      logger.start(
        LogModule.DB,
        'Programando notificaciones para sesión de reto',
        {
          sessionId: session.id,
          challengeId: session.challenge_id,
        }
      );

      const promises: Promise<void>[] = [];

      // Recordatorios diarios (si está habilitado)
      if (session.notification_settings.daily_reminder) {
        promises.push(this.scheduleProgressReminders(session));
      }

      // Advertencias de expiración (si está habilitado)
      if (session.notification_settings.expiration_warning) {
        promises.push(this.scheduleExpirationWarnings(session));
      }

      await Promise.all(promises);

      logger.success(LogModule.DB, 'Notificaciones programadas exitosamente', {
        sessionId: session.id,
        notificationsEnabled: Object.values(session.notification_settings),
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error programando notificaciones de sesión',
        error
      );
      // No fallar el proceso principal por errores de notificación
    }
  }

  /**
   * Programa recordatorios de progreso diarios
   */
  static async scheduleProgressReminders(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      const challengeName = session.challenge?.title || 'tu reto';
      const notificationId = `${this.NOTIFICATION_PREFIXES.DAILY_REMINDER}${session.id}`;

      // Calcular días restantes
      const endDate = new Date(session.end_date);
      const now = new Date();
      const daysRemaining = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysRemaining <= 0) {
        return; // No programar si ya expiró
      }

      // Programar notificación diaria a las 10:00 AM
      await Notifications.scheduleNotificationAsync({
        identifier: notificationId,
        content: {
          title: '🎯 ¡Recuerda tu reto!',
          body: `Continúa con ${challengeName}. Te quedan ${daysRemaining} días.`,
          data: {
            sessionId: session.id,
            challengeId: session.challenge_id,
            action: 'view_session',
            type: 'daily_reminder',
          },
        },
        trigger: {
          type: 'calendar',
          hour: 10,
          minute: 0,
          repeats: true,
        },
      });

      logger.success(LogModule.DB, 'Recordatorio diario programado', {
        sessionId: session.id,
        notificationId,
        daysRemaining,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error programando recordatorio diario',
        error
      );
    }
  }

  /**
   * Programa advertencias de expiración
   */
  static async scheduleExpirationWarnings(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      const challengeName = session.challenge?.title || 'tu reto';
      const endDate = new Date(session.end_date);
      const now = new Date();

      // Programar advertencias en diferentes intervalos antes de expirar
      const warningIntervals = this.getWarningIntervals(session.duration_type);

      for (const interval of warningIntervals) {
        const warningDate = new Date(endDate.getTime() - interval.milliseconds);

        // Solo programar si la fecha de advertencia es en el futuro
        if (warningDate > now) {
          const notificationId = `${this.NOTIFICATION_PREFIXES.EXPIRATION_WARNING}${session.id}-${interval.label}`;

          await Notifications.scheduleNotificationAsync({
            identifier: notificationId,
            content: {
              title: '⏰ Tu reto está por expirar',
              body: `${challengeName} expira en ${interval.label}. ¡No pierdas tu progreso!`,
              data: {
                sessionId: session.id,
                challengeId: session.challenge_id,
                action: 'view_session',
                type: 'expiration_warning',
              },
            },
            trigger: {
              date: warningDate,
            },
          });

          logger.success(LogModule.DB, 'Advertencia de expiración programada', {
            sessionId: session.id,
            notificationId,
            warningDate: warningDate.toISOString(),
            interval: interval.label,
          });
        }
      }
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error programando advertencias de expiración',
        error
      );
    }
  }

  /**
   * Envía notificación de sesión completada
   */
  static async sendCompletionNotification(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      const challengeName = session.challenge?.title || 'reto';
      const xpEarned = session.xp_earned || 0;

      await Notifications.scheduleNotificationAsync({
        identifier: `${this.NOTIFICATION_PREFIXES.COMPLETION}${session.id}`,
        content: {
          title: '🎉 ¡Reto completado!',
          body: `¡Felicitaciones! Has completado ${challengeName} y ganado ${xpEarned} XP.`,
          data: {
            sessionId: session.id,
            challengeId: session.challenge_id,
            action: 'view_session',
            type: 'completion',
          },
        },
        trigger: null, // Enviar inmediatamente
      });

      logger.success(LogModule.DB, 'Notificación de completado enviada', {
        sessionId: session.id,
        xpEarned,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error enviando notificación de completado',
        error
      );
    }
  }

  /**
   * Envía notificación de reto disponible para renovar
   */
  static async sendRenewalNotification(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      const challengeName = session.challenge?.title || 'reto';

      await Notifications.scheduleNotificationAsync({
        identifier: `${this.NOTIFICATION_PREFIXES.RENEWAL}${session.id}`,
        content: {
          title: '🔄 ¿Renovar tu reto?',
          body: `Has completado ${challengeName}. ¿Quieres continuar con este reto?`,
          data: {
            sessionId: session.id,
            challengeId: session.challenge_id,
            action: 'renew_challenge',
            type: 'renewal_available',
          },
        },
        trigger: {
          seconds: 60 * 60, // Enviar 1 hora después de completar
        },
      });

      logger.success(LogModule.DB, 'Notificación de renovación programada', {
        sessionId: session.id,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error programando notificación de renovación',
        error
      );
    }
  }

  /**
   * Cancela todas las notificaciones de una sesión
   */
  static async cancelSessionNotifications(sessionId: string): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Cancelando notificaciones de sesión', {
        sessionId,
      });

      const notificationPrefixes = Object.values(this.NOTIFICATION_PREFIXES);
      const identifiers: string[] = [];

      // Construir todos los posibles identificadores para esta sesión
      for (const prefix of notificationPrefixes) {
        identifiers.push(`${prefix}${sessionId}`);
        // También incluir variantes con sufijos (como -1day, -2days, etc.)
        identifiers.push(`${prefix}${sessionId}-1day`);
        identifiers.push(`${prefix}${sessionId}-2days`);
        identifiers.push(`${prefix}${sessionId}-1week`);
      }

      // Cancelar todas las notificaciones
      await Promise.all(
        identifiers.map((id) =>
          Notifications.cancelScheduledNotificationAsync(id)
        )
      );

      logger.success(LogModule.DB, 'Notificaciones canceladas', {
        sessionId,
        cancelledCount: identifiers.length,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error cancelando notificaciones de sesión',
        error
      );
    }
  }

  /**
   * Actualiza notificaciones cuando cambia el progreso
   */
  static async updateProgressNotifications(
    session: UserChallengeSession
  ): Promise<void> {
    try {
      // Solo enviar actualizaciones de progreso si está habilitado y es un hito significativo
      if (
        !session.notification_settings.progress_updates ||
        session.progress < 25
      ) {
        return;
      }

      const challengeName = session.challenge?.title || 'tu reto';
      const progressMilestones = [25, 50, 75];
      const currentMilestone = progressMilestones.find(
        (milestone) =>
          session.progress >= milestone && session.progress < milestone + 10 // Evitar spam
      );

      if (!currentMilestone) {
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: `${this.NOTIFICATION_PREFIXES.PROGRESS_UPDATE}${session.id}-${currentMilestone}`,
        content: {
          title: '📈 ¡Excelente progreso!',
          body: `Llevas ${session.progress}% completado en ${challengeName}. ¡Sigue así!`,
          data: {
            sessionId: session.id,
            challengeId: session.challenge_id,
            action: 'view_session',
            type: 'progress_update',
          },
        },
        trigger: null, // Enviar inmediatamente
      });

      logger.success(LogModule.DB, 'Notificación de progreso enviada', {
        sessionId: session.id,
        progress: session.progress,
        milestone: currentMilestone,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error enviando notificación de progreso',
        error
      );
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS
  // ============================================

  /**
   * Obtiene los intervalos de advertencia según el tipo de duración
   */
  private static getWarningIntervals(durationType: ChallengeDurationType): {
    milliseconds: number;
    label: string;
  }[] {
    const day = 24 * 60 * 60 * 1000;

    switch (durationType) {
      case '1_week':
        return [
          { milliseconds: 2 * day, label: '2 días' },
          { milliseconds: day, label: '1 día' },
        ];
      case '15_days':
        return [
          { milliseconds: 3 * day, label: '3 días' },
          { milliseconds: day, label: '1 día' },
        ];
      case '30_days':
        return [
          { milliseconds: 7 * day, label: '1 semana' },
          { milliseconds: 3 * day, label: '3 días' },
          { milliseconds: day, label: '1 día' },
        ];
      case '1_year':
        return [
          { milliseconds: 30 * day, label: '1 mes' },
          { milliseconds: 7 * day, label: '1 semana' },
          { milliseconds: 3 * day, label: '3 días' },
        ];
      default:
        return [{ milliseconds: day, label: '1 día' }];
    }
  }
}
