-- Script para diagnosticar y solucionar problemas con la tabla users
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si hay usuarios en auth.users
SELECT 
    id,
    email,
    created_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Verificar si hay registros en public.users
SELECT 
    id,
    email,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar el estado de RLS
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- 4. TEMPORALMENTE deshabilitar RLS para verificar si ese es el problema
-- IMPORTANTE: Solo para debugging, volver a habilitar después
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 5. Crear función mejorada para handle_new_user que registre logs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Intentar insertar el nuevo usuario
    INSERT INTO public.users (id, email, country, currency, premium, created_at, updated_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'country', 'UY'),
        COALESCE(new.raw_user_meta_data->>'currency', 'UYU'),
        false,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
    
    -- Log para debugging (opcional, comentar en producción)
    RAISE NOTICE 'Usuario creado/actualizado: %', new.id;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log del error
        RAISE WARNING 'Error en handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Si hay usuarios en auth.users pero no en public.users, sincronizarlos
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
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 8. Verificar cuántos registros se sincronizaron
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'public.users' as tabla,
    COUNT(*) as total
FROM public.users;

-- 9. Re-habilitar RLS con políticas más permisivas temporalmente
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- Crear política permisiva para service role (el trigger usa este rol)
CREATE POLICY "Service role can do anything" 
    ON public.users 
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Política para que los usuarios vean su perfil
CREATE POLICY "Users can view own profile" 
    ON public.users 
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- Política para que los usuarios actualicen su perfil
CREATE POLICY "Users can update own profile" 
    ON public.users 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para inserción (necesaria para el código de la app)
CREATE POLICY "Users can insert own profile" 
    ON public.users 
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 10. Verificar las políticas creadas
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users'
ORDER BY policyname;