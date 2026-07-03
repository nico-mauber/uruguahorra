# Análisis Financiero (Analytics) — Especificación Funcional

Rutas: `/analytics` (tab "Análisis") y `/analytics-settings` (preferencias). Dashboard con insights psicológicos, patrones de gasto y proyección, gobernado por preferencias por usuario.

## Fuentes de datos (RPCs — ver contratos)
- `get_spending_patterns_for_period(user, days)` → patrones por categoría (top 10) `{category, amount, frequency, trend, average_amount}`.
- `get_monthly_spending_insights(user, months)` → filas por mes `{month, total_spent, budget_variance, top_categories, savings_rate, streak_days}`.
- `get_user_transaction_summary(user, days)` → quick stats + `spending_trend`.
- `get_enhanced_user_analytics(user, days)` → 29 métricas para el motor de insights.
- `get_user_streak_data(user)` → racha para el quick stat.
- Preferencias: `get_or_create_analytics_preferences` / `update_analytics_preferences` / `reset_analytics_preferences`.

## Motor de insights psicológicos (portar de `services/analytics/insights-config.ts`)
Sistema config-driven: lista de `InsightConfig` con `{type, category (health|efficiency|psychological|motivation|temporal), priority, confidence, healthScore, conditions(data), generator(data)}`.
- Input `InsightAnalysisData`: ratios básicos (`expense_ratio`, `savings_rate`, `cash_flow`, `total_expenses`), `transactionCount`, `topCategory`, `spendingTrend`, `monthlyInsights`.
- Evaluar TODOS los configs; los que cumplen `conditions` generan insight `{title, description, actionable, impact 'low'|'medium'|'high'}`.
- Scoring: prioridad del config × peso de categoría (health 3.5, psychological 2.8, temporal 2.5, efficiency 2.2, motivation 2.0) + boost horario (mañana 6-11h: +0.5 health/efficiency; tarde 12-17h: +0.3 psychological/temporal; noche 18-21h: +0.4 motivation).
- Limitar a `max_insights_per_type` por tipo (pref, default 2); si `prefer_high_impact_insights`, ordenar por impact desc.
- Insights sembrados obligatorios (títulos y condiciones exactos en el archivo fuente actual): "⚖️ Equilibrio Financiero Perfecto" (expense_ratio 70-95 y savings_rate ≥5), "🏆 Campeón del Ahorro" (savings_rate ≥20), "⚠️ Viviendo al Límite" (expense_ratio >95, impact high), "💰 Maestro del Flujo de Efectivo" (cash_flow>0 y savings ≥15), "🎯 Optimizador de Ingresos", "⚡ Maestro de Eficiencia", "🛫 Calculadora de Supervivencia Financiera", "Aumento en Gastos Detectado" (trend up, calcula % de aumento mes vs mes), "Concentración de Gasto Detectada" (categoría >40%), "🎯 Campeón del Progreso", "💪 Puntuación de Disciplina Financiera", "Patrón de Gastos Frecuentes" (≥10 transacciones; impact high si promedio <$20).

## Proyección (Forecast)
`ForecastService.getSpendingForecast(user, monthlyInsights, days)` → `{predicted_amount, confidence 0-1, trend 'up'|'down'|'stable'}` basado en promedio/regresión de los meses cargados. Si historial insuficiente → null.

## Caché
- Resultados de analytics cacheados en memoria + IndexedDB con TTL = `cache_interval` de preferencias (default 300000ms, rango 30s–30min).
- Pull-to-refresh: `clearAnalyticsCache()` + refetch completo (invalidación total).
- `auto_refresh` (pref): si true, refetch al volver a la pestaña tras expirar TTL.

## CU-1: Dashboard `/analytics`
1. Cargar preferencias (crear con defaults si no existen).
2. Con las preferencias, pedir en paralelo: patrones (`spending_patterns_days`), insights mensuales (`monthly_insights_months`), summary, enhanced analytics; generar insights psicológicos; calcular forecast si `enable_spending_forecast`.
3. Tabs visibles: Insights / Patrones / (Proyección sólo si `enable_spending_forecast`). Tab inicial = `default_tab`.
4. Quick stats (si `show_quick_stats` y hay datos): Gasto del mes, Categoría top, Racha en días.
5. Indicador de fuente: si patrones o insights mensuales tienen filas → "• Datos reales" (success); si no → "• Datos de demostración" (warning).
6. Tap en insight → dialog con título + descripción + "💡 Acción recomendada:\n{actionable}".

## CU-2: Preferencias `/analytics-settings`
Todas las opciones se AUTO-GUARDAN al cambiar (RPC `update_analytics_preferences` con sólo el campo tocado); éxito → toast "Configuración actualizada"; fallo → "Error al guardar la configuración" y revertir el control.
Grupos:
- **Períodos**: días de patrones (7–365), meses de insights (1–48), días de proyección (7–365) — steppers numéricos validados.
- **UI**: tab por defecto (picker insights/patterns/forecast), máx insights por tipo (1–5).
- **Features** (toggles): insights psicológicos, proyección de gastos, notificaciones push.
- **Localización**: idioma (es/en), moneda (UYU/USD/EUR), formato de fecha (DD/MM/YYYY | MM/DD/YYYY | YYYY-MM-DD).
- **Reset**: botón "Restaurar valores por defecto" con confirmación → RPC `reset_analytics_preferences`.

## Estados / robustez
- Error global de carga: pantalla con warning-outline 48 error + "Error al cargar análisis" + mensaje + botón "Reintentar".
- Vacíos por tab: Insights → "Agrega más transacciones para obtener insights personalizados" (o "Los insights psicológicos están deshabilitados en tus preferencias." si el toggle está off); Patrones → "No hay suficientes datos para mostrar patrones"; Proyección → "Necesitas más historial para generar proyecciones".
- Loading textual dentro de cada empty state: "Generando insights… / Analizando patrones… / Calculando proyección…".
- Offline: servir el último resultado cacheado con etiqueta "datos de la última sincronización"; auto-guardado de prefs se encola.
