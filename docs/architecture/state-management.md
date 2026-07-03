# Gestión de Estado — UruguAhorra PWA

> Cómo migrar el flujo de datos actual (Zustand + Context + servicios estáticos) a un estado global limpio para web.

---

## 1. Arquitectura en capas (obligatoria)

```
UI (páginas/componentes)
   ↓ hooks
Stores Zustand (estado en memoria + acciones)
   ↓
Servicios (clases estáticas, lógica de negocio)
   ↓                    ↓
OfflineQueueService   supabase-js (PostgREST + RPC + Auth)
   ↓
IndexedDB (caché + outbox)
```

Reglas:
1. Los componentes NUNCA llaman a `supabase` directamente; siempre vía servicio o store.
2. Los servicios son clases con métodos estáticos y devuelven datos tipados (mismo patrón actual: `GoalsService`, `TransactionsService`, `ChallengeSessionsService`, `SquadsService`, `XPService`, `StreaksService`, etc.). Portar sus firmas tal cual — están especificadas en `api/contracts-and-data-mapping.md`.
3. La lógica de agregados (progreso de meta, totales de squad, XP total) vive en la BD (triggers/RPC). El cliente sólo refleja.
4. Logging centralizado: portar `logger` con `LogModule` enum (`AUTH, DB, GOALS, TRANSACTIONS, UI, NAV, STORE, CACHE, API`). En producción, nivel `warn+`. Nunca `console.log` directo.

---

## 2. Stores Zustand

### 2.1 `useAuthStore` (reemplaza `SimpleAuthContext`)

```ts
interface AuthStore {
  user: SupabaseUser | null;        // usuario de auth
  profile: UserProfile | null;      // fila de public.users
  isLoading: boolean;               // true hasta resolver getSession()
  isAuthenticated: boolean;         // derivado: !!user
  isPremium: boolean;               // derivado: profile.premium === true O suscripción activa
  signUp(email, password, meta?: {country, currency}): Promise<boolean>;
  signIn(email, password): Promise<boolean>;
  signOut(): Promise<void>;         // limpia TODOS los stores + IndexedDB + caches SW
  refreshProfile(): Promise<void>;
}
```

Inicialización (en `main.tsx`, antes del render del router):
1. `supabase.auth.getSession()` → si hay sesión, cargar perfil de `public.users` (`select * where id = user.id single`).
2. Si el perfil no existe: intentar INSERT directo con defaults (`country:'UY', currency:'UYU', premium:false, total_xp:0, current_level:1, current_streak:0, longest_streak:0`); si falla → fallback RPC `get_or_create_user_profile(p_user_id)`. (Réplica exacta del flujo actual — el trigger `on_auth_user_created` de la BD suele crearlo, esto es red de seguridad.)
3. Suscribirse a `supabase.auth.onAuthStateChange`: `SIGNED_IN` → set user (NO recargar perfil ahí para evitar duplicados; se maneja en signIn/signUp); `SIGNED_OUT` → limpiar todo; `TOKEN_REFRESHED` → noop.

Rate-limit guard (portar): mínimo 2000ms entre operaciones de auth consecutivas (throttle interno con timestamp del último intento).

### 2.2 `useGoalsStore`

Portar tal cual el actual, con camelCase local:

```ts
interface Goal { id; name; targetAmount; savedAmount; targetDate; createdAt; category?; isActive? }
interface GoalsStore {
  goals: Goal[];
  isLoading: boolean;
  error: string | null;
  lastFetchUserId: string | null;             // cache-key
  fetchGoals(userId, force?): Promise<void>;  // dedup: no refetch si lastFetchUserId===userId && !force; no reentrada si isLoading
  addContribution(goalId, amount, source): Promise<void>;  // optimista: suma amount a savedAmount local
  getTotalSaved(): number;                    // Σ savedAmount
  getGoalProgress(goalId): number;            // min(100, saved/target*100)
  clearStore(): void;
}
```

Conversión BD→local: `target_amount→targetAmount`, `saved_amount→savedAmount`, `target_date→targetDate`, `is_active→isActive`.

### 2.3 `useTransactionsStore`
Estado: `transactions[]`, `categories[]`, `frequentTransactions[]`, `isLoading`, caché de analytics. Acciones: `fetchCategories()` (cachear en IndexedDB `cache-categories`, TTL 24h), `createQuickTransaction(userId, data)`, `fetchFrequentTransactions(userId)`, `clearAnalyticsCache()`.

### 2.4 `useSquadsStore`
Estado: `userSquads[]` (con `memberRole, memberCount, totalSquadSaved, goalAmount`), `currentSquad`, `squadMembers: Record<squadId, Member[]>`, `isLoading`, `isAddingContribution`. Acciones: `fetchUserSquads(userId, force?)`, `fetchSquadMembers(squadId, force?)`, `createSquad`, `joinSquad(userId, inviteCode)`, `leaveSquad`, `addSquadContribution`, `updateSquadGoal(squadId, amount, userId)`, `getUserRoleInSquad(squadId)`.

### 2.5 `useChallengesStore` (nuevo — hoy es estado local de pantalla)
Estado: `categories[]`, `challengesByCategory: Record<categoryId, Challenge[]>`, `activeSessions[]`, `progressBySession: Record<sessionId, {currentProgress, daysCompleted, totalDaysRequired, isOnTrack}>`. Acciones: `loadInitial(userId)`, `selectCategory(categoryId)`, `startSession(challengeId, durationType)`, `performCheckin(sessionId, completed, note?)`, `refreshProgress()`.

### 2.6 `useUIStore`
`isOnline`, `activeModal`, `toasts[]`, `swUpdateAvailable`, acciones `showToast/hideToast`, `setOnline`.

### 2.7 `useGamificationStore` (nuevo)
`stats: { totalXP, level, levelInfo: {progress, nextLevelXP, currentLevelXP}, streak: StreakData, quests }`, `loadStats(userId)`, `applyContributionResult({xpEarned, levelUp, newLevel, updatedStreak})` — actualización local inmediata sin refetch (patrón actual del dashboard).

---

## 3. Patrones obligatorios

### 3.1 Cache-then-network
Toda pantalla de datos: (a) hidratar store desde IndexedDB al montar (instantáneo), (b) fetch de red en paralelo, (c) al resolver, actualizar store + IndexedDB. `isLoading` sólo es true si no había caché.

### 3.2 Deduplicación de fetches
Portar los guards actuales: flag `isLoading` para evitar reentradas y `lastFetchUserId` como cache-key. Pull-to-refresh / botón refrescar pasa `force=true`.

### 3.3 Escrituras optimistas
Contribuciones, transacciones y check-ins actualizan el store ANTES de resolver la red (con rollback si el error es 4xx definitivo). Ver `pwa-and-offline-strategy.md` §4.2.

### 3.4 Flujo compuesto de contribución (crítico — replicar exacto)
`applySavingToGoal(goalId, amount)`:
1. Validaciones cliente: meta no completada (`savedAmount < targetAmount`); `amount ≤ targetAmount - savedAmount` (si excede → abrir selector de meta con ajuste).
2. `GoalsService.addContribution({user_id, goal_id, amount, source:'manual', description:'Ahorro rápido desde dashboard'})` — el trigger de BD actualiza `saved_amount`.
3. `OptimizedGamificationService.processContributionOptimized(userId, amount)` → `{xpEarned (=min(floor(amount)*2,10)), levelUp, newLevel}` (inserta en `user_xp_log` + update `users.total_xp`).
4. `StreaksService.updateStreak(userId)` → StreakData actualizado (errores aquí NO abortan el flujo; log warn y seguir).
5. Refetch de metas (`force=true`) + actualización local de stats de gamificación (sin refetch).
6. Toasts en secuencia: éxito de ahorro → (+1s) "+N XP ganado!" si xpEarned>0 → (+2s) "¡Subiste a nivel N!" si levelUp.
7. Guard `isSaving` durante todo el flujo para impedir doble submit.

### 3.5 Tema
`ThemeProvider` propio: estado `light | dark | auto` persistido en `localStorage('theme')`; `auto` sigue `prefers-color-scheme`. Aplicar como atributo `data-theme` en `<html>`; los tokens CSS hacen el resto. Toggle en Perfil.

### 3.6 Manejo de errores
- Toda llamada de servicio en try/catch; errores mapeados a mensajes en español (portar `error-messages.ts`): `23505`→"Ya existe…", `42501`→"No tienes permisos… Verifica tu sesión", `PGRST116`→not found (no es error en muchos flujos), rate limit→"Por favor espera unos segundos antes de intentar nuevamente".
- `ErrorBoundary` global de React con pantalla de recuperación ("Algo salió mal" + botón Reintentar que hace `location.reload()`).
- Errores de red con cola offline → toast informativo "Guardado localmente, se sincronizará".
