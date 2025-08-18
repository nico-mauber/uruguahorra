-- ============================================
-- SOLUCIÓN COMPLETA PARA PROBLEMA DE AUTENTICACIÓN
-- ============================================
-- Este script configura correctamente el trigger y las políticas RLS
-- para evitar el error 401 al crear usuarios nuevos

-- 1. Eliminar políticas conflictivas existentes
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "System can create user profiles" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;

-- 2. Crear función mejorada para el trigger con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insertar el nuevo perfil de usuario
    INSERT INTO public.users (
        id, 
        email, 
        country, 
        currency, 
        premium, 
        created_at, 
        updated_at
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'country', 'UY'),
        COALESCE(new.raw_user_meta_data->>'currency', 'UYU'),
        false,
        new.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN new;
EXCEPTION 
    WHEN OTHERS THEN
        -- Registrar el error pero no fallar la creación del usuario
        RAISE LOG 'Error creando perfil para usuario %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- 3. Asegurar que el trigger esté correctamente configurado
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Configurar políticas RLS correctas para la tabla users

-- Política para SELECT: Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Política para INSERT: Permitir que los usuarios autenticados creen su propio perfil
-- Esta política es más permisiva para permitir la creación inicial
DROP POLICY IF EXISTS "Users can create initial profile" ON public.users;
CREATE POLICY "Users can create initial profile" 
ON public.users FOR INSERT 
WITH CHECK (
    -- Permitir si el ID coincide con el usuario autenticado
    auth.uid() = id 
    OR 
    -- O si no hay usuario autenticado (para el trigger con SECURITY DEFINER)
    auth.uid() IS NULL
);

-- Política para UPDATE: Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política para DELETE: Los usuarios NO pueden eliminar su perfil
-- (por seguridad, solo se elimina cuando se elimina la cuenta de auth)
DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.users;

-- 5. Sincronizar usuarios existentes que no tengan perfil
INSERT INTO public.users (id, email, country, currency, premium, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'country', 'UY'),
    COALESCE(au.raw_user_meta_data->>'currency', 'UYU'),
    false,
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 6. Verificar que todo esté configurado correctamente
DO $$
DECLARE
    trigger_exists boolean;
    policies_count integer;
BEGIN
    -- Verificar que el trigger existe
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    -- Contar políticas activas
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies 
    WHERE tablename = 'users' AND schemaname = 'public';
    
    -- Mostrar resultado
    RAISE NOTICE 'Configuración completada:';
    RAISE NOTICE '- Trigger configurado: %', trigger_exists;
    RAISE NOTICE '- Políticas RLS activas: %', policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANTE: Ejecute este script en el SQL Editor de Supabase';
    RAISE NOTICE 'El trigger creará automáticamente el perfil cuando se registre un usuario nuevo';
END $$;

-- Mensaje final
SELECT 'Script ejecutado exitosamente. El trigger y las políticas RLS están configurados.' as mensaje;