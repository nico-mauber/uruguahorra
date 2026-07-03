import { useState } from 'react';
import { Dialog, Button } from '@/components';
import type { ChallengeRow } from '@/types/database';
import type { ChallengeDurationType } from '@/services/ChallengesService';
import { useAuthStore } from '@/store/useAuthStore';
import { useChallengesStore } from '@/store/useChallengesStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { DURATION_OPTIONS } from './challengeHelpers';

/**
 * Selector de duración para iniciar un reto. Fuente: challenges §CU-2, ui-ux §Modal duración.
 */
interface Props {
  challenge: ChallengeRow;
  onClose: () => void;
}

export function DurationModal({ challenge, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const startSession = useChallengesStore((s) => s.startSession);
  const [busy, setBusy] = useState(false);

  async function choose(duration: ChallengeDurationType) {
    if (!userId) return;
    setBusy(true);
    try {
      await startSession(userId, challenge.id, duration);
      ToastService.success('¡Reto iniciado!', 'Tu reto ha comenzado. ¡Buena suerte!');
      onClose();
    } catch (error) {
      // El mensaje de la BD viene en español (límite 5, ya activo, etc.).
      ToastService.error('No se pudo iniciar el reto', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={challenge.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Elige la duración de tu reto:</p>
        {DURATION_OPTIONS.map((d) => (
          <button
            key={d.value}
            onClick={() => void choose(d.value)}
            disabled={busy}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 12,
              border: '1px solid var(--color-border)', background: 'var(--color-surface)',
              cursor: busy ? 'wait' : 'pointer', color: 'var(--color-text-primary)', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 20 }}>📅</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 600 }}>{d.label}</span>
              <span style={{ display: 'block', fontSize: 14, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{d.sub}</span>
            </span>
          </button>
        ))}
        <Button variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
      </div>
    </Dialog>
  );
}
