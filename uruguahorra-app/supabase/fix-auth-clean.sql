-- ============================================
-- LIMPIEZA COMPLETA Y RECREACIÓN DE POLÍTICAS RLS
-- ============================================
-- Este script elimina TODAS las políticas existentes y las recrea correctamente

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE LA TABLA users
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
    END LOOP;
END $$;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE LA TABLA goals
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'goals'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.goals', pol.policyname);
    END LOOP;
END $$;

-- 3. Crear función mejorada para el trigger (con SECURITY DEFINER)
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
EXCEPTION 
    WHEN OTHERS THEN
        RAISE LOG 'Error creando perfil para usuario %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- 4. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. CREAR POLÍTICAS NUEVAS Y SIMPLES PARA users
-- Política 1: El sistema puede crear perfiles (para el trigger)
CREATE POLICY "allow_system_insert_users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Política 2: Los usuarios pueden ver su propio perfil
CREATE POLICY "allow_users_view_own" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

-- Política 3: Los usuarios pueden actualizar su propio perfil
CREATE POLICY "allow_users_update_own" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. CREAR POLÍTICAS NUEVAS PARA goals
-- Política 1: Los usuarios pueden crear sus propias metas
CREATE POLICY "allow_users_insert_goals" 
ON public.goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Política 2: Los usuarios pueden ver sus propias metas
CREATE POLICY "allow_users_view_goals" 
ON public.goals 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política 3: Los usuarios pueden actualizar sus propias metas
CREATE POLICY "allow_users_update_goals" 
ON public.goals 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política 4: Los usuarios pueden eliminar sus propias metas
CREATE POLICY "allow_users_delete_goals" 
ON public.goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Sincronizar usuarios existentes que no tengan perfil
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

-- 8. Verificar que las políticas se crearon correctamente
SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'goals')
ORDER BY tablename, policyname;

-- 9. Verificar usuarios sincronizados
SELECT 
    'Total usuarios en auth.users' as descripcion,
    COUNT(*) as cantidad
FROM auth.users
UNION ALL
SELECT 
    'Total usuarios en public.users' as descripcion,
    COUNT(*) as cantidad
FROM public.users;

-- 10. Mensaje final
SELECT '✅ Políticas RLS limpiadas y recreadas correctamente. Intenta registrarte de nuevo.' as mensaje;