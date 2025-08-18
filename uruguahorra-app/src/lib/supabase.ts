import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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

// Adapter para AsyncStorage (web y fallback)
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

// Seleccionar el adapter según la plataforma
const storageAdapter = Platform.select({
  web: AsyncStorageAdapter,
  default: ExpoSecureStoreAdapter,
});

// Crear cliente de Supabase con persistencia segura
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

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
          target_amount: number;
          target_date: string;
          saved_amount: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          target_date: string;
          saved_amount?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          target_date?: string;
          saved_amount?: number;
          is_active?: boolean;
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
      challenges: {
        Row: {
          id: string;
          title: string;
          type: 'daily' | 'weekly' | 'monthly' | 'achievement';
          points: number;
          description: string;
          icon: string | null;
          requirement_type:
            | 'savings'
            | 'streak'
            | 'transactions'
            | 'learning'
            | 'social'
            | null;
          requirement_value: number | null;
          active: boolean;
          created_at: string;
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
          provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google';
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
          provider: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google';
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
          provider?: 'stripe' | 'paypal' | 'mercadopago' | 'apple' | 'google';
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
          max_streak: number;
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
          max_streak?: number;
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
          max_streak?: number;
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
      squad_rankings: {
        Row: {
          squad_id: string;
          squad_name: string;
          member_count: number;
          total_squad_savings: number;
          avg_monthly_savings: number;
          ranking: number;
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
      xp_leaderboard: {
        Row: {
          rank: number;
          user_id: string;
          total_xp: number;
          level: number;
        };
      };
      streak_stats: {
        Row: {
          user_id: string;
          current_streak: number;
          max_streak: number;
          last_activity_at: string;
          streak_protections_used: number;
          streak_status: 'active' | 'broken';
        };
      };
    };
  };
};
