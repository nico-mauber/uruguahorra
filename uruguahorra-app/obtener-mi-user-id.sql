-- ============================================
-- OBTENER TU USER ID PARA TESTING
-- ============================================
-- Ejecuta este script para encontrar tu user_id fácilmente
-- ============================================

-- Opción 1: Si sabes tu email
SELECT 
    '👤 Tu User ID:' as info,
    id as user_id, 
    email,
    created_at
FROM auth.users 
WHERE email = 'tu-email-aqui@ejemplo.com'  -- CAMBIA POR TU EMAIL REAL
ORDER BY created_at DESC;

-- Opción 2: Ver todos los usuarios (si hay pocos)
SELECT 
    '👥 Todos los usuarios:' as info,
    id as user_id, 
    email,
    created_at,
    email_confirmed_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Opción 3: Buscar por parte del email
SELECT 
    '🔍 Buscar usuario:' as info,
    id as user_id, 
    email,
    created_at
FROM auth.users 
WHERE email ILIKE '%test%'  -- CAMBIA 'test' por parte de tu email
   OR email ILIKE '%gmail%'  -- O cambia por tu dominio
   OR email ILIKE '%outlook%'
ORDER BY created_at DESC;

-- Opción 4: Ver usuario que tiene más transacciones (probablemente eres tú)
SELECT 
    '💰 Usuario con más actividad:' as info,
    u.id as user_id,
    u.email,
    COUNT(t.id) as total_transactions,
    SUM(t.amount) as total_amount
FROM auth.users u
LEFT JOIN public.transactions t ON u.id = t.user_id
WHERE u.email IS NOT NULL
GROUP BY u.id, u.email
ORDER BY COUNT(t.id) DESC, SUM(t.amount) DESC
LIMIT 5;

-- IMPORTANTE: 
-- Una vez que encuentres tu user_id, cópialo y úsalo en:
-- - crear-datos-prueba-insights.sql
-- - get_analytics_stats('tu-user-id-aqui')

SELECT '📋 PRÓXIMOS PASOS:' as instructions;
SELECT '1. Copia tu user_id de arriba' as step_1;
SELECT '2. Edita crear-datos-prueba-insights.sql' as step_2;  
SELECT '3. Reemplaza TU-USER-ID-AQUI con tu ID real' as step_3;
SELECT '4. Ejecuta ese script completo' as step_4;
SELECT '5. Ve a la app y refresh analytics' as step_5;