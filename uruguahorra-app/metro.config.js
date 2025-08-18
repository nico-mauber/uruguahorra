const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Habilitar source maps para desarrollo web
config.transformer = {
  ...config.transformer,
  minifierPath: 'metro-minify-terser',
  minifierConfig: {
    // En desarrollo, no minificar para facilitar debugging
    keep_fnames: true,
    mangle: {
      keep_fnames: true,
    },
    compress: {
      drop_console: false, // Mantener console.log en desarrollo
    },
    output: {
      comments: false,
      semicolons: true,
    },
  },
};

// Configuración específica para web
if (process.env.EXPO_PUBLIC_PLATFORM === 'web' || process.platform === 'web') {
  config.serializer = {
    ...config.serializer,
    // Generar source maps inline para web
    sourceMapUrl: (url) => url.replace('.bundle', '.map'),
  };
}

// Configuración del resolver
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, 'cjs']
};

module.exports = config;