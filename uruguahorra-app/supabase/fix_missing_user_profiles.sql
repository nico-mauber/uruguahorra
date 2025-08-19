-- ============================================
-- DIAGNÓSTICO Y CORRECCIÓN DE PERFILES FALTANTES
-- ============================================
-- Soluciona el error 23503 (foreign key constraint violation)
-- cuando usuarios autenticados no tienen perfil en public.users
-- ============================================

-- Paso 1: DIAGNÓSTICO - Identificar usuarios sin perfil
SELECT 
    '🔍 DIAGNÓSTICO DE USUARIOS SIN PERFIL' as info;

SELECT 
    COUNT(*) as usuarios_sin_perfil,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Todos los usuarios tienen perfil'
        ELSE '⚠️ Hay usuarios sin perfil - necesitan corrección'
    END as estado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- Mostrar detalles de usuarios sin perfil
SELECT 
    '📋 USUARIOS SIN PERFIL:' as info,
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    au.raw_user_meta_data
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Paso 2: CORRECCIÓN - Crear perfiles faltantes
INSERT INTO public.users (
    id,
    email,
    country,
    currency,
    premium,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    last_activity_date,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'country', 'UY'),
    COALESCE(au.raw_user_meta_data->>'currency', 'UYU'),
    false,
    0,
    1,
    0,
    0,
    CURRENT_DATE,
    au.created_at,
    NOW()
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Paso 3: VERIFICACIÓN POST-CORRECCIÓN
SELECT 
    '✅ VERIFICACIÓN FINAL:' as info;

SELECT 
    COUNT(au.id) as total_usuarios_auth,
    COUNT(pu.id) as total_usuarios_perfil,
    COUNT(au.id) - COUNT(pu.id) as diferencia,
    CASE 
        WHEN COUNT(au.id) = COUNT(pu.id) THEN '✅ PERFECTO: Todos sincronizados'
        ELSE '⚠️ AÚN HAY DIFERENCIAS'
    END as resultado
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;

-- Paso 4: VERIFICAR TRIGGER
SELECT 
    '🔧 VERIFICACIÓN DE TRIGGER:' as info;

SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Paso 5: VERIFICAR FUNCIÓN DEL TRIGGER
SELECT 
    '⚙️ VERIFICACIÓN DE FUNCIÓN:' as info;

SELECT 
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Paso 6: TEST FINAL
DO $$
DECLARE
    test_user_count INTEGER;
    auth_user_count INTEGER;
    profile_user_count INTEGER;
BEGIN
    -- Contar usuarios en auth
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    
    -- Contar usuarios con perfil
    SELECT COUNT(*) INTO profile_user_count FROM public.users;
    
    -- Contar usuarios sin perfil
    SELECT COUNT(*) INTO test_user_count 
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;
    
    RAISE NOTICE '📊 RESUMEN FINAL:';
    RAISE NOTICE '- Usuarios en auth.users: %', auth_user_count;
    RAISE NOTICE '- Usuarios con perfil: %', profile_user_count;
    RAISE NOTICE '- Usuarios sin perfil: %', test_user_count;
    
    IF test_user_count = 0 THEN
        RAISE NOTICE '🎉 ¡PROBLEMA SOLUCIONADO! Todos los usuarios tienen perfil';
    ELSE
        RAISE NOTICE '❌ Aún hay % usuarios sin perfil', test_user_count;
    END IF;
END $$;

-- Mensaje final
SELECT 
    '🚀 CORRECCIÓN DE PERFILES COMPLETADA' as status,
    'Ahora deberías poder crear metas sin errores de foreign key' as mensaje,
    NOW() as ejecutado_en;