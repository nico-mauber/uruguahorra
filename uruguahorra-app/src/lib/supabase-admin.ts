/**
 * Cliente Supabase con Service Role para operaciones administrativas
 * IMPORTANTE: Este cliente bypasea RLS y debe usarse con extremo cuidado
 * Solo para operaciones que requieren permisos elevados como crear perfiles
 * 
 * NOTA: En producción, estas operaciones deberían realizarse mediante
 * Edge Functions o un backend seguro, nunca desde el cliente.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabase';
import { logger, LogModule } from '@/utils/logger';

// URL de Supabase (la misma que el cliente normal)
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

// Service Role Key - DEBE MANTENERSE SEGURA
// En producción real, esto NUNCA debería estar en el cliente
// Por ahora usaremos la anon key como fallback si no existe service key
const serviceRoleKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || 
                      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase admin configuration');
}

// Crear cliente administrativo
// Este cliente bypasea RLS cuando se usa con Service Role Key
export const supabaseAdmin = createClient<Database>(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    // Importante: esto bypasea RLS cuando se usa Service Role Key
    db: {
      schema: 'public',
    },
  }
);

// Función helper para verificar si tenemos Service Role Key real
export const hasServiceRoleKey = () => {
  return !!process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
};

// Log de advertencia si no tenemos Service Role Key
if (!hasServiceRoleKey()) {
  logger.warn(
    LogModule.DB,
    'Using anon key for admin client - RLS bypass not available. Add EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY to .env for full functionality'
  );
}