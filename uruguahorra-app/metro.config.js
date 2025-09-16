const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.sourceExts.push('cjs', 'mjs');

// Handle SVG files properly
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');
config.resolver.assetExts.push('svg');

// Enable package exports for better compatibility
config.resolver.unstable_enablePackageExports = true;

// Configure transformer for better ES modules support
config.transformer = {
  ...config.transformer,
  // Enable experimental import support for import.meta and other ES features
  experimentalImportSupport: true,
  // Allow require context for dynamic imports
  unstable_allowRequireContext: true,
  // Better handling of async imports
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: true,
      inlineRequires: false, // Disable for better ES module compatibility
    },
  }),
};

// Web-specific configuration for ES modules
if (process.env.EXPO_PLATFORM === 'web') {
  config.transformer.publicPath = '/';
  config.resolver.platforms = ['web', 'native', ...config.resolver.platforms];
}

module.exports = config;