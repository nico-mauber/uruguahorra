# Plan — Fase 01: Fundaciones

## 1. Enfoque
Proyecto Vite (React 19 + TS strict) en `pwa/` (separado de `uruguahorra-app/` Expo). Andamiaje por capas: config → tokens CSS → componentes base → lib (supabase, logger, errores) → stores (auth, ui) → tema → router con guards → ErrorBoundary → manifest. Sin features de negocio: rutas placeholder. Cierre: `tsc + eslint + vite build` en verde y 9 CA verificables.

## 2. Archivos (crear/editar)

| Ruta | Tipo | Responsabilidad | RF |
|---|---|---|---|
| `pwa/package.json` | config | deps + scripts (dev/build/lint/typecheck) | RF-1 |
| `pwa/tsconfig*.json` | config | TS strict + alias `@/*` | RF-1 |
| `pwa/vite.config.ts` | config | React plugin + alias | RF-1 |
| `pwa/eslint.config.js` | config | ESLint 9 flat + TS | RF-1 |
| `pwa/.env.example`, `.gitignore` | config | env público + ignores | RF-1 |
| `pwa/index.html` | html | root + meta theme-color light/dark + link manifest | RF-13 |
| `pwa/public/manifest.webmanifest` | pwa | manifest base | RF-13 |
| `pwa/src/main.tsx` | entry | init sesión → render | RF-4 |
| `pwa/src/App.tsx` | app | providers (Theme, ErrorBoundary, Router, Toaster, banner offline) | RF-6,7,9,10 |
| `pwa/src/theme/tokens.css`, `reset.css` | css | tokens `:root`+dark, reset | RF-8 |
| `pwa/src/theme/ThemeProvider.tsx`, `useTheme.ts` | component+hook | light/dark/auto, persist, data-theme | RF-7 |
| `pwa/src/lib/supabase.ts` | lib | cliente único + Database mínimo | RF-2 |
| `pwa/src/lib/logger.ts` | lib | LogModule + niveles | RF-11 |
| `pwa/src/lib/errors.ts` | lib | mapeo códigos→es | RF-12 |
| `pwa/src/store/useAuthStore.ts` | store | sesión, perfil, init, signOut | RF-3,4,5 |
| `pwa/src/store/useUIStore.ts` | store | isOnline, toasts | RF-9 |
| `pwa/src/components/*` | component | Button, Card, ProgressBar, Input, Dialog, Toast, TabBar, Fab, EmptyState, Spinner, Icon, ErrorBoundary, index | RF-9,10 |
| `pwa/src/lib/toast.ts` | lib | ToastService (API design §4) | RF-9 |
| `pwa/src/app/router.tsx`, `RequireAuth.tsx`, `TabsLayout.tsx` | routing | router+guard+layout | RF-6 |
| `pwa/src/app/pages/*.tsx` | pages | placeholders de todas las rutas | RF-6 |
| `pwa/src/types/database.ts` | type | UserRow | RF-4 |
| `pwa/README.md` | doc | cómo correr | RF-1 |

## 3. Stores (Zustand)
**useAuthStore** (state §2.1): `{user, profile, isLoading, isAuthenticated(sel), isPremium(sel)}`; acciones `initialize()` (getSession→loadProfile→isLoading=false→onAuthStateChange), `loadProfile(id)` (select users→insert defaults→rpc fallback), `signOut()` (auth.signOut + reset stores), `refreshProfile()`, `signUp/signIn` = stub (Fase 02).
**useUIStore** (state §2.6): `{isOnline, toasts, swUpdateAvailable}`; `setOnline, showToast, dismissToast`.

## 4. Servicios
| Servicio | Método (firma docs/api) | Mapeo | Offline |
|---|---|---|---|
| (ninguno de negocio) | — | — | — |
`lib/supabase.ts` expone cliente; `useAuthStore` usa `supabase.auth.*`, `from('users')`, `rpc('get_or_create_user_profile',{p_user_id})` — excepción permitida por ser andamiaje de auth (api §1).

## 5. Componentes UI (design §4, tokens vía CSS vars, sin lógica de negocio)
`Button{variant,size,loading,icon}` · `Card{variant?,padding?}` · `ProgressBar{progress,color?,showLabel?}` · `Input{prefix?,inputMode?}` · `Dialog{open,onClose,title?}` (portal+focus trap+Esc+overlay) · `Toast`+`ToastService` (conectado a useUIStore) · `TabBar` (5 NavLink) · `Fab{onClick,icon}` · `EmptyState{icon,title,text,action?}` · `Spinner{fullscreen?,label?}` · `Icon{name,size?,color?}` (SVG inline subset, CSP-safe).

## 6. Rutas y navegación (pwa §7)
`createBrowserRouter`. Públicas: `/onboarding`, `/privacy-policy`, `/subscription-{success,failure,pending}`. Privadas bajo `<RequireAuth>`: `TabsLayout`→`/`,`/goals`,`/challenges`,`/analytics`,`/profile`; fuera del layout `/transactions`,`/create-goal`,`/paywall`,`/squad/:id`,`/notifications`,`/analytics-settings`. RequireAuth: isLoading→Spinner; !auth→Navigate /onboarding replace; ok→Outlet. Pages = placeholder con su nombre.

## 7. Flujos compuestos
Solo arranque de sesión (RF-4): `main.tsx` → `useAuthStore.getState().initialize()`; render inmediato; router muestra spinner mientras `isLoading`.

## 8. Contratos de datos
`types/database.ts`: `UserRow` (campos de api §2.1). `Database` type mínimo en `lib/supabase.ts` para `from('users')`. Sin Zod (no hay formularios esta fase).

## 9. Manejo de errores y offline
`lib/errors.ts`: `getErrorMessage(error): string` con `23505/42501/PGRST116/rate_limit/network/default` (copy api §5) — CA-7. `ErrorBoundary` global (RF-10). Offline: `useUIStore.isOnline` + banner "Sin conexión" en App. Sin cola (Fase 11).

## 10. Riesgos / decisiones (→ progress.md)
- **`pwa/` carpeta hermana** de `uruguahorra-app/` (el `src/` del blueprint vive dentro de `pwa/`). Desviación menor de nomenclatura.
- **Icon SVG inline** en vez de Ionicons CDN (CSP/offline). Nombres equivalentes.
- **signUp/signIn stub** (decidido en spec §9; Fase 02).
- **Deps mínimas**: react, react-dom, react-router-dom, zustand, @supabase/supabase-js. PostHog y vite-plugin-pwa diferidos (tracking real / Fase 11); manifest base servido estático.
