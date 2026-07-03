import { useEffect, useMemo, useState } from 'react';
import { Dialog, Button } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { useBudgetsStore, isExpired } from '@/store/useBudgetsStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';
import { money } from './txHelpers';

/**
 * Registro rápido de transacción (3 pasos: monto → categoría → confirmar).
 * Fuente: docs/features/transactions/{functional-specs §CU-2, ui-ux §QuickTransactionModal}.
 */
type TxType = 'expense' | 'income';

interface Props {
  type: TxType;
  /** Pre-llenado opcional desde transacciones frecuentes. */
  preset?: { description?: string; categoryId?: string | null };
  onClose: () => void;
  onDone: () => void;
}

const ACCENT: Record<TxType, string> = {
  income: '#51CF66',
  expense: '#FF6B6B',
};

const MAX_AMOUNT = 999_999.99;

export function QuickTransactionModal({ type, preset, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const categories = useTransactionsStore((s) => s.categories);
  const fetchCategories = useTransactionsStore((s) => s.fetchCategories);
  const createQuick = useTransactionsStore((s) => s.createQuick);

  const accent = ACCENT[type];
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(preset?.categoryId ?? null);
  const [description, setDescription] = useState(preset?.description ?? '');
  const [saving, setSaving] = useState(false);

  const budgetUserId = useAuthStore((s) => s.user?.id ?? null);
  const fetchActiveBudgets = useBudgetsStore((s) => s.fetchActive);
  const getActiveForCategory = useBudgetsStore((s) => s.getActiveForCategory);
  const [linkBudget, setLinkBudget] = useState(false);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    // Solo para gastos: cargar presupuestos activos para poder ofrecer el toggle.
    if (type === 'expense' && budgetUserId) void fetchActiveBudgets(budgetUserId);
  }, [type, budgetUserId, fetchActiveBudgets]);

  const activeBudget = categoryId && type === 'expense' ? getActiveForCategory(categoryId) : null;
  const budgetVigente = activeBudget ? !isExpired(activeBudget) : false;
  const budgetRestante = activeBudget ? activeBudget.amount - activeBudget.spent : 0;

  const typeCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );
  const selectedCat = typeCategories.find((c) => c.id === categoryId) ?? null;

  function handleAmount(v: string) {
    // Sólo dígitos y un punto, máx 2 decimales.
    const cleaned = v.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    const parts = cleaned.split('.');
    setAmount(parts.length === 2 ? `${parts[0]}.${parts[1].slice(0, 2)}` : cleaned);
  }

  function nextFromAmount() {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      ToastService.warning('Monto inválido', 'El monto debe ser mayor a 0');
      return;
    }
    if (n > MAX_AMOUNT) {
      ToastService.warning('Monto inválido', 'El monto es demasiado grande');
      return;
    }
    setStep(2);
  }

  async function handleCreate() {
    if (!userId) return;
    setSaving(true);
    try {
      await createQuick(userId, {
        amount: Number(amount),
        category_id: categoryId,
        description: description.trim() || undefined,
        type,
        budget_id: linkBudget && budgetVigente && activeBudget ? activeBudget.id : null,
      });
      ToastService.success(
        '¡Listo! 💚',
        `Transacción de ${money(Number(amount))} registrada correctamente`
      );
      onDone();
    } catch (error) {
      ToastService.error('No se pudo registrar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const title = step === 1 ? '💰 ¿Cuánto?' : step === 2 ? '📂 ¿Categoría?' : '✅ Confirmar';

  return (
    <Dialog open onClose={onClose} title={title}>
      {/* Paso 1: Monto */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: accent }}>$</span>
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmount(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => e.key === 'Enter' && nextFromAmount()}
              placeholder="0.00"
              style={{
                fontSize: 32, fontWeight: 700, textAlign: 'center', width: '100%',
                border: 'none', borderBottom: `2px solid ${accent}`, background: 'transparent',
                color: 'var(--color-text-primary)', outline: 'none',
              }}
            />
          </div>
          <Button style={{ background: accent }} disabled={!amount || Number(amount) <= 0} onClick={nextFromAmount}>
            Siguiente →
          </Button>
        </div>
      )}

      {/* Paso 2: Categoría */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
            {typeCategories.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCategoryId(c.id); setStep(3); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: 12, borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${c.color}`, background: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <span style={{ fontSize: 28 }}>{c.emoji}</span>
                <span style={{ fontSize: 12, textAlign: 'center', lineHeight: 1.1 }}>{c.name}</span>
              </button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setStep(1)}>← Volver</Button>
        </div>
      )}

      {/* Paso 3: Confirmar */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Monto</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: accent }}>{money(Number(amount))}</div>
          </div>
          {selectedCat && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Categoría</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <span style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `color-mix(in srgb, ${selectedCat.color} 12%, transparent)`, fontSize: 20,
                }}>{selectedCat.emoji}</span>
                <span style={{ fontWeight: 600 }}>{selectedCat.name}</span>
              </div>
            </div>
          )}
          {type === 'expense' && activeBudget && budgetVigente && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={linkBudget} onChange={(e) => setLinkBudget(e.target.checked)} />
              <span style={{ fontSize: 13 }}>
                Descontar de presupuesto {selectedCat?.emoji} {selectedCat?.name}{' '}
                <span style={{ color: 'var(--color-text-secondary)' }}>({money(budgetRestante)} restante)</span>
              </span>
            </label>
          )}
          {type === 'expense' && activeBudget && !budgetVigente && (
            <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
              Presupuesto de «{selectedCat?.name}» vencido — renovalo en Presupuestos.
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Descripción</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              placeholder="Nota opcional sobre esta transacción"
              rows={2}
              style={{
                width: '100%', borderRadius: 12, padding: 10, resize: 'none',
                border: '1px solid var(--color-border)', background: 'var(--color-surface)',
                color: 'var(--color-text-primary)', fontFamily: 'inherit', fontSize: 14,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setStep(2)}>← Volver</Button>
            <Button style={{ flex: 1, background: accent }} loading={saving} onClick={() => void handleCreate()}>
              Crear Transacción ✓
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
