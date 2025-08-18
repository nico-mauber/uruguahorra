-- Script para insertar manualmente el usuario en la tabla public.users
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Primero verificar si el usuario ya existe en public.users
SELECT * FROM public.users WHERE id = '61ebe0f5-c1ef-4f0f-9460-dba1f033eeea';

-- 2. Si no existe, deshabilitamos temporalmente RLS para poder insertar
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Insertar el usuario
INSERT INTO public.users (id, email, country, currency, premium, created_at, updated_at)
VALUES (
    '61ebe0f5-c1ef-4f0f-9460-dba1f033eeea',
    'nicolasmauber2002@gmail.com',
    'UY',
    'UYU',
    false,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- 4. Verificar que se insertó correctamente
SELECT * FROM public.users WHERE id = '61ebe0f5-c1ef-4f0f-9460-dba1f033eeea';

-- 5. Re-habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Ahora configurar las políticas RLS correctamente
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- Crear políticas que funcionen correctamente
-- Política para el service role (usado por triggers y funciones)
CREATE POLICY "Service role bypass" 
    ON public.users
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Política para que los usuarios autenticados vean su propio perfil
CREATE POLICY "Users can view own profile" 
    ON public.users 
    FOR SELECT 
    USING (auth.uid() = id);

-- Política para que los usuarios autenticados actualicen su propio perfil
CREATE POLICY "Users can update own profile" 
    ON public.users 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para que los usuarios autenticados puedan insertar su propio perfil
CREATE POLICY "Users can insert own profile" 
    ON public.users 
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 7. Verificar las políticas
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'users';

-- 8. Probar que el usuario puede acceder a su propio perfil
-- Este query simula lo que hace la aplicación
SELECT * FROM public.users 
WHERE id = '61ebe0f5-c1ef-4f0f-9460-dba1f033eeea';

-- 9. Verificar el total de registros en ambas tablas
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'public.users' as tabla,
    COUNT(*) as total
FROM public.users;

-- 10. IMPORTANTE: Asegurar que el trigger esté funcionando para futuros usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, country, currency, premium, created_at, updated_at)
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
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 11. Mensaje final
SELECT 'Usuario insertado y políticas configuradas correctamente!' as mensaje;