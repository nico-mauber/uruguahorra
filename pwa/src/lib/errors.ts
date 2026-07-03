/**
 * Mapeo de errores → mensajes en español.
 * Fuente: docs/api/contracts-and-data-mapping.md §5.
 */

interface SupabaseLikeError {
  code?: string;
  message?: string;
  details?: string;
}

function isRecord(e: unknown): e is Record<string, unknown> {
  return typeof e === 'object' && e !== null;
}

function asSupabaseError(e: unknown): SupabaseLikeError {
  if (!isRecord(e)) return {};
  return {
    code: typeof e.code === 'string' ? e.code : undefined,
    message: typeof e.message === 'string' ? e.message : undefined,
    details: typeof e.details === 'string' ? e.details : undefined,
  };
}

/**
 * Devuelve el mensaje en español apropiado para un error de Supabase/red.
 * @param opts.context 'goal' ajusta el mensaje de 23505 a metas.
 */
export function getErrorMessage(
  error: unknown,
  opts?: { context?: 'goal' }
): string {
  // Error de red (fetch lanza TypeError).
  if (error instanceof TypeError) {
    return 'Sin conexión: guardado localmente';
  }

  const e = asSupabaseError(error);

  if (e.code === '23505') {
    return opts?.context === 'goal'
      ? 'Ya existe una meta con ese nombre'
      : 'Ya existe un registro con esos datos';
  }
  if (e.code === '42501') {
    return 'No tienes permisos para esta acción. Verifica tu sesión.';
  }
  if (e.code === 'PGRST116') {
    return 'No se encontró el registro solicitado';
  }
  if (e.message && /rate_limit/i.test(e.message)) {
    return 'Por favor espera unos segundos antes de intentar nuevamente';
  }
  if (e.message && /email not confirmed/i.test(e.message)) {
    return 'Tu email aún no está confirmado. Revisa tu casilla o intenta más tarde.';
  }
  if (e.message && /invalid login credentials/i.test(e.message)) {
    return 'Email o contraseña incorrectos.';
  }
  if (e.message && /fetch|network|failed to fetch/i.test(e.message)) {
    return 'Sin conexión: guardado localmente';
  }

  return e.message || 'Ocurrió un error inesperado. Intenta nuevamente.';
}
