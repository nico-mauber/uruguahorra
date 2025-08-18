-- Script para configurar correctamente las políticas RLS de la tabla goals
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar que la tabla goals existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'goals'
) as goals_table_exists;

-- 2. Habilitar RLS en la tabla goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 3. Eliminar políticas existentes para recrearlas
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can create own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Service role bypass" ON public.goals;

-- 4. Crear políticas nuevas y más permisivas

-- Política para el service role (usado por triggers y funciones)
CREATE POLICY "Service role bypass" 
    ON public.goals
    FOR ALL 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Política para que los usuarios vean sus propias metas
CREATE POLICY "Users can view own goals" 
    ON public.goals 
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Política para que los usuarios creen sus propias metas
CREATE POLICY "Users can create own goals" 
    ON public.goals 
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios actualicen sus propias metas  
CREATE POLICY "Users can update own goals" 
    ON public.goals 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios eliminen sus propias metas
CREATE POLICY "Users can delete own goals" 
    ON public.goals 
    FOR DELETE 
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. Verificar las políticas creadas
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'goals'
ORDER BY policyname;

-- 6. Verificar que RLS está habilitado
SELECT 
    tablename,
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'goals';

-- 7. Test: Intenta insertar una meta de prueba (reemplaza el user_id con uno real)
-- Este es solo un ejemplo, no ejecutar sin cambiar el user_id
/*
INSERT INTO public.goals (
    user_id,
    name,
    target_amount,
    target_date,
    saved_amount,
    is_active
) VALUES (
    '61ebe0f5-c1ef-4f0f-9460-dba1f033eeea', -- Reemplazar con un user_id real
    'Test Goal desde SQL',
    1000,
    '2024-12-31',
    0,
    true
);
*/

-- 8. Mensaje de confirmación
SELECT 'Políticas RLS configuradas correctamente para la tabla goals' as mensaje;