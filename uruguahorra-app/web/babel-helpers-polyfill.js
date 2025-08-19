// Polyfill para funciones de Babel helpers que faltan en el entorno web
(function() {
  'use strict';
  
  // Verificar si ya existe
  if (typeof window !== 'undefined') {
    // Polyfill para _interopRequireDefault
    if (!window._interopRequireDefault) {
      window._interopRequireDefault = function(obj) {
        return obj && obj.__esModule ? obj : { default: obj };
      };
    }
    
    // Polyfill para _interopRequireWildcard
    if (!window._interopRequireWildcard) {
      window._interopRequireWildcard = function(obj) {
        if (obj && obj.__esModule) {
          return obj;
        }
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
    }
    
    // Polyfill para _extends (Object.assign)
    if (!window._extends) {
      window._extends = Object.assign || function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i];
          for (var key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
              target[key] = source[key];
            }
          }
        }
        return target;
      };
    }
    
    // Polyfill para _objectSpread
    if (!window._objectSpread) {
      window._objectSpread = function(target) {
        for (var i = 1; i < arguments.length; i++) {
          var source = arguments[i] != null ? arguments[i] : {};
          var ownKeys = Object.keys(source);
          if (typeof Object.getOwnPropertySymbols === 'function') {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
              return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
          }
          ownKeys.forEach(function(key) {
            target[key] = source[key];
          });
        }
        return target;
      };
    }
    
    // Polyfill para _defineProperty
    if (!window._defineProperty) {
      window._defineProperty = function(obj, key, value) {
        if (key in obj) {
          Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
          });
        } else {
          obj[key] = value;
        }
        return obj;
      };
    }
    
    // Polyfill para _classCallCheck
    if (!window._classCallCheck) {
      window._classCallCheck = function(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
          throw new TypeError("Cannot call a class as a function");
        }
      };
    }
    
    // Polyfill para _createClass
    if (!window._createClass) {
      window._createClass = (function() {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }
        return function(Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      })();
    }
    
    // Hacer disponibles globalmente
    window.global = window.global || window;
    if (window.global) {
      window.global._interopRequireDefault = window._interopRequireDefault;
      window.global._interopRequireWildcard = window._interopRequireWildcard;
      window.global._extends = window._extends;
      window.global._objectSpread = window._objectSpread;
      window.global._defineProperty = window._defineProperty;
      window.global._classCallCheck = window._classCallCheck;
      window.global._createClass = window._createClass;
    }
    
    console.log('[Babel Helpers Polyfill] Loaded successfully');
  }
})();