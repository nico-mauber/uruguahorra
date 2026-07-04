# Presupuestos — Especificación Funcional

Rutas/entradas: `/budgets` (listado + historial), acceso desde card en Dashboard y desde header de Transacciones. Toggle de vínculo en **QuickTransactionModal** paso 3.

## Modelo
Presupuesto = límite de gasto para una categoría (`transaction_categories`, solo `type='expense'`) en un rango de fechas definido por el usuario. `spent` se mantiene por trigger a partir de las transacciones vinculadas (`transactions.budget_id`). Solo un presupuesto `status='active'` por `(user_id, category_id)`.

Tabla `budgets`:
- `id`, `user_id`, `category_id` (FK), `amount` (límite, > 0), `spent` (default 0, solo trigger escribe), `start_date`, `end_date` (`end_date >= start_date`), `status` ('active' | 'expired'), `renewed_from_id` (FK a `budgets.id`, nullable — apunta al presupuesto que este reemplaza), `created_at`, `updated_at`.

`transactions` gana columna `budget_id` (FK nullable a `budgets.id`, `ON DELETE SET NULL`) — se llena solo si el usuario activa el toggle al crear el gasto.

## CU-1: Listado de presupuestos activos
1. Fetch `budgets` de `user_id` con `status='active'`, join categoría (nombre, emoji, color).
2. Al entrar a la pantalla, recalcular vencidos en cliente: si `end_date < hoy` y `status='active'` → tratar como "vencido" (no cambia el status en BD hasta que el usuario decide; ver CU-4).
3. Card por presupuesto: emoji + nombre categoría, barra de progreso `spent`/`amount`, monto "`$spent` / `$amount`". Color normal si `spent <= amount`; rojo si `spent > amount` (excedido, sin bloquear nada — ver Reglas).
4. Si vencido: badge "Vencido" + botón "Renovar" (abre CU-4).
5. Empty state si no hay presupuestos activos: invitación a crear el primero.

## CU-2: Crear presupuesto
1. Botón "+ Nuevo presupuesto" (header o FAB de la pantalla).
2. Formulario: selector de categoría (solo `expense`, excluye categorías que ya tengan un presupuesto `active` y vigente), monto límite (decimal > 0), fecha inicio, fecha fin (`end_date >= start_date`).
3. Guardar → INSERT en `budgets` con `spent: 0`, `status: 'active'`.
4. Feedback éxito + refresco de listado.

## CU-3: Vincular gasto a presupuesto (desde QuickTransactionModal o VoiceTransactionModal)
1. En el paso de confirmación del modal de gasto (**QuickTransactionModal** paso 3, o **VoiceTransactionModal** tras transcribir), se listan **todos** los presupuestos `active` **y vigentes** (hoy dentro de `[start_date, end_date]`) del usuario — no sólo el de la categoría ya elegida/matcheada, porque esa categoría puede estar mal (elección manual errada o auto-match de voz). Cada fila: "[emoji] [nombre categoría] (`$restante` restante)".
2. **Elegir un presupuesto de la lista fuerza la categoría de la transacción a la de ese presupuesto** (sobreescribe lo elegido en el paso 2 de Quick, o lo matcheado por `category_hint` en Voz). Ninguno seleccionado por defecto (opt-in explícito en cada gasto, no automático). Tocar el mismo ítem de nuevo lo deselecciona.
3. Si el usuario elige manualmente otra categoría después de haber seleccionado un presupuesto (Quick, volviendo al paso 2), el vínculo se limpia si la nueva categoría no coincide con la del presupuesto elegido.
4. Presupuestos vencidos no aparecen en la lista (no se puede vincular); no hay nota informativa aparte — para renovar, ir a la pantalla Presupuestos.
5. Sólo aplica a gastos (`type='expense'`); en Voz, si el usuario cambia el tipo a ingreso, la lista y la selección se limpian.
6. Al confirmar con un presupuesto seleccionado, la transacción se crea con ese `category_id` y `budget_id`. El trigger de `transactions` recalcula `budgets.spent`.

## CU-4: Renovar presupuesto vencido
1. Desde el botón "Renovar" en la card vencida (pantalla `/budgets`).
2. Modal: categoría fija (no editable), fecha inicio/fin nuevas (requeridas), monto prellenado con el `amount` del presupuesto vencido (editable).
3. Al confirmar:
   - INSERT nuevo `budgets` con `spent: 0`, `status: 'active'`, `renewed_from_id` = id del vencido.
   - UPDATE del presupuesto vencido → `status: 'expired'`.
4. El presupuesto expirado queda visible en Historial (CU-5); no se elimina.

## CU-5: Historial
1. Sección colapsable "Historial" debajo del listado activo.
2. Lista `budgets` con `status='expired'` del usuario, orden `end_date desc`.
3. Card atenuada (mismo layout que activo), sin acciones — solo lectura (`$spent` final / `$amount`, rango de fechas).

## Reglas de negocio
- Un presupuesto activo por categoría; no se puede crear uno nuevo para una categoría que ya tiene uno `active` y vigente (hay que esperar a que venza o no se ofrece esa categoría en el selector de CU-2).
- `spent` es exclusivamente derivado (trigger); el cliente nunca lo escribe directo.
- Exceder el límite (`spent > amount`) está permitido — no bloquea la creación del gasto, solo se refleja visualmente en rojo con el monto excedido.
- Vincular un gasto a presupuesto es siempre opt-in manual (elegir de la lista), nunca automático. Elegir un presupuesto fuerza la categoría del gasto a la de ese presupuesto — es una decisión explícita del usuario, no un auto-match.
- Un gasto con fecha fuera del rango del presupuesto no debería vincularse (el toggle no aparece si `hoy` no está en `[start_date, end_date]` del presupuesto de esa categoría) — la vigencia se evalúa contra la fecha actual, no contra `transaction_date` editable.
- Renovar es la única forma de "continuar" un presupuesto vencido; no hay edición de fechas de un presupuesto activo ya creado (evita ambigüedad con `spent` acumulado).
- Eliminar una transacción vinculada (soft delete) resta su monto de `budgets.spent` vía el mismo trigger.

## Offline
- Fuera de alcance de esta fase: crear/renovar presupuesto requiere conexión (no se encola). Vincular gasto a presupuesto (toggle) también requiere conexión, igual que el resto de CU-2 de transacciones online.
