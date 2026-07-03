/**
 * Cliente Supabase único. Fuente: docs/architecture/pwa-and-offline-strategy §1,
 * docs/api/contracts-and-data-mapping §1.
 * SOLO claves públicas (anon). Ninguna clave privada en el bundle.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  // No romper el build; advertir en runtime. Fase 02 requiere estas vars para auth real.
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local.'
  );
}

/**
 * Cliente sin genérico de tipos en esta fase. Los resultados se castean a los
 * tipos de `@/types/database` en la capa de store/servicio.
 * DEUDA (progress.md): adoptar tipos generados con `supabase gen types typescript`
 * en fases futuras para tipar `from()`/`rpc()` de punta a punta.
 */
export const supabase = createClient(
  url ?? 'http://localhost',
  anonKey ?? 'public-anon-key-placeholder'
);
