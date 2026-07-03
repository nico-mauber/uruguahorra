import { useEffect, useMemo, useState } from 'react';
import { Dialog, Button } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useBudgetsStore } from '@/store/useBudgetsStore';
import { useTransactionsStore } from '@/store/useTransactionsStore';
import { ToastService } from '@/lib/toast';
import { getErrorMessage } from '@/lib/errors';

interface RenewTarget {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryEmoji: string | null;
  amount: number;
}

interface Props {
  mode: 'create' | 'renew';
  renewTarget?: RenewTarget | null;
  onClose: () => void;
  onDone: () => void;
}

const ACCENT = '#FF6B6B'; // expense

function todayIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function BudgetFormModal({ mode, renewTarget, onClose, onDone }: Props) {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const categories = useTransactionsStore((s) => s.categories);
  const fetchCategories = useTransactionsStore((s) => s.fetchCategories);
  const active = useBudgetsStore((s) => s.active);
  const createBudget = useBudgetsStore((s) => s.create);
  const renewBudget = useBudgetsStore((s) => s.renew);

  const [categoryId, setCategoryId] = useState<string | null>(renewTarget?.categoryId ?? null);
  const [amount, setAmount] = useState(renewTarget ? String(renewTarget.amount) : '');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  // En create: categorías expense SIN presupuesto activo. En renew: fija.
  const available = useMemo(() => {
    const withActive = new Set(active.map((b) => b.categoryId));
    return categories.filter((c) => c.type === 'expense' && !withActive.has(c.id));
  }, [categories, active]);

  const inputStyle = {
    width: '100%', minWidth: 0, boxSizing: 'border-box' as const, marginTop: 4,
    padding: '8px 4px', fontSize: 14, borderRadius: 8,
    border: '1px solid var(--color-border)', background: 'var(--color-surface)',
    color: 'var(--color-text-primary)',
  };

  function validate(): string | null {
    if (!categoryId) return 'Elegí una categoría';
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 'El monto debe ser mayor a 0';
    if (!startDate || !endDate) return 'Completá las fechas';
    if (endDate < startDate) return 'La fecha fin debe ser posterior o igual a la de inicio';
    return null;
  }

  async function handleSubmit() {
    if (!userId || !categoryId) return;
    const err = validate();
    if (err) { ToastService.warning('Datos incompletos', err); return; }
    setSaving(true);
    try {
      const payload = { category_id: categoryId, amount: Number(amount), start_date: startDate, end_date: endDate };
      if (mode === 'renew' && renewTarget) {
        await renewBudget(userId, renewTarget.id, payload);
        ToastService.success('¡Renovado! 💚', 'Tu presupuesto arranca de nuevo');
      } else {
        await createBudget(userId, payload);
        ToastService.success('¡Listo! 💚', 'Presupuesto creado');
      }
      onDone();
    } catch (error) {
      ToastService.error('No se pudo guardar', getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === 'renew' ? '🔄 Renovar presupuesto' : '💰 Nuevo presupuesto';

  return (
    <Dialog open onClose={onClose} title={title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {/* Categoría */}
        {mode === 'renew' && renewTarget ? (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Categoría</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 24 }}>{renewTarget.categoryEmoji}</span>
              <span style={{ fontWeight: 600 }}>{renewTarget.categoryName}</span>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: 4 }}>Categoría</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {available.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryId(c.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: 10, borderRadius: 12, cursor: 'pointer',
                    border: categoryId === c.id ? `2px solid ${c.color}` : '1px solid var(--color-border)',
                    background: 'var(--color-surface)', color: 'var(--color-text-primary)',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{c.emoji}</span>
                  <span style={{ fontSize: 11, textAlign: 'center', lineHeight: 1.1 }}>{c.name}</span>
                </button>
              ))}
              {available.length === 0 && (
                <span style={{ gridColumn: '1 / -1', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  Todas las categorías ya tienen presupuesto activo.
                </span>
              )}
            </div>
          </div>
        )}

        {/* Monto */}
        <label style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          Monto límite
          <div style={{ position: 'relative', marginTop: 4 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>$</span>
            <input
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0"
              style={{ ...inputStyle, paddingLeft: 24, fontSize: 18, fontWeight: 600, textAlign: 'center', borderColor: ACCENT }}
            />
          </div>
        </label>

        {/* Fechas */}
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: '1 1 0', minWidth: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Desde
            <input type="date" value={startDate} max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ flex: '1 1 0', minWidth: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
            Hasta
            <input type="date" value={endDate} min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
          </label>
        </div>

        <Button style={{ background: ACCENT }} loading={saving} onClick={() => void handleSubmit()}>
          {mode === 'renew' ? 'Renovar presupuesto' : 'Crear presupuesto'}
        </Button>
      </div>
    </Dialog>
  );
}
