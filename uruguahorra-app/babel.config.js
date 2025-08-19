module.exports = function (api) {
  api.cache(true);
  
  // Detectar si estamos en modo web mirando los argumentos del proceso
  const isWeb = process.argv.includes('--web') || process.env.EXPO_PUBLIC_PLATFORM === 'web';
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Solo usar transform-import-meta para web
      ...(isWeb ? [
        ['babel-plugin-transform-import-meta', {
          replaceWith: 'globalThis.__importMeta'
        }],
        ['@babel/plugin-transform-modules-commonjs', { 
          loose: true,
          allowTopLevelThis: true 
        }]
      ] : []),
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@features': './src/features',
            '@lib': './src/lib',
            '@store': './src/store',
            '@theme': './src/theme',
          },
        },
      ],
    ],
    env: {
      development: {
        plugins: [
          // Plugins específicos para desarrollo
        ]
      },
      production: {
        plugins: [
          // Plugins específicos para producción
        ]
      }
    }
  };
};