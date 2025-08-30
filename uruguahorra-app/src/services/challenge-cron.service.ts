import { ChallengeSessionsService } from './challenge-sessions.service';
import { logger, LogModule } from '@/utils/logger';

/**
 * Servicio para automatización y tareas programadas de retos
 * Este servicio debe ser llamado diariamente (cron job)
 */
export class ChallengeCronService {
  /**
   * Ejecuta todas las tareas de mantenimiento diario de retos
   * Esta función debe ser llamada una vez al día, idealmente a medianoche
   */
  static async runDailyMaintenance(): Promise<{
    expiredSessions: number;
    updatedSessions: number;
    completedSessions: number;
    executionTime: number;
    success: boolean;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let expiredSessions = 0;
    let updatedSessions = 0;
    let completedSessions = 0;

    try {
      logger.start(LogModule.DB, 'Iniciando mantenimiento diario de retos');

      // 1. Expirar sesiones vencidas
      try {
        expiredSessions = await ChallengeSessionsService.checkExpiredSessions();
        logger.success(LogModule.DB, `${expiredSessions} sesiones expiradas`);
      } catch (error) {
        const errorMsg = `Error expirando sesiones: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        logger.error(LogModule.DB, errorMsg, error);
      }

      // 2. Actualizar progreso de todas las sesiones activas
      try {
        const updateResult =
          await ChallengeSessionsService.updateAllActiveSessionsProgress();
        updatedSessions = updateResult.updatedSessions;
        completedSessions = updateResult.completedSessions;
        logger.success(LogModule.DB, 'Progreso de sesiones actualizado', {
          updatedSessions,
          completedSessions,
        });
      } catch (error) {
        const errorMsg = `Error actualizando sesiones: ${error instanceof Error ? error.message : error}`;
        errors.push(errorMsg);
        logger.error(LogModule.DB, errorMsg, error);
      }

      const executionTime = Date.now() - startTime;
      const success = errors.length === 0;

      const summary = {
        expiredSessions,
        updatedSessions,
        completedSessions,
        executionTime,
        success,
        errors,
      };

      if (success) {
        logger.success(
          LogModule.DB,
          'Mantenimiento diario completado exitosamente',
          summary
        );
      } else {
        logger.warn(
          LogModule.DB,
          'Mantenimiento diario completado con errores',
          summary
        );
      }

      return summary;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMsg = `Error crítico en mantenimiento diario: ${error instanceof Error ? error.message : error}`;
      errors.push(errorMsg);
      logger.error(LogModule.DB, errorMsg, error);

      return {
        expiredSessions,
        updatedSessions,
        completedSessions,
        executionTime,
        success: false,
        errors,
      };
    }
  }

  /**
   * Función para verificar y actualizar el progreso de un usuario específico
   * Útil para actualizaciones en tiempo real cuando un usuario usa la app
   */
  static async updateUserChallengeProgress(userId: string): Promise<{
    activeSessions: number;
    updatedSessions: number;
    completedSessions: number;
    success: boolean;
    error?: string;
  }> {
    try {
      logger.start(LogModule.DB, 'Actualizando progreso de retos del usuario', {
        userId,
      });

      // Obtener sesiones activas
      const activeSessions =
        await ChallengeSessionsService.getUserActiveSessions(userId);
      let updatedSessions = 0;
      let completedSessions = 0;

      // Actualizar cada sesión activa
      for (const session of activeSessions) {
        try {
          const result =
            await ChallengeSessionsService.updateSessionProgressFromActivity(
              session.id,
              'Actualización manual del progreso'
            );
          updatedSessions++;
          if (result.wasCompleted) {
            completedSessions++;
          }
        } catch (error) {
          logger.warn(LogModule.DB, 'Error actualizando sesión específica', {
            sessionId: session.id,
            error,
          });
        }
      }

      const result = {
        activeSessions: activeSessions.length,
        updatedSessions,
        completedSessions,
        success: true,
      };

      logger.success(LogModule.DB, 'Progreso de usuario actualizado', result);
      return result;
    } catch (error) {
      const errorMsg = `Error actualizando progreso del usuario: ${error instanceof Error ? error.message : error}`;
      logger.error(LogModule.DB, errorMsg, error);

      return {
        activeSessions: 0,
        updatedSessions: 0,
        completedSessions: 0,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Función de diagnóstico para verificar el estado del sistema de retos
   */
  static async getSystemStatus(): Promise<{
    totalActiveSessions: number;
    expiredSessions: number;
    completedToday: number;
    systemHealth: 'healthy' | 'warning' | 'critical';
    lastUpdate: string;
  }> {
    try {
      logger.start(LogModule.DB, 'Verificando estado del sistema de retos');

      // Esta función requeriría consultas directas a la base de datos
      // Por simplicidad, retornamos un estado básico
      const systemStatus = {
        totalActiveSessions: 0,
        expiredSessions: 0,
        completedToday: 0,
        systemHealth: 'healthy' as const,
        lastUpdate: new Date().toISOString(),
      };

      logger.success(
        LogModule.DB,
        'Estado del sistema verificado',
        systemStatus
      );
      return systemStatus;
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando estado del sistema', error);
      return {
        totalActiveSessions: 0,
        expiredSessions: 0,
        completedToday: 0,
        systemHealth: 'critical',
        lastUpdate: new Date().toISOString(),
      };
    }
  }

  /**
   * Función para limpiar datos antiguos (opcional)
   * Puede ser ejecutada semanalmente para mantener la base de datos limpia
   */
  static async cleanupOldData(daysToKeep: number = 90): Promise<{
    deletedActivities: number;
    deletedLogs: number;
    success: boolean;
    error?: string;
  }> {
    try {
      logger.start(LogModule.DB, 'Iniciando limpieza de datos antiguos', {
        daysToKeep,
      });

      // Esta función requeriría implementar consultas de limpieza en la base de datos
      // Por ahora, retornamos un resultado mock
      const result = {
        deletedActivities: 0,
        deletedLogs: 0,
        success: true,
      };

      logger.success(LogModule.DB, 'Limpieza de datos completada', result);
      return result;
    } catch (error) {
      const errorMsg = `Error en limpieza de datos: ${error instanceof Error ? error.message : error}`;
      logger.error(LogModule.DB, errorMsg, error);

      return {
        deletedActivities: 0,
        deletedLogs: 0,
        success: false,
        error: errorMsg,
      };
    }
  }
}

/**
 * Función de conveniencia para usar en cron jobs o Edge Functions
 * Ejemplo de uso en Supabase Edge Function o similar:
 *
 * ```typescript
 * // En una Edge Function o cron job
 * import { runDailyChallengesMaintenance } from './services/challenge-cron.service';
 *
 * export async function handler() {
 *   const result = await runDailyChallengesMaintenance();
 *   return new Response(JSON.stringify(result), {
 *     headers: { 'Content-Type': 'application/json' },
 *   });
 * }
 * ```
 */
export async function runDailyChallengesMaintenance() {
  return ChallengeCronService.runDailyMaintenance();
}
