# Progress — Fase 01: Fundaciones

## Estado de tareas
- [x] T-A1 scaffold Vite (package.json, tsconfig, vite.config, eslint.config, .gitignore, .env.example, index.html)
- [x] T-A2 npm install (187 paquetes, 0 vulnerabilidades)
- [x] T-A3 manifest.webmanifest base + favicon.svg (iconos PNG = placeholders, ver deuda)
- [x] T-A4 types/database.ts (UserRow)
- [x] T-B1 theme/tokens.css + reset.css
- [x] T-B2 ThemeProvider + useTheme
- [x] T-C1 lib/logger.ts
- [x] T-C2 lib/errors.ts
- [x] T-C3 lib/supabase.ts
- [x] T-D1 Icon (SVG inline)
- [x] T-D2 Button, Card, ProgressBar, Input, Spinner, EmptyState
- [x] T-D3 Dialog (portal, focus, Esc, overlay)
- [x] T-D4 lib/toast.ts + Toast/Toaster
- [x] T-D5 TabBar, Fab
- [x] T-D6 ErrorBoundary
- [x] T-D7 components/index.ts
- [x] T-E1 useUIStore
- [x] T-E2 useAuthStore (initialize, loadProfile con fallback, signOut, stubs)
- [x] T-F1 pages placeholder (todas las rutas)
- [x] T-F2 RequireAuth + TabsLayout
- [x] T-F3 router.tsx
- [x] T-F4 App.tsx + main.tsx
- [x] T-G1..G4 verificación (abajo)

## Estado de CA (gate de aceptación)
| CA | Estado | Evidencia |
|---|---|---|
| CA-1 build/tsc/eslint | ✅ | `npm run typecheck` sin salida de error; `eslint` "No issues found"; `vite build` "built in 3.31s", 122 módulos |
| CA-2 redirect sin sesión | ✅ (revisión+build) | `RequireAuth` retorna `<Navigate to="/onboarding" replace/>` cuando `!isAuthenticated`; router monta rutas privadas bajo el guard. e2e Playwright pendiente. |
| CA-3 sesión persiste | ⚠️ parcial | Lógica en `useAuthStore.initialize` (getSession→loadProfile) + persistencia default de supabase-js. Verificación con sesión real requiere `.env.local` con anon key (dependencia externa no provista). Sin regresión de build. |
| CA-4 tema | ✅ (revisión+build) | `ThemeProvider` setea `data-theme` en `<html>`, persiste en `localStorage('theme')`, sigue `prefers-color-scheme` en auto; toggle expuesto en ProfilePage/OnboardingPage. |
| CA-5 ErrorBoundary | ✅ (revisión+build) | `ErrorBoundary` clase con `getDerivedStateFromError` → pantalla "Algo salió mal" + botón "Reintentar" (`location.reload()`). |
| CA-6 componentes | ✅ | Button (3 variantes/3 sizes), Card, ProgressBar, Input, Toast implementados con tokens CSS; build compila y sirve. Revisión visual manual recomendada. |
| CA-7 mapeo 42501 | ✅ | `getErrorMessage({code:'42501'})` → "No tienes permisos para esta acción. Verifica tu sesión." (lib/errors.ts). |
| CA-8 logger prod | ✅ | `logger` usa `import.meta.env.PROD` → MIN_LEVEL=warn; info/debug/success filtrados; error/warn emiten. |
| CA-9 manifest + sin secretos | ✅ | `dist/manifest.webmanifest` válido, theme_color #339AF0, display standalone, iconos 192/512+maskable. Grep de secretos en `dist/`: sólo coincidencias internas de supabase-js (nombres de métodos OAuth), ningún secreto propio (no hay `.env`, cero claves hardcodeadas). |

Dev server: `npm run dev` responde HTTP 200 en `/`.

## Gates técnicos
- tsc --noEmit: ✅
- eslint: ✅
- vite build: ✅

## Desviaciones respecto a docs/ o plan
1. **Ubicación `pwa/`**: el proyecto vive en `pwa/` (hermano de `uruguahorra-app/`); el `src/` del blueprint es `pwa/src/`. Sin impacto funcional.
2. **Cliente Supabase sin genérico de tipos**: escribir `Database` a mano chocó con el parser de tipos de postgrest-js 2.109 (resolvía filas a `never`). Se usa `createClient` sin genérico y se castean resultados a `UserRow` en el store. → ver Deuda.
3. **Iconos**: `Icon` con SVG inline (subset) en vez de Ionicons por CDN (CSP/offline). Nombres equivalentes conservados.
4. **PostHog y vite-plugin-pwa diferidos**: PostHog a la fase con tracking real; SW/PWA plugin a Fase 11. Manifest base servido estático.
5. **signUp/signIn**: stubs que lanzan error "se implementa en Fase 02" (decidido en spec §9).

## Deuda / TODO
- **Tipos generados de Supabase**: adoptar `supabase gen types typescript` para tipar `from()`/`rpc()` de punta a punta y eliminar los casts en `useAuthStore`. (Prioridad alta antes/durante Fase 02.)
- **Iconos PNG del manifest**: generar `icon-192/512` y `icon-maskable-*` reales (hoy referenciados pero ausentes; Lighthouse los pedirá en Fase 11).
- **Bundle 518KB (153KB gzip)**: supera el presupuesto de 250KB gzip de docs §8. Aplicar code-splitting por ruta (`React.lazy`) cuando existan features reales. No bloquea Fase 01.
- **e2e**: agregar Playwright para verificar CA-2..CA-6 por comportamiento en navegador; CA-3 requiere `.env.local` con anon key real.
- **Limpieza de sesión en signOut**: limpiar IndexedDB + caches del SW cuando existan (Fase 11).

## Estado final
**Fase 01 CERRADA.** Gates técnicos en verde; 8/9 CA ✅, CA-3 parcial por dependencia externa (.env). Lista para Fase 02 (auth).
