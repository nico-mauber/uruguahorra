-- Script de prueba para verificar el funcionamiento del trigger update_goal_progress_trigger
-- Este script verifica que el trigger actualice correctamente saved_amount al insertar contribuciones

-- 1. Verificar que el trigger existe
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'update_goal_progress_trigger';

-- 2. Verificar la función del trigger
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc
WHERE proname = 'update_goal_progress';

-- 3. Prueba práctica: Seleccionar una meta de prueba
SELECT 
    id,
    name,
    target_amount,
    saved_amount,
    user_id
FROM goals
WHERE is_active = true
LIMIT 1;

-- 4. Ver las contribuciones actuales de esa meta
-- (Reemplazar 'GOAL_ID' con el ID de la meta del paso 3)
SELECT 
    id,
    amount,
    created_at
FROM micro_contributions
WHERE goal_id = 'GOAL_ID'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Ver la suma total de contribuciones vs saved_amount
-- (Reemplazar 'GOAL_ID' con el ID de la meta)
SELECT 
    g.id,
    g.name,
    g.saved_amount as saved_amount_in_goal,
    COALESCE(SUM(c.amount), 0) as sum_of_contributions,
    CASE 
        WHEN g.saved_amount = COALESCE(SUM(c.amount), 0) THEN 'OK - Valores coinciden'
        ELSE 'ERROR - Valores NO coinciden'
    END as status
FROM goals g
LEFT JOIN micro_contributions c ON g.id = c.goal_id
WHERE g.id = 'GOAL_ID'
GROUP BY g.id, g.name, g.saved_amount;

-- 6. Para hacer una prueba manual de inserción:
-- IMPORTANTE: Antes de ejecutar, verificar el saved_amount actual
-- Luego insertar una contribución de prueba de $100
-- Y verificar que saved_amount se actualice automáticamente

/*
-- Ejemplo de inserción de prueba (ajustar valores según necesidad):
INSERT INTO micro_contributions (
    user_id,
    goal_id,
    amount,
    source,
    description
) VALUES (
    'USER_ID',  -- Reemplazar con un user_id válido
    'GOAL_ID',  -- Reemplazar con un goal_id válido
    100,        -- Monto de prueba
    'manual',
    'Prueba de trigger'
);

-- Verificar inmediatamente el saved_amount después de la inserción
SELECT id, name, saved_amount FROM goals WHERE id = 'GOAL_ID';
*/