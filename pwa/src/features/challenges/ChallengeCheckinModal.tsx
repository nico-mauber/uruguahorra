import { useEffect, useState } from 'react';
import { Dialog, Spinner } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useChallengesStore } from '@/store/useChallengesStore';
import { ChallengesService } from '@/services/ChallengesService';
import type { UserChallengeSessionRow, DailyCheckinRow } from '@/types/database';
import { ToastService } from '@/lib/toast';
import { logger, LogModule } from '@/lib/logger';
import { todayLong } from './challengeHelpers';

/**
 * Check-in diario de un reto. Fuente: docs/features/challenges §CU-3, ui-ux §ChallengeCheckinModal.
 */
interface Props {
  session: UserChallengeSessionRow;
  onClose: () => void;
}

export function ChallengeCheckinModal({ session, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const performCheckin = useChallengesStore((s) => s.performCheckin);

  const [checking, setChecking] = useState(true);
  const [existing, setExisting] = useState<DailyCheckinRow | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const title = session.challenge?.title ?? 'Reto';

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      try {
        const status = await ChallengesService.getTodaysCheckinStatus(userId, session.id);
        if (alive) setExisting(status);
      } catch (error) {
        logger.warn(LogModule.DB, 'getTodaysCheckinStatus falló', error);
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => { alive = false; };
  }, [userId, session.id]);

  async function submit(completed: boolean) {
    if (!userId) return;
    setSaving(true);
    try {
      const { progress, wasCompleted } = await performCheckin(userId, session.id, completed, note.trim() || undefined);
      if (completed) {
        ToastService.success(
          '¡Día completado! 🎉',
          `Progreso: ${Math.round(progress.currentProgress)}% (${progress.daysCompleted} días)`
        );
      } else {
        ToastService.info('Check-in registrado');
      }
      if (wasCompleted) {
        setTimeout(() => ToastService.success('¡Reto completado! 🏆', '+XP ganado'), 1000);
      }
      onClose();
    } catch {
      ToastService.error('Error', 'No se pudo registrar el check-in. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Check-in Diario">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{todayLong()}</div>
        </div>

        {checking ? (
          <Spinner label="Verificando estado…" />
        ) : existing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '6px 16px', borderRadius: 999, fontWeight: 700, color: '#fff',
              background: existing.completed ? 'var(--color-success)' : 'var(--color-warning)',
            }}>
              {existing.completed ? '✓ Cumplido' : '✕ No cumplido'}
            </span>
            {existing.note && <p style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{existing.note}</p>}
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>Ya registraste tu check-in para hoy.</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 16, fontWeight: 600 }}>¿Cumpliste con el reto hoy?</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nota opcional (cómo te fue, dificultades, etc.)"
              rows={3}
              style={{
                width: '100%', minHeight: 80, borderRadius: 12, padding: 10, resize: 'none',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => void submit(true)} disabled={saving}
                style={{ flex: 1, padding: 16, borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, background: 'var(--color-success)' }}>
                ✓ Sí, cumplí
              </button>
              <button onClick={() => void submit(false)} disabled={saving}
                style={{ flex: 1, padding: 16, borderRadius: 12, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, background: 'var(--color-warning)' }}>
                ✕ No cumplí
              </button>
            </div>
            {saving && <Spinner label="Registrando…" />}
          </>
        )}
      </div>
    </Dialog>
  );
}
