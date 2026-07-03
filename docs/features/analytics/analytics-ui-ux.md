# Análisis Financiero (Analytics) — Especificación UI/UX

## Pantalla `/analytics`

### Header (padding 20)
- "📊 Análisis Financiero" (24/bold) + indicador de fuente debajo ("• Datos reales" success / "• Datos de demostración" warning, 11/500) + subtítulo "Insights psicológicos y patrones de gasto" (14, 70%).
- Botón engranaje (settings-outline 20, círculo 40px fondo surface) a la derecha → `/analytics-settings`.

### Quick stats (2+1 cards)
Fila de 2: **"Gasto del mes"** ($ del mes más reciente, icono y flecha de tendencia: up=rojo trending-up, down=verde trending-down, stable=guion) | **"Categoría top"** (nombre + $ debajo). Fila completa: **"Racha actual"** ("N días" + "Días consecutivos"; trend up si >7). Cards: padding 12, min-height 85, título 11/500, valor 16/bold.

### Tabs (3 máx, iguales, subrayado inferior 2px)
"💡 Insights" | "📈 Patrones" | "🔮 Proyección" (solo si habilitada). Activa: texto/icono primary + fondo primary 8% + borde inferior primary.

### Tab Insights
Lista de **PsychologicalInsightCard** (borde 1px del color del tipo, fondo color 8%): fila icono 24 (según tipo de insight; mapa en config) + título (16/600); descripción (14, LH20, secondary); "💡 {actionable}" (14/500). Tap → dialog detalle.

### Tab Patrones
Componente **SpendingAnalytics**: resumen del período (total gastado, promedio diario, promedio por transacción, categoría más cara y más frecuente) + top 5 categorías con barras proporcionales (color de categoría) y conteo de transacciones + bloque psicología (arrepentimiento, necesidad, impacto de humor promedio).

### Tab Proyección
Card centrada: header analytics-outline + "Proyección próximos {N} días"; monto grande (32/bold primary); "Confianza: NN.N%" (14 secondary); "Tendencia: Al alza (rojo) / A la baja (verde) / Estable (secondary)" (16/500).

### Empty/error states: ver functional-specs (icono 48 + texto centrado en Card padding 40).

---

## Pantalla `/analytics-settings`
Header con back + "Configuración de Análisis". Secciones tipo Card con título (`SettingSection`):
1. "Períodos de análisis": 3 **NumberInput** (label + stepper −/+ + valor, con mín/máx indicados: "Patrones de gasto (días)" 7–365, "Insights mensuales (meses)" 1–48, "Proyección (días)" 7–365).
2. "Interfaz": **PreferencePicker** "Pestaña inicial" (Insights/Patrones/Proyección) + NumberInput "Máx. insights por tipo" 1–5.
3. "Funciones": 3 **FeatureToggle** (switch + label + descripción corta): "Insights psicológicos", "Proyección de gastos", "Notificaciones push".
4. "Localización": pickers Idioma (Español/English), Moneda (UYU/USD/EUR), Formato de fecha.
5. Botón "Restaurar valores por defecto" (outline error) + confirm dialog.
Todo cambio auto-guarda; **ToastNotification** inline (éxito verde/error rojo) en la parte superior.
