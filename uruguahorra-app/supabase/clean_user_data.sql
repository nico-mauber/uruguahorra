-- ============================================
-- URUGUAHORRA - CLEAN USER DATA SCRIPT
-- ============================================
-- Script para limpiar todos los datos de usuarios
-- ADVERTENCIA: Este script eliminará TODOS los datos de usuarios
-- Úsalo con precaución, preferiblemente en ambientes de desarrollo/testing
-- ============================================

-- ============================================
-- VERIFICACIÓN DE SEGURIDAD
-- ============================================
-- Descomenta la siguiente línea para confirmar que quieres ejecutar este script
-- SET session_replication_role = 'replica'; -- Esto desactiva temporalmente los triggers

DO $$
BEGIN
    RAISE NOTICE '⚠️  ADVERTENCIA: Este script eliminará TODOS los datos de usuarios';
    RAISE NOTICE '⚠️  Asegúrate de tener un respaldo antes de continuar';
    
    -- Pausa de seguridad (descomenta para activar)
    -- PERFORM pg_sleep(5);
    
    RAISE NOTICE '🔄 Iniciando limpieza de datos...';
END
$$;

-- ============================================
-- PASO 1: DESACTIVAR TEMPORALMENTE LAS RESTRICCIONES
-- ============================================
-- Esto permite eliminar datos sin problemas de foreign keys
BEGIN;

-- ============================================
-- PASO 2: LIMPIAR DATOS EN ORDEN INVERSO DE DEPENDENCIAS
-- ============================================

-- Limpiar tablas de auditoría y logs
DO $$
BEGIN
    -- Audit logs
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        DELETE FROM public.audit_logs;
        RAISE NOTICE '✓ Limpiados: audit_logs';
    END IF;
    
    -- Paywall events
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'paywall_events') THEN
        DELETE FROM public.paywall_events;
        RAISE NOTICE '✓ Limpiados: paywall_events';
    END IF;
END
$$;

-- Limpiar datos de gamificación
DO $$
BEGIN
    -- User quest progress
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_quest_progress') THEN
        DELETE FROM public.user_quest_progress;
        RAISE NOTICE '✓ Limpiados: user_quest_progress';
    END IF;
    
    -- Weekly quests (opcional - mantener si quieres conservar las misiones)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'weekly_quests') THEN
        -- DELETE FROM public.weekly_quests; -- Descomenta si quieres eliminar las misiones
        RAISE NOTICE '⚠️  weekly_quests: No eliminado (contiene configuración del sistema)';
    END IF;
    
    -- User streaks
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_streaks') THEN
        DELETE FROM public.user_streaks;
        RAISE NOTICE '✓ Limpiados: user_streaks';
    END IF;
    
    -- User XP log
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_xp_log') THEN
        DELETE FROM public.user_xp_log;
        RAISE NOTICE '✓ Limpiados: user_xp_log';
    END IF;
END
$$;

-- Limpiar datos de suscripciones
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        DELETE FROM public.subscriptions;
        RAISE NOTICE '✓ Limpiados: subscriptions';
    END IF;
END
$$;

-- Limpiar datos de progreso educativo
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_progress') THEN
        DELETE FROM public.user_progress;
        RAISE NOTICE '✓ Limpiados: user_progress';
    END IF;
    
    -- Learnings (opcional - mantener si quieres conservar el contenido educativo)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'learnings') THEN
        -- DELETE FROM public.learnings; -- Descomenta si quieres eliminar el contenido
        RAISE NOTICE '⚠️  learnings: No eliminado (contiene contenido del sistema)';
    END IF;
END
$$;

-- Limpiar datos de transacciones
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'transactions_raw') THEN
        DELETE FROM public.transactions_raw;
        RAISE NOTICE '✓ Limpiados: transactions_raw';
    END IF;
END
$$;

-- Limpiar datos de squads
DO $$
BEGIN
    -- Squad members
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'squad_members') THEN
        DELETE FROM public.squad_members;
        RAISE NOTICE '✓ Limpiados: squad_members';
    END IF;
    
    -- Squads
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'squads') THEN
        DELETE FROM public.squads;
        RAISE NOTICE '✓ Limpiados: squads';
    END IF;
END
$$;

-- Limpiar datos de challenges
DO $$
BEGIN
    -- User challenges
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_challenges') THEN
        DELETE FROM public.user_challenges;
        RAISE NOTICE '✓ Limpiados: user_challenges';
    END IF;
    
    -- Challenges (opcional - mantener si quieres conservar los desafíos del sistema)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'challenges') THEN
        -- DELETE FROM public.challenges; -- Descomenta si quieres eliminar los desafíos
        RAISE NOTICE '⚠️  challenges: No eliminado (contiene configuración del sistema)';
    END IF;
END
$$;

-- Limpiar datos de metas y contribuciones
DO $$
BEGIN
    -- Micro contributions
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'micro_contributions') THEN
        DELETE FROM public.micro_contributions;
        RAISE NOTICE '✓ Limpiados: micro_contributions';
    END IF;
    
    -- Goals
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'goals') THEN
        DELETE FROM public.goals;
        RAISE NOTICE '✓ Limpiados: goals';
    END IF;
END
$$;

-- Limpiar usuarios (tabla principal)
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
        SELECT COUNT(*) INTO user_count FROM public.users;
        DELETE FROM public.users;
        RAISE NOTICE '✓ Limpiados: users (% registros eliminados)', user_count;
    END IF;
END
$$;

-- ============================================
-- PASO 3: LIMPIAR USUARIOS DE AUTENTICACIÓN (OPCIONAL)
-- ============================================
-- ADVERTENCIA: Esto eliminará las cuentas de autenticación
-- Solo descomenta si realmente quieres eliminar las cuentas de auth

/*
DO $$
DECLARE
    auth_count INTEGER;
BEGIN
    -- Contar usuarios en auth.users
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    
    -- Eliminar todos los usuarios de auth
    DELETE FROM auth.users;
    
    RAISE NOTICE '✓ Limpiados: auth.users (% cuentas eliminadas)', auth_count;
    RAISE NOTICE '⚠️  IMPORTANTE: Las cuentas de autenticación han sido eliminadas';
END
$$;
*/

-- ============================================
-- PASO 4: RESETEAR SECUENCIAS Y CONTADORES (OPCIONAL)
-- ============================================
-- Resetea los contadores auto-incrementales si existen

DO $$
BEGIN
    -- Resetear secuencias si las hay
    -- ALTER SEQUENCE IF EXISTS table_name_id_seq RESTART WITH 1;
    RAISE NOTICE '📊 Secuencias reseteadas (si aplica)';
END
$$;

-- ============================================
-- PASO 5: VERIFICACIÓN Y RESUMEN
-- ============================================

DO $$
DECLARE
    remaining_users INTEGER;
    remaining_goals INTEGER;
    remaining_contributions INTEGER;
BEGIN
    -- Verificar que la limpieza fue exitosa
    SELECT COUNT(*) INTO remaining_users FROM public.users;
    SELECT COUNT(*) INTO remaining_goals FROM public.goals;
    SELECT COUNT(*) INTO remaining_contributions FROM public.micro_contributions;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 RESUMEN DE LIMPIEZA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Usuarios restantes: %', remaining_users;
    RAISE NOTICE 'Metas restantes: %', remaining_goals;
    RAISE NOTICE 'Contribuciones restantes: %', remaining_contributions;
    
    IF remaining_users = 0 AND remaining_goals = 0 AND remaining_contributions = 0 THEN
        RAISE NOTICE '✅ Limpieza completada exitosamente';
    ELSE
        RAISE WARNING '⚠️  Algunos datos no fueron eliminados completamente';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '💡 NOTA: Los datos del sistema (challenges, learnings, weekly_quests) se mantuvieron intactos';
    RAISE NOTICE '💡 Para eliminarlos, descomenta las líneas correspondientes en el script';
END
$$;

-- ============================================
-- PASO 6: CONFIRMAR TRANSACCIÓN
-- ============================================
COMMIT;

-- ============================================
-- SCRIPT ADICIONAL: LIMPIEZA SELECTIVA
-- ============================================
-- Usa estos comandos para limpiar usuarios específicos

-- Eliminar un usuario específico y todos sus datos relacionados (cascada)
-- DELETE FROM public.users WHERE email = 'usuario@ejemplo.com';

-- Eliminar usuarios inactivos (sin actividad en los últimos 6 meses)
-- DELETE FROM public.users 
-- WHERE id IN (
--     SELECT u.id 
--     FROM public.users u
--     LEFT JOIN public.user_xp_log xl ON u.id = xl.user_id
--     WHERE u.last_activity_date < CURRENT_DATE - INTERVAL '6 months'
--     OR (u.last_activity_date IS NULL AND u.created_at < NOW() - INTERVAL '6 months')
--     GROUP BY u.id
--     HAVING MAX(xl.created_at) < NOW() - INTERVAL '6 months' OR MAX(xl.created_at) IS NULL
-- );

-- Eliminar usuarios de prueba (por patrón de email)
-- DELETE FROM public.users WHERE email LIKE '%@test.com' OR email LIKE '%@example.com';

-- Eliminar metas completadas hace más de 1 año
-- DELETE FROM public.goals 
-- WHERE completed_at < NOW() - INTERVAL '1 year';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================