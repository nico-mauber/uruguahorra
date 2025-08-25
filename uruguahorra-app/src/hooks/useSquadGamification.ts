import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts';
import { useSquadsStore } from '@/store/useSquadsStore';
import { SquadGamificationService } from '@/services/squad-gamification.service';
import { logger, LogModule } from '@/utils/logger';

/**
 * Hook para manejar la gamificación de squads
 */
export const useSquadGamification = () => {
  const { user } = useAuth();
  const { userSquads } = useSquadsStore();
  const [hasSquadBonus, setHasSquadBonus] = useState(false);

  useEffect(() => {
    setHasSquadBonus(userSquads.length > 0);
  }, [userSquads.length]);

  /**
   * Calcular XP con bonus de squad
   */
  const calculateXpWithSquadBonus = useCallback(
    async (baseXp: number): Promise<number> => {
      if (!user?.id || userSquads.length === 0) {
        return baseXp;
      }

      try {
        return await SquadGamificationService.calculateSquadBonusXp(
          baseXp,
          user.id
        );
      } catch (error) {
        logger.error(LogModule.UI, 'Error calculando XP bonus de squad', error);
        return baseXp;
      }
    },
    [user?.id, userSquads.length]
  );

  /**
   * Registrar evento XP de squad
   */
  const logSquadXpEvent = useCallback(
    async (
      eventType: string,
      xpAmount: number,
      squadId?: string,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      if (!user?.id) return;

      try {
        await SquadGamificationService.logSquadXpEvent(
          user.id,
          eventType,
          xpAmount,
          squadId,
          metadata
        );
      } catch (error) {
        logger.error(LogModule.UI, 'Error registrando evento XP', error);
      }
    },
    [user?.id]
  );

  /**
   * Verificar y otorgar badges
   */
  const checkSquadBadges = useCallback(
    async (squadId: string): Promise<void> => {
      if (!user?.id) return;

      try {
        await SquadGamificationService.checkAndAwardSquadBadges(
          user.id,
          squadId
        );
      } catch (error) {
        logger.error(LogModule.UI, 'Error verificando badges de squad', error);
      }
    },
    [user?.id]
  );

  /**
   * Obtener multiplicador de XP por squads
   */
  const getXpMultiplier = useCallback((): number => {
    return hasSquadBonus ? 1.25 : 1.0; // 25% bonus por estar en squads
  }, [hasSquadBonus]);

  return {
    hasSquadBonus,
    calculateXpWithSquadBonus,
    logSquadXpEvent,
    checkSquadBadges,
    getXpMultiplier,
    squadsCount: userSquads.length,
  };
};
