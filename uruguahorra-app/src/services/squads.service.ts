import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type Squad = Database['public']['Tables']['squads']['Row'];
type SquadInsert = Database['public']['Tables']['squads']['Insert'];
type SquadUpdate = Database['public']['Tables']['squads']['Update'];
type SquadMember = Database['public']['Tables']['squad_members']['Row'];
type SquadMemberInsert =
  Database['public']['Tables']['squad_members']['Insert'];

// Tipos para contribuciones de squad (añadir cuando se generen los tipos)
type SquadContribution = {
  id: string;
  squad_id: string;
  user_id: string;
  amount: number;
  description?: string;
  source: string;
  created_at: string;
};

type SquadContributionInsert = {
  squad_id: string;
  user_id: string;
  amount: number;
  description?: string;
  source?: string;
};

export class SquadsService {
  /**
   * Crear un nuevo squad
   */
  static async createSquad(
    squad: Omit<SquadInsert, 'invite_code'>
  ): Promise<Squad> {
    try {
      logger.start(LogModule.DB, 'Creando nuevo squad', {
        name: squad.name,
        ownerId: squad.owner_id,
      });

      // Generar código de invitación único
      const inviteCode = this.generateInviteCode();

      const squadData: SquadInsert = {
        ...squad,
        created_by: squad.owner_id, // Agregar created_by con el mismo valor que owner_id
        invite_code: inviteCode,
      };

      const { data, error } = await supabase
        .from('squads')
        .insert(squadData)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error creando squad', error);
        throw error;
      }

      // Agregar al creador como miembro con rol admin (todos son admin ahora)
      await this.addSquadMember(data.id, squad.owner_id, 'admin');

      logger.success(LogModule.DB, 'Squad creado exitosamente', {
        squadId: data.id,
        inviteCode,
      });

      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal creando squad', error);
      throw error;
    }
  }

  /**
   * Obtener squads del usuario
   */
  static async getUserSquads(userId: string): Promise<
    (Squad & {
      memberRole: string;
      memberCount: number;
      totalSquadSaved: number;
      goalAmount: number;
    })[]
  > {
    try {
      logger.database(LogModule.DB, 'Obteniendo squads del usuario', {
        userId,
      });

      // Primero obtener los squads del usuario
      const { data, error } = await supabase
        .from('squad_members')
        .select(
          `
          role,
          squad:squads(*)
        `
        )
        .eq('user_id', userId)
        .eq('squad.is_active', true);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo squads del usuario',
          error
        );
        throw error;
      }

      // Ahora obtener el count de miembros y calcular el total ahorrado para cada squad
      const squadsWithCount = await Promise.all(
        (data || []).map(async (item: any) => {
          // Contar miembros del squad
          const { count, error: countError } = await supabase
            .from('squad_members')
            .select('*', { count: 'exact', head: true })
            .eq('squad_id', item.squad.id);

          if (countError) {
            logger.warn(LogModule.DB, 'Error contando miembros', countError);
          }

          // Obtener suma total de contribuciones del squad (no ahorros individuales)
          const { data: contributionsData, error: contributionsError } =
            await supabase
              .from('squad_contributions')
              .select('amount')
              .eq('squad_id', item.squad.id);

          let totalSquadSaved = 0;
          if (!contributionsError && contributionsData) {
            totalSquadSaved = contributionsData.reduce(
              (sum, contribution) =>
                sum + (parseFloat(contribution.amount.toString()) || 0),
              0
            );
          } else if (contributionsError) {
            logger.warn(
              LogModule.DB,
              'Error calculando contribuciones del squad',
              contributionsError
            );
            // Fallback: usar suma de ahorros individuales de los miembros
            const { data: membersData, error: sumError } = await supabase
              .from('squad_members')
              .select('total_saved')
              .eq('squad_id', item.squad.id);

            if (!sumError && membersData) {
              totalSquadSaved = membersData.reduce(
                (sum, member) => sum + (parseFloat(member.total_saved) || 0),
                0
              );
            }
          }

          return {
            ...item.squad,
            memberRole: item.role,
            memberCount: count || 0,
            totalSquadSaved, // Total ahorrado por todos los miembros
            goalAmount: item.squad.goal_amount || 10000, // Usar el valor real de BD o fallback
          };
        })
      );

      logger.success(
        LogModule.DB,
        `${squadsWithCount.length} squads del usuario obtenidos`
      );
      return squadsWithCount;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo squads del usuario',
        error
      );
      throw error;
    }
  }

  /**
   * Unirse a un squad por código de invitación
   */
  static async joinSquad(
    userId: string,
    inviteCode: string
  ): Promise<SquadMember> {
    try {
      logger.start(LogModule.DB, 'Usuario uniéndose a squad', {
        userId,
        inviteCode,
      });

      // Buscar squad por código de invitación
      const { data: squad, error: squadError } = await supabase
        .from('squads')
        .select('*')
        .eq('invite_code', inviteCode)
        .eq('is_active', true)
        .single();

      if (squadError || !squad) {
        logger.error(LogModule.DB, 'Squad no encontrado', squadError);
        throw new Error('Código de invitación inválido o squad inactivo');
      }

      // Verificar si ya es miembro
      const { data: existingMember, error: memberError } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squad.id)
        .eq('user_id', userId)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        logger.error(LogModule.DB, 'Error verificando membresía', memberError);
        throw memberError;
      }

      if (existingMember) {
        throw new Error('Ya eres miembro de este squad');
      }

      // Verificar límite de miembros
      const { count: memberCount, error: countError } = await supabase
        .from('squad_members')
        .select('*', { count: 'exact', head: true })
        .eq('squad_id', squad.id);

      if (countError) {
        logger.error(LogModule.DB, 'Error contando miembros', countError);
        throw countError;
      }

      if ((memberCount || 0) >= squad.max_members) {
        throw new Error('El squad está lleno');
      }

      // Agregar como admin (todos son admin ahora)
      const member = await this.addSquadMember(squad.id, userId, 'admin');

      logger.success(LogModule.DB, 'Usuario se unió al squad exitosamente', {
        squadId: squad.id,
        squadName: squad.name,
      });

      return member;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal uniéndose a squad', error);
      throw error;
    }
  }

  /**
   * Agregar miembro al squad
   */
  private static async addSquadMember(
    squadId: string,
    userId: string,
    role: 'owner' | 'admin' | 'member'
  ): Promise<SquadMember> {
    const memberData: SquadMemberInsert = {
      squad_id: squadId,
      user_id: userId,
      role,
      joined_at: new Date().toISOString(),
      total_saved: 0,
      monthly_saved: 0,
    };

    const { data, error } = await supabase
      .from('squad_members')
      .insert(memberData)
      .select()
      .single();

    if (error) {
      logger.error(LogModule.DB, 'Error agregando miembro a squad', error);
      throw error;
    }

    return data;
  }

  /**
   * Obtener miembros del squad
   */
  static async getSquadMembers(
    squadId: string
  ): Promise<(SquadMember & { user: unknown })[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo miembros del squad', {
        squadId,
      });

      const { data, error } = await supabase
        .from('squad_members')
        .select(
          `
          *,
          user:users(id, email, country, premium)
        `
        )
        .eq('squad_id', squadId)
        .order('total_saved', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo miembros del squad',
          error
        );
        throw error;
      }

      // Log para diagnosticar datos de usuarios
      logger.debug(LogModule.DB, 'Datos de miembros obtenidos:', {
        squadId,
        members: data?.map((m) => ({
          userId: m.user_id,
          hasUser: !!m.user,
          userEmail: m.user?.email || 'NO_EMAIL',
        })),
      });

      logger.success(
        LogModule.DB,
        `${data?.length || 0} miembros del squad obtenidos`
      );
      return (data as (SquadMember & { user: unknown })[]) || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo miembros del squad',
        error
      );
      throw error;
    }
  }

  /**
   * Actualizar estadísticas de ahorro del miembro
   */
  static async updateMemberSavings(
    userId: string,
    squadId: string
  ): Promise<void> {
    try {
      logger.info(LogModule.DB, 'Actualizando estadísticas de miembro', {
        userId,
        squadId,
      });

      // Calcular total ahorrado del usuario
      const { data: allContributions, error: totalError } = await supabase
        .from('micro_contributions')
        .select('amount')
        .eq('user_id', userId);

      if (totalError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones totales',
          totalError
        );
        throw totalError;
      }

      const totalSaved = (allContributions || []).reduce(
        (sum, c) => sum + c.amount,
        0
      );

      // Calcular ahorros del mes actual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const { data: monthlyContributions, error: monthlyError } = await supabase
        .from('micro_contributions')
        .select('amount')
        .eq('user_id', userId)
        .gte('created_at', currentMonth.toISOString());

      if (monthlyError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones mensuales',
          monthlyError
        );
        throw monthlyError;
      }

      const monthlySaved = (monthlyContributions || []).reduce(
        (sum, c) => sum + c.amount,
        0
      );

      // Actualizar estadísticas del miembro
      const { error: updateError } = await supabase
        .from('squad_members')
        .update({
          total_saved: totalSaved,
          monthly_saved: monthlySaved,
        })
        .eq('squad_id', squadId)
        .eq('user_id', userId);

      if (updateError) {
        logger.error(
          LogModule.DB,
          'Error actualizando estadísticas de miembro',
          updateError
        );
        throw updateError;
      }

      logger.success(LogModule.DB, 'Estadísticas de miembro actualizadas', {
        totalSaved,
        monthlySaved,
      });
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal actualizando estadísticas de miembro',
        error
      );
      throw error;
    }
  }

  /**
   * Salir del squad
   */
  static async leaveSquad(userId: string, squadId: string): Promise<void> {
    try {
      logger.warn(LogModule.DB, 'Usuario saliendo del squad', {
        userId,
        squadId,
      });

      // Verificar si es el propietario
      const { data: member, error: memberError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', userId)
        .single();

      if (memberError) {
        logger.error(
          LogModule.DB,
          'Error obteniendo información del miembro',
          memberError
        );
        throw memberError;
      }

      if (member?.role === 'owner') {
        throw new Error(
          'El propietario no puede salir del squad. Debe transferir la propiedad primero.'
        );
      }

      // Eliminar miembro
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', userId);

      if (error) {
        logger.error(LogModule.DB, 'Error eliminando miembro del squad', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Usuario salió del squad exitosamente');
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal saliendo del squad', error);
      throw error;
    }
  }

  /**
   * Actualizar squad
   */
  static async updateSquad(
    squadId: string,
    updates: SquadUpdate
  ): Promise<Squad> {
    try {
      logger.info(LogModule.DB, 'Actualizando squad', { squadId, updates });

      const { data, error } = await supabase
        .from('squads')
        .update(updates)
        .eq('id', squadId)
        .select()
        .single();

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando squad', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Squad actualizado exitosamente');
      return data;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal actualizando squad', error);
      throw error;
    }
  }

  /**
   * Eliminar squad (soft delete)
   */
  static async deleteSquad(squadId: string): Promise<void> {
    try {
      logger.warn(LogModule.DB, 'Eliminando squad', { squadId });

      const { error } = await supabase
        .from('squads')
        .update({ is_active: false })
        .eq('id', squadId);

      if (error) {
        logger.error(LogModule.DB, 'Error eliminando squad', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Squad eliminado exitosamente');
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal eliminando squad', error);
      throw error;
    }
  }

  /**
   * Buscar squads públicos
   */
  static async searchSquads(
    query: string,
    limit: number = 20
  ): Promise<Squad[]> {
    try {
      logger.database(LogModule.DB, 'Buscando squads', { query, limit });

      const { data, error } = await supabase
        .from('squads')
        .select('*')
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error(LogModule.DB, 'Error buscando squads', error);
        throw error;
      }

      logger.success(LogModule.DB, `${data?.length || 0} squads encontrados`);
      return data || [];
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal buscando squads', error);
      throw error;
    }
  }

  /**
   * Transferir propiedad del squad
   */
  static async transferOwnership(
    squadId: string,
    currentOwnerId: string,
    newOwnerId: string
  ): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Transfiriendo propiedad del squad', {
        squadId,
        currentOwnerId,
        newOwnerId,
      });

      // Verificar que el nuevo propietario sea miembro
      const { data: newOwner, error: newOwnerError } = await supabase
        .from('squad_members')
        .select('role')
        .eq('squad_id', squadId)
        .eq('user_id', newOwnerId)
        .single();

      if (newOwnerError || !newOwner) {
        throw new Error('El nuevo propietario debe ser miembro del squad');
      }

      // Actualizar roles
      const { error: updateCurrentError } = await supabase
        .from('squad_members')
        .update({ role: 'admin' })
        .eq('squad_id', squadId)
        .eq('user_id', currentOwnerId);

      if (updateCurrentError) {
        logger.error(
          LogModule.DB,
          'Error actualizando rol del propietario actual',
          updateCurrentError
        );
        throw updateCurrentError;
      }

      const { error: updateNewError } = await supabase
        .from('squad_members')
        .update({ role: 'owner' })
        .eq('squad_id', squadId)
        .eq('user_id', newOwnerId);

      if (updateNewError) {
        logger.error(
          LogModule.DB,
          'Error actualizando rol del nuevo propietario',
          updateNewError
        );
        throw updateNewError;
      }

      // Actualizar propietario en la tabla squads
      const { error: updateSquadError } = await supabase
        .from('squads')
        .update({ owner_id: newOwnerId })
        .eq('id', squadId);

      if (updateSquadError) {
        logger.error(
          LogModule.DB,
          'Error actualizando propietario del squad',
          updateSquadError
        );
        throw updateSquadError;
      }

      logger.success(
        LogModule.DB,
        'Propiedad del squad transferida exitosamente'
      );
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal transfiriendo propiedad', error);
      throw error;
    }
  }

  /**
   * Generar código de invitación único
   */
  private static generateInviteCode(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  }

  /**
   * Regenerar código de invitación
   */
  static async regenerateInviteCode(squadId: string): Promise<string> {
    try {
      logger.info(LogModule.DB, 'Regenerando código de invitación', {
        squadId,
      });

      const newInviteCode = this.generateInviteCode();

      const { error } = await supabase
        .from('squads')
        .update({ invite_code: newInviteCode })
        .eq('id', squadId);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error regenerando código de invitación',
          error
        );
        throw error;
      }

      logger.success(LogModule.DB, 'Código de invitación regenerado', {
        newInviteCode,
      });

      return newInviteCode;
    } catch (error) {
      logger.error(LogModule.DB, 'Error fatal regenerando código', error);
      throw error;
    }
  }

  // ============================================
  // MÉTODOS PARA CONTRIBUCIONES DE SQUAD
  // ============================================

  /**
   * Agregar contribución al squad
   */
  static async addSquadContribution(
    contribution: SquadContributionInsert
  ): Promise<SquadContribution> {
    try {
      logger.start(LogModule.DB, 'Agregando contribución al squad', {
        squadId: contribution.squad_id,
        userId: contribution.user_id,
        amount: contribution.amount,
      });

      // Verificar que el usuario es miembro del squad
      const { data: membership, error: memberError } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', contribution.squad_id)
        .eq('user_id', contribution.user_id)
        .single();

      if (memberError || !membership) {
        logger.error(LogModule.DB, 'Usuario no es miembro del squad', {
          squadId: contribution.squad_id,
          userId: contribution.user_id,
        });
        throw new Error('Solo los miembros del squad pueden contribuir');
      }

      // Insertar la contribución - los triggers actualizarán automáticamente los totales
      const { data: newContribution, error: contributionError } = await supabase
        .from('squad_contributions')
        .insert({
          ...contribution,
          source: contribution.source || 'manual',
        })
        .select()
        .single();

      if (contributionError) {
        logger.error(
          LogModule.DB,
          'Error insertando contribución de squad',
          contributionError
        );
        throw contributionError;
      }

      logger.success(
        LogModule.DB,
        'Contribución de squad agregada exitosamente (triggers actualizaron totales)',
        {
          contributionId: newContribution.id,
          amount: newContribution.amount,
        }
      );

      return newContribution as SquadContribution;
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error agregando contribución de squad',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contribuciones de un squad
   */
  static async getSquadContributions(
    squadId: string
  ): Promise<SquadContribution[]> {
    try {
      logger.start(LogModule.DB, 'Obteniendo contribuciones del squad', {
        squadId,
      });

      const { data, error } = await supabase
        .from('squad_contributions')
        .select('*')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones del squad',
          error
        );
        throw error;
      }

      logger.success(LogModule.DB, 'Contribuciones obtenidas exitosamente', {
        count: data?.length || 0,
      });

      return (data || []) as SquadContribution[];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error obteniendo contribuciones del squad',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contribuciones detalladas de un squad (con información del usuario)
   */
  static async getSquadContributionsDetailed(squadId: string): Promise<any[]> {
    try {
      logger.start(
        LogModule.DB,
        'Obteniendo contribuciones detalladas del squad',
        {
          squadId,
        }
      );

      const { data, error } = await supabase
        .from('squad_contributions_detailed')
        .select('*')
        .eq('squad_id', squadId);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones detalladas del squad',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        'Contribuciones detalladas obtenidas exitosamente',
        {
          count: data?.length || 0,
        }
      );

      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error obteniendo contribuciones detalladas del squad',
        error
      );
      throw error;
    }
  }

  /**
   * Obtener contribuciones de un usuario en un squad específico
   */
  static async getUserSquadContributions(
    squadId: string,
    userId: string
  ): Promise<SquadContribution[]> {
    try {
      logger.start(
        LogModule.DB,
        'Obteniendo contribuciones del usuario en el squad',
        {
          squadId,
          userId,
        }
      );

      const { data, error } = await supabase
        .from('squad_contributions')
        .select('*')
        .eq('squad_id', squadId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo contribuciones del usuario en el squad',
          error
        );
        throw error;
      }

      logger.success(
        LogModule.DB,
        'Contribuciones del usuario obtenidas exitosamente',
        {
          count: data?.length || 0,
        }
      );

      return (data || []) as SquadContribution[];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error obteniendo contribuciones del usuario en el squad',
        error
      );
      throw error;
    }
  }

  /**
   * Actualizar la meta del squad
   */
  static async updateSquadGoal(
    squadId: string,
    goalAmount: number,
    userId: string
  ): Promise<void> {
    try {
      logger.start(LogModule.DB, 'Actualizando meta del squad', {
        squadId,
        goalAmount,
        userId,
      });

      const { error } = await supabase
        .from('squads')
        .update({
          goal_amount: goalAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', squadId);

      if (error) {
        logger.error(LogModule.DB, 'Error actualizando meta del squad', error);
        throw error;
      }

      logger.success(LogModule.DB, 'Meta del squad actualizada exitosamente');
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal actualizando meta del squad',
        error
      );
      throw error;
    }
  }
}
