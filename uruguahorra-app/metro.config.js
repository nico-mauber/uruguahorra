const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Detectar si estamos en modo web mirando los argumentos del proceso
const isWeb = process.argv.includes('--web') || process.env.EXPO_PUBLIC_PLATFORM === 'web';

config.transformer = {
  ...config.transformer,
  // Solo usar custom transformer para web, usar default para iOS/Android
  ...(isWeb ? {
    babelTransformerPath: require.resolve('./metro.transform.js'),
  } : {}),
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
      inlineRequires: true, // Cambiar a true para mejor performance en mobile
    },
  }),
};

// Configuración del resolver
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs', 'mjs'],
  // Asegurar que los archivos web se sirvan correctamente
  assetExts: [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'svg'],
};

// Configuración del servidor
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Servir archivos polyfill desde la carpeta web
      if (req.url === '/babel-helpers-polyfill.js') {
        const fs = require('fs');
        const polyfillPath = path.join(__dirname, 'web', 'babel-helpers-polyfill.js');
        if (fs.existsSync(polyfillPath)) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(fs.readFileSync(polyfillPath, 'utf8'));
          return;
        }
      }
      if (req.url === '/import-meta-polyfill.js') {
        const fs = require('fs');
        const polyfillPath = path.join(__dirname, 'web', 'import-meta-polyfill.js');
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
      
      return middleware(req, res, next);
    };
  },
};

module.exports = config;