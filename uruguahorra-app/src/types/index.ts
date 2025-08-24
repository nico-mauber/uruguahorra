/**
 * Archivo de índice para todos los tipos de la aplicación
 */

// Re-export de tipos de errores
export * from './errors';

// =============================================================================
// TIPOS BÁSICOS DE LA APLICACIÓN
// =============================================================================

export interface User {
  id: string;
  email: string;
  country: string;
  currency: string;
  premium: boolean;
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  type: GoalType;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  is_active: boolean;
  is_completed: boolean;
  progress_percentage: number;
  monthly_target?: number;
  vacation_destination?: string;
  vacation_duration_days?: number;
  home_type?: string;
  home_location?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: number;
  education_institution?: string;
  education_program?: string;
  education_duration_months?: number;
  created_at: string;
  updated_at?: string;
}

export enum GoalType {
  SAVINGS = 'savings',
  EMERGENCY_FUND = 'emergency_fund',
  VACATION = 'vacation',
  HOME = 'home',
  VEHICLE = 'vehicle',
  EDUCATION = 'education',
  INVESTMENT = 'investment',
  OTHER = 'other',
}

export interface Contribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  source: ContributionSource;
  description?: string;
  transaction_id?: string;
  created_at: string;
}

export enum ContributionSource {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  ROUNDUP = 'roundup',
  CASHBACK = 'cashback',
  INTEREST = 'interest',
}

// =============================================================================
// TIPOS DE NAVEGACIÓN
// =============================================================================

export interface NavigationState {
  routeName: string;
  params?: Record<string, unknown>;
  timestamp: number;
}

export interface TabRouteParams {
  index?: {
    refresh?: boolean;
  };
  goals?: {
    goalId?: string;
    action?: 'create' | 'edit' | 'view';
  };
  challenges?: {
    challengeId?: string;
  };
  profile?: {
    section?: 'settings' | 'premium' | 'help';
  };
}

export interface ModalRouteParams {
  'create-goal'?: {
    type?: GoalType;
    prefillData?: Partial<Goal>;
  };
  paywall?: {
    feature?: string;
    source?: string;
  };
  transactions?: {
    goalId?: string;
    filter?: TransactionFilter;
  };
}

// =============================================================================
// TIPOS DE FILTRADO Y BÚSQUEDA
// =============================================================================

export interface TransactionFilter {
  startDate?: string;
  endDate?: string;
  categories?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  searchText?: string;
  goalIds?: string[];
  sources?: ContributionSource[];
}

export interface PaginationParams {
  limit: number;
  offset: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams {
  query: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

// =============================================================================
// TIPOS DE RESPUESTA DE API
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
}

export interface ApiMeta {
  requestId: string;
  timestamp: string;
  version: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// TIPOS DE CONFIGURACIÓN
// =============================================================================

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
  };
  features: {
    csvImport: boolean;
    gamification: boolean;
    socialFeatures: boolean;
    premiumFeatures: boolean;
  };
  limits: {
    maxGoals: number;
    maxTransactionsPerImport: number;
    maxFileSize: number;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    currency: string;
    dateFormat: string;
  };
}

export interface UserPreferences {
  notifications: {
    goals: boolean;
    achievements: boolean;
    reminders: boolean;
    marketing: boolean;
  };
  privacy: {
    analytics: boolean;
    sharing: boolean;
    publicProfile: boolean;
  };
  display: {
    currency: string;
    language: string;
    theme: 'light' | 'dark' | 'auto';
    compactMode: boolean;
  };
}

// =============================================================================
// TIPOS DE VALIDACIÓN
// =============================================================================

export interface ValidationRule<T = unknown> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url';
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: T) => string | null;
}

export interface FormField<T = unknown> {
  name: string;
  label: string;
  type:
    | 'text'
    | 'number'
    | 'email'
    | 'password'
    | 'date'
    | 'select'
    | 'textarea';
  value: T;
  error?: string;
  rules?: ValidationRule<T>[];
  placeholder?: string;
  options?: Array<{ label: string; value: unknown }>;
  disabled?: boolean;
}

export interface FormState<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isValid: boolean;
  isSubmitting: boolean;
  isDirty: boolean;
}

// =============================================================================
// TIPOS DE ESTADO GLOBAL
// =============================================================================

export interface AuthState {
  user: User | null;
  supabaseUser: unknown | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  isLoading: boolean;
  rateLimitError: string | null;
}

export interface GoalsState {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface UIState {
  isOnline: boolean;
  activeModal: string | null;
  toasts: ToastMessage[];
  isLoading: Record<string, boolean>;
  errors: Record<string, string>;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

// =============================================================================
// TIPOS DE UTILIDAD
// =============================================================================

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type NonEmptyArray<T> = [T, ...T[]];

export type KeyOf<T> = keyof T;

export type ValueOf<T> = T[keyof T];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & Record<string, never>;

// =============================================================================
// TIPOS DE EVENTOS
// =============================================================================

export interface AppEvent {
  type: string;
  payload?: Record<string, unknown>;
  timestamp: number;
  userId?: string;
}

export interface AnalyticsEvent extends AppEvent {
  category: 'user_action' | 'error' | 'performance' | 'business';
  properties?: Record<string, string | number | boolean>;
}

// =============================================================================
// CONSTANTES DE TIPOS
// =============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const MIME_TYPES = {
  CSV: 'text/csv',
  JSON: 'application/json',
  PDF: 'application/pdf',
  EXCEL: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;
