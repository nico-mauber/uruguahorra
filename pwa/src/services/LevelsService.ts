/**
 * LevelsService — funciones puras de niveles (sin BD).
 * Fuente: docs/features/gamification/gamification-functional-specs.md §2,
 * docs/api/contracts-and-data-mapping.md §6.
 */
import type { LevelInfo } from '@/types/gamification';

export class LevelsService {
  /** level = max(1, floor(sqrt(totalXP)/2)). */
  static getLevel(totalXP: number): number {
    const xp = Number.isFinite(totalXP) && totalXP > 0 ? totalXP : 0;
    return Math.max(1, Math.floor(Math.sqrt(xp) / 2));
  }

  /**
   * Progreso dentro del nivel actual.
   * currentLevelXP = (level*2)²; nextLevelXP = ((level+1)*2)²;
   * progress = ((totalXP - currentLevelXP)/(nextLevelXP - currentLevelXP))*100, clamp 0-100.
   */
  static getLevelProgress(totalXP: number): LevelInfo {
    const level = LevelsService.getLevel(totalXP);
    const currentLevelXP = Math.pow(level * 2, 2);
    const nextLevelXP = Math.pow((level + 1) * 2, 2);

    const span = nextLevelXP - currentLevelXP;
    const raw = span > 0 ? ((totalXP - currentLevelXP) / span) * 100 : 0;
    const progress = Math.min(100, Math.max(0, raw));

    return { level, progress, nextLevelXP, currentLevelXP };
  }

  /** Color del tier según nivel: bronce / plata / oro / diamante. */
  static getTierColor(level: number): string {
    if (level <= 5) return '#CD7F32'; // bronze
    if (level <= 15) return '#C0C0C0'; // silver
    if (level <= 30) return '#FFD700'; // gold
    return '#B9F2FF'; // diamond
  }
}
