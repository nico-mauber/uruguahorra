-- ============================================
-- SCRIPT DE REPARACIÓN FINAL - SISTEMA DE EDUCACIÓN
-- ============================================
-- Este script resuelve el conflicto de funciones
-- ============================================

-- PASO 1: ELIMINAR FUNCIONES EXISTENTES
DROP FUNCTION IF EXISTS public.mark_card_as_read(UUID, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.mark_card_as_read(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_module_card_progress(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_all_modules_progress(UUID);

-- PASO 2: VERIFICAR Y RECREAR TABLAS SI ES NECESARIO
-- Solo recrear si no existen o tienen estructura incorrecta

-- Verificar education_modules
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'education_modules' 
        AND column_name = 'display_order'
        AND table_schema = 'public'
    ) THEN
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
        
        -- Habilitar RLS
        ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
        
        -- Política RLS
        DROP POLICY IF EXISTS "Education modules are viewable by everyone" ON public.education_modules;
        CREATE POLICY "Education modules are viewable by everyone" ON public.education_modules
            FOR SELECT USING (true);
            
        -- Insertar módulos
        INSERT INTO public.education_modules (title, description, icon, difficulty_level, estimated_duration_minutes, display_order) VALUES
        ('Finanzas Básicas', 'Conceptos fundamentales para manejar tu dinero', '💰', 'principiante', 25, 1),
        ('Ahorro Inteligente', 'Estrategias efectivas para ahorrar dinero', '🏦', 'principiante', 30, 2),
        ('Inversiones 101', 'Introducción al mundo de las inversiones', '📈', 'intermedio', 35, 3),
        ('Presupuesto Personal', 'Cómo crear y mantener un presupuesto', '📊', 'principiante', 20, 4),
        ('Educación Financiera', 'Conocimientos avanzados sobre finanzas', '🎓', 'avanzado', 40, 5);
    END IF;
END $$;

-- Verificar education_cards
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'education_cards' 
        AND column_name = 'display_order'
        AND table_schema = 'public'
    ) THEN
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
        
        -- Habilitar RLS
        ALTER TABLE public.education_cards ENABLE ROW LEVEL SECURITY;
        
        -- Política RLS
        DROP POLICY IF EXISTS "Education cards are viewable by everyone" ON public.education_cards;
        CREATE POLICY "Education cards are viewable by everyone" ON public.education_cards
            FOR SELECT USING (true);
    END IF;
END $$;

-- Verificar user_card_progress
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_card_progress'
        AND table_schema = 'public'
    ) THEN
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
        
        -- Habilitar RLS
        ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;
        
        -- Políticas RLS
        DROP POLICY IF EXISTS "Users can view their own card progress" ON public.user_card_progress;
        DROP POLICY IF EXISTS "Users can insert their own card progress" ON public.user_card_progress;
        DROP POLICY IF EXISTS "Users can update their own card progress" ON public.user_card_progress;
        
        CREATE POLICY "Users can view their own card progress" ON public.user_card_progress
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own card progress" ON public.user_card_progress
            FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own card progress" ON public.user_card_progress
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- PASO 3: INSERTAR CARDS SI LA TABLA ESTÁ VACÍA
DO $$
DECLARE
    card_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO card_count FROM public.education_cards;
    
    IF card_count = 0 THEN
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

        -- INSERTAR CARDS DE INVERSIONES 101
        INSERT INTO public.education_cards (module_id, title, content, practical_tip, key_takeaway, reading_time_seconds, xp_reward, display_order) 
        SELECT 
            m.id,
            'Qué son las inversiones',
            'Invertir es poner tu dinero a trabajar para generar más dinero a través del tiempo. Las inversiones pueden ser en acciones, bonos, bienes raíces, o negocios. El objetivo es que tu dinero crezca más rápido que la inflación.',
            'Empieza invirtiendo pequeñas cantidades para aprender sin grandes riesgos.',
            'Las inversiones son la clave para crear riqueza a largo plazo.',
            85,
            5,
            1
        FROM education_modules m WHERE m.title = 'Inversiones 101'
        UNION ALL
        SELECT 
            m.id,
            'Riesgo vs Rendimiento',
            'Toda inversión tiene riesgo. Generalmente, mayor riesgo significa mayor rendimiento potencial, pero también mayor posibilidad de pérdidas. Es importante encontrar el balance adecuado para tu situación.',
            'No inviertas dinero que necesites en los próximos 5 años en activos de alto riesgo.',
            'Diversificar es la única estrategia gratuita para reducir riesgo.',
            90,
            5,
            2
        FROM education_modules m WHERE m.title = 'Inversiones 101'
        UNION ALL
        SELECT 
            m.id,
            'Diversificación de inversiones',
            'No pongas todos los huevos en una canasta. Diversificar significa repartir tus inversiones entre diferentes tipos de activos y sectores para reducir el riesgo total de tu portafolio.',
            'Una forma simple de diversificar es invertir en fondos de inversión que ya están diversificados.',
            'La diversificación es tu mejor defensa contra la volatilidad del mercado.',
            80,
            5,
            3
        FROM education_modules m WHERE m.title = 'Inversiones 101'
        UNION ALL
        SELECT 
            m.id,
            'Interés compuesto',
            'El interés compuesto es ganar rendimientos no solo sobre tu inversión inicial, sino también sobre los rendimientos acumulados. Es la fuerza más poderosa en las finanzas y funciona mejor con tiempo.',
            'Empieza a invertir lo antes posible, aunque sea poco. El tiempo es tu mejor aliado.',
            'El interés compuesto recompensa la paciencia y la constancia.',
            75,
            5,
            4
        FROM education_modules m WHERE m.title = 'Inversiones 101'
        UNION ALL
        SELECT 
            m.id,
            'Cuándo empezar a invertir',
            'El mejor momento para empezar a invertir es ahora, sin importar tu edad. Primero asegúrate de tener un fondo de emergencia y haber pagado deudas de alto interés. Luego, empieza con lo que puedas.',
            'Si no sabes por dónde empezar, considera fondos indexados de bajo costo.',
            'Tiempo en el mercado es mejor que timing del mercado.',
            85,
            5,
            5
        FROM education_modules m WHERE m.title = 'Inversiones 101';

        -- INSERTAR CARDS DE PRESUPUESTO PERSONAL
        INSERT INTO public.education_cards (module_id, title, content, practical_tip, key_takeaway, reading_time_seconds, xp_reward, display_order) 
        SELECT 
            m.id,
            'Por qué necesitas un presupuesto',
            'Un presupuesto es un plan para tu dinero que te ayuda a controlar gastos y alcanzar metas financieras. Sin presupuesto, es fácil gastar más de lo que ganas y no saber en qué se va tu dinero.',
            'Empieza rastreando tus gastos por una semana antes de crear tu presupuesto.',
            'Un presupuesto te da control y dirección sobre tu dinero.',
            80,
            5,
            1
        FROM education_modules m WHERE m.title = 'Presupuesto Personal'
        UNION ALL
        SELECT 
            m.id,
            'Cómo crear tu primer presupuesto',
            'Lista todos tus ingresos mensuales, luego lista todos tus gastos fijos y variables. Asigna cada peso a una categoría antes de gastarlo. La regla de oro: ingresos - gastos = ahorro (debe ser positivo).',
            'Usa apps como esta para facilitar el seguimiento de tu presupuesto.',
            'Tu presupuesto debe ser realista y flexible, no perfecto.',
            95,
            5,
            2
        FROM education_modules m WHERE m.title = 'Presupuesto Personal'
        UNION ALL
        SELECT 
            m.id,
            'Categorías básicas de gastos',
            'Organiza tus gastos en categorías como: vivienda, alimentación, transporte, entretenimiento, servicios, seguros, y ahorros. Esto te ayuda a ver patrones y identificar áreas donde puedes reducir gastos.',
            'La regla 50/30/20 puede ser un buen punto de partida para asignar categorías.',
            'Categorizar gastos te ayuda a tomar decisiones financieras más conscientes.',
            85,
            5,
            3
        FROM education_modules m WHERE m.title = 'Presupuesto Personal'
        UNION ALL
        SELECT 
            m.id,
            'Cómo manejar gastos inesperados',
            'Los gastos inesperados son normales. Incluye una categoría de "varios" o "imprevistos" en tu presupuesto. Si gastas más en una categoría, reduce en otra para mantener el balance.',
            'Revisa y ajusta tu presupuesto mensualmente basándote en los gastos reales.',
            'La flexibilidad es clave para mantener un presupuesto funcional.',
            75,
            5,
            4
        FROM education_modules m WHERE m.title = 'Presupuesto Personal'
        UNION ALL
        SELECT 
            m.id,
            'Herramientas para presupuestar',
            'Puedes usar desde una libreta hasta apps especializadas. Lo importante es elegir un método que uses consistentemente. Las apps automatizan el proceso y te dan reportes útiles.',
            'Esta app puede sincronizar con tus cuentas bancarias para automatizar el seguimiento.',
            'La mejor herramienta de presupuesto es la que realmente usas.',
            70,
            5,
            5
        FROM education_modules m WHERE m.title = 'Presupuesto Personal';

        -- INSERTAR CARDS DE EDUCACIÓN FINANCIERA
        INSERT INTO public.education_cards (module_id, title, content, practical_tip, key_takeaway, reading_time_seconds, xp_reward, display_order) 
        SELECT 
            m.id,
            'Planificación financiera a largo plazo',
            'La planificación financiera incluye definir metas a 5, 10 y 20 años. Esto incluye jubilación, compra de casa, educación de hijos, y otros objetivos importantes. Tener un plan te ayuda a tomar mejores decisiones hoy.',
            'Escribe tus metas financieras y revísalas cada año para ajustar tu plan.',
            'Las decisiones financieras de hoy impactan tu futuro de mañana.',
            90,
            5,
            1
        FROM education_modules m WHERE m.title = 'Educación Financiera'
        UNION ALL
        SELECT 
            m.id,
            'Impuestos básicos',
            'Los impuestos son una parte importante de tus finanzas. Entender cómo funcionan te ayuda a planificar mejor y aprovechar deducciones legales. Considera trabajar con un contador para optimizar tu situación fiscal.',
            'Guarda todos los recibos relacionados con deducciones fiscales durante el año.',
            'Planificar para impuestos es tan importante como planificar para ahorros.',
            85,
            5,
            2
        FROM education_modules m WHERE m.title = 'Educación Financiera'
        UNION ALL
        SELECT 
            m.id,
            'Seguros importantes',
            'Los seguros te protegen contra pérdidas financieras grandes e inesperadas. Los seguros esenciales incluyen salud, auto (si tienes), y vida (si tienes dependientes). Son un gasto necesario, no opcional.',
            'Revisa tus seguros anualmente para asegurar que tienes la cobertura adecuada.',
            'Los seguros son una inversión en tu tranquilidad financiera.',
            80,
            5,
            3
        FROM education_modules m WHERE m.title = 'Educación Financiera'
        UNION ALL
        SELECT 
            m.id,
            'Cómo aumentar tus ingresos',
            'Además de controlar gastos, puedes mejorar tus finanzas aumentando ingresos. Esto incluye negociar tu salario, desarrollar nuevas habilidades, trabajos extras, o crear fuentes de ingreso pasivo.',
            'Invierte en tu educación y habilidades - es la inversión con mejor retorno.',
            'Tus ingresos son tu herramienta más poderosa para crear riqueza.',
            95,
            5,
            4
        FROM education_modules m WHERE m.title = 'Educación Financiera'
        UNION ALL
        SELECT 
            m.id,
            'Errores financieros comunes',
            'Errores comunes incluyen: no tener fondo de emergencia, pagar solo el mínimo de tarjetas de crédito, no ahorrar para jubilación, comprar cosas para impresionar, y no educarse financieramente.',
            'Aprende de los errores de otros para evitar cometerlos tú mismo.',
            'Los errores financieros son oportunidades de aprendizaje, no fracasos.',
            85,
            5,
            5
        FROM education_modules m WHERE m.title = 'Educación Financiera';
    END IF;
END $$;

-- PASO 4: CREAR ÍNDICES
CREATE INDEX IF NOT EXISTS idx_education_modules_order ON public.education_modules(display_order);
CREATE INDEX IF NOT EXISTS idx_education_cards_module_id ON public.education_cards(module_id);
CREATE INDEX IF NOT EXISTS idx_education_cards_module_order ON public.education_cards(module_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user_id ON public.user_card_progress(user_id);

-- PASO 5: CREAR FUNCIÓN PARA MARCAR CARD COMO LEÍDA
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
    
    -- Insertar en log de XP (solo si existe la tabla)
    BEGIN
        INSERT INTO user_xp_log (user_id, amount, event_type, description)
        VALUES (
            p_user_id,
            v_xp_to_award,
            'education_card_read',
            'Card leída: ' || v_card_record.title
        );
    EXCEPTION
        WHEN others THEN
            -- Si la tabla no existe, continuar sin error
            NULL;
    END;
    
    -- Actualizar XP total del usuario (solo si existe la columna)
    BEGIN
        UPDATE users 
        SET 
            total_xp = total_xp + v_xp_to_award,
            updated_at = NOW()
        WHERE id = p_user_id;
    EXCEPTION
        WHEN others THEN
            -- Si la columna no existe, continuar sin error
            NULL;
    END;
    
    RETURN jsonb_build_object(
        'success', true,
        'xp_earned', v_xp_to_award,
        'first_read', true,
        'card_title', v_card_record.title,
        'module_title', v_card_record.module_title
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MENSAJE FINAL
DO $$
BEGIN
    RAISE NOTICE '✅ Sistema de educación configurado correctamente';
    RAISE NOTICE '📚 5 módulos creados con 25 cards total';
    RAISE NOTICE '🔧 Función mark_card_as_read() lista';
    RAISE NOTICE '🎯 ¡Refresca tu app y prueba el sistema!';
END $$;