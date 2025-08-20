/**
 * Utilidades de validación y transformación de datos
 * Complementa la validación de Zod con funciones helper
 */

import { z } from 'zod';
import { logger, LogModule } from './logger';

/**
 * Límites de seguridad para validación
 */
export const VALIDATION_LIMITS = {
  MAX_STRING_LENGTH: 5000,
  MAX_ARRAY_LENGTH: 1000,
  MAX_OBJECT_DEPTH: 10,
  MAX_NUMBER: Number.MAX_SAFE_INTEGER,
  MIN_NUMBER: Number.MIN_SAFE_INTEGER,
} as const;

/**
 * Wrapper seguro para parsing con mejor manejo de errores
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
  options?: {
    errorMessage?: string;
    context?: Record<string, unknown>;
  }
):
  | { success: true; data: T }
  | { success: false; error: string; details?: z.ZodError } {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    // Log en desarrollo
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      logger.debug(LogModule.VALIDATION, 'Validation failed', {
        errors: result.error.errors,
        ...options?.context,
      });
    }

    return {
      success: false,
      error: options?.errorMessage || 'Datos inválidos',
      details: result.error,
    };
  } catch (error) {
    // Error inesperado en validación
    logger.error(LogModule.VALIDATION, 'Unexpected validation error', error);

    return {
      success: false,
      error: 'Error al validar datos',
    };
  }
}

/**
 * Valida un array con límites de seguridad
 */
export function validateArray<T>(
  schema: z.ZodType<T>,
  data: unknown,
  options?: {
    maxLength?: number;
    minLength?: number;
    unique?: boolean;
    uniqueBy?: (item: T) => string;
  }
): T[] {
  const {
    maxLength = VALIDATION_LIMITS.MAX_ARRAY_LENGTH,
    minLength = 0,
    unique = false,
    uniqueBy,
  } = options || {};

  // Verificar que es un array
  if (!Array.isArray(data)) {
    throw new Error('Se esperaba un array');
  }

  // Verificar límites
  if (data.length < minLength) {
    throw new Error(`Array debe tener al menos ${minLength} elementos`);
  }

  if (data.length > maxLength) {
    throw new Error(`Array no puede tener más de ${maxLength} elementos`);
  }

  // Validar cada elemento
  const validatedItems: T[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < data.length; i++) {
    const item = schema.parse(data[i]);

    // Verificar unicidad si es necesario
    if (unique || uniqueBy) {
      const key = uniqueBy ? uniqueBy(item) : JSON.stringify(item);
      if (seen.has(key)) {
        throw new Error(`Elemento duplicado en posición ${i}`);
      }
      seen.add(key);
    }

    validatedItems.push(item);
  }

  return validatedItems;
}

/**
 * Sanitiza una cadena de texto
 */
export function sanitizeString(
  input: unknown,
  options?: {
    maxLength?: number;
    trim?: boolean;
    lowercase?: boolean;
    uppercase?: boolean;
    removeHtml?: boolean;
    removeSpecialChars?: boolean;
    allowedChars?: RegExp;
  }
): string {
  const {
    maxLength = VALIDATION_LIMITS.MAX_STRING_LENGTH,
    trim = true,
    lowercase = false,
    uppercase = false,
    removeHtml = true,
    removeSpecialChars = false,
    allowedChars,
  } = options || {};

  // Convertir a string
  let str = String(input || '');

  // Trim
  if (trim) {
    str = str.trim();
  }

  // Remover HTML
  if (removeHtml) {
    str = str.replace(/<[^>]*>/g, '');
    // Decodificar entidades HTML básicas
    str = str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Remover caracteres especiales
  if (removeSpecialChars) {
    str = str.replace(/[^\w\s-]/g, '');
  }

  // Aplicar filtro de caracteres permitidos
  if (allowedChars) {
    str = str
      .split('')
      .filter((char) => allowedChars.test(char))
      .join('');
  }

  // Transformar caso
  if (lowercase) {
    str = str.toLowerCase();
  } else if (uppercase) {
    str = str.toUpperCase();
  }

  // Truncar si es necesario
  if (str.length > maxLength) {
    str = str.substring(0, maxLength);
  }

  return str;
}

/**
 * Valida y sanitiza un email
 */
export function validateEmail(input: unknown): string {
  const email = sanitizeString(input, {
    lowercase: true,
    trim: true,
    maxLength: 254, // Límite RFC para emails
  });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    throw new Error('Email inválido');
  }

  return email;
}

/**
 * Valida y sanitiza un número
 */
export function validateNumber(
  input: unknown,
  options?: {
    min?: number;
    max?: number;
    integer?: boolean;
    positive?: boolean;
    decimals?: number;
  }
): number {
  const {
    min = VALIDATION_LIMITS.MIN_NUMBER,
    max = VALIDATION_LIMITS.MAX_NUMBER,
    integer = false,
    positive = false,
    decimals,
  } = options || {};

  // Convertir a número
  const num = Number(input);

  // Verificar que es un número válido
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Debe ser un número válido');
  }

  // Verificar límites
  if (num < min) {
    throw new Error(`El número debe ser mayor o igual a ${min}`);
  }

  if (num > max) {
    throw new Error(`El número debe ser menor o igual a ${max}`);
  }

  // Verificar si debe ser positivo
  if (positive && num <= 0) {
    throw new Error('El número debe ser positivo');
  }

  // Verificar si debe ser entero
  if (integer && !Number.isInteger(num)) {
    throw new Error('El número debe ser entero');
  }

  // Redondear decimales si es necesario
  if (decimals !== undefined && decimals >= 0) {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  return num;
}

/**
 * Valida una fecha
 */
export function validateDate(
  input: unknown,
  options?: {
    min?: Date | string;
    max?: Date | string;
    futureOnly?: boolean;
    pastOnly?: boolean;
  }
): Date {
  const { min, max, futureOnly = false, pastOnly = false } = options || {};

  // Convertir a fecha
  const date = new Date(String(input));

  // Verificar que es una fecha válida
  if (isNaN(date.getTime())) {
    throw new Error('Fecha inválida');
  }

  const now = new Date();

  // Verificar restricciones temporales
  if (futureOnly && date <= now) {
    throw new Error('La fecha debe ser futura');
  }

  if (pastOnly && date >= now) {
    throw new Error('La fecha debe ser pasada');
  }

  // Verificar límites
  if (min) {
    const minDate = new Date(min);
    if (date < minDate) {
      throw new Error(`La fecha debe ser posterior a ${minDate.toISOString()}`);
    }
  }

  if (max) {
    const maxDate = new Date(max);
    if (date > maxDate) {
      throw new Error(`La fecha debe ser anterior a ${maxDate.toISOString()}`);
    }
  }

  return date;
}

/**
 * Valida un UUID
 */
export function validateUUID(input: unknown): string {
  const uuid = sanitizeString(input, {
    trim: true,
    lowercase: true,
    maxLength: 36,
  });

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    throw new Error('UUID inválido');
  }

  return uuid;
}

/**
 * Valida un objeto con profundidad máxima
 */
export function validateObject(
  input: unknown,
  maxDepth: number = VALIDATION_LIMITS.MAX_OBJECT_DEPTH
): Record<string, unknown> {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Se esperaba un objeto');
  }

  if (Array.isArray(input)) {
    throw new Error('Se recibió un array en lugar de un objeto');
  }

  // Verificar profundidad
  const checkDepth = (obj: unknown, currentDepth: number = 0): void => {
    if (currentDepth > maxDepth) {
      throw new Error(`Objeto excede profundidad máxima de ${maxDepth}`);
    }

    for (const value of Object.values(obj as Record<string, unknown>)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        checkDepth(value, currentDepth + 1);
      }
    }
  };

  checkDepth(input);

  return input as Record<string, unknown>;
}

/**
 * Transforma y limpia un objeto removiendo valores null/undefined
 */
export function cleanObject<T extends Record<string, unknown>>(
  obj: T,
  options?: {
    removeNull?: boolean;
    removeUndefined?: boolean;
    removeEmptyStrings?: boolean;
    removeEmptyArrays?: boolean;
    deep?: boolean;
  }
): Partial<T> {
  const {
    removeNull = true,
    removeUndefined = true,
    removeEmptyStrings = false,
    removeEmptyArrays = false,
    deep = true,
  } = options || {};

  const clean = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      if (removeEmptyArrays && value.length === 0) {
        return undefined;
      }
      return deep ? value.map(clean).filter((v) => v !== undefined) : value;
    }

    if (typeof value === 'object' && value !== null) {
      const cleaned: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(value)) {
        const cleanedVal = deep ? clean(val) : val;

        if (
          (removeNull && cleanedVal === null) ||
          (removeUndefined && cleanedVal === undefined) ||
          (removeEmptyStrings && cleanedVal === '') ||
          (removeEmptyArrays &&
            Array.isArray(cleanedVal) &&
            cleanedVal.length === 0)
        ) {
          continue;
        }

        cleaned[key] = cleanedVal;
      }

      return cleaned;
    }

    return value;
  };

  return clean(obj);
}

/**
 * Crea un validador con caché para mejorar performance
 */
export function createCachedValidator<T>(
  schema: z.ZodType<T>,
  cacheSize: number = 100
) {
  const cache = new Map<string, T>();

  return {
    validate: (data: unknown): T => {
      const key = JSON.stringify(data);

      // Verificar caché
      if (cache.has(key)) {
        return cache.get(key)!;
      }

      // Validar
      const result = schema.parse(data);

      // Almacenar en caché
      if (cache.size >= cacheSize) {
        // Eliminar entrada más antigua (FIFO)
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }
      cache.set(key, result);

      return result;
    },

    clearCache: () => cache.clear(),
    getCacheSize: () => cache.size,
  };
}
