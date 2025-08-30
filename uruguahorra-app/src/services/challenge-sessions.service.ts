import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import { XPService } from '@/features/gamification/services/xp.service';
import type {
  UserChallengeSession,
  ChallengeDurationType,
  StartChallengeSessionParams,
  UpdateSessionProgressParams,
  RenewChallengeSessionParams,
  UserChallengeSessionsResponse,
  SessionFilters,
  UserChallengeStats,
  SessionWithChallenge,
} from '@/types/challenge-system.types';

/**
 * Servicio para gestionar las sesiones de retos de usuarios
 */
export class ChallengeSessionsService {
  /**
   * Inicia una nueva sesión de reto para un usuario
   */
  static async startChallengeSession(
    params: StartChallengeSessionParams
  ): Promise<UserChallengeSession> {
    try {
      logger.start(LogModule.DB, 'Iniciando nueva sesión de reto', params);

      // Verificar que el usuario no tenga ya 5 retos activos
      const activeCount = await this.getActiveSessionsCount(params.userId);
      if (activeCount >= 5) {
        throw new Error(
          'No puedes tener más de 5 retos activos simultáneamente'
        );
      }

      // Usar la función de base de datos para crear la sesión
      const { data, error } = await supabase.rpc('start_challenge_session', {
        p_user_id: params.userId,
        p_challenge_id: params.challengeId,
        p_duration_type: params.durationType,
      });

      if (error) {
        logger.error(LogModule.DB, 'Error iniciando sesión de reto', error);
        throw error;
      }

      const sessionId = data;

      // Obtener la sesión creada con toda la información
      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('No se pudo obtener la sesión creada');
      }

      // Actualizar configuraciones de notificación si se proporcionan
      if (params.notificationSettings || params.metadata) {
        await this.updateSessionSettings(sessionId, {
          notificationSettings: params.notificationSettings,
          metadata: params.metadata,
        });
      }

      logger.success(LogModule.DB, 'Sesión de reto iniciada exitosamente', {
        sessionId,
        challengeId: params.challengeId,
        durationType: params.durationType,
      });

      return session;
    } catch (error) {
      logger.error(LogModule.DB, 'Error iniciando sesión de reto', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las sesiones activas de un usuario
   */
  static async getUserActiveSessions(
    userId: string
  ): Promise<SessionWithChallenge[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo sesiones activas del usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('user_challenge_sessions')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo sesiones activas', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} sesiones activas obtenidas`,
        { userId, count: data?.length }
      );

      return (data as unknown as SessionWithChallenge[]) || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo sesiones activas', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial completo de sesiones de un usuario
   */
  static async getUserSessionsHistory(
    userId: string,
    filters?: SessionFilters
  ): Promise<UserChallengeSessionsResponse> {
    try {
      logger.start(LogModule.DB, 'Obteniendo historial de sesiones', {
        userId,
        filters,
      });

      let query = supabase
        .from('user_challenge_sessions')
        .select(
          `
          *,
          challenge:challenges(*)
        `
        )
        .eq('user_id', userId);

      // Aplicar filtros
      if (filters?.status) {
        const statuses = Array.isArray(filters.status)
          ? filters.status
          : [filters.status];
        query = query.in('status', statuses);
      }

      if (filters?.durationType) {
        const durations = Array.isArray(filters.durationType)
          ? filters.durationType
          : [filters.durationType];
        query = query.in('duration_type', durations);
      }

      if (filters?.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start)
          .lte('start_date', filters.dateRange.end);
      }

      const { data: allSessions, error } = await query.order('start_date', {
        ascending: false,
      });

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo historial', error);
        throw error;
      }

      const sessions = (allSessions as unknown as SessionWithChallenge[]) || [];

      // Separar sesiones por estado
      const activeSessions = sessions.filter((s) => s.status === 'active');
      const completedSessions = sessions.filter(
        (s) => s.status === 'completed'
      );

      // Calcular estadísticas
      const totalXpEarned = completedSessions.reduce(
        (sum, session) => sum + session.xp_earned,
        0
      );
      const completionRate =
        sessions.length > 0
          ? (completedSessions.length / sessions.length) * 100
          : 0;

      const response: UserChallengeSessionsResponse = {
        activeSessions,
        completedSessions,
        totalXpEarned,
        completionRate: Math.round(completionRate * 100) / 100,
      };

      logger.success(LogModule.DB, 'Historial de sesiones obtenido', {
        userId,
        totalSessions: sessions.length,
        activeSessions: activeSessions.length,
        completedSessions: completedSessions.length,
      });

      return response;
    } catch (error) {
      logger.error(LogModule.DB, 'Error obteniendo historial', error);
      throw error;
    }
  }

  /**
   * Actualiza el progreso de una sesión
   */
  static async updateSessionProgress(
    params: UpdateSessionProgressParams
  ): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Actualizando progreso de sesión', params);

      // Obtener la sesión actual
      const session = await this.getSessionById(params.sessionId);
      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      if (session.status !== 'active') {
        throw new Error(
          'Solo se puede actualizar el progreso de sesiones activas'
        );
      }

      // Validar el progreso
      const progress = Math.min(Math.max(params.progress, 0), 100);

      // Crear entrada en el log de progreso
      const progressLogEntry = {
        timestamp: new Date().toISOString(),
        progress,
        note: params.note,
        automated: params.automated || false,
      };

      const updatedProgressLog = [...session.progress_log, progressLogEntry];

      // Actualizar la sesión
      const { error } = await supabase
        .from('user_challenge_sessions')
        .update({
          progress,
          progress_log: updatedProgressLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.sessionId);

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando progreso', error);
        throw error;
      }

      // Si el progreso llegó a 100%, completar automáticamente
      if (progress >= 100) {
        await this.completeSession(params.sessionId);
      }

      logger.success(LogModule.DB, 'Progreso actualizado exitosamente', {
        sessionId: params.sessionId,
        progress,
        completed: progress >= 100,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando progreso', error);
      throw error;
    }
  }

  /**
   * Completa una sesión y otorga XP
   */
  static async completeSession(sessionId: string): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Completando sesión de reto', { sessionId });

      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      if (session.status === 'completed') {
        logger.warn(LogModule.DB, 'La sesión ya está completada', {
          sessionId,
        });
        return;
      }

      // Obtener información del reto para calcular XP
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('xp_reward')
        .eq('id', session.challenge_id)
        .single();

      if (challengeError || !challenge) {
        throw new Error('No se pudo obtener información del reto');
      }

      const xpEarned = challenge.xp_reward;
      const completedAt = new Date().toISOString();

      // Actualizar la sesión como completada
      const { error } = await supabase
        .from('user_challenge_sessions')
        .update({
          status: 'completed',
          progress: 100,
          xp_earned: xpEarned,
          completed_at: completedAt,
          updated_at: completedAt,
        })
        .eq('id', sessionId);

      if (error) {
        logger.error(LogModule.DB, 'Error completando sesión', error);
        throw error;
      }

      // Otorgar XP al usuario
      await XPService.awardXP(session.user_id, 'challenge_session_complete', {
        sessionId,
        challengeId: session.challenge_id,
        durationType: session.duration_type,
        xpAmount: xpEarned,
      });

      logger.success(LogModule.DB, 'Sesión completada exitosamente', {
        sessionId,
        xpEarned,
        userId: session.user_id,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error completando sesión', error);
      throw error;
    }
  }

  /**
   * Renueva una sesión completada con nueva duración
   */
  static async renewSession(
    params: RenewChallengeSessionParams
  ): Promise<UserChallengeSession> {
    try {
      logger.start(LogModule.DB, 'Renovando sesión de reto', params);

      const originalSession = await this.getSessionById(params.sessionId);
      if (!originalSession) {
        throw new Error('Sesión original no encontrada');
      }

      if (originalSession.status !== 'completed') {
        throw new Error('Solo se pueden renovar sesiones completadas');
      }

      // Verificar límite de sesiones activas
      const activeCount = await this.getActiveSessionsCount(
        originalSession.user_id
      );
      if (activeCount >= 5) {
        throw new Error(
          'No puedes tener más de 5 retos activos simultáneamente'
        );
      }

      // Crear nueva sesión basada en la original
      const newSession = await this.startChallengeSession({
        userId: originalSession.user_id,
        challengeId: originalSession.challenge_id,
        durationType: params.newDurationType,
        notificationSettings: originalSession.notification_settings,
        metadata: {
          ...originalSession.metadata,
          renewed: true,
          originalSessionId: params.sessionId,
        },
      });

      // Actualizar la sesión original para indicar que fue renovada
      await supabase
        .from('user_challenge_sessions')
        .update({
          status: 'renewed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.sessionId);

      // Actualizar la nueva sesión para referenciar la original
      await supabase
        .from('user_challenge_sessions')
        .update({
          renewed_from_session_id: params.sessionId,
        })
        .eq('id', newSession.id);

      logger.success(LogModule.DB, 'Sesión renovada exitosamente', {
        originalSessionId: params.sessionId,
        newSessionId: newSession.id,
        durationType: params.newDurationType,
      });

      return newSession;
    } catch (error) {
      logger.error(LogModule.DB, 'Error renovando sesión', error);
      throw error;
    }
  }

  /**
   * Función para expirar sesiones automáticamente (para cron jobs)
   */
  static async checkExpiredSessions(): Promise<number> {
    try {
      logger.start(LogModule.DB, 'Verificando sesiones expiradas');

      const { data, error } = await supabase.rpc('expire_challenge_sessions');

      if (error) {
        logger.error(LogModule.DB, 'Error expirando sesiones', error);
        throw error;
      }

      const expiredCount = data || 0;

      logger.success(LogModule.DB, `${expiredCount} sesiones expiradas`, {
        expiredCount,
      });

      return expiredCount;
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando expiraciones', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas completas del usuario
   */
  static async getUserStats(userId: string): Promise<UserChallengeStats> {
    try {
      logger.start(LogModule.DB, 'Obteniendo estadísticas del usuario', {
        userId,
      });

      const { data: sessions, error } = await supabase
        .from('user_challenge_sessions')
        .select(
          `
          *,
          challenge:challenges(category, difficulty)
        `
        )
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo estadísticas', error);
        throw error;
      }

      const allSessions = (sessions as any[]) || [];
      const completedSessions = allSessions.filter(
        (s) => s.status === 'completed'
      );

      // Calcular estadísticas
      const stats: UserChallengeStats = {
        totalSessionsStarted: allSessions.length,
        totalSessionsCompleted: completedSessions.length,
        totalXpEarned: completedSessions.reduce(
          (sum, s) => sum + (s.xp_earned || 0),
          0
        ),
        completionRate:
          allSessions.length > 0
            ? (completedSessions.length / allSessions.length) * 100
            : 0,
        averageSessionDuration: 0, // TODO: Calcular basado en start_date y completed_at
        favoriteChallengeCategory: null, // TODO: Calcular categoría más completada
        currentActiveSessionsCount: allSessions.filter(
          (s) => s.status === 'active'
        ).length,
        longestStreakDays: 0, // TODO: Implementar cálculo de racha
        categoriesCompleted: [
          ...new Set(
            completedSessions.map((s) => s.challenge?.category).filter(Boolean)
          ),
        ],
        difficultyBreakdown: {
          easy: {
            completed: completedSessions.filter(
              (s) => s.challenge?.difficulty === 'easy'
            ).length,
            total: allSessions.filter((s) => s.challenge?.difficulty === 'easy')
              .length,
          },
          medium: {
            completed: completedSessions.filter(
              (s) => s.challenge?.difficulty === 'medium'
            ).length,
            total: allSessions.filter(
              (s) => s.challenge?.difficulty === 'medium'
            ).length,
          },
          hard: {
            completed: completedSessions.filter(
              (s) => s.challenge?.difficulty === 'hard'
            ).length,
            total: allSessions.filter((s) => s.challenge?.difficulty === 'hard')
              .length,
          },
          expert: {
            completed: completedSessions.filter(
              (s) => s.challenge?.difficulty === 'expert'
            ).length,
            total: allSessions.filter(
              (s) => s.challenge?.difficulty === 'expert'
            ).length,
          },
        },
      };

      logger.success(LogModule.DB, 'Estadísticas calculadas', {
        userId,
        totalSessions: stats.totalSessionsStarted,
        completionRate: stats.completionRate,
      });

      return stats;
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculando estadísticas', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  /**
   * Obtiene una sesión por ID
   */
  private static async getSessionById(
    sessionId: string
  ): Promise<UserChallengeSession | null> {
    const { data, error } = await supabase
      .from('user_challenge_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Cuenta las sesiones activas de un usuario
   */
  private static async getActiveSessionsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('user_challenge_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) {
      throw error;
    }

    return count || 0;
  }

  /**
   * Actualiza configuraciones de una sesión
   */
  private static async updateSessionSettings(
    sessionId: string,
    settings: {
      notificationSettings?: Partial<
        UserChallengeSession['notification_settings']
      >;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void> {
    const updates: Partial<UserChallengeSession> = {
      updated_at: new Date().toISOString(),
    };

    if (settings.notificationSettings) {
      const session = await this.getSessionById(sessionId);
      if (session) {
        updates.notification_settings = {
          ...session.notification_settings,
          ...settings.notificationSettings,
        };
      }
    }

    if (settings.metadata) {
      updates.metadata = settings.metadata;
    }

    const { error } = await supabase
      .from('user_challenge_sessions')
      .update(updates)
      .eq('id', sessionId);

    if (error) {
      throw error;
    }
  }

  // ============================================
  // NUEVAS FUNCIONES PARA SEGUIMIENTO AUTOMÁTICO
  // ============================================

  /**
   * Registra check-in diario manual para un reto específico
   */
  static async recordDailyCheckin(
    userId: string,
    sessionId: string,
    completed: boolean = true,
    note?: string,
    checkinDate?: string
  ): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Registrando check-in diario de reto', {
        userId,
        sessionId,
        completed,
        note,
        checkinDate,
      });

      const { error } = await supabase.rpc('record_challenge_daily_checkin', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_completed: completed,
        p_checkin_date: checkinDate || new Date().toISOString().split('T')[0],
        p_note: note || null,
      });

      if (error) {
        logger.error(LogModule.DB, 'Error registrando check-in diario', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Check-in diario registrado exitosamente');
    } catch (error) {
      logger.error(LogModule.DB, 'Error registrando check-in diario', error);
      throw error;
    }
  }

  /**
   * Calcula el progreso real de una sesión basado en actividades completadas
   */
  static async calculateSessionRealProgress(sessionId: string): Promise<{
    currentProgress: number;
    daysCompleted: number;
    totalDaysRequired: number;
    isOnTrack: boolean;
  }> {
    try {
      logger.start(LogModule.DB, 'Calculando progreso real de sesión', {
        sessionId,
      });

      const { data, error } = await supabase.rpc(
        'calculate_challenge_session_progress',
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        logger.error(LogModule.DB, 'Error calculando progreso real', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No se pudo calcular el progreso de la sesión');
      }

      const result = data[0];
      const progressData = {
        currentProgress: Number(result.current_progress),
        daysCompleted: result.days_completed,
        totalDaysRequired: result.total_days_required,
        isOnTrack: result.is_on_track,
      };

      logger.success(LogModule.DB, 'Progreso real calculado', progressData);
      return progressData;
    } catch (error) {
      logger.error(LogModule.DB, 'Error calculando progreso real', error);
      throw error;
    }
  }

  /**
   * Actualiza el progreso basado en actividades reales (reemplaza updateSessionProgress manual)
   */
  static async updateSessionProgressFromActivity(
    sessionId: string,
    note?: string
  ): Promise<{
    currentProgress: number;
    daysCompleted: number;
    wasCompleted: boolean;
  }> {
    try {
      logger.start(LogModule.DB, 'Actualizando progreso desde actividad', {
        sessionId,
      });

      // Calcular progreso real
      const progressData = await this.calculateSessionRealProgress(sessionId);

      // Actualizar la sesión con el progreso real
      const progressLogEntry = {
        timestamp: new Date().toISOString(),
        progress: progressData.currentProgress,
        days_completed: progressData.daysCompleted,
        automated: true,
        note:
          note ||
          `Progreso automático: ${progressData.daysCompleted}/${progressData.totalDaysRequired} días completados`,
      };

      const session = await this.getSessionById(sessionId);
      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      const updatedProgressLog = [...session.progress_log, progressLogEntry];

      const { error } = await supabase
        .from('user_challenge_sessions')
        .update({
          progress: progressData.currentProgress,
          progress_log: updatedProgressLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando progreso', error);
        throw error;
      }

      let wasCompleted = false;

      // Si llegó a 100% y realmente completó todos los días, completar automáticamente
      if (
        progressData.currentProgress >= 100 &&
        progressData.daysCompleted >= progressData.totalDaysRequired
      ) {
        await this.completeSessionAutomatically(sessionId);
        wasCompleted = true;
      }

      logger.success(LogModule.DB, 'Progreso actualizado desde actividad', {
        sessionId,
        currentProgress: progressData.currentProgress,
        daysCompleted: progressData.daysCompleted,
        wasCompleted,
      });

      return {
        currentProgress: progressData.currentProgress,
        daysCompleted: progressData.daysCompleted,
        wasCompleted,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando progreso', error);
      throw error;
    }
  }

  /**
   * Completa sesión automáticamente con validaciones estrictas
   */
  static async completeSessionAutomatically(
    sessionId: string
  ): Promise<boolean> {
    try {
      logger.start(LogModule.DB, 'Completando sesión automáticamente', {
        sessionId,
      });

      const { data, error } = await supabase.rpc(
        'complete_challenge_session_automatically',
        {
          p_session_id: sessionId,
        }
      );

      if (error) {
        logger.error(LogModule.DB, 'Error completando sesión', error);
        throw error;
      }

      const wasCompleted = data;

      if (wasCompleted) {
        logger.success(LogModule.DB, 'Sesión completada automáticamente', {
          sessionId,
        });
      } else {
        logger.warn(
          LogModule.DB,
          'Sesión no pudo ser completada - requisitos no cumplidos',
          { sessionId }
        );
      }

      return wasCompleted;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error completando sesión automáticamente',
        error
      );
      throw error;
    }
  }

  /**
   * Actualiza todas las sesiones activas (para cron job diario)
   */
  static async updateAllActiveSessionsProgress(): Promise<{
    updatedSessions: number;
    completedSessions: number;
  }> {
    try {
      logger.start(LogModule.DB, 'Actualizando todas las sesiones activas');

      const { data, error } = await supabase.rpc(
        'update_all_active_sessions_progress'
      );

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando sesiones', error);
        throw error;
      }

      const result =
        data && data.length > 0
          ? data[0]
          : { updated_sessions: 0, completed_sessions: 0 };

      logger.success(LogModule.DB, 'Sesiones actualizadas exitosamente', {
        updatedSessions: result.updated_sessions,
        completedSessions: result.completed_sessions,
      });

      return {
        updatedSessions: result.updated_sessions,
        completedSessions: result.completed_sessions,
      };
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando sesiones activas', error);
      throw error;
    }
  }

  /**
   * Función para realizar check-in en un reto y actualizar progreso
   */
  static async performDailyCheckinAndUpdateProgress(
    userId: string,
    sessionId: string,
    completed: boolean = true,
    note?: string
  ): Promise<{
    currentProgress: number;
    daysCompleted: number;
    wasCompleted: boolean;
  }> {
    try {
      logger.start(
        LogModule.DB,
        'Realizando check-in y actualizando progreso',
        {
          userId,
          sessionId,
          completed,
          note,
        }
      );

      // 1. Registrar check-in diario
      await this.recordDailyCheckin(userId, sessionId, completed, note);

      // 2. Actualizar progreso de la sesión
      const result = await this.updateSessionProgressFromActivity(
        sessionId,
        `Check-in diario: ${completed ? 'Cumplido' : 'No cumplido'}${note ? ` - ${note}` : ''}`
      );

      logger.success(
        LogModule.DB,
        'Check-in y progreso actualizado exitosamente',
        {
          sessionId,
          currentProgress: result.currentProgress,
          daysCompleted: result.daysCompleted,
          wasCompleted: result.wasCompleted,
        }
      );

      return result;
    } catch (error) {
      logger.error(LogModule.DB, 'Error en check-in y actualización', error);
      throw error;
    }
  }

  /**
   * Verifica si ya se hizo check-in hoy para una sesión
   */
  static async getTodaysCheckinStatus(
    userId: string,
    sessionId: string
  ): Promise<{
    hasCheckedIn: boolean;
    completed?: boolean;
    note?: string;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_challenge_checkins')
        .select('completed, note')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .eq('checkin_date', today)
        .maybeSingle();

      if (error) {
        logger.error(LogModule.DB, 'Error verificando check-in de hoy', error);
        throw error;
      }

      if (data) {
        return {
          hasCheckedIn: true,
          completed: data.completed,
          note: data.note,
        };
      } else {
        return {
          hasCheckedIn: false,
        };
      }
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando check-in de hoy', error);
      throw error;
    }
  }
}
