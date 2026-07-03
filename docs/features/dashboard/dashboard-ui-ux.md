# Dashboard — Especificación UI/UX

Ruta `/`. Scroll vertical, padding 20px, pull-to-refresh (en web: botón de refresh en header o gesto táctil si se implementa; mínimo: refetch al volver a foco de pestaña tras >5 min).

## Orden de secciones

### 1. Header
- "¡Hola, {nombre}!" — 24px bold (nombre = email antes de la `@`).
- Subtítulo "Tu progreso de hoy" — `body-lg` secondary.

### 2. Card de gamificación (si stats cargadas)
- Fila superior: **LevelBadge** (círculo con número de nivel, color por tier bronze/silver/gold/diamond, tamaño large, label "Nivel N") a la izquierda + **XPProgressBar** (barra animada con labels "X XP" y "siguiente nivel: Y XP", % = levelInfo.progress) ocupando el resto.
- Debajo (margin-top 16): **StreakDisplay** — llama 🔥 color `--color-streak`, "N días de racha", longest, y protecciones disponibles del mes (icono escudo ×(1−usadas)).

### 3. Fila de 3 stat-cards (misma altura, gap 8)
- "Nivel" → número. "XP Total" → número. "Ahorrado" → `$Σ savedAmount` (entero).
- Card compacta: label `caption-sm` secondary arriba, valor 18px bold centrado.

### 4. Botón "Ver Transacciones"
Card-botón full-width fondo `--color-primary`, radius 16, padding 16, sombra primaria: círculo translúcido con icono receipt blanco + título "Ver Transacciones" (18/600 blanco) + subtítulo "Ingresos y gastos detallados" (14 blanco 80%) + chevron-forward.

### 5. Sección "Ahorro rápido para tus metas" (sólo si hay ≥1 meta)
- Título de sección `headline-sm`.
- Estado colapsado: Button primary full-width "💵 Ingresa tu monto" (min-height 56, radius 16).
- Estado expandido (card `--color-surface`, borde, radius 12, padding 16):
  - Header: "Monto personalizado" (16/600) + botón X.
  - Input de monto: alto 56, borde 2px primary, radius 12, texto 20/600 centrado, prefijo `$` superpuesto a la izquierda, `inputmode="numeric"` (sólo dígitos), autofocus.
  - Fila de botones gap 12: "Cancelar" (outline, flex 1) + "Ahorrar"/"Ahorrando…" (primary, flex 1, disabled si vacío/0/isSaving, spinner en loading).

### 6. Sección "Mis metas activas" (sólo si hay metas)
- Header fila: título + link "Ver todas →" (primary 14).
- Hasta 3 cards de meta (tap → GoalDetailModal): nombre (16/600, 1 línea ellipsis) + "«$saved» / «$target»" a la derecha (14 secondary) + ProgressBar con label (color success si ≥100, sino primary).
- Si hay >3: Button outline "Ver {n−3} metas más".

### 7. PodsList (ver spec de pods)

### 8. FAB de transacciones (flotante, siempre visible)

## Modales invocables
- **GoalSelectionModal**: lista vertical de metas activas; cada fila: nombre, progreso, restante; si `pendingAmount` > restante de la meta elegida, mostrar aviso y auto-ajustar el monto al máximo permitido con confirmación. Botón cerrar.
- **GoalDetailModal**: ver `features/goals/goals-ui-ux.md`.

## Estados
- Loading total: spinner centrado + texto contextual.
- Error: banner `--color-error` al 12% de fondo, texto error centrado.
- Sin metas: no se muestran secciones 5–6 (el empty state de metas vive en `/goals`; el FAB y pods siguen visibles).
- Offline: badge "Sin conexión" bajo el header; valores desde caché.
