# Gamificación (XP, Niveles, Rachas, Quests) — Especificación Funcional

Sistema transversal. No tiene pantalla propia; se manifiesta en Dashboard, Perfil, Retos y toasts. Servicios a portar: `XPService`, `LevelsService`, `StreaksService`, `QuestsService`, `OptimizedGamificationService`, `GamificationService.getUserBasicStats`.

## 1. XP (`user_xp_log` + `users.total_xp`)

### Fuentes y montos (constantes — deben coincidir con la BD)
| Evento | event_type | XP |
|---|---|---|
| Contribución a meta | `contribution` | `min(floor(monto)*2, 10)` |
| Completar reto legacy | `challenge_complete` | 30 fijo |
| Completar sesión de reto | `challenge_session_complete` | `challenge.xp_reward` (viene en event_data.xpAmount; default 50) |
| Día de racha consecutivo | `daily_streak` | 5 |
| Quest semanal completa | `quest_complete` | 50 |
| Contribución a pod | `squad_contribution` | 15 (lo inserta el TRIGGER de BD, el cliente NO lo otorga) |
| Registrar transacción | (campo `xp_earned` del insert) | 5 |

### `awardXP(userId, eventType, eventData)`
1. Calcular XP según tipo. Si ≤0 → return 0 (warn).
2. INSERT en `user_xp_log {user_id, event_type, xp_earned, event_data}`.
3. El total del usuario se refleja en `users.total_xp` (el flujo optimizado lo actualiza con UPDATE; el log es la fuente auditable).
4. Tolerancia: si la tabla no existe (error "relation does not exist"), devolver el XP sin registrar (no romper el flujo).

### `processContributionOptimized(userId, amount)` (ruta caliente del ahorro rápido)
Una sola pasada: calcula XP → INSERT log → UPDATE `users.total_xp` → recalcula nivel → devuelve `{xpEarned, levelUp: boolean, newLevel?: number}`. Evita la cascada completa de gamificación.

## 2. Niveles
- `level = max(1, floor(sqrt(totalXP)/2))`.
- XP mínimo del nivel N: `(N*2)²`; para el siguiente: `((N+1)*2)²`.
- `getLevelProgress(totalXP)` → `{level, progress% dentro del nivel, nextLevelXP, currentLevelXP}`.
- Tiers/colores: 1–5 bronze `#CD7F32`, 6–15 silver `#C0C0C0`, 16–30 gold `#FFD700`, 31+ diamond `#B9F2FF`.

## 3. Rachas (`user_streaks`, fila única por usuario)

### `updateStreak(userId, timestamp=now)` — invocar tras cada contribución
Casos según días de diferencia con `last_activity_at` (diferencia en días naturales `floor(|Δms|/86400000)`):
- **0 días** (misma fecha): sólo actualizar `last_activity_at`.
- **1 día** (consecutivo): `current_streak+1`, `longest_streak = max(longest, current)`, actualizar timestamp, **otorgar 5 XP** (`daily_streak`).
- **>1 día**: si pasaron >48h (`shouldBreakStreak`):
  - con protección disponible → consumirla (`streak_protections_used+1`) y mantener racha, actualizar timestamp;
  - sin protección → `current_streak = 1` (reset), actualizar timestamp.
  - si NO pasaron 48h (margen de gracia) → mantener y actualizar timestamp.
- Sin fila previa → crear con `current=1, longest=1, protections_used=0, protection_reset_date = día 1 del mes próximo`.

### Protecciones
1 por mes (constante `PROTECTIONS_PER_MONTH=1`). `canUseProtection`: si `now > protection_reset_date` → contador reseteado (disponible); si no, `used < 1`.
> Nota: la UI actual menciona "3 por mes" en algún texto legado; la regla efectiva del código es **1/mes** — usar 1.

### Riesgo de racha (para notificaciones)
Vence a las 48h de `last_activity_at`. Umbrales de alerta: 12h, 6h, 3h y 30min antes del vencimiento.

## 4. Quests semanales
- `weekly_quests`: una por semana (lunes como inicio — `getWeekStartDate`), con 3 challenge_ids aleatorios de retos activos.
- `user_quest_progress`: progreso por usuario; creado idempotente vía RPC `create_user_quest_progress_safe`.
- Completar los 3 retos de la quest → `completeQuest` → +50 XP (`quest_complete`).
- `generateWeeklyQuest()`: si no existe la quest de la semana actual, crearla (cliente best-effort al cargar stats; idealmente cron).
- Progreso: `round(completados∩quest / totalQuest * 100)`.

## 5. `getUserBasicStats(userId)` (agregador para Dashboard/Perfil)
Devuelve `{ level, totalXP, levelInfo, streak (get_or_create), quests activas }`. Con `skipQuests` opcional. Errores se propagan (el caller decide ocultar la sección).

## Robustez
- Todo error de gamificación en flujos de dinero es NO-bloqueante: se loguea y el flujo principal continúa (excepto el insert de la contribución misma).
- Los toasts de XP/level-up sólo se muestran si el paso correspondiente tuvo éxito.
- Offline: XP de contribuciones offline se otorga al sincronizar (el flush ejecuta el mismo flujo compuesto); la UI optimista NO suma XP localmente para evitar dobles conteos — muestra "XP pendiente de sincronizar".
