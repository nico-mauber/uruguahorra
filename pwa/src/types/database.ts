/**
 * Tipos de la base de datos consumidos por la PWA.
 * Fuente: docs/api/contracts-and-data-mapping.md §2.
 * En esta fase solo se necesita `users` (perfil).
 */

export interface UserRow {
  id: string;
  email: string;
  country: string;
  currency: string;
  premium: boolean;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export type UserInsert = Omit<UserRow, 'updated_at'> & { updated_at?: string | null };

/**
 * Fila de `goals`. Fuente: docs/api/contracts-and-data-mapping.md §2.2.
 * `current_amount`/`saved_amount`/`is_completed` los mantiene el trigger de BD;
 * el cliente nunca los escribe.
 */
export interface GoalRow {
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
  goal_type_id: string | null;
  deadline: string | null;
  target_date: string | null;
  is_completed: boolean;
  is_active: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Payload de INSERT de meta. Sólo los campos que el cliente envía (§2.2).
 * `current_amount`/`is_completed` los calcula el trigger; no van aquí.
 */
export interface GoalInsert {
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string;
  saved_amount: 0;
  is_active: true;
  category?: string;
  color?: string;
  icon?: string;
  goal_type_id?: string | null;
}

/**
 * Fila de `micro_contributions`. Fuente: §2.3.
 * El INSERT dispara el trigger que recalcula la meta.
 */
export interface MicroContributionRow {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  description: string | null;
  source: string;
  created_at: string;
}

/**
 * Fila de `goal_types` (lectura pública + custom por usuario). Fuente: §2.4.
 */
export interface GoalTypeRow {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  icon: string | null;
  color: string | null;
  category: string | null;
  is_system: boolean;
  suggested_duration_months: number | null;
  created_by: string | null;
}

/**
 * Fila de `transactions`. Fuente: docs/api/contracts-and-data-mapping.md §2.5.
 * `xp_earned` lo fija el cliente (5 al crear). Los agregados/derivados de la
 * categoría (`category_name`/`category_emoji`) los mantiene el trigger
 * `auto_categorize_new_transaction`; el cliente no los escribe.
 * `category` es el objeto anidado del join con `transaction_categories`.
 */
export interface TransactionRow {
  id: string;
  user_id: string;
  goal_id: string | null;
  squad_id: string | null;
  amount: number;
  description: string | null;
  notes: string | null;
  transaction_date: string;
  category_id: string | null;
  category_name: string | null;
  category_emoji: string | null;
  type: 'expense' | 'income' | 'transfer';
  mood_before: number | null;
  mood_after: number | null;
  regret_level: number | null;
  necessity_level: number | null;
  location: string | null;
  tags: string[] | null;
  payment_method: string | null;
  xp_earned: number;
  achievements_unlocked: unknown | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  /** Join anidado con `transaction_categories` (select `category:...`). */
  category?: {
    id: string;
    name: string;
    emoji: string | null;
    type: 'expense' | 'income' | 'transfer';
    color: string | null;
  } | null;
}

/**
 * Fila de `transaction_categories` (lectura pública, casi estática). Fuente: §2.6.
 */
export interface TransactionCategoryRow {
  id: string;
  name: string;
  emoji: string | null;
  type: 'expense' | 'income' | 'transfer';
  color: string | null;
  sort_order: number;
}

/**
 * Payload de INSERT de transacción rápida (CU-2). Sólo los campos que el
 * cliente envía; el trigger infiere/sincroniza `type` y categoriza si
 * `category_id` es null.
 */
export interface TransactionInsert {
  user_id: string;
  amount: number;
  category_id: string | null;
  description: string | null;
  type: 'expense' | 'income' | 'transfer';
  /** YYYY-MM-DD */
  transaction_date: string;
  xp_earned: number;
}

/**
 * Transacción frecuente agregada en cliente (CU-3). Resultado de agrupar las
 * últimas 100 expenses por descripción + categoría.
 */
export interface FrequentTransaction {
  description: string;
  categoryId: string | null;
  count: number;
  avgAmount: number;
}

/**
 * Fila de `challenge_categories` (lectura pública, casi estática). Fuente:
 * docs/api/contracts-and-data-mapping.md §2.7.
 */
export interface ChallengeCategoryRow {
  id: string;
  name: string;
  description: string | null;
  /** Emoji o nombre de ionicon. */
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
}

/**
 * Fila de `challenges` (catálogo, lectura pública). Fuente: §2.7.
 */
export interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xp_reward: number;
  category_id: string | null;
  tags: string[] | null;
  icon: string | null;
  color: string | null;
  min_duration_days: number | null;
  max_duration_days: number | null;
  is_active: boolean;
}

/**
 * Fila de `user_challenge_sessions`. Fuente: §2.7.
 * `progress`/`xp_earned`/`status` los mantienen los RPC/triggers de BD; el
 * cliente sólo actualiza `progress` de forma best-effort tras un check-in.
 * `challenge` es el objeto anidado del join con `challenges`.
 */
export interface UserChallengeSessionRow {
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
  notification_settings: unknown | null;
  progress_log: unknown[] | null;
  metadata: unknown | null;
  /** Join anidado con `challenges` (select `challenge:challenges(*)`). */
  challenge?: ChallengeRow | null;
}

/**
 * Fila de `daily_challenge_checkins`. Fuente: §2.7.
 * UNIQUE(user_id, session_id, checkin_date). El INSERT/UPSERT lo hace el RPC
 * `record_challenge_daily_checkin`.
 */
export interface DailyCheckinRow {
  id: string;
  user_id: string;
  session_id: string;
  checkin_date: string;
  completed: boolean;
  note: string | null;
}
