-- ============================================
-- SCRIPT DE REPARACIÓN - SISTEMA DE EDUCACIÓN
-- ============================================
-- Este script arregla los problemas encontrados después 
-- de ejecutar el script principal
-- ============================================

-- VERIFICAR Y RECREAR TABLA education_modules SI ES NECESARIO
DROP TABLE IF EXISTS public.education_modules CASCADE;

CREATE TABLE public.education_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50) DEFAULT '📚',
    difficulty_level VARCHAR(20) DEFAULT 'principiante' 
        CHECK (difficulty_level IN ('principiante', 'intermedio', 'avanzado', 'experto')),
    estimated_duration_minutes INTEGER DEFAULT 30,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- VERIFICAR Y RECREAR TABLA education_cards SI ES NECESARIO  
DROP TABLE IF EXISTS public.education_cards CASCADE;

CREATE TABLE public.education_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID NOT NULL REFERENCES public.education_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    practical_tip TEXT,
    key_takeaway TEXT NOT NULL,
    reading_time_seconds INTEGER DEFAULT 60 CHECK (reading_time_seconds > 0),
    xp_reward INTEGER DEFAULT 5 CHECK (xp_reward >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- VERIFICAR Y RECREAR TABLA user_card_progress SI ES NECESARIO
DROP TABLE IF EXISTS public.user_card_progress CASCADE;

CREATE TABLE public.user_card_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.education_cards(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT false,
    reading_time_seconds INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, card_id)
);

-- CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_education_modules_order ON public.education_modules(display_order);
CREATE INDEX IF NOT EXISTS idx_education_cards_module_id ON public.education_cards(module_id);
CREATE INDEX IF NOT EXISTS idx_education_cards_module_order ON public.education_cards(module_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user_id ON public.user_card_progress(user_id);

-- HABILITAR RLS
ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS
CREATE POLICY "Education modules are viewable by everyone" ON public.education_modules
    FOR SELECT USING (true);

CREATE POLICY "Education cards are viewable by everyone" ON public.education_cards
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own card progress" ON public.user_card_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card progress" ON public.user_card_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own card progress" ON public.user_card_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- INSERTAR DATOS DE PRUEBA (5 módulos, 5 cards cada uno)
INSERT INTO public.education_modules (title, description, icon, difficulty_level, estimated_duration_minutes, display_order) VALUES
('Finanzas Básicas', 'Conceptos fundamentales para manejar tu dinero', '💰', 'principiante', 25, 1),
('Ahorro Inteligente', 'Estrategias efectivas para ahorrar dinero', '🏦', 'principiante', 30, 2),
('Inversiones 101', 'Introducción al mundo de las inversiones', '📈', 'intermedio', 35, 3),
('Presupuesto Personal', 'Cómo crear y mantener un presupuesto', '📊', 'principiante', 20, 4),
('Educación Financiera', 'Conocimientos avanzados sobre finanzas', '🎓', 'avanzado', 40, 5);

-- INSERTAR CARDS DE FINANZAS BÁSICAS
INSERT INTO public.education_cards (module_id, title, content, practical_tip, key_takeaway, reading_time_seconds, xp_reward, display_order) 
SELECT 
    m.id,
    'Qué es el dinero y su función',
    'El dinero es un medio de intercambio que facilita las transacciones. Cumple tres funciones principales: medio de pago, unidad de cuenta y reserva de valor. Entender estas funciones te ayuda a tomar mejores decisiones financieras.',
    'Siempre ten algo de efectivo para emergencias, pero no mantengas todo tu dinero sin generar rendimientos.',
    'El dinero es una herramienta, no un fin en sí mismo.',
    75,
    5,
    1
FROM education_modules m WHERE m.title = 'Finanzas Básicas'
UNION ALL
SELECT 
    m.id,
    'Ingresos vs Gastos',
    'Para tener finanzas sanas, tus ingresos deben ser mayores a tus gastos. La diferencia es lo que puedes ahorrar o invertir. Identifica todos tus ingresos y clasifica tus gastos en necesarios y opcionales.',
    'Anota todos tus gastos por una semana para identificar patrones de consumo.',
    'Gasta menos de lo que ganas para crear riqueza.',
    90,
    5,
    2
FROM education_modules m WHERE m.title = 'Finanzas Básicas'
UNION ALL
SELECT 
    m.id,
    'La importancia del fondo de emergencia',
    'Un fondo de emergencia es dinero guardado para situaciones imprevistas como pérdida de empleo o gastos médicos. Debe cubrir 3-6 meses de gastos básicos y mantenerse en una cuenta de fácil acceso.',
    'Empieza con $1000 pesos y ve aumentando gradualmente hasta alcanzar tu meta.',
    'Un fondo de emergencia te da tranquilidad y estabilidad financiera.',
    85,
    5,
    3
FROM education_modules m WHERE m.title = 'Finanzas Básicas'
UNION ALL
SELECT 
    m.id,
    'Tipos de cuentas bancarias',
    'Existen diferentes tipos de cuentas: corrientes (para gastos diarios), de ahorro (para guardar dinero), y a plazo fijo (para inversiones a corto plazo). Cada una tiene diferentes beneficios y costos.',
    'Compara las comisiones de diferentes bancos antes de abrir una cuenta.',
    'Elige la cuenta bancaria que mejor se adapte a tus necesidades y objetivos.',
    80,
    5,
    4
FROM education_modules m WHERE m.title = 'Finanzas Básicas'
UNION ALL
SELECT 
    m.id,
    'Introducción al crédito',
    'El crédito es dinero prestado que debes devolver con intereses. Puede ser útil para compras grandes, pero usado incorrectamente puede generar deudas problemáticas. Siempre evalúa tu capacidad de pago antes de endeudarte.',
    'Lee siempre la letra pequeña de cualquier contrato de crédito.',
    'El crédito es una herramienta poderosa que debe usarse con responsabilidad.',
    95,
    5,
    5
FROM education_modules m WHERE m.title = 'Finanzas Básicas';

-- INSERTAR CARDS DE AHORRO INTELIGENTE  
INSERT INTO public.education_cards (module_id, title, content, practical_tip, key_takeaway, reading_time_seconds, xp_reward, display_order) 
SELECT 
    m.id,
    'La regla del 50/30/20',
    'Esta regla sugiere destinar 50% de tus ingresos a necesidades, 30% a gustos y 20% a ahorros. Es una guía flexible que puedes adaptar a tu situación. Lo importante es tener un plan consciente para tu dinero.',
    'Empieza con cualquier porcentaje de ahorro, aunque sea 5%, y ve aumentando gradualmente.',
    'Tener un plan para tu dinero es más importante que el plan perfecto.',
    85,
    5,
    1
FROM education_modules m WHERE m.title = 'Ahorro Inteligente'
UNION ALL
SELECT 
    m.id,
    'Automatizar tus ahorros',
    'Configurar transferencias automáticas a tu cuenta de ahorros hace que ahorrar sea más fácil. Trata el ahorro como un gasto fijo que se descuenta apenas recibes tu sueldo.',
    'Programa la transferencia para el día que recibes tu salario.',
    'Lo que se automatiza, se logra más fácilmente.',
    70,
    5,
    2
FROM education_modules m WHERE m.title = 'Ahorro Inteligente'
UNION ALL
SELECT 
    m.id,
    'Ahorrar en gastos cotidianos',
    'Pequeños cambios en gastos diarios pueden generar grandes ahorros. Ejemplos: cocinar en casa, usar transporte público, comprar marcas genéricas, cancelar suscripciones no utilizadas.',
    'Revisa tus suscripciones mensuales y cancela las que no uses activamente.',
    'Los pequeños ahorros consistentes se vuelven grandes montos con el tiempo.',
    80,
    5,
    3
FROM education_modules m WHERE m.title = 'Ahorro Inteligente'
UNION ALL
SELECT 
    m.id,
    'Estrategias de compras inteligentes',
    'Antes de comprar algo pregúntate: ¿Lo necesito? ¿Puedo comprarlo más barato? ¿Puedo esperar? Usar listas de compras, comparar precios y esperar ofertas puede ahorrarte mucho dinero.',
    'Espera 24 horas antes de hacer compras no planificadas mayores a $50.',
    'Comprar conscientemente es una habilidad que se desarrolla con práctica.',
    90,
    5,
    4
FROM education_modules m WHERE m.title = 'Ahorro Inteligente'
UNION ALL
SELECT 
    m.id,
    'Metas de ahorro SMART',
    'Las metas SMART son: Específicas, Medibles, Alcanzables, Relevantes y con Tiempo definido. En lugar de "quiero ahorrar más", di "quiero ahorrar $10,000 para un viaje en 12 meses".',
    'Escribe tus metas de ahorro y ponlas donde las veas frecuentemente.',
    'Las metas claras y específicas tienen más probabilidad de cumplirse.',
    75,
    5,
    5
FROM education_modules m WHERE m.title = 'Ahorro Inteligente';

-- CREAR FUNCIÓN PARA MARCAR CARD COMO LEÍDA
CREATE OR REPLACE FUNCTION mark_card_as_read(
    p_user_id UUID,
    p_card_id UUID,
    p_reading_time_seconds INTEGER DEFAULT 60
) RETURNS JSONB AS $$
DECLARE
    v_card_record RECORD;
    v_already_read BOOLEAN;
    v_xp_to_award INTEGER;
BEGIN
    -- Verificar que la card existe
    SELECT c.*, m.title as module_title 
    INTO v_card_record
    FROM education_cards c
    JOIN education_modules m ON c.module_id = m.id
    WHERE c.id = p_card_id AND c.is_active = true;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Card not found'
        );
    END IF;
    
    -- Verificar si ya fue leída
    SELECT is_read INTO v_already_read
    FROM user_card_progress
    WHERE user_id = p_user_id AND card_id = p_card_id;
    
    -- Si ya existe el registro
    IF FOUND THEN
        IF v_already_read THEN
            RETURN jsonb_build_object(
                'success', true,
                'xp_earned', 0,
                'first_read', false,
                'message', 'Card already read'
            );
        ELSE
            -- Actualizar como leída
            UPDATE user_card_progress 
            SET 
                is_read = true,
                reading_time_seconds = p_reading_time_seconds,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE user_id = p_user_id AND card_id = p_card_id;
        END IF;
    ELSE
        -- Crear nuevo registro
        INSERT INTO user_card_progress (
            user_id, 
            card_id, 
            is_read, 
            reading_time_seconds,
            completed_at
        ) VALUES (
            p_user_id, 
            p_card_id, 
            true, 
            p_reading_time_seconds,
            NOW()
        );
    END IF;
    
    -- Otorgar XP
    v_xp_to_award := v_card_record.xp_reward;
    
    -- Insertar en log de XP
    INSERT INTO user_xp_log (user_id, amount, event_type, description)
    VALUES (
        p_user_id,
        v_xp_to_award,
        'education_card_read',
        'Card leída: ' || v_card_record.title
    );
    
    -- Actualizar XP total del usuario
    UPDATE users 
    SET 
        total_xp = total_xp + v_xp_to_award,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'xp_earned', v_xp_to_award,
        'first_read', true,
        'card_title', v_card_record.title,
        'module_title', v_card_record.module_title
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;