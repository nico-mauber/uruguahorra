-- Script para verificar y corregir la configuración de Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar que la tabla users existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'users'
) as users_table_exists;

-- 2. Verificar que la tabla goals existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
) as goals_table_exists;

-- 3. Crear trigger para crear perfil automáticamente al registrar usuario
-- Este trigger crea un registro en la tabla users cuando se registra un nuevo usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id, email, country, currency, premium)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'country', 'UY'),
        COALESCE(new.raw_user_meta_data->>'currency', 'UYU'),
        false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe y recrearlo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Habilitar RLS en las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 5. Eliminar políticas existentes y recrearlas (para evitar duplicados)
-- Políticas para la tabla users
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;

CREATE POLICY "Users can view own profile" 
    ON public.users FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.users FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only" 
    ON public.users FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- 6. Políticas para la tabla goals
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;

CREATE POLICY "Users can view own goals" 
    ON public.goals FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" 
    ON public.goals FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" 
    ON public.goals FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" 
    ON public.goals FOR DELETE 
    USING (auth.uid() = user_id);

-- 7. Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'goals');

-- 8. Listar todas las políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('users', 'goals')
ORDER BY tablename, policyname;

-- 9. Verificar si el trigger existe
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth'
AND trigger_name = 'on_auth_user_created';