// Sistema de monitoreo de errores en tiempo real para debugging
interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  filename?: string;
  userAgent: string;
  url: string;
}

class ErrorMonitor {
  private logs: ErrorLog[] = [];
  private isClient = typeof window !== 'undefined';

  constructor() {
    if (this.isClient) {
      this.setupErrorHandlers();
      this.logInfo('Error Monitor initialized');
    }
  }

  private setupErrorHandlers() {
    // Capturar errores de JavaScript
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'JavaScript Error',
        message: event.message,
        stack: event.error?.stack,
        source: event.error?.source,
        lineno: event.lineno,
        colno: event.colno,
        filename: event.filename,
      });
    });

    // Capturar errores de Promise no manejadas
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'Unhandled Promise Rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
      });
    });

    // Interceptar console.error para capturar errores de React/Metro
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // Llamar al console.error original
      originalConsoleError.apply(console, args);
      
      // Registrar el error
      this.logError({
        type: 'Console Error',
        message: args.map(arg => String(arg)).join(' '),
        stack: new Error().stack,
      });
    };

    // Interceptar console.warn para warnings importantes
    const originalConsoleWarn = console.warn;
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      
      const message = args.map(arg => String(arg)).join(' ');
      if (message.includes('import.meta') || message.includes('module')) {
        this.logError({
          type: 'Console Warning (import.meta)',
          message,
          stack: new Error().stack,
        });
      }
    };
  }

  private logError(errorData: Partial<ErrorLog>) {
    if (!this.isClient) return;

    const log: ErrorLog = {
      timestamp: new Date().toISOString(),
      type: errorData.type || 'Unknown Error',
      message: errorData.message || 'No message',
      stack: errorData.stack,
      source: errorData.source,
      lineno: errorData.lineno,
      colno: errorData.colno,
      filename: errorData.filename,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.logs.push(log);

    // Console log con formato colorido
    console.group(`🚨 [${log.timestamp}] ${log.type}`);
    console.error('Message:', log.message);
    if (log.stack) console.error('Stack:', log.stack);
    if (log.filename) console.error('File:', `${log.filename}:${log.lineno}:${log.colno}`);
    console.error('URL:', log.url);
    console.groupEnd();

    // Mantener solo los últimos 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }
  }

  private logInfo(message: string) {
    if (!this.isClient) return;
    
    console.log(`ℹ️ [${new Date().toISOString()}] Error Monitor: ${message}`);
  }

  // Método público para obtener todos los logs
  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  // Método para limpiar logs
  clearLogs() {
    this.logs = [];
    this.logInfo('Logs cleared');
  }

  // Método para exportar logs como JSON
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Método para filtrar logs por tipo
  getLogsByType(type: string): ErrorLog[] {
    return this.logs.filter(log => log.type.includes(type));
  }

  // Método para verificar si hay errores de import.meta
  hasImportMetaErrors(): boolean {
    return this.logs.some(log => 
      log.message.includes('import.meta') || 
      log.message.includes('Cannot use') ||
      log.message.includes('outside a module')
    );
  }
}

// Crear instancia global
export const errorMonitor = new ErrorMonitor();

// Función para agregar al contexto global para debugging desde console
if (typeof window !== 'undefined') {
  (window as any).errorMonitor = errorMonitor;
  
  // Agregar funciones de utilidad al window para debugging
  (window as any).getErrorLogs = () => errorMonitor.getLogs();
  (window as any).clearErrorLogs = () => errorMonitor.clearLogs();
  (window as any).exportErrorLogs = () => errorMonitor.exportLogs();
  (window as any).checkImportMetaErrors = () => errorMonitor.hasImportMetaErrors();
}

export default ErrorMonitor;
