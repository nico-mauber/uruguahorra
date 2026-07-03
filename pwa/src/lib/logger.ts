/**
 * Logger centralizado. Fuente: docs/architecture/state-management §1, §3.6.
 * Prohibido console.log directo en features. En producción, nivel warn+.
 */

export enum LogModule {
  AUTH = 'AUTH',
  DB = 'DB',
  GOALS = 'GOALS',
  TRANSACTIONS = 'TRANSACTIONS',
  BUDGETS = 'BUDGETS',
  UI = 'UI',
  NAV = 'NAV',
  STORE = 'STORE',
  CACHE = 'CACHE',
  API = 'API',
}

type Level = 'debug' | 'info' | 'success' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  success: 20,
  warn: 30,
  error: 40,
};

const isProd = import.meta.env.PROD;
// En prod solo warn+; en dev todo.
const MIN_LEVEL = isProd ? LEVEL_ORDER.warn : LEVEL_ORDER.debug;

function emit(
  level: Level,
  module: LogModule,
  message: string,
  data?: unknown
) {
  if (LEVEL_ORDER[level] < MIN_LEVEL) return;
  const tag = `[${module}]`;
  const args = data === undefined ? [tag, message] : [tag, message, data];
  switch (level) {
    case 'error':
      console.error(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    default:
      console.log(...args);
  }
}

export const logger = {
  debug: (m: LogModule, msg: string, data?: unknown) => emit('debug', m, msg, data),
  info: (m: LogModule, msg: string, data?: unknown) => emit('info', m, msg, data),
  success: (m: LogModule, msg: string, data?: unknown) => emit('success', m, `✅ ${msg}`, data),
  warn: (m: LogModule, msg: string, data?: unknown) => emit('warn', m, msg, data),
  error: (m: LogModule, msg: string, data?: unknown) => emit('error', m, msg, data),
};
