/**
 * Capa de validación para respuestas de Supabase
 * Garantiza type safety en runtime para todas las operaciones de DB
 * Previene CWE-20: Improper Input Validation
 */

import { z } from 'zod';
import { logger, LogModule } from './logger';
import { createValidationError, handleError } from './error-handler';

/**
 * Opciones para validación de respuestas
 */
interface ValidationOptions {
  /**
   * Si debe loguear errores de validación
   */
  logErrors?: boolean;

  /**
   * Contexto adicional para logging
   */
  context?: Record<string, unknown>;

  /**
   * Mensaje de error personalizado para el usuario
   */
  userMessage?: string;

  /**
   * Si debe permitir datos adicionales no definidos en el esquema
   */
  strict?: boolean;
}

/**
 * Resultado de validación exitosa
 */
interface ValidationSuccess<T> {
  success: true;
  data: T;
}

/**
 * Resultado de validación fallida
 */
interface ValidationError {
  success: false;
  error: z.ZodError;
  userMessage: string;
}

/**
 * Tipo de resultado de validación
 */
type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

/**
 * Valida una respuesta de Supabase contra un esquema
 */
export function validateSupabaseResponse<T>(
  schema: z.ZodType<T>,
  response: { data: unknown; error: unknown },
  options: ValidationOptions = {}
): ValidationResult<T> {
  const {
    logErrors = true,
    context = {},
    userMessage = 'Error al procesar datos',
    // strict = false, // Reserved for future use
  } = options;

  // Si hay error de Supabase, no validar data
  if (response.error) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          message: 'Supabase returned an error',
          path: [],
        },
      ]),
      userMessage: 'Error en la operación de base de datos',
    };
  }

  // Validar data con el esquema
  try {
    // Note: strict option is for future use when Zod supports it
    const validatedData = schema.parse(response.data);

    // Log exitoso en desarrollo
    if (__DEV__ || process.env.NODE_ENV === 'development') {
      logger.debug(LogModule.DB, 'Validación exitosa', {
        schemaName: schema._def?.typeName || 'Unknown',
        ...context,
      });
    }

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log error de validación
      if (logErrors) {
        logger.warn(LogModule.DB, 'Error de validación de datos', {
          errors: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
          ...context,
        });
      }

      return {
        success: false,
        error,
        userMessage,
      };
    }

    // Error inesperado
    const appError = handleError(error, {
      action: 'VALIDATE_RESPONSE',
    });

    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          message: appError.internalMessage,
          path: [],
        },
      ]),
      userMessage: appError.userMessage,
    };
  }
}

/**
 * Valida una respuesta y lanza error si falla
 */
export function assertValidResponse<T>(
  schema: z.ZodType<T>,
  response: { data: unknown; error: unknown },
  options: ValidationOptions = {}
): T {
  const result = validateSupabaseResponse(schema, response, options);

  if (!result.success) {
    throw createValidationError(
      result.error.errors[0]?.message || 'Validation failed',
      result.error.errors[0]?.path.join('.'),
      result.userMessage
    );
  }

  return result.data;
}

/**
 * Valida un array de respuestas
 */
export function validateSupabaseArray<T>(
  schema: z.ZodType<T>,
  response: { data: unknown; error: unknown },
  options: ValidationOptions & { maxItems?: number } = {}
): ValidationResult<T[]> {
  const { maxItems = 1000, ...validationOptions } = options;

  // Primero validar que es un array
  if (!response.error && !Array.isArray(response.data)) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'array',
          received: typeof response.data,
          path: [],
          message: 'Se esperaba un array',
        },
      ]),
      userMessage: 'Formato de datos incorrecto',
    };
  }

  // Validar límite de items
  if (Array.isArray(response.data) && response.data.length > maxItems) {
    logger.warn(LogModule.DB, 'Respuesta excede límite de items', {
      received: response.data.length,
      maxItems,
      ...options.context,
    });

    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'too_big',
          type: 'array',
          maximum: maxItems,
          inclusive: true,
          message: `Demasiados registros: ${response.data.length} > ${maxItems}`,
          path: [],
        },
      ]),
      userMessage: 'Demasiados registros para procesar',
    };
  }

  // Validar con esquema de array
  const arraySchema = z.array(schema);
  return validateSupabaseResponse(arraySchema, response, validationOptions);
}

/**
 * Valida un único registro (puede ser null)
 */
export function validateSupabaseSingle<T>(
  schema: z.ZodType<T>,
  response: { data: unknown; error: unknown },
  options: ValidationOptions & { allowNull?: boolean } = {}
): ValidationResult<T | null> {
  const { allowNull = true, ...validationOptions } = options;

  // Si es null y está permitido
  if (response.data === null && !response.error && allowNull) {
    return {
      success: true,
      data: null,
    };
  }

  // Validar con esquema
  return validateSupabaseResponse(schema, response, validationOptions);
}

/**
 * Crea un validador tipado para un servicio
 */
export function createSupabaseValidator<T>(
  schema: z.ZodType<T>,
  serviceName: string
) {
  return {
    /**
     * Valida una respuesta única
     */
    validateSingle: (
      response: { data: unknown; error: unknown },
      operation: string
    ) => {
      return validateSupabaseSingle(schema, response, {
        context: { service: serviceName, operation },
        userMessage: `Error al obtener ${serviceName}`,
      });
    },

    /**
     * Valida un array de respuestas
     */
    validateArray: (
      response: { data: unknown; error: unknown },
      operation: string,
      maxItems?: number
    ) => {
      return validateSupabaseArray(schema, response, {
        context: { service: serviceName, operation },
        userMessage: `Error al obtener lista de ${serviceName}`,
        maxItems,
      });
    },

    /**
     * Valida y asegura respuesta única
     */
    assertSingle: (
      response: { data: unknown; error: unknown },
      operation: string
    ): T | null => {
      const result = validateSupabaseSingle(schema, response, {
        context: { service: serviceName, operation },
        userMessage: `Error al procesar ${serviceName}`,
      });

      if (!result.success) {
        throw createValidationError(
          `Validation failed for ${serviceName}.${operation}`,
          undefined,
          result.userMessage
        );
      }

      return result.data;
    },

    /**
     * Valida y asegura array
     */
    assertArray: (
      response: { data: unknown; error: unknown },
      operation: string,
      maxItems?: number
    ): T[] => {
      const result = validateSupabaseArray(schema, response, {
        context: { service: serviceName, operation },
        userMessage: `Error al procesar lista de ${serviceName}`,
        maxItems,
      });

      if (!result.success) {
        throw createValidationError(
          `Validation failed for ${serviceName}.${operation}`,
          undefined,
          result.userMessage
        );
      }

      return result.data;
    },
  };
}

/**
 * Sanitiza y valida entrada de usuario antes de enviar a Supabase
 */
export function sanitizeAndValidateInput<T>(
  schema: z.ZodType<T>,
  input: unknown,
  options: {
    maxStringLength?: number;
    stripHtml?: boolean;
    trimStrings?: boolean;
  } = {}
): T {
  const {
    maxStringLength = 5000,
    stripHtml = true,
    trimStrings = true,
  } = options;

  // Pre-procesar input si es objeto
  let processedInput = input;

  if (typeof input === 'object' && input !== null) {
    processedInput = preprocessObject(input, {
      maxStringLength,
      stripHtml,
      trimStrings,
    });
  }

  // Validar con esquema
  try {
    return schema.parse(processedInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Crear error de validación con mensajes seguros
      const firstError = error.errors[0];
      throw createValidationError(
        `Invalid input: ${firstError.message}`,
        firstError.path.join('.'),
        'Los datos ingresados no son válidos'
      );
    }
    throw error;
  }
}

/**
 * Pre-procesa un objeto para sanitización
 */
function preprocessObject(
  obj: unknown,
  options: {
    maxStringLength: number;
    stripHtml: boolean;
    trimStrings: boolean;
  }
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => preprocessObject(item, options));
  }

  if (typeof obj === 'object' && obj !== null) {
    const processed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (typeof value === 'string') {
        let processedValue = value;

        // Trim strings
        if (options.trimStrings) {
          processedValue = processedValue.trim();
        }

        // Strip HTML tags
        if (options.stripHtml) {
          processedValue = processedValue.replace(/<[^>]*>/g, '');
        }

        // Truncate long strings
        if (processedValue.length > options.maxStringLength) {
          processedValue = processedValue.substring(0, options.maxStringLength);
          logger.warn(LogModule.VALIDATION, 'String truncated', {
            field: key,
            originalLength: value.length,
            maxLength: options.maxStringLength,
          });
        }

        processed[key] = processedValue;
      } else if (typeof value === 'object') {
        processed[key] = preprocessObject(value, options);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  return obj;
}

/**
 * Valida parámetros de paginación
 */
export function validatePagination(params: unknown): {
  limit: number;
  offset: number;
} {
  const schema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20).catch(20),
    offset: z.coerce.number().int().min(0).default(0).catch(0),
  });

  try {
    return schema.parse(params || {});
  } catch {
    // Valores por defecto seguros
    return { limit: 20, offset: 0 };
  }
}

/**
 * Valida un rango de fechas
 */
export function validateDateRange(params: unknown): {
  startDate: string;
  endDate: string;
} | null {
  const schema = z
    .object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
      message: 'End date must be after start date',
      path: ['endDate'],
    });

  const result = schema.safeParse(params);
  return result.success ? result.data : null;
}
