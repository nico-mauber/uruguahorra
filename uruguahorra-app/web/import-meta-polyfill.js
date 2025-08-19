// Polyfill agresivo para import.meta - debe cargarse ANTES que cualquier otro script
(function() {
  'use strict';
  
  // Guardar referencias originales
  const originalEval = window.eval;
  const originalFunction = window.Function;
  
  // Objeto import.meta global
  const importMetaPolyfill = {
    url: window.location.href,
    env: {
      MODE: 'development',
      DEV: true,
      PROD: false,
      BASE_URL: '/',
      SSR: false
    }
  };
  
  // Función para reemplazar import.meta en código
  function replaceImportMeta(code) {
    if (typeof code !== 'string') return code;
    
    // Reemplazar todas las variantes de import.meta
    return code
      .replace(/import\.meta\.url/g, JSON.stringify(importMetaPolyfill.url))
      .replace(/import\.meta\.env\.MODE/g, JSON.stringify(importMetaPolyfill.env.MODE))
      .replace(/import\.meta\.env\.DEV/g, 'true')
      .replace(/import\.meta\.env\.PROD/g, 'false')
      .replace(/import\.meta\.env\.BASE_URL/g, JSON.stringify(importMetaPolyfill.env.BASE_URL))
      .replace(/import\.meta\.env\.SSR/g, 'false')
      .replace(/import\.meta\.env/g, JSON.stringify(importMetaPolyfill.env))
      .replace(/import\.meta/g, JSON.stringify(importMetaPolyfill));
  }
  
  // Override eval
  window.eval = function(code) {
    return originalEval.call(this, replaceImportMeta(code));
  };
  
  // Override Function constructor
  window.Function = function(...args) {
    if (args.length > 0) {
      const lastArg = args[args.length - 1];
      args[args.length - 1] = replaceImportMeta(lastArg);
    }
    return originalFunction.apply(this, args);
  };
  
  // Interceptar la creación de scripts
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetText = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'text');
      const originalSetTextContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      const originalSetInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
      
      if (originalSetText && originalSetText.set) {
        Object.defineProperty(element, 'text', {
          set: function(value) {
            originalSetText.set.call(this, replaceImportMeta(value));
          },
          get: originalSetText.get
        });
      }
      
      if (originalSetTextContent && originalSetTextContent.set) {
        Object.defineProperty(element, 'textContent', {
          set: function(value) {
            originalSetTextContent.set.call(this, replaceImportMeta(value));
          },
          get: originalSetTextContent.get
        });
      }
      
      if (originalSetInnerHTML && originalSetInnerHTML.set) {
        Object.defineProperty(element, 'innerHTML', {
          set: function(value) {
            originalSetInnerHTML.set.call(this, replaceImportMeta(value));
          },
          get: originalSetInnerHTML.get
        });
      }
    }
    
    return element;
  };
  
  // Interceptar errores de import.meta
  window.addEventListener('error', function(event) {
    if (event.error && event.error.message && event.error.message.includes('import.meta')) {
      console.warn('[Polyfill] Intercepted import.meta error, preventing propagation');
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  }, true);
  
  // Exponer globalmente para debugging
  window.__importMetaPolyfill = importMetaPolyfill;
  window.__replaceImportMeta = replaceImportMeta;
  
  console.log('[Polyfill] import.meta polyfill loaded successfully');
})();