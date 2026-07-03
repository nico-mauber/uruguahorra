import type { ChallengeDurationType } from '@/services/ChallengesService';

/** Helpers de retos. Fuente: docs/features/challenges/challenges-ui-ux.md. */

export const DIFFICULTY_COLOR: Record<'easy' | 'medium' | 'hard' | 'expert', string> = {
  easy: '#4CAF50',
  medium: '#FF9800',
  hard: '#F44336',
  expert: '#9C27B0',
};

export const DURATION_OPTIONS: { value: ChallengeDurationType; label: string; sub: string }[] = [
  { value: '1_week', label: '1 semana', sub: '7 días' },
  { value: '15_days', label: '15 días', sub: '2 semanas' },
  { value: '30_days', label: '30 días', sub: '1 mes' },
  { value: '1_year', label: '1 año', sub: '365 días' },
];

/** Fecha "Hoy, {weekday d de month}" en es-ES capitalizada. */
export function todayLong(): string {
  const s = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  return `Hoy, ${s.charAt(0).toUpperCase()}${s.slice(1)}`;
}
