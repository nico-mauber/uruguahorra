// ============================================
// CHALLENGE SYSTEM V2 - TYPES
// ============================================
// Tipos TypeScript para el nuevo sistema de retos de ahorro
// Fecha: 22 de Agosto, 2025

export type ChallengeDurationType = '1_week' | '15_days' | '30_days' | '1_year';
export type ChallengeSessionStatus =
  | 'active'
  | 'completed'
  | 'expired'
  | 'renewed'
  | 'cancelled';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ChallengeType =
  | 'savings'
  | 'spending_habits'
  | 'investments'
  | 'budgeting'
  | 'financial_education'
  | 'daily_expenses'
  | 'entertainment';

// ============================================
// INTERFACES PRINCIPALES
// ============================================

export interface ChallengeCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string | null;
  type: ChallengeType;
  category: string;
  difficulty: ChallengeDifficulty;
  requirement_type: string;
  xp_reward: number;
  target_value: number | null;
  duration_days: number | null;
  min_duration_days: number;
  max_duration_days: number;
  icon: string | null;
  color: string;
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface UserChallengeSession {
  id: string;
  user_id: string;
  challenge_id: string;
  status: ChallengeSessionStatus;
  duration_type: ChallengeDurationType;
  start_date: string;
  end_date: string;
  progress: number;
  xp_earned: number;
  completed_at: string | null;
  renewed_from_session_id: string | null;
  notification_settings: {
    daily_reminder: boolean;
    progress_updates: boolean;
    expiration_warning: boolean;
  };
  progress_log: ProgressLogEntry[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Relations (cuando se incluyan en queries)
  challenge?: Challenge;
}

export interface ProgressLogEntry {
  timestamp: string;
  progress: number;
  note?: string;
  automated?: boolean;
}

// ============================================
// PARÁMETROS PARA SERVICIOS
// ============================================

export interface StartChallengeSessionParams {
  userId: string;
  challengeId: string;
  durationType: ChallengeDurationType;
  notificationSettings?: Partial<UserChallengeSession['notification_settings']>;
  metadata?: Record<string, unknown>;
}

export interface UpdateSessionProgressParams {
  sessionId: string;
  progress: number;
  note?: string;
  automated?: boolean;
}

export interface RenewChallengeSessionParams {
  sessionId: string;
  newDurationType: ChallengeDurationType;
  resetProgress?: boolean;
}

// ============================================
// RESPUESTAS DE API
// ============================================

export interface ChallengesResponse {
  challenges: Challenge[];
  categories: ChallengeCategory[];
  totalCount: number;
}

export interface UserChallengeSessionsResponse {
  activeSessions: UserChallengeSession[];
  completedSessions: UserChallengeSession[];
  totalXpEarned: number;
  completionRate: number;
}

// ============================================
// FILTROS Y PARÁMETROS DE BÚSQUEDA
// ============================================

export interface ChallengeFilters {
  category?: string;
  difficulty?: ChallengeDifficulty | ChallengeDifficulty[];
  type?: ChallengeType | ChallengeType[];
  minXp?: number;
  maxXp?: number;
  availableDurations?: ChallengeDurationType[];
  tags?: string[];
}

export interface SessionFilters {
  status?: ChallengeSessionStatus | ChallengeSessionStatus[];
  durationType?: ChallengeDurationType | ChallengeDurationType[];
  challengeCategory?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

// ============================================
// ESTADÍSTICAS Y MÉTRICAS
// ============================================

export interface UserChallengeStats {
  totalSessionsStarted: number;
  totalSessionsCompleted: number;
  totalXpEarned: number;
  completionRate: number; // 0-100
  averageSessionDuration: number; // días
  favoriteChallengeCategory: string | null;
  currentActiveSessionsCount: number;
  longestStreakDays: number;
  categoriesCompleted: string[];
  difficultyBreakdown: {
    easy: { completed: number; total: number };
    medium: { completed: number; total: number };
    hard: { completed: number; total: number };
    expert: { completed: number; total: number };
  };
}

export interface ChallengeDashboardData {
  userStats: UserChallengeStats;
  activeSessions: UserChallengeSession[];
  recentlyCompleted: UserChallengeSession[];
  recommendedChallenges: Challenge[];
  categories: ChallengeCategory[];
  upcomingExpirations: {
    session: UserChallengeSession;
    daysUntilExpiry: number;
  }[];
}

// ============================================
// NOTIFICACIONES
// ============================================

export interface ChallengeNotification {
  id: string;
  sessionId: string;
  type:
    | 'daily_reminder'
    | 'progress_update'
    | 'expiration_warning'
    | 'completion'
    | 'renewal_available';
  title: string;
  body: string;
  scheduledAt: string;
  data?: {
    sessionId: string;
    challengeId: string;
    action?: 'view_session' | 'renew_challenge' | 'update_progress';
  };
}

// ============================================
// CONSTANTES Y ENUMS
// ============================================

export const CHALLENGE_DURATION_LABELS: Record<ChallengeDurationType, string> =
  {
    '1_week': '1 Semana',
    '15_days': '15 Días',
    '30_days': '30 Días',
    '1_year': '1 Año',
  };

export const CHALLENGE_DIFFICULTY_LABELS: Record<ChallengeDifficulty, string> =
  {
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    expert: 'Experto',
  };

export const CHALLENGE_TYPE_LABELS: Record<ChallengeType, string> = {
  savings: 'Ahorro',
  spending_habits: 'Hábitos de Gasto',
  investments: 'Inversiones',
  budgeting: 'Presupuesto',
  financial_education: 'Educación Financiera',
  daily_expenses: 'Gastos Diarios',
  entertainment: 'Entretenimiento',
};

export const XP_REWARDS_BY_DIFFICULTY: Record<ChallengeDifficulty, number> = {
  easy: 25,
  medium: 50,
  hard: 100,
  expert: 200,
};

export const MAX_ACTIVE_SESSIONS = 5;

// ============================================
// UTILITY TYPES
// ============================================

export type ChallengeWithStats = Challenge & {
  completionCount: number;
  averageCompletionTime: number;
  successRate: number;
};

export type SessionWithChallenge = UserChallengeSession & {
  challenge: Challenge;
};

export type CategoryWithChallenges = ChallengeCategory & {
  challenges: Challenge[];
  challengeCount: number;
};

// ============================================
// DATABASE TABLE TYPES (para Supabase)
// ============================================

export interface ChallengeCategoriesTable {
  Row: ChallengeCategory;
  Insert: Omit<ChallengeCategory, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<Omit<ChallengeCategory, 'id'>>;
}

export interface UserChallengeSessionsTable {
  Row: UserChallengeSession;
  Insert: Omit<UserChallengeSession, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<UserChallengeSession, 'id'>>;
}

// Para extender el Database type existente
export interface ExtendedDatabaseTables {
  challenge_categories: ChallengeCategoriesTable;
  user_challenge_sessions: UserChallengeSessionsTable;
}
