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
