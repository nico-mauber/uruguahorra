# Contratos de API y Mapeo de Datos — UruguAhorra PWA

> El backend es Supabase (PostgreSQL + PostgREST + Auth + Edge Functions) y NO se reescribe. La fuente única de verdad del esquema es `uruguahorra-app/supabase/complete_database_schema.sql` (v5.8/6.0). Este documento lista los contratos que el frontend PWA debe consumir, con payloads exactos.

---

## 1. Autenticación (Supabase Auth)

| Operación | Llamada | Notas |
|---|---|---|
| Registro | `supabase.auth.signUp({ email, password, options: { data: { country:'UY', currency:'UYU' } } })` | Sin confirmación de email (config del proyecto: "Enable email confirmations" OFF, auto sign-in ON). Si `user.identities.length === 0` → el email ya existía → ejecutar login con las mismas credenciales. |
| Login | `supabase.auth.signInWithPassword({ email, password })` | Error `Email not confirmed` → mensaje "Tu email aún no está confirmado…". Errores con `rate_limit` → mensaje de espera. |
| Sesión | `supabase.auth.getSession()` / `onAuthStateChange` | |
| Logout | `supabase.auth.signOut()` | Después: limpiar stores, IndexedDB y caché `api-v1`. |

Tras `signUp` el trigger de BD `on_auth_user_created` crea la fila en `public.users` y en `user_streaks`. El cliente espera ~1s, hace `select` del perfil; si no existe: INSERT directo con defaults; si el INSERT falla: RPC `get_or_create_user_profile(p_user_id uuid) → users`.

---

## 2. Tablas consumidas por PostgREST (RLS activo)

Todas las operaciones van autenticadas con el JWT del usuario; las políticas RLS garantizan `auth.uid() = user_id` salvo lecturas públicas indicadas.

### 2.1 `users` (perfil)
```
Row: { id uuid, email text, country text='UY', currency text='UYU', premium bool,
       total_xp int, current_level int, current_streak int, longest_streak int,
       last_activity_at timestamptz, created_at, updated_at }
```
- GET: `from('users').select('*').eq('id', userId).single()`
- UPDATE: sólo el propio perfil.

### 2.2 `goals`
```
Row: { id, user_id, name, description?, target_amount numeric>0, current_amount, saved_amount,
       category text='general', color text='#3B82F6', icon text='shield', goal_type_id uuid?,
       deadline date?, target_date date?, is_completed bool, is_active bool, completed_at?, created_at, updated_at }
```
- Listar activas: `.select('*').eq('user_id', uid).eq('is_active', true).order('created_at', {ascending:false})`
- Crear: INSERT con `{name, target_amount, target_date (YYYY-MM-DD), saved_amount:0, is_active:true, category, color, icon, goal_type_id?, user_id}`
- Eliminar = soft delete: `.update({is_active:false})`
- `current_amount`/`saved_amount` e `is_completed` se actualizan por trigger `update_goal_progress` al insertar/editar/borrar contribuciones. **El cliente nunca escribe estos campos.**

### 2.3 `micro_contributions`
```
Row: { id, goal_id, user_id, amount numeric>0, description?, source text='manual', created_at }
```
- INSERT `{user_id, goal_id, amount, source:'manual'|'automatic'|'roundup', description?}` → dispara trigger que recalcula la meta y la marca completada si `current_amount >= target_amount`.
- Listar por meta / por usuario con `order('created_at', desc)`.

### 2.4 `goal_types` (lectura pública + custom por usuario)
```
Row: { id, name unique, description, emoji, icon, color, category, is_system bool,
       suggested_duration_months int, created_by? }
```
10 tipos sistema sembrados (Colchón de emergencia 🛡️/shield/#3B82F6/emergency/6m; Viaje ✈️/airplane/#10B981/travel/12m; Pagar deudas 💳/card/#EF4444/debt/24m; Compra importante 🛍️/cart/#8B5CF6/purchase/8m; Casa propia 🏠/home/#F59E0B/housing/36m; Educación 🎓/school/#06B6D4/education/24m; Salud y bienestar 💪/fitness/#EC4899/health/12m; Jubilación 🌅/star/#6B7280/retirement/120m; Auto o vehículo 🚗/car/#7C3AED/vehicle/18m; Negocio propio 💼/briefcase/#059669/business/24m).

### 2.5 `transactions`
```
Row: { id, user_id, goal_id?, squad_id?, amount numeric>0, description?, notes?,
       transaction_date date (default hoy), category_id?, category_name?, category_emoji?,
       type 'expense'|'income'|'transfer', mood_before? 1-5, mood_after? 1-5,
       regret_level? 0-10, necessity_level? 1-5, location?, tags text[]?, payment_method?,
       xp_earned int=0, achievements_unlocked?, created_at, updated_at, deleted_at? }
```
- Listado con join de categoría y paginación:
```ts
from('transactions')
 .select(`*, category:transaction_categories(id,name,emoji,type,color)`, {count:'exact'})
 .eq('user_id', uid).is('deleted_at', null)
 .order('transaction_date',{ascending:false}).order('created_at',{ascending:false})
 // filtros: gte/lte created_at, in category_id, in type, gte/lte amount,
 // or(description.ilike, notes.ilike, location.ilike), eq goal_id, eq squad_id
 .range(offset, offset+limit-1)
```
- Crear rápida: INSERT `{user_id, amount, description?, category_id, type (inferido de la categoría si falta), transaction_date: hoy, xp_earned: 5}`. Trigger `auto_categorize_new_transaction` categoriza si `category_id` es null y sincroniza `type` con la categoría.
- Borrar = soft delete: `.update({deleted_at: now})`.

### 2.6 `transaction_categories` (lectura pública)
21 categorías sembradas: 12 expense (rojos #FF6B6B→#FFECEC), 6 income (verdes #51CF66→#E6FCEE), 3 transfer (azules #339AF0→#A5D8FF). Orden por `sort_order`. Cachear localmente (casi estático).

### 2.7 Retos — `challenge_categories`, `challenges`, `user_challenge_sessions`, `daily_challenge_checkins`
```
challenge_categories: { id, name, description, icon (emoji o nombre ionicon), color, sort_order, is_active }
  → SELECT público where is_active=true, order sort_order
challenges: { id, title, description, type, difficulty 'easy'|'medium'|'hard'|'expert',
              xp_reward int, category_id?, tags[], icon, color, min_duration_days, max_duration_days, is_active }
  → SELECT público; por categoría: eq('category_id', id).eq('is_active', true)
user_challenge_sessions: { id, user_id, challenge_id, status 'active'|'completed'|'expired'|'renewed'|'cancelled',
              duration_type '1_week'|'15_days'|'30_days'|'1_year', start_date, end_date, progress 0-100,
              xp_earned, completed_at?, renewed_from_session_id?, notification_settings jsonb, progress_log jsonb[], metadata jsonb }
  → activas: eq user_id + eq status 'active' + select anidado `challenge:challenges(*)`
daily_challenge_checkins: { id, user_id, session_id, checkin_date date, completed bool, note?, UNIQUE(user_id,session_id,checkin_date) }
  → check-in de hoy: eq user_id + eq session_id + eq checkin_date hoy + maybeSingle()
```

### 2.8 Pods — `squads`, `squad_members`, `squad_contributions`
```
squads: { id, name, description?, max_members int=10, created_by, owner_id, invite_code text UNIQUE (6 chars A-Z0-9),
          is_active bool, goal_amount numeric=1000, total_saved numeric=0 }
squad_members: { id, squad_id, user_id, role 'admin' (todos admin — sistema democrático), joined_at,
          total_saved, monthly_saved, UNIQUE(squad_id,user_id) }
squad_contributions: { id, squad_id, user_id, amount>0, description?, source='manual', created_at }
Vista squad_contributions_detailed: + squad_name + username (parte local del email)
```
Reglas de negocio (cliente):
- Crear pod: generar `invite_code` de 6 chars en cliente; INSERT squad con `created_by = owner_id = uid`; luego INSERT en `squad_members` rol `admin`.
- Unirse: buscar squad por `invite_code` + `is_active`; error si ya es miembro, o si `count(members) >= max_members`.
- Contribuir: verificar membresía; INSERT en `squad_contributions` → trigger `update_squad_totals` recalcula `squads.total_saved`, `squad_members.total_saved/monthly_saved` y otorga **15 XP** (`user_xp_log` event `squad_contribution` + `users.total_xp`).
- Salir: DELETE de `squad_members` (owner no puede salir sin transferir — el cliente lo bloquea).

### 2.9 Gamificación — `user_xp_log`, `user_streaks`, `weekly_quests`, `user_quest_progress`
```
user_xp_log: { id, user_id, event_type 'contribution'|'challenge_complete'|'challenge_session_complete'|'daily_streak'|'quest_complete'|'squad_contribution', xp_earned, event_data jsonb, created_at }
user_streaks: { id, user_id UNIQUE, current_streak, longest_streak, last_activity_at,
                streak_protections_used, protection_reset_date, ... }
weekly_quests: { id, week_start_date, challenge_ids uuid[], is_active }   (lectura pública)
user_quest_progress: { id, user_id, quest_id, completed_challenge_ids uuid[], completion_percentage, completed_at? }
```

### 2.10 `subscriptions`
```
Row: { id, user_id, status 'active'|'cancelled'|'expired'|'pending'|'paused'|'past_due'|'trial',
       plan='premium', provider='mercadopago', provider_subscription_id UNIQUE,
       start_date, end_date?, current_period_end?, cancelled_at?, cancel_at_period_end, paused_at?, metadata jsonb }
```
- El cliente sólo LEE (`select ... eq user_id in status ['active','trial']`). Escrituras: sólo service_role (webhooks).
- **FIX obligatorio respecto a la app actual**: `isPremiumUser(userId)` en web debe consultar esta tabla (la app actual retorna `false` hardcodeado para web). Premium = existe fila `status IN ('active','trial')` con `current_period_end` nula o futura.

### 2.11 `user_analytics_preferences`
Una fila por usuario (UNIQUE user_id). Campos y defaults: `spending_patterns_days 30 (7-365)`, `monthly_insights_months 6 (1-48)`, `forecast_days 30 (7-365)`, `default_tab 'insights'|'patterns'|'forecast'`, `show_quick_stats true`, `max_insights_per_type 2 (1-5)`, `hide_completed_insights true`, `prefer_high_impact_insights true`, `enable_psychological_insights true`, `enable_spending_forecast true`, `enable_push_notifications false`, `enable_export_functionality false`, `preferred_language 'es'|'en'`, `currency 'UYU'|'USD'|'EUR'`, `date_format 'DD/MM/YYYY'|'MM/DD/YYYY'|'YYYY-MM-DD'`, `cache_interval 300000 (30000-1800000)`, `auto_refresh true`.

---

## 3. Funciones RPC (PostgreSQL) — `supabase.rpc(name, params)`

| Función | Params | Retorno | Uso |
|---|---|---|---|
| `get_or_create_user_profile` | `p_user_id uuid` | fila `users` | fallback creación de perfil |
| `get_or_create_user_streak` | `p_user_id uuid` | fila `user_streaks` | inicializar racha (fix error 406) |
| `start_challenge_session` | `p_user_id, p_challenge_id, p_duration_type` | `uuid` (session id) | iniciar reto; valida duración, reto activo y límite de 5 activos (lanza excepción con mensaje en español) |
| `record_challenge_daily_checkin` | `p_user_id, p_session_id, p_completed bool=true, p_checkin_date date=hoy, p_note text=null` | void | UPSERT del check-in del día |
| `calculate_challenge_session_progress` | `p_session_id` | `{current_progress numeric, days_completed int, total_days_required int, is_on_track bool}` | progreso real = días completados / ((end−start)+1); on_track si progreso ≥ 80% del esperado |
| `complete_challenge_session_automatically` | `p_session_id` | bool | completa sólo si progreso=100 y días cumplidos; otorga XP del reto, log y update users.total_xp |
| `update_all_active_sessions_progress` | — | `{updated_sessions, completed_sessions, execution_time}` | batch (cron) |
| `expire_challenge_sessions` | — | `{expired_count, session_ids[], execution_time}` | marca expiradas las sesiones activas con end_date < now (cron) |
| `create_user_quest_progress_safe` | `p_user_id, p_quest_id` | uuid | crea progreso de quest idempotente |
| `calculate_user_spending_insights` | `input_user_id, days_back=30` | jsonb `{period_days, total_spent, avg_daily_spend, avg_transaction_amount, most_expensive_category, most_frequent_category, psychology:{avg_regret_level, avg_necessity_level, mood_impact}}` | resumen de gastos |
| `auto_categorize_transaction` | `description_text` | uuid (category) | categorización por palabras clave (comida/transporte/entretenimiento/servicios → sino 'Otros Gastos') |
| `get_spending_patterns_for_period` | `user_uuid, days_back=30` | tabla `{category, amount, frequency, trend, average_amount}` (top 10) | tab Patrones |
| `get_monthly_spending_insights` | `user_uuid, months_back=6` | tabla `{month 'Mon YYYY', total_spent, budget_variance, top_categories jsonb, savings_rate, streak_days}` | tab Insights mensuales |
| `get_user_transaction_summary` | `user_uuid, days_back=30` | `{total_expenses, total_income, transaction_count, avg_daily_expense, top_category, spending_trend 'up'|'down'|'stable', days_with_data}` | quick stats |
| `get_enhanced_user_analytics` | `user_uuid, days_back=30` | 29 métricas (income/expense reales + scores derivados) | insights psicológicos avanzados |
| `get_user_streak_data` | `user_id` | `{current_streak, longest_streak, streak_updated_at}` | crea fila si no existe |
| `get_or_create_analytics_preferences` | `p_user_id` | fila preferencias | |
| `update_analytics_preferences` | `p_user_id` + 16 params opcionales (COALESCE) | fila actualizada | |
| `reset_analytics_preferences` | `p_user_id` | fila con defaults | |

---

## 4. Edge Functions (HTTP)

Base: `https://<project-ref>.supabase.co/functions/v1`

### 4.1 `POST /create-subscription` (requiere `Authorization: Bearer <jwt del usuario>`)
Request: `{ "planType": "monthly" | "annual" }`
Comportamiento del servidor: valida JWT; rechaza si ya hay suscripción `active|trial` (400 `{error:'User already has an active subscription', subscription_id, status}`); crea preapproval en MercadoPago con montos **UYU**: monthly $15/mes, annual $799/año, ambos con 7 días de trial; `external_reference = user.id`; back_urls según plataforma (web: `{origin}/subscription-{success|failure|pending}`).
Response 200:
```json
{ "success": true, "checkout_url": "<init_point MP>", "sandbox_url": "...", "subscription_id": "<preapproval_id>", "message": "..." }
```
El frontend abre `checkout_url` en **nueva pestaña** (`window.open(url, '_blank')`).
Errores: 401 sin/inválido token; 500 config; passthrough de error MP con `details`.

### 4.2 `POST /mercadopago-webhook` (server-to-server, sin auth de usuario)
Ya implementado; el frontend NO lo llama. Crea la fila en `subscriptions` cuando el preapproval pasa a `authorized` (status→`active`), y actualiza a `paused`/`cancelled` según eventos.

### 4.3 `POST /revenuecat-webhook`
Sólo relevante para las apps de tienda; **irrelevante para la PWA** (no portar RevenueCat al cliente web).

### 4.4 NUEVA (a crear): `POST /ai-transcribe` — proxy de voz
La app actual llama a OpenAI (Whisper `whisper-1` + `gpt-4o-mini`) **directamente desde el cliente con una API key hardcodeada** — vulnerabilidad que NO debe replicarse. Especificación del reemplazo:
- Request: `multipart/form-data` con `audio` (webm/opus, ≤30s, ≤2MB) + `Authorization: Bearer <jwt>`.
- Server: (1) Whisper transcribe en `es`; (2) `gpt-4o-mini` (temperature 0.1) parsea a `{ amount:number, description:string, type:'expense'|'income', category_hint:string, confidence:0-1 }`.
- Response 200: `{ transcript, parsed: {...}, confidence }`.
- Umbrales cliente: confidence ≥0.8 auto-confirmar campos; 0.6–0.8 pedir confirmación; <0.3 rechazar y pedir reintento.
- `OPENAI_API_KEY` vive sólo como secret de la función.

---

## 5. Manejo de errores (contrato transversal)

| Código | Significado | Mensaje UI (es) |
|---|---|---|
| `23505` | unique violation | "Ya existe un registro con esos datos" (metas: "Ya existe una meta con ese nombre") |
| `42501` | RLS denied | "No tienes permisos para esta acción. Verifica tu sesión." |
| `PGRST116` | 0 filas en `.single()` | tratar como not-found (no toast en flujos de verificación) |
| `*rate_limit*` (auth) | rate limit | "Por favor espera unos segundos antes de intentar nuevamente" |
| Excepciones RPC de retos | mensaje en `error.message` (español) | mostrar tal cual: p.ej. "No puedes tener más de 5 retos activos simultáneamente" |
| Red (TypeError fetch) | offline/timeout | encolar mutación si aplica; "Sin conexión: guardado localmente" |

## 6. XP — reglas económicas (constantes cliente que deben coincidir con BD)
- Contribución a meta: `min(floor(monto)*2, 10)` XP.
- Completar sesión de reto: `challenges.xp_reward` (30–500 según reto).
- Racha diaria (día consecutivo): 5 XP.
- Quest semanal completa: 50 XP.
- Contribución a pod: 15 XP (lo otorga el trigger de BD, NO el cliente).
- Registrar transacción: 5 XP (campo `xp_earned` del insert).
- Nivel: `level = max(1, floor(sqrt(totalXP)/2))`; XP para nivel N: `(N*2)²`.
- Racha: se rompe a las >48h sin actividad; 1 protección/mes (`streak_protections_used`, reset el día 1).
