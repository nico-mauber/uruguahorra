export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          table_name: string;
          user_id: string;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          table_name: string;
          user_id: string;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          table_name?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      challenge_categories: {
        Row: {
          color: string;
          created_at: string | null;
          description: string | null;
          icon: string;
          id: string;
          name: string;
          sort_order: number | null;
        };
        Insert: {
          color: string;
          created_at?: string | null;
          description?: string | null;
          icon: string;
          id?: string;
          name: string;
          sort_order?: number | null;
        };
        Update: {
          color?: string;
          created_at?: string | null;
          description?: string | null;
          icon?: string;
          id?: string;
          name?: string;
          sort_order?: number | null;
        };
        Relationships: [];
      };
      transaction_categories: {
        Row: {
          color: string;
          created_at: string | null;
          emoji: string;
          id: string;
          is_default: boolean | null;
          name: string;
          sort_order: number | null;
          type: 'expense' | 'income' | 'transfer';
        };
        Insert: {
          color: string;
          created_at?: string | null;
          emoji: string;
          id?: string;
          is_default?: boolean | null;
          name: string;
          sort_order?: number | null;
          type: 'expense' | 'income' | 'transfer';
        };
        Update: {
          color?: string;
          created_at?: string | null;
          emoji?: string;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          sort_order?: number | null;
          type?: 'expense' | 'income' | 'transfer';
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          achievements_unlocked: string[] | null;
          amount: number;
          category_emoji: string | null;
          category_id: string | null;
          category_name: string | null;
          created_at: string | null;
          deleted_at: string | null;
          description: string | null;
          goal_id: string | null;
          id: string;
          location: string | null;
          mood_after: number | null;
          mood_before: number | null;
          necessity_level: number | null;
          notes: string | null;
          payment_method: string | null;
          regret_level: number | null;
          squad_id: string | null;
          tags: string[] | null;
          transaction_date: string;
          type: 'expense' | 'income' | 'transfer';
          updated_at: string | null;
          user_id: string;
          xp_earned: number | null;
        };
        Insert: {
          achievements_unlocked?: string[] | null;
          amount: number;
          category_emoji?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          goal_id?: string | null;
          id?: string;
          location?: string | null;
          mood_after?: number | null;
          mood_before?: number | null;
          necessity_level?: number | null;
          notes?: string | null;
          payment_method?: string | null;
          regret_level?: number | null;
          squad_id?: string | null;
          tags?: string[] | null;
          transaction_date?: string;
          type: 'expense' | 'income' | 'transfer';
          updated_at?: string | null;
          user_id: string;
          xp_earned?: number | null;
        };
        Update: {
          achievements_unlocked?: string[] | null;
          amount?: number;
          category_emoji?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          goal_id?: string | null;
          id?: string;
          location?: string | null;
          mood_after?: number | null;
          mood_before?: number | null;
          necessity_level?: number | null;
          notes?: string | null;
          payment_method?: string | null;
          regret_level?: number | null;
          squad_id?: string | null;
          tags?: string[] | null;
          transaction_date?: string;
          type?: 'expense' | 'income' | 'transfer';
          updated_at?: string | null;
          user_id?: string;
          xp_earned?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'transaction_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_goal_id_fkey';
            columns: ['goal_id'];
            isOneToOne: false;
            referencedRelation: 'goals';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_squad_id_fkey';
            columns: ['squad_id'];
            isOneToOne: false;
            referencedRelation: 'squads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      // ... otras tablas existentes (mantengo las esenciales para el sistema)
      users: {
        Row: {
          created_at: string | null;
          email: string | null;
          id: string;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          email?: string | null;
          id: string;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          created_at: string;
          current_amount: number;
          description: string | null;
          id: string;
          is_achieved: boolean | null;
          name: string;
          progress_percentage: number | null;
          squad_id: string | null;
          target_amount: number;
          target_date: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_amount?: number;
          description?: string | null;
          id?: string;
          is_achieved?: boolean | null;
          name: string;
          progress_percentage?: number | null;
          squad_id?: string | null;
          target_amount: number;
          target_date?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_amount?: number;
          description?: string | null;
          id?: string;
          is_achieved?: boolean | null;
          name?: string;
          progress_percentage?: number | null;
          squad_id?: string | null;
          target_amount?: number;
          target_date?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      transactions_with_categories: {
        Row: {
          achievements_unlocked: string[] | null;
          amount: number | null;
          category_color: string | null;
          category_emoji: string | null;
          category_emoji_full: string | null;
          category_full_name: string | null;
          category_id: string | null;
          category_name: string | null;
          category_type: 'expense' | 'income' | 'transfer' | null;
          created_at: string | null;
          deleted_at: string | null;
          description: string | null;
          goal_id: string | null;
          id: string | null;
          location: string | null;
          mood_after: number | null;
          mood_before: number | null;
          necessity_level: number | null;
          notes: string | null;
          payment_method: string | null;
          regret_level: number | null;
          squad_id: string | null;
          tags: string[] | null;
          transaction_date: string | null;
          type: 'expense' | 'income' | 'transfer' | null;
          updated_at: string | null;
          user_id: string | null;
          xp_earned: number | null;
        };
        Relationships: [];
      };
      monthly_expenses_by_category: {
        Row: {
          avg_amount: number | null;
          avg_necessity: number | null;
          avg_regret: number | null;
          category_emoji: string | null;
          category_id: string | null;
          category_name: string | null;
          month: string | null;
          total_amount: number | null;
          transaction_count: number | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      user_spending_psychology: {
        Row: {
          avg_mood_after: number | null;
          avg_mood_before: number | null;
          avg_mood_change: number | null;
          avg_necessity: number | null;
          avg_regret: number | null;
          avg_transaction_amount: number | null;
          most_frequent_category: string | null;
          total_spent: number | null;
          transaction_count: number | null;
          user_id: string | null;
          weekday_transactions: number | null;
          weekend_transactions: number | null;
          week: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auto_categorize_transaction: {
        Args: {
          description_text: string;
        };
        Returns: string;
      };
      calculate_user_spending_insights: {
        Args: {
          input_user_id: string;
          days_back?: number;
        };
        Returns: Json;
      };
      cleanup_deleted_transactions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      migrate_transactions_raw_to_transactions: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
        PublicSchema['Views'])
    ? (PublicSchema['Tables'] &
        PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;
