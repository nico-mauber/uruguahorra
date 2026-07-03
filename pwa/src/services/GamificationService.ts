/**
 * GamificationService — agregador de stats para Dashboard/Perfil.
 * Fuente: docs/features/gamification/gamification-functional-specs.md §5,
 * docs/api/contracts-and-data-mapping.md §2.1, §2.9.
 *
 * A diferencia de las rutas de dinero, aquí los errores SE PROPAGAN:
 * el caller decide si ocultar la sección.
 */
import { supabase } from '@/lib/supabase';
import { LevelsService } from './LevelsService';
import { StreaksService } from './StreaksService';
import type { UserBasicStats } from '@/types/gamification';

export class GamificationService {
  /**
   * Stats básicas: nivel, XP total, detalle de nivel, racha (get_or_create) y
   * quests (fase posterior → arreglo vacío).
   * @param opts.skipQuests reservado para omitir quests cuando se implementen.
   */
  static async getUserBasicStats(
    userId: string,
    _opts?: { skipQuests?: boolean }
  ): Promise<UserBasicStats> {
    const { data, error } = await supabase
      .from('users')
      .select('total_xp')
      .eq('id', userId)
      .single();

    if (error) throw error;

    const totalXP = ((data as { total_xp?: number } | null)?.total_xp ?? 0) || 0;
    const level = LevelsService.getLevel(totalXP);
    const levelInfo = LevelsService.getLevelProgress(totalXP);
    const streak = await StreaksService.getStreak(userId);

    // TODO(quests): generar/leer weekly_quests + user_quest_progress en fase
    // posterior (spec §4). Por ahora se devuelve vacío.
    return {
      level,
      totalXP,
      levelInfo,
      streak,
      quests: [],
    };
  }
}
