# Transacciones — Especificación UI/UX

## Pantalla `/transactions`

### Header
Fila: botón atrás (arrow-back 24) | título centrado "Transacciones" (20/600) | espaciador 40px. Borde inferior 1px.

### Card "Balance del período"
- Título "Balance del período" (16/600) + **DateRangeSelector** debajo (dos campos fecha inicio/fin, límite 2 años atrás; en web usar `<input type="date">` estilizado o date-picker propio con el design system).
- Fila de 3 columnas centradas: "Ingresos" `+$N` en `#51CF66`; "Gastos" `-$N` en `#FF6B6B`; "Balance" `±$N` (verde si ≥0, rojo si <0). Labels 12/500 secondary; valores 18/700. Montos enteros (`toFixed(0)`).

### Lista agrupada por día
- Encabezado de grupo: fecha relativa (14/600 secondary, margen 8).
- Ítem (Card, margin-bottom 8): círculo 40px con fondo = color de categoría y emoji 20px | descripción (16/500; fallback: nombre de categoría o "Sin descripción") y subtítulo "«categoría» • «fecha relativa»" (12 secondary) | a la derecha monto `−$N` rojo o `+$N` verde (16/700) y botón basura (trash-outline 16 secondary) debajo.

### Empty state
Card con receipt-outline 64 secondary + "No hay transacciones" (18/600) + "Usa el botón + para registrar tu primera transacción".

### FAB (bottom-right; dejar 80px de padding inferior en la lista)

---

## TransactionFAB (componente global)
- Colapsado: círculo 64px con "+" blanco.
- Expandido: overlay `rgba(0,0,0,.5)` clickeable para cerrar; el "+" rota a 135°; aparecen (animación scale+translateY 300ms):
  1. Botón "Gasto" — píldora roja `--color-expense` con icono remove/arrow-down + label.
  2. Botón "Ingreso" — píldora verde `--color-savings` con icono add/arrow-up + label.
  3. Botón "Voz" — píldora primary con icono mic + label.
  4. Hasta 3 chips de transacciones frecuentes encima (emoji categoría + descripción + $ promedio).

## QuickTransactionModal (3 pasos)
Dialog centrado máx 400px. Color de acento por tipo: income `#51CF66`, expense `#FF6B6B`, neutro `#339AF0`.
- **Paso 1 "💰 ¿Cuánto?"**: símbolo `$` grande + input gigante (32px, borde inferior color acento, autofocus, `inputmode=decimal`, placeholder "0.00", select-on-focus). Botón "Siguiente →" (fondo acento; disabled si vacío/≤0).
- **Paso 2 "📂 ¿Categoría?"**: grid 3 columnas scrolleable de botones (borde = color de categoría, radius 12): emoji 28px + nombre 12px 2 líneas. Tap avanza.
- **Paso 3 "✅ Confirmar"**: bloques compactos "Monto" ($X en color acento, 24/700), "Categoría" (chip: círculo con emoji sobre fondo color-categoría 12% + nombre), "Descripción" (textarea compacta, placeholder "Nota opcional sobre esta transacción", maxLength 100). Botón "Crear Transacción ✓" (fondo acento; "Guardando…" en loading).
- Navegación: X para cerrar en todo momento; volver atrás entre pasos (breadcrumb o botón back).
- Al reabrir siempre resetea a paso 1 vacío.

## VoiceTransactionModal
- Estado inicial: gran botón de micrófono (círculo 96px primary) + texto "Mantén presionado y di tu transacción, ej: «Gasté 250 pesos en supermercado»".
- Grabando: círculo pulsante rojo + contador `0:SS / 0:30` + botón detener.
- Procesando: spinner + "Transcribiendo…".
- Resultado: transcript en cursiva + formulario precargado (monto, tipo, categoría sugerida, descripción) con badge de confianza (verde ≥80%, amarillo 60-79%) + botones "Confirmar" / "Reintentar".
- Errores: permiso denegado → card con instrucciones; baja confianza → "No entendí el audio, intenta de nuevo"; offline → botón de voz deshabilitado con tooltip "Requiere conexión".
