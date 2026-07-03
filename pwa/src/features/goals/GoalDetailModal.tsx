import { useState } from 'react';
import { Dialog, Button, Input, ProgressBar } from '@/components';
import type { Goal } from '@/store/useGoalsStore';
import { useGoalsStore } from '@/store/useGoalsStore';
import { useAuthStore } from '@/store/useAuthStore';
import { GoalsService } from '@/services/GoalsService';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { useApplySaving } from './useApplySaving';
import { goalProgress, goalRemaining, colorForProgress, daysRemaining, money } from './goalHelpers';

/**
 * Detalle de meta: contribuir (flujo compuesto), editar, eliminar (soft delete).
 * Fuente: docs/features/goals/goals-functional-specs §CU-3, goals-ui-ux §GoalDetailModal.
 */
interface Props {
  goal: Goal;
  onClose: () => void;
}

export function GoalDetailModal({ goal, onClose }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const fetchGoals = useGoalsStore((s) => s.fetchGoals);
  const { applySaving, isSaving } = useApplySaving();

  const [amount, setAmount] = useState('');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [targetDate, setTargetDate] = useState(goal.targetDate?.slice(0, 10) ?? '');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const progress = goalProgress(goal);
  const remaining = goalRemaining(goal);
  const days = daysRemaining(goal.targetDate);

  async function handleSave() {
    const n = Number(amount);
    const res = await applySaving(goal.id, n);
    if (res.ok) {
      setAmount('');
      onClose();
    }
  }

  async function handleEdit() {
    const ta = Number(targetAmount);
    if (!name.trim()) {
      ToastService.warning('Nombre requerido', 'Ingresa un nombre para tu meta');
      return;
    }
    if (!Number.isFinite(ta) || ta <= 0) {
      ToastService.warning('Monto inválido', 'Ingresa un monto válido mayor a 0');
      return;
    }
    setBusy(true);
    try {
      await GoalsService.updateGoal(goal.id, {
        name: name.trim(),
        target_amount: ta,
        target_date: targetDate || undefined,
      });
      if (userId) await fetchGoals(userId, true);
      ToastService.success('Meta actualizada');
      onClose();
    } catch (error) {
      ToastService.error('No se pudo actualizar', getErrorMessage(error, { context: 'goal' }));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await GoalsService.deleteGoal(goal.id);
      if (userId) await fetchGoals(userId, true);
      ToastService.success('Meta eliminada');
      onClose();
    } catch (error) {
      ToastService.error('No se pudo eliminar', getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={goal.name}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Progreso */}
        <div>
          <ProgressBar progress={progress} color={colorForProgress(progress)} showLabel />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Ahorrado</span>
            <strong>{money(goal.savedAmount)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Objetivo</span>
            <strong>{money(goal.targetAmount)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Restante</span>
            <strong>{money(remaining)}</strong>
          </div>
          {days !== null && (
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 8 }}>
              {goal.isCompleted
                ? '🎉 ¡Completada!'
                : days <= 0
                  ? '⚠️ Meta vencida'
                  : `⏰ ${days} días restantes`}
            </p>
          )}
        </div>

        {/* Contribución rápida */}
        {!goal.isCompleted && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              type="number"
              inputMode="numeric"
              prefix="$"
              placeholder="Monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            />
            <Button onClick={() => void handleSave()} loading={isSaving} disabled={!amount}>
              Ahorrar
            </Button>
          </div>
        )}

        {/* Editar */}
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              type="number"
              inputMode="numeric"
              prefix="$"
              placeholder="Monto objetivo"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => void handleEdit()} loading={busy}>Guardar</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Editar meta
          </Button>
        )}

        {/* Eliminar */}
        {confirmDelete ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 14, color: 'var(--color-error)' }}>
              ¿Seguro que quieres eliminar esta meta?
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
              <Button onClick={() => void handleDelete()} loading={busy}
                style={{ background: 'var(--color-error)' }}>
                Eliminar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--color-error)',
              cursor: 'pointer', fontSize: 14, padding: 8, alignSelf: 'flex-start',
            }}
          >
            Eliminar meta
          </button>
        )}
      </div>
    </Dialog>
  );
}
