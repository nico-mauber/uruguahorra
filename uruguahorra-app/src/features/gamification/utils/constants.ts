export const XP_RULES = {
  CONTRIBUTION_RATE: 2,      // 2 XP por cada $1
  CONTRIBUTION_MAX: 10,      // máximo 10 XP por evento
  CHALLENGE_COMPLETE: 30,    // 30 XP por challenge completado
  DAILY_STREAK: 5,          // 5 XP por día de racha
} as const;

export const STREAK_RULES = {
  BREAK_HOURS: 48,          // 48 horas para romper racha
  PROTECTIONS_PER_MONTH: 1, // 1 protección mensual
  RESET_DAY: 1,            // Día del mes para resetear protecciones
} as const;

export const LEVEL_COLORS = {
  BRONZE: '#CD7F32',    // Niveles 1-5
  SILVER: '#C0C0C0',    // Niveles 6-15
  GOLD: '#FFD700',      // Niveles 16-30
  DIAMOND: '#B9F2FF',   // Niveles 31+
} as const;

export const LEVEL_THRESHOLDS = {
  BRONZE_MAX: 5,
  SILVER_MAX: 15,
  GOLD_MAX: 30,
} as const;

export const QUEST_SETTINGS = {
  CHALLENGES_PER_QUEST: 3,  // 3 challenges por quest semanal
  QUEST_DURATION_DAYS: 7,   // 7 días de duración
  QUEST_XP_BONUS: 50,       // XP extra por completar quest completo
} as const;

// Función helper para obtener color por nivel
export const getLevelColor = (level: number): string => {
  if (level <= LEVEL_THRESHOLDS.BRONZE_MAX) return LEVEL_COLORS.BRONZE;
  if (level <= LEVEL_THRESHOLDS.SILVER_MAX) return LEVEL_COLORS.SILVER;
  if (level <= LEVEL_THRESHOLDS.GOLD_MAX) return LEVEL_COLORS.GOLD;
  return LEVEL_COLORS.DIAMOND;
};

// Función helper para obtener tier por nivel
export const getLevelTier = (level: number): 'bronze' | 'silver' | 'gold' | 'diamond' => {
  if (level <= LEVEL_THRESHOLDS.BRONZE_MAX) return 'bronze';
  if (level <= LEVEL_THRESHOLDS.SILVER_MAX) return 'silver';
  if (level <= LEVEL_THRESHOLDS.GOLD_MAX) return 'gold';
  return 'diamond';
};