# 🔧 Configuración Avanzada PWA - Uruguahorra

## Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```bash
# PWA Configuration
EXPO_PUBLIC_PWA_ENABLED=true
EXPO_PUBLIC_PWA_UPDATE_CHECK_INTERVAL=300000
EXPO_PUBLIC_PWA_CACHE_EXPIRATION=86400000

# Push Notifications (opcional)
EXPO_PUBLIC_VAPID_PUBLIC_KEY=tu_vapid_public_key
EXPO_PUBLIC_FCM_SENDER_ID=tu_fcm_sender_id

# Analytics
EXPO_PUBLIC_PWA_ANALYTICS_ENABLED=true
```

## Configuración de Firebase (Opcional - Push Notifications)

### 1. Configurar Firebase

```javascript
// firebase.config.js
import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "tu_api_key",
  authDomain: "uruguahorra.firebaseapp.com",
  projectId: "uruguahorra",
  storageBucket: "uruguahorra.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
```

### 2. Service Worker para Push

Agregar al final de `web/sw.js`:

```javascript
// Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "tu_api_key",
  authDomain: "uruguahorra.firebaseapp.com",
  projectId: "uruguahorra",
  storageBucket: "uruguahorra.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

## Configuración de Nginx (Alternativa a Apache)

```nginx
server {
    listen 443 ssl http2;
    server_name uruguahorra.com www.uruguahorra.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Root directory
    root /var/www/uruguahorra;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # CSP Header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; font-src 'self' https://fonts.gstatic.com; manifest-src 'self';" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        application/manifest+json;

    # Cache Configuration
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
    }

    # Service Worker - No Cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # PWA Manifest
    location = /manifest.json {
        add_header Content-Type "application/manifest+json";
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # API Routes (no cache)
    location /api/ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # SPA Routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Block sensitive files
    location ~ /\. {
        deny all;
    }
    
    location ~ \.(env|log|htaccess)$ {
        deny all;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name uruguahorra.com www.uruguahorra.com;
    return 301 https://$server_name$request_uri;
}
```

## Configuración de Cloudflare (CDN)

### Page Rules

```
1. https://uruguahorra.com/sw.js
   - Cache Level: Bypass
   - Browser Cache TTL: Respect Existing Headers

2. https://uruguahorra.com/manifest.json
   - Cache Level: Bypass
   - Browser Cache TTL: Respect Existing Headers

3. https://uruguahorra.com/api/*
   - Cache Level: Bypass

4. https://uruguahorra.com/*
   - Cache Level: Standard
   - Browser Cache TTL: 1 day
   - Always Use HTTPS: On
```

### Workers (Opcional - Service Worker en Edge)

```javascript
// Cloudflare Worker para optimizar PWA
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  
  // Service Worker bypass cache
  if (url.pathname === '/sw.js') {
    return fetch(request, {
      cf: {
        cacheTtl: 0,
        cacheEverything: false
      }
    })
  }
  
  // Static assets with long cache
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)) {
    return fetch(request, {
      cf: {
        cacheTtl: 31536000, // 1 year
        cacheEverything: true
      }
    })
  }
  
  return fetch(request)
}
```

## CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-pwa.yml
name: Deploy PWA

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build PWA
      run: npm run build:pwa
      env:
        EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
        EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    
    - name: Run Lighthouse CI
      run: |
        npm install -g @lhci/cli@0.12.x
        lhci autorun
      env:
        LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
    
    - name: Deploy to Server
      run: |
        # Tu script de deploy aquí
        rsync -avz --delete web-build/ user@server:/var/www/uruguahorra/
```

## Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run web',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.8}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['warn', {minScore: 0.8}],
        'categories:seo': ['warn', {minScore: 0.8}],
        'categories:pwa': ['error', {minScore: 0.9}],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

## Performance Optimizations

### 1. Code Splitting

```javascript
// En tus componentes grandes, usar lazy loading
const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### 2. Image Optimization

```javascript
// Usar WebP con fallback
<picture>
  <source srcSet="image.webp" type="image/webp" />
  <img src="image.jpg" alt="Description" />
</picture>
```

### 3. Preload Critical Resources

```html
<!-- En web/index.html -->
<link rel="preload" href="/assets/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/critical.css" as="style">
```

## Monitoring y Analytics

### 1. Web Vitals

```javascript
// src/utils/web-vitals.js
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Enviar a tu servicio de analytics
  gtag('event', metric.name, {
    event_category: 'Web Vitals',
    event_label: metric.id,
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    non_interaction: true,
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 2. PWA Events Tracking

```javascript
// En usePWA hook
const trackPWAEvent = useCallback((event, data = {}) => {
  if (window.gtag) {
    gtag('event', event, {
      event_category: 'PWA',
      ...data
    });
  }
}, []);

// Usar en eventos PWA
trackPWAEvent('pwa_installed');
trackPWAEvent('offline_usage', { duration: offlineTime });
trackPWAEvent('update_available');
```

## Testing Automatizado

### 1. PWA Tests con Playwright

```javascript
// tests/pwa.spec.js
const { test, expect } = require('@playwright/test');

test('PWA can be installed', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Wait for service worker
  await page.waitForFunction(() => 'serviceWorker' in navigator);
  
  // Check manifest
  const manifest = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.href : null;
  });
  
  expect(manifest).toContain('manifest.json');
});

test('PWA works offline', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Go offline
  await page.context().setOffline(true);
  
  // Navigate to cached page
  await page.goto('http://localhost:3000/goals');
  
  // Should still work
  await expect(page.locator('h1')).toBeVisible();
});
```

### 2. Service Worker Tests

```javascript
// tests/sw.spec.js
import { test, expect } from '@playwright/test';

test('Service Worker caches resources', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Check cache entries
  const cacheNames = await page.evaluate(async () => {
    return await caches.keys();
  });
  
  expect(cacheNames).toContain('uruguahorra-static-v1');
});
```

---

*Configuración avanzada generada el 19 de Agosto, 2025*
*Para soporte adicional, consultar documentación oficial de PWA*
