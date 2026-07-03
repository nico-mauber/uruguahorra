/**
 * Tipos compartidos de gamificación (XP, Niveles, Rachas, Quests).
 * Fuente: docs/features/gamification/gamification-functional-specs.md,
 * docs/api/contracts-and-data-mapping.md §2.9, §3, §6.
 */

/** Detalle del nivel y progreso dentro del nivel (LevelsService.getLevelProgress). */
export interface LevelInfo {
  level: number;
  /** Porcentaje 0-100 dentro del nivel actual. */
  progress: number;
  /** XP mínimo del siguiente nivel: ((level+1)*2)². */
  nextLevelXP: number;
  /** XP mínimo del nivel actual: (level*2)². */
  currentLevelXP: number;
}

/** Fila `user_streaks` normalizada (contrato §2.9). */
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityAt: string | null;
  streakProtectionsUsed: number;
  protectionResetDate: string | null;
}

/** Resultado de la ruta caliente de contribución (OptimizedGamificationService). */
export interface ContributionResult {
  xpEarned: number;
  levelUp: boolean;
  newLevel?: number;
}

/** Agregador para Dashboard/Perfil (GamificationService.getUserBasicStats). */
export interface UserBasicStats {
  level: number;
  totalXP: number;
  levelInfo: LevelInfo;
  streak: StreakData;
  /** Quests semanales: fase posterior. Por ahora vacío. */
  quests: unknown[];
}
