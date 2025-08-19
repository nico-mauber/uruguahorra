// Shim para import.meta cuando se usa con Metro/Expo Web
// Este archivo provee compatibilidad con import.meta para módulos que lo requieren

if (typeof global !== 'undefined') {
  // Configurar globales necesarios
  global.global = global;
  global.window = global;
  global.process = global.process || { env: {} };
  
  // Crear shim para import.meta
  if (!global.__importMeta) {
    global.__importMeta = {
      url: typeof location !== 'undefined' ? location.href : 'http://localhost:8081',
      env: {
        MODE: 'development',
        DEV: true,
        PROD: false,
        BASE_URL: '/',
      }
    };
  }
  
  // Interceptar errores de import.meta
  if (typeof window !== 'undefined') {
    const originalError = window.Error;
    window.Error = function(...args) {
      const error = new originalError(...args);
      if (error.message && error.message.includes('import.meta')) {
        console.warn('import.meta error intercepted:', error.message);
        // Intentar continuar sin lanzar el error
        return {
          message: error.message,
          stack: error.stack,
          toString: () => error.message
        };
      }
      return error;
    };
  }
}

// Exportar para uso en otros módulos
export const importMetaShim = global.__importMeta;