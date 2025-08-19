// Service Worker para Uruguahorra PWA
const CACHE_NAME = 'uruguahorra-v1';
const STATIC_CACHE_NAME = 'uruguahorra-static-v1';
const DYNAMIC_CACHE_NAME = 'uruguahorra-dynamic-v1';

// Recursos para caché estático (siempre disponibles offline)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/assets/icon.png',
  '/assets/favicon.png',
  '/assets/splash.png',
  '/babel-helpers-polyfill.js',
  '/import-meta-polyfill.js',
  '/webpack.shim.js',
  // Páginas principales para offline
  '/goals',
  '/challenges',
  '/profile',
  '/transactions'
];

// URLs que siempre deben ir por la red
const NETWORK_ONLY = [
  '/api/',
  '/auth/',
  'supabase.co'
];

// URLs para estrategia Network First
const NETWORK_FIRST = [
  '/app/',
  '/auth/',
  '.supabase.co'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    Promise.all([
      // Limpiar cachés antiguos
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Tomar control inmediato
      self.clients.claim()
    ])
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests no HTTP/HTTPS
  if (!request.url.startsWith('http')) return;
  
  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) {
    // Para Supabase y APIs externas
    if (shouldUseNetworkFirst(request.url)) {
      event.respondWith(networkFirst(request));
    }
    return;
  }
  
  // Estrategia según el tipo de recurso
  if (shouldUseNetworkOnly(request.url)) {
    // Network Only - APIs críticas
    return;
  } else if (shouldUseCacheFirst(request.url)) {
    // Cache First - recursos estáticos
    event.respondWith(cacheFirst(request));
  } else if (shouldUseNetworkFirst(request.url)) {
    // Network First - contenido dinámico
    event.respondWith(networkFirst(request));
  } else {
    // Stale While Revalidate - por defecto
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Estrategia Cache First
function cacheFirst(request) {
  return caches.match(request)
    .then((response) => {
      if (response) {
        return response;
      }
      
      return fetch(request)
        .then((fetchResponse) => {
          // Solo cachear responses válidas
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }
          
          const responseToCache = fetchResponse.clone();
          caches.open(STATIC_CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache);
            });
          
          return fetchResponse;
        });
    })
    .catch(() => {
      // Fallback para navegación offline
      if (request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    });
}

// Estrategia Network First
function networkFirst(request) {
  return fetch(request)
    .then((response) => {
      // Solo cachear responses exitosas
      if (response.status === 200) {
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE_NAME)
          .then((cache) => {
            cache.put(request, responseToCache);
          });
      }
      return response;
    })
    .catch(() => {
      // Fallback al caché si la red falla
      return caches.match(request)
        .then((response) => {
          if (response) {
            return response;
          }
          // Fallback final para navegación
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw new Error('No cached response available');
        });
    });
}

// Estrategia Stale While Revalidate
function staleWhileRevalidate(request) {
  return caches.open(DYNAMIC_CACHE_NAME)
    .then((cache) => {
      return cache.match(request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);
          
          // Devolver caché inmediatamente si existe, sino esperar red
          return cachedResponse || fetchPromise;
        });
    });
}

// Determinar estrategia según URL
function shouldUseNetworkOnly(url) {
  return NETWORK_ONLY.some(pattern => url.includes(pattern));
}

function shouldUseCacheFirst(url) {
  return STATIC_ASSETS.some(asset => url.includes(asset)) ||
         url.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/);
}

function shouldUseNetworkFirst(url) {
  return NETWORK_FIRST.some(pattern => url.includes(pattern));
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ cleared: true });
    });
  }
});

// Sincronización en background (si es soportada)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-transactions') {
    event.waitUntil(syncTransactions());
  }
  
  if (event.tag === 'sync-goals') {
    event.waitUntil(syncGoals());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de Uruguahorra',
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver en la app',
        icon: '/assets/icon.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/assets/icon.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Uruguahorra', options)
  );
});

// Manejar clicks en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      self.clients.openWindow('/')
    );
  }
});

// Funciones de sincronización
async function syncTransactions() {
  try {
    // Obtener transacciones pendientes del IndexedDB
    const pendingTransactions = await getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      try {
        // Intentar enviar al servidor
        await sendTransactionToServer(transaction);
        // Marcar como sincronizada
        await markTransactionAsSynced(transaction.id);
      } catch (error) {
        console.error('[SW] Failed to sync transaction:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync transactions failed:', error);
  }
}

async function syncGoals() {
  try {
    // Similar para metas
    const pendingGoals = await getPendingGoals();
    
    for (const goal of pendingGoals) {
      try {
        await sendGoalToServer(goal);
        await markGoalAsSynced(goal.id);
      } catch (error) {
        console.error('[SW] Failed to sync goal:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync goals failed:', error);
  }
}

// Placeholders para funciones de IndexedDB
async function getPendingTransactions() {
  // Implementar acceso a IndexedDB
  return [];
}

async function sendTransactionToServer(transaction) {
  // Implementar envío al servidor
}

async function markTransactionAsSynced(id) {
  // Implementar marcado como sincronizado
}

async function getPendingGoals() {
  // Implementar acceso a IndexedDB
  return [];
}

async function sendGoalToServer(goal) {
  // Implementar envío al servidor
}

async function markGoalAsSynced(id) {
  // Implementar marcado como sincronizado
}
