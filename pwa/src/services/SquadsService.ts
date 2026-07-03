/**
 * Servicio de pods de ahorro (squads). Fuente:
 * docs/api/contracts-and-data-mapping.md §2.8,
 * docs/features/pods/pods-functional-specs.md (CU-1..CU-4).
 *
 * Reglas:
 * - Métodos estáticos (state-management §1).
 * - El cliente NUNCA escribe agregados (`total_saved`/`monthly_saved`): los
 *   mantiene el trigger `update_squad_totals` de BD. El cliente SÍ genera
 *   `invite_code` (6 chars A-Z0-9).
 * - Sistema democrático: todos los miembros se insertan con rol `admin`.
 * - No existe módulo SQUADS en el logger → se usa LogModule.DB.
 * - Errores: se loguean y se relanzan para que el store/UI los mapeen con
 *   getErrorMessage. Las validaciones de negocio (CU-3) lanzan Error con
 *   mensaje en español que se muestra tal cual.
 */
import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { uuid } from '@/lib/idb';
import { OfflineQueueService } from './OfflineQueueService';
import type {
  SquadContributionRow,
  SquadMemberRow,
  SquadRow,
} from '@/types/database';

/** Meta por defecto de un pod cuando `goal_amount` es null (CU-1). */
const DEFAULT_SQUAD_GOAL = 10000;

/** Máximo de miembros por defecto al crear un pod (CU-2). */
const DEFAULT_MAX_MEMBERS = 10;

/** Alfabeto del código de invitación (A-Z0-9). */
const INVITE_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Vista de pod para la lista del usuario (CU-1), en camelCase. */
export interface UserSquad {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  maxMembers: number;
  ownerId: string;
  createdBy: string;
  goalAmount: number;
  totalSquadSaved: number;
  memberCount: number;
  memberRole: string;
}

export interface CreateSquadInput {
  name: string;
  description?: string;
  maxMembers?: number;
}

export interface AddSquadContributionInput {
  squadId: string;
  userId: string;
  amount: number;
  description?: string;
  source?: 'manual';
}

export class SquadsService {
  /**
   * Genera un código de invitación de 6 chars (A-Z0-9). Usa
   * `crypto.getRandomValues` para mejor unicidad. Devuelve mayúsculas.
   */
  static generateInviteCode(): string {
    const bytes = new Uint32Array(6);
    crypto.getRandomValues(bytes);
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
    }
    return code;
  }

  /**
   * Lista los pods donde el usuario es miembro (CU-1). Para cada uno computa
   * `memberCount`, `totalSquadSaved` y `goalAmount`. Ignora pods inactivos.
   */
  static async fetchUserSquads(userId: string): Promise<UserSquad[]> {
    try {
      const { data, error } = await supabase
        .from('squad_members')
        .select('role, squad:squads(*)')
        .eq('user_id', userId);

      if (error) throw error;

      const rows = (data ?? []) as unknown as Array<{
        role: string;
        squad: SquadRow | null;
      }>;

      const activeRows = rows.filter((r) => r.squad && r.squad.is_active);

      const result = await Promise.all(
        activeRows.map(async ({ role, squad }) => {
          const s = squad as SquadRow;
          const memberCount = await this.getMemberCount(s.id);
          const totalSquadSaved = await this.computeTotalSaved(s);
          const userSquad: UserSquad = {
            id: s.id,
            name: s.name,
            description: s.description,
            inviteCode: s.invite_code,
            maxMembers: s.max_members,
            ownerId: s.owner_id,
            createdBy: s.created_by,
            goalAmount: s.goal_amount ?? DEFAULT_SQUAD_GOAL,
            totalSquadSaved,
            memberCount,
            memberRole: role,
          };
          return userSquad;
        })
      );

      return result;
    } catch (error) {
      logger.error(LogModule.DB, 'Error listando pods del usuario', error);
      throw error;
    }
  }

  /** Cuenta los miembros de un pod (CU-1). */
  private static async getMemberCount(squadId: string): Promise<number> {
    const { count, error } = await supabase
      .from('squad_members')
      .select('*', { count: 'exact', head: true })
      .eq('squad_id', squadId);

    if (error) throw error;
    return count ?? 0;
  }

  /**
   * Total ahorrado del pod: usa `squad.total_saved`; si es nulo, suma las
   * contribuciones (CU-1 fallback).
   */
  private static async computeTotalSaved(squad: SquadRow): Promise<number> {
    if (squad.total_saved !== null && squad.total_saved !== undefined) {
      return squad.total_saved;
    }
    const { data, error } = await supabase
      .from('squad_contributions')
      .select('amount')
      .eq('squad_id', squad.id);

    if (error) throw error;
    const rows = (data ?? []) as Array<{ amount: number }>;
    return rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  }

  /**
   * Crea un pod (CU-2): genera `invite_code`, inserta el squad y la membresía
   * propia con rol `admin`. Devuelve la fila del squad.
   */
  static async createSquad(
    userId: string,
    input: CreateSquadInput
  ): Promise<SquadRow> {
    try {
      const inviteCode = this.generateInviteCode();

      const payload = {
        name: input.name,
        description: input.description ?? null,
        max_members: input.maxMembers ?? DEFAULT_MAX_MEMBERS,
        owner_id: userId,
        created_by: userId,
        invite_code: inviteCode,
        goal_amount: 1000,
      };

      const { data, error } = await supabase
        .from('squads')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      const squad = data as SquadRow;

      const { error: memberError } = await supabase
        .from('squad_members')
        .insert({ squad_id: squad.id, user_id: userId, role: 'admin' });

      if (memberError) throw memberError;

      return squad;
    } catch (error) {
      logger.error(LogModule.DB, 'Error creando pod', error);
      throw error;
    }
  }

  /**
   * Une al usuario a un pod por código (CU-3). Valida en orden: código +
   * activo, no ser ya miembro, pod no lleno. Inserta membresía rol `admin`.
   * Devuelve la fila del squad.
   */
  static async joinSquad(
    userId: string,
    inviteCode: string
  ): Promise<SquadRow> {
    try {
      // (1) Buscar squad por código (uppercase) + activo.
      const { data: squadData, error: squadError } = await supabase
        .from('squads')
        .select('*')
        .eq('invite_code', inviteCode.toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (squadError) throw squadError;
      if (!squadData) {
        throw new Error('Código de invitación inválido o squad inactivo');
      }
      const squad = squadData as SquadRow;

      // (2) No ser ya miembro.
      const { data: existing, error: existingError } = await supabase
        .from('squad_members')
        .select('id')
        .eq('squad_id', squad.id)
        .eq('user_id', userId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        throw new Error('Ya eres miembro de este squad');
      }

      // (3) Pod no lleno.
      const memberCount = await this.getMemberCount(squad.id);
      if (memberCount >= squad.max_members) {
        throw new Error('El squad está lleno');
      }

      // (4) Insertar membresía rol `admin`.
      const { error: insertError } = await supabase
        .from('squad_members')
        .insert({ squad_id: squad.id, user_id: userId, role: 'admin' });

      if (insertError) throw insertError;

      return squad;
    } catch (error) {
      logger.error(LogModule.DB, 'Error uniéndose al pod', error);
      throw error;
    }
  }

  /**
   * Lista los miembros de un pod con datos de usuario anidados (CU-4).
   */
  static async fetchSquadMembers(squadId: string): Promise<SquadMemberRow[]> {
    try {
      const { data, error } = await supabase
        .from('squad_members')
        .select('*, user:users(id,email,premium)')
        .eq('squad_id', squadId);

      if (error) throw error;
      return (data ?? []) as unknown as SquadMemberRow[];
    } catch (error) {
      logger.error(LogModule.DB, 'Error listando miembros del pod', error);
      throw error;
    }
  }

  /**
   * Registra una contribución al pod (CU-4). El trigger `update_squad_totals`
   * recalcula los agregados y otorga 15 XP. La membresía la valida RLS (42501
   * si no es miembro). Devuelve la fila insertada.
   */
  static async addSquadContribution(
    input: AddSquadContributionInput
  ): Promise<SquadContributionRow> {
    const id = uuid();
    const payload = {
      id,
      squad_id: input.squadId,
      user_id: input.userId,
      amount: input.amount,
      source: input.source ?? 'manual',
      ...(input.description !== undefined ? { description: input.description } : {}),
    };
    const optimistic = () => ({ ...payload, description: input.description ?? null, created_at: new Date().toISOString() }) as SquadContributionRow;

    // Offline: encolar + fila optimista (§4.2). El trigger recalcula totales/XP al sincronizar.
    if (!navigator.onLine) {
      await OfflineQueueService.enqueue({ id, entity: 'squad_contribution', operation: 'insert', table: 'squad_contributions', payload });
      return optimistic();
    }

    try {
      const { data, error } = await supabase
        .from('squad_contributions')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SquadContributionRow;
    } catch (error) {
      if (error instanceof TypeError) {
        await OfflineQueueService.enqueue({ id, entity: 'squad_contribution', operation: 'insert', table: 'squad_contributions', payload });
        return optimistic();
      }
      logger.error(LogModule.DB, 'Error registrando contribución al pod', error);
      throw error;
    }
  }

  /** Actualiza la meta de ahorro del pod (CU-4). Disponible para todos. */
  static async updateSquadGoal(
    squadId: string,
    amount: number,
    _userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('squads')
        .update({ goal_amount: amount })
        .eq('id', squadId);

      if (error) throw error;
    } catch (error) {
      logger.error(LogModule.DB, 'Error actualizando la meta del pod', error);
      throw error;
    }
  }

  /** Elimina la membresía del usuario en el pod (CU-4 salir). */
  static async leaveSquad(squadId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      logger.error(LogModule.DB, 'Error saliendo del pod', error);
      throw error;
    }
  }
}
