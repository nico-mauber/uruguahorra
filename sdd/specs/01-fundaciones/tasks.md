# Tasks — Fase 01: Fundaciones

## Orden de ejecución

### Grupo A — Andamiaje del proyecto
- [ ] T-A1 · Scaffold Vite: package.json, tsconfig(+node), vite.config.ts, eslint.config.js, .gitignore, .env.example, index.html · `pwa/` · RF-1,13 · Done: estructura creada, alias `@/*` resuelto.
- [ ] T-A2 · `npm install` deps runtime+dev · `pwa/` · RF-1 · Done: node_modules presente, sin errores de resolución.
- [ ] T-A3 [P] · manifest.webmanifest base + iconos placeholder · `pwa/public/` · RF-13 · Done: manifest válido (nombre, theme_color #339AF0, display standalone, 192/512).
- [ ] T-A4 [P] · `types/database.ts` (UserRow) · RF-4 · Done: compila, campos = api §2.1.

### Grupo B — Tokens y tema
- [ ] T-B1 · `theme/tokens.css` (todos los tokens light + `[data-theme=dark]`) + `reset.css` · RF-8 · Done: vars presentes = design §1-3.
- [ ] T-B2 · `theme/ThemeProvider.tsx` + `useTheme.ts` (light/dark/auto, persist localStorage, data-theme en html) · RF-7 · Done: toggle cambia data-theme y persiste.

### Grupo C — Lib base
- [ ] T-C1 [P] · `lib/logger.ts` (LogModule enum + niveles, warn+ en prod) · RF-11 · Done: `logger.error` emite; info/debug silenciados si prod.
- [ ] T-C2 [P] · `lib/errors.ts` (`getErrorMessage`) · RF-12 · Done: code 42501 → mensaje exacto de api §5.
- [ ] T-C3 · `lib/supabase.ts` (cliente único desde env + Database mínimo) · RF-2 · Done: cliente exporta sin claves hardcodeadas.

### Grupo D — Componentes base (design system)
- [ ] T-D1 [P] · `components/Icon.tsx` (subset SVG inline) · RF-9 · Done: nombres home/flag/trophy/analytics/person/add/close/receipt/chevron renderizan.
- [ ] T-D2 [P] · `Button, Card, ProgressBar, Input, Spinner, EmptyState` · RF-9 · Done: props de design §4, tokens aplicados.
- [ ] T-D3 [P] · `Dialog` (portal, focus trap, Esc, overlay) · RF-9 · Done: abre/cierra por X/overlay/Esc.
- [ ] T-D4 · `lib/toast.ts` (ToastService) + `components/Toast.tsx` (render conectado a useUIStore) · RF-9 · Done: `ToastService.quickSuccess` muestra toast y auto-dismiss.
- [ ] T-D5 [P] · `TabBar, Fab` · RF-9 · Done: TabBar 5 items con activo=primary.
- [ ] T-D6 · `components/ErrorBoundary.tsx` · RF-10 · Done: captura throw → "Algo salió mal" + Reintentar.
- [ ] T-D7 · `components/index.ts` barrel · RF-9 · Done: re-exports compilan.

### Grupo E — Estado (stores)
- [ ] T-E1 · `store/useUIStore.ts` (isOnline, toasts) · RF-9 · Done: listeners online/offline actualizan estado.
- [ ] T-E2 · `store/useAuthStore.ts` (initialize, loadProfile con fallback, signOut, refreshProfile, stubs) · RF-3,4,5 · Done: initialize resuelve isLoading; loadProfile usa insert→rpc fallback.

### Grupo F — Router y páginas
- [ ] T-F1 · `app/pages/*` placeholders (todas las rutas del mapa) · RF-6 · Done: cada page renderiza su nombre.
- [ ] T-F2 · `app/RequireAuth.tsx` + `app/TabsLayout.tsx` · RF-6 · Done: guard redirige sin sesión; layout muestra TabBar.
- [ ] T-F3 · `app/router.tsx` (createBrowserRouter con todas las rutas) · RF-6 · Done: rutas públicas/privadas mapeadas.
- [ ] T-F4 · `App.tsx` (Theme+ErrorBoundary+RouterProvider+Toaster+banner offline) + `main.tsx` (initialize→render) · RF-4,6,7,10 · Done: app arranca, spinner→router.

### Grupo G — Verificación de fase
- [ ] T-G1 · `tsc --noEmit` en verde · CA-1
- [ ] T-G2 · `eslint` sin errores · CA-1
- [ ] T-G3 · `vite build` en verde + grep de secretos en dist vacío · CA-1,9
- [ ] T-G4 · Recorrer CA-2..CA-9 (dev server) y registrar evidencia en progress.md · todos los CA

## Matriz de cobertura (CA → tareas)
| CA | Tareas |
|---|---|
| CA-1 (build/tsc/eslint) | T-G1,T-G2,T-G3 |
| CA-2 (redirect sin sesión) | T-E2,T-F2,T-F3 |
| CA-3 (sesión persiste) | T-E2,T-C3,T-F4 |
| CA-4 (tema) | T-B1,T-B2,T-F4 |
| CA-5 (ErrorBoundary) | T-D6,T-F4 |
| CA-6 (componentes) | T-B1,T-D2,T-D3,T-D4,T-D5 |
| CA-7 (mapeo error 42501) | T-C2 |
| CA-8 (logger prod) | T-C1 |
| CA-9 (manifest + sin secretos) | T-A3,T-C3,T-G3 |

## Dependencias externas
- `.env` local con `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` reales para CA-3 (sesión). Sin ellas, CA-3 se verifica con mock/omitido y se registra en progress.md. Build (CA-1) NO requiere env.
- Node ≥18 (disponible: v20.19.4).
