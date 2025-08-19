/**
 * Sistema de tipos de error seguros para prevenir exposición de información
 * Cumple con CWE-209: Information Exposure Through Error Messages
 */

/**
 * Categorías de error para clasificación y manejo apropiado
 */
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'auth',
  AUTHORIZATION = 'forbidden',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER_ERROR = 'server',
  NETWORK = 'network',
  DATABASE = 'database',
  BUSINESS_LOGIC = 'business',
  EXTERNAL_SERVICE = 'external',
  FILE_PROCESSING = 'file',
  UNKNOWN = 'unknown',
}

/**
 * Códigos de error específicos de la aplicación
 */
export enum ErrorCode {
  // Authentication & Authorization
  INVALID_CREDENTIALS = 'AUTH001',
  SESSION_EXPIRED = 'AUTH002',
  INSUFFICIENT_PERMISSIONS = 'AUTH003',
  ACCOUNT_LOCKED = 'AUTH004',
  RATE_LIMITED = 'AUTH005',

  // Validation
  INVALID_INPUT = 'VAL001',
  MISSING_REQUIRED_FIELD = 'VAL002',
  INVALID_FORMAT = 'VAL003',
  VALUE_OUT_OF_RANGE = 'VAL004',
  DUPLICATE_ENTRY = 'VAL005',

  // Database
  RECORD_NOT_FOUND = 'DB001',
  CONSTRAINT_VIOLATION = 'DB002',
  CONNECTION_ERROR = 'DB003',
  TRANSACTION_FAILED = 'DB004',

  // Business Logic
  INSUFFICIENT_FUNDS = 'BUS001',
  GOAL_LIMIT_EXCEEDED = 'BUS002',
  INVALID_OPERATION = 'BUS003',
  SUBSCRIPTION_REQUIRED = 'BUS004',

  // File Processing
  FILE_TOO_LARGE = 'FILE001',
  INVALID_FILE_FORMAT = 'FILE002',
  FILE_PROCESSING_ERROR = 'FILE003',

  // Network
  NETWORK_ERROR = 'NET001',
  SERVICE_UNAVAILABLE = 'NET002',
  TIMEOUT = 'NET003',

  // Generic
  INTERNAL_ERROR = 'GEN001',
  UNKNOWN_ERROR = 'GEN999',
}

/**
 * Severidad del error para logging y monitoreo
 */
export enum ErrorSeverity {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Interfaz para información de contexto segura
 */
export interface SafeErrorContext {
  userId?: string;
  requestId?: string;
  timestamp?: string;
  action?: string;
  resource?: string;
  // NO incluir: passwords, tokens, stack traces, SQL queries, etc.
}

/**
 * Clase base para errores de aplicación seguros
 */
export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly isOperational: boolean;
  public readonly context?: SafeErrorContext;
  public readonly originalError?: unknown;
  public readonly userMessage: string;
  public readonly internalMessage: string;

  constructor(
    message: string,
    {
      category = ErrorCategory.UNKNOWN,
      code = ErrorCode.UNKNOWN_ERROR,
      severity = ErrorSeverity.ERROR,
      isOperational = true,
      context,
      originalError,
      userMessage,
    }: {
      category?: ErrorCategory;
      code?: ErrorCode;
      severity?: ErrorSeverity;
      isOperational?: boolean;
      context?: SafeErrorContext;
      originalError?: unknown;
      userMessage?: string;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.category = category;
    this.code = code;
    this.severity = severity;
    this.isOperational = isOperational;
    this.context = context;
    this.originalError = originalError;
    this.internalMessage = message;
    this.userMessage = userMessage || this.getDefaultUserMessage();

    // Mantener stack trace solo para debugging interno
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Obtiene un mensaje seguro por defecto basado en la categoría
   */
  private getDefaultUserMessage(): string {
    switch (this.category) {
      case ErrorCategory.VALIDATION:
        return 'Los datos proporcionados no son válidos.';
      case ErrorCategory.AUTHENTICATION:
        return 'Error de autenticación. Por favor, verifica tus credenciales.';
      case ErrorCategory.AUTHORIZATION:
        return 'No tienes permisos para realizar esta acción.';
      case ErrorCategory.NOT_FOUND:
        return 'El recurso solicitado no fue encontrado.';
      case ErrorCategory.RATE_LIMIT:
        return 'Has excedido el límite de intentos. Por favor, espera un momento.';
      case ErrorCategory.NETWORK:
        return 'Error de conexión. Por favor, verifica tu internet.';
      case ErrorCategory.DATABASE:
        return 'Error al procesar la solicitud. Por favor, intenta nuevamente.';
      case ErrorCategory.FILE_PROCESSING:
        return 'Error al procesar el archivo.';
      case ErrorCategory.BUSINESS_LOGIC:
        return 'No se puede completar la operación.';
      case ErrorCategory.SERVER_ERROR:
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.UNKNOWN:
      default:
        return 'Ha ocurrido un error. Por favor, intenta nuevamente.';
    }
  }

  /**
   * Convierte el error a un objeto seguro para serialización
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.userMessage,
      code: this.code,
      category: this.category,
      // NO incluir: stack, originalError, internalMessage
    };
  }
}

/**
 * Error de validación específico
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    options?: {
      code?: ErrorCode;
      userMessage?: string;
      context?: SafeErrorContext;
    }
  ) {
    super(message, {
      category: ErrorCategory.VALIDATION,
      code: options?.code || ErrorCode.INVALID_INPUT,
      severity: ErrorSeverity.WARNING,
      userMessage: options?.userMessage,
      context: options?.context,
    });
    this.name = 'ValidationError';
    this.field = field;
    // NO exponer el valor real por seguridad
  }
}

/**
 * Error de autenticación
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      context?: SafeErrorContext;
    }
  ) {
    super(message, {
      category: ErrorCategory.AUTHENTICATION,
      code: options?.code || ErrorCode.INVALID_CREDENTIALS,
      severity: ErrorSeverity.WARNING,
      userMessage: 'Credenciales inválidas.',
      context: options?.context,
    });
    this.name = 'AuthenticationError';
  }
}

/**
 * Error de autorización
 */
export class AuthorizationError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      context?: SafeErrorContext;
    }
  ) {
    super(message, {
      category: ErrorCategory.AUTHORIZATION,
      code: options?.code || ErrorCode.INSUFFICIENT_PERMISSIONS,
      severity: ErrorSeverity.WARNING,
      userMessage: 'No tienes permisos para realizar esta acción.',
      context: options?.context,
    });
    this.name = 'AuthorizationError';
  }
}

/**
 * Error de recurso no encontrado
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    options?: {
      context?: SafeErrorContext;
    }
  ) {
    super(`${resource} not found`, {
      category: ErrorCategory.NOT_FOUND,
      code: ErrorCode.RECORD_NOT_FOUND,
      severity: ErrorSeverity.INFO,
      userMessage: `${resource} no encontrado.`,
      context: options?.context,
    });
    this.name = 'NotFoundError';
  }
}

/**
 * Error de lógica de negocio
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    userMessage: string,
    options?: {
      code?: ErrorCode;
      context?: SafeErrorContext;
    }
  ) {
    super(message, {
      category: ErrorCategory.BUSINESS_LOGIC,
      code: options?.code || ErrorCode.INVALID_OPERATION,
      severity: ErrorSeverity.WARNING,
      userMessage,
      context: options?.context,
    });
    this.name = 'BusinessError';
  }
}

/**
 * Error de procesamiento de archivo
 */
export class FileProcessingError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: ErrorCode;
      userMessage?: string;
      context?: SafeErrorContext;
    }
  ) {
    super(message, {
      category: ErrorCategory.FILE_PROCESSING,
      code: options?.code || ErrorCode.FILE_PROCESSING_ERROR,
      severity: ErrorSeverity.WARNING,
      userMessage: options?.userMessage || 'Error al procesar el archivo.',
      context: options?.context,
    });
    this.name = 'FileProcessingError';
  }
}

/**
 * Type guard para verificar si es un AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard para verificar si es un error operacional
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}
