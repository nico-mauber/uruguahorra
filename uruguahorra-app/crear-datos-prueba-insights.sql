-- ============================================
-- SCRIPT RÁPIDO: CREAR DATOS PARA PROBAR INSIGHTS
-- ============================================
-- Ejecuta este script para generar datos que activen los 3 insights psicológicos
-- IMPORTANTE: Reemplaza 'TU-USER-ID-AQUI' con tu user_id real
-- ============================================

-- PASO 1: Obtener tu user_id (ejecuta primero)
SELECT '📋 Tu User ID es:' as info, id as user_id, email 
FROM auth.users 
WHERE email = 'tu-email@ejemplo.com';  -- CAMBIA POR TU EMAIL

-- PASO 2: Ver categorías disponibles
SELECT '📋 Categorías disponibles:' as info;
SELECT id, name, emoji, type 
FROM public.transaction_categories 
WHERE type = 'expense' 
ORDER BY name;

-- PASO 3: Limpiar datos existentes (OPCIONAL - solo si quieres empezar fresh)
-- DELETE FROM public.transactions WHERE user_id = 'TU-USER-ID-AQUI';

-- PASO 4: Crear datos para LOS 3 INSIGHTS
DO $$
DECLARE
    test_user_id UUID := 'TU-USER-ID-AQUI';  -- REEMPLAZA CON TU ID REAL
    comida_id UUID;
    transporte_id UUID; 
    entretenimiento_id UUID;
    current_date_var DATE := CURRENT_DATE;
BEGIN
    -- Obtener IDs de categorías automáticamente
    SELECT id INTO comida_id FROM public.transaction_categories 
    WHERE name ILIKE '%comida%' OR name ILIKE '%bebida%' LIMIT 1;
    
    SELECT id INTO transporte_id FROM public.transaction_categories 
    WHERE name ILIKE '%transporte%' LIMIT 1;
    
    SELECT id INTO entretenimiento_id FROM public.transaction_categories 
    WHERE name ILIKE '%entretenimiento%' OR name ILIKE '%ocio%' LIMIT 1;

    -- Verificar que encontramos las categorías
    IF comida_id IS NULL OR transporte_id IS NULL OR entretenimiento_id IS NULL THEN
        RAISE EXCEPTION 'No se encontraron todas las categorías necesarias. Verifica los nombres en transaction_categories.';
    END IF;

    -- DATOS PARA MENTAL ACCOUNTING (>40% en comida)
    INSERT INTO public.transactions (user_id, amount, description, transaction_date, category_id, category_name, category_emoji, type) VALUES
    (test_user_id, 2500.00, '🍕 Pedidos Ya - Pizza', current_date_var - 1, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    (test_user_id, 2000.00, '🛒 Supermercado Tienda Inglesa', current_date_var - 3, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    (test_user_id, 1800.00, '🍽️ Restaurante Las Brasas', current_date_var - 5, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    (test_user_id, 1500.00, '☕ Café Martinez', current_date_var - 7, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    (test_user_id, 1200.00, '🍜 Uber Eats - Sushi', current_date_var - 9, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    
    -- DATOS PARA PRESENT BIAS (≥5 transacciones) - ya tenemos 5 arriba
    (test_user_id, 800.00, '🚕 Uber Centro', current_date_var - 2, transporte_id, 'Transporte', '🚗', 'expense'),
    (test_user_id, 600.00, '🎬 Cine Portones', current_date_var - 4, entretenimiento_id, 'Entretenimiento', '🎮', 'expense'),
    (test_user_id, 400.00, '🚌 STM Boletos', current_date_var - 6, transporte_id, 'Transporte', '🚗', 'expense'),
    
    -- DATOS PARA LOSS AVERSION (mes anterior más bajo)  
    (test_user_id, 800.00, '🛒 Super mes pasado', current_date_var - 35, comida_id, 'Comida y Bebidas', '🍔', 'expense'),
    (test_user_id, 600.00, '🚗 Transporte mes pasado', current_date_var - 37, transporte_id, 'Transporte', '🚗', 'expense'),
    (test_user_id, 500.00, '🎮 Ocio mes pasado', current_date_var - 39, entretenimiento_id, 'Entretenimiento', '🎮', 'expense');

    RAISE NOTICE '✅ Datos creados exitosamente para activar los 3 insights psicológicos';
END $$;

-- PASO 5: Verificar que funcionó
SELECT '🧪 VERIFICACIÓN DE INSIGHTS:' as test_results;

-- Ver estadísticas generales
SELECT 
    '📊 Stats:' as info,
    total_transactions as transacciones,
    top_category as categoria_principal,
    top_category_percentage as porcentaje_principal,
    CASE WHEN mental_accounting_active THEN '✅ Mental Accounting ACTIVO' ELSE '❌ Mental Accounting inactivo' END as mental_accounting,
    CASE WHEN present_bias_active THEN '✅ Present Bias ACTIVO' ELSE '❌ Present Bias inactivo' END as present_bias
FROM get_analytics_stats('3f44afc7-3016-4c00-9fc0-b1f20e0ad35c');

-- Ver breakdown por categorías (debe mostrar >40% en comida)
SELECT 
    '📊 Por categorías:' as info,
    category_name,
    SUM(amount) as total,
    COUNT(*) as transacciones,
    ROUND((SUM(amount) * 100.0 / (
        SELECT SUM(amount) FROM public.transactions 
        WHERE user_id = 'TU-USER-ID-AQUI' 
        AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
    )), 1) as porcentaje
FROM public.transactions 
WHERE user_id = 'TU-USER-ID-AQUI' 
AND transaction_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY category_name 
ORDER BY porcentaje DESC;

-- Ver comparación mensual (para Loss Aversion)
SELECT 
    '📈 Comparación mensual:' as info,
    TO_CHAR(transaction_date, 'Mon YYYY') as mes,
    SUM(amount) as total_mes
FROM public.transactions 
WHERE user_id = 'TU-USER-ID-AQUI'
AND transaction_date >= CURRENT_DATE - INTERVAL '60 days' 
GROUP BY TO_CHAR(transaction_date, 'Mon YYYY'), TO_CHAR(transaction_date, 'YYYY-MM')
ORDER BY TO_CHAR(transaction_date, 'YYYY-MM') DESC;

-- RESULTADO ESPERADO:
-- ✅ Mental Accounting: ~65-70% en "Comida y Bebidas" 
-- ✅ Present Bias: 8 transacciones totales
-- ✅ Loss Aversion: Este mes ~$10,300 vs mes pasado ~$1,900 = ~442% aumento

SELECT '🎉 ¡Ahora ve a la app, refresh analytics y deberías ver los 3 insights!' as instructions;