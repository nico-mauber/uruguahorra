const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enhance error handling for better debugging
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Handle symbolication requests more gracefully
      if (req.url && req.url.includes('symbolicate')) {
        try {
          return middleware(req, res, next);
        } catch (error) {
          console.warn('Symbolication error (non-critical):', error.message);
          // Return empty source map instead of crashing
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ stack: [] }));
          return;
        }
      }
      return middleware(req, res, next);
    };
  },
};

// Add support for additional file extensions
config.resolver.sourceExts.push('cjs', 'mjs');

// Handle SVG files properly
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.assetExts.push('svg');

// Enable package exports for better compatibility
config.resolver.unstable_enablePackageExports = true;

// Improve module resolution to prevent path issues
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.alias = {
  ...config.resolver.alias,
  // Ensure consistent path resolution
  '@': path.resolve(__dirname, 'src'),
};

// Better handling of node modules
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'), // For monorepos
];

// Configure transformer for better ES modules support
config.transformer = {
  ...config.transformer,
  // Enable experimental import support for import.meta and other ES features
  experimentalImportSupport: true,
  // Allow require context for dynamic imports
  unstable_allowRequireContext: true,
  // Better source map handling
  minifierConfig: {
    keep_fnames: true, // Keep function names for better debugging
    mangle: {
      keep_fnames: true,
    },
  },
  // Better handling of async imports
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: false, // Disable for better ES module compatibility
      // Improve error handling in transforms
      strictMode: false, // Prevent strict mode issues with some dependencies
    },
  }),
};

// Web-specific configuration for ES modules
if (process.env.EXPO_PLATFORM === 'web') {
  config.transformer.publicPath = '/';
  config.resolver.platforms = ['web', 'native', ...config.resolver.platforms];
}

module.exports = config;