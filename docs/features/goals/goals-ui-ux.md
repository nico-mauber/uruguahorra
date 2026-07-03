# Metas (Goals) — Especificación UI/UX

## Pantalla `/goals`

### Header (padding 20, bottom 10)
- Título "🎯 Mis Metas" — 28 bold `--color-primary`.
- Subtítulo "✨ Administra y sigue el progreso de tus objetivos de ahorro" — `body-lg` secondary 80%.

### Fila de 3 stat-cards verdes (gap 8, padding-h 16)
Fondo `rgba(34,197,94,0.08)`, borde `rgba(34,197,94,0.2)`, radius 12, min-height 65: valores en `#047857` 16/bold, labels en `#059669` 10/600 uppercase → "Activas" (count), "Ahorrado" ($ total), "Completas" (count progreso≥100).

### Lista de metas (scroll, padding 20)
Card por meta (radius 20, sombra primaria suave, animación de entrada fade+slide-up escalonada 100ms por índice; tap → detalle):
- Fila superior: nombre (20/bold) + categoría debajo (13/600 primary capitalize) | círculo de icono 48px a la derecha (icono por categoría: emergency→shield-checkmark, travel→airplane, debt→card, purchase→cart, default→flag; color por progreso: ≥100 success, ≥75 primary, ≥50 warning, <50 secondary; fondo = color al 12%).
- Fila de 3 columnas: "AHORRADO / META / RESTANTE" (labels 12 uppercase secondary; valores 18/bold).
- ProgressBar con label, color por progreso.
- Footer: si completada → badge "🎉 ¡Completada!" (fondo success 12%, borde success 25%, texto success bold); si no → "⏰ N días restantes" o "⚠️ Meta vencida" (13 secondary). Chevron-forward a la derecha.

### Empty state (sin metas activas)
Centrado vertical: icono flag-outline 80px primary 60% + "🌟 ¡Empieza tu viaje!" (22/bold primary) + texto "🚀 Crea tu primera meta de ahorro y comienza a construir tu futuro financiero con objetivos claros y motivadores" + Button primary "🎯 Crear mi primera meta" → `/create-goal`.

### FAB
64px circular primary, borde 3px `--color-primary-light`, icono add 32 blanco, fixed bottom 24 right 20 → `/create-goal`.

---

## Pantalla `/create-goal` (modal-page)
- Indicador de pasos: 2 dots centrados (activo: ancho 24, primary; inactivo: 8px, border).
- Título dinámico: paso 1 "¿Cuál es tu meta?" / paso 2 "Personaliza tu meta" (28/bold) + subtítulo "Elige lo que más te motive" / "Define los detalles de tu objetivo".
- **Paso 1**: cards de opción full-width (radius 16, borde 1px; seleccionada: borde 2px primary) con label 18px `{emoji} {nombre}`.
- **Paso 2**:
  - Card de consejo (fondo primary 6%, borde primary 20%): "💡 Consejo para {tipo}" + descripción del tipo (o textos legacy: emergency "Idealmente 3-6 meses de gastos mensuales…", travel "Investiga costos de vuelos…", debt "Pagar deudas rápido te ahorra intereses…", purchase "Comprar al contado suele tener descuentos…", default "Define claramente tu objetivo…").
  - (custom) Título "🎨 Elige un ícono:" + grid de círculos 50px (seleccionado: borde primary + fondo primary 12%); "🌈 Elige un color:" + grid de círculos 40px (seleccionado: borde 3px text-primary).
  - Inputs estándar en columna (nombre, condicionales, monto `inputmode=decimal`, fila "Plazo: [input] meses").
  - Card calculadora (fondo success 6%, borde success 20%): "📊 Tu plan de ahorro" + montos por mes y por día.
- Botones: "Continuar"/"Crear meta" (primary large) + "Cancelar" (outline large, opacity .7) → volver.
- Loading de guardado: spinner + "Guardando tu meta…" reemplaza los botones.

---

## GoalDetailModal
Dialog centrado máx 400px: header con nombre de la meta + X. Contenido: ProgressBar grande con %, montos ahorrado/objetivo/restante, días restantes, input de contribución rápida con botón "Ahorrar" (mismo flujo compuesto), sección editar (nombre/monto/fecha) y botón "Eliminar meta" (texto error, confirm dialog "¿Seguro que quieres eliminar esta meta?" con acciones Cancelar/Eliminar destructiva).
