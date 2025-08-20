import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { authInterceptor, RateLimitError } from '@/lib/auth-interceptor';
// import { cache } from '@/lib/cache'; // TODO: Use cache when needed
// import { ProfileSyncService } from './profile-sync.service'; // TODO: Implement profile sync

type User = Database['public']['Tables']['users']['Row'];

export class AuthService {
  /**
   * Registrar nuevo usuario con protección de rate limiting
   */
  static async signUp(
    email: string,
    password: string,
    metadata?: { country?: string; currency?: string }
  ) {
    const identifier = email.toLowerCase();

    try {
      return await authInterceptor.withRateLimit(
        'signup',
        identifier,
        async () => {
          logger.start(LogModule.AUTH, `Iniciando registro de nuevo usuario`, {
            email,
            metadata,
          });

          // 1. Crear cuenta en Supabase Auth
          const { data: authData, error: authError } =
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: metadata,
                emailRedirectTo: undefined, // No redirect for mobile
              },
            });

          if (authError) {
            logger.error(
              LogModule.AUTH,
              'Error al crear usuario en Supabase Auth',
              authError
            );
            throw authError;
          }

          if (!authData.user) {
            throw new Error('No se pudo crear el usuario');
          }

          logger.success(
            LogModule.AUTH,
            'Usuario creado en Auth exitosamente',
            {
              userId: authData.user.id,
              email: authData.user.email,
              sessionCreated: !!authData.session,
            }
          );

          // 2. Si tenemos sesión, establecerla inmediatamente
          if (authData.session) {
            logger.sync(
              LogModule.AUTH,
              'Estableciendo sesión del nuevo usuario'
            );
            await supabase.auth.setSession({
              access_token: authData.session.access_token,
              refresh_token: authData.session.refresh_token,
            });
            logger.success(LogModule.AUTH, 'Sesión establecida correctamente');
          }

          // 3. Esperar a que el trigger cree el perfil automáticamente
          logger.info(
            LogModule.AUTH,
            'Esperando creación automática del perfil...'
          );

          // Pequeña espera para que el trigger procese
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Verificar que el perfil fue creado
          const profile = await this.getUserProfile(authData.user.id);

          if (profile) {
            logger.success(LogModule.AUTH, 'Perfil creado automáticamente', {
              profileId: profile.id,
              createdAt: profile.created_at,
            });
          } else {
            logger.warn(
              LogModule.AUTH,
              'El perfil se creará automáticamente en el próximo login'
            );
          }

          logger.end(LogModule.AUTH, 'Registro completado exitosamente');
          return { user: authData.user, session: authData.session };
        }
      );
    } catch (error) {
      // Si es un error de rate limiting, mantener el mensaje original
      if (error instanceof RateLimitError) {
        logger.warn(LogModule.AUTH, 'Signup blocked by rate limiter', {
          email,
          retryAfterMs: error.retryAfterMs,
        });
        throw error;
      }

      logger.error(LogModule.AUTH, 'Error fatal en signUp', error);
      throw error;
    }
  }

  /**
   * Iniciar sesión con protección de rate limiting
   */
  static async signIn(email: string, password: string) {
    const identifier = email.toLowerCase();

    try {
      return await authInterceptor.withRateLimit(
        'login',
        identifier,
        async () => {
          logger.start(LogModule.AUTH, 'Iniciando sesión', { email });

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            logger.error(LogModule.AUTH, 'Error al iniciar sesión', error);
            throw error;
          }

          logger.success(LogModule.AUTH, 'Sesión iniciada exitosamente', {
            userId: data.user?.id,
            email: data.user?.email,
          });

          return { user: data.user, session: data.session };
        }
      );
    } catch (error) {
      // Si es un error de rate limiting, mantener el mensaje original
      if (error instanceof RateLimitError) {
        logger.warn(LogModule.AUTH, 'Login blocked by rate limiter', {
          email,
          retryAfterMs: error.retryAfterMs,
        });
        throw error;
      }

      logger.error(LogModule.AUTH, 'Error fatal en signIn', error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   */
  static async signOut() {
    try {
      logger.info(LogModule.AUTH, 'Cerrando sesión de usuario');

      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error(LogModule.AUTH, 'Error al cerrar sesión', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'Sesión cerrada exitosamente');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en signOut', error);
      throw error;
    }
  }

  /**
   * Obtener sesión actual
   */
  static async getSession() {
    try {
      logger.debug(LogModule.AUTH, 'Obteniendo sesión actual');

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logger.warn(LogModule.AUTH, 'Error obteniendo sesión', error);
        throw error;
      }

      logger.debug(LogModule.AUTH, 'Sesión obtenida', {
        hasSession: !!data.session,
        userId: data.session?.user?.id,
      });

      return data.session;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error obteniendo sesión', error);
      return null;
    }
  }

  /**
   * Obtener usuario actual
   */
  static async getCurrentUser() {
    try {
      logger.debug(LogModule.AUTH, 'Obteniendo usuario actual');

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        logger.warn(LogModule.AUTH, 'Error obteniendo usuario', error);
        throw error;
      }

      logger.debug(LogModule.AUTH, 'Usuario obtenido', {
        userId: user?.id,
        email: user?.email,
      });

      return user;
    } catch (error) {
      // Este es un error esperado cuando no hay sesión - no mostrar al usuario
      logger.devError(LogModule.AUTH, 'Error obteniendo usuario actual', error);
      return null;
    }
  }

  /**
   * Obtener perfil del usuario desde la tabla users
   * Versión simplificada sin validación compleja
   */
  static async getUserProfile(userId: string): Promise<User | null> {
    try {
      logger.database(LogModule.DB, 'Obteniendo perfil de usuario', { userId });

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Si el error es que no se encontró el perfil, no es un error crítico
        if (error.code === 'PGRST116') {
          logger.info(
            LogModule.DB,
            'Perfil no encontrado (esperado para usuarios nuevos)',
            { userId }
          );
          return null;
        }

        logger.error(LogModule.DB, 'Error obteniendo perfil de usuario', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Perfil obtenido exitosamente', {
        userId: data.id,
        email: data.email,
      });
      return data;
    } catch (error) {
      // Solo loguear como error si no es un error de "no encontrado"
      if (error?.code !== 'PGRST116') {
        logger.error(LogModule.DB, 'Error obteniendo perfil', error);
      }
      return null;
    }
  }

  /**
   * Obtener datos completos de usuario en una sola consulta (OPTIMIZACIÓN)
   * Combina: perfil, estado premium, desafíos completados y datos de gamificación
   */
  static async getUserCompleteData(userId: string) {
    try {
      logger.start(LogModule.DB, 'Obteniendo datos completos de usuario', {
        userId,
      });

      // Ejecutar todas las consultas en paralelo para optimizar tiempo
      const [
        profileResult,
        subscriptionsResult,
        challengesResult,
        xpResult,
        streakResult,
      ] = await Promise.allSettled([
        // Perfil del usuario
        supabase.from('users').select('*').eq('id', userId).single(),

        // Estado premium
        supabase
          .from('subscriptions')
          .select('status')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single(),

        // Contar desafíos completados
        supabase
          .from('user_challenges')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'done'),

        // XP total (si la tabla existe)
        supabase.from('user_xp_log').select('xp_earned').eq('user_id', userId),

        // Racha actual (si la tabla existe)
        supabase
          .from('user_streaks')
          .select('*')
          .eq('user_id', userId)
          .single(),
      ]);

      // Procesar resultados
      const profile =
        profileResult.status === 'fulfilled' && profileResult.value.data
          ? profileResult.value.data
          : null;

      const isPremium =
        subscriptionsResult.status === 'fulfilled' &&
        subscriptionsResult.value.data;

      const challengesCompleted =
        challengesResult.status === 'fulfilled'
          ? challengesResult.value.count || 0
          : 0;

      const totalXP =
        xpResult.status === 'fulfilled' && xpResult.value.data
          ? xpResult.value.data.reduce((sum, entry) => sum + entry.xp_earned, 0)
          : challengesCompleted * 50; // Fallback: 50 XP por desafío

      const streak =
        streakResult.status === 'fulfilled' && streakResult.value.data
          ? streakResult.value.data
          : null;

      logger.success(LogModule.DB, 'Datos completos obtenidos exitosamente', {
        userId,
        hasProfile: !!profile,
        isPremium: !!isPremium,
        challengesCompleted,
        totalXP,
        hasStreak: !!streak,
      });

      return {
        profile,
        isPremium: !!isPremium,
        challengesCompleted,
        totalXP,
        streak: streak?.current_streak || 0,
        level: Math.floor(totalXP / 100) + 1, // Cálculo simple de nivel
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo datos completos', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil del usuario
   */
  static async updateUserProfile(userId: string, updates: Partial<User>) {
    try {
      logger.info(LogModule.DB, 'Actualizando perfil de usuario', { userId });

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando perfil', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Perfil actualizado exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando perfil', error);
      throw error;
    }
  }

  /**
   * Solicitar restablecimiento de contraseña con protección de rate limiting
   */
  static async resetPassword(email: string) {
    const identifier = email.toLowerCase();

    try {
      return await authInterceptor.withRateLimit(
        'passwordReset',
        identifier,
        async () => {
          logger.info(
            LogModule.AUTH,
            'Solicitando restablecimiento de contraseña',
            { email }
          );

          const { error } = await supabase.auth.resetPasswordForEmail(email);

          if (error) {
            logger.error(LogModule.AUTH, 'Error en resetPassword', error);
            throw error;
          }

          logger.success(LogModule.AUTH, 'Email de restablecimiento enviado');
        }
      );
    } catch (error) {
      // Si es un error de rate limiting, mantener el mensaje original
      if (error instanceof RateLimitError) {
        logger.warn(LogModule.AUTH, 'Password reset blocked by rate limiter', {
          email,
          retryAfterMs: error.retryAfterMs,
        });
        throw error;
      }

      logger.error(LogModule.AUTH, 'Error fatal en resetPassword', error);
      throw error;
    }
  }

  /**
   * Actualizar contraseña
   */
  static async updatePassword(newPassword: string) {
    try {
      logger.info(LogModule.AUTH, 'Actualizando contraseña de usuario');

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error(LogModule.AUTH, 'Error actualizando contraseña', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'Contraseña actualizada exitosamente');
    } catch (error) {
      logger.error(
        LogModule.AUTH,
        'Error fatal actualizando contraseña',
        error
      );
      throw error;
    }
  }

  /**
   * Iniciar sesión con Magic Link/OTP
   */
  static async signInWithOTP(email: string, shouldCreateUser: boolean = false) {
    try {
      logger.start(LogModule.AUTH, 'Iniciando autenticación con OTP', {
        email,
      });

      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser,
          emailRedirectTo: undefined, // Para móvil no necesitamos redirect
        },
      });

      if (error) {
        logger.error(LogModule.AUTH, 'Error enviando OTP', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'OTP enviado exitosamente', {
        email,
        shouldCreateUser,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal en signInWithOTP', error);
      throw error;
    }
  }

  /**
   * Verificar OTP recibido por email con protección de rate limiting
   */
  static async verifyOTP(email: string, token: string) {
    const identifier = email.toLowerCase();

    try {
      return await authInterceptor.withRateLimit(
        'otpVerification',
        identifier,
        async () => {
          logger.start(LogModule.AUTH, 'Verificando OTP', {
            email,
            token: '***',
          });

          const { data, error } = await supabase.auth.verifyOtp({
            email,
            token,
            type: 'email',
          });

          if (error) {
            logger.error(LogModule.AUTH, 'Error verificando OTP', error);
            throw error;
          }

          if (!data.user) {
            throw new Error('No se pudo autenticar el usuario');
          }

          logger.success(LogModule.AUTH, 'OTP verificado exitosamente', {
            userId: data.user.id,
            email: data.user.email,
          });

          return { user: data.user, session: data.session };
        }
      );
    } catch (error) {
      // Si es un error de rate limiting, mantener el mensaje original
      if (error instanceof RateLimitError) {
        logger.warn(
          LogModule.AUTH,
          'OTP verification blocked by rate limiter',
          {
            email,
            retryAfterMs: error.retryAfterMs,
          }
        );
        throw error;
      }

      logger.error(LogModule.AUTH, 'Error fatal en verifyOTP', error);
      throw error;
    }
  }

  /**
   * Reenviar OTP
   */
  static async resendOTP(email: string) {
    try {
      logger.info(LogModule.AUTH, 'Reenviando OTP', { email });

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        logger.error(LogModule.AUTH, 'Error reenviando OTP', error);
        throw error;
      }

      logger.success(LogModule.AUTH, 'OTP reenviado exitosamente');
    } catch (error) {
      logger.error(LogModule.AUTH, 'Error fatal reenviando OTP', error);
      throw error;
    }
  }

  /**
   * Configurar listener de cambios de autenticación
   */
  static onAuthStateChange(
    callback: (event: string, session: unknown) => void
  ) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }

  /**
   * Verificar si el usuario es premium
   */
  static async checkPremiumStatus(userId: string): Promise<boolean> {
    try {
      logger.debug(LogModule.DB, 'Verificando estado premium', { userId });

      const { data, error } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.warn(LogModule.DB, 'Error verificando premium', error);
        return false;
      }

      const isPremium = !!data;
      logger.debug(LogModule.DB, 'Estado premium verificado', {
        userId,
        isPremium,
      });

      return isPremium;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal verificando premium', error);
      return false;
    }
  }
}
