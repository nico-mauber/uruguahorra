-- ============================================
-- DESACTIVAR RLS Y POLÍTICAS EN TABLA USERS
-- ============================================
-- ADVERTENCIA: Esto desactiva la seguridad a nivel de fila
-- Solo usar en desarrollo o si realmente es necesario

-- 1. Eliminar TODAS las políticas existentes en la tabla users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can create initial profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users cannot delete profiles" ON public.users;
DROP POLICY IF EXISTS "System can create user profiles" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;

-- 2. DESACTIVAR RLS completamente en la tabla users
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 3. Verificar que RLS esté desactivado
DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE relname = 'users' 
    AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF rls_enabled THEN
        RAISE WARNING 'RLS todavía está activo en la tabla users';
    ELSE
        RAISE NOTICE 'RLS desactivado exitosamente en la tabla users';
    END IF;
END $$;

-- 4. Mantener el trigger funcionando (si existe)
-- El trigger seguirá creando automáticamente los perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        RAISE LOG 'Error creando perfil para usuario %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- Asegurar que el trigger esté activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Mensaje de confirmación
SELECT 'RLS DESACTIVADO en tabla users. ADVERTENCIA: Cualquier usuario autenticado puede ahora leer/escribir todos los registros.' as mensaje;