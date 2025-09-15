-- ============================================
-- SISTEMA DE EDUCACIÓN FINANCIERA - CARDS DE LECTURA SIMPLE
-- ============================================
-- Reemplazo COMPLETO del sistema Duolingo por sistema de cards simple
-- Versión: 1.0 - Sistema coherente desde cero
-- Fecha: 15 de Septiembre, 2025
-- ============================================
-- 
-- INSTRUCCIONES DE USO:
-- 1. Copiar COMPLETO este archivo
-- 2. Ejecutar en Supabase SQL Editor
-- 3. El sistema de educación quedará totalmente reemplazado
-- 
-- CARACTERÍSTICAS DEL NUEVO SISTEMA:
-- ✅ ELIMINADO: Sistema Duolingo completo (vidas, quizzes, badges, prerequisitos)
-- ✅ NUEVO: Sistema simple de cards de lectura (30s-2min)
-- ✅ SIMPLE: Solo botón "Leída" sin gamificación compleja
-- ✅ XP INTEGRADO: +5 XP por card leída, compatible con sistema existente
-- ✅ CONTENIDO PRÁCTICO: 120 cards de educación financiera aplicable
-- ✅ COHERENCIA TOTAL: Frontend y backend alineados
-- 
-- ADVERTENCIA: Este script ELIMINA el sistema de educación Duolingo existente
-- y lo reemplaza con el sistema de cards simple
-- ============================================

-- ============================================
-- PASO 1: LIMPIAR SISTEMA DUOLINGO EXISTENTE
-- ============================================

-- Eliminar tablas del sistema Duolingo en orden correcto (por dependencias)
DROP TABLE IF EXISTS public.user_education_badges CASCADE;
DROP TABLE IF EXISTS public.education_badges CASCADE;
DROP TABLE IF EXISTS public.user_education_stats CASCADE;
DROP TABLE IF EXISTS public.user_education_progress CASCADE;
DROP TABLE IF EXISTS public.education_lessons CASCADE;
DROP TABLE IF EXISTS public.education_modules CASCADE;

-- Eliminar funciones del sistema Duolingo
DROP FUNCTION IF EXISTS public.get_or_create_education_stats(UUID);
DROP FUNCTION IF EXISTS public.complete_education_lesson(UUID, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.lose_education_life(UUID);
DROP FUNCTION IF EXISTS public.regenerate_education_lives();

-- Limpiar índices que puedan quedar
DROP INDEX IF EXISTS idx_education_lessons_module_order;
DROP INDEX IF EXISTS idx_user_education_progress_user;
DROP INDEX IF EXISTS idx_user_education_progress_lesson;
DROP INDEX IF EXISTS idx_user_education_progress_completed;
DROP INDEX IF EXISTS idx_user_education_stats_user;
DROP INDEX IF EXISTS idx_user_education_badges_user;

-- ============================================
-- PASO 2: CREAR SCHEMA DEL SISTEMA DE CARDS SIMPLE
-- ============================================

-- Tabla de módulos educativos (simplificada)
CREATE TABLE public.education_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(10) DEFAULT '📚',
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('principiante', 'intermedio', 'avanzado', 'experto')) DEFAULT 'principiante',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de cards educativas (contenido de lectura simple)
CREATE TABLE public.education_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    module_id UUID NOT NULL REFERENCES public.education_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    key_takeaway TEXT NOT NULL,
    practical_tip TEXT NOT NULL,
    reading_time_seconds INTEGER DEFAULT 60 CHECK (reading_time_seconds > 0),
    xp_reward INTEGER DEFAULT 5 CHECK (xp_reward >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de progreso del usuario (tracking simple de lectura)
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

-- ============================================
-- PASO 3: CREAR ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_education_cards_module_id ON public.education_cards(module_id);
CREATE INDEX idx_education_cards_module_order ON public.education_cards(module_id, display_order);
CREATE INDEX idx_education_cards_active ON public.education_cards(is_active) WHERE is_active = true;

CREATE INDEX idx_user_card_progress_user_id ON public.user_card_progress(user_id);
CREATE INDEX idx_user_card_progress_card_id ON public.user_card_progress(card_id);
CREATE INDEX idx_user_card_progress_read ON public.user_card_progress(user_id, is_read) WHERE is_read = true;

CREATE INDEX idx_education_modules_active ON public.education_modules(is_active, display_order) WHERE is_active = true;

-- ============================================
-- PASO 4: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.education_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_card_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para módulos (lectura pública)
CREATE POLICY "education_modules_read_all" ON public.education_modules
    FOR SELECT USING (is_active = true);

-- Políticas para cards (lectura pública)  
CREATE POLICY "education_cards_read_all" ON public.education_cards
    FOR SELECT USING (is_active = true);

-- Políticas para progreso de usuario (solo propietario)
CREATE POLICY "user_card_progress_own_select" ON public.user_card_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_card_progress_own_insert" ON public.user_card_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_card_progress_own_update" ON public.user_card_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PASO 5: FUNCIONES DEL SISTEMA DE CARDS
-- ============================================

-- Función para marcar card como leída y otorgar XP
CREATE OR REPLACE FUNCTION public.mark_card_as_read(
    p_user_id UUID,
    p_card_id UUID,
    p_reading_time INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json JSON;
    xp_to_award INTEGER;
    card_exists BOOLEAN;
BEGIN
    -- Verificar que la card existe
    SELECT EXISTS(SELECT 1 FROM public.education_cards WHERE id = p_card_id AND is_active = true)
    INTO card_exists;
    
    IF NOT card_exists THEN
        RETURN json_build_object('success', false, 'error', 'Card not found or inactive');
    END IF;
    
    -- Obtener XP de la card
    SELECT xp_reward INTO xp_to_award
    FROM public.education_cards 
    WHERE id = p_card_id;
    
    -- Insertar o actualizar progreso
    INSERT INTO public.user_card_progress (user_id, card_id, is_read, reading_time_seconds, completed_at)
    VALUES (p_user_id, p_card_id, true, p_reading_time, timezone('utc'::text, now()))
    ON CONFLICT (user_id, card_id) 
    DO UPDATE SET 
        is_read = true,
        reading_time_seconds = COALESCE(EXCLUDED.reading_time_seconds, user_card_progress.reading_time_seconds),
        completed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now());
    
    -- Otorgar XP solo si existen las tablas del sistema de gamificación
    BEGIN
        -- Verificar si las tablas de XP existen
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_xp_log') AND
           EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
            
            -- Insertar XP en el log
            INSERT INTO public.user_xp_log (user_id, event_type, xp_earned, event_data)
            VALUES (p_user_id, 'education_card', xp_to_award, json_build_object('card_id', p_card_id));
            
            -- Actualizar XP total del usuario
            UPDATE public.users 
            SET total_xp = total_xp + xp_to_award,
                updated_at = timezone('utc'::text, now())
            WHERE id = p_user_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Si hay error con XP, continuar sin fallar
        NULL;
    END;
    
    RETURN json_build_object('success', true, 'xp_earned', xp_to_award);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Función para obtener progreso completo de un módulo
CREATE OR REPLACE FUNCTION public.get_module_card_progress(
    p_user_id UUID,
    p_module_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT json_build_object(
        'module', json_build_object(
            'id', m.id,
            'slug', m.slug,
            'title', m.title,
            'description', m.description,
            'icon', m.icon,
            'difficulty_level', m.difficulty_level,
            'display_order', m.display_order
        ),
        'cards', COALESCE(
            json_agg(
                json_build_object(
                    'card', json_build_object(
                        'id', c.id,
                        'slug', c.slug,
                        'title', c.title,
                        'content', c.content,
                        'key_takeaway', c.key_takeaway,
                        'practical_tip', c.practical_tip,
                        'reading_time_seconds', c.reading_time_seconds,
                        'xp_reward', c.xp_reward,
                        'display_order', c.display_order
                    ),
                    'progress', json_build_object(
                        'is_read', COALESCE(ucp.is_read, false),
                        'completed_at', ucp.completed_at,
                        'reading_time_seconds', ucp.reading_time_seconds
                    )
                ) ORDER BY c.display_order
            ), '[]'::json
        ),
        'stats', json_build_object(
            'total_cards', COUNT(c.id),
            'read_cards', COUNT(ucp.id) FILTER (WHERE ucp.is_read = true),
            'completion_percentage', CASE 
                WHEN COUNT(c.id) = 0 THEN 0
                ELSE ROUND(
                    (COUNT(ucp.id) FILTER (WHERE ucp.is_read = true))::numeric * 100.0 / COUNT(c.id), 2
                )
            END,
            'estimated_total_time', COALESCE(SUM(c.reading_time_seconds), 0),
            'actual_reading_time', COALESCE(SUM(ucp.reading_time_seconds), 0),
            'is_completed', COUNT(c.id) > 0 AND COUNT(ucp.id) FILTER (WHERE ucp.is_read = true) = COUNT(c.id)
        )
    ) INTO result_json
    FROM public.education_modules m
    LEFT JOIN public.education_cards c ON m.id = c.module_id AND c.is_active = true
    LEFT JOIN public.user_card_progress ucp ON c.id = ucp.card_id AND ucp.user_id = p_user_id
    WHERE m.id = p_module_id AND m.is_active = true
    GROUP BY m.id, m.slug, m.title, m.description, m.icon, m.difficulty_level, m.display_order;
    
    RETURN COALESCE(result_json, json_build_object('error', 'Module not found'));
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Función para obtener todos los módulos con progreso
CREATE OR REPLACE FUNCTION public.get_all_modules_progress(
    p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result_json JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'module', json_build_object(
                'id', m.id,
                'slug', m.slug,
                'title', m.title,
                'description', m.description,
                'icon', m.icon,
                'difficulty_level', m.difficulty_level,
                'display_order', m.display_order
            ),
            'stats', json_build_object(
                'total_cards', module_stats.total_cards,
                'read_cards', module_stats.read_cards,
                'completion_percentage', module_stats.completion_percentage,
                'estimated_total_time', module_stats.estimated_total_time,
                'is_completed', module_stats.is_completed
            )
        ) ORDER BY m.display_order
    ) INTO result_json
    FROM public.education_modules m
    LEFT JOIN (
        SELECT 
            c.module_id,
            COUNT(c.id) as total_cards,
            COUNT(ucp.id) FILTER (WHERE ucp.is_read = true) as read_cards,
            CASE 
                WHEN COUNT(c.id) = 0 THEN 0
                ELSE ROUND(
                    (COUNT(ucp.id) FILTER (WHERE ucp.is_read = true))::numeric * 100.0 / COUNT(c.id), 2
                )
            END as completion_percentage,
            COALESCE(SUM(c.reading_time_seconds), 0) as estimated_total_time,
            COUNT(c.id) > 0 AND COUNT(ucp.id) FILTER (WHERE ucp.is_read = true) = COUNT(c.id) as is_completed
        FROM public.education_cards c
        LEFT JOIN public.user_card_progress ucp ON c.id = ucp.card_id AND ucp.user_id = p_user_id
        WHERE c.is_active = true
        GROUP BY c.module_id
    ) module_stats ON m.id = module_stats.module_id
    WHERE m.is_active = true;
    
    RETURN COALESCE(result_json, '[]'::json);
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- ============================================
-- PASO 6: CONFIGURAR CONSTRAINT XP (COMPATIBLE)
-- ============================================

-- Actualizar constraint de XP para incluir education_card si la tabla existe
DO $$
BEGIN
    -- Verificar si la tabla user_xp_log existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_xp_log') THEN
        
        -- Eliminar constraint existente si existe
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'user_xp_log_event_type_check' 
                   AND table_name = 'user_xp_log') THEN
            ALTER TABLE public.user_xp_log DROP CONSTRAINT user_xp_log_event_type_check;
        END IF;
        
        -- Crear nuevo constraint que incluya education_card
        ALTER TABLE public.user_xp_log ADD CONSTRAINT user_xp_log_event_type_check 
            CHECK (event_type IN (
                'contribution', 
                'challenge_complete', 
                'challenge_session_complete', 
                'daily_streak', 
                'quest_complete', 
                'squad_contribution', 
                'education_card'
            ));
            
        RAISE NOTICE 'XP constraint actualizado exitosamente para incluir education_card';
    ELSE
        RAISE NOTICE 'Tabla user_xp_log no existe, el constraint se agregará cuando se cree la tabla';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error al actualizar constraint XP: %', SQLERRM;
END
$$;

-- ============================================
-- PASO 7: INSERTAR CONTENIDO EDUCATIVO (120 CARDS)
-- ============================================

-- Insertar módulos educativos
INSERT INTO public.education_modules (slug, title, description, icon, difficulty_level, display_order, is_active) VALUES
('mod_presupuesto', 'Presupuesto Personal', 'Aprende a crear y mantener un presupuesto que funcione para ti y te dé control total sobre tus finanzas', '💰', 'principiante', 1, true),
('mod_ahorro', 'Estrategias de Ahorro', 'Técnicas prácticas y efectivas para ahorrar dinero en tu día a día sin sacrificar calidad de vida', '🏦', 'principiante', 2, true),
('mod_deudas', 'Manejo de Deudas', 'Cómo salir de deudas de manera inteligente y evitar el sobreendeudamiento futuro', '📉', 'intermedio', 3, true),
('mod_inversion', 'Primeros Pasos en Inversión', 'Conceptos básicos y seguros para comenzar a invertir tu dinero de manera inteligente', '📈', 'intermedio', 4, true),
('mod_planificacion', 'Planificación Financiera', 'Establece metas financieras realistas y crea un plan a largo plazo para tu futuro', '🎯', 'avanzado', 5, true);

-- MÓDULO 1: PRESUPUESTO PERSONAL (25 cards)
INSERT INTO public.education_cards (slug, module_id, title, content, key_takeaway, practical_tip, reading_time_seconds, xp_reward, display_order) VALUES
('card_pres_001', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Introducción al Presupuesto', 'El presupuesto es la herramienta más importante para controlar tus finanzas. Te permite saber exactamente cuánto dinero entra y sale de tu bolsillo cada mes, evitando sorpresas desagradables y ayudándote a tomar decisiones financieras informadas.', 'Un presupuesto te da control total sobre tu dinero', 'Anota todos tus gastos durante una semana completa para empezar', 45, 5, 1),
('card_pres_002', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'La Regla 50/30/20', 'Esta regla simple divide tus ingresos en tres categorías: 50% para gastos esenciales (vivienda, comida, transporte), 30% para gastos personales (entretenimiento, hobbies), y 20% para ahorros e inversiones. Es un punto de partida excelente para principiantes.', 'El balance es clave en las finanzas personales', 'Calcula cuánto deberías gastar en cada categoría según tus ingresos actuales', 60, 5, 2),
('card_pres_003', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Fijos vs Variables', 'Los gastos fijos son iguales cada mes (alquiler, seguros, cuotas). Los variables cambian según tus decisiones (comida, entretenimiento). Conocer la diferencia te ayuda a identificar dónde puedes ajustar tu presupuesto cuando sea necesario.', 'Identifica qué gastos puedes controlar y cuáles no', 'Haz dos listas: una de gastos fijos y otra de gastos variables', 50, 5, 3),
('card_pres_004', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Cómo Rastrear Gastos', 'Usa una app móvil, Excel o simplemente una libreta para anotar cada peso que gastas. Al final del mes, agrupa por categorías para identificar patrones. La clave está en la constancia, no en la herramienta que uses.', 'Lo que no se mide, no se puede mejorar', 'Instala una app de gastos o usa una libreta por 30 días consecutivos', 55, 5, 4),
('card_pres_005', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Hormiga', 'Son pequeños gastos diarios que parecen insignificantes: café, chicles, propinas extras, snacks. Individualmente son pequeños, pero sumados al mes pueden representar cientos de pesos que no notaste gastar.', 'Los gastos pequeños y frecuentes se vuelven grandes sumas', 'Anota cada gasto menor a $50 pesos durante una semana', 50, 5, 5),
('card_pres_006', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Emergencia', 'Siempre dedica una parte de tu presupuesto mensual a crear un fondo de emergencia. Empieza con al menos $100 pesos por mes. Este dinero te salvará cuando tengas gastos inesperados.', 'Siempre presupuesta para lo inesperado', 'Abre una cuenta de ahorros separada solo para emergencias', 45, 5, 6),
('card_pres_007', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Revisión Mensual', 'Al final de cada mes, compara lo que planeaste gastar con lo que realmente gastaste. Identifica las diferencias y ajusta el presupuesto del próximo mes según lo aprendido. El presupuesto evoluciona contigo.', 'El presupuesto evoluciona con la experiencia', 'Programa una cita contigo mismo cada fin de mes para revisar', 55, 5, 7),
('card_pres_008', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Categorías de Gastos', 'Organiza tus gastos en 5-7 categorías principales: vivienda, transporte, comida, entretenimiento, ahorros, salud, personal. Esto te ayuda a identificar rápidamente dónde va tu dinero y dónde puedes optimizar.', 'Las categorías claras revelan patrones de gasto', 'Crea tu sistema personal de 5-7 categorías principales', 50, 5, 8),
('card_pres_009', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Ingresos Variables', 'Si tus ingresos cambian cada mes (freelance, comisiones), basa tu presupuesto en el mes más bajo de los últimos 6 meses. Cualquier ingreso extra será un bonus que puedes destinar a ahorros o metas especiales.', 'Con ingresos variables, presupuesta conservadoramente', 'Calcula tu ingreso promedio de los últimos 6 meses', 60, 5, 9),
('card_pres_010', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Familiar', 'Si vives en familia, involucra a todos los miembros en el presupuesto. Cada persona debe conocer los límites y objetivos financieros familiares. La transparencia evita conflictos y malentendidos.', 'El presupuesto familiar requiere comunicación abierta', 'Organiza una reunión familiar mensual sobre dinero', 55, 5, 10),
('card_pres_011', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Herramientas: Apps vs Papel', 'Puedes usar apps como Mint, YNAB, Excel o simplemente papel y lápiz. Lo importante no es la herramienta sofisticada, sino la constancia en usarla. Elige la que te resulte más natural y cómoda.', 'La consistencia importa más que la herramienta', 'Elige UN método y comprométete a usarlo por 3 meses seguidos', 50, 5, 11),
('card_pres_012', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Base Cero', 'Cada peso de tus ingresos debe tener un destino asignado antes de gastarlo: gastos, ahorros o inversiones. Al final, ingresos menos todos los gastos planeados debe ser igual a cero.', 'Dale un propósito específico a cada peso que ganas', 'Antes de recibir tu próximo sueldo, asigna destino a cada peso', 60, 5, 12),
('card_pres_013', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Errores Comunes en Presupuestos', 'No incluir gastos anuales (seguros, regalos navideños), ser demasiado restrictivo, o no ajustar cuando la vida cambia. Un presupuesto irreal es peor que no tener presupuesto.', 'Un presupuesto irreal es un presupuesto destinado al fracaso', 'Lista 5 gastos anuales que a menudo se olvidan en presupuestos', 55, 5, 13),
('card_pres_014', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Semanal', 'Además del presupuesto mensual, crea un presupuesto semanal para gastos variables como comida y entretenimiento. Te da mejor control del día a día y evita que llegues a fin de mes sin dinero.', 'El control semanal mejora el control mensual', 'Divide tu presupuesto mensual de gastos variables entre 4 semanas', 50, 5, 14),
('card_pres_015', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Dinero de Bolsillo Personal', 'Asígnate una cantidad fija semanal de "dinero libre" que puedes gastar en lo que quieras, sin explicaciones ni registros. Te da libertad dentro del control y hace el presupuesto más sostenible.', 'Un poco de libertad financiera es psicológicamente necesaria', 'Define tu "dinero libre" semanal y respeta ese límite', 55, 5, 15),
('card_pres_016', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Comparar Precios Grandes', 'Para compras mayores a $500, compara precios en al menos 3 lugares diferentes antes de decidir. Esta simple práctica puede ahorrarte hasta 30% en electrónicos, muebles y servicios.', 'Comparar precios es dinero directo en tu bolsillo', 'Para tu próxima compra grande, busca 3 opciones antes de decidir', 45, 5, 16),
('card_pres_017', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Lista de Compras Obligatoria', 'Nunca vayas al supermercado sin lista y presupuesto definido. Las compras impulsivas pueden aumentar tu gasto en 25-40%. La lista es tu escudo contra el marketing de los comercios.', 'Una lista de compras previene gastos impulsivos costosos', 'Haz la lista de compras antes de salir, nunca en el lugar', 50, 5, 17),
('card_pres_018', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Negociar Servicios Fijos', 'Internet, cable, seguros, telefonía: negocia estos servicios al menos una vez al año. Muchas empresas ofrecen descuentos significativos para retener clientes que están considerando cambiar.', 'Negociar servicios es parte del presupuesto inteligente', 'Llama a renegociar al menos un servicio fijo este mes', 55, 5, 18),
('card_pres_019', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Estacionales', 'Navidad, vacaciones, regreso a clases: estos gastos son predecibles pero a menudo nos sorprenden. Planifica y ahorra para ellos durante todo el año, no solo cuando llegan.', 'Los gastos estacionales son predecibles si planificas', 'Abre una cuenta específica para gastos estacionales', 60, 5, 19),
('card_pres_020', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Pareja', 'Si tienes pareja, decidan juntos quién paga qué y cómo manejar gastos compartidos. Definan reglas claras para evitar conflictos. La comunicación financiera es clave en las relaciones.', 'Las finanzas de pareja requieren transparencia total', 'Tengan una conversación honesta sobre dinero esta semana', 55, 5, 20),
('card_pres_021', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Automatizar Pagos Inteligentemente', 'Automatiza pagos fijos para evitar cargos por retraso, pero mantén control revisando estados de cuenta mensualmente. La automatización debe simplificar, no ocultar tus finanzas.', 'Automatiza pagos pero mantén supervisión activa', 'Automatiza al menos 3 pagos fijos y agenda revisión mensual', 50, 5, 21),
('card_pres_022', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Viaje', 'Para vacaciones, presupuesta por separado: transporte, alojamiento, comida, actividades y 20% extra para imprevistos. Nunca viajes sin saber cuánto puedes gastar en total.', 'Un viaje sin presupuesto puede arruinar tu situación financiera', 'Para tu próximo viaje, presupuesta cada categoría por separado', 60, 5, 22),
('card_pres_023', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto para Hijos', 'Los niños generan gastos específicos: ropa, útiles escolares, actividades, salud. Presupuesta estos gastos y aprovecha para enseñar a tus hijos el valor del dinero desde pequeños.', 'Los hijos deben entender y participar del presupuesto familiar', 'Incluye a tus hijos en decisiones de gastos apropiadas para su edad', 55, 5, 23),
('card_pres_024', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Ajustar el Presupuesto', 'Tu presupuesto debe cambiar con tu vida: nuevo trabajo, mudanza, hijos, cambios de ingresos. Revísalo completamente cada 6 meses o cuando haya cambios importantes en tu vida.', 'Un presupuesto rígido se rompe fácilmente ante cambios', 'Programa revisiones completas del presupuesto cada 6 meses', 50, 5, 24),
('card_pres_025', (SELECT id FROM public.education_modules WHERE slug = 'mod_presupuesto'), 'Celebrar el Éxito', 'Cuando logres cumplir tu presupuesto por 3 meses seguidos, celébralo con algo especial (dentro del presupuesto, por supuesto). Los pequeños logros merecen reconocimiento y te motivan a continuar.', 'Celebrar el progreso financiero te motiva a continuar mejorando', 'Define una pequeña recompensa por cumplir tu presupuesto 3 meses', 45, 5, 25);

-- MÓDULO 2: ESTRATEGIAS DE AHORRO (22 cards)  
INSERT INTO public.education_cards (slug, module_id, title, content, key_takeaway, practical_tip, reading_time_seconds, xp_reward, display_order) VALUES
('card_ahorro_001', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Por Qué Ahorrar es Fundamental', 'Ahorrar te da tres cosas invaluables: seguridad ante emergencias, oportunidades cuando aparecen, y paz mental para dormir tranquilo. Es la diferencia entre sobrevivir mes a mes y tener opciones en la vida.', 'Ahorrar es invertir en tu tranquilidad y libertad futura', 'Define 3 razones personales específicas por las que quieres ahorrar', 45, 5, 1),
('card_ahorro_002', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'La Regla del 1% Adicional', 'Cada mes, trata de ahorrar 1% más de tus ingresos que el mes anterior. Si empiezas con 5%, el próximo mes ahorra 6%. Los incrementos pequeños son invisibles pero se acumulan dramáticamente.', 'El 1% adicional mensual se hace invisible pero suma enormemente', 'Aumenta tu porcentaje de ahorro en 1% este mes', 50, 5, 2),
('card_ahorro_003', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Ahorro Automático', 'Programa una transferencia automática a ahorros el mismo día que recibes tu sueldo, antes de que tengas tiempo de gastar. Si no ves el dinero, no lo extrañas.', 'Automatizar ahorros elimina la tentación y la excusa', 'Configura una transferencia automática a ahorros hoy mismo', 55, 5, 3),
('card_ahorro_004', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Método de los Sobres', 'Usa sobres físicos o cuentas digitales separadas para diferentes categorías de gasto. Cuando se acaba el dinero del sobre, se acabó el gasto para esa categoría hasta el próximo mes.', 'Los límites físicos controlan mejor el gasto que la voluntad', 'Implementa el método de sobres por un mes completo', 60, 5, 4),
('card_ahorro_005', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Desafío de 30 Días', 'Por 30 días, guarda todo el cambio suelto que recibas. Además, ahorra $10 pesos cada día sin excepción. Al final del mes te sorprenderás de la cantidad acumulada.', 'Los pequeños ahorros diarios se convierten en sumas sorprendentes', 'Empieza hoy mismo el desafío de 30 días', 50, 5, 5),
('card_ahorro_006', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Eliminar Suscripciones Fantasma', 'Revisa tu estado de cuenta y cancela suscripciones que no usas activamente: streaming, apps premium, revistas, gimnasios. Puede liberarte $200-500 pesos mensuales sin afectar tu vida.', 'Las suscripciones olvidadas drenan tu dinero silenciosamente', 'Haz una auditoría completa de todas tus suscripciones activas', 55, 5, 6),
('card_ahorro_007', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Compras Planificadas', 'Nunca compres sin lista, especialmente en supermercados. Las compras impulsivas pueden aumentar tu gasto total en 25-40%. Una lista simple es tu mejor defensa.', 'Una lista de compras es tu escudo más efectivo contra impulsos', 'Durante una semana, compra solo con lista previa', 45, 5, 7),
('card_ahorro_008', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Regla de las 24 Horas', 'Para cualquier compra mayor a $500 pesos, espera 24 horas antes de comprar. La mayoría de las veces la urgencia desaparece y te das cuenta de que no lo necesitabas.', 'El tiempo enfría las decisiones impulsivas y caras', 'Aplica la regla de 24 horas en tu próxima compra grande', 50, 5, 8),
('card_ahorro_009', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Cocinar en Casa', 'Cocinar en casa cuesta 3-4 veces menos que comer fuera. Una comida casera de $30 pesos vs $120 en restaurante. Además tienes control sobre calidad e ingredientes.', 'Cocinar en casa es una de las estrategias de ahorro más poderosas', 'Proponte cocinar al menos 5 comidas en casa esta semana', 55, 5, 9),
('card_ahorro_010', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Transporte Inteligente', 'Camina, usa bicicleta o transporte público cuando sea posible. El costo real de mantener un auto puede superar los $3000-5000 pesos mensuales entre combustible, mantenimiento, seguro e impuestos.', 'Cada viaje en auto personal tiene un costo real significativo', 'Calcula el costo real total de tu transporte mensual', 60, 5, 10),
('card_ahorro_011', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Mercado de Segunda Mano', 'Para libros, ropa, muebles, electrónicos, considera opciones de segunda mano. Puedes ahorrar 50-70% en artículos prácticamente nuevos con la misma funcionalidad.', 'Lo usado no significa inferior en calidad o función', 'Busca una alternativa de segunda mano para tu próxima compra', 55, 5, 11),
('card_ahorro_012', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Ofertas Inteligentes', 'Usa cupones y busca ofertas, pero SOLO para cosas que realmente necesitabas comprar. Una oferta del 50% en algo innecesario sigue siendo un gasto innecesario.', 'Una oferta solo es buena si era una necesidad real', 'Usa cupones únicamente para productos que ya estaban en tu lista', 50, 5, 12),
('card_ahorro_013', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Agua vs Bebidas Comerciales', 'Reemplazar refrescos, jugos comerciales y café caro por agua simple puede ahorrarte $200-400 pesos mensuales. Además es infinitamente más saludable para tu cuerpo.', 'El agua es gratis, saludable y satisface la sed real', 'Lleva una botella de agua reutilizable durante una semana completa', 45, 5, 13),
('card_ahorro_014', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Entretenimiento Gratuito', 'Parques públicos, bibliotecas, eventos culturales gratuitos, videojuegos que ya tienes, tiempo con amigos en casa. El entretenimiento de calidad no requiere gastar dinero constantemente.', 'La diversión auténtica frecuentemente no requiere dinero', 'Encuentra 3 actividades gratuitas disponibles en tu ciudad', 55, 5, 14),
('card_ahorro_015', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Eficiencia Energética', 'Apagar luces, desconectar aparatos en standby, usar ventiladores en lugar de aire acondicionado. Pequeños cambios pueden reducir tu recibo eléctrico 15-25% mensualmente.', 'Cada aparato desconectado es dinero que permanece en tu bolsillo', 'Identifica 5 maneras concretas de reducir tu consumo eléctrico', 50, 5, 15),
('card_ahorro_016', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Reparar vs Reemplazar', 'Antes de tirar algo roto, investiga cuánto cuesta repararlo profesionalmente. Frecuentemente reparar cuesta 20-30% de comprar nuevo y extiende significativamente la vida útil.', 'Reparar inteligentemente extiende la vida de tus posesiones', 'Repara algo que estabas considerando reemplazar', 55, 5, 16),
('card_ahorro_017', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Ahorros en el Banco', 'Mantén tus ahorros en cuentas bancarias, no en efectivo en casa. En casa es fácil gastarlos impulsivamente y no generan ningún interés. El banco los protege y los hace crecer.', 'Los ahorros en casa son vulnerables a gastos impulsivos', 'Transfiere todo efectivo de emergencia guardado en casa al banco', 50, 5, 17),
('card_ahorro_018', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Motivación Visual', 'Coloca una foto de tu meta de ahorro (viaje, casa, auto, educación) donde la veas diariamente. La motivación visual constante refuerza tu compromiso con el ahorro.', 'Ver tu meta diariamente refuerza tu motivación para ahorrar', 'Imprime y pega una foto de tu meta en tu espejo o refrigerador', 45, 5, 18),
('card_ahorro_019', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Protección Contra Inflación', 'En países con inflación alta, tu dinero pierde poder adquisitivo cada día. Busca cuentas de ahorro que ofrezcan tasas que protejan contra el aumento de precios.', 'La inflación es el enemigo silencioso del dinero estancado', 'Investiga qué opciones de ahorro protegen contra inflación en tu país', 60, 5, 19),
('card_ahorro_020', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Auditoria de Gastos Fantasma', 'Revisa línea por línea tus estados de cuenta bancarios y busca cargos que no reconoces o autorización automática que olvidaste. Estos gastos fantasma pueden costarte $100-300 mensuales.', 'Los gastos fantasma drenan dinero sin que lo notes', 'Dedica 30 minutos a revisar línea por línea tu último estado de cuenta', 55, 5, 20),
('card_ahorro_021', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Grupo de Ahorro', 'Únete a un grupo de ahorro o encuentra un compañero de ahorro con metas similares. La presión social positiva y el apoyo mutuo facilitan mantener el hábito.', 'Ahorrar acompañado es más fácil y motivante que hacerlo solo', 'Encuentra una persona para ser compañeros de ahorro este mes', 50, 5, 21),
('card_ahorro_022', (SELECT id FROM public.education_modules WHERE slug = 'mod_ahorro'), 'Compras Estacionales Inteligentes', 'Compra ropa de invierno en verano y viceversa. Compra útiles escolares después del regreso a clases. Aprovechar ciclos estacionales puede ahorrarte hasta 50% en ciertos productos.', 'Comprar fuera de temporada alta genera ahorros significativos', 'Planifica una lista de compras estacionales para el próximo año', 55, 5, 22);

-- MÓDULO 3: MANEJO DE DEUDAS (23 cards)
INSERT INTO public.education_cards (slug, module_id, title, content, key_takeaway, practical_tip, reading_time_seconds, xp_reward, display_order) VALUES
('card_deudas_001', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Deuda Buena vs Deuda Mala', 'Deuda buena te ayuda a generar ingresos o aumentar patrimonio (hipoteca de casa, préstamo para educación, inversión en negocio). Deuda mala financia consumo que se deprecia (tarjetas para vacaciones, auto nuevo por estatus).', 'No todas las deudas son iguales: algunas construyen riqueza', 'Clasifica todas tus deudas actuales como buenas o malas', 50, 5, 1),
('card_deudas_002', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Inventario Completo de Deudas', 'Haz una lista detallada: acreedor, monto total adeudado, pago mínimo mensual, tasa de interés anual, fecha de vencimiento. Conocer el panorama completo es el primer paso para tomar control.', 'No puedes manejar efectivamente lo que no conoces completamente', 'Crea una hoja de cálculo con todas tus deudas y sus detalles', 60, 5, 2),
('card_deudas_003', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Método Bola de Nieve', 'Paga mínimos en todas las deudas, pero pon dinero extra en la deuda más pequeña. Al eliminarla completamente, usa ese dinero para atacar la siguiente más pequeña. El impulso psicológico es poderoso.', 'Eliminar deudas pequeñas genera impulso psicológico para continuar', 'Ordena tus deudas de menor a mayor monto total', 55, 5, 3),
('card_deudas_004', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Método Avalancha', 'Paga mínimos en todas las deudas, pero pon dinero extra en la deuda con mayor tasa de interés. Matemáticamente más eficiente, te ahorra más dinero a largo plazo.', 'Las tasas de interés altas cuestan más dinero con el tiempo', 'Ordena tus deudas de mayor a menor tasa de interés', 55, 5, 4),
('card_deudas_005', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'La Trampa del Pago Mínimo', 'Pagar solo el mínimo en tarjetas de crédito puede tomar 20-30 años en liquidar la deuda. Los intereses compuestos trabajan contra ti, convirtiendo compras pequeñas en sumas enormes.', 'El pago mínimo es una trampa financiera de largo plazo', 'Calcula cuánto tiempo tomarías pagando solo mínimos en tus tarjetas', 60, 5, 5),
('card_deudas_006', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Consolidación de Deudas', 'Si tienes múltiples deudas con tasas altas, considera consolidarlas en una sola con tasa menor. Simplifica tus pagos y puede reducir significativamente los intereses totales.', 'Consolidar correctamente puede simplificar pagos y ahorrar dinero', 'Investiga opciones de consolidación disponibles en tu situación', 55, 5, 6),
('card_deudas_007', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Negociar con Acreedores', 'Si tienes dificultades para pagar, comunícate proactivamente con tus acreedores. Muchos prefieren recibir algo a nada y pueden ofrecer planes de pago o reducciones.', 'Los acreedores prefieren cobrar algo que perder todo', 'Si tienes atrasos, llama a negociar antes de que empeore', 50, 5, 7),
('card_deudas_008', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Prevenir Nuevas Deudas', 'Mientras pagas deudas existentes, evita crear nuevas a toda costa. Considera cortar tarjetas de crédito físicamente o dárselas a alguien de confianza para guardar.', 'No llenes un hoyo financiero mientras cavas otro más profundo', 'Remueve físicamente las tarjetas de crédito de tu cartera por un mes', 45, 5, 8),
('card_deudas_009', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Ingresos Extra para Deudas', 'Vende cosas que no usas, trabaja horas extra, busca trabajos de fin de semana, ofrece servicios freelance. Todo peso de ingreso extra debe ir directo a eliminar deudas.', 'Los ingresos adicionales aceleran dramáticamente la eliminación de deudas', 'Identifica una fuente de ingreso extra que puedas implementar este mes', 55, 5, 9),
('card_deudas_010', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Presupuesto Anti-Deuda', 'Crea un presupuesto extremadamente apretado donde cada peso no esencial vaya a pagar deudas. Vive temporalmente con lo mínimo indispensable hasta estar libre.', 'Un presupuesto agresivo temporal acelera la libertad financiera permanente', 'Reduce todos los gastos no esenciales por 3 meses', 60, 5, 10),
('card_deudas_011', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Emergencia vs Deuda', 'Si no tienes fondo de emergencia pero sí deudas, ahorra $500-1000 para emergencias mínimas, luego enfócate 100% en eliminar deudas. Un pequeño colchón previene más deudas.', 'Un fondo mínimo de emergencia previene caer en más deudas', 'Ahorra $500 para emergencias antes de atacar deudas agresivamente', 55, 5, 11),
('card_deudas_012', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Impacto Psicológico de las Deudas', 'Las deudas causan estrés crónico, afectan relaciones personales y salud mental. Reconoce el impacto emocional real y busca apoyo profesional si lo necesitas.', 'Las deudas afectan mucho más que solo las finanzas', 'Habla abiertamente con alguien de confianza sobre tus deudas', 50, 5, 12),
('card_deudas_013', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Sincronizar Fechas de Pago', 'Programa todos los pagos de deudas para el mismo día del mes (idealmente después de recibir ingresos). Esto simplifica tu administración y evita olvidos costosos.', 'Sincronizar fechas de pago evita olvidos y cargos adicionales', 'Cambia todas las fechas de pago de deudas al mismo día', 45, 5, 13),
('card_deudas_014', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Uso Inteligente de Tarjetas', 'Las tarjetas de crédito son herramientas, no dinero extra. Úsalas solo si puedes pagar el total cada mes. Si no puedes, no las uses para nada.', 'Las tarjetas de crédito son herramientas financieras, no ingresos adicionales', 'Comprométete a usar solo efectivo por un mes completo', 50, 5, 14),
('card_deudas_015', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Interés Compuesto Negativo', 'Los intereses de las deudas trabajan contra ti con poder compuesto. Una tasa del 30% anual significa que tu deuda puede duplicarse en menos de 3 años sin pagos.', 'El interés compuesto puede ser tu peor enemigo financiero', 'Calcula cómo crecerían tus deudas actuales sin hacer pagos', 60, 5, 15),
('card_deudas_016', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Refinanciamiento Inteligente', 'Si tu score crediticio ha mejorado desde que adquiriste las deudas, puedes calificar para tasas menores. Refinanciar puede reducir significativamente los intereses.', 'Un mejor score crediticio merece mejores tasas de interés', 'Revisa tu score crediticio y opciones de refinanciamiento disponibles', 55, 5, 16),
('card_deudas_017', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Riesgos de Ser Avalista', 'Ser avalista de alguien más significa que eres legalmente responsable si esa persona no paga. Solo hazlo si puedes y estás dispuesto a asumir el 100% de esa deuda.', 'Ser avalista es esencialmente asumir una deuda potencial completa', 'Piensa muy cuidadosamente antes de ser avalista de alguien', 50, 5, 17),
('card_deudas_018', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Deudas con Familia', 'Los préstamos familiares pueden dañar relaciones permanentemente. Si pides prestado a familia, trata como deuda formal: contrato escrito, plazos claros, intereses justos.', 'Las deudas familiares requieren mayor cuidado y formalidad', 'Formaliza por escrito cualquier préstamo familiar existente', 55, 5, 18),
('card_deudas_019', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Score Crediticio', 'Tu historial de pagos afecta directamente tu score crediticio. Un buen score te da acceso a mejores tasas, productos financieros y oportunidades futuras.', 'Un score crediticio sólido te ahorra dinero en el futuro', 'Consulta tu score crediticio gratuito y entiende cómo mejorarlo', 50, 5, 19),
('card_deudas_020', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Deuda vs Inversión', 'Si tienes deudas con interés mayor al 8%, generalmente es mejor pagarlas antes que invertir. Eliminar deuda es una inversión garantizada con rendimiento igual a la tasa de interés.', 'Pagar deudas es una inversión garantizada con rendimiento conocido', 'Compara las tasas de tus deudas vs rendimientos potenciales de inversión', 60, 5, 20),
('card_deudas_021', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Plan de Eliminación con Fechas', 'Crea un calendario específico de cuándo estarás libre de cada deuda individual. Tener fechas concretas te mantiene motivado y enfocado en el progreso.', 'Un plan con fechas específicas convierte sueños en metas alcanzables', 'Calcula y anota cuándo estarás libre de cada deuda', 55, 5, 21),
('card_deudas_022', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Celebrar Pagos Completados', 'Cuando liquides completamente una deuda, celébralo de manera significativa (sin crear nueva deuda). Reconoce el logro antes de pasar inmediatamente a la siguiente.', 'Celebrar el progreso mantiene la motivación para continuar', 'Planifica cómo celebrarás apropiadamente tu primera deuda eliminada', 45, 5, 22),
('card_deudas_023', (SELECT id FROM public.education_modules WHERE slug = 'mod_deudas'), 'Libertad Financiera Total', 'Estar completamente libre de deudas te da opciones reales en la vida: cambiar trabajo, tomar riesgos calculados, ayudar a otros, perseguir sueños. La libertad financiera empieza con cero deudas.', 'Sin deudas tienes infinitamente más opciones y libertad en la vida', 'Visualiza específicamente cómo será tu vida sin ninguna deuda', 50, 5, 23),

-- MÓDULO 4: PRIMEROS PASOS EN INVERSIÓN (25 cards)
('card_inversion_001', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Por Qué Invertir es Necesario', 'Invertir es la única manera comprobada de hacer que tu dinero crezca más rápido que la inflación a largo plazo. Es literalmente poner tu dinero a trabajar para generar más dinero mientras duermes.', 'La inversión inteligente protege y multiplica tu patrimonio', 'Define claramente por qué quieres empezar a invertir tu dinero', 45, 5, 1),
('card_inversion_002', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Riesgo vs Rendimiento', 'Todas las inversiones reales tienen algún nivel de riesgo. Mayor rendimiento potencial generalmente significa mayor riesgo. No existe inversión legítima sin riesgo que ofrezca altos rendimientos.', 'Riesgo y rendimiento siempre van de la mano en inversiones', 'Evalúa honestamente tu tolerancia personal al riesgo financiero', 55, 5, 2),
('card_inversion_003', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Diversificación Básica', 'No pongas todo tu dinero en una sola inversión o tipo de inversión. Diversifica entre diferentes clases: acciones, bonos, bienes raíces, para reducir riesgo total.', 'Diversificar es la estrategia de no poner todos los huevos en una canasta', 'Identifica 3-4 tipos diferentes de inversión para considerar', 50, 5, 3),
('card_inversion_004', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Horizonte de Tiempo de Inversión', 'Define claramente cuándo necesitarás el dinero. Corto plazo (1-3 años): inversiones conservadoras. Largo plazo (5+ años): puedes asumir más riesgo para mayor crecimiento.', 'El horizonte de tiempo determina el tipo de inversión apropiada', 'Define el horizonte de tiempo específico para tu dinero de inversión', 60, 5, 4),
('card_inversion_005', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Fondos de Inversión', 'Los fondos agrupan dinero de muchos inversionistas para comprar diversas inversiones profesionalmente gestionadas. Es una manera accesible de diversificar con relativamente poco dinero.', 'Los fondos de inversión ofrecen diversificación automática y profesional', 'Investiga 3 fondos de inversión disponibles y accesibles en tu país', 55, 5, 5),
('card_inversion_006', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Costo de Oportunidad', 'Cada peso que no inviertes inteligentemente es un peso que no está creciendo. En 10 años, $1000 pesos pueden valer $500 por inflación o $2000+ por inversión inteligente.', 'No invertir también es una decisión financiera con costo real', 'Calcula cuánto podrían valer $1000 pesos en 10 años invertidos vs no invertidos', 60, 5, 6),
('card_inversion_007', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Poder del Interés Compuesto', 'Es interés ganado sobre interés anterior. $1000 al 10% anual: año 1 = $1100, año 2 = $1210, año 10 = $2594. El tiempo multiplica exponencialmente tu dinero.', 'El interés compuesto es la fuerza más poderosa en finanzas', 'Calcula el crecimiento compuesto de una cantidad durante 20 años', 55, 5, 7),
('card_inversion_008', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Comenzar con Poco', 'Puedes empezar a invertir con $100-500 pesos en muchas plataformas modernas. Lo crucial es comenzar y aprender. El hábito de inversión es más valioso que la cantidad inicial.', 'Comenzar a invertir es más importante que la cantidad inicial', 'Define la cantidad mínima con la que puedes empezar a invertir', 50, 5, 8),
('card_inversion_009', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Educación Antes de Inversión', 'Nunca inviertas en algo que no entiendes completamente. Lee libros, toma cursos, pregunta a expertos. Una mala decisión por ignorancia puede costarte años de trabajo.', 'La ignorancia financiera es el mayor riesgo en inversiones', 'Comprométete a leer al menos un libro sobre inversiones este mes', 55, 5, 9),
('card_inversion_010', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Inversión vs Especulación', 'Invertir es comprar activos que generen valor real a largo plazo basado en análisis. Especular es apostar a movimientos de precios a corto plazo sin análisis fundamental.', 'Invertir es planificar inteligentemente, especular es apostar sin fundamento', 'Decide claramente si quieres ser inversionista o especulador', 50, 5, 10),
('card_inversion_011', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Inflación e Inversión', 'Si la inflación anual es 5% y tu inversión rinde 4%, estás perdiendo poder adquisitivo real. Tu inversión debe superar consistentemente la inflación para generar riqueza real.', 'Superar la inflación es el requisito mínimo en inversiones exitosas', 'Busca y anota la tasa de inflación actual de tu país', 55, 5, 11),
('card_inversion_012', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Liquidez de Inversiones', 'Liquidez es qué tan rápida y fácilmente puedes convertir tu inversión en efectivo. Acciones = alta liquidez, bienes raíces = baja liquidez. Considera tus necesidades.', 'Considera qué tan rápido podrías necesitar acceso a tu dinero', 'Clasifica tus posibles inversiones por nivel de liquidez', 50, 5, 12),
('card_inversion_013', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Costos Ocultos de Inversión', 'Todas las inversiones tienen costos: comisiones de compra/venta, fees de administración, impuestos. Un 2% de costo anual puede reducir dramáticamente tus ganancias a largo plazo.', 'Los costos altos se comen silenciosamente tus ganancias de inversión', 'Investiga todos los costos asociados con diferentes opciones de inversión', 60, 5, 13),
('card_inversion_014', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Perfil de Inversionista', 'Conservador (poco riesgo, menor rendimiento), moderado (riesgo medio, rendimiento medio), agresivo (alto riesgo, mayor rendimiento potencial). Conoce tu perfil real, no el que aspiras.', 'Tu perfil de riesgo real determina dónde debes invertir', 'Completa un cuestionario de perfil de inversionista profesional', 55, 5, 14),
('card_inversion_015', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Dollar Cost Averaging', 'Invierte la misma cantidad cada mes independientemente de si el precio está alto o bajo. A largo plazo, esto promedia el costo de compra y reduce el riesgo de timing.', 'Invertir regularmente elimina la necesidad de adivinar el timing del mercado', 'Establece una inversión automática mensual fija', 60, 5, 15),
('card_inversion_016', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Control de Emociones', 'El miedo y la codicia son los peores enemigos del inversionista. Comprar por pánico en las bajas o vender por euforia en las altas destroza los rendimientos a largo plazo.', 'Las emociones descontroladas son el mayor enemigo del inversionista exitoso', 'Define reglas de inversión por escrito cuando estés calmado y racional', 55, 5, 16),
('card_inversion_017', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Diferencia: Ahorro vs Inversión', 'Ahorrar preserva dinero con seguridad, invertir lo hace crecer con riesgo. Necesitas ambos: ahorros para emergencias y seguridad, inversiones para crecimiento y riqueza.', 'Ahorro proporciona seguridad, inversión proporciona crecimiento', 'Define claramente cuánto ahorrar vs cuánto invertir de tus ingresos', 50, 5, 17),
('card_inversion_018', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Investigación Previa', 'Lee estados financieros, reportes anuales, noticias especializadas de la empresa o fondo antes de invertir. Una hora de investigación puede ahorrarte años de pérdidas.', 'La investigación previa es tu mejor protección contra pérdidas', 'Dedica al menos 2 horas a investigar tu próxima opción de inversión', 55, 5, 18),
('card_inversion_019', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Reinvertir Ganancias', 'Cuando tu inversión genere dividendos o ganancias, reinviértelas automáticamente en lugar de gastarlas. Esto acelera exponencialmente el crecimiento de tu patrimonio.', 'Reinvertir ganancias multiplica el poder del crecimiento compuesto', 'Configura reinversión automática de dividendos en tus primeras inversiones', 50, 5, 19),
('card_inversion_020', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Timing del Mercado', 'Es prácticamente imposible predecir perfectamente cuándo comprar o vender. Los inversionistas más exitosos compran activos de calidad y los mantienen a largo plazo.', 'Tiempo en el mercado vence consistentemente timing del mercado', 'Enfócate en tiempo de permanencia, no en intentar timing perfecto', 55, 5, 20),
('card_inversion_021', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Estrategia Pasiva vs Activa', 'Inversión pasiva: comprar y mantener (como fondos índice). Activa: comprar y vender frecuentemente. Históricamente, la estrategia pasiva supera a la activa para la mayoría.', 'Simple y constante generalmente funciona mejor que complejo y activo', 'Decide si prefieres una estrategia de inversión pasiva o activa', 60, 5, 21),
('card_inversion_022', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Impuestos sobre Inversiones', 'Las ganancias de inversiones pueden generar obligaciones fiscales significativas. Conoce las reglas tributarias de tu país para optimizar tus rendimientos netos después de impuestos.', 'Planifica los impuestos de tus inversiones desde el principio', 'Investiga el tratamiento fiscal específico de inversiones en tu país', 55, 5, 22),
('card_inversion_023', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Rebalanceo de Portafolio', 'Revisa y ajusta tu portafolio cada 6-12 meses. Si planeaste 60% acciones/40% bonos, mantén esa proporción vendiendo lo que subió y comprando lo que bajó.', 'Rebalancear regularmente mantiene tu estrategia de inversión en curso', 'Programa rebalanceos regulares de tu portafolio de inversión', 60, 5, 23),
('card_inversion_024', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Errores Comunes de Principiantes', 'Pánico en caídas del mercado, euforia en subidas, no diversificar, seguir consejos sin investigar, intentar timing del mercado, no tener plan claro a largo plazo.', 'Conocer errores comunes te ayuda a evitarlos proactivamente', 'Identifica cuáles errores comunes de inversión podrías estar cometiendo', 50, 5, 24),
('card_inversion_025', (SELECT id FROM public.education_modules WHERE slug = 'mod_inversion'), 'Inversión Como Hábito', 'Convierte la inversión en un hábito mensual automático, como pagar servicios básicos. La constancia en inversión es más poderosa que grandes cantidades esporádicas.', 'La inversión constante y disciplinada vence las grandes sumas ocasionales', 'Programa transferencias automáticas mensuales para inversiones', 55, 5, 25),

-- MÓDULO 5: PLANIFICACIÓN FINANCIERA (25 cards)
('card_plan_001', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Crear una Visión Financiera', 'Define claramente dónde quieres estar financieramente en 5, 10 y 20 años. Una visión específica y escrita guía todas tus decisiones financieras diarias y te mantiene motivado.', 'Sin una visión clara, cualquier camino financiero lleva a cualquier lugar', 'Escribe tu visión financiera específica para los próximos 10 años', 50, 5, 1),
('card_plan_002', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Metas SMART Financieras', 'Específicas, Medibles, Alcanzables, Relevantes, con Tiempo definido. "Ahorrar para casa" es vago e inútil. "Ahorrar $50,000 para enganche de casa en 3 años" es una meta SMART efectiva.', 'Las metas financieras vagas producen consistentemente resultados vagos', 'Convierte una meta financiera vaga en una meta SMART específica', 60, 5, 2),
('card_plan_003', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Priorizar Metas Financieras', 'Tendrás múltiples metas simultáneas. Priorízalas claramente: emergencias primero, luego retiro, después casa, luego viajes. El enfoque da poder, la dispersión da mediocridad.', 'Muchas metas financieras simultáneas equivalen a no tener ninguna meta real', 'Ordena todas tus metas financieras por prioridad absoluta', 55, 5, 3),
('card_plan_004', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Fondo de Emergencia Prioritario', 'Antes que cualquier otra meta financiera, establece 3-6 meses de gastos básicos guardados para emergencias reales. Esto es tu red de seguridad financiera fundamental.', 'El fondo de emergencia es la base inquebrantable de toda planificación financiera', 'Calcula exactamente cuánto necesitas para 6 meses de gastos básicos', 55, 5, 4),
('card_plan_005', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificación para el Retiro', 'Nunca es demasiado temprano para planificar la jubilación. Empezar a ahorrar para retiro a los 25 vs 35 años puede significar literalmente el doble de dinero disponible.', 'En planificación de retiro, el tiempo es tu aliado más poderoso', 'Calcula cuánto necesitarías ahorrar mensualmente para un retiro digno', 60, 5, 5),
('card_plan_006', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Revisión Financiera Anual', 'Cada año, dedica tiempo serio a revisar tu plan financiero completo. La vida cambia constantemente y tu plan debe adaptarse: nuevo trabajo, familia, metas diferentes.', 'Un plan financiero que no se revisa regularmente se vuelve obsoleto', 'Programa en tu calendario tu revisión financiera anual', 50, 5, 6),
('card_plan_007', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Automatización Inteligente', 'Automatiza todo lo posible: ahorros para metas, inversiones, pagos de deudas. La automatización elimina la dependencia de fuerza de voluntad y disciplina diaria.', 'La automatización financiera convierte buenas intenciones en realidad', 'Automatiza al menos 3 aspectos críticos de tus finanzas personales', 55, 5, 7),
('card_plan_008', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Seguros como Protección', 'Los seguros apropiados protegen tu plan financiero de eventos inesperados devastadores. Vida, salud, auto, hogar: evalúa qué necesitas según tu situación específica.', 'Los seguros son el paraguas que protege tu planificación financiera', 'Evalúa qué seguros necesitas según tu situación actual', 60, 5, 8),
('card_plan_009', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Testamento y Planificación de Herencia', 'Aunque seas joven, ten un testamento básico actualizado. Define claramente quién recibe qué si algo te pasa. Protege a tus seres queridos de problemas legales innecesarios.', 'Un testamento claro protege a quienes amas de complicaciones', 'Investiga cómo hacer un testamento básico legal en tu país', 55, 5, 9),
('card_plan_010', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Educación Financiera Continua', 'El mundo financiero evoluciona constantemente. Comprométete a leer un libro financiero por año, seguir blogs especializados, tomar cursos. La educación es inversión perpetua.', 'La educación financiera nunca termina, siempre puedes mejorar', 'Elige un libro financiero específico para leer este mes', 50, 5, 10),
('card_plan_011', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificación Financiera Familiar', 'Si tienes familia, involúcralos activamente en la planificación. Todos deben conocer y entender las metas familiares y cómo sus acciones individuales las afectan.', 'La planificación financiera familiar requiere participación de todos los miembros', 'Organiza una reunión familiar específica sobre metas financieras', 55, 5, 11),
('card_plan_012', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Costo Real de Tener Hijos', 'Los hijos son maravillosos pero financieramente costosos. Planifica gastos realistas: pañales, comida, educación, salud. Un hijo puede costar $200,000+ hasta los 18 años.', 'Los hijos requieren planificación financiera específica y realista', 'Si planeas tener hijos, investiga y presupuesta los costos reales', 60, 5, 12),
('card_plan_013', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificación para Compra de Casa', 'Comprar casa es la mayor compra de la mayoría de personas. Planifica integralmente: enganche (10-20%), gastos de cierre, pagos mensuales, mantenimiento, impuestos prediales.', 'Comprar casa requiere planificación financiera integral, no solo el enganche', 'Calcula todos los costos reales y ocultos de comprar una casa', 60, 5, 13),
('card_plan_014', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificar Cambios de Carrera', 'Los cambios de carrera son normales pero impactan significativamente las finanzas. Planifica: ahorros para transición, nueva certificación, posible reducción temporal de ingresos.', 'Los cambios de carrera requieren preparación financiera anticipada', 'Si planeas cambio de carrera, presupuesta toda la transición', 55, 5, 14),
('card_plan_015', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Presupuesto para Vacaciones', 'Los viajes enriquecen la vida pero pueden arruinar finanzas si no se planifican apropiadamente. Crea un fondo específico y viaja solo dentro de tus posibilidades reales.', 'Viajar sin planificación financiera puede costarte muy caro', 'Crea un plan de ahorro específico para tu próximo viaje', 50, 5, 15),
('card_plan_016', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificación Tributaria', 'Los impuestos son un gasto significativo que se puede optimizar. Planifica: deducciones legales, inversiones que reduzcan impuestos, timing de ingresos y gastos.', 'Una planificación tributaria inteligente te ahorra dinero real', 'Busca un contador para optimizar legalmente tus impuestos', 60, 5, 16),
('card_plan_017', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Desarrollar un Plan B Financiero', 'Siempre ten un Plan B detallado: qué harías específicamente si pierdes el trabajo, si te enfermas, si hay crisis económica. Los planes alternativos dan tranquilidad real.', 'Un Plan B financiero sólido te protege de lo inesperado', 'Define tu Plan B específico para pérdida de empleo', 55, 5, 17),
('card_plan_018', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Tecnología para Planificación', 'Usa apps y herramientas modernas para facilitar tu planificación: presupuestos automáticos, seguimiento de inversiones, recordatorios de metas. La tecnología simplifica enormemente.', 'La tecnología moderna puede hacer la planificación financiera mucho más fácil', 'Investiga 3 apps o herramientas financieras útiles para ti', 50, 5, 18),
('card_plan_019', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Buscar Mentores Financieros', 'Identifica personas que hayan logrado lo que quieres lograr financieramente. Sus consejos directos y experiencia pueden ahorrarte años de errores costosos.', 'Los mentores financieros aceleran significativamente tu progreso', 'Identifica una persona específica para ser tu mentor financiero', 55, 5, 19),
('card_plan_020', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Métricas para Medir Progreso', 'Define métricas específicas para medir tu progreso financiero: patrimonio neto, ratio deuda/ingreso, porcentaje de ahorro mensual. Lo que se mide consistentemente, se mejora.', 'Medir el progreso financiero te mantiene en el camino correcto', 'Define 3 métricas clave para medir tu progreso financiero mensual', 60, 5, 20),
('card_plan_021', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Flexibilidad en Planificación', 'Los planes financieros deben ser firmes en dirección pero flexibles en ejecución. Si las circunstancias cambian dramáticamente, ajusta el plan en lugar de abandonarlo.', 'La flexibilidad inteligente mantiene vivos los planes a largo plazo', 'Identifica aspectos de tu plan que podrían necesitar flexibilidad', 50, 5, 21),
('card_plan_022', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Equilibrio: Vida vs Dinero', 'El dinero es importante pero no es todo en la vida. Planifica para tener suficiente dinero para disfrutar la vida, no para sacrificar completamente la vida por dinero.', 'El dinero debe servir a una vida plena, no al revés', 'Define específicamente qué significa "suficiente dinero" para tu felicidad', 55, 5, 22),
('card_plan_023', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Planificar tu Legado Financiero', 'Piensa en el legado financiero que quieres dejar: a tu familia, causas que apoyas, impacto en tu comunidad. El dinero puede ser una herramienta poderosa de legado positivo.', 'Un plan financiero sólido trasciende tu propia vida', 'Define qué legado financiero específico quieres dejar', 55, 5, 23),
('card_plan_024', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Crisis como Oportunidades', 'Las crisis financieras también traen oportunidades únicas: activos baratos, nuevos negocios, cambios de carrera. Estar preparado financieramente te permite aprovecharlas.', 'En toda crisis financiera hay oportunidades para los preparados', 'Define cómo podrías aprovechar estratégicamente una futura crisis', 60, 5, 24),
('card_plan_025', (SELECT id FROM public.education_modules WHERE slug = 'mod_planificacion'), 'Plan Como Documento Vivo', 'Tu plan financiero debe ser un documento que consultes y actualices regularmente, no algo que hagas una vez y olvides en un cajón para siempre.', 'Un plan financiero sin mantenimiento regular se vuelve completamente inútil', 'Programa revisiones trimestrales específicas de tu plan financiero', 50, 5, 25);

-- ============================================
-- PASO 8: MENSAJES FINALES Y VERIFICACIÓN
-- ============================================

-- Verificar instalación exitosa
DO $$
DECLARE
    module_count INTEGER;
    card_count INTEGER;
    function_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO module_count FROM public.education_modules WHERE is_active = true;
    SELECT COUNT(*) INTO card_count FROM public.education_cards WHERE is_active = true;
    SELECT COUNT(*) INTO function_count FROM information_schema.routines 
    WHERE routine_name IN ('mark_card_as_read', 'get_module_card_progress', 'get_all_modules_progress');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SISTEMA DE EDUCACIÓN DE CARDS INSTALADO EXITOSAMENTE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Módulos educativos: %', module_count;
    RAISE NOTICE 'Cards de contenido: %', card_count;
    RAISE NOTICE 'Funciones disponibles: %', function_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Funciones creadas:';
    RAISE NOTICE '- mark_card_as_read(user_id, card_id, reading_time)';
    RAISE NOTICE '- get_module_card_progress(user_id, module_id)';
    RAISE NOTICE '- get_all_modules_progress(user_id)';
    RAISE NOTICE '';
    RAISE NOTICE 'Sistema XP: +5 XP por card leída';
    RAISE NOTICE 'Constraint XP actualizado para incluir "education_card"';
    RAISE NOTICE '';
    RAISE NOTICE '¡Sistema listo para usar!';
    RAISE NOTICE '========================================';
END
$$;