# Spec — Fase 01: Fundaciones

## 1. Objetivo
Dejar el proyecto PWA arrancable con su esqueleto técnico: build Vite, cliente Supabase, router con guards, sistema de diseño (tokens + componentes base), tema claro/oscuro, logger y toasts — sin ninguna feature de negocio todavía. Al terminar, la app compila, corre, muestra rutas vacías protegidas y aplica el design system.

## 2. Fuentes (trazabilidad)
- `docs/architecture/pwa-and-offline-strategy.md` §1 (stack + env), §2 (manifest — solo base), §7 (estructura de proyecto, mapa de rutas, guard de auth), §8 (presupuestos de rendimiento).
- `docs/architecture/state-management.md` §1 (capas), §2.1 (`useAuthStore`), §2.6 (`useUIStore`), §3.5 (tema), §3.6 (errores/ErrorBoundary/toasts).
- `docs/design-system/tokens-and-ui-specs.md` §1 (colores light/dark), §2 (tipografía), §3 (espaciado/radios/sombras/animación), §4 (Button, Card, ProgressBar, Input, TabBar, FAB, Modal, Toasts, empty states, skeletons), §5 (accesibilidad).
- `docs/api/contracts-and-data-mapping.md` §1 (Auth), §5 (mapeo de errores) — solo lo necesario para el cliente y el store de auth.

> Nota de alcance: esta fase construye el ANDAMIAJE de auth (store + cliente + guard + inicialización de sesión), NO las pantallas de login/registro ni el flujo completo — eso es Fase 02 (`features/auth`).

## 3. Historias de usuario
- US-1: Como desarrollador, quiero un proyecto Vite+React+TS configurado con los alias y env de docs, para construir features sobre una base consistente.
- US-2: Como usuario, quiero que la app recuerde mi sesión al recargar, para no re-loguearme en cada visita.
- US-3: Como usuario anónimo, quiero ser redirigido al onboarding si entro a una ruta privada, para no ver pantallas sin autorización.
- US-4: Como usuario, quiero alternar tema claro/oscuro y que se recuerde, para usar la app cómodamente.
- US-5: Como usuario, quiero ver una pantalla de recuperación si algo falla, en vez de una app rota.
- US-6: Como desarrollador, quiero componentes base y tokens listos, para no reinventar UI en cada feature.

## 4. Requisitos funcionales

- **RF-1** · El sistema DEBE inicializar un proyecto Vite + React 19 + TypeScript strict + React Router v7, con los alias de import y las variables de entorno `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ENVIRONMENT`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`. · (US-1, pwa §1) · Regla: NINGUNA clave privada en el bundle.

- **RF-2** · El sistema DEBE exponer un cliente `supabase` único (`@supabase/supabase-js` v2) configurado con url+anon key desde env, con persistencia de sesión por defecto. · (US-1/US-2, pwa §1, api §1)

- **RF-3** · El sistema DEBE proveer `useAuthStore` (Zustand) con estado `{user, profile, isLoading, isAuthenticated (derivado !!user), isPremium (derivado)}` y acciones `signUp, signIn, signOut, refreshProfile`. `signUp`/`signIn` pueden quedar como stubs delegables a Fase 02; lo obligatorio aquí es `getSession` inicial, `onAuthStateChange` y `signOut` que limpia todo. · (US-2, state §2.1)

- **RF-4** · El sistema DEBE, al arrancar (antes del render del router), resolver `supabase.auth.getSession()`; con sesión, cargar el perfil de `public.users` (`select * eq id single`); si no existe, INSERT con defaults (`country:'UY', currency:'UYU', premium:false, total_xp:0, current_level:1, current_streak:0, longest_streak:0`) y, si falla, fallback RPC `get_or_create_user_profile(p_user_id)`. · (US-2, state §2.1, api §1)

- **RF-5** · El sistema DEBE suscribirse a `onAuthStateChange`: `SIGNED_IN` setea user (sin recargar perfil ahí), `SIGNED_OUT` limpia user+profile+stores+IndexedDB+cachés, `TOKEN_REFRESHED` no-op. · (US-2, state §2.1)

- **RF-6** · El sistema DEBE definir el router con TODAS las rutas del mapa (pwa §7) como placeholders vacíos, con guard `<RequireAuth>` en las privadas: sin sesión → `<Navigate to="/onboarding" replace/>`; mientras `isLoading` → spinner de pantalla completa. Rutas públicas: `/onboarding`, `/subscription-{success,failure,pending}`, `/privacy-policy`. · (US-3, pwa §7)

- **RF-7** · El sistema DEBE proveer `ThemeProvider` con estado `light|dark|auto` persistido en `localStorage('theme')`; `auto` sigue `prefers-color-scheme`; aplica atributo `data-theme` en `<html>`. · (US-4, design §1, state §3.5)

- **RF-8** · El sistema DEBE definir TODOS los tokens de diseño como CSS Custom Properties en `:root` (light) y `[data-theme="dark"]`, con los valores EXACTOS de design §1–§3 (colores, tipografía, espaciado 8px, radios, sombras, duraciones/easings, z-index). · (US-6, design §1-3)

- **RF-9** · El sistema DEBE implementar los componentes base reutilizables: `Button` (variantes primary/outline/ghost; sizes small/medium/large; loading; icon), `Card` (+ variante outlined, `padding="none"`), `ProgressBar` (progress 0-100, color?, showLabel?, fill animado), `Input` de texto y de monto (prefijo `$`, `inputmode`), `Dialog/Modal` (overlay, focus trap, cierre por X/overlay/Esc), sistema de `Toast` (`ToastService` con la API de design §4), `TabBar` inferior (5 tabs con Ionicons), `FAB`, empty-state y spinner/skeleton. · (US-6, design §4)

- **RF-10** · El sistema DEBE proveer `ErrorBoundary` global con pantalla "Algo salió mal" + botón Reintentar (`location.reload()`). · (US-5, state §3.6)

- **RF-11** · El sistema DEBE proveer un `logger` centralizado con enum `LogModule` (`AUTH, DB, GOALS, TRANSACTIONS, UI, NAV, STORE, CACHE, API`); en producción nivel `warn+`; prohibido `console.log` directo en features. · (US-1, state §1)

- **RF-12** · El sistema DEBE proveer un mapeo de errores reutilizable que traduzca `23505`, `42501`, `PGRST116`, `*rate_limit*` y error de red a los mensajes en español de api §5. · (US-5, api §5)

- **RF-13** · El sistema DEBE incluir `manifest.webmanifest` base (nombre, short_name, theme_color `#339AF0`, background, display standalone, iconos 192/512 con maskable separado) y `<meta name="theme-color">` con variante dark `#1A1A1A`. · (US-1, pwa §2)

## 5. Requisitos de datos / API
Mínimos (solo lo que toca el andamiaje de sesión):

| Entidad | Tipo | Campos | Cliente vs trigger |
|---|---|---|---|
| Auth Supabase | `getSession` / `onAuthStateChange` / `signOut` | — | cliente |
| `users` | select | `*` where `id = auth.uid()` | cliente lee |
| `users` | insert (fallback) | defaults de RF-4 | cliente (red de seguridad; normalmente lo crea el trigger `on_auth_user_created`) |
| RPC `get_or_create_user_profile` | rpc | `p_user_id uuid` → fila users | cliente (fallback) |

Ninguna otra tabla/RPC en esta fase.

## 6. Estados de UI

| Pantalla/Componente | loading | vacío | error | offline | éxito |
|---|---|---|---|---|---|
| Arranque de app (resolución de sesión) | spinner pantalla completa (design §4) | — | ErrorBoundary "Algo salió mal" + "Reintentar" | continúa con sesión cacheada si existe | render del router |
| RequireAuth (ruta privada sin sesión) | spinner mientras `isLoading` | — | — | — | redirect `/onboarding` |
| Rutas placeholder | — | contenedor vacío con layout/tema aplicado | — | banner "Sin conexión" (useUIStore.isOnline) | — |
| ThemeProvider | — | — | — | — | `data-theme` aplicado, persistido |

Textos literales: "Algo salió mal" + "Reintentar" (ErrorBoundary); "Sin conexión" (banner offline). Sin copy de auth (Fase 02).

## 7. Criterios de aceptación

- **CA-1** · Given un repo limpio, When corro `vite build`, Then compila sin errores y `tsc --noEmit` + `eslint` pasan en verde.
- **CA-2** · Given no hay sesión, When entro a `/` (o cualquier ruta privada), Then soy redirigido a `/onboarding`.
- **CA-3** · Given hay sesión válida en storage, When recargo la app, Then NO soy redirigido a onboarding y el router renderiza la ruta privada (tras el spinner inicial).
- **CA-4** · Given estoy en la app, When alterno el tema, Then `<html data-theme>` cambia entre light/dark, los colores del design system se aplican, y persiste tras recargar.
- **CA-5** · Given un componente hijo lanza un error de render, When ocurre, Then veo "Algo salió mal" + botón "Reintentar" (no pantalla en blanco).
- **CA-6** · Given el design system, When renderizo `Button` en sus 3 variantes/3 sizes y `Card`/`ProgressBar`/`Input`/`Toast`, Then coinciden con tokens de design §1-4 (colores, radios, tipografía) en light y dark.
- **CA-7** · Given un error Supabase con code `42501`, When lo paso por el mapeo de errores, Then obtengo "No tienes permisos para esta acción. Verifica tu sesión."
- **CA-8** · Given `logger.error(LogModule.AUTH, …)`, When corre en producción, Then se emite; y `logger` info/debug se silencian bajo nivel `warn+`.
- **CA-9** · Given el manifest, When audito con Lighthouse, Then el manifest es válido (nombre, iconos 192/512, theme_color `#339AF0`, display standalone) y no hay claves privadas en el bundle (grep de tokens sensibles sobre `dist/` = vacío).

## 8. Fuera de alcance
- Pantallas y flujo completo de login/registro (Fase 02).
- Service Worker, IndexedDB, cola offline, prompt de instalación (Fase 11 — aquí solo el manifest base y el detector `isOnline` en `useUIStore`).
- Cualquier feature de negocio (metas, transacciones, retos, pods, analytics, billing, gamificación).
- Web Push / notificaciones.
- Contenido real de `/privacy-policy` (placeholder).

## 9. Ambigüedades
- (Resuelta) Alcance de `useAuthStore.signUp/signIn` en esta fase: stubs delegables a Fase 02; lo obligatorio aquí es la inicialización de sesión, `onAuthStateChange` y `signOut`. Justificación: RF-3/4/5 cubren el andamiaje; el flujo interactivo pertenece a `features/auth`.
- (Resuelta) `<project-ref>` de Supabase para env: mismo proyecto del blueprint (`ebkzqfmppdntmynfjehh.supabase.co`); claves por `.env` local, nunca commiteadas.
- Sin ambigüedades abiertas → gate desbloqueado.
