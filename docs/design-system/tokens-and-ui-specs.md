# Design System — Tokens y Componentes UI (Web Mobile-First)

> Traducción exacta del design system actual (theme/colors.ts, typography.ts, dimensions.ts) a CSS Custom Properties. Sistema psicológico: rojo = gastos (loss aversion), verde = ahorros (refuerzo positivo), azul = confianza.

---

## 1. Colores (CSS Custom Properties)

Definir en `:root` (light) y `[data-theme="dark"]`:

### Light
```css
:root {
  --color-primary: #339AF0;        --color-primary-dark: #1C7ED6;   --color-primary-light: #74C0FC;
  /* Gastos (Loss Aversion) */
  --color-expense: #FF6B6B;        --color-expense-secondary: #FF8E8E;
  --color-expense-bg: #FFF5F5;     --color-expense-light: #FFE0E0;
  /* Ahorros (Refuerzo positivo) */
  --color-savings: #51CF66;        --color-savings-secondary: #8CE99A;
  --color-savings-bg: #F3FFF3;     --color-savings-light: #D3F9D8;
  /* Neutral */
  --color-neutral: #6C757D;        --color-neutral-secondary: #ADB5BD;  --color-neutral-light: #F8F9FA;
  /* Superficies */
  --color-background: #FFFFFF;     --color-surface: #FFFFFF;
  --color-surface-secondary: #F8F9FA;  --color-card: #FFFFFF;
  /* Texto */
  --color-text-primary: #212529;   --color-text-secondary: #6C757D;
  --color-text-tertiary: #ADB5BD;  --color-text-inverse: #FFFFFF;
  /* Bordes */
  --color-border: #DEE2E6;         --color-border-secondary: #E9ECEF;  --color-border-focus: #339AF0;
  /* Semánticos */
  --color-success: #51CF66;  --color-warning: #FFB84D;  --color-error: #FF6B6B;  --color-info: #339AF0;
  /* Gamificación */
  --color-achievement: #FFD43B;  --color-streak: #FF6B35;  --color-xp: #6C5CE7;  --color-level: #A29BFE;
}
```

### Dark (−20% saturación; nunca negro/blanco puros)
```css
[data-theme="dark"] {
  --color-primary: #4DABF7;  --color-primary-dark: #339AF0;  --color-primary-light: #91D5FF;
  --color-expense: #FF7979;  --color-expense-secondary: #FF9F9F;
  --color-expense-bg: #2C1A1A;  --color-expense-light: #3D2020;
  --color-savings: #6BCF7F;  --color-savings-secondary: #81C784;
  --color-savings-bg: #1A2E1A;  --color-savings-light: #203020;
  --color-neutral: #ADB5BD;  --color-neutral-secondary: #6C757D;  --color-neutral-light: #343A40;
  --color-background: #1A1A1A;  --color-surface: #212529;
  --color-surface-secondary: #2D3A3A;  --color-card: #212529;
  --color-text-primary: #E0E0E0;  --color-text-secondary: #ADB5BD;
  --color-text-tertiary: #6C757D;  --color-text-inverse: #212529;
  --color-border: #495057;  --color-border-secondary: #343A40;  --color-border-focus: #4DABF7;
  --color-success: #6BCF7F;  --color-warning: #FFCC70;  --color-error: #FF7979;  --color-info: #4DABF7;
  --color-achievement: #FFE066;  --color-streak: #FF8A65;  --color-xp: #8B7ED8;  --color-level: #B39DDB;
}
```

Colores de dificultad de retos (fijos, sin variante dark): easy `#4CAF50`, medium `#FF9800`, hard `#F44336`, expert `#9C27B0`.
Colores de tiers de nivel: bronze `#CD7F32` (nvl 1–5), silver `#C0C0C0` (6–15), gold `#FFD700` (16–30), diamond `#B9F2FF` (31+).
Patrón de tinte: `color + '20'` de RN se traduce a `color-mix(in srgb, var(--color-x) 12%, transparent)` o rgba con alpha 0.12; `+ '15'` ≈ 8%; `+ '10'` ≈ 6%.

## 2. Tipografía

Fuente: system stack `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`. Jerarquía (px, weight, line-height, letter-spacing):

| Token | Size | Weight | LH | LS | Uso |
|---|---|---|---|---|---|
| `money-lg` | 32 | 700 | 40 | −0.5 | Monto principal |
| `money-md` | 28 | 700 | 36 | −0.3 | |
| `money-sm` | 24 | 700 | 32 | −0.2 | Montos de transacción |
| `headline-lg` | 24 | 600 | 32 | −0.2 | Título de pantalla |
| `headline-md` | 20 | 600 | 28 | −0.1 | Título de card |
| `headline-sm` | 18 | 600 | 26 | 0 | |
| `category-md` | 16 | 600 | 24 | 0 | Nombres de categoría |
| `body-lg` | 16 | 400 | 24 | 0 | Texto principal |
| `body-md` | 14 | 400 | 20 | 0 | Descripciones |
| `body-sm` | 12 | 400 | 18 | 0 | |
| `caption-md` | 12 | 500 | 16 | 0 | Metadata/fechas |
| `caption-sm` | 10 | 500 | 14 | 0 | |
| `button-md` | 16 | 600 | 22 | +0.3 | Botones |
| `label-md` | 14 | 500 | 20 | 0 | Labels de formulario |

## 3. Espaciado, radios, sombras, animación

- Escala 8px: `--space-xs:4 sm:8 md:12 lg:16 xl:24 2xl:32 3xl:48 4xl:64`.
- Radios: `--radius-md:8 lg:12 (botones/inputs) xl:16 (cards) 2xl:24 full:9999`.
- Touch targets: mínimo 44px, preferido 48px, crítico 56px, FAB 64px.
- Sombras: `--shadow-sm: 0 1px 2px rgba(0,0,0,.05)`, `--shadow-md: 0 2px 4px rgba(0,0,0,.1)`, `--shadow-lg: 0 4px 8px rgba(0,0,0,.15)`, `--shadow-xl: 0 8px 16px rgba(0,0,0,.2)`.
- Duraciones: fast 100ms (taps), normal 250ms (transiciones), slow 500ms (celebraciones), very-slow 800ms. Easings: standard `cubic-bezier(.4,0,.2,1)`, bounce `cubic-bezier(.175,.885,.32,1.275)`. Respetar `prefers-reduced-motion`.
- Z-index: sticky 10, fixed 100, overlay 1000, tooltip 1010, alert 1020.
- Layout: margen de pantalla 16px; máx ancho de contenido en desktop **480px centrado** (app mobile-first; en ≥768px el contenido va en columna central con fondo `surface-secondary`).

## 4. Componentes base (contratos)

### Button
Props: `title, variant 'primary'|'outline'|'ghost', size 'small'|'medium'|'large', disabled, loading, icon?`. Primary: fondo `--color-primary`, texto blanco, radius 12, min-height 48 (large 56). Outline: borde 1px primary, texto primary. Loading: spinner inline, disabled. Hover: opacity .9; Active: scale(0.98) 100ms.

### Card
Fondo `--color-card`, radius 16, padding 16 (`padding="none"` disponible), sombra `--shadow-md`. Variante `outlined`: borde 1px `--color-border`, sin sombra.

### ProgressBar
Props: `progress 0-100, color?, showLabel?`. Track: 8px alto, radius full, fondo `--color-border-secondary`. Fill animado (transition width 500ms bounce). Label opcional a la derecha `caption-md` "N%". Color dinámico según progreso cuando aplique: ≥100 success, ≥75 primary, ≥50 warning, <50 text-secondary.

### Input de texto
Fondo `--color-surface`, borde 1px `--color-border`, radius 12, padding 16, `body-lg`. Focus: borde `--color-border-focus` 2px. Placeholder `--color-text-tertiary`. Inputs de monto: prefijo `$` fijo, `inputmode="decimal"`, sólo dígitos y un punto con 2 decimales máx.

### Tab bar inferior (reemplaza Tabs de Expo)
Fija abajo, altura 64px + `env(safe-area-inset-bottom)`. 5 tabs: Dashboard (icono home), Metas (flag), Retos (trophy), Análisis (analytics), Perfil (person). Activo: `--color-primary`; inactivo: `--color-text-secondary`. Iconos: **Ionicons via `ionicons` web components o SVG sprite equivalente** (mantener nombres actuales). Label `caption-md` debajo del icono. Oculta en rutas fuera de tabs.

### FAB
64x64, circular, fondo primary (o savings para transacciones), sombra `--shadow-xl`, posición fixed bottom:16+safe-area right:16, z-index 100. Ícono `add` 32px blanco. Al expandir (TransactionFAB): rota 135°, muestra overlay `rgba(0,0,0,.5)` y quick actions verticales.

### Modal / Dialog
Overlay `rgba(0,0,0,0.5)`. Mobile: sheet centrado ancho 100% máx 400px, radius 16, padding 24. Cerrar con X arriba-derecha, clic en overlay y tecla Esc. Bloquear scroll del body. Focus trap + `aria-modal`.

### Toasts (reemplaza react-native-toast-message)
Contenedor fixed top (bajo safe-area), apilables, auto-dismiss 3s (errores 5s), animación slide-down. Tipos: success (borde/icono savings), error (expense), warning, info, loading (spinner, sin auto-dismiss). API: `ToastService.{quickSuccess, quickInfo, success(title,msg), error, warning, info, loading, handleError(e), savingSuccess(amount, goalName), welcome(name), levelUp(n)}`.

### Empty states
Patrón: icono outline 64–80px `--color-text-secondary` + título `headline-sm` + texto `body-md` centrado + CTA primario. Textos exactos por pantalla en cada spec de feature.

### Skeletons / loading
Spinner circular primary para cargas de página completa con texto contextual ("Verificando sesión…", "Cargando tus metas…"). Skeleton shimmer para cards en listas.

## 5. Accesibilidad
- Contraste AA mínimo; los tokens ya cumplen sobre sus fondos previstos.
- Todos los controles con `aria-label`; modales con focus trap; navegación por teclado completa.
- Tamaño de fuente responde a zoom del navegador (usar rem: base 16px → 1px≈0.0625rem en los tokens).
