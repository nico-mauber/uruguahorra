import { useState, useCallback } from 'react';
import { GoalsService } from '@/services/GoalsService';
import { OptimizedGamificationService } from '@/services/XPService';
import { StreaksService } from '@/services/StreaksService';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useGamificationStore } from '@/store/useGamificationStore';
import { useAuthStore } from '@/store/useAuthStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { logger, LogModule } from '@/lib/logger';

/**
 * Flujo compuesto de contribución `applySavingToGoal`.
 * Fuente EXACTA: docs/architecture/state-management §3.4 + dashboard §CU principal.
 * Orquesta: contribución → XP optimizado → racha → refetch/local → toasts secuenciados.
 */
export interface ApplySavingResult {
  ok: boolean;
  /** Motivo de aborto para que la UI decida (p.ej. abrir selector). */
  reason?: 'completed' | 'exceeds' | 'invalid' | 'error';
  /** Restante de la meta (para 'exceeds'). */
  remaining?: number;
}

export function useApplySaving() {
  const [isSaving, setIsSaving] = useState(false);
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const applySaving = useCallback(
    async (
      goalId: string,
      amount: number,
      opts?: { description?: string }
    ): Promise<ApplySavingResult> => {
      if (isSaving) return { ok: false, reason: 'error' };
      if (!userId) return { ok: false, reason: 'error' };

      // Validación de monto (§CU 3).
      if (!Number.isFinite(amount) || amount <= 0) {
        ToastService.warning('Monto inválido', 'Ingresa un monto válido mayor a 0');
        return { ok: false, reason: 'invalid' };
      }

      const goal = useGoalsStore.getState().goals.find((g) => g.id === goalId);
      if (!goal) return { ok: false, reason: 'error' };

      // Meta ya completada.
      if (goal.savedAmount >= goal.targetAmount) {
        ToastService.warning(
          '🎯 Meta completada',
          `«${goal.name}» ya está completada.`
        );
        return { ok: false, reason: 'completed' };
      }

      // Monto excede el restante → la UI abre el selector para ajustar.
      const remaining = goal.targetAmount - goal.savedAmount;
      if (amount > remaining) {
        ToastService.warning(
          'Monto excede el objetivo',
          `El máximo permitido es $${Math.floor(remaining)}`
        );
        return { ok: false, reason: 'exceeds', remaining };
      }

      setIsSaving(true);
      try {
        // 1) Contribución (el trigger de BD recalcula saved_amount).
        await GoalsService.addContribution({
          user_id: userId,
          goal_id: goalId,
          amount,
          source: 'manual',
          description: opts?.description ?? 'Ahorro rápido desde dashboard',
        });

        // Actualización local optimista de la meta.
        useGoalsStore.getState().addContributionLocal(goalId, amount);

        // 2) XP optimizado (no bloquea el flujo si falla).
        const xpResult =
          await OptimizedGamificationService.processContributionOptimized(
            userId,
            amount
          );

        // 3) Racha (errores aquí NO abortan; log warn y seguir).
        let updatedStreak;
        try {
          updatedStreak = await StreaksService.updateStreak(userId);
        } catch (streakErr) {
          logger.warn(LogModule.DB, 'updateStreak falló (no bloqueante)', streakErr);
        }

        // 4) Actualización local de stats (sin refetch).
        useGamificationStore
          .getState()
          .applyContributionResult(xpResult, updatedStreak);

        // 5) Refetch de metas con force (fuente de verdad del server).
        await useGoalsStore.getState().fetchGoals(userId, true);

        // 6) Toasts secuenciados.
        ToastService.success(`¡$${Math.floor(amount)} ahorrado en «${goal.name}»!`);
        if (xpResult.xpEarned > 0) {
          setTimeout(() => ToastService.success(`+${xpResult.xpEarned} XP ganado!`), 1000);
        }
        if (xpResult.levelUp && xpResult.newLevel) {
          setTimeout(
            () => ToastService.levelUp(xpResult.newLevel as number),
            2000
          );
        }

        return { ok: true };
      } catch (error) {
        logger.error(LogModule.GOALS, 'Error en applySaving', error);
        ToastService.error('No se pudo ahorrar', getErrorMessage(error));
        return { ok: false, reason: 'error' };
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, userId]
  );

  return { applySaving, isSaving };
}
