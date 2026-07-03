import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, ProgressBar, Icon, Spinner, EmptyState, Fab } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useBudgetsStore, isExpired, type Budget } from '@/store/useBudgetsStore';
import { money } from '@/features/transactions/txHelpers';
import { BudgetFormModal } from './BudgetFormModal';

/** Pantalla `/budgets`. Fuente: docs/features/budgets/budgets-ui-ux.md. */
export function BudgetsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const active = useBudgetsStore((s) => s.active);
  const history = useBudgetsStore((s) => s.history);
  const isLoading = useBudgetsStore((s) => s.isLoading);
  const fetchActive = useBudgetsStore((s) => s.fetchActive);
  const fetchHistory = useBudgetsStore((s) => s.fetchHistory);

  const [showCreate, setShowCreate] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Budget | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!userId) return;
    void fetchActive(userId);
    void fetchHistory(userId);
  }, [userId, fetchActive, fetchHistory]);

  function refresh() {
    if (!userId) return;
    void fetchActive(userId);
    void fetchHistory(userId);
  }

  if (isLoading && active.length === 0) {
    return <Spinner fullscreen label="Cargando presupuestos…" />;
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'calc(var(--touch-fab) + var(--space-2xl))' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="arrow-back" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Presupuestos</h1>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {active.length === 0 ? (
          <EmptyState
            icon="wallet"
            title="No tenés presupuestos activos"
            text="Creá uno para controlar cuánto gastás por categoría."
          />
        ) : (
          active.map((b) => {
            const expired = isExpired(b);
            const over = b.spent > b.amount;
            const progress = b.amount > 0 ? Math.min(100, (b.spent / b.amount) * 100) : 0;
            const barColor = over ? 'var(--color-error)' : 'var(--color-primary)';
            return (
              <Card key={b.id}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    background: `color-mix(in srgb, ${b.categoryColor ?? 'var(--color-neutral)'} 18%, transparent)`,
                  }}>{b.categoryEmoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.categoryName}</strong>
                      {expired && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'color-mix(in srgb, var(--color-error) 12%, transparent)', color: 'var(--color-error)' }}>Vencido</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{b.startDate} – {b.endDate}</div>
                  </div>
                  {expired ? (
                    <Button variant="outline" size="small" onClick={() => setRenewTarget(b)}>Renovar</Button>
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: over ? 'var(--color-error)' : 'var(--color-text-primary)' }}>
                      {money(b.spent)} / {money(b.amount)}
                    </span>
                  )}
                </div>
                <ProgressBar progress={progress} color={barColor} />
                {over && (
                  <div style={{ fontSize: 12, color: 'var(--color-error)', marginTop: 4 }}>
                    Excedido por {money(b.spent - b.amount)}
                  </div>
                )}
              </Card>
            );
          })
        )}

        {/* Historial */}
        {history.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowHistory((v) => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-primary)', fontSize: 16, fontWeight: 600, padding: '8px 0' }}
            >
              Historial
              <Icon name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} />
            </button>
            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((b) => (
                  <Card key={b.id} style={{ opacity: 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 18 }}>{b.categoryEmoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{b.categoryName}</strong>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{b.startDate} – {b.endDate}</div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{money(b.spent)} / {money(b.amount)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Fab icon="add" label="Nuevo presupuesto" onClick={() => setShowCreate(true)} />

      {showCreate && (
        <BudgetFormModal mode="create" renewTarget={null} onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); refresh(); }} />
      )}
      {renewTarget && (
        <BudgetFormModal
          mode="renew"
          renewTarget={{ id: renewTarget.id, categoryId: renewTarget.categoryId, categoryName: renewTarget.categoryName ?? '', categoryEmoji: renewTarget.categoryEmoji, amount: renewTarget.amount }}
          onClose={() => setRenewTarget(null)}
          onDone={() => { setRenewTarget(null); refresh(); }}
        />
      )}
    </div>
  );
}
