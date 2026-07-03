# Retos (Challenges) — Especificación UI/UX

Ruta `/challenges`. Scroll vertical con 3 secciones.

## 1. Sección "Retos Activos (N/5)" (fondo `--color-surface`, padding 16)
- Título `headline-md`.
- Sin activos: texto cursiva centrado "No tienes retos activos. ¡Selecciona uno para comenzar!".
- Con activos: carrusel horizontal de cards 150px de ancho (min-height 80, radius 8, fondo background):
  - Título del reto (14/bold, 2 líneas máx).
  - "N% completado" (12/600 primary) — usa el progreso REAL del RPC (fallback: `session.progress`).
  - "D/T días" (10 cursiva secondary).
  - Mini barra de progreso 4px (fill primary, width = progreso).
  - Si atrasado (`!isOnTrack && progreso>0`): borde izquierdo 3px `--color-warning` + texto "⚠️ Atraso" (10/bold warning).
  - Icono huella (finger-print 16, opacity .5) arriba-derecha como indicio de que es clickeable.
  - Tap → ChallengeCheckinModal.

## 2. Sección "Categorías"
Carrusel horizontal de chips (radius 20, min-width 80, máx 100, padding 12/16): icono de categoría (si es emoji de ≤2 chars renderizar como texto 24px; si no, Ionicon 24) + nombre (12/600, 2 líneas, centrado). Seleccionada: fondo primary, texto/icono blancos; resto: fondo surface. Tap carga los retos de esa categoría.

## 3. Sección "Retos Disponibles"
Lista vertical de cards (radius 12, padding 16, fondo surface):
- Fila: título (16/bold, flex) + badge de dificultad (píldora radius 12, texto 10/bold uppercase blanco; fondo: easy #4CAF50, medium #FF9800, hard #F44336, expert #9C27B0).
- Descripción (14, LH 20, secondary).
- Footer: "+{xp} XP" (14/bold primary) | derecha: si activo → "✓ Activo" (12/bold success) y card al 60% opacity; si límite lleno → "Límite alcanzado" (12 cursiva secondary) y disabled; si disponible → icono add-circle 24 primary.
- Estados de sección: "Cargando retos…" / "No hay retos disponibles en esta categoría" (cursiva centrada).

## Modal selector de duración
Dialog centrado máx 400: header título del reto + X; subtítulo "Elige la duración de tu reto:"; 4 filas-botón (fondo background, radius 12, padding 16): icono calendar-outline 20 primary + label (16/600) + sublabel cursiva 14 secondary → "1 semana / 7 días", "15 días / 2 semanas", "30 días / 1 mes", "1 año / 365 días". Botón "Cancelar" outline al pie.

## ChallengeCheckinModal
Dialog centrado máx 400 (ver flujo en functional-specs):
- Header "Check-in Diario" (20/bold) + X.
- Bloque centrado: título del reto (18/600) + "Hoy, {weekday d de month}" (`es-ES`, capitalizado).
- Estado verificando: spinner + "Verificando estado…".
- Ya registrado: badge píldora (verde "✓ Cumplido" / naranja "✕ No cumplido"), nota previa en cursiva si existe, texto "Ya registraste tu check-in para hoy.".
- Formulario: pregunta "¿Cumpliste con el reto hoy?" (16/600 centrado) + textarea (min-height 80, placeholder "Nota opcional (cómo te fue, dificultades, etc.)") + fila de 2 botones grandes (padding-v 16, radius 12): "✓ Sí, cumplí" (fondo success) y "✕ No cumplí" (fondo warning); spinner inline durante submit; ambos disabled en loading.
