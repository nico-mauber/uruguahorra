-- ============================================
-- CORRECCIÓN ESQUEMA DE GOALS
-- ============================================
-- Agregar columnas faltantes que el código necesita
-- ============================================

-- Paso 1: Agregar columnas faltantes a la tabla goals
DO $$
BEGIN
    -- Agregar columna color si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'goals' 
            AND column_name = 'color'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN color TEXT DEFAULT '#3B82F6';
        RAISE NOTICE 'Columna color agregada a goals';
    END IF;

    -- Agregar columna icon si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'goals' 
            AND column_name = 'icon'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN icon TEXT DEFAULT 'shield';
        RAISE NOTICE 'Columna icon agregada a goals';
    END IF;

    -- Agregar columna is_active si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'goals' 
            AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Columna is_active agregada a goals';
    END IF;

    -- Agregar columna saved_amount si no existe (sinonimo de current_amount)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'goals' 
            AND column_name = 'saved_amount'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN saved_amount DECIMAL(15,2) DEFAULT 0 CHECK (saved_amount >= 0);
        RAISE NOTICE 'Columna saved_amount agregada a goals';
    END IF;

    -- Agregar columna target_date si no existe (diferente de deadline)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
            AND table_name = 'goals' 
            AND column_name = 'target_date'
    ) THEN
        ALTER TABLE public.goals 
        ADD COLUMN target_date DATE;
        RAISE NOTICE 'Columna target_date agregada a goals';
    END IF;
END $$;

-- Paso 2: Actualizar valores por defecto para metas existentes
UPDATE public.goals 
SET 
    color = CASE 
        WHEN category = 'travel' THEN '#10B981'
        WHEN category = 'debt' THEN '#EF4444'
        WHEN category = 'purchase' THEN '#8B5CF6'
        ELSE '#3B82F6'
    END,
    icon = CASE 
        WHEN category = 'travel' THEN 'airplane'
        WHEN category = 'debt' THEN 'card'
        WHEN category = 'purchase' THEN 'cart'
        ELSE 'shield'
    END,
    is_active = COALESCE(is_active, true),
    saved_amount = COALESCE(current_amount, 0),
    target_date = COALESCE(deadline, CURRENT_DATE + INTERVAL '6 months')
WHERE color IS NULL OR icon IS NULL OR is_active IS NULL OR saved_amount IS NULL;

-- Paso 3: Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_goals_is_active ON public.goals(is_active);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_color ON public.goals(color);

-- Paso 4: Actualizar la función de progreso de metas para manejar saved_amount
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar tanto current_amount como saved_amount
    UPDATE public.goals 
    SET 
        current_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.micro_contributions 
            WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
        ),
        saved_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM public.micro_contributions 
            WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id)
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
    
    -- Marcar como completada si se alcanzó el objetivo
    UPDATE public.goals 
    SET 
        is_completed = true,
        completed_at = NOW()
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id)
        AND current_amount >= target_amount 
        AND is_completed = false;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Paso 5: Verificar la estructura actualizada
SELECT 
    'ESTRUCTURA ACTUALIZADA DE GOALS:' as info,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'goals'
ORDER BY ordinal_position;

-- Paso 6: Test de inserción con las nuevas columnas
DO $$
DECLARE
    test_user_id UUID;
    test_goal_id UUID;
BEGIN
    -- Obtener un usuario para el test
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insertar meta de prueba con todas las columnas
        INSERT INTO public.goals (
            user_id, 
            name, 
            target_amount, 
            current_amount,
            saved_amount,
            category,
            color,
            icon,
            is_active,
            target_date
        ) VALUES (
            test_user_id, 
            'Test Meta Completa', 
            5000.00, 
            0,
            0,
            'travel',
            '#10B981',
            'airplane',
            true,
            CURRENT_DATE + INTERVAL '6 months'
        ) RETURNING id INTO test_goal_id;
        
        -- Limpiar datos de prueba
        DELETE FROM public.goals WHERE id = test_goal_id;
        
        RAISE NOTICE '✅ TEST EXITOSO: Todas las columnas funcionan correctamente';
    ELSE
        RAISE NOTICE '⚠️ No hay usuarios para el test';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST FALLIDO: %', SQLERRM;
END $$;

-- Mensaje final
SELECT 'ESQUEMA DE GOALS CORREGIDO - Todas las columnas necesarias están disponibles' as resultado;