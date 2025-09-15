export type DifficultyLevel = 'principiante' | 'intermedio' | 'avanzado' | 'experto';

// Tipo principal de card educativa
export interface EducationCard {
  id: string;
  module_id: string;
  title: string;
  content: string;
  reading_time_seconds: number;
  display_order: number;
  practical_tip?: string;
  key_takeaway: string;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Módulo educativo (simplificado)
export interface EducationModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  display_order: number;
  difficulty_level: DifficultyLevel;
  is_active: boolean;
  estimated_duration_minutes: number;
  created_at: string;
  updated_at: string;
}

// Progreso del usuario en cards
export interface UserCardProgress {
  id: string;
  user_id: string;
  card_id: string;
  module_id: string;
  read_at: string;
  reading_time_spent_seconds: number;
  is_read: boolean;
  created_at: string;
}

// Progreso de módulo con cards
export interface ModuleProgress {
  module: EducationModule;
  total_cards: number;
  read_cards: number;
  completion_percentage: number;
  is_completed: boolean;
  estimated_total_time: number;
  cards: CardProgress[];
}

// Progreso individual de card
export interface CardProgress {
  card: EducationCard;
  progress?: UserCardProgress;
  is_read: boolean;
  is_unlocked: boolean;
}

// Resultado de lectura de card
export interface CardReadResult {
  success: boolean;
  xp_earned: number;
  first_read: boolean;
  module_completed: boolean;
  cards_read: number;
  total_cards: number;
}

// Estadísticas del usuario (simplificadas)
export interface UserEducationStats {
  total_cards_read: number;
  total_modules_completed: number;
  total_study_time_minutes: number;
  current_streak_days: number;
  last_study_date?: string;
}

// Sesión de lectura
export interface ReadingSession {
  card_id: string;
  start_time: Date;
  reading_time_seconds: number;
  completed: boolean;
}

// Datos de progreso de módulo desde la función SQL
export interface ModuleProgressData {
  module_id: string;
  total_cards: number;
  read_cards: number;
  completion_percentage: number;
  is_completed: boolean;
}

// Props para componentes
export interface CardReaderProps {
  card: EducationCard;
  onCardRead: (readingTime: number) => void;
  onNext?: () => void;
  onPrevious?: () => void;
  currentIndex: number;
  totalCards: number;
  isLast: boolean;
}

export interface ModuleOverviewProps {
  module: EducationModule;
  progress: ModuleProgress;
  onCardSelect: (card: EducationCard) => void;
}

export interface ReadingProgressProps {
  currentCard: number;
  totalCards: number;
  completionPercentage: number;
  estimatedTimeRemaining: number;
}

// Tipos para respuesta de API
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

// Tipos para las tablas de Supabase
export interface EducationCardsTable {
  Row: EducationCard;
  Insert: Omit<EducationCard, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<EducationCard, 'id'>>;
}

export interface UserCardProgressTable {
  Row: UserCardProgress;
  Insert: Omit<UserCardProgress, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<Omit<UserCardProgress, 'id'>>;
}

export interface EducationModulesTable {
  Row: EducationModule;
  Insert: Omit<EducationModule, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<EducationModule, 'id'>>;
}

// Utilidades de tiempo
export interface ReadingTime {
  seconds: number;
  display: string; // "1 min", "45 seg", etc.
}

export interface StudyProgress {
  cardsToday: number;
  streakDays: number;
  totalCardsRead: number;
  averageReadingTime: number;
}

// Filtros y opciones
export interface ModuleFilters {
  difficulty?: DifficultyLevel;
  completed?: boolean;
  inProgress?: boolean;
}

export interface CardFilters {
  isRead?: boolean;
  readingTimeRange?: {
    min: number;
    max: number;
  };
}

// Tipos para configuración
export interface EducationConfig {
  autoAdvanceAfterReading: boolean;
  showReadingTimeEstimate: boolean;
  enableReadingTimer: boolean;
  showProgressIndicator: boolean;
}

// Constantes de tiempo
export const READING_TIME = {
  MIN: 30,
  MAX: 120,
  AVERAGE: 75
} as const;

export const XP_REWARDS = {
  CARD_READ: 5,
  MODULE_COMPLETE: 50
} as const;