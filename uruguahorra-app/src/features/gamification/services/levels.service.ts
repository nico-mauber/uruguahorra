import { logger, LogModule } from '@/utils/logger';
import type { LevelInfo } from '../types/gamification.types';
import {
  calculateLevel,
  getXPForLevel,
  getXPToNextLevel,
  getLevelInfo,
} from '../utils/formulas';
import { getLevelColor, getLevelTier } from '../utils/constants';

export class LevelsService {
  /**
   * Calcular nivel basado en XP total (función pura)
   */
  static getLevel(totalXP: number): number {
    return calculateLevel(totalXP);
  }

  /**
   * Obtener XP mínimo requerido para un nivel específico
   */
  static getXPForLevel(level: number): number {
    return getXPForLevel(level);
  }

  /**
   * Calcular XP necesario para el siguiente nivel
   */
  static getXPToNextLevel(currentXP: number): number {
    return getXPToNextLevel(currentXP);
  }

  /**
   * Obtener información completa del nivel actual
   */
  static getLevelProgress(currentXP: number): LevelInfo {
    return getLevelInfo(currentXP);
  }

  /**
   * Obtener color asociado al nivel
   */
  static getLevelColor(level: number): string {
    return getLevelColor(level);
  }

  /**
   * Obtener tier del nivel (bronze, silver, gold, diamond)
   */
  static getLevelTier(level: number): 'bronze' | 'silver' | 'gold' | 'diamond' {
    return getLevelTier(level);
  }

  /**
   * Obtener información extendida del nivel incluyendo colores y tier
   */
  static getLevelDetails(currentXP: number): LevelInfo & {
    color: string;
    tier: 'bronze' | 'silver' | 'gold' | 'diamond';
    levelName: string;
  } {
    try {
      const levelInfo = this.getLevelProgress(currentXP);
      const color = this.getLevelColor(levelInfo.level);
      const tier = this.getLevelTier(levelInfo.level);
      const levelName = this.getLevelName(levelInfo.level);

      return {
        ...levelInfo,
        color,
        tier,
        levelName,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo detalles de nivel', error);
      throw error;
    }
  }

  /**
   * Generar tabla de niveles (útil para debugging)
   */
  static generateLevelTable(maxLevel: number = 50): Array<{
    level: number;
    minXP: number;
    maxXP: number;
    tier: string;
    color: string;
  }> {
    const table = [];

    for (let level = 1; level <= maxLevel; level++) {
      const minXP = this.getXPForLevel(level);
      const maxXP = this.getXPForLevel(level + 1) - 1;
      const tier = this.getLevelTier(level);
      const color = this.getLevelColor(level);

      table.push({
        level,
        minXP,
        maxXP,
        tier,
        color,
      });
    }

    return table;
  }

  /**
   * Verificar si el usuario subió de nivel después de ganar XP
   */
  static checkLevelUp(
    previousXP: number,
    newXP: number
  ): {
    leveledUp: boolean;
    previousLevel: number;
    newLevel: number;
    levelGain: number;
  } {
    const previousLevel = this.getLevel(previousXP);
    const newLevel = this.getLevel(newXP);
    const leveledUp = newLevel > previousLevel;
    const levelGain = newLevel - previousLevel;

    if (leveledUp) {
      logger.success(LogModule.DB, `¡Subida de nivel!`, {
        previousLevel,
        newLevel,
        levelGain,
        previousXP,
        newXP,
      });
    }

    return {
      leveledUp,
      previousLevel,
      newLevel,
      levelGain,
    };
  }

  /**
   * Calcular cuántos niveles se pueden ganar con una cantidad específica de XP
   */
  static calculatePotentialLevels(
    currentXP: number,
    xpToAdd: number
  ): {
    currentLevel: number;
    newLevel: number;
    levelsGained: number;
    remainingXP: number;
  } {
    const currentLevel = this.getLevel(currentXP);
    const newTotalXP = currentXP + xpToAdd;
    const newLevel = this.getLevel(newTotalXP);
    const levelsGained = newLevel - currentLevel;
    const newLevelMinXP = this.getXPForLevel(newLevel);
    const remainingXP = newTotalXP - newLevelMinXP;

    return {
      currentLevel,
      newLevel,
      levelsGained,
      remainingXP,
    };
  }

  /**
   * Obtener nombre descriptivo del nivel
   */
  private static getLevelName(level: number): string {
    const tier = this.getLevelTier(level);

    switch (tier) {
      case 'bronze':
        return `Ahorrador Bronce ${level}`;
      case 'silver':
        return `Ahorrador Plata ${level}`;
      case 'gold':
        return `Ahorrador Oro ${level}`;
      case 'diamond':
        return `Ahorrador Diamante ${level}`;
      default:
        return `Nivel ${level}`;
    }
  }

  /**
   * Obtener milestone rewards (recompensas por alcanzar ciertos niveles)
   */
  static getMilestoneRewards(level: number): {
    hasMilestone: boolean;
    reward?: {
      type: 'feature' | 'premium_trial' | 'badge' | 'xp_bonus';
      description: string;
      value?: string | number;
    };
  } {
    const milestones = {
      5: {
        type: 'feature' as const,
        description: 'Desbloqueaste las metas personalizadas',
        value: 'custom_goals',
      },
      10: {
        type: 'premium_trial' as const,
        description: '7 días gratis de Premium',
        value: 7,
      },
      20: {
        type: 'badge' as const,
        description: 'Insignia de Ahorrador Experto',
        value: 'expert_saver',
      },
      30: {
        type: 'xp_bonus' as const,
        description: 'Bono permanente de +1 XP en contribuciones',
        value: 1,
      },
    };

    const reward = milestones[level as keyof typeof milestones];

    return {
      hasMilestone: !!reward,
      reward,
    };
  }

  /**
   * Estadísticas globales de niveles (para admin)
   */
  static async getGlobalLevelStats(): Promise<{
    averageLevel: number;
    levelDistribution: Record<string, number>;
    topLevels: Array<{ level: number; userCount: number }>;
  }> {
    try {
      logger.database(
        LogModule.DB,
        'Calculando estadísticas globales de niveles'
      );

      // Esta función requeriría una query más compleja en producción
      // Por ahora retorna una estructura de ejemplo
      return {
        averageLevel: 8.5,
        levelDistribution: {
          bronze: 60, // 60% de usuarios
          silver: 30, // 30% de usuarios
          gold: 8, // 8% de usuarios
          diamond: 2, // 2% de usuarios
        },
        topLevels: [
          { level: 45, userCount: 2 },
          { level: 42, userCount: 3 },
          { level: 38, userCount: 5 },
          { level: 35, userCount: 8 },
          { level: 32, userCount: 12 },
        ],
      };
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando estadísticas globales',
        error
      );
      throw error;
    }
  }
}
