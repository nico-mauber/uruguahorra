const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para desarrollo - habilitar source maps
if (process.env.NODE_ENV !== 'production') {
  // Desactivar minificación en desarrollo y habilitar source maps
  config.transformer = {
    ...config.transformer,
    minifierPath: require.resolve('metro-minify-terser'),
    minifierConfig: {
      keep_fnames: true,
      mangle: false,
      compress: false,
      output: {
        comments: true,
        beautify: true
      },
      sourceMap: {
        includeSources: true
      }
    }
  };
  
  // Configurar source maps para web
  config.server = {
    ...config.server,
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // Añadir headers para mejorar el debugging
        if (req.url.includes('.bundle')) {
          res.setHeader('X-SourceMap', 'true');
        }
        return middleware(req, res, next);
      };
    }
  };
}

// Configuración del resolver
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs']
};

module.exports = config;