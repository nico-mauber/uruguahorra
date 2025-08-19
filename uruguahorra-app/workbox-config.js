// Configuración de Workbox para generar Service Worker
module.exports = {
  globDirectory: 'web-build/',
  globPatterns: [
    '**/*.{html,js,css,png,jpg,jpeg,gif,svg,woff,woff2,ttf,eot,ico,json}'
  ],
  swDest: 'web-build/sw.js',
  runtimeCaching: [
    {
      // Cache de recursos estáticos
      urlPattern: /^https:\/\/fonts\.googleapis\.com/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 días
        },
      },
    },
    {
      // Cache de fuentes
      urlPattern: /^https:\/\/fonts\.gstatic\.com/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 año
          maxEntries: 30,
        },
      },
    },
    {
      // Cache de APIs de Supabase
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 5,
        expiration: {
          maxAgeSeconds: 60 * 5, // 5 minutos
          maxEntries: 50,
        },
      },
    },
    {
      // Cache de autenticación Supabase
      urlPattern: /^https:\/\/.*\.supabase\.co\/auth\/v1\//,
      handler: 'NetworkOnly',
    },
    {
      // Cache de archivos de la app
      urlPattern: /^https?:\/\/localhost:8081\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxAgeSeconds: 60 * 60 * 24, // 1 día
        },
      },
    },
  ],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  offlineGoogleAnalytics: true,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  maximumFileSizeToCacheInBytes: 50 * 1024 * 1024, // 50MB
};
