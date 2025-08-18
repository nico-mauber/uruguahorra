-- ============================================
-- FIX PARA PROBLEMA DE CREACIÓN DE USUARIOS
-- ============================================
-- Este script soluciona el problema de RLS al crear usuarios nuevos

-- 1. Primero, eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.users;

-- 2. Crear función mejorada para el trigger
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

-- 3. Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 4. Crear políticas correctas para users
-- Permitir que el trigger (con SECURITY DEFINER) pueda insertar
CREATE POLICY "System can create user profiles" 
ON public.users FOR INSERT 
WITH CHECK (true);

-- Permitir que los usuarios vean su propio perfil
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- Permitir que los usuarios actualicen su propio perfil
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Verificar y sincronizar usuarios existentes
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

-- 6. Verificar políticas de goals también
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;

CREATE POLICY "Users can create own goals" 
ON public.goals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own goals" 
ON public.goals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" 
ON public.goals FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" 
ON public.goals FOR DELETE 
USING (auth.uid() = user_id);

-- 7. Mensaje de confirmación
SELECT 'Políticas RLS y trigger actualizados correctamente. Los nuevos usuarios deberían poder registrarse sin problemas.' as mensaje;