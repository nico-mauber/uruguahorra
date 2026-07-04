import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Icon, Spinner, EmptyState, Dialog, Button } from '@/components';
import { useAuthStore } from '@/store/useAuthStore';
import { useTransactionsStore, type Transaction } from '@/store/useTransactionsStore';
import { ToastService } from '@/lib/toast';
import { money, relativeDate, groupByDay, isoDaysAgo, isoToday } from './txHelpers';
import { TransactionFAB } from './TransactionFAB';

/**
 * Pantalla `/transactions`. Fuente: docs/features/transactions/{functional §CU-1/CU-4, ui-ux}.
 */
export function TransactionsScreen() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const transactions = useTransactionsStore((s) => s.transactions);
  const isLoading = useTransactionsStore((s) => s.isLoading);
  const fetchTransactions = useTransactionsStore((s) => s.fetchTransactions);
  const remove = useTransactionsStore((s) => s.remove);
  const getBalance = useTransactionsStore((s) => s.getBalance);

  const [startDate, setStartDate] = useState(isoDaysAgo(30));
  const [endDate, setEndDate] = useState(isoToday());
  const [toDelete, setToDelete] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (userId) void fetchTransactions(userId, { startDate, endDate, force: true });
  }, [userId, startDate, endDate, fetchTransactions]);

  const { income, expenses, balance } = getBalance();
  const groups = groupByDay(transactions);

  async function confirmDelete() {
    if (!userId || !toDelete) return;
    setDeleting(true);
    try {
      await remove(toDelete.id, userId);
      ToastService.success('Transacción eliminada');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', paddingBottom: 'calc(var(--touch-fab) + var(--space-2xl))' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--color-border)' }}>
        <button onClick={() => navigate(-1)} aria-label="Volver" style={{ background: 'none', border: 'none', cursor: 'pointer', width: 40, color: 'var(--color-text-primary)' }}>
          <Icon name="arrow-back" size={24} />
        </button>
        <h1 style={{ flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 600 }}>Transacciones</h1>
        <span style={{ width: 40 }} />
      </div>

      {/* Balance del período */}
      <div style={{ padding: 16 }}>
        <Card>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Balance del período</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <label style={{ flex: '1 1 0', minWidth: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Desde
              <input type="date" value={startDate} max={endDate} min={isoDaysAgo(730)}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', marginTop: 4, padding: '8px 4px', fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </label>
            <label style={{ flex: '1 1 0', minWidth: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>
              Hasta
              <input type="date" value={endDate} max={isoToday()} min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', minWidth: 0, boxSizing: 'border-box', marginTop: 4, padding: '8px 4px', fontSize: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Ingresos</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#51CF66' }}>+{money(income)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Gastos</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#FF6B6B' }}>-{money(expenses)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Balance</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: balance >= 0 ? '#51CF66' : '#FF6B6B' }}>
                {balance >= 0 ? '+' : '-'}{money(balance)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista */}
      {isLoading && transactions.length === 0 ? (
        <Spinner label="Cargando transacciones…" />
      ) : transactions.length === 0 ? (
        <div style={{ padding: 40 }}>
          <EmptyState icon="receipt" title="No hay transacciones" text="Usa el botón + para registrar tu primera transacción" />
        </div>
      ) : (
        <div style={{ padding: '0 16px' }}>
          {groups.map((group) => (
            <div key={group.date} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)', margin: '8px 0' }}>
                {relativeDate(group.date)}
              </div>
              {group.items.map((t) => (
                <Card key={t.id} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0, fontSize: 20,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `color-mix(in srgb, ${t.categoryColor ?? 'var(--color-neutral)'} 18%, transparent)`,
                    }}>{t.categoryEmoji ?? '💳'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.description || t.categoryName || 'Sin descripción'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {t.categoryName ?? 'Sin categoría'} • {relativeDate(t.transactionDate)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: t.type === 'income' ? '#51CF66' : '#FF6B6B' }}>
                        {t.type === 'income' ? '+' : '-'}{money(t.amount)}
                      </div>
                      <button onClick={() => setToDelete(t)} aria-label="Eliminar"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', fontSize: 12, marginTop: 2 }}>
                        🗑
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      <TransactionFAB onCreated={() => userId && void fetchTransactions(userId, { startDate, endDate, force: true })} />

      <Dialog open={!!toDelete} onClose={() => setToDelete(null)} title="Eliminar transacción">
        {toDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <p style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
              ¿Eliminar {toDelete.type === 'income' ? '+' : '-'}{money(toDelete.amount)}
              {toDelete.description ? ` — "${toDelete.description}"` : ''}? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" style={{ flex: 1 }} onClick={() => setToDelete(null)}>Cancelar</Button>
              <Button style={{ flex: 1, background: 'var(--color-error)' }} loading={deleting} onClick={() => void confirmDelete()}>
                Eliminar
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
