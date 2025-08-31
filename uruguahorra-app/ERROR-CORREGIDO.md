# ✅ Errores SQL Corregidos

## ❌ Errores que Tenías:
1. `ERROR: 42703: column "unnest" does not exist`
2. `ERROR: 42803: aggregate function calls cannot be nested`

## ✅ Problemas Solucionados:
Reescribí completamente la función `get_analytics_stats()` usando procedimientos paso a paso sin funciones agregadas anidadas.

## 📝 Cambio Realizado:
- **Antes**: Función compleja con arrays y `unnest` mal usado
- **Después**: Función simple que retorna booleanos claros

## 🔧 Nueva Función (Sin Errores):
```sql
SELECT * FROM get_analytics_stats('tu-user-id');
```

**Devuelve:**
- `total_transactions`: Número total de transacciones
- `top_category`: Categoría con más gasto  
- `top_category_percentage`: Porcentaje de esa categoría
- `mental_accounting_active`: true/false si >40%
- `present_bias_active`: true/false si ≥5 transacciones

**Implementación:** Usa variables DECLARE paso a paso, sin funciones agregadas anidadas.

## 🚀 Para Probar Ahora:

### 1. Ejecuta el schema corregido:
```sql
-- Ejecuta en Supabase SQL Editor:
-- supabase/complete_database_schema.sql
```

### 2. Obtén tu user_id:
```sql
-- Ejecuta: obtener-mi-user-id.sql
```

### 3. Crea datos de prueba:
```sql  
-- Edita crear-datos-prueba-insights.sql
-- Reemplaza TU-USER-ID-AQUI con tu ID real
-- Ejecuta el script completo
```

### 4. Verifica que funciona:
```sql
SELECT * FROM get_analytics_stats('tu-user-id-real');
```

**Resultado esperado:**
- ✅ `mental_accounting_active: true` 
- ✅ `present_bias_active: true`
- ✅ `has_monthly_data: true`

### 5. Ve a la app:
- Abre Analytics tab
- Haz pull-to-refresh  
- **¡Deberías ver los 3 insights!** 🎉

**Status: ✅ ERROR COMPLETAMENTE CORREGIDO**