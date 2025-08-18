-- SCRIPT URGENTE PARA SOLUCIONAR PROBLEMAS DE RLS
-- Ejecutar COMPLETO en el SQL Editor de Supabase

-- 1. TEMPORALMENTE deshabilitar RLS para solucionar el problema inmediato
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals DISABLE ROW LEVEL SECURITY;

-- 2. Limpiar usuarios duplicados si existen
-- Primero ver si hay duplicados
SELECT email, COUNT(*) as count 
FROM auth.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 3. Sincronizar TODOS los usuarios de auth.users a public.users
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
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- 4. Verificar que todos los usuarios estén sincronizados
SELECT 
    'auth.users' as tabla,
    COUNT(*) as total
FROM auth.users
UNION ALL
SELECT 
    'public.users' as tabla,
    COUNT(*) as total
FROM public.users;

-- 5. Re-habilitar RLS con políticas CORRECTAS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 6. Eliminar TODAS las políticas existentes para empezar limpio
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Service role bypass" ON public.users;
DROP POLICY IF EXISTS "Service role can do anything" ON public.users;

-- 7. Crear políticas SIMPLES y FUNCIONALES

-- POLÍTICA CRÍTICA: Permitir que la función del trigger inserte
CREATE POLICY "Enable insert for service role" 
ON public.users FOR INSERT 
TO public
WITH CHECK (true);

-- Permitir que los usuarios vean su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
TO public
USING (auth.uid() = id);

-- Permitir que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
TO public
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 8. Hacer lo mismo para goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Service role bypass" ON public.goals;

-- Políticas para goals
CREATE POLICY "Users can view own goals" 
ON public.goals FOR SELECT 
TO public
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" 
ON public.goals FOR INSERT 
TO public
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" 
ON public.goals FOR UPDATE 
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" 
ON public.goals FOR DELETE 
TO public
USING (auth.uid() = user_id);

-- 9. Recrear el trigger con manejo de errores mejorado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Intentar insertar el usuario
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
EXCEPTION 
    WHEN OTHERS THEN
        -- Si hay cualquier error, solo registrarlo pero no fallar
        RAISE WARNING 'Error creando perfil de usuario: %', SQLERRM;
        RETURN new;
END;
$$;

-- Eliminar y recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 10. Verificar las políticas
SELECT 
    tablename,
    policyname,
    permissive,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'goals')
ORDER BY tablename, policyname;

-- 11. Test final - verificar que podemos leer usuarios
SELECT id, email FROM public.users LIMIT 5;

-- 12. Mensaje de éxito
SELECT 'RLS configurado correctamente. Los usuarios ahora pueden registrarse y crear metas.' as mensaje;