import type { Transaction } from '@/store/useTransactionsStore';

/** Helpers de transacciones. Fuente: docs/features/transactions/transactions-ui-ux.md. */

/** Monto entero con símbolo (es-UY). */
export function money(amount: number): string {
  return `$${Math.floor(Math.abs(amount)).toLocaleString('es-UY')}`;
}

/** Fecha relativa: Hoy / Ayer / N días / d MMM. */
export function relativeDate(dateStr: string): string {
  const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
  if (!Number.isFinite(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return `Hace ${diffDays} días`;
  return d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short' });
}

/** Agrupa transacciones por día (clave = transactionDate). */
export function groupByDay(txs: Transaction[]): { date: string; items: Transaction[] }[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of txs) {
    const key = t.transactionDate;
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  // Ya vienen ordenados desc; preservar orden de inserción.
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

/** Fecha ISO YYYY-MM-DD de hoy y de hace N días. */
export function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}
