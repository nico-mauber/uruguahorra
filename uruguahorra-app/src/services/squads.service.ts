import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/supabase';
import { logger, LogModule } from '@/utils/logger';

type Squad = Database['public']['Tables']['squads']['Row'];
type SquadInsert = Database['public']['Tables']['squads']['Insert'];
type SquadUpdate = Database['public']['Tables']['squads']['Update'];
type SquadMember = Database['public']['Tables']['squad_members']['Row'];
type SquadMemberInsert =
  Database['public']['Tables']['squad_members']['Insert'];

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

      // Agregar al creador como miembro con rol owner
      await this.addSquadMember(data.id, squad.owner_id, 'owner');

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
  static async getUserSquads(
    userId: string
  ): Promise<(Squad & { memberRole: string; memberCount: number })[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo squads del usuario', {
        userId,
      });

      const { data, error } = await supabase
        .from('squad_members')
        .select(
          `
          role,
          squad:squads(*),
          squads!inner(
            *,
            squad_members(count)
          )
        `
        )
        .eq('user_id', userId)
        .eq('squads.is_active', true);

      if (error) {
        logger.error(
          LogModule.DB,
          'Error obteniendo squads del usuario',
          error
        );
        throw error;
      }

      const squads = (data || []).map((item: any) => ({
        ...item.squad,
        memberRole: item.role,
        memberCount: item.squad.squad_members?.[0]?.count || 0,
      }));

      logger.success(
        LogModule.DB,
        `${squads.length} squads del usuario obtenidos`
      );
      return squads;
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

      // Agregar como miembro
      const member = await this.addSquadMember(squad.id, userId, 'member');

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
  ): Promise<(SquadMember & { user: any })[]> {
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

      logger.success(
        LogModule.DB,
        `${data?.length || 0} miembros del squad obtenidos`
      );
      return (data as any) || [];
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
   * Obtener ranking de squads
   */
  static async getSquadRankings(limit: number = 50): Promise<any[]> {
    try {
      logger.database(LogModule.DB, 'Obteniendo ranking de squads', { limit });

      const { data, error } = await supabase
        .from('squad_rankings')
        .select('*')
        .order('ranking', { ascending: true })
        .limit(limit);

      if (error) {
        logger.error(LogModule.DB, 'Error obteniendo ranking de squads', error);
        throw error;
      }

      logger.success(
        LogModule.DB,
        `${data?.length || 0} squads en ranking obtenidos`
      );
      return data || [];
    } catch (error) {
      logger.error(
        LogModule.DB,
        'Error fatal obteniendo ranking de squads',
        error
      );
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
}
