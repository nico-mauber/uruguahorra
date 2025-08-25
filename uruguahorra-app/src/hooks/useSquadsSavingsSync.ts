import { useSquadsStore } from '@/store/useSquadsStore';
import { useAuth } from '@/contexts';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook personalizado para manejar la sincronización automática
 * de estadísticas de ahorro con los squads
 */
export const useSquadsSavingsSync = () => {
  const { user } = useAuth();
  const { userSquads, refreshAllSquadStats } = useSquadsStore();

  /**
   * Sincronizar estadísticas de ahorro después de una contribución
   * Debe llamarse después de cada ahorro exitoso
   */
  const syncAfterSaving = async (amount: number) => {
    if (!user?.id || userSquads.length === 0) {
      logger.debug(LogModule.STORE, 'No hay user o squads para sincronizar');
      return;
    }

    logger.start(LogModule.STORE, 'Sincronizando estadísticas con squads', {
      userSquads: userSquads.length,
      amount,
    });

    try {
      // Actualizar estadísticas en todos los squads del usuario usando la nueva función
      await refreshAllSquadStats(user.id);

      logger.success(
        LogModule.STORE,
        'Estadísticas de squads sincronizadas exitosamente'
      );
    } catch (error) {
      logger.error(
        LogModule.STORE,
        'Error sincronizando estadísticas de squads',
        error
      );
      // No lanzar el error para no afectar el flujo de ahorro principal
    }
  };

  return {
    syncAfterSaving,
    hasSquads: userSquads.length > 0,
    userSquads,
  };
};
