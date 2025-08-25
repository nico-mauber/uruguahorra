import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

/**
 * Servicio para manejar la gamificación específica de squads
 */
export class SquadGamificationService {
  /**
   * XP adicional que se otorga por participar en squads
   */
  private static readonly SQUAD_XP_MULTIPLIER = 1.25; // 25% adicional de XP
  private static readonly SQUAD_BONUS_XP = 5; // XP fijo adicional por ahorro en squad
  private static readonly SQUAD_MILESTONE_XP = 50; // XP por alcanzar milestone grupal

  /**
   * Calcular XP adicional para miembros de squads
   * @param baseXp XP base de la contribución
   * @param userId ID del usuario
   * @returns XP total incluyendo bonus de squad
   */
  static async calculateSquadBonusXp(
    baseXp: number,
    userId: string
  ): Promise<number> {
    try {
      logger.debug(LogModule.DB, 'Calculando XP bonus de squad', {
        baseXp,
        userId,
      });

      // Verificar si el usuario pertenece a algún squad activo
      const { data: squadMemberships, error } = await supabase
        .from('squad_members')
        .select(
          `
          id,
          squad_id,
          squads!inner (
            id,
            name,
            is_active
          )
        `
        )
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error consultando squads', error);
        return baseXp;
      }

      if (!squadMemberships || squadMemberships.length === 0) {
        logger.debug(LogModule.DB, 'Usuario no pertenece a squads');
        return baseXp;
      }

      // Calcular XP bonus
      const multipliedXp = Math.floor(baseXp * this.SQUAD_XP_MULTIPLIER);
      const bonusXp = multipliedXp - baseXp + this.SQUAD_BONUS_XP;
      const totalXp = baseXp + bonusXp;

      logger.success(LogModule.DB, 'XP de squad calculado', {
        baseXp,
        bonusXp,
        totalXp,
        squadsCount: squadMemberships.length,
      });

      return totalXp;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error calculando XP de squad',
        error
      );
      return baseXp; // Devolver XP base si hay error
    }
  }

  /**
   * Registrar evento de XP relacionado con squads
   * @param userId ID del usuario
   * @param eventType Tipo de evento
   * @param xpAmount Cantidad de XP otorgado
   * @param squadId ID del squad (opcional)
   * @param metadata Datos adicionales del evento
   */
  static async logSquadXpEvent(
    userId: string,
    eventType: string,
    xpAmount: number,
    squadId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase.from('user_xp_log').insert({
        user_id: userId,
        event_type: eventType,
        xp_amount: xpAmount,
        metadata: {
          squad_id: squadId,
          source: 'squad_gamification',
          ...metadata,
        },
        created_at: new Date().toISOString(),
      });

      if (error) {
        logger.error(LogModule.DB, 'Error guardando log XP', error);
        return;
      }

      logger.success(LogModule.DB, 'Evento XP de squad registrado', {
        userId,
        eventType,
        xpAmount,
        squadId,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error en log de XP de squad',
        error
      );
    }
  }

  /**
   * Verificar y otorgar badges por logros grupales
   * @param userId ID del usuario
   * @param squadId ID del squad
   */
  static async checkAndAwardSquadBadges(
    userId: string,
    squadId: string
  ): Promise<void> {
    try {
      logger.debug(LogModule.DB, 'Verificando badges de squad', {
        userId,
        squadId,
      });

      // Obtener estadísticas del usuario en el squad
      const { data: memberData, error: memberError } = await supabase
        .from('squad_members')
        .select('total_saved, monthly_saved, joined_at')
        .eq('user_id', userId)
        .eq('squad_id', squadId)
        .single();

      if (memberError || !memberData) {
        logger.warn(
          LogModule.DB,
          'No se encontraron datos del miembro',
          memberError
        );
        return;
      }

      // Obtener datos del squad para estadísticas grupales
      const { data: squadMembers, error: squadError } = await supabase
        .from('squad_members')
        .select('total_saved, monthly_saved')
        .eq('squad_id', squadId);

      if (squadError || !squadMembers) {
        logger.warn(
          LogModule.DB,
          'Error obteniendo miembros del squad',
          squadError
        );
        return;
      }

      await this.evaluateSquadBadges(userId, squadId, memberData, squadMembers);
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error verificando badges de squad',
        error
      );
    }
  }

  /**
   * Evaluar qué badges otorgar basado en las estadísticas
   */
  private static async evaluateSquadBadges(
    userId: string,
    squadId: string,
    memberData: any,
    squadMembers: any[]
  ): Promise<void> {
    const badges: { type: string; reason: string; xp: number }[] = [];

    // Badge: Top Saver (estar en top 3 del squad)
    const sortedMembers = [...squadMembers].sort(
      (a, b) => b.total_saved - a.total_saved
    );
    const userRank =
      sortedMembers.findIndex(
        (member) =>
          member.user_id === userId ||
          member.total_saved === memberData.total_saved
      ) + 1;

    if (userRank <= 3 && memberData.total_saved >= 1000) {
      badges.push({
        type: 'squad_top_saver',
        reason: `Top ${userRank} en el grupo`,
        xp: 100,
      });
    }

    // Badge: Consistent Saver (ahorro por 4 semanas consecutivas)
    const weeksInSquad = Math.floor(
      (Date.now() - new Date(memberData.joined_at).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );

    if (weeksInSquad >= 4 && memberData.monthly_saved > 0) {
      badges.push({
        type: 'squad_consistent_saver',
        reason: 'Ahorro constante por 4+ semanas',
        xp: 75,
      });
    }

    // Badge: Squad Milestone (contribuir a milestone grupal)
    const totalSquadSaved = squadMembers.reduce(
      (sum, member) => sum + member.total_saved,
      0
    );

    const milestones = [5000, 10000, 25000, 50000]; // Milestones grupales
    const achievedMilestone = milestones.find(
      (milestone) => totalSquadSaved >= milestone
    );

    if (
      achievedMilestone &&
      memberData.total_saved >= achievedMilestone * 0.1
    ) {
      // Usuario contribuyó al menos 10% del milestone
      badges.push({
        type: 'squad_milestone',
        reason: `Ayudó a alcanzar $${achievedMilestone} grupales`,
        xp: 150,
      });
    }

    // Otorgar badges encontrados
    for (const badge of badges) {
      await this.awardSquadBadge(userId, squadId, badge);
    }
  }

  /**
   * Otorgar un badge específico de squad
   */
  private static async awardSquadBadge(
    userId: string,
    squadId: string,
    badge: { type: string; reason: string; xp: number }
  ): Promise<void> {
    try {
      // Verificar si ya tiene este badge (evitar duplicados)
      const { data: existingBadge } = await supabase
        .from('user_xp_log')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', badge.type)
        .contains('metadata', { squad_id: squadId })
        .single();

      if (existingBadge) {
        logger.debug(
          LogModule.DB,
          'Badge ya otorgado anteriormente',
          badge
        );
        return;
      }

      // Otorgar el badge
      await this.logSquadXpEvent(userId, badge.type, badge.xp, squadId, {
        reason: badge.reason,
        badge_type: 'squad_achievement',
      });

      logger.success(LogModule.DB, 'Badge de squad otorgado', {
        userId,
        squadId,
        badge,
      });
    } catch (error) {
      logger.error(LogModule.DB, 'Error otorgando badge', error);
    }
  }

  /**
   * Obtener estadísticas de gamificación del squad
   * @param squadId ID del squad
   * @returns Estadísticas de gamificación
   */
  static async getSquadGamificationStats(squadId: string): Promise<{
    totalXpGenerated: number;
    topXpEarners: Array<{ userId: string; totalXp: number }>;
    recentAchievements: Array<{
      userId: string;
      eventType: string;
      xpAmount: number;
      createdAt: string;
    }>;
  }> {
    try {
      // Obtener miembros del squad
      const { data: squadMembers, error: membersError } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', squadId);

      if (membersError || !squadMembers) {
        logger.error(
          LogModule.DB,
          'Error obteniendo miembros',
          membersError
        );
        return {
          totalXpGenerated: 0,
          topXpEarners: [],
          recentAchievements: [],
        };
      }

      const userIds = squadMembers.map((m) => m.user_id);

      // Obtener logs de XP relacionados con squads para estos usuarios
      const { data: xpLogs, error: logsError } = await supabase
        .from('user_xp_log')
        .select('user_id, event_type, xp_amount, created_at, metadata')
        .in('user_id', userIds)
        .contains('metadata', { squad_id: squadId })
        .order('created_at', { ascending: false });

      if (logsError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo logs XP',
          logsError
        );
        return {
          totalXpGenerated: 0,
          topXpEarners: [],
          recentAchievements: [],
        };
      }

      // Calcular estadísticas
      const totalXpGenerated = (xpLogs || []).reduce(
        (sum, log) => sum + log.xp_amount,
        0
      );

      const userXpMap = new Map<string, number>();
      (xpLogs || []).forEach((log) => {
        const current = userXpMap.get(log.user_id) || 0;
        userXpMap.set(log.user_id, current + log.xp_amount);
      });

      const topXpEarners = Array.from(userXpMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId, totalXp]) => ({ userId, totalXp }));

      const recentAchievements = (xpLogs || []).slice(0, 10).map((log) => ({
        userId: log.user_id,
        eventType: log.event_type,
        xpAmount: log.xp_amount,
        createdAt: log.created_at,
      }));

      return { totalXpGenerated, topXpEarners, recentAchievements };
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error obteniendo stats de gamificación',
        error
      );
      return { totalXpGenerated: 0, topXpEarners: [], recentAchievements: [] };
    }
  }
}
