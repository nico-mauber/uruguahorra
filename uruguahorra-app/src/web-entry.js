// Entrada personalizada para web que carga polyfills antes que nada
// Este archivo se ejecutará ANTES del código de Expo

// Polyfill para import.meta inline
(function() {
  if (typeof globalThis !== 'undefined' && !globalThis.__importMetaPolyfilled) {
    globalThis.__importMetaPolyfilled = true;
    
    // Crear objeto import.meta falso
    const fakeImportMeta = {
      url: typeof window !== 'undefined' ? window.location.href : 'http://localhost:8081',
      env: {
        MODE: process.env.NODE_ENV || 'development',
        DEV: process.env.NODE_ENV !== 'production',
        PROD: process.env.NODE_ENV === 'production',
        BASE_URL: '/',
        SSR: false
      }
    };
    
    // Establecer en globalThis que es lo que esperan las transformaciones
    globalThis.__importMeta = fakeImportMeta;
    
    // También mantener compatibilidad con window
    if (typeof window !== 'undefined') {
      window.__importMeta = fakeImportMeta;
      window.importMeta = fakeImportMeta;
    }
    
    console.log('[Web Entry] import.meta polyfill applied to globalThis');
  }
})();

// Ahora cargar la aplicación normal de Expo
import 'expo-router/entry';