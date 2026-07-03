# Presupuestos — Especificación UI/UX

## Acceso
- Card en Dashboard (mismo patrón visual que "Ver Transacciones"): icono wallet/pie-chart, título "Presupuestos", subtítulo "Controla tus límites por categoría" → navega a `/budgets`.
- Enlace secundario desde header de `/transactions` (icono, junto al título) — opcional si hay espacio; el acceso principal es el card de Dashboard.

## Pantalla `/budgets`

### Header
Fila: botón atrás (arrow-back 24) | título centrado "Presupuestos" (20/600) | espaciador 40px. Borde inferior 1px.

### Botón "+ Nuevo presupuesto"
Debajo del header, ancho completo o FAB circular (consistente con el resto de la app — usar `Fab` existente con icon "add", label "Nuevo presupuesto").

### Lista de presupuestos activos
- Card por presupuesto: círculo 40px con color de categoría + emoji | nombre categoría (16/600) y rango de fechas "d MMM – d MMM" (12 secondary) | a la derecha `$spent / $amount` (14/700, verde si `spent <= amount`, rojo `--color-error` si excedido).
- `ProgressBar` debajo (ancho completo), color verde/normal si dentro de límite, rojo si `spent > amount` (barra llena al 100% aunque el exceso sea mayor).
- Si vencido (`end_date < hoy`): badge "Vencido" (fondo `--color-error` 12%, texto `--color-error`, 11/600) junto al nombre + botón "Renovar" (outline, pequeño) a la derecha en vez del monto.

### Empty state
Card con icono wallet-outline 64 secondary + "No tenés presupuestos activos" (18/600) + "Creá uno para controlar cuánto gastás por categoría".

### Sección "Historial" (colapsable)
- Header clickeable: "Historial" (16/600) + chevron que rota al expandir.
- Mismo layout de card que activos pero `opacity: 0.6`, sin badge/botón — solo `$spent final / $amount` y rango de fechas.
- Empty: no se muestra la sección si no hay presupuestos vencidos aún.

## Modal "Nuevo presupuesto"
Dialog centrado máx 400px, mismo look que otros formularios (QuickTransactionModal, CreateGoalScreen).
- Selector de categoría: grid o lista de categorías `expense` disponibles (excluye las que ya tienen presupuesto activo vigente) — emoji + nombre, mismo estilo que paso 2 de QuickTransactionModal.
- Input monto límite: símbolo `$` + input decimal (mismo patrón que QuickTransactionModal paso 1).
- Dos inputs de fecha (Desde / Hasta) — mismo componente `<input type="date">` usado en el filtro de Transacciones, con `min`/`max` cruzados para evitar rango inválido.
- Botón "Crear presupuesto" (disabled si falta categoría, monto ≤0, o fechas inválidas).

## Modal "Renovar presupuesto"
Mismo layout que "Nuevo presupuesto" pero:
- Categoría mostrada como texto fijo (no editable): emoji + nombre.
- Monto prellenado con el valor del presupuesto vencido (editable).
- Fechas vacías, a completar por el usuario.
- Botón "Renovar presupuesto".

## Toggle en QuickTransactionModal (paso 3, confirmar)
- Debajo del bloque "Categoría", si aplica: fila con label "Descontar de presupuesto" + nombre categoría + `$restante` en secondary, y un switch a la derecha (mismo componente switch usado en AnalyticsSettingsScreen si existe, o checkbox estilizado). Apagado por defecto.
- Si el presupuesto de la categoría está vencido: en vez del switch, texto secondary 12px en cursiva: "Presupuesto de «Categoría» vencido — renovalo en Presupuestos" (no clickeable, solo informativo).
- No aparece nada si la categoría no tiene presupuesto activo.
