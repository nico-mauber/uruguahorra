/**
 * Módulo de Sanitización de Logs para Uruguahorra
 * Previene la exposición de información sensible y ataques de inyección de logs
 */

// Lista de campos sensibles que deben ser redactados
const SENSITIVE_FIELDS = [
  'password',
  'pass',
  'pwd',
  'secret',
  'token',
  'apikey',
  'api_key',
  'auth',
  'authorization',
  'session',
  'cookie',
  'credit_card',
  'creditcard',
  'cc',
  'cvv',
  'ssn',
  'pin',
  'private_key',
  'privatekey',
  'refresh_token',
  'refreshtoken',
  'access_token',
  'accesstoken',
  'bearer',
];

// Patrones de regex para detectar información sensible
const SENSITIVE_PATTERNS = [
  // JWT tokens
  /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*/g,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9-_]+/gi,
  // API keys genéricos
  /api[_-]?key[\s:=]+["']?[A-Za-z0-9-_]{20,}/gi,
  // Posibles contraseñas en URLs
  /(?:password|pwd|pass)[=:]["']?[^"'\s&]+/gi,
  // Números de tarjeta de crédito
  /\b(?:\d[ -]*?){13,19}\b/g,
  // CVV
  /\bcvv[\s:=]+\d{3,4}\b/gi,
];

// Caracteres de control que pueden corromper logs
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Secuencias ANSI que podrían manipular la terminal
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_REGEX = /\x1b\[[0-9;]*[a-zA-Z]/g;

// Caracteres de nueva línea que podrían inyectar logs falsos
// eslint-disable-next-line no-control-regex
const LOG_INJECTION_CHARS = /[\r\n\x0A\x0D]/g;

export class SecureLogger {
  private static readonly MAX_STRING_LENGTH = 1000;
  private static readonly MAX_OBJECT_DEPTH = 5;
  private static readonly REDACTED_VALUE = '[REDACTED]';
  private static readonly TRUNCATED_SUFFIX = '...[TRUNCATED]';

  /**
   * Sanitiza cualquier tipo de dato para logging seguro
   */
  static sanitizeData(data: unknown, depth: number = 0): unknown {
    // Prevenir recursión infinita
    if (depth > this.MAX_OBJECT_DEPTH) {
      return '[MAX_DEPTH_EXCEEDED]';
    }

    // Manejar null/undefined
    if (data === null || data === undefined) {
      return data;
    }

    // Sanitizar strings
    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    // Números y booleanos son seguros
    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    // Sanitizar arrays
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, depth + 1));
    }

    // Sanitizar objetos
    if (typeof data === 'object') {
      return this.sanitizeObject(data as Record<string, unknown>, depth);
    }

    // Funciones y símbolos
    if (typeof data === 'function') {
      return '[FUNCTION]';
    }

    if (typeof data === 'symbol') {
      return '[SYMBOL]';
    }

    // Por defecto, convertir a string y sanitizar
    return this.sanitizeString(String(data));
  }

  /**
   * Sanitiza objetos recursivamente
   */
  private static sanitizeObject(
    obj: Record<string, unknown>,
    depth: number
  ): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    // Manejar casos especiales de objetos
    if (obj instanceof Error) {
      return {
        name: this.sanitizeString(obj.name),
        message: this.sanitizeString(obj.message),
        stack: obj.stack ? this.sanitizeString(obj.stack) : undefined,
      };
    }

    if (obj instanceof Date) {
      return obj.toISOString();
    }

    // Procesar cada propiedad
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Verificar si la clave es sensible
      if (this.isSensitiveField(lowerKey)) {
        sanitized[key] = this.REDACTED_VALUE;
        continue;
      }

      // Casos especiales para campos comunes
      if (lowerKey === 'email' || lowerKey === 'user_email') {
        // Parcialmente ofuscar emails
        sanitized[key] = this.obfuscateEmail(value);
        continue;
      }

      if (lowerKey === 'phone' || lowerKey === 'telephone') {
        // Parcialmente ofuscar teléfonos
        sanitized[key] = this.obfuscatePhone(value);
        continue;
      }

      // Sanitizar valor recursivamente
      sanitized[key] = this.sanitizeData(value, depth + 1);
    }

    return sanitized;
  }

  /**
   * Sanitiza strings eliminando caracteres peligrosos
   */
  private static sanitizeString(str: string): string {
    if (typeof str !== 'string') {
      return String(str);
    }

    let sanitized = str;

    // Verificar patrones sensibles
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, this.REDACTED_VALUE);
    }

    // Eliminar caracteres de control
    sanitized = sanitized.replace(CONTROL_CHARS_REGEX, '');

    // Eliminar secuencias ANSI
    sanitized = sanitized.replace(ANSI_ESCAPE_REGEX, '');

    // Reemplazar caracteres de inyección de logs
    sanitized = sanitized.replace(LOG_INJECTION_CHARS, ' ');

    // Truncar strings muy largos
    if (sanitized.length > this.MAX_STRING_LENGTH) {
      sanitized =
        sanitized.substring(0, this.MAX_STRING_LENGTH) + this.TRUNCATED_SUFFIX;
    }

    return sanitized;
  }

  /**
   * Verifica si un campo es sensible
   */
  private static isSensitiveField(fieldName: string): boolean {
    const lowerField = fieldName.toLowerCase();
    return SENSITIVE_FIELDS.some((sensitive) => {
      // Verificar coincidencia exacta o parcial
      return (
        lowerField === sensitive ||
        lowerField.includes(sensitive) ||
        lowerField.endsWith('_' + sensitive) ||
        lowerField.startsWith(sensitive + '_')
      );
    });
  }

  /**
   * Ofusca parcialmente un email
   */
  private static obfuscateEmail(value: unknown): string {
    if (typeof value !== 'string' || !value.includes('@')) {
      return this.sanitizeData(value) as string;
    }

    const [local, domain] = value.split('@');
    if (!local || !domain) {
      return '[INVALID_EMAIL]';
    }

    const obfuscatedLocal =
      local.length > 3
        ? local.substring(0, 2) + '***' + local.substring(local.length - 1)
        : '***';

    return `${obfuscatedLocal}@${domain}`;
  }

  /**
   * Ofusca parcialmente un número de teléfono
   */
  private static obfuscatePhone(value: unknown): string {
    if (typeof value !== 'string') {
      return this.sanitizeData(value) as string;
    }

    // Mantener solo los últimos 4 dígitos
    const digits = value.replace(/\D/g, '');
    if (digits.length < 4) {
      return '***';
    }

    return '***-' + digits.substring(digits.length - 4);
  }

  /**
   * Sanitiza argumentos de error para logging
   */
  static sanitizeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      return {
        name: this.sanitizeString(error.name),
        message: this.sanitizeString(error.message),
        stack: error.stack
          ? this.sanitizeString(error.stack.substring(0, 500))
          : undefined,
      };
    }

    if (typeof error === 'object' && error !== null) {
      return this.sanitizeObject(error as Record<string, unknown>, 0);
    }

    return { message: this.sanitizeString(String(error)) };
  }

  /**
   * Crea un resumen seguro de datos para logging
   */
  static createSafeSummary(data: unknown): string {
    const sanitized = this.sanitizeData(data);
    try {
      return JSON.stringify(sanitized, null, 2);
    } catch {
      return '[SERIALIZATION_ERROR]';
    }
  }
}
