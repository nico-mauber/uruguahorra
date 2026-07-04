import { useEffect, useMemo, useState } from 'react';
import { Dialog, Button, Input } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionsStore, type Transaction } from '@/store/useTransactionsStore';
import { useUIStore } from '@/store/useUIStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';

/**
 * Edición de una transacción existente: monto, tipo, concepto y categoría.
 * Fuente: docs/features/transactions/transactions-functional-specs.md §CU-6.
 *
 * Al cambiar el tipo (Ingreso↔Gasto) la categoría vieja deja de ser válida (las
 * categorías difieren por tipo), así que se deselecciona. El `budget_id` original
 * se preserva sólo si sigue siendo un gasto en la misma categoría; si cambia el
 * tipo o la categoría, se desvincula (el trigger recalcula el presupuesto viejo).
 * Requiere conexión (esta fase no encola edición offline).
 */
type EditableType = 'expense' | 'income';

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onDone: () => void;
}

export function EditTransactionModal({ transaction, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const isOnline = useUIStore((s) => s.isOnline);
  const categories = useTransactionsStore((s) => s.categories);
  const fetchCategories = useTransactionsStore((s) => s.fetchCategories);
  const update = useTransactionsStore((s) => s.update);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const [amount, setAmount] = useState(String(transaction.amount));
  const [type, setType] = useState<EditableType>(transaction.type === 'income' ? 'income' : 'expense');
  const [description, setDescription] = useState(transaction.description ?? '');
  const [categoryId, setCategoryId] = useState<string | null>(transaction.categoryId);
  const [saving, setSaving] = useState(false);

  const typeCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  function changeType(next: EditableType) {
    if (next === type) return;
    setType(next);
    // La categoría actual pertenece al tipo anterior → deseleccionar.
    setCategoryId((prev) => {
      const stillValid = categories.some((c) => c.id === prev && c.type === next);
      return stillValid ? prev : null;
    });
  }

  async function save() {
    if (!userId) return;
    if (!isOnline) {
      ToastService.warning('Sin conexión', 'Editar una transacción requiere conexión.');
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Monto inválido', 'Ingresá un monto válido mayor a 0');
      return;
    }
    const selectedCat = categories.find((c) => c.id === categoryId) ?? null;
    // Preservar el vínculo a presupuesto sólo si sigue siendo el mismo gasto/categoría.
    const keepBudget =
      type === 'expense' && categoryId === transaction.categoryId ? transaction.budgetId : null;

    setSaving(true);
    try {
      await update(transaction.id, userId, {
        amount: n,
        type,
        description: description.trim() || null,
        category_id: categoryId,
        category_name: selectedCat?.name ?? null,
        category_emoji: selectedCat?.emoji ?? null,
        budget_id: keepBudget,
      });
      ToastService.success('Transacción actualizada');
      onDone();
    } catch (error) {
      ToastService.error('No se pudo actualizar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title="Editar transacción">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Tipo */}
        <div style={{ display: 'flex', gap: 8 }} role="group" aria-label="Tipo de transacción">
          {(['income', 'expense'] as const).map((t) => {
            const selected = type === t;
            const color = t === 'income' ? 'var(--color-success)' : 'var(--color-error)';
            return (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                aria-pressed={selected}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md, 10px)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  border: `1px solid ${selected ? color : 'var(--color-border)'}`,
                  background: selected ? `color-mix(in srgb, ${color} 18%, transparent)` : 'transparent',
                  color: selected ? color : 'var(--color-text-secondary)',
                }}
              >
                {t === 'income' ? 'Ingreso' : 'Gasto'}
              </button>
            );
          })}
        </div>

        {/* Monto */}
        <Input
          type="number"
          inputMode="numeric"
          prefix="$"
          placeholder="Monto"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Concepto */}
        <Input
          placeholder="Concepto"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 100))}
        />

        {/* Categoría (filtrada por tipo) */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 6 }}>
            Categoría
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
            {typeCategories.map((c) => {
              const selected = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(selected ? null : c.id)}
                  aria-pressed={selected}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: 10, borderRadius: 12, cursor: 'pointer',
                    border: `${selected ? 2 : 1}px solid ${c.color ?? 'var(--color-border)'}`,
                    background: selected ? `color-mix(in srgb, ${c.color ?? 'var(--color-primary)'} 15%, transparent)` : 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{c.emoji}</span>
                  <span style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.1 }}>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={onClose}>Cancelar</Button>
          <Button style={{ flex: 1 }} loading={saving} onClick={() => void save()}>Guardar</Button>
        </div>
      </div>
    </Dialog>
  );
}
