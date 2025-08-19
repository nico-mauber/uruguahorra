export type XPEventType =
  | 'contribution'
  | 'challenge_complete'
  | 'daily_streak'
  | 'quest_complete';

export interface XPLogEntry {
  id: string;
  user_id: string;
  event_type: XPEventType;
  xp_earned: number;
  event_data: {
    amount?: number;
    challengeId?: string;
    streakDay?: number;
    [key: string]: unknown;
  };
  created_at: string;
}

export interface StreakData {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string;
  streak_protections_used: number;
  protection_reset_date: string;
  created_at: string;
  updated_at: string;
}

export interface LevelInfo {
  level: number;
  progress: number; // 0-100 percentage to next level
  nextLevelXP: number;
  currentLevelXP: number;
}

export interface WeeklyQuest {
  id: string;
  week_start_date: string;
  challenge_ids: string[];
  is_active: boolean;
  created_at: string;
}

export interface QuestProgress {
  id: string;
  user_id: string;
  quest_id: string;
  completed_challenge_ids: string[];
  completion_percentage: number;
  completed_at: string | null;
  quest?: WeeklyQuest;
}

export interface UserGamificationStats {
  totalXP: number;
  level: number;
  levelInfo: LevelInfo;
  streak: StreakData;
  activeQuests: QuestProgress[];
}

// Tipos para las tablas de Supabase (extender Database type)
export interface UserXPLog {
  Row: XPLogEntry;
  Insert: Omit<XPLogEntry, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<Omit<XPLogEntry, 'id'>>;
}

export interface UserStreaks {
  Row: StreakData;
  Insert: Omit<StreakData, 'id' | 'created_at' | 'updated_at'> & {
    id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<Omit<StreakData, 'id'>>;
}

export interface WeeklyQuests {
  Row: WeeklyQuest;
  Insert: Omit<WeeklyQuest, 'id' | 'created_at'> & {
    id?: string;
    created_at?: string;
  };
  Update: Partial<Omit<WeeklyQuest, 'id'>>;
}

export interface UserQuestProgress {
  Row: QuestProgress;
  Insert: Omit<QuestProgress, 'id'> & {
    id?: string;
  };
  Update: Partial<Omit<QuestProgress, 'id'>>;
}
