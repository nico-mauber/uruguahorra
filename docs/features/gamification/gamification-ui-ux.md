# Gamificación — Especificación UI/UX (componentes)

## LevelBadge
Círculo (small 32 / medium 44 / large 56px) con número de nivel centrado (bold, blanco), fondo = color del tier (bronze/silver/gold/diamond), borde 2px del mismo color al 40%. `showLabel`: texto "Nivel N" debajo (`caption-md`). Tier diamond: fondo `#B9F2FF` con texto oscuro.

## XPProgressBar
Barra de progreso del nivel actual: track 10px radius full; fill degradado `--color-xp` → `--color-level`, animado (width transition 500ms bounce al montar y al ganar XP). `showLabels`: izquierda "«totalXP» XP" (`caption-md`), derecha "Siguiente: «nextLevelXP» XP". Accesible: `role="progressbar"` con aria-valuenow.

## StreakDisplay
Fila: emoji/icono llama 🔥 (color `--color-streak`; gris apagado si racha 0) + "N días de racha" (`category-md`) + secundario "Mejor: M" (`caption-md`). `showProtections`: iconos de escudo (shield 16) — llenos = protecciones disponibles del mes (1 − usadas), con tooltip "Protección de racha mensual". Si la racha está en riesgo (<12h para vencer): borde/badge warning con countdown "⏳ Vence en Xh".

## Toasts de gamificación (secuencia tras ahorrar)
1. t=0: success "¡$X ahorrado en «meta»!"
2. t+1s: success "+N XP ganado!" (sólo si N>0)
3. t+2s: level-up "🎉 ¡Subiste a nivel N!" (sólo si aplica) — considerar animación confetti (respetando reduced-motion).

## Card de gamificación del Dashboard
Ver `features/dashboard/dashboard-ui-ux.md` §2 (LevelBadge + XPProgressBar + StreakDisplay compuestos).

## Perfil — card de nivel
"Nivel N" (18/600) + "X / Y XP" (14 secondary) + ProgressBar primary del progreso hacia el siguiente nivel (fórmula real de `LevelsService`, no la aproximación `(n+1)²*4` del código viejo — unificar con `getLevelProgress`).

## Quests (si se renderizan en dashboard)
Card "Quest semanal": 3 retos con check ✓/○, barra de completitud, "+50 XP" como recompensa. Estado no disponible: ocultar sección silenciosamente.
