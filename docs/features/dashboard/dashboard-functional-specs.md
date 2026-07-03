# Dashboard — Especificación Funcional

Ruta `/` (tab "Dashboard"). Pantalla principal post-login: resumen de gamificación, ahorro rápido, metas activas, acceso a transacciones y pods.

## Datos que carga (en paralelo, una sola vez por sesión de pantalla)
1. `fetchGoals(userId)` — metas activas del usuario.
2. `GamificationService.getUserBasicStats(userId)` → `{ level, totalXP, levelInfo{progress,nextLevelXP,currentLevelXP}, streak{current_streak, longest_streak, last_activity_at, streak_protections_used, protection_reset_date}, quests }`.
3. `fetchUserSquads(userId)` (dentro del componente PodsList).
4. Guard de inicialización: refs para no recargar en re-renders; pull-to-refresh / botón refrescar fuerza recarga de (1)+(2) y muestra toast "Información actualizada".

## Caso de uso principal: Ahorro rápido (contribución manual)

### Flujo
1. Usuario pulsa "💵 Ingresa tu monto" → se despliega input de monto inline.
2. Ingresa monto (sólo enteros positivos) y pulsa "Ahorrar" (o Enter).
3. Validación: monto > 0, si no → toast warning "Monto inválido / Ingresa un monto válido mayor a 0".
4. Selección de meta:
   - 0 metas → toast warning "Sin metas / Crea una meta primero para poder ahorrar". Abortar.
   - 1 meta → usarla directamente, con validaciones:
     - meta ya completada (`saved ≥ target`) → toast warning "🎯 Meta completada / «{nombre}» ya está completada…". Abortar.
     - monto > restante (`target − saved`) → toast warning "Monto excede el objetivo / El máximo permitido es ${max}" → abrir **GoalSelectionModal** con el monto pendiente para ajustar.
   - >1 metas → abrir **GoalSelectionModal** (lista de metas con progreso; permite elegir meta y ajustar monto si excede el restante de la elegida).
5. Ejecutar flujo compuesto `applySavingToGoal` (ver `architecture/state-management.md` §3.4): contribución → XP optimizado → racha → refetch metas → update local de stats → toasts secuenciados (ahorro ✓, +XP a 1s, level-up a 2s).
6. Guard `isSaving` bloquea reentradas (multi-tap) durante todo el flujo.

### Reglas
- XP: `min(floor(monto)*2, 10)`.
- La contribución NO afecta retos (sistemas separados); sí se sincroniza con squads (recalcular `total_saved/monthly_saved` del miembro en cada pod al que pertenezca — best-effort, sin abortar si falla).
- Fuente registrada: `source:'manual'`, descripción "Ahorro rápido desde dashboard".

## Otros casos de uso
- **Ver transacciones**: botón grande → navega a `/transactions`.
- **Detalle de meta**: tap en card de meta → abre `GoalDetailModal` (ver feature goals).
- **Ver todas las metas**: link "Ver todas →" y botón "Ver N metas más" → `/goals`.
- **Pods**: sección PodsList (ver feature pods).
- **Nueva transacción**: FAB flotante (ver feature transactions).
- **Bienvenida**: primera carga por sesión → a los 1.5s toast `welcome(nombreDeUsuario)` donde nombre = parte local del email. Solo una vez (flag en memoria).

## Estados
- **Cargando inicial**: spinner + "Verificando sesión…" / "Cargando tus metas…".
- **Sin usuario** (borde): redirect a `/onboarding` tras 200ms.
- **Error de carga**: banner rojo con el mensaje bajo las secciones.
- **Offline**: datos desde caché IndexedDB + banner offline; ahorro rápido funciona en modo optimista/encolado.

## Robustez
- Si falla la carga de stats de gamificación: propagar error (no ocultar con defaults) → sección de gamificación no se muestra pero el resto del dashboard sí.
- Si falla la actualización de racha durante un ahorro: warn + continuar (el ahorro ya está persistido).
- Refetch tras volver de `/create-goal` o cerrar GoalDetailModal con cambios.
