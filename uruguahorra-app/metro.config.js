const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Detectar si estamos en modo web mirando los argumentos del proceso y variables de entorno
const isWeb =
  process.argv.includes('--web') ||
  process.env.EXPO_PUBLIC_PLATFORM === 'web' ||
  process.env.EXPO_WEB_BUILD === 'true';

console.log('[Metro Config] Web mode detected:', isWeb);

config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: false,
    },
    output: {
      comments: false,
      semicolons: true,
    },
  },
  // Asegurar que Babel helpers estén disponibles
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Configuración del resolver con mejor manejo de watchman
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
  assetExts: [
    ...config.resolver.assetExts.filter((ext) => ext !== 'svg'),
    'svg',
  ],
  // Ignorar archivos problemáticos
  blacklistRE: /node_modules[\/\\]@expo[\/\\]ngrok.*|\.bin.*/,
};

// Configuración del watchman para evitar problemas de permisos
config.watchFolders = [__dirname];
config.resolver.watchFolders = [__dirname];

// Configuración del servidor con mejor manejo de errores
config.server = {
  ...config.server,
  port: 8081,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Servir archivos polyfill desde la carpeta web
      if (req.url === '/babel-helpers-polyfill.js') {
        const fs = require('fs');
        const polyfillPath = path.join(
          __dirname,
          'web',
          'babel-helpers-polyfill.js'
        );
        if (fs.existsSync(polyfillPath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(polyfillPath, 'utf8'));
          return;
        }
      }
      if (req.url === '/import-meta-polyfill.js') {
        const fs = require('fs');
        const polyfillPath = path.join(
          __dirname,
          'web',
          'import-meta-polyfill.js'
        );
        if (fs.existsSync(polyfillPath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(polyfillPath, 'utf8'));
          return;
        }
      }

      // Headers para módulos JS
      if (req.url && (req.url.includes('.js') || req.url.includes('.bundle'))) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }

      // Log de todas las peticiones en desarrollo
      if (__DEV__ && req.url && !req.url.includes('symbolicate')) {
        console.log(`[Metro] ${req.method} ${req.url}`);
      }

      return middleware(req, res, next);
    };
  },
  // Configuración adicional para mejor debugging
  rewriteRequestUrl: (url) => {
    if (__DEV__) {
      console.log('[Metro] Request URL:', url);
    }
    return url;
  },
};

// Configuración del watcher optimizada
config.watcher = {
  ...config.watcher,
  watchman: true, // Reactivar watchman para mejor performance
  crawl: false, // Usar native find en lugar de crawl para mejor velocidad
};

module.exports = config;
