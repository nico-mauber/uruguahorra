/**
 * Servicio de sincronización de perfiles de usuario
 * Resuelve race conditions entre Auth y Database
 * Implementa verificación inteligente con retry robusto
 */

import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import {
  withExponentialBackoff,
  RETRY_CONFIGS,
  RetryRateLimiter,
  type RetryConfig,
} from '@/utils/retry-utils';
import { UserSchema, UserInsertSchema, type User } from '@/schemas';
import { createSupabaseValidator } from '@/utils/supabase-validator';
import { sanitizeString } from '@/utils/validation-helpers';

// Validador para usuarios
const userValidator = createSupabaseValidator(UserSchema, 'users');

/**
 * Opciones para sincronización de perfil
 */
export interface ProfileSyncOptions {
  /**
   * Configuración de retry
   */
  retryConfig?: Partial<RetryConfig>;

  /**
   * Si debe crear el perfil si no existe
   */
  createIfNotExists?: boolean;

  /**
   * Datos para crear el perfil si no existe
   */
  userData?: {
    email: string;
    country?: string;
    currency?: string;
  };

  /**
   * Si debe validar la integridad del perfil
   */
  validateIntegrity?: boolean;

  /**
   * Callback para métricas
   */
  onMetrics?: (metrics: ProfileSyncMetrics) => void;
}

/**
 * Métricas de sincronización
 */
export interface ProfileSyncMetrics {
  userId: string;
  attempts: number;
  totalTime: number;
  success: boolean;
  createdManually: boolean;
  foundByTrigger: boolean;
  errors: string[];
}

/**
 * Configuración específica para sincronización de perfiles
 */
const PROFILE_SYNC_CONFIG: RetryConfig = {
  maxAttempts: 5,
  initialDelay: 100, // 100ms inicial
  maxDelay: 3000, // 3 segundos máximo por intento
  backoffMultiplier: 1.8, // Multiplicador más conservador
  jitterFactor: 0.3, // 30% de jitter
  timeout: 15000, // 15 segundos timeout total
  operationName: 'profile-sync',
};

/**
 * Rate limiter global para prevenir retry storms
 */
const profileSyncRateLimiter = new RetryRateLimiter(20, 2); // 20 tokens, 2 por segundo

/**
 * Servicio de sincronización de perfiles
 */
export class ProfileSyncService {
  /**
   * Espera a que el perfil esté disponible con retry inteligente
   */
  static async waitForProfile(
    userId: string,
    options: ProfileSyncOptions = {}
  ): Promise<User | null> {
    const {
      retryConfig = {},
      createIfNotExists = true,
      userData,
      validateIntegrity = true,
      onMetrics,
    } = options;

    const startTime = Date.now();
    const metrics: ProfileSyncMetrics = {
      userId,
      attempts: 0,
      totalTime: 0,
      success: false,
      createdManually: false,
      foundByTrigger: false,
      errors: [],
    };

    logger.info(LogModule.AUTH, 'Iniciando sincronización de perfil', {
      userId,
      createIfNotExists,
      hasUserData: !!userData,
    });

    try {
      // Configuración de retry específica para este caso
      const config: RetryConfig = {
        ...PROFILE_SYNC_CONFIG,
        ...retryConfig,
        onRetry: (attempt, delay, error) => {
          metrics.attempts = attempt;

          // Log específico para cada intento
          logger.debug(LogModule.AUTH, 'Reintentando verificación de perfil', {
            userId,
            attempt,
            delay,
            error: error instanceof Error ? error.message : String(error),
          });
        },
        shouldRetry: (error) => {
          // Solo reintentar si es un error de "no encontrado" o temporal
          if (error && typeof error === 'object' && 'code' in error) {
            const code = String((error as { code?: unknown }).code);
            // PGRST116 = Not found en Supabase
            // Esto es esperado si el trigger aún no ha creado el perfil
            if (code === 'PGRST116') {
              return true;
            }
          }

          // Errores de red/conexión son recuperables
          if (error instanceof Error) {
            const message = error.message.toLowerCase();
            if (
              message.includes('network') ||
              message.includes('timeout') ||
              message.includes('connection')
            ) {
              return true;
            }
          }

          return false;
        },
      };

      // Intentar obtener el perfil con retry
      const profile = await withExponentialBackoff(async () => {
        const response = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        // Si hay error pero no es "not found", lanzar
        if (response.error && response.error.code !== 'PGRST116') {
          throw response.error;
        }

        // Si no hay error, validar y retornar
        if (!response.error && response.data) {
          // Validar con Zod
          const validationResult = userValidator.validateSingle(
            response,
            'waitForProfile'
          );

          if (validationResult.success) {
            const profile = validationResult.data;

            // Validar integridad si es necesario
            if (validateIntegrity && profile) {
              this.validateProfileIntegrity(profile);
            }

            metrics.foundByTrigger = true;
            logger.success(LogModule.AUTH, 'Perfil encontrado por trigger', {
              userId,
              attempts: metrics.attempts + 1,
              timeElapsed: Date.now() - startTime,
            });

            return profile;
          }
        }

        // Si llegamos aquí, el perfil no existe todavía
        throw new Error('Profile not found yet');
      }, config);

      metrics.success = true;
      return profile;
    } catch (error) {
      // El retry falló, verificar si debemos crear manualmente
      logger.warn(LogModule.AUTH, 'No se pudo obtener perfil con retry', {
        userId,
        attempts: metrics.attempts,
        error: error instanceof Error ? error.message : String(error),
      });

      metrics.errors.push(
        error instanceof Error ? error.message : String(error)
      );

      // Si debemos crear el perfil manualmente
      if (createIfNotExists && userData) {
        try {
          logger.info(LogModule.AUTH, 'Creando perfil manualmente', { userId });

          const createdProfile = await this.createProfileManually(
            userId,
            userData
          );

          metrics.createdManually = true;
          metrics.success = true;

          logger.success(LogModule.AUTH, 'Perfil creado manualmente', {
            userId,
            email: createdProfile.email,
          });

          return createdProfile;
        } catch (createError) {
          logger.error(LogModule.AUTH, 'Error creando perfil manualmente', {
            userId,
            error: createError,
          });

          metrics.errors.push(
            createError instanceof Error
              ? createError.message
              : String(createError)
          );
        }
      }

      return null;
    } finally {
      metrics.totalTime = Date.now() - startTime;

      // Reportar métricas
      if (onMetrics) {
        onMetrics(metrics);
      }

      // Log final con métricas
      logger.info(
        LogModule.AUTH,
        'Sincronización de perfil completada',
        metrics
      );
    }
  }

  /**
   * Garantiza que el perfil existe, creándolo si es necesario
   */
  static async ensureProfileExists(
    userId: string,
    userData: {
      email: string;
      country?: string;
      currency?: string;
    }
  ): Promise<User> {
    logger.info(LogModule.AUTH, 'Garantizando existencia de perfil', {
      userId,
      email: userData.email,
    });

    // Primero intentar obtener con retry rápido
    const existingProfile = await this.waitForProfile(userId, {
      retryConfig: RETRY_CONFIGS.FAST,
      createIfNotExists: false,
      validateIntegrity: true,
    });

    if (existingProfile) {
      logger.info(LogModule.AUTH, 'Perfil ya existe', {
        userId,
        createdAt: existingProfile.created_at,
      });
      return existingProfile;
    }

    // Si no existe, crear
    return this.createProfileManually(userId, userData);
  }

  /**
   * Crea el perfil manualmente con validación
   */
  private static async createProfileManually(
    userId: string,
    userData: {
      email: string;
      country?: string;
      currency?: string;
    }
  ): Promise<User> {
    // Validar y sanitizar datos antes de insertar
    const profileData = UserInsertSchema.parse({
      id: userId,
      email: sanitizeString(userData.email, {
        lowercase: true,
        trim: true,
        maxLength: 254, // RFC limit for emails
      }),
      country: userData.country || 'UY',
      currency: userData.currency || 'UYU',
      premium: false,
      total_xp: 0,
      current_level: 1,
      current_streak: 0,
      longest_streak: 0,
      last_activity_date: new Date().toISOString().split('T')[0],
    });

    // Intentar crear con manejo de duplicados
    try {
      const response = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (response.error) {
        // Si es error de duplicado, intentar obtener el existente
        if (response.error.code === '23505') {
          // unique_violation
          logger.info(LogModule.AUTH, 'Perfil ya existe (creado por trigger)', {
            userId,
          });

          // Obtener el perfil existente
          const existingResponse = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (!existingResponse.error && existingResponse.data) {
            const profile = userValidator.assertSingle(
              existingResponse,
              'getExistingProfile'
            );

            if (profile) {
              return profile;
            }
          }
        }

        throw response.error;
      }

      // Validar respuesta
      const profile = userValidator.assertSingle(
        response,
        'createProfileManually'
      );

      if (!profile) {
        throw new Error('No se pudo crear el perfil');
      }

      return profile;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error en creación manual de perfil', {
        userId,
        error,
      });
      throw error;
    }
  }

  /**
   * Valida la integridad de un perfil
   */
  private static validateProfileIntegrity(profile: User): void {
    const issues: string[] = [];

    // Verificar campos críticos
    if (!profile.id) {
      issues.push('Missing user ID');
    }

    if (!profile.email) {
      issues.push('Missing email');
    }

    if (!profile.created_at) {
      issues.push('Missing created_at timestamp');
    }

    // Verificar valores por defecto sospechosos
    if (profile.current_level === 0) {
      issues.push('Invalid level (0)');
    }

    // Si hay problemas, loguear advertencia
    if (issues.length > 0) {
      logger.warn(LogModule.AUTH, 'Perfil con problemas de integridad', {
        userId: profile.id,
        issues,
        profile,
      });
    }
  }

  /**
   * Obtiene métricas de sincronización para monitoreo
   */
  static getMetrics(): {
    rateLimiterTokens: number;
  } {
    return {
      rateLimiterTokens: profileSyncRateLimiter.getAvailableTokens(),
    };
  }

  /**
   * Limpia el perfil de un usuario (para testing)
   */
  static async cleanupProfile(userId: string): Promise<void> {
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      const { error } = await supabase.from('users').delete().eq('id', userId);

      if (error) {
        logger.error(LogModule.AUTH, 'Error limpiando perfil', {
          userId,
          error,
        });
      }
    }
  }
}
