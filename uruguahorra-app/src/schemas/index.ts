/**
 * Esquemas de validación runtime con Zod
 * Previene CWE-20: Improper Input Validation
 *
 * Estos esquemas validan datos en runtime, complementando
 * el type checking de TypeScript que solo funciona en compile time
 */

import { z } from 'zod';

// ============================================
// ESQUEMAS BASE Y COMUNES
// ============================================

/**
 * UUID v4 válido
 */
export const UUIDSchema = z.string().uuid({
  message: 'ID inválido',
});

/**
 * Email válido
 */
export const EmailSchema = z.string().email({
  message: 'Email inválido',
});

/**
 * Fecha ISO 8601
 */
export const DateTimeSchema = z.string().datetime({
  message: 'Fecha inválida',
});

/**
 * Fecha simple YYYY-MM-DD
 */
export const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Fecha debe ser formato YYYY-MM-DD',
});

/**
 * Monto monetario positivo
 */
export const MoneyAmountSchema = z
  .number()
  .positive({ message: 'El monto debe ser positivo' })
  .finite({ message: 'El monto debe ser un número válido' })
  .transform((val) => Math.round(val * 100) / 100); // Redondear a 2 decimales

/**
 * Porcentaje válido (0-100)
 */
export const PercentageSchema = z
  .number()
  .min(0, { message: 'El porcentaje debe ser mayor o igual a 0' })
  .max(100, { message: 'El porcentaje debe ser menor o igual a 100' });

/**
 * Código de país ISO
 */
export const CountryCodeSchema = z
  .string()
  .length(2, { message: 'Código de país debe ser de 2 caracteres' })
  .toUpperCase();

/**
 * Código de moneda ISO
 */
export const CurrencyCodeSchema = z
  .string()
  .length(3, { message: 'Código de moneda debe ser de 3 caracteres' })
  .toUpperCase();

// ============================================
// ESQUEMA DE USUARIO
// ============================================

// Schema base de usuario
const UserBaseSchema = z.object({
  id: UUIDSchema,
  email: EmailSchema,
  country: CountryCodeSchema.nullable().default('UY'),
  currency: CurrencyCodeSchema.nullable().default('UYU'),
  premium: z.boolean().default(false),
  total_xp: z.number().int().min(0).default(0),
  current_level: z.number().int().min(1).default(1),
  current_streak: z.number().int().min(0).default(0),
  longest_streak: z.number().int().min(0).default(0),
  last_activity_date: DateSchema.nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema.optional(),
});

export const UserSchema = UserBaseSchema;

export type User = z.infer<typeof UserSchema>;

/**
 * Esquema para crear usuario
 */
export const UserInsertSchema = UserBaseSchema.omit({
  created_at: true,
  updated_at: true,
}).partial({
  total_xp: true,
  current_level: true,
  current_streak: true,
  longest_streak: true,
  last_activity_date: true,
});

export type UserInsert = z.infer<typeof UserInsertSchema>;

/**
 * Esquema para actualizar usuario
 */
export const UserUpdateSchema = UserBaseSchema.partial().omit({
  id: true,
  email: true,
  created_at: true,
});

export type UserUpdate = z.infer<typeof UserUpdateSchema>;

// ============================================
// ESQUEMA DE META (GOAL)
// ============================================

export const GoalTypeSchema = z.enum([
  'savings',
  'emergency_fund',
  'vacation',
  'home',
  'vehicle',
  'education',
  'investment',
  'other',
]);

export type GoalType = z.infer<typeof GoalTypeSchema>;

// Schema base sin refinamientos
const GoalBaseSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  name: z
    .string()
    .min(1, { message: 'El nombre es requerido' })
    .max(100, { message: 'El nombre es muy largo' }),
  description: z.string().max(500).nullable(),
  type: GoalTypeSchema,
  target_amount: MoneyAmountSchema,
  current_amount: MoneyAmountSchema.default(0),
  deadline: DateSchema.nullable(),
  is_active: z.boolean().default(true),
  is_completed: z.boolean().default(false),
  progress_percentage: PercentageSchema.default(0),
  monthly_target: MoneyAmountSchema.nullable(),
  vacation_destination: z.string().max(100).nullable(),
  vacation_duration_days: z.number().int().min(1).nullable(),
  home_type: z.string().max(50).nullable(),
  home_location: z.string().max(200).nullable(),
  vehicle_brand: z.string().max(50).nullable(),
  vehicle_model: z.string().max(50).nullable(),
  vehicle_year: z.number().int().min(1900).max(2030).nullable(),
  education_institution: z.string().max(200).nullable(),
  education_program: z.string().max(200).nullable(),
  education_duration_months: z.number().int().min(1).nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema.optional(),
});

// Schema con refinamientos
export const GoalSchema = GoalBaseSchema.refine(
  (data) => {
    // Validar que current_amount no exceda target_amount
    return data.current_amount <= data.target_amount;
  },
  {
    message: 'El monto actual no puede exceder el monto objetivo',
    path: ['current_amount'],
  }
).refine(
  (data) => {
    // Si hay deadline, debe ser futura
    if (data.deadline) {
      return new Date(data.deadline) > new Date();
    }
    return true;
  },
  {
    message: 'La fecha límite debe ser futura',
    path: ['deadline'],
  }
);

export type Goal = z.infer<typeof GoalSchema>;

// Usar GoalBaseSchema para omit y partial
export const GoalInsertSchema = GoalBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  progress_percentage: true,
}).partial({
  current_amount: true,
  is_active: true,
  is_completed: true,
});

export type GoalInsert = z.infer<typeof GoalInsertSchema>;

export const GoalUpdateSchema = GoalBaseSchema.partial().omit({
  id: true,
  user_id: true,
  created_at: true,
});

export type GoalUpdate = z.infer<typeof GoalUpdateSchema>;

// ============================================
// ESQUEMA DE TRANSACCIÓN
// ============================================

// ============================================
// ESQUEMAS DE CATEGORÍAS DE TRANSACCIONES
// ============================================

export const TransactionCategorySchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  emoji: z.string().min(1).max(10),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hexadecimal válido'),
  type: z.enum(['expense', 'income', 'transfer']),
  is_default: z.boolean().default(false),
  sort_order: z.number().int().min(0).default(0),
  created_at: DateTimeSchema.optional(),
});

export type TransactionCategory = z.infer<typeof TransactionCategorySchema>;

export const TransactionCategoryInsertSchema = TransactionCategorySchema.omit({
  id: true,
  created_at: true,
});

export type TransactionCategoryInsert = z.infer<
  typeof TransactionCategoryInsertSchema
>;

// ============================================
// ESQUEMAS DE TRANSACCIONES COMPLETAS
// ============================================

/**
 * Escala de humor (1-5)
 */
export const MoodSchema = z.number().int().min(1).max(5).optional();

/**
 * Nivel de arrepentimiento (0-10)
 */
export const RegretLevelSchema = z.number().int().min(0).max(10).optional();

/**
 * Nivel de necesidad (1-5)
 */
export const NecessityLevelSchema = z.number().int().min(1).max(5).optional();

/**
 * Tipo de transacción
 */
export const TransactionTypeSchema = z.enum(['expense', 'income', 'transfer']);

/**
 * Método de pago
 */
export const PaymentMethodSchema = z
  .enum([
    'cash',
    'debit_card',
    'credit_card',
    'bank_transfer',
    'mobile_payment',
    'other',
  ])
  .optional();

// Schema base de transacción (nueva versión completa)
const TransactionBaseSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  goal_id: UUIDSchema.nullable().optional(),
  squad_id: UUIDSchema.nullable().optional(),

  // Información básica
  amount: MoneyAmountSchema,
  description: z.string().max(500).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  transaction_date: DateSchema.default(
    () => new Date().toISOString().split('T')[0]
  ),

  // Categorización
  category_id: UUIDSchema.nullable().optional(),
  category_name: z.string().max(100).nullable().optional(), // Backup
  category_emoji: z.string().max(10).nullable().optional(), // Cache

  // Metadata psicológica
  type: TransactionTypeSchema,
  mood_before: MoodSchema,
  mood_after: MoodSchema,
  regret_level: RegretLevelSchema,
  necessity_level: NecessityLevelSchema,

  // Contexto adicional
  location: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().max(50)).nullable().optional(),
  payment_method: PaymentMethodSchema,

  // Gamification
  xp_earned: z.number().int().min(0).default(0),
  achievements_unlocked: z.array(z.string()).nullable().optional(),

  // Metadata técnica
  created_at: DateTimeSchema.optional(),
  updated_at: DateTimeSchema.optional(),
  deleted_at: DateTimeSchema.nullable().optional(),
});

export const TransactionSchema = TransactionBaseSchema;

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Schema para crear transacciones (omite campos auto-generados)
 */
export const TransactionInsertSchema = TransactionBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  category_name: true,
  category_emoji: true,
  xp_earned: true,
});

export type TransactionInsert = z.infer<typeof TransactionInsertSchema>;

/**
 * Schema para actualizar transacciones
 */
export const TransactionUpdateSchema = TransactionBaseSchema.omit({
  id: true,
  user_id: true,
  created_at: true,
  updated_at: true,
}).partial();

export type TransactionUpdate = z.infer<typeof TransactionUpdateSchema>;

/**
 * Schema para entrada rápida de transacciones (3-tap)
 */
export const QuickTransactionSchema = z.object({
  amount: MoneyAmountSchema,
  category_id: UUIDSchema,
  description: z.string().max(500).optional(),
  type: TransactionTypeSchema.optional(), // Se puede inferir de la categoría
});

export type QuickTransaction = z.infer<typeof QuickTransactionSchema>;

// ============================================
// ESQUEMAS DE ANALYTICS E INSIGHTS
// ============================================

export const SpendingInsightSchema = z.object({
  period_days: z.number().int().positive(),
  total_spent: z.number(),
  avg_daily_spend: z.number(),
  avg_transaction_amount: z.number(),
  most_expensive_category: z.string().nullable(),
  most_frequent_category: z.string().nullable(),
  top_categories: z
    .array(
      z.object({
        category_id: UUIDSchema.nullable(),
        category_name: z.string().nullable(),
        category_color: z.string().nullable(),
        total_amount: z.number(),
        transaction_count: z.number().int(),
      })
    )
    .optional(),
  psychology: z.object({
    avg_regret_level: z.number().min(0).max(10),
    avg_necessity_level: z.number().min(1).max(5),
    mood_impact: z.number().min(-4).max(4), // cambio de humor
  }),
});

export type SpendingInsight = z.infer<typeof SpendingInsightSchema>;

/**
 * Schema para filtros de transacciones
 */
export const TransactionFiltersSchema = z.object({
  user_id: UUIDSchema,
  start_date: DateSchema.optional(),
  end_date: DateSchema.optional(),
  category_ids: z.array(UUIDSchema).optional(),
  types: z.array(TransactionTypeSchema).optional(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().min(0).optional(),
  search: z.string().max(200).optional(),
  goal_id: UUIDSchema.nullable().optional(),
  squad_id: UUIDSchema.nullable().optional(),
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;

// ============================================
// ESQUEMA DE CONTRIBUCIÓN
// ============================================

export const ContributionSourceSchema = z.enum([
  'manual',
  'automatic',
  'roundup',
  'cashback',
  'interest',
]);

export type ContributionSource = z.infer<typeof ContributionSourceSchema>;

// Schema base de contribución
const ContributionBaseSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  goal_id: UUIDSchema,
  amount: MoneyAmountSchema,
  source: ContributionSourceSchema,
  description: z.string().max(500).nullable(),
  transaction_id: UUIDSchema.nullable(),
  created_at: DateTimeSchema,
});

export const ContributionSchema = ContributionBaseSchema;

export type Contribution = z.infer<typeof ContributionSchema>;

export const ContributionInsertSchema = ContributionBaseSchema.omit({
  id: true,
}).partial({
  created_at: true,
});

export type ContributionInsert = z.infer<typeof ContributionInsertSchema>;

// ============================================
// ESQUEMA DE SUSCRIPCIÓN
// ============================================

export const SubscriptionPlanSchema = z.enum(['free', 'premium', 'pro']);
export const SubscriptionStatusSchema = z.enum([
  'active',
  'canceled',
  'expired',
  'trial',
]);
export const SubscriptionProviderSchema = z.enum(['mercadopago']);

// Schema base sin refinamientos
const SubscriptionBaseSchema = z.object({
  id: UUIDSchema,
  user_id: UUIDSchema,
  plan: SubscriptionPlanSchema,
  status: SubscriptionStatusSchema,
  provider: SubscriptionProviderSchema.nullable(),
  provider_subscription_id: z.string().max(200).nullable(),
  start_date: DateTimeSchema,
  end_date: DateTimeSchema.nullable(),
  trial_end_date: DateTimeSchema.nullable(),
  auto_renew: z.boolean().default(true),
  price: MoneyAmountSchema.nullable(),
  currency: CurrencyCodeSchema.nullable(),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema.optional(),
});

// Schema con refinamientos
export const SubscriptionSchema = SubscriptionBaseSchema.refine(
  (data) => {
    // Si hay end_date, debe ser posterior a start_date
    if (data.end_date) {
      return new Date(data.end_date) > new Date(data.start_date);
    }
    return true;
  },
  {
    message: 'La fecha de fin debe ser posterior a la fecha de inicio',
    path: ['end_date'],
  }
);

export type Subscription = z.infer<typeof SubscriptionSchema>;

// Usar SubscriptionBaseSchema para omit y partial
export const SubscriptionInsertSchema = SubscriptionBaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
}).partial({
  auto_renew: true,
});

export type SubscriptionInsert = z.infer<typeof SubscriptionInsertSchema>;

// ============================================
// ESQUEMA DE DESAFÍO
// ============================================

export const ChallengeDifficultySchema = z.enum([
  'easy',
  'medium',
  'hard',
  'expert',
]);
export const ChallengeFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'once',
]);

export const ChallengeSchema = z.object({
  id: UUIDSchema,
  title: z
    .string()
    .min(1, { message: 'El título es requerido' })
    .max(200, { message: 'El título es muy largo' }),
  description: z.string().max(1000),
  difficulty: ChallengeDifficultySchema,
  frequency: ChallengeFrequencySchema,
  xp_reward: z.number().int().min(0),
  target_amount: MoneyAmountSchema.nullable(),
  target_days: z.number().int().min(1).nullable(),
  target_transactions: z.number().int().min(1).nullable(),
  icon: z.string().max(50).nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .nullable(),
  is_active: z.boolean().default(true),
  created_at: DateTimeSchema,
  updated_at: DateTimeSchema.optional(),
});

export type Challenge = z.infer<typeof ChallengeSchema>;

// ============================================
// ESQUEMAS DE PAGINACIÓN Y FILTROS
// ============================================

export const PaginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1, { message: 'El límite debe ser al menos 1' })
    .max(100, { message: 'El límite máximo es 100' })
    .default(20),
  offset: z
    .number()
    .int()
    .min(0, { message: 'El offset debe ser positivo' })
    .default(0),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const DateRangeSchema = z
  .object({
    start: DateSchema,
    end: DateSchema,
  })
  .refine(
    (data) => {
      return new Date(data.end) >= new Date(data.start);
    },
    {
      message:
        'La fecha de fin debe ser posterior o igual a la fecha de inicio',
      path: ['end'],
    }
  );

export type DateRange = z.infer<typeof DateRangeSchema>;

// ============================================
// ESQUEMAS DE RESPUESTA DE API
// ============================================

/**
 * Respuesta exitosa de Supabase
 */
export const SupabaseSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    error: z.null(),
  });

/**
 * Respuesta de error de Supabase
 */
export const SupabaseErrorSchema = z.object({
  data: z.null(),
  error: z.object({
    message: z.string(),
    code: z.string().optional(),
    details: z.string().optional(),
    hint: z.string().optional(),
  }),
});

/**
 * Respuesta de Supabase (unión discriminada)
 */
export const SupabaseResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('error', [
    z.object({
      data: dataSchema,
      error: z.null(),
    }),
    z.object({
      data: z.null(),
      error: z.object({
        message: z.string(),
        code: z.string().optional(),
        details: z.string().optional(),
        hint: z.string().optional(),
      }),
    }),
  ]);

// ============================================
// HELPERS DE VALIDACIÓN
// ============================================

/**
 * Valida y transforma datos con manejo de errores
 */
export function validateData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  _options?: {
    strict?: boolean;
    abortEarly?: boolean;
  }
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
}

/**
 * Valida datos y lanza error si falla
 */
export function assertValidData<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorMessage?: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const error = new Error(errorMessage || 'Validation failed');
    (error as Record<string, unknown>).validationErrors = result.error.errors;
    throw error;
  }

  return result.data;
}

/**
 * Crea un validador reutilizable
 */
export function createValidator<T>(schema: z.ZodType<T>) {
  return {
    parse: (data: unknown): T => schema.parse(data),
    safeParse: (data: unknown) => schema.safeParse(data),
    validate: (data: unknown) => validateData(schema, data),
    assert: (data: unknown, errorMessage?: string) =>
      assertValidData(schema, data, errorMessage),
    isValid: (data: unknown): boolean => schema.safeParse(data).success,
  };
}
