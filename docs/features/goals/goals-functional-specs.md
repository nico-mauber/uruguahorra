# Metas (Goals) — Especificación Funcional

Rutas: `/goals` (listado, tab "Metas"), `/create-goal` (wizard 2 pasos), `GoalDetailModal` (compartido con dashboard).

## Modelo
Meta = objetivo de ahorro con `target_amount`, `saved_amount` (calculado por trigger a partir de `micro_contributions`), `target_date`, categoría/color/icono, `is_active` (soft delete), `is_completed` (auto cuando saved ≥ target).

## CU-1: Listar metas
- `fetchGoals(userId)` con caché por usuario; refresh manual con `force=true` (toast "Metas actualizadas").
- Derivados: activas = `isActive !== false`; completadas = progreso ≥100; total ahorrado = Σ saved.
- Progreso = `min(100, saved/target*100)`. Días restantes = `ceil((targetDate − hoy)/86400s)`; ≤0 → "Meta vencida".

## CU-2: Crear meta (wizard 2 pasos)

### Paso 1 — Tipo de meta
- Cargar `GoalTypesService.getAllGoalTypes(userId)` (tipos sistema + custom del usuario). Mientras carga: spinner "Cargando tipos de metas…".
- Opciones = ["🎨 Meta personalizada" (primera)] + tipos dinámicos con `{emoji} {name}`. Fallback si falla la carga: tipos legacy fijos (emergency/travel/debt/purchase + custom).
- Al continuar, pre-llenar Paso 2 según selección:
  - Tipo dinámico → nombre `Mi {type.name}`, plazo `type.suggested_duration_months` meses.
  - Custom → nombre "Mi Meta Personal", plazo 6 meses.
  - Legacy → emergency: "Mi Fondo de Emergencia"/6m; travel: "Mi Viaje Soñado"/12m; debt: "Libertad Financiera"/24m; purchase: "Mi Gran Compra"/8m.
  - Monto siempre se limpia.

### Paso 2 — Detalles
Campos:
- **Nombre** (obligatorio, texto). Placeholder por tipo (emergency: "Ej: Fondo de Emergencia Familiar"; travel: "Ej: Viaje a Europa 2025"; debt: "Ej: Eliminar deuda tarjeta de crédito"; purchase: "Ej: Auto nuevo"; default: "Ej: Mi objetivo personal").
- Campos condicionales por tipo legacy: travel → "Destino (opcional)" (se concatena al nombre: `{nombre} - {destino}`); purchase → "Descripción del producto (opcional)" (concatenación ídem); debt → "Tasa de interés actual (%) — opcional" (informativo, no se persiste).
- Si tipo = custom: campo "Categoría de tu meta" (texto libre, default 'custom'), selector de ícono (8 opciones: flag 🎯, home 🏠, car 🚗, school 🎓, fitness 💪, heart ❤️, star ⭐, gift 🎁) y selector de color (8: #339AF0 #51CF66 #FF6B6B #8B5CF6 #FFB84D #FF8CC8 #20C997 #6C757D).
- **Monto objetivo** (obligatorio, numérico > 0). Placeholder por tipo.
- **Plazo en meses** (numérico, default según tipo; fallback 3).
- **Calculadora automática** (visible cuando monto y plazo tienen valor): "Necesitas ahorrar: $«monto/meses» por mes" + "≈ $«monto/(meses*30)» por día".

Validaciones al enviar: nombre no vacío → "Por favor ingresa un nombre para tu meta"; monto no vacío → "Por favor ingresa el monto objetivo"; monto numérico >0 → "Por favor ingresa un monto válido mayor a 0".

Persistencia: `GoalsService.createGoal(userId, { name, target_amount, target_date: hoy+meses (YYYY-MM-DD), saved_amount: 0, is_active: true, category, color, icon, goal_type_id })` donde category/color/icon/goal_type_id vienen del tipo dinámico, o de la personalización custom, o del mapeo legacy.

Post-éxito: refetch metas con force → dialog "¡Éxito! Tu meta ha sido creada correctamente" → volver atrás.
Errores: `23505` → "Ya existe una meta con ese nombre"; `42501` → "No tienes permisos para crear metas. Verifica tu sesión."; otro → mensaje del error.

## CU-3: Detalle de meta (GoalDetailModal)
Acciones disponibles: ver progreso/restante/días, agregar contribución directa a ESTA meta (mismo flujo compuesto del dashboard), **editar** nombre/monto objetivo/fecha (`updateGoal`), y **eliminar** (soft delete `is_active=false`, con confirmación destructiva). Tras cualquier cambio → callback `onGoalUpdate` → refetch de metas con force.

## CU-4: Contribuciones de una meta
`getGoalContributions(goalId)` — historial ordenado desc (para el detalle).

## Robustez / offline
- Crear/editar/eliminar meta offline: encolar mutación; card muestra estado `_pending`.
- Doble-submit protegido por `isLoading` en el wizard.
- Sin usuario en `/create-goal`: pantalla "Debes iniciar sesión para crear una meta" + botón "Ir al inicio".
