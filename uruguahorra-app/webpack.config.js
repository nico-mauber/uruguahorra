const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      // Habilitar source maps en desarrollo
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@supabase/supabase-js'],
      },
    },
    argv
  );

  // Add webpack plugin to replace import.meta
  config.plugins.push(
    new (require('webpack')).DefinePlugin({
      'import.meta': JSON.stringify({
        url: 'http://localhost:8081',
        env: {
          MODE: 'development',
          DEV: true,
          PROD: false,
          BASE_URL: '/',
          SSR: false,
        },
      }),
    })
  );

  // Configurar source maps para desarrollo
  if (env.mode === 'development') {
    config.devtool = 'cheap-module-source-map'; // Source maps rápidos y precisos

    // Asegurar que los source maps sean inline para mejor debugging
    config.output = {
      ...config.output,
      devtoolModuleFilenameTemplate: (info) =>
        `webpack:///${info.resourcePath.replace(/\\/g, '/')}`,
    };

    // Configurar el dev server para mejor debugging
    config.devServer = {
      ...config.devServer,
      hot: true,
      overlay: true,
      stats: 'minimal',
    };
  }

  return config;
};
