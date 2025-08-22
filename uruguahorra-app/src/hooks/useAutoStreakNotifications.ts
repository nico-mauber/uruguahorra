import { useEffect } from 'react';
import { useAuth } from '@/contexts';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';
import { StreaksService } from '@/features/gamification';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook para manejar la inicialización automática de notificaciones de racha
 * Se ejecuta cuando el usuario está autenticado
 */
export function useAutoStreakNotifications() {
  const { user, isLoading } = useAuth();
  const {
    isInitialized,
    permissionsGranted,
    settings,
    initialize,
    checkUserStreakStatus,
  } = useStreakNotifications();

  // Inicializar notificaciones cuando el usuario esté disponible
  useEffect(() => {
    if (!isLoading && user && !isInitialized) {
      initializeNotifications();
    }
  }, [user, isLoading, isInitialized]);

  // Verificar estado de racha cada hora cuando esté inicializado
  useEffect(() => {
    if (!isInitialized || !user || !settings.enabled) return;

    // Verificar inmediatamente
    checkUserStreakStatus();

    // Configurar verificación periódica (cada hora)
    const interval = setInterval(
      () => {
        checkUserStreakStatus();
      },
      60 * 60 * 1000
    ); // 1 hora

    return () => clearInterval(interval);
  }, [isInitialized, user, settings.enabled, checkUserStreakStatus]);

  const initializeNotifications = async () => {
    try {
      logger.info(
        LogModule.API,
        'Inicializando sistema de notificaciones automático'
      );

      const success = await initialize();

      if (success) {
        logger.success(
          LogModule.API,
          'Sistema de notificaciones inicializado correctamente'
        );

        // Verificar estado inicial de racha
        if (user) {
          await checkStreakStatus(user.id);
        }
      } else {
        logger.warn(
          LogModule.API,
          'No se pudieron inicializar las notificaciones'
        );
      }
    } catch (error) {
      logger.error(
        LogModule.API,
        'Error inicializando notificaciones automáticas',
        error
      );
    }
  };

  const checkStreakStatus = async (userId: string) => {
    try {
      const streak = await StreaksService.getUserStreak(userId);

      if (streak) {
        logger.info(LogModule.API, 'Estado de racha verificado', {
          userId,
          currentStreak: streak.current_streak,
          lastActivity: streak.last_activity_at,
        });

        // Si el usuario tiene una racha activa, verificar si necesita alertas
        if (streak.current_streak > 0) {
          const lastActivity = new Date(streak.last_activity_at);
          const now = new Date();
          const hoursSinceLastActivity =
            (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

          logger.info(LogModule.API, 'Horas desde última actividad', {
            hours: hoursSinceLastActivity,
          });
        }
      }
    } catch (error) {
      logger.error(LogModule.API, 'Error verificando estado de racha', error);
    }
  };

  return {
    isInitialized,
    permissionsGranted,
    settings,
  };
}
