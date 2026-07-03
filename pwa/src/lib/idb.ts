import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

/**
 * IndexedDB (`uruguahorra-db`). Fuente: docs/architecture/pwa-and-offline-strategy §4.
 * Stores: cola de mutaciones + cachés por entidad + kv.
 */
export interface QueuedMutation {
  id: string; // uuid v4 (idempotencia; == PK del registro en inserts)
  entity: 'contribution' | 'transaction' | 'checkin' | 'squad_contribution' | 'goal' | 'preference';
  operation: 'insert' | 'update' | 'soft_delete' | 'rpc';
  table?: string; // tabla destino para insert/update/soft_delete
  payload: Record<string, unknown>;
  rpcName?: string;
  createdAt: string;
  retries: number;
  clientId: string;
  status?: 'pending' | 'failed';
}

interface UruguahorraDB extends DBSchema {
  'mutation-queue': { key: string; value: QueuedMutation; indexes: { createdAt: string; entity: string } };
  'cache-goals': { key: string; value: Record<string, unknown>; indexes: { userId: string } };
  'cache-transactions': { key: string; value: Record<string, unknown>; indexes: { userId: string } };
  'cache-sessions': { key: string; value: Record<string, unknown>; indexes: { userId: string } };
  'cache-categories': { key: string; value: Record<string, unknown> };
  'cache-profile': { key: string; value: Record<string, unknown> };
  kv: { key: string; value: unknown };
}

let dbPromise: Promise<IDBPDatabase<UruguahorraDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<UruguahorraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<UruguahorraDB>('uruguahorra-db', 1, {
      upgrade(db) {
        const mq = db.createObjectStore('mutation-queue', { keyPath: 'id' });
        mq.createIndex('createdAt', 'createdAt');
        mq.createIndex('entity', 'entity');

        for (const name of ['cache-goals', 'cache-transactions', 'cache-sessions'] as const) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          // Índice 'userId' → campo real snake_case `user_id` de las filas de BD.
          store.createIndex('userId', 'user_id');
        }
        db.createObjectStore('cache-categories', { keyPath: 'id' });
        db.createObjectStore('cache-profile', { keyPath: 'id' });
        db.createObjectStore('kv');
      },
    });
  }
  return dbPromise;
}

/** uuid v4 (crypto nativo). */
export function uuid(): string {
  return crypto.randomUUID();
}

// ---- Cola de mutaciones ----
export async function enqueueMutation(m: QueuedMutation): Promise<void> {
  const db = await getDB();
  await db.put('mutation-queue', m);
}

export async function getQueue(): Promise<QueuedMutation[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex('mutation-queue', 'createdAt');
  return all;
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('mutation-queue', id);
}

export async function updateMutation(m: QueuedMutation): Promise<void> {
  const db = await getDB();
  await db.put('mutation-queue', m);
}

// ---- kv ----
export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  return (await db.get('kv', key)) as T | undefined;
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await getDB();
  await db.put('kv', value, key);
}

// ---- Cachés genéricas ----
type CacheStore = 'cache-goals' | 'cache-transactions' | 'cache-sessions' | 'cache-categories' | 'cache-profile';

export async function cachePut(store: CacheStore, rows: Record<string, unknown>[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');
  await Promise.all(rows.map((r) => tx.store.put(r)));
  await tx.done;
}

export async function cacheGetByUser(
  store: 'cache-goals' | 'cache-transactions' | 'cache-sessions',
  userId: string
): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAllFromIndex(store, 'userId', userId);
}

export async function cacheGetAll(store: CacheStore): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  return db.getAll(store);
}

/** Borra TODAS las stores (logout). §4 */
export async function clearAllStores(): Promise<void> {
  const db = await getDB();
  const stores = [
    'mutation-queue', 'cache-goals', 'cache-transactions', 'cache-sessions',
    'cache-categories', 'cache-profile', 'kv',
  ] as const;
  const tx = db.transaction(stores, 'readwrite');
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
  await tx.done;
}
