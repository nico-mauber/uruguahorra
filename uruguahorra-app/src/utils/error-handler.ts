/**
 * Sistema centralizado de manejo de errores seguro
 * Previene la exposición de información sensible (CWE-209)
 */

import { logger, LogModule } from './logger';
import { z } from 'zod';
import {
  AppError,
  ErrorCategory,
  ErrorCode,
  ErrorSeverity,
  ValidationError,
  AuthenticationError,
  BusinessError,
  FileProcessingError,
  SafeErrorContext,
  isAppError,
} from '@/types/errors';
import {
  ERROR_MESSAGES,
  SUPABASE_ERROR_MAP,
  getSafeErrorMessage,
} from './error-messages';

/**
 * Opciones para el manejo de errores
 */
interface ErrorHandlerOptions {
  logError?: boolean;
  includeContext?: boolean;
  userId?: string;
  action?: string;
  resource?: string;
}

/**
 * Clase principal para manejo seguro de errores
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  /**
   * Obtiene la instancia singleton
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Maneja un error y retorna una versión segura
   */
  handle(error: unknown, options: ErrorHandlerOptions = {}): AppError {
    const { logError = true, userId, action, resource } = options;

    // Si ya es un AppError, solo loguear si es necesario
    if (isAppError(error)) {
      if (logError) {
        this.logError(error, options);
      }
      return error;
    }

    // Convertir el error a AppError seguro
    const appError = this.convertToAppError(error, {
      userId,
      action,
      resource,
    });

    // Loguear el error interno
    if (logError) {
      this.logError(appError, options);
    }

    return appError;
  }

  /**
   * Convierte cualquier error a un AppError seguro
   */
  private convertToAppError(
    error: unknown,
    context?: SafeErrorContext
  ): AppError {
    // Error de Zod (validación)
    if (error instanceof z.ZodError) {
      return this.handleZodError(error, context);
    }

    // Error de Supabase
    if (this.isSupabaseError(error)) {
      return this.handleSupabaseError(error, context);
    }

    // Error estándar de JavaScript
    if (error instanceof Error) {
      return this.handleStandardError(error, context);
    }

    // Error como string
    if (typeof error === 'string') {
      return new AppError('String error', {
        category: ErrorCategory.UNKNOWN,
        code: ErrorCode.UNKNOWN_ERROR,
        severity: ErrorSeverity.ERROR,
        userMessage: getSafeErrorMessage(error),
        context,
        originalError: error,
      });
    }

    // Error desconocido
    return new AppError('Unknown error', {
      category: ErrorCategory.UNKNOWN,
      code: ErrorCode.UNKNOWN_ERROR,
      severity: ErrorSeverity.ERROR,
      userMessage: ERROR_MESSAGES.GENERIC.UNKNOWN,
      context,
      originalError: error,
    });
  }

  /**
   * Maneja errores de Zod (validación)
   */
  private handleZodError(
    error: z.ZodError,
    context?: SafeErrorContext
  ): AppError {
    // Obtener el primer error para el mensaje principal
    const firstError = error.errors[0];
    const fieldPath = firstError?.path.join('.');

    // Crear mensaje interno con detalles
    const internalMessage = `Validation failed: ${error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join(', ')}`;

    // Mensaje seguro para el usuario
    let userMessage = ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;

    // Personalizar mensaje según el tipo de error
    if (firstError?.code === 'invalid_type') {
      if (firstError.expected === 'number') {
        userMessage = ERROR_MESSAGES.VALIDATION.INVALID_AMOUNT;
      } else if (firstError.expected === 'string') {
        userMessage = ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD;
      }
    } else if (firstError?.code === 'too_small') {
      userMessage = ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD;
    } else if (firstError?.code === 'too_big') {
      userMessage = ERROR_MESSAGES.VALIDATION.TEXT_TOO_LONG;
    } else if (firstError?.message.includes('email')) {
      userMessage = ERROR_MESSAGES.VALIDATION.INVALID_EMAIL;
    } else if (
      firstError?.message.includes('fecha') ||
      firstError?.message.includes('date')
    ) {
      userMessage = ERROR_MESSAGES.VALIDATION.INVALID_DATE;
    }

    return new ValidationError(internalMessage, fieldPath, {
      userMessage,
      context,
    });
  }

  /**
   * Maneja errores de Supabase
   */
  private handleSupabaseError(
    error: unknown,
    context?: SafeErrorContext
  ): AppError {
    const errorObj = error as {
      message?: string;
      code?: string;
      status?: string;
    };
    const message = errorObj.message || 'Supabase error';
    const code = errorObj.code || errorObj.status;

    // Determinar categoría basada en el código
    let category = ErrorCategory.DATABASE;
    let errorCode = ErrorCode.INTERNAL_ERROR;
    let severity = ErrorSeverity.ERROR;

    // Auth errors
    if (code === '401' || message.includes('Invalid login')) {
      category = ErrorCategory.AUTHENTICATION;
      errorCode = ErrorCode.INVALID_CREDENTIALS;
      severity = ErrorSeverity.WARNING;
    } else if (code === '403' || code === '42501') {
      category = ErrorCategory.AUTHORIZATION;
      errorCode = ErrorCode.INSUFFICIENT_PERMISSIONS;
      severity = ErrorSeverity.WARNING;
    } else if (code === '404' || code === 'PGRST116') {
      category = ErrorCategory.NOT_FOUND;
      errorCode = ErrorCode.RECORD_NOT_FOUND;
      severity = ErrorSeverity.INFO;
    } else if (code === '429' || message.includes('rate limit')) {
      category = ErrorCategory.RATE_LIMIT;
      errorCode = ErrorCode.RATE_LIMITED;
      severity = ErrorSeverity.WARNING;
    } else if (code === '23505') {
      category = ErrorCategory.VALIDATION;
      errorCode = ErrorCode.DUPLICATE_ENTRY;
      severity = ErrorSeverity.WARNING;
    } else if (code === '23502' || code === '23514') {
      category = ErrorCategory.VALIDATION;
      errorCode = ErrorCode.INVALID_INPUT;
      severity = ErrorSeverity.WARNING;
    } else if (message.includes('network') || message.includes('fetch')) {
      category = ErrorCategory.NETWORK;
      errorCode = ErrorCode.NETWORK_ERROR;
      severity = ErrorSeverity.ERROR;
    }

    // Obtener mensaje seguro
    const userMessage =
      SUPABASE_ERROR_MAP[code] ||
      SUPABASE_ERROR_MAP[message] ||
      getSafeErrorMessage(error);

    return new AppError(`Supabase error: ${message}`, {
      category,
      code: errorCode,
      severity,
      userMessage,
      context,
      originalError: error,
    });
  }

  /**
   * Maneja errores estándar de JavaScript
   */
  private handleStandardError(
    error: Error,
    context?: SafeErrorContext
  ): AppError {
    const message = error.message.toLowerCase();

    // Determinar categoría basada en el mensaje
    let category = ErrorCategory.UNKNOWN;
    let errorCode = ErrorCode.UNKNOWN_ERROR;
    let severity = ErrorSeverity.ERROR;
    let userMessage = ERROR_MESSAGES.GENERIC.TRY_AGAIN;

    // Network errors
    if (message.includes('network') || message.includes('fetch')) {
      category = ErrorCategory.NETWORK;
      errorCode = ErrorCode.NETWORK_ERROR;
      userMessage = ERROR_MESSAGES.NETWORK.CONNECTION_ERROR;
    }
    // Timeout
    else if (message.includes('timeout')) {
      category = ErrorCategory.NETWORK;
      errorCode = ErrorCode.TIMEOUT;
      userMessage = ERROR_MESSAGES.NETWORK.TIMEOUT;
    }
    // Validation
    else if (message.includes('invalid') || message.includes('required')) {
      category = ErrorCategory.VALIDATION;
      errorCode = ErrorCode.INVALID_INPUT;
      userMessage = ERROR_MESSAGES.VALIDATION.INVALID_FORMAT;
      severity = ErrorSeverity.WARNING;
    }
    // Not found
    else if (message.includes('not found')) {
      category = ErrorCategory.NOT_FOUND;
      errorCode = ErrorCode.RECORD_NOT_FOUND;
      userMessage = ERROR_MESSAGES.GENERIC.NOT_FOUND;
      severity = ErrorSeverity.INFO;
    }

    return new AppError(error.message, {
      category,
      code: errorCode,
      severity,
      userMessage,
      context,
      originalError: error,
    });
  }

  /**
   * Verifica si es un error de Supabase
   */
  private isSupabaseError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    // Verificar propiedades típicas de errores de Supabase
    return (
      'code' in error ||
      'status' in error ||
      ('message' in error &&
        typeof error.message === 'string' &&
        (error.message.includes('PGRST') ||
          error.message.includes('JWT') ||
          error.message.includes('supabase')))
    );
  }

  /**
   * Loguea el error de forma segura
   */
  private logError(error: AppError, options: ErrorHandlerOptions): void {
    const logModule = this.getLogModule(error.category);
    const logLevel = this.getLogLevel(error.severity);

    // Preparar contexto seguro para logging
    const logContext = {
      errorCode: error.code,
      category: error.category,
      severity: error.severity,
      userId: options.userId,
      action: options.action,
      resource: options.resource,
      context: error.context,
      // Incluir detalles técnicos solo en desarrollo
      ...((__DEV__ || process.env.NODE_ENV === 'development') && {
        internalMessage: error.internalMessage,
        stack: error.stack?.substring(0, 1000), // Limitar stack trace
        originalError: this.sanitizeOriginalError(error.originalError),
      }),
    };

    // Loguear según severidad
    switch (logLevel) {
      case 'debug':
        logger.debug(logModule, error.userMessage, logContext);
        break;
      case 'info':
        logger.info(logModule, error.userMessage, logContext);
        break;
      case 'warn':
        logger.warn(logModule, error.userMessage, logContext);
        break;
      case 'error':
        logger.error(logModule, error.internalMessage, logContext);
        break;
      case 'critical':
        logger.critical?.(logModule, error.internalMessage, logContext);
        break;
    }
  }

  /**
   * Obtiene el módulo de log apropiado
   */
  private getLogModule(category: ErrorCategory): LogModule {
    switch (category) {
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.RATE_LIMIT:
        return LogModule.AUTH;
      case ErrorCategory.DATABASE:
        return LogModule.DB;
      case ErrorCategory.NETWORK:
      case ErrorCategory.EXTERNAL_SERVICE:
        return LogModule.API;
      case ErrorCategory.FILE_PROCESSING:
        return LogModule.CSV;
      default:
        return LogModule.APP;
    }
  }

  /**
   * Obtiene el nivel de log apropiado
   */
  private getLogLevel(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.DEBUG:
        return 'debug';
      case ErrorSeverity.INFO:
        return 'info';
      case ErrorSeverity.WARNING:
        return 'warn';
      case ErrorSeverity.ERROR:
        return 'error';
      case ErrorSeverity.CRITICAL:
        return 'critical';
      default:
        return 'error';
    }
  }

  /**
   * Sanitiza el error original para logging
   */
  private sanitizeOriginalError(error: unknown): unknown {
    if (!error) return null;

    // Si es un string, truncar si es muy largo
    if (typeof error === 'string') {
      return error.substring(0, 500);
    }

    // Si es un objeto, remover propiedades sensibles
    if (typeof error === 'object') {
      const sanitized: Record<string, unknown> = {};
      const sensitiveKeys = [
        'password',
        'token',
        'key',
        'secret',
        'authorization',
      ];

      for (const [key, value] of Object.entries(error)) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'string' && value.length > 200) {
          sanitized[key] = value.substring(0, 200) + '...';
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return error;
  }
}

/**
 * Instancia global del manejador de errores
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * Helper functions para uso conveniente
 */

/**
 * Maneja un error y retorna un AppError seguro
 */
export function handleError(
  error: unknown,
  options?: ErrorHandlerOptions
): AppError {
  return errorHandler.handle(error, options);
}

/**
 * Crea un error de validación
 */
export function createValidationError(
  message: string,
  field?: string,
  userMessage?: string
): ValidationError {
  return new ValidationError(message, field, { userMessage });
}

/**
 * Crea un error de autenticación
 */
export function createAuthError(
  message: string,
  code?: ErrorCode
): AuthenticationError {
  return new AuthenticationError(message, { code });
}

/**
 * Crea un error de negocio
 */
export function createBusinessError(
  message: string,
  userMessage: string,
  code?: ErrorCode
): BusinessError {
  return new BusinessError(message, userMessage, { code });
}

/**
 * Crea un error de archivo
 */
export function createFileError(
  message: string,
  userMessage?: string,
  code?: ErrorCode
): FileProcessingError {
  return new FileProcessingError(message, { userMessage, code });
}

/**
 * Obtiene un mensaje seguro de un error para mostrar al usuario
 */
export function getUserErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  return getSafeErrorMessage(error);
}
