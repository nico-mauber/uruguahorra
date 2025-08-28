# Analytics System SQL Functions - Installation Guide

## Estado actual
Las funciones de analytics están funcionando con **datos mock** para desarrollo. La pantalla de Analytics debería funcionar perfectamente sin errores.

## Para instalar las funciones SQL reales:

### Opción 1: Supabase CLI (Recomendado)
```bash
# Instalar Supabase CLI
npm install -g @supabase/cli

# Inicializar proyecto (si no está inicializado)
supabase init

# Aplicar el schema completo
supabase db reset

# O aplicar solo las funciones nuevas
supabase db push
```

### Opción 2: Panel Web de Supabase
1. Ve al **SQL Editor** en tu dashboard de Supabase
2. Copia y pega el contenido de `supabase/complete_database_schema.sql`
3. Ejecuta el script completo

### Opción 3: Solo las funciones de Analytics
Si solo quieres agregar las funciones de analytics sin tocar el resto:

```sql
-- Copiar desde la línea 2490 hasta el final de complete_database_schema.sql
-- Las funciones incluidas son:
-- 1. get_spending_patterns()
-- 2. get_monthly_insights() 
-- 3. get_user_spending_analysis()
-- 4. get_user_streak_data()
-- 5. predict_future_spending()
```

## Verificar instalación
Una vez instaladas las funciones, el sistema automáticamente:
1. ✅ Detectará que las funciones están disponibles
2. ✅ Dejará de usar datos mock
3. ✅ Mostrará datos reales de tu base de datos
4. ✅ Los logs cambiarán de "mock data" a "retrieved from database"

## Funciones incluidas

### `get_spending_patterns(user_id, days_back)`
- Devuelve patrones de gasto por categoría
- Calcula tendencias (up/down/stable) 
- Incluye frecuencia y promedios

### `get_monthly_insights(user_id, months_back)`
- Análisis mensual de gastos
- Top 3 categorías por mes
- Cálculo de tasa de ahorro
- Varianza presupuestaria

### `get_user_spending_analysis(user_id)`
- Análisis para insights psicológicos
- Categoría principal de gastos  
- Promedio diario de gastos
- Varianza vs presupuesto base

### `get_user_streak_data(user_id)`
- Datos de racha del usuario
- Auto-creación si no existe registro
- Racha actual y máxima

### `predict_future_spending(user_id, forecast_days)`
- Predicción inteligente de gastos
- Nivel de confianza basado en varianza
- Tendencia comparativa (últimos 15 vs 15 anteriores)

## Datos Mock vs Datos Reales
Mientras las funciones no estén instaladas:
- ✅ **La app funciona perfectamente**
- ✅ **No hay errores ni bucles infinitos**
- ✅ **Los insights psicológicos se muestran correctamente**
- ✅ **Todos los componentes UI funcionan**
- ⚠️ **Los datos son simulados pero realistas**

Una vez instaladas las funciones:
- ✅ **Datos reales de tu base de datos**
- ✅ **Análisis personalizados por usuario**
- ✅ **Predicciones basadas en historial real**
- ✅ **Insights psicológicos precisos**

## Logs de desarrollo
Revisa la consola para ver:
- `"Using mock data for [función] - SQL function not available"`
- `"retrieved from database"` (cuando las funciones estén instaladas)

## Próximos pasos
1. El sistema de Analytics ya está **completamente funcional** con mock data
2. Cuando tengas tiempo, instala las funciones SQL siguiendo esta guía
3. El cambio será automático y transparente para el usuario final
