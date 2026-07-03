import { supabase } from '@/lib/supabase';
import { logger, LogModule } from '@/lib/logger';
import { ToastService } from '@/lib/toast';
import {
  enqueueMutation, getQueue, removeMutation, updateMutation, uuid,
  type QueuedMutation,
} from '@/lib/idb';

/**
 * Cola de mutaciones offline (Outbox). Fuente: docs/architecture/pwa-and-offline-strategy §4.2.
 * Encola escrituras cuando no hay red, aplica FIFO con backoff e idempotencia
 * (los inserts llevan `id` uuid de cliente → 23505 en reintento = éxito).
 */
const MAX_RETRIES = 5;
const BACKOFF_MS = [1000, 5000, 30_000, 120_000, 600_000];

let flushing = false;
let initialized = false;

export const OfflineQueueService = {
  /** Encola una mutación y programa flush. Devuelve el id (== PK en inserts). */
  async enqueue(
    m: Omit<QueuedMutation, 'id' | 'createdAt' | 'retries' | 'clientId'> & { id?: string }
  ): Promise<string> {
    const id = m.id ?? uuid();
    const mutation: QueuedMutation = {
      ...m,
      id,
      createdAt: new Date().toISOString(),
      retries: 0,
      clientId: id,
      status: 'pending',
    };
    await enqueueMutation(mutation);
    void this.flush();
    return id;
  },

  /** Procesa la cola en orden. Idempotente (guard `flushing`). */
  async flush(): Promise<void> {
    if (flushing || !navigator.onLine) return;
    flushing = true;
    try {
      const queue = await getQueue();
      for (const m of queue) {
        if (m.status === 'failed') continue;
        const ok = await this.execute(m);
        if (ok) {
          await removeMutation(m.id);
        } else {
          const retries = m.retries + 1;
          if (retries >= MAX_RETRIES) {
            await updateMutation({ ...m, retries, status: 'failed' });
            ToastService.error('Sincronización fallida', 'Una acción no pudo guardarse. Revísala en tu perfil.');
          } else {
            await updateMutation({ ...m, retries });
            // Reintento con backoff (sin bloquear el resto de la cola).
            setTimeout(() => void this.flush(), BACKOFF_MS[retries] ?? 600_000);
            break; // Respetar orden FIFO: no saltar la mutación atascada.
          }
        }
      }
    } finally {
      flushing = false;
    }
  },

  /** Ejecuta una mutación contra Supabase. true = éxito (o duplicado idempotente). */
  async execute(m: QueuedMutation): Promise<boolean> {
    try {
      if (m.operation === 'rpc' && m.rpcName) {
        const { error } = await supabase.rpc(m.rpcName, m.payload);
        if (error) throw error;
        return true;
      }
      if (m.operation === 'insert' && m.table) {
        const { error } = await supabase.from(m.table).insert(m.payload);
        if (error) {
          if (error.code === '23505') return true; // Duplicado → ya aplicado.
          throw error;
        }
        return true;
      }
      if ((m.operation === 'update' || m.operation === 'soft_delete') && m.table) {
        const { match, values } = m.payload as { match: Record<string, unknown>; values: Record<string, unknown> };
        let q = supabase.from(m.table).update(values);
        for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
        const { error } = await q;
        if (error) throw error;
        return true;
      }
      logger.warn(LogModule.STORE, 'Mutación desconocida en cola', m);
      return false;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      // 4xx no transitorio (permisos, validación) → descartar, no reintentar.
      if (code === '42501' || code === '23514' || code === '22P02') {
        logger.error(LogModule.STORE, 'Mutación descartada (4xx)', error);
        void removeMutation(m.id);
        return true; // Sacarla de la cola (no reintentar).
      }
      logger.warn(LogModule.STORE, 'Fallo de mutación (reintentará)', error);
      return false;
    }
  },

  /** Registra listeners de reconexión/foco para vaciar la cola. Llamar una vez. */
  init(): void {
    if (initialized) return;
    initialized = true;
    window.addEventListener('online', () => void this.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void this.flush();
    });
    // Flush inicial por si quedaron mutaciones de una sesión previa.
    void this.flush();
  },
};
