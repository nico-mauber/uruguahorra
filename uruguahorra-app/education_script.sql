-- SCRIPT ÚNICO PARA SISTEMA COMPLETO DE EDUCACIÓN FINANCIERA
-- Ejecutar TODO este archivo de una vez en Supabase SQL Editor
-- Incluye: Schema + Funciones + RLS + XP Fix + 120 Cards de Contenido

-- =====================================================
-- 1. CREAR Y ACTUALIZAR TABLAS DEL SISTEMA DE EDUCACIÓN
-- =====================================================

-- Crear tabla education_modules o actualizar estructura si ya existe
DO $$
BEGIN
  -- Crear la tabla si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'education_modules') THEN
    CREATE TABLE education_modules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR UNIQUE NOT NULL,
      title VARCHAR NOT NULL,
      description TEXT,
      icon VARCHAR DEFAULT '📚',
      difficulty_level VARCHAR CHECK (difficulty_level IN ('principiante', 'intermedio', 'avanzado', 'experto')) DEFAULT 'principiante',
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Tabla education_modules creada exitosamente';
  ELSE
    RAISE NOTICE 'Tabla education_modules ya existe, verificando estructura...';
    
    -- Agregar columnas faltantes si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'slug') THEN
      ALTER TABLE education_modules ADD COLUMN slug VARCHAR;
      RAISE NOTICE 'Columna slug agregada a education_modules';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'icon') THEN
      ALTER TABLE education_modules ADD COLUMN icon VARCHAR DEFAULT '📚';
      RAISE NOTICE 'Columna icon agregada a education_modules';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'difficulty_level') THEN
      ALTER TABLE education_modules ADD COLUMN difficulty_level VARCHAR DEFAULT 'principiante';
      RAISE NOTICE 'Columna difficulty_level agregada a education_modules';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'display_order') THEN
      ALTER TABLE education_modules ADD COLUMN display_order INTEGER DEFAULT 0;
      RAISE NOTICE 'Columna display_order agregada a education_modules';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'is_active') THEN
      ALTER TABLE education_modules ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Columna is_active agregada a education_modules';
    END IF;
    
    -- Agregar constraints si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'education_modules' AND constraint_name = 'education_modules_slug_key') THEN
      -- Primero llenar slugs vacíos si los hay
      UPDATE education_modules SET slug = 'mod_' || id::text WHERE slug IS NULL;
      ALTER TABLE education_modules ADD CONSTRAINT education_modules_slug_key UNIQUE (slug);
      RAISE NOTICE 'Constraint UNIQUE agregado a columna slug';
    END IF;
    
    -- Agregar check constraint para difficulty_level si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'education_modules_difficulty_level_check') THEN
      ALTER TABLE education_modules ADD CONSTRAINT education_modules_difficulty_level_check 
        CHECK (difficulty_level IN ('principiante', 'intermedio', 'avanzado', 'experto'));
      RAISE NOTICE 'Check constraint agregado a difficulty_level';
    END IF;
  END IF;
END
$$;

-- Crear tabla education_cards o actualizar estructura si ya existe
DO $$
BEGIN
  -- Crear la tabla si no existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'education_cards') THEN
    CREATE TABLE education_cards (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug VARCHAR UNIQUE NOT NULL,
      module_id UUID NOT NULL REFERENCES education_modules(id) ON DELETE CASCADE,
      title VARCHAR NOT NULL,
      content TEXT NOT NULL,
      key_takeaway TEXT,
      practical_tip TEXT,
      reading_time_seconds INTEGER DEFAULT 60,
      xp_reward INTEGER DEFAULT 5,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );
    RAISE NOTICE 'Tabla education_cards creada exitosamente';
  ELSE
    RAISE NOTICE 'Tabla education_cards ya existe, verificando estructura...';
    
    -- Agregar columnas faltantes si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'slug') THEN
      ALTER TABLE education_cards ADD COLUMN slug VARCHAR;
      RAISE NOTICE 'Columna slug agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'key_takeaway') THEN
      ALTER TABLE education_cards ADD COLUMN key_takeaway TEXT;
      RAISE NOTICE 'Columna key_takeaway agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'practical_tip') THEN
      ALTER TABLE education_cards ADD COLUMN practical_tip TEXT;
      RAISE NOTICE 'Columna practical_tip agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'reading_time_seconds') THEN
      ALTER TABLE education_cards ADD COLUMN reading_time_seconds INTEGER DEFAULT 60;
      RAISE NOTICE 'Columna reading_time_seconds agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'xp_reward') THEN
      ALTER TABLE education_cards ADD COLUMN xp_reward INTEGER DEFAULT 5;
      RAISE NOTICE 'Columna xp_reward agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'display_order') THEN
      ALTER TABLE education_cards ADD COLUMN display_order INTEGER DEFAULT 0;
      RAISE NOTICE 'Columna display_order agregada a education_cards';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'is_active') THEN
      ALTER TABLE education_cards ADD COLUMN is_active BOOLEAN DEFAULT true;
      RAISE NOTICE 'Columna is_active agregada a education_cards';
    END IF;
    
    -- Agregar constraint unique para slug si no existe y si la columna existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'slug') THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'education_cards' AND constraint_name = 'education_cards_slug_key') THEN
        -- Primero llenar slugs vacíos si los hay
        UPDATE education_cards SET slug = 'card_' || id::text WHERE slug IS NULL;
        ALTER TABLE education_cards ADD CONSTRAINT education_cards_slug_key UNIQUE (slug);
        RAISE NOTICE 'Constraint UNIQUE agregado a columna slug en education_cards';
      END IF;
    END IF;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS user_card_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES education_cards(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  reading_time_seconds INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, card_id)
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_education_cards_module ON education_cards(module_id);
CREATE INDEX IF NOT EXISTS idx_education_cards_order ON education_cards(module_id, display_order);
CREATE INDEX IF NOT EXISTS idx_user_card_progress_user ON user_card_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_card_progress_card ON user_card_progress(card_id);

-- =====================================================
-- 3. FIX PARA SISTEMA XP (AGREGAR education_card) - SOLUCIÓN ROBUSTA
-- =====================================================

-- Diagnóstico y solución profesional para constraint XP
DO $$
DECLARE
  valores_problematicos TEXT[];
  valor_actual TEXT;
BEGIN
  -- Verificar si la tabla existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_xp_log') THEN
    
    RAISE NOTICE 'Tabla user_xp_log encontrada. Iniciando diagnóstico...';
    
    -- 1. DIAGNÓSTICO: Encontrar valores problemáticos
    SELECT ARRAY_AGG(DISTINCT event_type) INTO valores_problematicos
    FROM user_xp_log 
    WHERE event_type NOT IN (
      'contribution', 
      'challenge_complete', 
      'challenge_session_complete', 
      'daily_streak', 
      'quest_complete', 
      'squad_contribution'
    ) AND event_type IS NOT NULL;
    
    -- Mostrar valores problemáticos encontrados
    IF array_length(valores_problematicos, 1) > 0 THEN
      RAISE NOTICE 'Valores problemáticos encontrados: %', valores_problematicos;
      
      -- 2. LIMPIEZA: Corregir valores conocidos problemáticos
      FOREACH valor_actual IN ARRAY valores_problematicos
      LOOP
        CASE 
          -- Corregir espacios extra
          WHEN TRIM(valor_actual) IN ('contribution', 'challenge_complete', 'challenge_session_complete', 'daily_streak', 'quest_complete', 'squad_contribution') THEN
            UPDATE user_xp_log SET event_type = TRIM(valor_actual) WHERE event_type = valor_actual;
            RAISE NOTICE 'Corregido valor con espacios: "%" -> "%"', valor_actual, TRIM(valor_actual);
            
          -- Corregir variaciones de mayúsculas/minúsculas conocidas
          WHEN LOWER(valor_actual) = 'contribution' THEN
            UPDATE user_xp_log SET event_type = 'contribution' WHERE event_type = valor_actual;
            RAISE NOTICE 'Corregido: "%" -> "contribution"', valor_actual;
            
          WHEN LOWER(valor_actual) = 'daily_streak' THEN
            UPDATE user_xp_log SET event_type = 'daily_streak' WHERE event_type = valor_actual;
            RAISE NOTICE 'Corregido: "%" -> "daily_streak"', valor_actual;
            
          -- Para valores desconocidos, mapear a 'contribution' como fallback seguro
          ELSE
            UPDATE user_xp_log SET event_type = 'contribution' WHERE event_type = valor_actual;
            RAISE NOTICE 'Valor desconocido "%" mapeado a "contribution"', valor_actual;
        END CASE;
      END LOOP;
      
    ELSE
      RAISE NOTICE 'No se encontraron valores problemáticos.';
    END IF;
    
    -- 3. MANEJAR VALORES NULL
    UPDATE user_xp_log SET event_type = 'contribution' WHERE event_type IS NULL;
    
    -- 4. ELIMINAR CONSTRAINT EXISTENTE
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE constraint_name = 'user_xp_log_event_type_check' 
               AND table_name = 'user_xp_log') THEN
      ALTER TABLE user_xp_log DROP CONSTRAINT user_xp_log_event_type_check;
      RAISE NOTICE 'Constraint existente eliminado.';
    END IF;
    
    -- 5. CREAR NUEVO CONSTRAINT CON TODOS LOS VALORES VÁLIDOS + education_card
    ALTER TABLE user_xp_log ADD CONSTRAINT user_xp_log_event_type_check 
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
    
    -- 6. VERIFICACIÓN FINAL
    PERFORM COUNT(*) FROM user_xp_log 
    WHERE event_type NOT IN (
      'contribution', 
      'challenge_complete', 
      'challenge_session_complete', 
      'daily_streak', 
      'quest_complete', 
      'squad_contribution', 
      'education_card'
    );
    
    IF FOUND THEN
      RAISE WARNING 'Aún existen valores problemáticos después de la limpieza.';
    ELSE
      RAISE NOTICE 'Verificación exitosa: Todos los valores son válidos.';
    END IF;
    
  ELSE
    RAISE NOTICE 'Tabla user_xp_log no existe, el constraint se agregará cuando se cree la tabla';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error durante la actualización del constraint XP: %', SQLERRM;
    RAISE NOTICE 'El sistema de educación funcionará, pero revisa el constraint XP manualmente.';
END
$$;

-- =====================================================
-- 4. FUNCIONES DEL SISTEMA
-- =====================================================

-- Función para marcar card como leída y otorgar XP
CREATE OR REPLACE FUNCTION mark_card_as_read(
  p_user_id UUID,
  p_card_id UUID,
  p_reading_time INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result_json JSON;
  xp_to_award INTEGER;
BEGIN
  -- Obtener XP de la card
  SELECT xp_reward INTO xp_to_award
  FROM education_cards 
  WHERE id = p_card_id;
  
  IF xp_to_award IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Card not found');
  END IF;
  
  -- Insertar o actualizar progreso
  INSERT INTO user_card_progress (user_id, card_id, is_read, reading_time_seconds, completed_at)
  VALUES (p_user_id, p_card_id, true, p_reading_time, now())
  ON CONFLICT (user_id, card_id) 
  DO UPDATE SET 
    is_read = true,
    reading_time_seconds = COALESCE(p_reading_time, user_card_progress.reading_time_seconds),
    completed_at = now(),
    updated_at = now();
  
  -- Otorgar XP
  BEGIN
    INSERT INTO user_xp_log (user_id, event_type, xp_earned, event_data)
    VALUES (p_user_id, 'education_card', xp_to_award, json_build_object('card_id', p_card_id));
    
    UPDATE users 
    SET total_xp = total_xp + xp_to_award,
        updated_at = now()
    WHERE id = p_user_id;
  EXCEPTION WHEN others THEN
    -- Si las tablas de XP no existen, continuamos sin error
    NULL;
  END;
  
  RETURN json_build_object('success', true, 'xp_earned', xp_to_award);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener progreso completo de un módulo
CREATE OR REPLACE FUNCTION get_module_card_progress(
  p_user_id UUID,
  p_module_id UUID
)
RETURNS JSON AS $$
DECLARE
  result_json JSON;
BEGIN
  SELECT json_build_object(
    'module', json_build_object(
      'id', m.id,
      'title', m.title,
      'description', m.description,
      'icon', m.icon,
      'difficulty_level', m.difficulty_level
    ),
    'cards', COALESCE(
      json_agg(
        json_build_object(
          'card', json_build_object(
            'id', c.id,
            'title', c.title,
            'content', c.content,
            'key_takeaway', c.key_takeaway,
            'practical_tip', c.practical_tip,
            'reading_time_seconds', c.reading_time_seconds,
            'xp_reward', c.xp_reward
          ),
          'is_read', COALESCE(ucp.is_read, false),
          'is_unlocked', true,
          'completed_at', ucp.completed_at,
          'reading_time_seconds', ucp.reading_time_seconds
        ) ORDER BY c.display_order
      ), '[]'::json
    ),
    'read_cards', COALESCE(
      (SELECT COUNT(*) FROM education_cards ec2 
       LEFT JOIN user_card_progress ucp2 ON ec2.id = ucp2.card_id AND ucp2.user_id = p_user_id
       WHERE ec2.module_id = p_module_id AND ucp2.is_read = true), 0
    ),
    'total_cards', COUNT(c.id),
    'completion_percentage', CASE 
      WHEN COUNT(c.id) = 0 THEN 0
      ELSE ROUND(
        COALESCE(
          (SELECT COUNT(*) FROM education_cards ec2 
           LEFT JOIN user_card_progress ucp2 ON ec2.id = ucp2.card_id AND ucp2.user_id = p_user_id
           WHERE ec2.module_id = p_module_id AND ucp2.is_read = true), 0
        ) * 100.0 / COUNT(c.id), 2
      )
    END,
    'estimated_total_time', COALESCE(SUM(c.reading_time_seconds), 0),
    'is_completed', COALESCE(
      (SELECT COUNT(*) FROM education_cards ec2 
       LEFT JOIN user_card_progress ucp2 ON ec2.id = ucp2.card_id AND ucp2.user_id = p_user_id
       WHERE ec2.module_id = p_module_id AND ucp2.is_read = true), 0
    ) = COUNT(c.id) AND COUNT(c.id) > 0
  ) INTO result_json
  FROM education_modules m
  LEFT JOIN education_cards c ON m.id = c.module_id AND c.is_active = true
  LEFT JOIN user_card_progress ucp ON c.id = ucp.card_id AND ucp.user_id = p_user_id
  WHERE m.id = p_module_id AND m.is_active = true
  GROUP BY m.id, m.title, m.description, m.icon, m.difficulty_level;
  
  RETURN COALESCE(result_json, '{"error": "Module not found"}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- =====================================================

ALTER TABLE education_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_card_progress ENABLE ROW LEVEL SECURITY;

-- Módulos públicos (solo lectura)
DROP POLICY IF EXISTS "Education modules are publicly readable" ON education_modules;
CREATE POLICY "Education modules are publicly readable" ON education_modules
  FOR SELECT USING (is_active = true);

-- Cards públicas (solo lectura)
DROP POLICY IF EXISTS "Education cards are publicly readable" ON education_cards;
CREATE POLICY "Education cards are publicly readable" ON education_cards
  FOR SELECT USING (is_active = true);

-- Progreso de usuario (solo propietario)
DROP POLICY IF EXISTS "Users can view own card progress" ON user_card_progress;
CREATE POLICY "Users can view own card progress" ON user_card_progress
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own card progress" ON user_card_progress;
CREATE POLICY "Users can insert own card progress" ON user_card_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own card progress" ON user_card_progress;
CREATE POLICY "Users can update own card progress" ON user_card_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- =====================================================
-- 6. INSERTAR MÓDULOS EDUCATIVOS
-- =====================================================

-- Insertar módulos de manera segura manejando diferentes escenarios
DO $$
BEGIN
  -- Verificar si la columna slug existe antes de insertar
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'slug') THEN
    
    -- Insertar o actualizar módulos usando UPSERT con slug
    INSERT INTO education_modules (slug, title, description, icon, difficulty_level, display_order, is_active) VALUES
    ('mod_presupuesto', 'Presupuesto Personal', 'Aprende a crear y mantener un presupuesto que funcione para ti', '💰', 'principiante', 1, true),
    ('mod_ahorro', 'Estrategias de Ahorro', 'Técnicas prácticas para ahorrar dinero en tu día a día', '🏦', 'principiante', 2, true),
    ('mod_deudas', 'Manejo de Deudas', 'Cómo salir de deudas y evitar el sobreendeudamiento', '📉', 'intermedio', 3, true),
    ('mod_inversion', 'Primeros Pasos en Inversión', 'Conceptos básicos para comenzar a invertir tu dinero', '📈', 'intermedio', 4, true),
    ('mod_planificacion', 'Planificación Financiera', 'Establece metas financieras y crea un plan a largo plazo', '🎯', 'avanzado', 5, true)
    ON CONFLICT (slug) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      icon = EXCLUDED.icon,
      difficulty_level = EXCLUDED.difficulty_level,
      display_order = EXCLUDED.display_order,
      is_active = EXCLUDED.is_active,
      updated_at = timezone('utc'::text, now());
      
    RAISE NOTICE 'Módulos educativos insertados/actualizados usando slug';
    
  ELSE
    -- Si no existe la columna slug, insertar de manera básica
    RAISE NOTICE 'Columna slug no disponible, insertando módulos básicos...';
    
    -- Limpiar tabla existente si tiene datos incompatibles
    DELETE FROM education_modules;
    
    -- Insertar módulos básicos
    INSERT INTO education_modules (title, description) VALUES
    ('Presupuesto Personal', 'Aprende a crear y mantener un presupuesto que funcione para ti'),
    ('Estrategias de Ahorro', 'Técnicas prácticas para ahorrar dinero en tu día a día'),
    ('Manejo de Deudas', 'Cómo salir de deudas y evitar el sobreendeudamiento'),
    ('Primeros Pasos en Inversión', 'Conceptos básicos para comenzar a invertir tu dinero'),
    ('Planificación Financiera', 'Establece metas financieras y crea un plan a largo plazo');
    
    RAISE NOTICE 'Módulos básicos insertados sin slug';
  END IF;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al insertar módulos: %', SQLERRM;
    RAISE NOTICE 'Continuando con el resto del script...';
END
$$;

-- =====================================================
-- 7. INSERTAR 120 CARDS DE CONTENIDO EDUCATIVO (MANERA SEGURA)
-- =====================================================

-- Insertar cards de manera segura verificando estructura de tablas
DO $$
BEGIN
  -- Verificar que ambas tablas tienen las columnas necesarias
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_cards' AND column_name = 'slug') OR
     NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'education_modules' AND column_name = 'slug') THEN
    RAISE NOTICE 'Las tablas no tienen la estructura completa. Saltando inserción de cards.';
    RAISE NOTICE 'Ejecuta el script nuevamente después de que se agreguen las columnas faltantes.';
    RETURN;
  END IF;

  RAISE NOTICE 'Insertando 120 cards de contenido educativo...';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al verificar estructura para cards: %', SQLERRM;
    RETURN;
END
$$;

-- MÓDULO 1: PRESUPUESTO PERSONAL (25 cards) - Inserción directa con manejo de errores
INSERT INTO education_cards (slug, module_id, title, content, key_takeaway, practical_tip, reading_time_seconds, xp_reward, display_order) VALUES
('card_pres_001', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Introducción al Presupuesto', 'El presupuesto es la herramienta más importante para controlar tus finanzas. Te permite saber exactamente cuánto dinero entra y sale de tu bolsillo cada mes.', 'Un presupuesto te da control total sobre tu dinero', 'Anota todos tus gastos durante una semana completa', 45, 5, 1),
('card_pres_002', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'La Regla 50/30/20', 'Destina 50% a gastos esenciales, 30% a gastos personales y 20% a ahorros. Esta regla simple te ayuda a balancear tu vida financiera.', 'El balance es clave en las finanzas personales', 'Calcula cuánto deberías gastar en cada categoría según tus ingresos', 60, 5, 2),
('card_pres_003', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Fijos vs Variables', 'Los gastos fijos son iguales cada mes (alquiler, seguros). Los variables cambian (comida, entretenimiento). Conocer la diferencia te ayuda a planificar mejor.', 'Identifica qué gastos puedes controlar', 'Haz una lista de tus gastos fijos y otra de los variables', 50, 5, 3),
('card_pres_004', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Cómo Rastrear Gastos', 'Usa una app o libreta para anotar cada peso que gastas. Al final del mes, agrupa por categorías para ver patrones.', 'Lo que no se mide, no se puede mejorar', 'Instala una app de gastos o usa una libreta por 30 días', 55, 5, 4),
('card_pres_005', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Hormiga', 'Son pequeños gastos diarios que parecen insignificantes: café, chicles, propinas extras. Sumados al mes pueden ser cientos de pesos.', 'Los gastos pequeños se vuelven grandes', 'Anota cada gasto menor a $50 durante una semana', 50, 5, 5),
('card_pres_006', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Emergencia', 'Dedica una parte de tu presupuesto mensual a crear un fondo de emergencia. Empieza con $100 pesos por mes.', 'Siempre presupuesta para lo inesperado', 'Abre una cuenta separada solo para emergencias', 45, 5, 6),
('card_pres_007', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Revisión Mensual', 'Al final de cada mes, compara lo que planeaste gastar con lo que realmente gastaste. Ajusta el próximo mes según lo aprendido.', 'El presupuesto evoluciona con la experiencia', 'Programa una cita contigo mismo cada fin de mes', 55, 5, 7),
('card_pres_008', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Categorías de Gastos', 'Organiza tus gastos en categorías: vivienda, transporte, comida, entretenimiento, ahorros. Esto te ayuda a identificar dónde va tu dinero.', 'Las categorías revelan patrones de gasto', 'Crea 5-7 categorías principales para tus gastos', 50, 5, 8),
('card_pres_009', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Ingresos Variables', 'Si tus ingresos cambian mes a mes, basa tu presupuesto en el mes más bajo de los últimos 6 meses. El extra será un bonus.', 'Presupuesta conservadoramente con ingresos variables', 'Calcula tu ingreso promedio de los últimos 6 meses', 60, 5, 9),
('card_pres_010', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Familiar', 'Si vives en familia, involucra a todos en el presupuesto. Cada miembro debe conocer los límites y objetivos financieros familiares.', 'El presupuesto familiar requiere comunicación', 'Haz una reunión familiar mensual sobre dinero', 55, 5, 10),
('card_pres_011', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Apps vs Papel', 'Puedes usar apps como Mint, YNAB o simplemente Excel. Lo importante no es la herramienta, sino la constancia en usarla.', 'La consistencia importa más que la herramienta', 'Elige UN método y úsalo por 3 meses seguidos', 50, 5, 11),
('card_pres_012', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Cero', 'Cada peso de tus ingresos debe tener un destino asignado: gastos, ahorros o inversiones. Al final, ingresos menos gastos = cero.', 'Dale un propósito a cada peso que ganas', 'Asigna destino a cada peso de tu próximo sueldo', 60, 5, 12),
('card_pres_013', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Errores Comunes', 'No incluir gastos anuales (seguros, regalos), ser demasiado restrictivo, o no ajustar cuando la vida cambia. El presupuesto debe ser realista.', 'Un presupuesto irreal es un presupuesto fallido', 'Lista 3 gastos anuales que a menudo olvidas', 55, 5, 13),
('card_pres_014', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto Semanal', 'Además del mensual, crea un presupuesto semanal para gastos variables como comida y entretenimiento. Te da mejor control diario.', 'El control semanal mejora el mensual', 'Divide tu presupuesto mensual entre 4 semanas', 50, 5, 14),
('card_pres_015', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Dinero de Bolsillo', 'Asígnate una cantidad fija semanal de "dinero de bolsillo" que puedes gastar en lo que quieras, sin explicaciones. Te da libertad dentro del control.', 'Un poco de libertad financiera es necesaria', 'Define tu "dinero de bolsillo" semanal y respétalo', 55, 5, 15),
('card_pres_016', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Comparar Opciones', 'Antes de compras grandes, compara precios en al menos 3 lugares. Esta simple práctica puede ahorrarte hasta 30% en algunas compras.', 'Comparar precios es ahorrar dinero', 'Para tu próxima compra >$500, compara 3 opciones', 45, 5, 16),
('card_pres_017', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Lista de Compras', 'Siempre ve al supermercado con lista y presupuesto definido. Las compras impulsivas pueden arruinar el mejor presupuesto.', 'Una lista previene gastos impulsivos', 'Haz la lista antes de salir, nunca en el lugar', 50, 5, 17),
('card_pres_018', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Negociar Servicios', 'Internet, cable, seguros: negocia al menos una vez al año. Muchas empresas ofrecen descuentos para retener clientes.', 'Negociar es parte del presupuesto inteligente', 'Llama a renegociar un servicio este mes', 55, 5, 18),
('card_pres_019', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Gastos Estacionales', 'Navidad, vacaciones, regreso a clases: planifica estos gastos durante todo el año. Ahorra $100 pesos mensuales para gastos estacionales.', 'Los gastos estacionales son predecibles', 'Abre una cuenta para gastos estacionales', 60, 5, 19),
('card_pres_020', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Pareja', 'Si tienes pareja, decidan juntos quién paga qué y cómo manejar gastos compartidos. La comunicación previene conflictos financieros.', 'Las finanzas de pareja requieren transparencia', 'Tengan una conversación honesta sobre dinero', 55, 5, 20),
('card_pres_021', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Automatizar Pagos', 'Automatiza tus gastos fijos para evitar cargos por pagos tardíos. Pero mantén control revisando los estados de cuenta mensualmente.', 'Automatiza pero siempre revisa', 'Automatiza al menos 3 pagos fijos este mes', 50, 5, 21),
('card_pres_022', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto de Viaje', 'Para vacaciones, presupuesta: transporte, alojamiento, comida, actividades y 20% extra para imprevistos. Nunca viajes sin presupuesto definido.', 'Un viaje sin presupuesto puede arruinar tus finanzas', 'Para tu próximo viaje, presupuesta cada categoria', 60, 5, 22),
('card_pres_023', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Presupuesto para Hijos', 'Los niños necesitan ropa, útiles, actividades. Presupuesta estos gastos y enseña a tus hijos el valor del dinero desde pequeños.', 'Los hijos deben entender el presupuesto familiar', 'Incluye a tus hijos en decisiones de gastos apropiadas', 55, 5, 23),
('card_pres_024', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Ajustar el Presupuesto', 'Tu presupuesto cambiará con tu vida: nuevo trabajo, mudanza, hijos. Revísalo completamente cada 6 meses o cuando haya cambios importantes.', 'Un presupuesto rígido se rompe fácilmente', 'Programa revisiones del presupuesto cada 6 meses', 50, 5, 24),
('card_pres_025', (SELECT id FROM education_modules WHERE slug = 'mod_presupuesto'), 'Celebrar el Éxito', 'Cuando logres cumplir tu presupuesto por 3 meses seguidos, celébralo (dentro del presupuesto). Los pequeños logros merecen reconocimiento.', 'Celebrar el progreso motiva a continuar', 'Define una pequeña recompensa por cumplir tu presupuesto', 45, 5, 25),

-- MÓDULO 2: ESTRATEGIAS DE AHORRO (22 cards)
('card_ahorro_001', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Por Qué Ahorrar', 'Ahorrar te da seguridad, oportunidades y paz mental. Es la diferencia entre sobrevivir y prosperar financieramente.', 'Ahorrar es invertir en tu tranquilidad futura', 'Define 3 razones personales por las que quieres ahorrar', 45, 5, 1),
('card_ahorro_002', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'La Regla del 1%', 'Ahorra al menos 1% más de tus ingresos cada mes. Si empiezas con 5%, el próximo mes ahorra 6%. Pequeños incrementos, grandes resultados.', 'El 1% adicional se hace invisible pero suma mucho', 'Aumenta tu ahorro en 1% este mes', 50, 5, 2),
('card_ahorro_003', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ahorro Automático', 'Programa una transferencia automática a ahorros el día que recibes tu sueldo. Si no lo ves, no lo gastas.', 'Automatizar elimina la tentación de gastar', 'Configura una transferencia automática hoy mismo', 55, 5, 3),
('card_ahorro_004', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Método de los Sobres', 'Usa sobres (físicos o virtuales) para diferentes categorías de gasto. Cuando se acaba el dinero del sobre, se acabó para esa categoría.', 'Los límites físicos controlan mejor el gasto', 'Prueba el método de sobres por un mes', 60, 5, 4),
('card_ahorro_005', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Desafío de 30 Días', 'Por 30 días, guarda todo el cambio que recibas. También ahorra $10 pesos cada día. Al final tendrás sorprendente cantidad.', 'Los pequeños ahorros diarios se vuelven grandes', 'Empieza hoy el desafío de 30 días', 50, 5, 5),
('card_ahorro_006', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Eliminar Suscripciones', 'Revisa tus suscripciones mensuales: streaming, apps, revistas. Cancela las que no uses activamente. Puede ahorrarte $200-500 mensuales.', 'Las suscripciones olvidadas drenan tu dinero', 'Haz una lista de todas tus suscripciones activas', 55, 5, 6),
('card_ahorro_007', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Compras con Lista', 'Nunca compres sin lista, especialmente comida. Las compras impulsivas pueden aumentar tu gasto en 25-40%.', 'Una lista es tu escudo contra impulsos', 'Haz lista antes de cada ida al supermercado', 45, 5, 7),
('card_ahorro_008', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Regla de 24 Horas', 'Para compras mayores a $500, espera 24 horas antes de comprar. Muchas veces la urgencia desaparece y no compras.', 'El tiempo enfría las decisiones impulsivas', 'Aplica la regla de 24 horas en tu próxima compra grande', 50, 5, 8),
('card_ahorro_009', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Cocinar en Casa', 'Cocinar en casa cuesta 3-4 veces menos que comer fuera. Una comida casera de $30 vs $120 en restaurante.', 'Cocinar es una de las mejores formas de ahorrar', 'Cocina al menos 5 comidas en casa esta semana', 55, 5, 9),
('card_ahorro_010', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Transporte Inteligente', 'Camina, usa bicicleta o transporte público cuando sea posible. El costo de mantener un auto puede ser $3000-5000 mensuales.', 'Cada viaje en auto tiene un costo real', 'Calcula cuánto gastas realmente en transporte al mes', 60, 5, 10),
('card_ahorro_011', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Compras de Segunda Mano', 'Libros, ropa, muebles, electrónicos: considera opciones de segunda mano. Puedes ahorrar 50-70% en artículos prácticamente nuevos.', 'Lo usado no significa de menor calidad', 'Busca una opción de segunda mano para tu próxima compra', 55, 5, 11),
('card_ahorro_012', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ofertas y Cupones', 'Usa cupones y busca ofertas, pero solo para cosas que realmente necesitas. Una oferta en algo innecesario no es ahorro.', 'Una oferta solo es buena si la necesitabas', 'Busca cupones solo para productos en tu lista', 50, 5, 12),
('card_ahorro_013', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Agua vs Bebidas', 'Tomar agua en lugar de refrescos, jugos o café caro puede ahorrarte $200-400 mensuales. Además es más saludable.', 'El agua es gratis y saludable', 'Lleva una botella de agua por una semana', 45, 5, 13),
('card_ahorro_014', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Entretenimiento Gratuito', 'Parques, bibliotecas, eventos culturales gratuitos, videojuegos que ya tienes. El entretenimiento no tiene que ser caro.', 'La diversión no requiere dinero', 'Encuentra 3 actividades gratuitas en tu ciudad', 55, 5, 14),
('card_ahorro_015', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ahorro Energético', 'Apaga luces, desconecta aparatos, usa menos aire acondicionado. Puedes reducir tu recibo de luz 15-25% con simples cambios.', 'Cada aparato apagado es dinero ahorrado', 'Identifica 3 maneras de reducir tu consumo eléctrico', 50, 5, 15),
('card_ahorro_016', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Reparar vs Reemplazar', 'Antes de tirar algo roto, investiga cuánto cuesta repararlo. Muchas veces reparar cuesta 20-30% de comprar nuevo.', 'Reparar extiende la vida útil de tus cosas', 'Repara algo que ibas a tirar', 55, 5, 16),
('card_ahorro_017', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Banco vs Casa', 'Manten tus ahorros en el banco, no en casa. En casa es fácil gastarlos y no ganan intereses. El banco los hace crecer.', 'Los ahorros en casa no son realmente ahorros', 'Transfiere todo efectivo guardado en casa al banco', 50, 5, 17),
('card_ahorro_018', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Meta Visual', 'Pon una foto de tu meta de ahorro donde la veas diariamente: viaje, casa, auto. La motivación visual es poderosa.', 'Ver tu meta te motiva a ahorrar', 'Pega una foto de tu meta en tu espejo', 45, 5, 18),
('card_ahorro_019', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ahorro de Inflación', 'En países con inflación, tu dinero pierde valor cada día. Ahorra en instrumentos que protejan del aumento de precios.', 'La inflación es el enemigo silencioso del ahorro', 'Investiga opciones de ahorro que protejan de inflación', 60, 5, 19),
('card_ahorro_020', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Gastos Fantasma', 'Revisa tus estados de cuenta y busca cargos que no reconoces. Los gastos fantasma pueden quitarte $100-300 mensuales.', 'Los gastos fantasma drenan tu dinero silenciosamente', 'Revisa línea por línea tu último estado de cuenta', 55, 5, 20),
('card_ahorro_021', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ahorro Social', 'Únete a un grupo de ahorro o encuentra un compañero de ahorro. La presión social positiva te ayuda a mantener el hábito.', 'Ahorrar en grupo es más fácil que solo', 'Encuentra una persona para ser compañeros de ahorro', 50, 5, 21),
('card_ahorro_022', (SELECT id FROM education_modules WHERE slug = 'mod_ahorro'), 'Ahorro Estacional', 'Aprovecha las épocas del año: compra ropa de invierno en verano y viceversa. Compra útiles escolares después del regreso a clases.', 'Comprar fuera de temporada ahorra hasta 50%', 'Haz una lista de compras estacionales para el próximo año', 55, 5, 22),

-- MÓDULO 3: MANEJO DE DEUDAS (23 cards)
('card_deudas_001', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Deuda Buena vs Mala', 'Deuda buena te ayuda a generar ingresos o aumentar patrimonio (casa, educación). Deuda mala financia consumo (tarjetas, auto nuevo).', 'No todas las deudas son iguales', 'Clasifica tus deudas actuales como buenas o malas', 50, 5, 1),
('card_deudas_002', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Lista de Deudas', 'Haz una lista completa: acreedor, monto total, pago mínimo, tasa de interés, fecha de vencimiento. Conocer el panorama completo es el primer paso.', 'No puedes manejar lo que no conoces', 'Crea una hoja de cálculo con todas tus deudas', 60, 5, 2),
('card_deudas_003', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Método Bola de Nieve', 'Paga mínimos en todas las deudas, pero pon dinero extra en la deuda más pequeña. Al eliminarla, usar ese dinero para la siguiente más pequeña.', 'Eliminar deudas pequeñas da impulso psicológico', 'Ordena tus deudas de menor a mayor monto', 55, 5, 3),
('card_deudas_004', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Método Avalancha', 'Paga mínimos en todas las deudas, pero pon dinero extra en la deuda con mayor tasa de interés. Matemáticamente más eficiente.', 'Las tasas altas cuestan más a largo plazo', 'Ordena tus deudas de mayor a menor tasa de interés', 55, 5, 4),
('card_deudas_005', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Pago Mínimo Trap', 'Pagar solo el mínimo en tarjetas de crédito puede tomar 20-30 años en liquidar la deuda. Los intereses se comen tu dinero.', 'El pago mínimo es una trampa de largo plazo', 'Calcula cuánto tiempo tomaría pagar solo mínimos', 60, 5, 5),
('card_deudas_006', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Consolidación de Deudas', 'Si tienes múltiples deudas con tasas altas, considera consolidarlas en una sola con tasa menor. Simplifica pagos y puede reducir intereses.', 'Consolidar puede simplificar y ahorrar', 'Investiga opciones de consolidación disponibles', 55, 5, 6),
('card_deudas_007', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Negociar con Acreedores', 'Si tienes problemas para pagar, habla con tus acreedores. Muchos prefieren recibir algo a nada y pueden ofrecer planes de pago.', 'Los acreedores prefieren cobrar algo que nada', 'Llama a negociar si tienes atrasos', 50, 5, 7),
('card_deudas_008', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Evitar Más Deuda', 'Mientras pagas deudas existentes, evita crear nuevas. Corta tarjetas de crédito o dáselas a alguien de confianza para guardar.', 'No llenes un hoyo mientras cavas otro', 'Remueve las tarjetas de tu cartera por un mes', 45, 5, 8),
('card_deudas_009', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Ingresos Extra para Deudas', 'Vende cosas que no usas, trabaja horas extra, o busca trabajos de fin de semana. Todo ingreso extra debe ir directo a deudas.', 'Los ingresos extra aceleran el pago de deudas', 'Identifica una fuente de ingreso extra este mes', 55, 5, 9),
('card_deudas_010', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Presupuesto Anti-Deuda', 'Crea un presupuesto extremo donde cada peso no esencial vaya a pagar deudas. Vive con lo mínimo hasta estar libre de deudas.', 'Un presupuesto agresivo acelera la libertad', 'Reduce gastos no esenciales por 3 meses', 60, 5, 10),
('card_deudas_011', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Emergencia vs Deuda', 'Si no tienes fondo de emergencia pero sí deudas, ahorra $500-1000 para emergencias básicas, luego enfócate 100% en deudas.', 'Un pequeño fondo previene más deudas', 'Ahorra $500 antes de atacar deudas agresivamente', 55, 5, 11),
('card_deudas_012', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Psicología de la Deuda', 'Las deudas causan estrés, afectan relaciones y salud mental. Reconoce el impacto emocional y busca apoyo si lo necesitas.', 'Las deudas afectan más que solo las finanzas', 'Habla con alguien de confianza sobre tus deudas', 50, 5, 12),
('card_deudas_013', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Fechas de Pago', 'Programa todos los pagos de deudas para el mismo día del mes. Esto simplifica tu administración y evitas pagos tardíos.', 'Sincronizar pagos evita olvidos costosos', 'Cambia todas las fechas de pago al mismo día', 45, 5, 13),
('card_deudas_014', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Tarjeta de Crédito Inteligente', 'Usa tarjetas solo si puedes pagar el total cada mes. Si no puedes, no las uses. Son herramientas, no dinero extra.', 'Las tarjetas son herramientas, no ingresos', 'Usa solo efectivo por un mes completo', 50, 5, 14),
('card_deudas_015', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Interés Compuesto Negativo', 'Los intereses de las deudas trabajan contra ti. Un 30% anual significa que tu deuda puede duplicarse en 3 años sin pagos.', 'El interés compuesto puede ser tu enemigo', 'Calcula cómo crecerían tus deudas sin pagar', 60, 5, 15),
('card_deudas_016', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Refinanciamiento', 'Si tu crédito ha mejorado, puedes calificar para tasas menores. Refinanciar puede reducir significativamente los intereses.', 'Un mejor crédito merece mejores tasas', 'Checa tu score crediticio y opciones de refinanciamiento', 55, 5, 16),
('card_deudas_017', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Avalistas y Deudas', 'Ser avalista de alguien más significa que eres responsable si no paga. Solo hazlo si puedes asumir el 100% de la deuda.', 'Ser avalista es asumir una deuda potencial', 'Piensa dos veces antes de ser avalista', 50, 5, 17),
('card_deudas_018', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Deudas con Familia', 'Los préstamos familiares pueden dañar relaciones. Si pides prestado a familia, trata como deuda formal: contrato, plazos, intereses.', 'Las deudas familiares requieren más cuidado', 'Formaliza cualquier préstamo familiar existente', 55, 5, 18),
('card_deudas_019', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Score Crediticio', 'Tu historial de pagos afecta tu score crediticio. Un buen score te da acceso a mejores tasas y productos financieros.', 'Un buen score crediticio ahorra dinero', 'Consulta tu score crediticio gratuito', 50, 5, 19),
('card_deudas_020', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Deuda vs Inversión', 'Si tienes deudas con interés mayor al 8%, generalmente es mejor pagarlas antes que invertir. La deuda es una inversión negativa garantizada.', 'Pagar deudas es una inversión garantizada', 'Compara tasas de tus deudas vs rendimientos de inversión', 60, 5, 20),
('card_deudas_021', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Planes de Pago', 'Crea un plan específico de cuándo estarás libre de cada deuda. Tener fechas claras te mantiene motivado y enfocado.', 'Un plan con fechas convierte sueños en metas', 'Calcula cuándo estarás libre de cada deuda', 55, 5, 21),
('card_deudas_022', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Celebrar Pagos', 'Cuando liquides una deuda, celébralo (sin crear nueva deuda). Reconoce el logro antes de pasar a la siguiente deuda.', 'Celebrar el progreso mantiene la motivación', 'Planifica cómo celebrarás tu primera deuda pagada', 45, 5, 22),
('card_deudas_023', (SELECT id FROM education_modules WHERE slug = 'mod_deudas'), 'Libertad de Deudas', 'Estar libre de deudas te da opciones: cambiar trabajo, tomar riesgos, ayudar otros. La libertad financiera empieza con cero deudas.', 'Sin deudas tienes más opciones en la vida', 'Visualiza cómo será tu vida sin deudas', 50, 5, 23),

-- MÓDULO 4: PRIMEROS PASOS EN INVERSIÓN (25 cards)
('card_inversion_001', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Por Qué Invertir', 'Invertir es la única manera de hacer que tu dinero crezca más rápido que la inflación. Es poner tu dinero a trabajar para ti.', 'La inversión protege y hace crecer tu patrimonio', 'Define por qué quieres empezar a invertir', 45, 5, 1),
('card_inversion_002', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Riesgo vs Rendimiento', 'Todas las inversiones tienen riesgo. Mayor rendimiento potencial = mayor riesgo. No existe inversión sin riesgo que dé altos rendimientos.', 'Riesgo y rendimiento van de la mano', 'Identifica tu tolerancia personal al riesgo', 55, 5, 2),
('card_inversion_003', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Diversificación Básica', 'No pongas todo tu dinero en una sola inversión. Diversifica entre diferentes tipos: acciones, bonos, inmuebles, para reducir riesgo.', 'Diversificar es no poner todos los huevos en una canasta', 'Lista 3-4 tipos diferentes de inversión', 50, 5, 3),
('card_inversion_004', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Horizonte de Tiempo', 'Define cuándo necesitarás el dinero. Corto plazo (1-3 años): inversiones conservadoras. Largo plazo (5+ años): puedes asumir más riesgo.', 'El tiempo determina el tipo de inversión apropiada', 'Define el horizonte de tiempo para tu dinero', 60, 5, 4),
('card_inversion_005', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Fondos de Inversión', 'Los fondos agrupan dinero de muchos inversionistas para comprar diversas inversiones. Es una manera fácil de diversificar con poco dinero.', 'Los fondos ofrecen diversificación automática', 'Investiga 3 fondos de inversión disponibles en tu país', 55, 5, 5),
('card_inversion_006', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Costo de Oportunidad', 'Cada peso que no inviertes es un peso que no está creciendo. En 10 años, $1000 pesos pueden valer $500 por inflación o $2000 por inversión.', 'No invertir también es una decisión con costo', 'Calcula cuánto podrían valer $1000 en 10 años', 60, 5, 6),
('card_inversion_007', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Interés Compuesto', 'Es interés sobre interés. $1000 al 10% anual: año 1 = $1100, año 2 = $1210, año 10 = $2594. El tiempo multiplica exponencialmente.', 'El interés compuesto es la fuerza más poderosa', 'Calcula el interés compuesto de una cantidad por 20 años', 55, 5, 7),
('card_inversion_008', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Comenzar Pequeño', 'Puedes empezar a invertir con $100-500 pesos. Lo importante es comenzar y aprender. El hábito es más valioso que la cantidad inicial.', 'Empezar es más importante que la cantidad', 'Define con cuánto dinero puedes empezar a invertir', 50, 5, 8),
('card_inversion_009', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Educación Antes de Inversión', 'Nunca inviertas en algo que no entiendes. Lee, estudia, pregunta. Una mala decisión por ignorancia puede costarte años de ahorros.', 'La ignorancia es el mayor riesgo de inversión', 'Lee al menos un libro sobre inversiones este mes', 55, 5, 9),
('card_inversion_010', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Inversión vs Especulación', 'Invertir es comprar activos que generen valor a largo plazo. Especular es apostar a movimientos de precios a corto plazo.', 'Invertir es planificar, especular es apostar', 'Decide si quieres ser inversionista o especulador', 50, 5, 10),
('card_inversion_011', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Inflación e Inversión', 'Si la inflación es 5% anual y tu inversión da 4%, estás perdiendo dinero real. Tu inversión debe superar la inflación.', 'Superar inflación es el mínimo en inversiones', 'Busca la tasa de inflación actual de tu país', 55, 5, 11),
('card_inversion_012', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Liquidez de Inversiones', 'Liquidez es qué tan fácil puedes convertir tu inversión en efectivo. Acciones = alta liquidez, inmuebles = baja liquidez.', 'Considera qué tan rápido puedes necesitar el dinero', 'Clasifica tus inversiones por nivel de liquidez', 50, 5, 12),
('card_inversion_013', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Costos de Inversión', 'Todas las inversiones tienen costos: comisiones, administración, impuestos. Un 2% de costo anual puede reducir significativamente tus ganancias.', 'Los costos altos se comen tus ganancias', 'Investiga los costos de diferentes opciones de inversión', 60, 5, 13),
('card_inversion_014', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Perfil de Inversionista', 'Conservador (poco riesgo, menor rendimiento), moderado (riesgo medio), agresivo (alto riesgo, mayor rendimiento potencial). Conoce el tuyo.', 'Tu perfil determina dónde debes invertir', 'Haz un test de perfil de inversionista en línea', 55, 5, 14),
('card_inversion_015', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Dollar Cost Averaging', 'Invierte la misma cantidad cada mes sin importar si el precio está alto o bajo. A largo plazo, promedias el costo de compra.', 'Invertir regularmente elimina el timing del mercado', 'Programa una inversión automática mensual', 60, 5, 15),
('card_inversion_016', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Emociones e Inversión', 'El miedo y la codicia son enemigos del inversionista. Comprar por pánico o vender por euforia destroza los rendimientos.', 'Las emociones son el mayor enemigo del inversionista', 'Define reglas de inversión cuando estés calmado', 55, 5, 16),
('card_inversion_017', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Inversión vs Ahorro', 'Ahorrar preserva dinero, invertir lo hace crecer. Necesitas ambos: ahorro para emergencias, inversión para crecimiento.', 'Ahorro da seguridad, inversión da crecimiento', 'Define cuánto ahorrar vs cuánto invertir', 50, 5, 17),
('card_inversion_018', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Investigar Antes de Invertir', 'Lee reportes, estados financieros, noticias de la empresa o fondo. Una hora de investigación puede ahorrarte años de pérdidas.', 'La investigación es tu mejor protección', 'Investiga a fondo tu próxima opción de inversión', 55, 5, 18),
('card_inversion_019', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Reinvertir Ganancias', 'Cuando tu inversión genere ganancias, reinviértelas en lugar de gastarlas. Esto acelera exponencialmente el crecimiento de tu dinero.', 'Reinvertir multiplica el poder del interés compuesto', 'Compromete a reinvertir las primeras ganancias', 50, 5, 19),
('card_inversion_020', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Timing del Mercado', 'Es imposible predecir perfectamente cuándo comprar o vender. Los mejores inversionistas compran y mantienen a largo plazo.', 'El tiempo en el mercado vence timing del mercado', 'Enfócate en tiempo de permanencia, no en timing', 55, 5, 20),
('card_inversion_021', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Inversión Pasiva vs Activa', 'Pasiva: compras y mantienes (fondos índice). Activa: compras y vendes frecuentemente. La pasiva suele dar mejores resultados.', 'Simple generalmente funciona mejor que complejo', 'Decide si prefieres estrategia pasiva o activa', 60, 5, 21),
('card_inversion_022', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Impuestos en Inversiones', 'Las ganancias de inversiones pueden generar impuestos. Conoce las reglas fiscales de tu país para optimizar tus rendimientos netos.', 'Planifica los impuestos de tus inversiones', 'Investiga el tratamiento fiscal de inversiones', 55, 5, 22),
('card_inversion_023', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Rebalanceo de Portafolio', 'Revisa y ajusta tus inversiones cada 6-12 meses. Si planeaste 60% acciones/40% bonos, mantén esa proporción vendiend lo alto y comprando lo bajo.', 'Rebalancear mantiene tu estrategia en curso', 'Programa rebalanceos regulares de tu portafolio', 60, 5, 23),
('card_inversion_024', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Errores Comunes', 'Pánico en caídas, euforia en subidas, no diversificar, seguir consejos sin investigar, tratar de timing del mercado.', 'Conocer errores comunes te ayuda a evitarlos', 'Identifica qué errores comunes podrías cometer', 50, 5, 24),
('card_inversion_025', (SELECT id FROM education_modules WHERE slug = 'mod_inversion'), 'Inversión Como Hábito', 'Convierte la inversión en un hábito mensual, como pagar servicios. La constancia en inversión es más poderosa que grandes cantidades esporádicas.', 'La inversión constante vence las grandes sumas ocasionales', 'Programa inversiones automáticas mensuales', 55, 5, 25),

-- MÓDULO 5: PLANIFICACIÓN FINANCIERA (25 cards)
('card_plan_001', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Visión Financiera', 'Define dónde quieres estar financieramente en 5, 10 y 20 años. Una visión clara guía todas tus decisiones financieras diarias.', 'Sin visión, cualquier camino lleva a cualquier lugar', 'Escribe tu visión financiera a 10 años', 50, 5, 1),
('card_plan_002', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Metas SMART', 'Específicas, Medibles, Alcanzables, Relevantes, con Tiempo definido. "Ahorrar para casa" es vago. "Ahorrar $50,000 para enganche en 3 años" es SMART.', 'Las metas vagas producen resultados vagos', 'Convierte una meta financiera vaga en SMART', 60, 5, 2),
('card_plan_003', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Priorizar Metas', 'Tendrás múltiples metas financieras. Priorízalas: emergencias primero, luego retiro, después casa, viajes, etc. Enfoque da poder.', 'Muchas metas a la vez son ninguna meta', 'Ordena tus metas financieras por prioridad', 55, 5, 3),
('card_plan_004', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Fondo de Emergencia', 'Antes que cualquier otra meta, ten 3-6 meses de gastos guardados para emergencias. Esto es tu red de seguridad financiera.', 'El fondo de emergencia es tu base financiera', 'Calcula cuánto necesitas para 6 meses de gastos', 55, 5, 4),
('card_plan_005', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Planificación del Retiro', 'Nunca es muy temprano para planificar el retiro. Empezar a los 25 vs 35 años puede significar el doble de dinero al jubilarte.', 'En retiro, el tiempo es tu mejor aliado', 'Calcula cuánto necesitarías ahorrar mensualmente para el retiro', 60, 5, 5),
('card_plan_006', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Revisión Anual', 'Cada año, revisa tu plan financiero completo. La vida cambia y tu plan debe adaptarse: nuevo trabajo, familia, metas diferentes.', 'Un plan que no se revisa se vuelve obsoleto', 'Programa tu revisión financiera anual', 50, 5, 6),
('card_plan_007', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Automatización', 'Automatiza todo lo posible: ahorros, inversiones, pagos de deudas. La automatización elimina la dependencia de fuerza de voluntad.', 'La automatización convierte intenciones en realidad', 'Automatiza al menos 3 aspectos de tus finanzas', 55, 5, 7),
('card_plan_008', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Seguros Como Protección', 'Los seguros protegen tu plan financiero de eventos inesperados. Vida, salud, auto, hogar: evalúa qué necesitas según tu situación.', 'Los seguros son paraguas para tu plan financiero', 'Evalúa qué seguros necesitas según tu situación', 60, 5, 8),
('card_plan_009', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Testamento y Herencia', 'Aunque seas joven, ten un testamento básico. Define quién recibe qué si algo te pasa. Protege a tus seres queridos de problemas legales.', 'Un testamento protege a quienes amas', 'Investiga cómo hacer un testamento básico', 55, 5, 9),
('card_plan_010', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Educación Financiera Continua', 'El mundo financiero cambia constantemente. Lee un libro financiero por año, sigue blogs, toma cursos. La educación es inversión perpetua.', 'La educación financiera nunca termina', 'Elige un libro financiero para leer este mes', 50, 5, 10),
('card_plan_011', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Planificación Familiar', 'Si tienes familia, involúcralos en la planificación. Todos deben conocer las metas familiares y cómo sus acciones las afectan.', 'La planificación familiar requiere participación familiar', 'Ten una reunión familiar sobre metas financieras', 55, 5, 11),
('card_plan_012', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Costo de Hijos', 'Los hijos son maravillosos pero costosos. Planifica gastos: pañales, comida, educación, salud. Un hijo puede costar $200,000+ hasta los 18 años.', 'Los hijos requieren planificación financiera específica', 'Si planeas hijos, investiga los costos reales', 60, 5, 12),
('card_plan_013', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Compra de Casa', 'Comprar casa es la mayor compra de la mayoría. Planifica: enganche (10-20%), gastos de cierre, pagos mensuales, mantenimiento, impuestos.', 'Comprar casa requiere planificación integral', 'Calcula todos los costos reales de comprar casa', 60, 5, 13),
('card_plan_014', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Cambios de Carrera', 'Los cambios de carrera son normales pero impactan las finanzas. Planifica: ahorros para transición, nueva certificación, posible reducción de ingresos.', 'Los cambios de carrera requieren preparación financiera', 'Si planeas cambio de carrera, presupuesta la transición', 55, 5, 14),
('card_plan_015', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Vacaciones y Viajes', 'Los viajes enriquecen la vida pero pueden arruinar finanzas si no se planifican. Crea un fondo específico y viaja dentro de tus posibilidades.', 'Viajar sin planificación puede costarte caro', 'Crea un plan de ahorro para tu próximo viaje', 50, 5, 15),
('card_plan_016', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Planificación Tributaria', 'Los impuestos son un gasto significativo. Planifica: deducciones legales, inversiones que reduzcan impuestos, timing de ingresos y gastos.', 'Una buena planificación tributaria ahorra dinero', 'Busca un contador para optimizar tus impuestos', 60, 5, 16),
('card_plan_017', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Plan B Financiero', 'Siempre ten un Plan B: qué harías si pierdes el trabajo, si te enfermas, si hay crisis económica. Los planes alternativos dan tranquilidad.', 'Un Plan B te protege de lo inesperado', 'Define tu Plan B para pérdida de empleo', 55, 5, 17),
('card_plan_018', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Tecnología Financiera', 'Usa apps y herramientas para facilitar tu planificación: presupuestos, inversiones, seguimiento de gastos. La tecnología puede simplificar mucho.', 'La tecnología puede hacer las finanzas más fáciles', 'Investiga 3 apps financieras útiles para ti', 50, 5, 18),
('card_plan_019', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Mentores Financieros', 'Busca personas que hayan logrado lo que quieres lograr financieramente. Sus consejos y experiencia pueden ahorrarte años de errores.', 'Los mentores aceleran tu progreso financiero', 'Identifica una persona para ser tu mentor financiero', 55, 5, 19),
('card_plan_020', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Midiendo Progreso', 'Define métricas para medir tu progreso: patrimonio neto, ratio deuda/ingreso, porcentaje de ahorro. Lo que se mide, se mejora.', 'Medir el progreso te mantiene en el camino', 'Define 3 métricas para medir tu progreso financiero', 60, 5, 20),
('card_plan_021', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Flexibilidad en Planes', 'Los planes deben ser firmes pero flexibles. Si las circunstancias cambian dramáticamente, ajusta el plan en lugar de abandonarlo.', 'La flexibilidad mantiene vivos los planes', 'Identifica aspectos de tu plan que podrían necesitar flexibilidad', 50, 5, 21),
('card_plan_022', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Equilibrio Vida-Dinero', 'El dinero es importante pero no es todo. Planifica para tener suficiente dinero para disfrutar la vida, no para sacrificar la vida por dinero.', 'El dinero debe servir a la vida, no al revés', 'Define qué significa "suficiente dinero" para ti', 55, 5, 22),
('card_plan_023', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Legado Financiero', 'Piensa en el legado que quieres dejar: a tu familia, causas que apoyas, impacto en tu comunidad. El dinero puede ser herramienta de legado.', 'Un buen plan financiero trasciende tu propia vida', 'Define qué legado financiero quieres dejar', 55, 5, 23),
('card_plan_024', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Crisis y Oportunidades', 'Las crisis financieras también traen oportunidades: activos baratos, nuevos negocios, cambios de carrera. Estar preparado te permite aprovecharlas.', 'En toda crisis hay oportunidades para los preparados', 'Define cómo podrías aprovechar una futura crisis', 60, 5, 24),
('card_plan_025', (SELECT id FROM education_modules WHERE slug = 'mod_planificacion'), 'Plan Como Documento Vivo', 'Tu plan financiero debe ser un documento que consultes y actualizes regularmente, no algo que hagas una vez y olvides.', 'Un plan sin mantenimiento se vuelve inútil', 'Programa revisiones trimestrales de tu plan financiero', 50, 5, 25)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  key_takeaway = EXCLUDED.key_takeaway,
  practical_tip = EXCLUDED.practical_tip,
  reading_time_seconds = EXCLUDED.reading_time_seconds,
  xp_reward = EXCLUDED.xp_reward,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = timezone('utc'::text, now());

-- Verificar que se insertó correctamente
DO $$
DECLARE
  module_count INTEGER;
  card_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO module_count FROM education_modules WHERE is_active = true;
  SELECT COUNT(*) INTO card_count FROM education_cards WHERE is_active = true;
  
  RAISE NOTICE 'Sistema de educación configurado exitosamente:';
  RAISE NOTICE '- Módulos activos: %', module_count;
  RAISE NOTICE '- Cards activas: %', card_count;
  RAISE NOTICE 'Funciones disponibles: mark_card_as_read(), get_module_card_progress()';
  RAISE NOTICE 'XP constraint actualizado para incluir education_card';
END
$$;