/**
 * Catálogo centralizado de mensajes de error seguros para usuarios
 * Previene exposición de información sensible (CWE-209)
 */

/**
 * Mensajes de error seguros por categoría
 */
export const ERROR_MESSAGES = {
  // Autenticación
  AUTH: {
    INVALID_CREDENTIALS: 'Email o contraseña incorrectos.',
    SESSION_EXPIRED:
      'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
    ACCOUNT_LOCKED: 'Tu cuenta ha sido bloqueada temporalmente por seguridad.',
    RATE_LIMITED: 'Demasiados intentos. Por favor, espera unos minutos.',
    USER_EXISTS: 'Este email ya está registrado.',
    USER_NOT_FOUND: 'No se encontró una cuenta con este email.',
    INVALID_TOKEN: 'El enlace de verificación es inválido o ha expirado.',
    PASSWORD_RESET_FAILED:
      'No se pudo restablecer la contraseña. Intenta nuevamente.',
  },

  // Validación
  VALIDATION: {
    REQUIRED_FIELD: 'Este campo es obligatorio.',
    INVALID_EMAIL: 'Por favor, ingresa un email válido.',
    INVALID_PASSWORD: 'La contraseña debe tener al menos 6 caracteres.',
    INVALID_AMOUNT: 'Por favor, ingresa un monto válido.',
    INVALID_DATE: 'Por favor, ingresa una fecha válida.',
    AMOUNT_TOO_LARGE: 'El monto excede el límite permitido.',
    AMOUNT_TOO_SMALL: 'El monto debe ser mayor a cero.',
    TEXT_TOO_LONG: 'El texto es demasiado largo.',
    INVALID_FORMAT: 'El formato no es válido.',
  },

  // Archivos
  FILE: {
    TOO_LARGE: 'El archivo es demasiado grande. Máximo permitido: 2MB.',
    INVALID_TYPE: 'Tipo de archivo no permitido. Solo se aceptan archivos CSV.',
    EMPTY: 'El archivo está vacío.',
    PARSE_ERROR: 'No se pudo leer el archivo. Verifica que sea un CSV válido.',
    TOO_MANY_ROWS: 'El archivo tiene demasiadas filas. Máximo permitido: 1000.',
    INVALID_STRUCTURE: 'La estructura del archivo no es correcta.',
    MISSING_COLUMNS: 'El archivo no tiene las columnas requeridas.',
  },

  // Metas
  GOALS: {
    NOT_FOUND: 'Meta no encontrada.',
    LIMIT_EXCEEDED: 'Has alcanzado el límite de metas permitidas.',
    ALREADY_EXISTS: 'Ya tienes una meta similar.',
    INVALID_TARGET: 'El monto objetivo debe ser mayor a cero.',
    INVALID_DEADLINE: 'La fecha límite debe ser futura.',
    CANNOT_DELETE: 'No se puede eliminar una meta con ahorros.',
    CANNOT_UPDATE: 'No se puede modificar esta meta.',
  },

  // Transacciones
  TRANSACTIONS: {
    IMPORT_FAILED: 'No se pudieron importar las transacciones.',
    DUPLICATE: 'Esta transacción ya existe.',
    INVALID_DATA: 'Los datos de la transacción no son válidos.',
    PROCESSING_ERROR: 'Error al procesar las transacciones.',
    NO_VALID_ROWS: 'No se encontraron transacciones válidas para importar.',
  },

  // Suscripción
  SUBSCRIPTION: {
    REQUIRED: 'Esta función requiere una suscripción premium.',
    EXPIRED: 'Tu suscripción ha expirado.',
    PAYMENT_FAILED: 'No se pudo procesar el pago.',
    ALREADY_SUBSCRIBED: 'Ya tienes una suscripción activa.',
    CANCELLATION_FAILED: 'No se pudo cancelar la suscripción.',
  },

  // Red/Conexión
  NETWORK: {
    CONNECTION_ERROR: 'Error de conexión. Verifica tu internet.',
    TIMEOUT: 'La solicitud tardó demasiado. Intenta nuevamente.',
    SERVICE_UNAVAILABLE: 'El servicio no está disponible en este momento.',
    OFFLINE: 'No hay conexión a internet.',
  },

  // Errores genéricos
  GENERIC: {
    UNKNOWN: 'Ha ocurrido un error inesperado.',
    TRY_AGAIN: 'Ha ocurrido un error. Por favor, intenta nuevamente.',
    CONTACT_SUPPORT: 'Ha ocurrido un error. Si persiste, contacta soporte.',
    MAINTENANCE: 'El sistema está en mantenimiento. Intenta más tarde.',
    PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
    NOT_FOUND: 'No se encontró lo que buscabas.',
  },
} as const;

/**
 * Mensajes para errores específicos de CSV
 */
export const CSV_ERROR_MESSAGES = {
  ROW_ERROR: (row: number) => `Error en fila ${row}`,
  MISSING_DATE: (row: number) => `Fila ${row}: Fecha requerida`,
  MISSING_DESCRIPTION: (row: number) => `Fila ${row}: Descripción requerida`,
  INVALID_AMOUNT: (row: number) => `Fila ${row}: Monto inválido`,
  INVALID_DATE: (row: number) => `Fila ${row}: Fecha inválida`,
  PARSE_ERROR: 'Error al leer el archivo CSV',
  EMPTY_FILE: 'El archivo está vacío',
  TOO_MANY_ERRORS: 'Demasiados errores en el archivo',
} as const;

/**
 * Mapeo de errores de Supabase a mensajes seguros
 */
export const SUPABASE_ERROR_MAP: Record<string, string> = {
  // Auth errors
  'Invalid login credentials': ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
  'User already registered': ERROR_MESSAGES.AUTH.USER_EXISTS,
  'User not found': ERROR_MESSAGES.AUTH.USER_NOT_FOUND,
  'Email not confirmed':
    'Por favor, verifica tu email antes de iniciar sesión.',
  'Invalid token': ERROR_MESSAGES.AUTH.INVALID_TOKEN,

  // Database errors
  '23505': 'Este registro ya existe.', // unique_violation
  '23503': 'No se puede eliminar porque hay datos relacionados.', // foreign_key_violation
  '23502': 'Faltan datos requeridos.', // not_null_violation
  '23514': 'Los datos no cumplen con las restricciones.', // check_violation
  '42501': ERROR_MESSAGES.GENERIC.PERMISSION_DENIED, // insufficient_privilege
  PGRST116: ERROR_MESSAGES.GENERIC.NOT_FOUND, // not found

  // Network/Connection
  'Failed to fetch': ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
  'Network request failed': ERROR_MESSAGES.NETWORK.CONNECTION_ERROR,
  timeout: ERROR_MESSAGES.NETWORK.TIMEOUT,

  // Rate limiting
  'too many requests': ERROR_MESSAGES.AUTH.RATE_LIMITED,
  'rate limit': ERROR_MESSAGES.AUTH.RATE_LIMITED,
};

/**
 * Obtiene un mensaje seguro basado en el error original
 */
export function getSafeErrorMessage(error: unknown): string {
  // Si es un string, buscar en el mapeo
  if (typeof error === 'string') {
    // Buscar coincidencia parcial en el mapeo
    for (const [key, message] of Object.entries(SUPABASE_ERROR_MAP)) {
      if (error.toLowerCase().includes(key.toLowerCase())) {
        return message;
      }
    }
    // No retornar el string original por seguridad
    return ERROR_MESSAGES.GENERIC.TRY_AGAIN;
  }

  // Si es un objeto Error
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Buscar en el mapeo de Supabase
    for (const [key, message] of Object.entries(SUPABASE_ERROR_MAP)) {
      if (errorMessage.includes(key.toLowerCase())) {
        return message;
      }
    }

    // Verificar si tiene código de error
    if ('code' in error && typeof error.code === 'string') {
      const mappedMessage = SUPABASE_ERROR_MAP[error.code];
      if (mappedMessage) {
        return mappedMessage;
      }
    }
  }

  // Por defecto, retornar mensaje genérico
  return ERROR_MESSAGES.GENERIC.TRY_AGAIN;
}

/**
 * Formatea un mensaje de error para mostrar al usuario
 */
export function formatUserErrorMessage(
  error: unknown,
  defaultMessage: string = ERROR_MESSAGES.GENERIC.TRY_AGAIN
): string {
  try {
    return getSafeErrorMessage(error);
  } catch {
    return defaultMessage;
  }
}

/**
 * Determina si un error debe mostrar opción de contactar soporte
 */
export function shouldShowSupport(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    if ('severity' in error) {
      return error.severity === 'critical' || error.severity === 'error';
    }
    if ('code' in error && typeof error.code === 'string') {
      // Errores que requieren soporte
      const supportCodes = ['GEN001', 'DB003', 'DB004', 'NET002'];
      return supportCodes.includes(error.code);
    }
  }
  return false;
}
