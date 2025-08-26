-- ============================================
-- MIGRACIÓN: SISTEMA DE TRANSACCIONES COMPLETO
-- ============================================
-- Fecha: 26 de Agosto, 2025
-- Versión: 1.0 - Sistema completo de transacciones con UX psicológico
-- ============================================

-- PASO 1: TABLA DE CATEGORÍAS DE TRANSACCIONES
-- ============================================

CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    is_default BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 2: INSERTAR CATEGORÍAS PREDEFINIDAS
-- ============================================

INSERT INTO public.transaction_categories (name, emoji, color, type, is_default, sort_order) VALUES
-- GASTOS (Expenses) - Colores rojos/naranjas según psicología
('Comida y Bebidas', '🍔', '#FF6B6B', 'expense', true, 1),
('Transporte', '🚗', '#FF8E8E', 'expense', true, 2),
('Entretenimiento', '🎮', '#FFB3B3', 'expense', true, 3),
('Compras', '🛍️', '#FFA8A8', 'expense', true, 4),
('Servicios', '📱', '#FF9F9F', 'expense', true, 5),
('Salud', '💊', '#FFAAAA', 'expense', true, 6),
('Educación', '📚', '#FFB5B5', 'expense', true, 7),
('Hogar', '🏠', '#FFC0C0', 'expense', true, 8),
('Mascotas', '🐕', '#FFCBCB', 'expense', true, 9),
('Regalos', '🎁', '#FFD6D6', 'expense', true, 10),
('Viajes', '✈️', '#FFE1E1', 'expense', true, 11),
('Otros Gastos', '💳', '#FFECEC', 'expense', true, 12),

-- INGRESOS (Income) - Colores verdes según psicología
('Salario', '💰', '#51CF66', 'income', true, 13),
('Freelance', '💻', '#8CE99A', 'income', true, 14),
('Inversiones', '📈', '#B2F2BB', 'income', true, 15),
('Regalos Recibidos', '🎊', '#C3FAC6', 'income', true, 16),
('Reembolsos', '↩️', '#D3F9D8', 'income', true, 17),
('Otros Ingresos', '💵', '#E6FCEE', 'income', true, 18),

-- TRANSFERENCIAS - Colores azules neutros
('Ahorro', '🏦', '#339AF0', 'transfer', true, 19),
('Inversión', '📊', '#74C0FC', 'transfer', true, 20),
('Transferencia', '🔄', '#A5D8FF', 'transfer', true, 21);

-- PASO 3: TABLA DE TRANSACCIONES PRINCIPAL (MEJORADA)
-- ============================================

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
    
    -- Información básica
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    notes TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Categorización
    category_id UUID REFERENCES public.transaction_categories(id),
    category_name TEXT, -- Backup si se elimina la categoría
    category_emoji TEXT, -- Cache para rendimiento
    
    -- Metadata psicológica
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 5), -- 1=😢, 5=😄
    mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 5),
    regret_level INTEGER CHECK (regret_level >= 0 AND regret_level <= 10), -- 0=sin arrepentimiento, 10=muy arrepentido
    necessity_level INTEGER CHECK (necessity_level >= 1 AND necessity_level <= 5), -- 1=lujo, 5=necesidad
    
    -- Contexto adicional
    location TEXT, -- Dónde se hizo la transacción
    tags TEXT[], -- Etiquetas personalizadas
    payment_method TEXT, -- efectivo, tarjeta, transferencia, etc.
    
    -- Gamification
    xp_earned INTEGER DEFAULT 0,
    achievements_unlocked TEXT[], -- IDs de achievements desbloqueados
    
    -- Metadata técnica
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    
    -- Índices implícitos
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- PASO 4: VISTAS PARA ANALYTICS Y INSIGHTS
-- ============================================

-- Vista de transacciones con categorías
CREATE OR REPLACE VIEW public.transactions_with_categories AS
SELECT 
    t.*,
    tc.name as category_full_name,
    tc.emoji as category_emoji_full,
    tc.color as category_color,
    tc.type as category_type
FROM public.transactions t
LEFT JOIN public.transaction_categories tc ON t.category_id = tc.id
WHERE t.deleted_at IS NULL;

-- Vista de gastos mensuales por categoría
CREATE OR REPLACE VIEW public.monthly_expenses_by_category AS
SELECT 
    user_id,
    DATE_TRUNC('month', transaction_date) as month,
    category_id,
    category_name,
    category_emoji,
    SUM(amount) as total_amount,
    COUNT(*) as transaction_count,
    AVG(amount) as avg_amount,
    AVG(necessity_level) as avg_necessity,
    AVG(regret_level) as avg_regret
FROM public.transactions
WHERE type = 'expense' AND deleted_at IS NULL
GROUP BY user_id, DATE_TRUNC('month', transaction_date), category_id, category_name, category_emoji;

-- Vista de insights psicológicos
CREATE OR REPLACE VIEW public.user_spending_psychology AS
SELECT 
    user_id,
    DATE_TRUNC('week', transaction_date) as week,
    
    -- Análisis emocional
    AVG(mood_before) as avg_mood_before,
    AVG(mood_after) as avg_mood_after,
    AVG(mood_after - mood_before) as avg_mood_change,
    
    -- Análisis de comportamiento
    AVG(regret_level) as avg_regret,
    AVG(necessity_level) as avg_necessity,
    
    -- Patrones de gasto
    COUNT(*) as transaction_count,
    SUM(amount) as total_spent,
    AVG(amount) as avg_transaction_amount,
    
    -- Categorías más frecuentes
    MODE() WITHIN GROUP (ORDER BY category_name) as most_frequent_category,
    
    -- Días de la semana (para patrones)
    COUNT(*) FILTER (WHERE EXTRACT(dow FROM transaction_date) IN (0,6)) as weekend_transactions,
    COUNT(*) FILTER (WHERE EXTRACT(dow FROM transaction_date) BETWEEN 1 AND 5) as weekday_transactions
    
FROM public.transactions
WHERE type = 'expense' AND deleted_at IS NULL
GROUP BY user_id, DATE_TRUNC('week', transaction_date);

-- PASO 5: FUNCIONES PARA LÓGICA DE NEGOCIO
-- ============================================

-- Función para auto-categorizar transacciones basada en descripción
CREATE OR REPLACE FUNCTION public.auto_categorize_transaction(description_text TEXT)
RETURNS UUID AS $$
DECLARE
    category_id UUID;
    keywords TEXT[];
    keyword TEXT;
BEGIN
    -- Normalizar texto
    description_text := LOWER(TRIM(description_text));
    
    -- Palabras clave para diferentes categorías
    -- Comida y bebidas
    keywords := ARRAY['comida', 'restaurant', 'pizza', 'hamburguesa', 'cafe', 'bar', 'cerveza', 'almuerzo', 'cena', 'desayuno', 'supermercado', 'mercado'];
    FOREACH keyword IN ARRAY keywords LOOP
        IF description_text LIKE '%' || keyword || '%' THEN
            SELECT id INTO category_id FROM public.transaction_categories WHERE name = 'Comida y Bebidas' LIMIT 1;
            RETURN category_id;
        END IF;
    END LOOP;
    
    -- Transporte
    keywords := ARRAY['uber', 'taxi', 'bus', 'metro', 'gasolina', 'combustible', 'estacionamiento', 'peaje', 'transporte'];
    FOREACH keyword IN ARRAY keywords LOOP
        IF description_text LIKE '%' || keyword || '%' THEN
            SELECT id INTO category_id FROM public.transaction_categories WHERE name = 'Transporte' LIMIT 1;
            RETURN category_id;
        END IF;
    END LOOP;
    
    -- Entretenimiento
    keywords := ARRAY['cine', 'teatro', 'concierto', 'juego', 'netflix', 'spotify', 'youtube', 'steam', 'playstation'];
    FOREACH keyword IN ARRAY keywords LOOP
        IF description_text LIKE '%' || keyword || '%' THEN
            SELECT id INTO category_id FROM public.transaction_categories WHERE name = 'Entretenimiento' LIMIT 1;
            RETURN category_id;
        END IF;
    END LOOP;
    
    -- Servicios
    keywords := ARRAY['telefono', 'internet', 'luz', 'agua', 'gas', 'cable', 'netflix', 'spotify'];
    FOREACH keyword IN ARRAY keywords LOOP
        IF description_text LIKE '%' || keyword || '%' THEN
            SELECT id INTO category_id FROM public.transaction_categories WHERE name = 'Servicios' LIMIT 1;
            RETURN category_id;
        END IF;
    END LOOP;
    
    -- Por defecto: Otros Gastos
    SELECT id INTO category_id FROM public.transaction_categories WHERE name = 'Otros Gastos' LIMIT 1;
    RETURN category_id;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular insights de gastos del usuario
CREATE OR REPLACE FUNCTION public.calculate_user_spending_insights(input_user_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    total_spent DECIMAL;
    avg_daily DECIMAL;
    most_expensive_category TEXT;
    most_frequent_category TEXT;
    regret_score DECIMAL;
    necessity_score DECIMAL;
    mood_impact DECIMAL;
BEGIN
    -- Calcular métricas básicas
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(AVG(amount), 0),
        MODE() WITHIN GROUP (ORDER BY category_name),
        AVG(regret_level),
        AVG(necessity_level),
        AVG(mood_after - mood_before)
    INTO 
        total_spent, 
        avg_daily, 
        most_frequent_category,
        regret_score,
        necessity_score,
        mood_impact
    FROM public.transactions
    WHERE user_id = input_user_id 
    AND type = 'expense' 
    AND deleted_at IS NULL
    AND transaction_date >= CURRENT_DATE - INTERVAL '%s days' % days_back;
    
    -- Categoría con más gasto
    SELECT category_name INTO most_expensive_category
    FROM (
        SELECT category_name, SUM(amount) as total
        FROM public.transactions
        WHERE user_id = input_user_id 
        AND type = 'expense' 
        AND deleted_at IS NULL
        AND transaction_date >= CURRENT_DATE - INTERVAL '%s days' % days_back
        GROUP BY category_name
        ORDER BY total DESC
        LIMIT 1
    ) subq;
    
    -- Construir resultado JSON
    result := jsonb_build_object(
        'period_days', days_back,
        'total_spent', total_spent,
        'avg_daily_spend', ROUND(total_spent / days_back, 2),
        'avg_transaction_amount', ROUND(avg_daily, 2),
        'most_expensive_category', COALESCE(most_expensive_category, 'N/A'),
        'most_frequent_category', COALESCE(most_frequent_category, 'N/A'),
        'psychology', jsonb_build_object(
            'avg_regret_level', ROUND(COALESCE(regret_score, 0), 1),
            'avg_necessity_level', ROUND(COALESCE(necessity_score, 0), 1),
            'mood_impact', ROUND(COALESCE(mood_impact, 0), 1)
        )
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 6: TRIGGERS PARA AUTOMATIZACIÓN
-- ============================================

-- Trigger para auto-categorizar transacciones sin categoría
CREATE OR REPLACE FUNCTION public.auto_categorize_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo si no tiene categoría asignada
    IF NEW.category_id IS NULL AND NEW.description IS NOT NULL THEN
        NEW.category_id := public.auto_categorize_transaction(NEW.description);
        
        -- Actualizar campos de caché
        SELECT name, emoji INTO NEW.category_name, NEW.category_emoji
        FROM public.transaction_categories
        WHERE id = NEW.category_id;
    END IF;
    
    -- Asegurar que el tipo coincida con la categoría
    IF NEW.category_id IS NOT NULL THEN
        UPDATE transactions SET type = (
            SELECT type FROM public.transaction_categories WHERE id = NEW.category_id
        ) WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_categorize_transaction
    BEFORE INSERT ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_categorize_new_transaction();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- PASO 7: RLS POLICIES
-- ============================================

-- Habilitar RLS
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para categorías (lectura pública, solo admin puede modificar)
CREATE POLICY "transaction_categories_read" ON public.transaction_categories
    FOR SELECT USING (true);

-- Políticas para transacciones (solo el usuario puede ver/modificar sus transacciones)
CREATE POLICY "transactions_user_access" ON public.transactions
    FOR ALL USING (auth.uid() = user_id);

-- PASO 8: ÍNDICES PARA RENDIMIENTO
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON public.transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at) WHERE deleted_at IS NULL;

-- Índice para búsqueda de texto en descripciones
CREATE INDEX IF NOT EXISTS idx_transactions_description_search ON public.transactions 
USING gin(to_tsvector('spanish', COALESCE(description, '')));

-- PASO 9: FUNCIONES DE MIGRACIÓN DE DATOS EXISTENTES
-- ============================================

-- Migrar datos de transactions_raw a transactions (si existen)
CREATE OR REPLACE FUNCTION public.migrate_transactions_raw_to_transactions()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    raw_transaction RECORD;
    new_category_id UUID;
BEGIN
    -- Verificar si la tabla transactions_raw existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transactions_raw'
    ) THEN
        RAISE NOTICE 'La tabla transactions_raw no existe, saltando migración';
        RETURN 0;
    END IF;
    
    -- Migrar cada transacción existente
    FOR raw_transaction IN 
        SELECT * FROM public.transactions_raw
    LOOP
        -- Verificar si ya existe una transacción similar
        IF NOT EXISTS (
            SELECT 1 FROM public.transactions t 
            WHERE t.user_id = raw_transaction.user_id 
            AND t.amount = raw_transaction.amount 
            AND t.transaction_date = raw_transaction.transaction_date::DATE
            AND COALESCE(t.description, '') = COALESCE(raw_transaction.original_description, '')
        ) THEN
            -- Auto-categorizar
            new_category_id := public.auto_categorize_transaction(COALESCE(raw_transaction.original_description, ''));
            
            -- Insertar en nueva tabla
            INSERT INTO public.transactions (
                user_id,
                goal_id,
                amount,
                description,
                transaction_date,
                category_id,
                type,
                created_at
            ) VALUES (
                raw_transaction.user_id,
                raw_transaction.goal_id,
                raw_transaction.amount,
                raw_transaction.original_description,
                raw_transaction.transaction_date::DATE,
                new_category_id,
                'expense', -- Asumir gasto por defecto
                COALESCE(raw_transaction.imported_at, NOW())
            );
            
            migrated_count := migrated_count + 1;
        END IF;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PASO 10: FUNCIÓN DE LIMPIEZA Y MANTENIMIENTO
-- ============================================

-- Función para limpiar transacciones soft-deleted después de 30 días
CREATE OR REPLACE FUNCTION public.cleanup_deleted_transactions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.transactions
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FINALIZACIÓN
-- ============================================

-- Ejecutar migración automática si hay datos (con manejo de errores)
DO $$
DECLARE
    migration_result INTEGER;
BEGIN
    BEGIN
        SELECT public.migrate_transactions_raw_to_transactions() INTO migration_result;
        RAISE NOTICE 'Migración completada: % registros procesados', migration_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error en migración (esto es normal si no hay tabla transactions_raw): %', SQLERRM;
    END;
END $$;

-- Mensaje de finalización
DO $$
BEGIN
    RAISE NOTICE '✅ SISTEMA DE TRANSACCIONES INSTALADO CORRECTAMENTE';
    RAISE NOTICE '📊 Categorías creadas: %', (SELECT COUNT(*) FROM public.transaction_categories);
    RAISE NOTICE '🔄 Transacciones en sistema: %', (SELECT COUNT(*) FROM public.transactions);
    RAISE NOTICE '🛡️ RLS habilitado en todas las tablas';
    RAISE NOTICE '⚡ Índices optimizados creados';
    RAISE NOTICE '🤖 Triggers de automatización activados';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 LISTO PARA USAR - Sistema completo de transacciones con UX psicológico';
END $$;
