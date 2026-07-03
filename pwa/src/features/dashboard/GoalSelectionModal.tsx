import { useState } from 'react';
import { Dialog, Button, ProgressBar } from '@/components';
import type { Goal } from '@/store/useGoalsStore';
import {
  goalProgress, goalRemaining, colorForProgress, money,
} from '@/features/goals/goalHelpers';
import { useApplySaving } from '@/features/goals/useApplySaving';

/**
 * Selector de meta para el ahorro rápido cuando hay >1 meta o el monto excede.
 * Fuente: docs/features/dashboard/dashboard-ui-ux §Modales, functional §CU principal.
 * Auto-ajusta el monto al restante de la meta elegida si lo excede.
 */
interface Props {
  goals: Goal[];
  amount: number;
  onClose: () => void;
  onDone: () => void;
}

export function GoalSelectionModal({ goals, amount, onClose, onDone }: Props) {
  const { applySaving, isSaving } = useApplySaving();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const active = goals.filter((g) => g.isActive && g.savedAmount < g.targetAmount);

  async function pick(goal: Goal) {
    const remaining = goalRemaining(goal);
    // Auto-ajuste: si el monto excede el restante, aplicar el máximo permitido.
    const finalAmount = Math.min(amount, remaining);
    setPendingId(goal.id);
    const res = await applySaving(goal.id, finalAmount);
    setPendingId(null);
    if (res.ok) onDone();
  }

  return (
    <Dialog open onClose={onClose} title="¿A qué meta querés ahorrar?">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Monto a ahorrar: <strong>{money(amount)}</strong>
        </p>

        {active.length === 0 && (
          <p style={{ fontSize: 14 }}>No tenés metas activas con cupo disponible.</p>
        )}

        {active.map((g) => {
          const progress = goalProgress(g);
          const remaining = goalRemaining(g);
          const exceeds = amount > remaining;
          return (
            <button
              key={g.id}
              onClick={() => void pick(g)}
              disabled={isSaving}
              style={{
                textAlign: 'left', padding: 12, borderRadius: 12, cursor: 'pointer',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)', opacity: isSaving && pendingId !== g.id ? 0.5 : 1,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <strong>{g.name}</strong>
                <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Restante {money(remaining)}
                </span>
              </div>
              <ProgressBar progress={progress} color={colorForProgress(progress)} showLabel />
              {exceeds && (
                <p style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 6 }}>
                  El monto excede el objetivo; se ahorrará {money(remaining)}.
                </p>
              )}
              {isSaving && pendingId === g.id && (
                <p style={{ fontSize: 12, marginTop: 6 }}>Guardando…</p>
              )}
            </button>
          );
        })}

        <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cerrar</Button>
      </div>
    </Dialog>
  );
}
