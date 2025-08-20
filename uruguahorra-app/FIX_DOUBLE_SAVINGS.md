# Solución al Problema de Duplicación de Ahorros

## Problema Identificado
Cuando se agregaba un ahorro rápido desde el dashboard, el monto se guardaba duplicado (ej: al ahorrar $200, se guardaban $400).

## Causa Raíz
Existía un **conflicto entre el código de la aplicación y un trigger de la base de datos**:

1. **Trigger de la BD** (`update_goal_progress_trigger`): Se ejecuta automáticamente después de insertar una contribución y actualiza el `saved_amount` de la meta
2. **Código de la App** (`GoalsService.addContribution`): También actualizaba manualmente el `saved_amount` después de insertar la contribución

Esto causaba que el `saved_amount` se actualizara **DOS VECES**.

## Solución Implementada

### 1. Modificación en `src/services/goals.service.ts`
- Se eliminó el código que actualizaba manualmente el `saved_amount` (líneas 273-308)
- Ahora el método `addContribution` solo inserta la contribución
- El trigger de la BD se encarga automáticamente de actualizar el `saved_amount`

### 2. Actualización de comentarios
- Se agregaron comentarios explicativos sobre el funcionamiento del trigger
- Se actualizó la documentación del método para indicar que el trigger maneja la actualización

## Cómo Probar la Solución

### Prueba Manual
1. Abre la aplicación y navega al dashboard
2. Crea una nueva meta con un objetivo de $1000
3. Haz clic en el botón de ahorro rápido de $200
4. Verifica que el progreso muestre $200 (no $400)
5. Agrega otro ahorro de $100
6. Verifica que el total sea $300 (no $600)

### Prueba en Base de Datos
Ejecuta el script `test-trigger.sql` para verificar:
```sql
-- Ver si los valores coinciden para una meta específica
SELECT 
    g.id,
    g.name,
    g.saved_amount as saved_amount_in_goal,
    COALESCE(SUM(c.amount), 0) as sum_of_contributions,
    CASE 
        WHEN g.saved_amount = COALESCE(SUM(c.amount), 0) THEN 'OK'
        ELSE 'ERROR - NO COINCIDEN'
    END as status
FROM goals g
LEFT JOIN micro_contributions c ON g.id = c.goal_id
WHERE g.is_active = true
GROUP BY g.id, g.name, g.saved_amount;
```

## Archivos Modificados
- `src/services/goals.service.ts` - Se eliminó la actualización manual de saved_amount
- `src/app/(tabs)/index.tsx` - Se actualizaron comentarios

## Notas Importantes
- El trigger `update_goal_progress_trigger` es esencial para el funcionamiento correcto
- NO se debe actualizar manualmente el `saved_amount` desde el código
- El trigger garantiza la consistencia entre la suma de contribuciones y el saved_amount

## Si el Problema Persiste
1. Verifica que el trigger existe en la BD ejecutando:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'update_goal_progress_trigger';
   ```
2. Asegúrate de que no haya otro código actualizando saved_amount
3. Revisa los logs del navegador y del servidor para identificar llamadas duplicadas