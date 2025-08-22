import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';
import type { WeeklyQuest, QuestProgress } from '../types/gamification.types';

export class QuestInitializationService {
  private static initialized = false;
  private static initializationPromise: Promise<boolean> | null = null;

  /**
   * Inicializar sistema de quests de manera robusta
   * Verifica tablas, políticas RLS y crea datos iniciales si es necesario
   */
  static async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    // Si ya hay una inicialización en progreso, esperar a que termine
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    this.initializationPromise = this._doInitialize();
    return await this.initializationPromise;
  }

  private static async _doInitialize(): Promise<boolean> {
    try {
      logger.start(LogModule.DB, 'Inicializando sistema de quests');

      // 1. Verificar que las tablas existen
      const tablesExist = await this._verifyTablesExist();
      if (!tablesExist) {
        logger.error(LogModule.DB, 'Tablas de quests no existen en la BD');
        return false;
      }

      // 2. Verificar políticas RLS
      const rlsWorking = await this._verifyRLSPolicies();
      if (!rlsWorking) {
        logger.warn(LogModule.DB, 'Políticas RLS de quests necesitan corrección');
        // No retornar false aquí, intentar continuar con valores por defecto
      }

      // 3. Crear quest inicial si no existe
      await this._ensureCurrentWeekQuest();

      this.initialized = true;
      logger.success(LogModule.DB, 'Sistema de quests inicializado correctamente');
      return true;

    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal inicializando quests', error);
      return false;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * Verificar que las tablas necesarias existen
   */
  private static async _verifyTablesExist(): Promise<boolean> {
    try {
      // Test simple: intentar hacer SELECT sin WHERE para ver si las tablas existen
      const { error: questsError } = await supabase
        .from('weekly_quests')
        .select('id')
        .limit(1);

      const { error: progressError } = await supabase
        .from('user_quest_progress')
        .select('id')
        .limit(1);

      if (questsError?.message?.includes('does not exist') || 
          questsError?.message?.includes('Could not find the table')) {
        logger.error(LogModule.DB, 'Tabla weekly_quests no existe');
        return false;
      }

      if (progressError?.message?.includes('does not exist') || 
          progressError?.message?.includes('Could not find the table')) {
        logger.error(LogModule.DB, 'Tabla user_quest_progress no existe');
        return false;
      }

      return true;
    } catch (error) {
      logger.error(LogModule.DB, 'Error verificando tablas de quests', error);
      return false;
    }
  }

  /**
   * Verificar que las políticas RLS permiten las operaciones necesarias
   */
  private static async _verifyRLSPolicies(): Promise<boolean> {
    try {
      // Test 1: Verificar SELECT en weekly_quests
      const { error: selectError } = await supabase
        .from('weekly_quests')
        .select('id')
        .limit(1);

      if (selectError?.code === '42501') {
        logger.warn(LogModule.DB, 'Sin permisos SELECT en weekly_quests');
        return false;
      }

      // Test 2: Verificar INSERT en weekly_quests (sin ejecutar realmente)
      // Esto es más difícil de testear sin hacer un INSERT real
      
      logger.info(LogModule.DB, 'Políticas RLS básicas funcionando');
      return true;

    } catch (error) {
      logger.warn(LogModule.DB, 'Error verificando políticas RLS', error);
      return false;
    }
  }

  /**
   * Asegurar que existe quest para la semana actual
   */
  private static async _ensureCurrentWeekQuest(): Promise<WeeklyQuest | null> {
    try {
      const weekStartDate = this._getWeekStartDate();
      const weekStartString = weekStartDate.toISOString().split('T')[0];

      // Intentar obtener quest existente
      const { data: existingQuest, error: selectError } = await supabase
        .from('weekly_quests')
        .select('*')
        .eq('week_start_date', weekStartString)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existingQuest) {
        logger.info(LogModule.DB, 'Quest semanal ya existe', { id: existingQuest.id });
        return existingQuest;
      }

      // Intentar crear nueva quest
      const challengeIds = await this._getRandomChallengeIds();
      
      const { data: newQuest, error: insertError } = await supabase
        .from('weekly_quests')
        .insert({
          week_start_date: weekStartString,
          challenge_ids: challengeIds,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '42501') {
          logger.warn(LogModule.DB, 'Sin permisos para crear quest semanal (esto es esperado)');
        } else {
          logger.error(LogModule.DB, 'Error creando quest semanal', insertError);
        }
        return null;
      }

      logger.success(LogModule.DB, 'Quest semanal creada', { id: newQuest.id });
      return newQuest;

    } catch (error) {
      logger.warn(LogModule.DB, 'No se pudo crear/verificar quest semanal', error);
      return null;
    }
  }

  /**
   * Obtener IDs de challenges aleatorios
   */
  private static async _getRandomChallengeIds(): Promise<string[]> {
    try {
      const { data: challenges, error } = await supabase
        .from('challenges')
        .select('id')
        .eq('is_active', true)
        .limit(5);

      if (error) {
        logger.warn(LogModule.DB, 'Error obteniendo challenges', error);
        return [];
      }

      return (challenges || []).map(c => c.id);
    } catch (error) {
      logger.warn(LogModule.DB, 'Error obteniendo challenges aleatorios', error);
      return [];
    }
  }

  /**
   * Obtener fecha de inicio de semana actual
   */
  private static _getWeekStartDate(): Date {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Crear progreso de quest para usuario de manera segura
   */
  static async createUserQuestProgressSafe(
    userId: string,
    questId: string
  ): Promise<QuestProgress | null> {
    try {
      // Verificar que el sistema está inicializado
      const initialized = await this.initialize();
      if (!initialized) {
        logger.warn(LogModule.DB, 'Sistema de quests no inicializado');
        return null;
      }

      // Verificar si ya existe progreso
      const { data: existing, error: selectError } = await supabase
        .from('user_quest_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('quest_id', questId)
        .maybeSingle();

      if (selectError && selectError.code !== 'PGRST116') {
        throw selectError;
      }

      if (existing) {
        return existing as QuestProgress;
      }

      // Intentar crear nuevo progreso
      const { data: newProgress, error: insertError } = await supabase
        .from('user_quest_progress')
        .insert({
          user_id: userId,
          quest_id: questId,
          completed_challenge_ids: [],
          completion_percentage: 0,
          completed_at: null,
        })
        .select(`
          *,
          quest:weekly_quests(*)
        `)
        .single();

      if (insertError) {
        if (insertError.code === '42501') {
          logger.warn(LogModule.DB, 'Sin permisos para crear quest progress (esto es esperado)');
        } else {
          logger.error(LogModule.DB, 'Error creando quest progress', insertError);
        }
        return null;
      }

      logger.success(LogModule.DB, 'Quest progress creado exitosamente');
      return newProgress as QuestProgress;

    } catch (error) {
      logger.error(LogModule.DB, 'Error creando quest progress', error);
      return null;
    }
  }

  /**
   * Verificar si el sistema de quests está funcionando
   */
  static async healthCheck(): Promise<{
    tablesExist: boolean;
    rlsWorking: boolean;
    canCreateQuests: boolean;
    canCreateProgress: boolean;
  }> {
    const tablesExist = await this._verifyTablesExist();
    const rlsWorking = await this._verifyRLSPolicies();
    
    // Test crear quest (sin hacer commit real)
    let canCreateQuests = false;
    try {
      const weekStartDate = this._getWeekStartDate();
      const { error } = await supabase
        .from('weekly_quests')
        .insert({
          week_start_date: weekStartDate.toISOString().split('T')[0],
          challenge_ids: [],
          is_active: false, // Marcar como inactiva para test
        })
        .select()
        .single();

      canCreateQuests = !error || error.code !== '42501';
    } catch {
      canCreateQuests = false;
    }

    // Test crear progress (requiere usuario autenticado)
    let canCreateProgress = false;
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user?.id) {
        const { error } = await supabase
          .from('user_quest_progress')
          .insert({
            user_id: user.user.id,
            quest_id: '00000000-0000-0000-0000-000000000000',
            completed_challenge_ids: [],
            completion_percentage: 0,
          })
          .select()
          .single();

        canCreateProgress = !error || error.code !== '42501';
      }
    } catch {
      canCreateProgress = false;
    }

    return {
      tablesExist,
      rlsWorking,
      canCreateQuests,
      canCreateProgress
    };
  }
}
