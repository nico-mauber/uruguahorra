// Entry point wrapper que aplica polyfills antes de cargar Expo Router
// Este archivo se ejecuta ANTES que cualquier otro código

// Configurar globalThis para todos los entornos
const globalObj =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof window !== 'undefined'
      ? window
      : typeof global !== 'undefined'
        ? global
        : typeof self !== 'undefined'
          ? self
          : {};

// Polyfill para _interopRequireDefault y otros helpers de Babel
globalObj._interopRequireDefault = function (obj) {
  return obj && obj.__esModule ? obj : { default: obj };
};

globalObj._interopRequireWildcard = function (obj) {
  if (obj && obj.__esModule) return obj;
  if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
    return { default: obj };
  }
  var cache = {};
  if (obj != null) {
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cache[key] = obj[key];
      }
    }
  }
  cache.default = obj;
  return cache;
};

// CRÍTICO: Definir __importMeta en globalThis para babel-plugin-transform-import-meta
globalObj.__importMeta = {
  url:
    typeof location !== 'undefined' ? location.href : 'http://localhost:8081',
  env: {
    MODE: 'development',
    DEV: true,
    PROD: false,
    BASE_URL: '/',
    SSR: false,
    VITE_DEV: true,
    VITE_PROD: false,
  },
};

// Configuración adicional para web
if (typeof window !== 'undefined') {
  // Asegurar compatibilidad global
  window.global = window.global || window;
  window.globalThis = window.globalThis || window;
  window.process = window.process || { env: { NODE_ENV: 'development' } };

  // Hacer que __importMeta esté disponible en todos los contextos
  window.__importMeta = globalObj.__importMeta;
  if (window.global) {
    window.global.__importMeta = globalObj.__importMeta;
  }

  // Interceptar eval para casos extremos
  const originalEval = window.eval;
  window.eval = function (code) {
    if (typeof code === 'string' && code.includes('import.meta')) {
      // Este caso no debería ocurrir si Babel funciona correctamente
      console.warn(
        'import.meta found in eval - this should have been transformed by Babel'
      );
      code = code
        .replace(/import\.meta\.env\.MODE/g, '"development"')
        .replace(/import\.meta\.env\.DEV/g, 'true')
        .replace(/import\.meta\.env\.PROD/g, 'false')
        .replace(
          /import\.meta\.env/g,
          JSON.stringify(globalObj.__importMeta.env)
        )
        .replace(/import\.meta/g, JSON.stringify(globalObj.__importMeta));
    }
    return originalEval.call(this, code);
  };

  // Debug para verificar que los polyfills están cargados
  console.log(
    '[Index.js] Polyfills loaded. __importMeta:',
    globalObj.__importMeta
  );
}

// Importar y registrar la aplicación con Expo Router
import 'expo-router/entry';
