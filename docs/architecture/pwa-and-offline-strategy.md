# Estrategia PWA y Offline — UruguAhorra Web

> Documento normativo para el agente de codificación. Define stack, Service Worker, manifiesto, persistencia local y sincronización en segundo plano de la nueva PWA que reemplaza a la app Expo/React Native actual.

---

## 1. Stack tecnológico obligatorio

| Capa | Tecnología | Justificación |
|---|---|---|
| Build | **Vite 6+** | Build rápido, soporte first-class de PWA vía plugin |
| UI | **React 19 + TypeScript 5.x (strict)** | Reutiliza el conocimiento de dominio del código actual |
| Routing | **React Router v7** (SPA, `createBrowserRouter`) | Reemplaza Expo Router (file-based) |
| Estado global | **Zustand 5** | Ya se usa; ver `state-management.md` |
| Backend | **Supabase** (`@supabase/supabase-js` v2) — el MISMO proyecto y esquema actual | El backend NO se reescribe |
| Service Worker | **vite-plugin-pwa** (Workbox, `injectManifest` mode) | Precache automático de assets + lógica custom |
| Persistencia local | **IndexedDB** vía librería `idb` | Cola offline + caché de datos |
| Estilos | **CSS Custom Properties + CSS Modules** (o Tailwind 4 con tokens mapeados) | Tokens definidos en `design-system/tokens-and-ui-specs.md` |
| Analytics | **posthog-js** (key: `phc_Bpl5uyxSSfEXZelS6NlzphDCTwrhI1mhbGoItaoriTx`, host `https://us.i.posthog.com`) | Igual que la app actual |
| Validación | **Zod 3** | Ya se usa en `src/schemas/` |

**Prohibido**: Expo, React Native, react-native-web, Capacitor, Cordova o cualquier wrapper de tienda.

### Variables de entorno (Vite)
```bash
VITE_SUPABASE_URL=            # mismo proyecto: https://ebkzqfmppdntmynfjehh.supabase.co
VITE_SUPABASE_ANON_KEY=
VITE_ENVIRONMENT=development|production
VITE_POSTHOG_KEY=
VITE_POSTHOG_HOST=https://us.i.posthog.com
```
NUNCA incluir claves privadas (MercadoPago access token, OpenAI key, service role key) en el bundle. Todas las operaciones privilegiadas pasan por Supabase Edge Functions (ver `api/contracts-and-data-mapping.md`).

---

## 2. Web App Manifest

Archivo `public/manifest.webmanifest` (migrar 1:1 del `web/manifest.json` actual):

```json
{
  "name": "Uruguahorra - App de Ahorro Gamificada",
  "short_name": "Uruguahorra",
  "description": "App de ahorro gamificada para desarrollar hábitos de ahorro mediante gamificación, metas y retos divertidos.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#339AF0",
  "background_color": "#ffffff",
  "lang": "es",
  "dir": "ltr",
  "categories": ["finance", "productivity", "utilities"],
  "shortcuts": [
    { "name": "Mis Metas", "short_name": "Metas", "url": "/goals" },
    { "name": "Retos", "short_name": "Retos", "url": "/challenges" },
    { "name": "Transacciones", "short_name": "Transacciones", "url": "/transactions" }
  ],
  "launch_handler": { "client_mode": "navigate-existing" },
  "handle_links": "preferred"
}
```

Reglas:
- Iconos: 192x192 y 512x512 PNG, ambos con `purpose: "any"` y variantes `"maskable"` separadas (NO combinar `"any maskable"` — es antipatrón).
- `theme_color` corregido a `#339AF0` (primary del design system; el manifest viejo tenía `#6366F1` inconsistente).
- Incluir `screenshots` (narrow 390x844 y wide 1280x800) para el prompt de instalación enriquecido de Chrome.
- `<meta name="theme-color">` en `index.html` debe coincidir y tener variante dark: `#1A1A1A`.

### Prompt de instalación (in-app)
Portar el hook `usePWA` actual:
- Capturar `beforeinstallprompt`, hacer `preventDefault()`, guardar el evento diferido.
- Exponer estado `{ isInstallable, isInstalled, isStandalone, isOnline, hasUpdate }`.
- Detección standalone: `matchMedia('(display-mode: standalone)').matches || navigator.standalone || document.referrer.includes('android-app://')`.
- Mostrar banner de instalación discreto (componente `PWAStatus`) sólo si `isInstallable && !isStandalone`, descartable, con persistencia de descarte en `localStorage('pwa-install-dismissed')` por 14 días.

---

## 3. Service Worker

Modo `injectManifest` (Workbox) — archivo `src/sw.ts`. Estrategias por tipo de recurso:

### 3.1 Precache (App Shell)
- Todo el output del build (`self.__WB_MANIFEST`): HTML, JS, CSS, fuentes, iconos.
- Navegaciones (`request.mode === 'navigate'`): **App-Shell fallback** → responder siempre `index.html` precacheado cuando la red falla (SPA offline-first).

### 3.2 Runtime caching

| Patrón de URL | Estrategia | Cache | TTL / límite |
|---|---|---|---|
| `*.{js,css,woff2,png,svg,jpg,webp}` mismo origen | **CacheFirst** | `static-v1` | 30 días, 200 entradas |
| `https://*.supabase.co/rest/v1/*` (GET) | **NetworkFirst** (timeout 4s) | `api-v1` | 24h, 100 entradas |
| `https://*.supabase.co/auth/v1/*` | **NetworkOnly** | — | nunca cachear |
| `https://*.supabase.co/functions/v1/*` | **NetworkOnly** | — | nunca cachear (pagos/webhooks) |
| `https://us.i.posthog.com/*` | **NetworkOnly** + tolerar fallo silencioso | — | — |
| Resto mismo origen | **StaleWhileRevalidate** | `dynamic-v1` | 7 días |

Reglas críticas:
- NUNCA cachear respuestas con `Authorization` header en cachés compartidos sin clave por usuario. La caché `api-v1` debe limpiarse en logout (`caches.delete('api-v1')` desde el cliente vía `postMessage({type:'CLEAR_API_CACHE'})`).
- Sólo cachear respuestas `status === 200`.
- POST/PATCH/DELETE jamás se cachean; se encolan (ver 4.2).

### 3.3 Ciclo de vida y actualización
- `skipWaiting()` NO automático. Al detectar SW nuevo en `waiting`, la UI muestra toast "Nueva versión disponible — Actualizar". Al aceptar: `postMessage({type:'SKIP_WAITING'})` → `controllerchange` → `location.reload()`.
- En `activate`: borrar cachés cuyo nombre no esté en la lista de versiones vigentes.
- Mensajes soportados desde el cliente: `SKIP_WAITING`, `GET_VERSION`, `CLEAR_CACHE`, `CLEAR_API_CACHE`.

---

## 4. Persistencia local (IndexedDB)

Base de datos `uruguahorra-db`, versión 1, creada con `idb`. Stores:

| Store | keyPath | Índices | Contenido |
|---|---|---|---|
| `mutation-queue` | `id` (uuid) | `createdAt`, `entity` | Mutaciones pendientes de sincronizar (ver 4.2) |
| `cache-goals` | `id` | `userId` | Snapshot de metas del usuario |
| `cache-transactions` | `id` | `userId`, `transaction_date` | Últimas 500 transacciones |
| `cache-sessions` | `id` | `userId` | Sesiones de retos activas + estado check-in de hoy |
| `cache-categories` | `id` | `type` | Categorías de transacciones y de retos (datos casi estáticos) |
| `cache-profile` | `id` | — | Perfil `users` + stats de gamificación |
| `kv` | `key` | — | Preferencias, flags, última sincronización |

Reglas:
- `localStorage` sólo para valores triviales síncronos (tema claro/oscuro, dismissal de banners). La sesión de Supabase usa su storage por defecto (`localStorage`) — aceptable.
- Toda lectura de pantalla sigue el patrón **cache-then-network**: render inmediato desde IndexedDB → fetch a Supabase → actualizar store + IndexedDB.
- Al hacer logout: borrar TODAS las stores de IndexedDB y cachés `api-v1`.

### 4.1 Detección de conectividad
Hook `useOnline()`: `navigator.onLine` + eventos `online`/`offline` + verificación activa (HEAD a `/manifest.webmanifest` cada 30s cuando offline). Exponer en un slice global `useUIStore.isOnline` y banner persistente "Sin conexión — tus cambios se guardarán localmente".

### 4.2 Cola de mutaciones offline (Outbox pattern)

Cada mutación de escritura pasa por `OfflineQueueService`:

```ts
interface QueuedMutation {
  id: string;                 // uuid v4 generado en cliente
  entity: 'contribution' | 'transaction' | 'checkin' | 'squad_contribution' | 'goal' | 'preference';
  operation: 'insert' | 'update' | 'soft_delete' | 'rpc';
  payload: Record<string, unknown>;   // body exacto para Supabase
  rpcName?: string;                   // si operation === 'rpc'
  createdAt: string;                  // ISO
  retries: number;                    // máx 5, backoff exponencial
  clientId: string;                   // idempotencia (ver abajo)
}
```

Flujo:
1. UI llama al servicio (p.ej. `GoalsService.addContribution`).
2. Si `isOnline`: ejecutar contra Supabase directamente. Si falla por red → encolar.
3. Si offline: encolar + aplicar **actualización optimista** al store de Zustand y a la caché IndexedDB, marcando el registro con `_pending: true` (la UI muestra ícono de reloj en el ítem).
4. Registro de `sync` en el SW: `registration.sync.register('flush-mutations')`. Fallback si Background Sync no está soportado (Safari/Firefox): flush al evento `online` y al reabrir la app (`visibilitychange`).
5. `flush`: procesar cola FIFO. Éxito → eliminar de cola, reemplazar registro optimista por el real (re-fetch de la entidad). Error 4xx no transitorio → descartar mutación + toast de error con detalle. Error de red/5xx → reintentar con backoff (1s, 5s, 30s, 2min, 10min); tras 5 fallos, marcar `failed` y mostrar en una vista "Pendientes de sincronizar" accesible desde Perfil.

Idempotencia: los inserts encolados generan el `id` uuid en el cliente y lo envían en el payload. Supabase respeta la PK → reintentos duplicados fallan con `23505` y se tratan como éxito.

**Qué funciona offline (obligatorio)**: registrar contribución a meta, registrar transacción rápida, check-in diario de reto, ver dashboard/metas/transacciones/retos con datos cacheados.
**Qué NO funciona offline (mostrar estado bloqueado)**: login/registro, crear/unirse a pod, pagos/paywall, analytics con datos frescos (mostrar cacheado con etiqueta "datos de la última sincronización"), transacción por voz.

### 4.3 Resolución de conflictos
- Estrategia **last-write-wins** para updates simples (perfil, preferencias).
- Contribuciones y transacciones son append-only → no hay conflicto real.
- Check-ins: la BD tiene `UNIQUE(user_id, session_id, checkin_date)` y el RPC hace UPSERT → el último check-in del día gana (coincide con el comportamiento actual).
- Los agregados (saved_amount de metas, totales de squad, XP) se recalculan por **triggers de BD**, nunca en el cliente: tras el flush, siempre re-fetch de las entidades afectadas.

---

## 5. Notificaciones

La app actual usa `expo-notifications` (locales programadas). En web NO existe programación local confiable. Traducción:

### Fase 1 (obligatoria — sin servidor push)
- `Notification.requestPermission()` desde la pantalla de Notificaciones (gesto de usuario, nunca al cargar).
- Notificaciones mostradas por el SW (`registration.showNotification`) sólo cuando la app está abierta o mediante recordatorios calculados al abrir: al iniciar sesión de app, `StreakNotificationPlanner` calcula si la racha vence en <12h/<6h/<3h/<30min y muestra la alerta correspondiente in-app (banner) + notificación del sistema si hay permiso.
- Persistir configuración en `kv` de IndexedDB: `{ enabled: boolean }`.

### Fase 2 (opcional, documentar como TODO)
- Web Push real: VAPID keys + `pushManager.subscribe()` + tabla `push_subscriptions` en Supabase + Edge Function cron (`pg_cron` o Supabase Scheduled Functions) que evalúa rachas en riesgo con la escala actual (12h, 6h, 3h, 30min antes de las 48h de gracia) y envía push.

---

## 6. Reemplazo de capacidades nativas de Expo

| Capacidad actual (Expo) | Reemplazo Web API |
|---|---|
| `expo-notifications` | Notification API + SW `showNotification` (+ Web Push fase 2) |
| `expo-haptics` (useHapticFeedback) | `navigator.vibrate([10])` con feature-detect; no-op en desktop |
| `expo-clipboard` (useClipboard) | `navigator.clipboard.writeText()` con fallback `document.execCommand('copy')` |
| `expo-av` (grabación de voz) | `MediaRecorder` + `getUserMedia({ audio: true })`; formato `audio/webm;codecs=opus`; máx 30s |
| `expo-linking` / deep links `uruguahorra://` | Rutas HTTPS normales (`/subscription-success` etc.); `launch_handler` del manifest |
| `expo-secure-store` | No aplica: la sesión Supabase vive en localStorage; datos sensibles nunca se guardan localmente |
| `Alert.alert` (RN) | Componente `Dialog`/`ConfirmDialog` propio (ver design system) — NUNCA `window.alert` |
| `react-native-toast-message` | Sistema de toasts propio (ver design system §Toasts) |
| SafeArea (`react-native-safe-area-context`) | CSS `env(safe-area-inset-*)` + `viewport-fit=cover` |
| `expo-status-bar` | `<meta name="theme-color">` dinámico según tema |

---

## 7. Estructura de proyecto

```
src/
├── app/                      # rutas (React Router)
│   ├── routes.tsx            # definición del router
│   ├── auth/OnboardingPage.tsx
│   ├── tabs/                 # layout con tab bar inferior
│   │   ├── TabsLayout.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── GoalsPage.tsx
│   │   ├── ChallengesPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── ProfilePage.tsx
│   ├── TransactionsPage.tsx
│   ├── CreateGoalPage.tsx
│   ├── PaywallPage.tsx
│   ├── SquadDetailPage.tsx   # /squad/:id
│   ├── NotificationsPage.tsx
│   ├── AnalyticsSettingsPage.tsx
│   └── subscription/{Success,Failure,Pending}Page.tsx
├── components/               # UI reutilizable (Button, Card, ProgressBar, modales…)
├── features/gamification/    # XP, niveles, rachas, quests (misma estructura actual)
├── services/                 # capa de servicios (clases estáticas, ver state-management.md)
├── store/                    # slices Zustand
├── lib/                      # supabase client, offline-queue, idb, logger
├── theme/                    # tokens CSS + ThemeProvider
├── schemas/                  # Zod
├── types/                    # TypeScript
└── sw.ts                     # service worker (injectManifest)
```

### Rutas (mapa 1:1 con Expo Router actual)

| Ruta PWA | Pantalla actual | Guard |
|---|---|---|
| `/onboarding` | `(auth)/simple-onboarding` | sólo anónimos (si hay sesión → `/`) |
| `/` | `(tabs)/index` (Dashboard) | requiere sesión |
| `/goals` | `(tabs)/goals` | requiere sesión |
| `/challenges` | `(tabs)/challenges` | requiere sesión |
| `/analytics` | `(tabs)/analytics` | requiere sesión |
| `/profile` | `(tabs)/profile` | requiere sesión |
| `/notifications` | `(tabs)/notifications` (oculta del tab bar) | requiere sesión |
| `/transactions` | `transactions` | requiere sesión |
| `/create-goal` | `create-goal` (modal) | requiere sesión; en desktop render como dialog, en mobile página completa |
| `/paywall` | `paywall` (modal) | requiere sesión |
| `/squad/:id` | `squad/[id]` | requiere sesión |
| `/analytics-settings` | `analytics-settings` | requiere sesión |
| `/subscription-success` `/subscription-failure` `/subscription-pending` | ídem | pública (retorno de MercadoPago) |
| `/privacy-policy` | `privacy-policy` | pública |

Guard de autenticación: componente `<RequireAuth>` que lee `useAuthStore`; mientras `isLoading` muestra spinner de pantalla completa; sin sesión → `<Navigate to="/onboarding" replace/>`.

---

## 8. Rendimiento (presupuestos)
- LCP < 2.5s en 4G; bundle inicial JS < 250KB gzip. Code-splitting por ruta (`React.lazy`).
- Analytics y AI (voz) se cargan lazy sólo al entrar a esas features.
- Imágenes: WebP, `loading="lazy"`.
- Lighthouse PWA score 100 obligatorio (manifest válido, SW registrado, offline funcional, HTTPS).
