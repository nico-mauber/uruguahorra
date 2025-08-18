/**
 * Sistema de Logging Centralizado para Uruguahorra
 * Proporciona logging con niveles, colores y prefijos por módulo
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export enum LogModule {
  AUTH = 'AUTH',
  GOALS = 'GOALS',
  STORE = 'STORE',
  NAV = 'NAV',
  API = 'API',
  DB = 'DB',
  UI = 'UI',
  CACHE = 'CACHE',
  SYNC = 'SYNC',
}

// Configuración dinámica basada en entorno
const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';
const CURRENT_LOG_LEVEL = isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
const ENABLE_TIMESTAMPS = isDevelopment;
const ENABLE_COLORS = isDevelopment;

// Colores para la consola (funcionan en navegadores modernos)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

// Emojis por tipo de log
const emojis = {
  debug: '🔍',
  info: '✅',
  warn: '⚠️',
  error: '❌',
  start: '🚀',
  end: '🏁',
  success: '✨',
  data: '📦',
  network: '🌐',
  database: '💾',
  user: '👤',
  loading: '⏳',
  sync: '🔄',
};

class Logger {
  private getTimestamp(): string {
    if (!ENABLE_TIMESTAMPS) return '';
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ms = now.getMilliseconds().toString().padStart(3, '0');
    return `[${hours}:${minutes}:${seconds}.${ms}]`;
  }

  private getModuleColor(module: LogModule): string {
    if (!ENABLE_COLORS) return '';
    switch (module) {
      case LogModule.AUTH:
        return colors.magenta;
      case LogModule.GOALS:
        return colors.cyan;
      case LogModule.STORE:
        return colors.blue;
      case LogModule.NAV:
        return colors.green;
      case LogModule.API:
        return colors.yellow;
      case LogModule.DB:
        return colors.magenta;
      case LogModule.UI:
        return colors.white;
      case LogModule.CACHE:
        return colors.dim;
      case LogModule.SYNC:
        return colors.bright;
      default:
        return colors.white;
    }
  }

  private getLevelColor(level: LogLevel): string {
    if (!ENABLE_COLORS) return '';
    switch (level) {
      case LogLevel.DEBUG:
        return colors.dim;
      case LogLevel.INFO:
        return colors.green;
      case LogLevel.WARN:
        return colors.yellow;
      case LogLevel.ERROR:
        return colors.red;
      default:
        return colors.white;
    }
  }

  private formatMessage(
    level: LogLevel,
    module: LogModule,
    message: string,
    emoji?: string,
    data?: any
  ): string {
    const timestamp = this.getTimestamp();
    const moduleColor = this.getModuleColor(module);
    const levelColor = this.getLevelColor(level);
    const levelName = LogLevel[level];
    const emojiStr = emoji ? `${emoji} ` : '';

    let formattedMsg = `${timestamp} ${moduleColor}[${module}]${colors.reset} ${levelColor}${emojiStr}${levelName}:${colors.reset} ${message}`;

    if (data !== undefined) {
      formattedMsg +=
        '\n' + colors.dim + JSON.stringify(data, null, 2) + colors.reset;
    }

    return formattedMsg;
  }

  private log(
    level: LogLevel,
    module: LogModule,
    message: string,
    emoji?: string,
    data?: any
  ) {
    if (level < CURRENT_LOG_LEVEL) return;

    const formattedMessage = this.formatMessage(
      level,
      module,
      message,
      emoji,
      data
    );

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }

  // Métodos públicos por nivel
  debug(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, emojis.debug, data);
  }

  info(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, emojis.info, data);
  }

  warn(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.WARN, module, message, emojis.warn, data);
  }

  error(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.ERROR, module, message, emojis.error, data);
  }

  // Métodos especializados con emojis
  start(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, emojis.start, data);
  }

  end(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, emojis.end, data);
  }

  success(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, emojis.success, data);
  }

  network(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, emojis.network, data);
  }

  database(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, emojis.database, data);
  }

  user(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.INFO, module, message, emojis.user, data);
  }

  loading(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, emojis.loading, data);
  }

  sync(module: LogModule, message: string, data?: any) {
    this.log(LogLevel.DEBUG, module, message, emojis.sync, data);
  }

  // Método para medir tiempo de ejecución
  time(label: string) {
    console.time(label);
  }

  timeEnd(label: string) {
    console.timeEnd(label);
  }

  // Método para agrupar logs
  group(label: string) {
    console.group(label);
  }

  groupEnd() {
    console.groupEnd();
  }
}

// Exportar instancia única
export const logger = new Logger();

// Exportar también como default para imports más cortos
export default logger;
