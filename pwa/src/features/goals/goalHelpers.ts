import type { Goal } from '@/store/useGoalsStore';
import type { IconName } from '@/components';

/** Helpers de presentación de metas. Fuente: docs/features/goals/goals-ui-ux.md. */

/** Progreso 0-100 de una meta. */
export function goalProgress(g: Goal): number {
  if (g.targetAmount <= 0) return 0;
  return Math.min(100, (g.savedAmount / g.targetAmount) * 100);
}

/** Restante para completar (nunca negativo). */
export function goalRemaining(g: Goal): number {
  return Math.max(0, g.targetAmount - g.savedAmount);
}

/**
 * Icono por categoría (fallback flag). Fuente: goals-ui-ux §Lista.
 * Limitado al set de IconName disponible; el emoji del tipo aporta el resto.
 */
export function iconForCategory(category: string): IconName {
  switch (category) {
    case 'emergency':
      return 'shield';
    case 'purchase':
      return 'wallet';
    case 'housing':
      return 'home';
    default:
      return 'flag';
  }
}

/** Color por progreso. Fuente: goals-ui-ux §Lista. */
export function colorForProgress(progress: number): string {
  if (progress >= 100) return 'var(--color-success)';
  if (progress >= 75) return 'var(--color-primary)';
  if (progress >= 50) return 'var(--color-warning)';
  return 'var(--color-text-secondary)';
}

/** Días restantes hasta targetDate; null si no hay fecha. */
export function daysRemaining(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate).getTime();
  if (!Number.isFinite(target)) return null;
  const now = Date.now();
  return Math.ceil((target - now) / 86_400_000);
}

/** Monto entero con símbolo (es-UY, UYU, sin decimales). */
export function money(amount: number): string {
  return `$${Math.floor(amount).toLocaleString('es-UY')}`;
}
