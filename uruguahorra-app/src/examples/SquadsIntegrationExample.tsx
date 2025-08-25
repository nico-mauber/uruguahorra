/**
 * Ejemplo de cómo integrar la sincronización de squads
 * en componentes que manejan ahorros
 *
 * NOTA: La integración automática ya funciona a través del GoalsService.addContribution
 * Este archivo es solo un ejemplo para casos especiales donde necesites más control.
 */

import React from 'react';
import { useSquadsIntegration } from '@/hooks/useSquadsIntegration';
import { GoalsService } from '@/services/goals.service';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

// Ejemplo de uso en un componente de ahorro
export const ExampleSavingComponent: React.FC = () => {
  const { withSquadSync, handlePostSaving, hasSquads } = useSquadsIntegration();

  // Método 1: Usar withSquadSync para envolver la operación completa
  const handleSavingWithAutoSync = async (goalId: string, amount: number) => {
    try {
      const result = await withSquadSync(
        async () => {
          // Tu lógica de ahorro aquí
          return await GoalsService.addContribution({
            user_id: 'user-id',
            goal_id: goalId,
            amount,
            source: 'manual',
            description: 'Ahorro con sincronización automática',
          });
        },
        amount,
        'manual'
      );

      ToastService.success('Ahorro guardado y sincronizado con tus grupos!');
      return result;
    } catch (error) {
      logger.error(LogModule.UI, 'Error en ahorro con sync', error);
      ToastService.error('Error guardando el ahorro');
    }
  };

  // Método 2: Sincronización manual después del ahorro (si ya tienes lógica existente)
  const handleSavingManualSync = async (goalId: string, amount: number) => {
    try {
      // Hacer el ahorro primero
      const contribution = await GoalsService.addContribution({
        user_id: 'user-id',
        goal_id: goalId,
        amount,
        source: 'manual',
        description: 'Ahorro con sincronización manual',
      });

      // Luego sincronizar manualmente si el usuario tiene squads
      if (hasSquads) {
        await handlePostSaving(amount, 'manual');
        ToastService.success(
          'Ahorro guardado',
          'También se actualizaron las estadísticas de tus grupos'
        );
      } else {
        ToastService.success('Ahorro guardado exitosamente');
      }

      return contribution;
    } catch (error) {
      logger.error(LogModule.UI, 'Error en ahorro manual', error);
      ToastService.error('Error guardando el ahorro');
    }
  };

  // En la mayoría de casos, simplemente usar GoalsService.addContribution
  // es suficiente porque ya incluye la sincronización automática
  const handleSimpleSaving = async (goalId: string, amount: number) => {
    try {
      const contribution = await GoalsService.addContribution({
        user_id: 'user-id',
        goal_id: goalId,
        amount,
        source: 'manual',
        description: 'Ahorro simple - sync automático incluido',
      });

      ToastService.success(
        hasSquads
          ? 'Ahorro guardado y sincronizado con tus grupos!'
          : 'Ahorro guardado exitosamente'
      );

      return contribution;
    } catch (error) {
      logger.error(LogModule.UI, 'Error en ahorro simple', error);
      ToastService.error('Error guardando el ahorro');
    }
  };

  return null; // Este es solo un ejemplo, no renderiza nada
};
