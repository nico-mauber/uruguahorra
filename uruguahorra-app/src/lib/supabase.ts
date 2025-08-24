import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createSecureWebStorage } from './secure-web-storage';

// Obtener las variables de entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Validar que las variables existan
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Adapter para SecureStore de Expo (solo móvil)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// Adapter para AsyncStorage (fallback legacy)
const AsyncStorageAdapter = {
  getItem: (key: string) => {
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    return AsyncStorage.removeItem(key);
  },
};

// Función para obtener el adaptador de almacenamiento seguro para web
function getWebStorageAdapter() {
  try {
    // Intentar usar almacenamiento cifrado si está disponible
    if (
      typeof window !== 'undefined' &&
      window.crypto &&
      window.crypto.subtle
    ) {
      const secureStorage = createSecureWebStorage();
      return {
        getItem: (key: string) => secureStorage.getItem(key),
        setItem: (key: string, value: string) =>
          secureStorage.setItem(key, value),
        removeItem: (key: string) => secureStorage.removeItem(key),
      };
    }
  } catch (error) {
    console.warn(
      'Secure web storage not available, falling back to AsyncStorage',
      error
    );
  }

  // Fallback a AsyncStorage si el almacenamiento seguro no está disponible
  return AsyncStorageAdapter;
}

// Seleccionar el adapter según la plataforma
const storageAdapter = Platform.select({
  web: getWebStorageAdapter(),
  default: ExpoSecureStoreAdapter,
});

// Crear cliente de Supabase con persistencia segura
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // Configuración de seguridad mejorada
    storageKey: 'uruguahorra_auth', // Clave única para evitar conflictos
    flowType: 'pkce', // Usar PKCE para mayor seguridad en OAuth
  },
});

// Tipos específicos para campos JSONB
export type NotificationSettings = {
  daily_reminder: boolean;
  progress_updates: boolean;
  expiration_warning: boolean;
};

export type ProgressLogEntry = {
  timestamp: string;
  progress: number;
  note?: string;
};

export type ChallengeMetadata = Record<string, unknown>;

// Tipos de base de datos generados
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          country: string | null;
          currency: string | null;
          premium: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          country?: string | null;
          currency?: string | null;
          premium?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          country?: string | null;
          currency?: string | null;
          premium?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          target_amount: number;
          current_amount: number;
          saved_amount: number;
          category: string;
          color: string;
          icon: string;
          deadline: string | null;
          target_date: string;
          is_completed: boolean;
          is_active: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          target_amount: number;
          current_amount?: number;
          saved_amount?: number;
          category?: string;
          color?: string;
          icon?: string;
          deadline?: string | null;
          target_date: string;
          is_completed?: boolean;
          is_active?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          target_amount?: number;
          current_amount?: number;
          saved_amount?: number;
          category?: string;
          color?: string;
          icon?: string;
          deadline?: string | null;
          target_date?: string;
          is_completed?: boolean;
          is_active?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      micro_contributions: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          amount: number;
          source: 'manual' | 'roundup' | 'automatic' | 'challenge_reward';
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          amount: number;
          source: 'manual' | 'roundup' | 'automatic' | 'challenge_reward';
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          amount?: number;
          source?: 'manual' | 'roundup' | 'automatic' | 'challenge_reward';
          description?: string | null;
          created_at?: string;
        };
      };
      challenge_categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          color: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          color?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
      };
      challenges: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type:
            | 'savings'
            | 'spending_habits'
            | 'investments'
            | 'budgeting'
            | 'financial_education'
            | 'daily_expenses'
            | 'entertainment';
          difficulty: 'easy' | 'medium' | 'hard' | 'expert';
          requirement_type: 'savings' | 'transactions' | 'streak' | 'goals';
          xp_reward: number;
          target_value: number | null;
          duration_days: number | null;
          is_active: boolean;
          category_id: string | null;
          category_name: string | null;
          tags: string[];
          icon: string | null;
          color: string;
          min_duration_days: number;
          max_duration_days: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type?:
            | 'savings'
            | 'spending_habits'
            | 'investments'
            | 'budgeting'
            | 'financial_education'
            | 'daily_expenses'
            | 'entertainment';
          difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
          requirement_type?: 'savings' | 'transactions' | 'streak' | 'goals';
          xp_reward?: number;
          target_value?: number | null;
          duration_days?: number | null;
          is_active?: boolean;
          category_id?: string | null;
          category_name?: string | null;
          tags?: string[];
          icon?: string | null;
          color?: string;
          min_duration_days?: number;
          max_duration_days?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?:
            | 'savings'
            | 'spending_habits'
            | 'investments'
            | 'budgeting'
            | 'financial_education'
            | 'daily_expenses'
            | 'entertainment';
          difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
          requirement_type?: 'savings' | 'transactions' | 'streak' | 'goals';
          xp_reward?: number;
          target_value?: number | null;
          duration_days?: number | null;
          is_active?: boolean;
          category_id?: string | null;
          category_name?: string | null;
          tags?: string[];
          icon?: string | null;
          color?: string;
          min_duration_days?: number;
          max_duration_days?: number;
          created_at?: string;
        };
      };
      user_challenge_sessions: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          status: 'active' | 'completed' | 'expired' | 'renewed' | 'cancelled';
          duration_type: '1_week' | '15_days' | '30_days' | '1_year';
          start_date: string;
          end_date: string;
          progress: number;
          xp_earned: number;
          completed_at: string | null;
          renewed_from_session_id: string | null;
          notification_settings: NotificationSettings;
          progress_log: ProgressLogEntry[];
          metadata: ChallengeMetadata;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          status?: 'active' | 'completed' | 'expired' | 'renewed' | 'cancelled';
          duration_type: '1_week' | '15_days' | '30_days' | '1_year';
          start_date?: string;
          end_date: string;
          progress?: number;
          xp_earned?: number;
          completed_at?: string | null;
          renewed_from_session_id?: string | null;
          notification_settings?: NotificationSettings;
          progress_log?: ProgressLogEntry[];
          metadata?: ChallengeMetadata;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          status?: 'active' | 'completed' | 'expired' | 'renewed' | 'cancelled';
          duration_type?: '1_week' | '15_days' | '30_days' | '1_year';
          start_date?: string;
          end_date?: string;
          progress?: number;
          xp_earned?: number;
          completed_at?: string | null;
          renewed_from_session_id?: string | null;
          notification_settings?: NotificationSettings;
          progress_log?: ProgressLogEntry[];
          metadata?: ChallengeMetadata;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_challenges: {
        Row: {
          id: string;
          user_id: string;
          challenge_id: string;
          status: 'pending' | 'in_progress' | 'done' | 'claimed';
          progress: number;
          started_at: string;
          completed_at: string | null;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          challenge_id: string;
          status: 'pending' | 'in_progress' | 'done' | 'claimed';
          progress?: number;
          started_at?: string;
          completed_at?: string | null;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          challenge_id?: string;
          status?: 'pending' | 'in_progress' | 'done' | 'claimed';
          progress?: number;
          started_at?: string;
          completed_at?: string | null;
          claimed_at?: string | null;
        };
      };
      squads: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          invite_code: string;
          max_members: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          invite_code?: string;
          max_members?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          invite_code?: string;
          max_members?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      squad_members: {
        Row: {
          id: string;
          squad_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member';
          joined_at: string;
          total_saved: number;
          monthly_saved: number;
        };
        Insert: {
          id?: string;
          squad_id: string;
          user_id: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
          total_saved?: number;
          monthly_saved?: number;
        };
        Update: {
          id?: string;
          squad_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member';
          joined_at?: string;
          total_saved?: number;
          monthly_saved?: number;
        };
      };
      learnings: {
        Row: {
          id: string;
          title: string;
          description: string;
          duration_sec: number;
          tags: string[];
          url: string | null;
          category:
            | 'budgeting'
            | 'saving'
            | 'investing'
            | 'debt'
            | 'financial_planning'
            | 'economics'
            | null;
          difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
          points: number;
          is_active: boolean;
          created_at: string;
        };
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          learning_id: string;
          completed_at: string;
          score: number | null;
          time_spent_sec: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          learning_id: string;
          completed_at?: string;
          score?: number | null;
          time_spent_sec?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          learning_id?: string;
          completed_at?: string;
          score?: number | null;
          time_spent_sec?: number | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          provider: 'mercadopago';
          status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
          plan: 'free' | 'premium_monthly' | 'premium_yearly';
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: 'mercadopago';
          status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
          plan: 'free' | 'premium_monthly' | 'premium_yearly';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          provider?: 'mercadopago';
          status?: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'paused';
          plan?: 'free' | 'premium_monthly' | 'premium_yearly';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_xp_log: {
        Row: {
          id: string;
          user_id: string;
          event_type:
            | 'contribution'
            | 'challenge_complete'
            | 'daily_streak'
            | 'quest_complete';
          xp_earned: number;
          event_data: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type:
            | 'contribution'
            | 'challenge_complete'
            | 'daily_streak'
            | 'quest_complete';
          xp_earned: number;
          event_data?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_type?:
            | 'contribution'
            | 'challenge_complete'
            | 'daily_streak'
            | 'quest_complete';
          xp_earned?: number;
          event_data?: Record<string, unknown>;
          created_at?: string;
        };
      };
      user_streaks: {
        Row: {
          id: string;
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_at: string;
          streak_protections_used: number;
          protection_reset_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_at?: string;
          streak_protections_used?: number;
          protection_reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          current_streak?: number;
          longest_streak?: number;
          last_activity_at?: string;
          streak_protections_used?: number;
          protection_reset_date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      weekly_quests: {
        Row: {
          id: string;
          week_start_date: string;
          challenge_ids: string[];
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          week_start_date: string;
          challenge_ids?: string[];
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          week_start_date?: string;
          challenge_ids?: string[];
          is_active?: boolean;
          created_at?: string;
        };
      };
      user_quest_progress: {
        Row: {
          id: string;
          user_id: string;
          quest_id: string;
          completed_challenge_ids: string[];
          completion_percentage: number;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          quest_id: string;
          completed_challenge_ids?: string[];
          completion_percentage?: number;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          quest_id?: string;
          completed_challenge_ids?: string[];
          completion_percentage?: number;
          completed_at?: string | null;
        };
      };
    };
    Views: {
      user_dashboard: {
        Row: {
          user_id: string;
          email: string;
          premium: boolean;
          total_goals: number;
          active_goals: number;
          total_saved: number;
          challenges_completed: number;
          learnings_completed: number;
        };
      };
      user_xp_stats: {
        Row: {
          user_id: string;
          total_xp: number;
          total_events: number;
          contribution_xp: number;
          challenge_xp: number;
          streak_xp: number;
          quest_xp: number;
          last_xp_earned: string | null;
        };
      };
      streak_stats: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_activity_at: string;
          streak_protections_used: number;
          streak_status: 'active' | 'broken';
        };
      };
    };
  };
};
