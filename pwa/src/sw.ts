/// <reference lib="webworker" />
/**
 * Service Worker (injectManifest). Fuente: docs/architecture/pwa-and-offline-strategy §3.
 * Precache del app-shell + runtime caching por tipo de recurso + app-shell fallback
 * para navegaciones offline (SPA). Actualización controlada por el usuario (SKIP_WAITING).
 */
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

// Precache del output del build.
precacheAndRoute(self.__WB_MANIFEST);

// App-shell fallback: navegaciones → index.html precacheado (SPA offline-first).
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// Estáticos mismo origen → CacheFirst (static-v1, 30d, 200 entradas).
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['style', 'script', 'worker', 'font', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 3600 }),
    ],
  })
);

// Supabase REST GET → NetworkFirst (api-v1, timeout 4s, 24h, 100 entradas).
registerRoute(
  ({ url, request }) =>
    /\.supabase\.co$/.test(url.hostname) && url.pathname.startsWith('/rest/v1/') && request.method === 'GET',
  new NetworkFirst({
    cacheName: 'api-v1',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 24 * 3600 }),
    ],
  }),
  'GET'
);

// Supabase auth / functions y PostHog → NetworkOnly (nunca cachear).
registerRoute(
  ({ url }) =>
    (/\.supabase\.co$/.test(url.hostname) && (url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/functions/v1/'))) ||
    /(^|\.)i\.posthog\.com$/.test(url.hostname),
  new NetworkOnly()
);

// Resto mismo origen → StaleWhileRevalidate (dynamic-v1, 7d).
registerRoute(
  ({ url }) => url.origin === self.location.origin,
  new StaleWhileRevalidate({
    cacheName: 'dynamic-v1',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 7 * 24 * 3600 })],
  })
);

// Mensajes del cliente.
self.addEventListener('message', (event) => {
  const type = (event.data as { type?: string })?.type;
  if (type === 'SKIP_WAITING') void self.skipWaiting();
  if (type === 'CLEAR_API_CACHE') void caches.delete('api-v1');
  if (type === 'CLEAR_CACHE') {
    void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
  }
  if (type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: 'uruguahorra-sw-1' });
  }
});
