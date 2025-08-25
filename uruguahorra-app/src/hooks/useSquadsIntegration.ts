import { useCallback } from 'react';
import { useSquadsSavingsSync } from './useSquadsSavingsSync';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook para integrar sincronización de squads en componentes que manejan ahorros.
 * Proporciona funciones optimizadas para usar después de operaciones de ahorro.
 */
export const useSquadsIntegration = () => {
  const { syncAfterSaving, hasSquads } = useSquadsSavingsSync();

  /**
   * Ejecutar después de un ahorro exitoso
   * @param amount - Cantidad ahorrada
   * @param source - Fuente del ahorro (opcional para logs)
   */
  const handlePostSaving = useCallback(
    async (amount: number, source?: string) => {
      if (!hasSquads) {
        logger.debug(
          LogModule.UI,
          'Usuario no pertenece a squads, omitiendo sincronización'
        );
        return;
      }

      logger.debug(LogModule.UI, 'Iniciando sincronización post-ahorro', {
        amount,
        source,
        hasSquads,
      });

      try {
        await syncAfterSaving(amount);
      } catch (error) {
        logger.warn(
          LogModule.UI,
          'Error en sincronización post-ahorro (no crítico)',
          error
        );
        // No lanzar el error para no afectar la UX del ahorro principal
      }
    },
    [syncAfterSaving, hasSquads]
  );

  /**
   * Wrapper para operaciones de ahorro que incluye sincronización automática
   * @param saveOperation - Función que ejecuta el ahorro
   * @param amount - Cantidad a ahorrar
   * @param source - Fuente del ahorro
   */
  const withSquadSync = useCallback(
    async <T>(
      saveOperation: () => Promise<T>,
      amount: number,
      source?: string
    ): Promise<T> => {
      // Ejecutar el ahorro primero
      const result = await saveOperation();

      // Luego sincronizar con squads si es exitoso
      await handlePostSaving(amount, source);

      return result;
    },
    [handlePostSaving]
  );

  return {
    /**
     * Ejecutar después de un ahorro exitoso
     */
    handlePostSaving,

    /**
     * Wrapper que combina ahorro + sincronización
     */
    withSquadSync,

    /**
     * Indica si el usuario pertenece a algún squad
     */
    hasSquads,
  };
};
