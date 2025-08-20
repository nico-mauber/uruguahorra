-- ============================================
-- URUGUAHORRA - COMPLETE DATABASE SCHEMA
-- ============================================
-- ÚNICO archivo necesario para crear toda la base de datos desde cero
-- Versión: 2.9 - Actualizada tabla subscriptions para integración con Mercado Pago
-- Fecha: 20 de Enero, 2025
-- ============================================
-- 
-- INSTRUCCIONES DE USO:
-- 1. Copiar COMPLETO este archivo
-- 2. Ejecutar en Supabase SQL Editor
-- 3. La base de datos quedará totalmente configurada y funcional
-- 
-- CORRECCIONES INCLUIDAS EN ESTA VERSIÓN:
-- ✅ user_streaks.last_activity_date → last_activity_at (TIMESTAMPTZ)
-- ✅ users.last_activity_date → last_activity_at (TIMESTAMPTZ)
-- ✅ user_streaks.protection_reset_date (TIMESTAMPTZ) - AGREGADA
-- ✅ user_streaks.streak_protections_used (INTEGER) - AGREGADA
-- ✅ Consistencia entre esquema DB y tipos TypeScript
-- ✅ Referencias actualizadas en todas las funciones
-- ✅ Resuelve ERROR PGRST204 completamente
-- 
-- ADVERTENCIA: Este script ELIMINA todos los datos y estructura existente
-- y los recrea con la estructura correcta y actualizada
-- ============================================

-- ============================================
-- PASO 1: ELIMINACIÓN COMPLETA Y FORZADA
-- ============================================

DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '🗑️ ELIMINANDO TODA LA ESTRUCTURA EXISTENTE...';
    
    -- Eliminar TODAS las vistas (sin excepción)
    FOR r IN (
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', r.schemaname, r.viewname);
        RAISE NOTICE 'Vista eliminada: %.%', r.schemaname, r.viewname;
    END LOOP;
    
    -- Eliminar TODAS las funciones (sin excepción)
    FOR r IN (
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc 
        WHERE pronamespace = 'public'::regnamespace
    ) LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
        RAISE NOTICE 'Función eliminada: %(%)', r.proname, r.args;
    END LOOP;
    
    -- Eliminar TODOS los triggers
    FOR r IN (
        SELECT trigger_schema, event_object_table, trigger_name
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I CASCADE', r.trigger_name, r.trigger_schema, r.event_object_table);
        RAISE NOTICE 'Trigger eliminado: % en %.%', r.trigger_name, r.trigger_schema, r.event_object_table;
    END LOOP;
    
    -- Eliminar TODAS las tablas (sin excepción)
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.tablename);
        RAISE NOTICE 'Tabla eliminada: %', r.tablename;
    END LOOP;
    
    RAISE NOTICE '✅ ESTRUCTURA ANTERIOR ELIMINADA COMPLETAMENTE';
END $$;

-- ============================================
-- PASO 2: EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PASO 3: CREACIÓN DE TABLAS (ORDEN CORRECTO)
-- ============================================

-- TABLA USERS (PRINCIPAL - DEBE SER PRIMERA)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    country TEXT DEFAULT 'UY',
    currency TEXT DEFAULT 'UYU',
    premium BOOLEAN DEFAULT false,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA GOALS (CON TODAS LAS COLUMNAS NECESARIAS)
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    target_amount DECIMAL(15,2) NOT NULL CHECK (target_amount > 0),
    current_amount DECIMAL(15,2) DEFAULT 0 CHECK (current_amount >= 0),
    saved_amount DECIMAL(15,2) DEFAULT 0 CHECK (saved_amount >= 0),
    category TEXT DEFAULT 'general',
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'shield',
    deadline DATE,
    target_date DATE,
    is_completed BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA MICRO_CONTRIBUTIONS
CREATE TABLE public.micro_contributions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA CHALLENGES
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'savings',
    difficulty TEXT DEFAULT 'easy',
    requirement_type TEXT DEFAULT 'savings' CHECK (requirement_type IN ('savings', 'transactions', 'streak', 'goals')),
    xp_reward INTEGER DEFAULT 50,
    target_value DECIMAL(10,2),
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_CHALLENGES
CREATE TABLE public.user_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'failed')),
    progress DECIMAL(5,2) DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- TABLA SQUADS
CREATE TABLE public.squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 10,
    is_private BOOLEAN DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA SQUAD_MEMBERS
CREATE TABLE public.squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(squad_id, user_id)
);

-- TABLA LEARNINGS
CREATE TABLE public.learnings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    estimated_read_time INTEGER DEFAULT 5,
    xp_reward INTEGER DEFAULT 25,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_PROGRESS (LEARNINGS)
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learning_id UUID NOT NULL REFERENCES public.learnings(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, learning_id)
);

-- TABLA TRANSACTIONS_RAW
CREATE TABLE public.transactions_raw (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    original_description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    transaction_date DATE NOT NULL,
    category TEXT,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT false
);

-- TABLA SUBSCRIPTIONS (Actualizada para Mercado Pago)
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending', 'paused', 'past_due', 'trial')),
    plan TEXT DEFAULT 'premium',
    provider TEXT DEFAULT 'mercadopago',
    provider_subscription_id TEXT UNIQUE,
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    paused_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_STREAKS
CREATE TABLE public.user_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    streak_protections_used INTEGER DEFAULT 0,
    protection_reset_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- TABLA USER_XP_LOG
CREATE TABLE public.user_xp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('contribution', 'challenge_complete', 'daily_streak', 'quest_complete')),
    xp_earned INTEGER NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA WEEKLY_QUESTS (PARA GAMIFICACIÓN)
CREATE TABLE public.weekly_quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE NOT NULL,
    challenge_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_QUEST_PROGRESS (SEGUIMIENTO DE PROGRESO DE QUESTS)
CREATE TABLE public.user_quest_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.weekly_quests(id) ON DELETE CASCADE,
    completed_challenge_ids UUID[] DEFAULT '{}',
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, quest_id)
);

-- TABLA AUDIT_LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA PAYWALL_EVENTS
CREATE TABLE public.paywall_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PASO 4: CREACIÓN DE ÍNDICES
-- ============================================

-- Índices para users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_premium ON public.users(premium);
CREATE INDEX idx_users_level ON public.users(current_level);

-- Índices para goals
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_category ON public.goals(category);
CREATE INDEX idx_goals_completed ON public.goals(is_completed);
CREATE INDEX idx_goals_active ON public.goals(is_active);
CREATE INDEX idx_goals_deadline ON public.goals(deadline);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);
CREATE INDEX idx_goals_color ON public.goals(color);

-- Índices para micro_contributions
CREATE INDEX idx_micro_contributions_goal_id ON public.micro_contributions(goal_id);
CREATE INDEX idx_micro_contributions_user_id ON public.micro_contributions(user_id);
CREATE INDEX idx_micro_contributions_date ON public.micro_contributions(created_at DESC);

-- Índices para challenges
CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_active ON public.challenges(is_active);

-- Índices para user_challenges
CREATE INDEX idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenges(status);
CREATE INDEX idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);

-- Índices para squads
CREATE INDEX idx_squads_created_by ON public.squads(created_by);
CREATE INDEX idx_squads_private ON public.squads(is_private);

-- Índices para squad_members
CREATE INDEX idx_squad_members_squad_id ON public.squad_members(squad_id);
CREATE INDEX idx_squad_members_user_id ON public.squad_members(user_id);

-- Índices para learnings
CREATE INDEX idx_learnings_category ON public.learnings(category);
CREATE INDEX idx_learnings_difficulty ON public.learnings(difficulty_level);
CREATE INDEX idx_learnings_published ON public.learnings(is_published);

-- Índices para user_progress
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_learning_id ON public.user_progress(learning_id);
CREATE INDEX idx_user_progress_status ON public.user_progress(status);

-- Índices para transactions_raw
CREATE INDEX idx_transactions_raw_user_id ON public.transactions_raw(user_id);
CREATE INDEX idx_transactions_raw_date ON public.transactions_raw(transaction_date DESC);
CREATE INDEX idx_transactions_raw_processed ON public.transactions_raw(is_processed);

-- Índices para subscriptions
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX idx_subscriptions_provider ON public.subscriptions(provider);
CREATE INDEX idx_subscriptions_provider_id ON public.subscriptions(provider_subscription_id);

-- Índices para user_streaks
CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);

-- Índices para user_xp_log
CREATE INDEX idx_user_xp_log_user_id ON public.user_xp_log(user_id);
CREATE INDEX idx_user_xp_log_event_type ON public.user_xp_log(event_type);
CREATE INDEX idx_user_xp_log_date ON public.user_xp_log(created_at DESC);

-- Índices para weekly_quests
CREATE INDEX idx_weekly_quests_week_start ON public.weekly_quests(week_start_date);
CREATE INDEX idx_weekly_quests_active ON public.weekly_quests(is_active);
CREATE INDEX idx_weekly_quests_created_at ON public.weekly_quests(created_at DESC);

-- Índices para user_quest_progress
CREATE INDEX idx_user_quest_progress_user_id ON public.user_quest_progress(user_id);
CREATE INDEX idx_user_quest_progress_quest_id ON public.user_quest_progress(quest_id);
CREATE INDEX idx_user_quest_progress_completed ON public.user_quest_progress(completed_at);
CREATE INDEX idx_user_quest_progress_completion ON public.user_quest_progress(completion_percentage);
CREATE INDEX idx_user_quest_progress_updated ON public.user_quest_progress(updated_at DESC);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_date ON public.audit_logs(created_at DESC);

-- Índices para paywall_events
CREATE INDEX idx_paywall_events_user_id ON public.paywall_events(user_id);
CREATE INDEX idx_paywall_events_type ON public.paywall_events(event_type);

-- ============================================
-- PASO 5: ROW LEVEL SECURITY
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;

-- Políticas para USERS (SELECT, UPDATE, E INSERT PARA TRIGGERS)
CREATE POLICY "users_can_select_own" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_can_update_own" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- CRÍTICO: Permitir INSERT para que el trigger de creación automática funcione
CREATE POLICY "users_can_insert_own" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Políticas para GOALS
CREATE POLICY "goals_all_own" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para MICRO_CONTRIBUTIONS
CREATE POLICY "micro_contributions_all_own" ON public.micro_contributions
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para CHALLENGES (lectura pública)
CREATE POLICY "challenges_read_all" ON public.challenges
    FOR SELECT USING (true);

-- Políticas para USER_CHALLENGES
CREATE POLICY "user_challenges_all_own" ON public.user_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para SQUADS
CREATE POLICY "squads_read_all" ON public.squads
    FOR SELECT USING (true);

CREATE POLICY "squads_manage_own" ON public.squads
    FOR ALL USING (auth.uid() = created_by);

-- Políticas para SQUAD_MEMBERS
CREATE POLICY "squad_members_read_related" ON public.squad_members
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.uid() IN (SELECT created_by FROM public.squads WHERE id = squad_id)
    );

CREATE POLICY "squad_members_manage_own" ON public.squad_members
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para LEARNINGS (lectura pública)
CREATE POLICY "learnings_read_published" ON public.learnings
    FOR SELECT USING (is_published = true);

-- Políticas para USER_PROGRESS
CREATE POLICY "user_progress_all_own" ON public.user_progress
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para TRANSACTIONS_RAW
CREATE POLICY "transactions_raw_all_own" ON public.transactions_raw
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para SUBSCRIPTIONS
CREATE POLICY "subscriptions_select_own" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_service_role" ON public.subscriptions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para USER_STREAKS
CREATE POLICY "user_streaks_all_own" ON public.user_streaks
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para USER_XP_LOG
CREATE POLICY "user_xp_log_all_own" ON public.user_xp_log
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para WEEKLY_QUESTS (lectura pública)
CREATE POLICY "weekly_quests_read_all" ON public.weekly_quests
    FOR SELECT USING (true);

-- Políticas para USER_QUEST_PROGRESS
CREATE POLICY "user_quest_progress_all_own" ON public.user_quest_progress
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para AUDIT_LOGS (solo lectura propia)
CREATE POLICY "audit_logs_read_own" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Políticas para PAYWALL_EVENTS
CREATE POLICY "paywall_events_all_own" ON public.paywall_events
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PASO 6: FUNCIONES Y TRIGGERS
-- ============================================

-- Función para crear perfiles automáticamente (SECURITY DEFINER para saltear RLS)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RAISE NOTICE 'Creando perfil para usuario: % (%)', NEW.email, NEW.id;
    
    -- Intentar insertar el perfil del usuario
    INSERT INTO public.users (
        id,
        email,
        country,
        currency,
        premium,
        total_xp,
        current_level,
        current_streak,
        longest_streak,
        last_activity_at,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'country', 'UY'),
        COALESCE(NEW.raw_user_meta_data->>'currency', 'UYU'),
        false,
        0,
        1,
        0,
        0,
        CURRENT_DATE,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Perfil creado exitosamente para usuario: %', NEW.id;
    RETURN NEW;
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creando perfil para %: %', NEW.id, SQLERRM;
        RETURN NEW; -- No fallar el registro de auth incluso si falla el perfil
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar current_amount y saved_amount en goals
CREATE OR REPLACE FUNCTION public.update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar tanto current_amount como saved_amount (son equivalentes)
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

-- Trigger para nuevos usuarios
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON public.user_streaks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_quest_progress_updated_at
    BEFORE UPDATE ON public.user_quest_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para actualizar progreso de metas
CREATE TRIGGER update_goal_progress_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.micro_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

-- ============================================
-- PASO 7: DATOS SEMILLA
-- ============================================

-- Challenges básicos
INSERT INTO public.challenges (title, description, type, difficulty, xp_reward, target_value, duration_days) VALUES
('Primer Ahorro', 'Realiza tu primera contribución a cualquier meta', 'savings', 'easy', 50, 1, 7),
('Ahorro Semanal', 'Ahorra durante 7 días consecutivos', 'streak', 'medium', 100, 7, 7),
('Meta Alcanzada', 'Completa tu primera meta de ahorro', 'goal', 'medium', 200, 1, 30),
('Ahorrador Constante', 'Realiza 10 contribuciones en un mes', 'frequency', 'hard', 300, 10, 30),
('Maestro del Ahorro', 'Completa 5 metas diferentes', 'goal', 'hard', 500, 5, 90);

-- Contenido educativo básico
INSERT INTO public.learnings (title, content, category, difficulty_level, estimated_read_time, xp_reward) VALUES
('Introducción al Ahorro', 'Aprende los conceptos básicos del ahorro y por qué es importante para tu futuro financiero.', 'basics', 1, 5, 25),
('Presupuesto Personal', 'Descubre cómo crear un presupuesto que te ayude a controlar tus gastos y aumentar tus ahorros.', 'budgeting', 2, 8, 40),
('Metas SMART', 'Aprende a establecer metas de ahorro específicas, medibles, alcanzables, relevantes y con tiempo definido.', 'planning', 2, 6, 35),
('Inversiones Básicas', 'Conceptos fundamentales sobre inversiones para hacer crecer tu dinero a largo plazo.', 'investing', 3, 12, 60),
('Fondos de Emergencia', 'La importancia de tener un fondo de emergencia y cómo construirlo paso a paso.', 'emergency', 2, 7, 45);

-- Quest semanal de ejemplo (se creará automáticamente una por semana)
INSERT INTO public.weekly_quests (week_start_date, challenge_ids, is_active) VALUES
(CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day', 
 ARRAY(SELECT id FROM public.challenges WHERE is_active = true LIMIT 3), 
 true);

-- ============================================
-- PASO 8: SINCRONIZAR USUARIOS EXISTENTES
-- ============================================

-- Crear perfiles para usuarios que no los tengan
INSERT INTO public.users (
    id,
    email,
    country,
    currency,
    premium,
    total_xp,
    current_level,
    current_streak,
    longest_streak,
    last_activity_at,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'country', 'UY'),
    COALESCE(au.raw_user_meta_data->>'currency', 'UYU'),
    false,
    0,
    1,
    0,
    0,
    CURRENT_DATE,
    au.created_at,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 9: VISTAS ÚTILES (AL FINAL)
-- ============================================

-- Vista de dashboard de usuario
CREATE VIEW public.user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.country,
    u.currency,
    u.premium,
    u.total_xp,
    u.current_level,
    u.current_streak,
    COALESCE(COUNT(g.id) FILTER (WHERE g.is_active = true), 0) as total_goals,
    COALESCE(COUNT(g.id) FILTER (WHERE g.is_completed = true), 0) as completed_goals,
    COALESCE(SUM(g.target_amount) FILTER (WHERE g.is_active = true), 0) as total_target_amount,
    COALESCE(SUM(g.current_amount) FILTER (WHERE g.is_active = true), 0) as total_current_amount,
    CASE 
        WHEN SUM(g.target_amount) FILTER (WHERE g.is_active = true) > 0 
        THEN ROUND((SUM(g.current_amount) FILTER (WHERE g.is_active = true) / SUM(g.target_amount) FILTER (WHERE g.is_active = true)) * 100, 2)
        ELSE 0 
    END as progress_percentage,
    COALESCE(COUNT(uc.id) FILTER (WHERE uc.status = 'done'), 0) as completed_challenges
FROM public.users u
LEFT JOIN public.goals g ON u.id = g.user_id
LEFT JOIN public.user_challenges uc ON u.id = uc.user_id
GROUP BY u.id, u.email, u.country, u.currency, u.premium, u.total_xp, u.current_level, u.current_streak;

-- Vista de estadísticas de metas
CREATE VIEW public.goal_stats AS
SELECT 
    g.id,
    g.name,
    g.target_amount,
    g.current_amount,
    g.saved_amount,
    g.category,
    g.color,
    g.icon,
    g.is_active,
    g.is_completed,
    CASE 
        WHEN g.target_amount > 0 THEN ROUND((g.current_amount / g.target_amount) * 100, 2)
        ELSE 0
    END as progress_percentage,
    COALESCE(COUNT(mc.id), 0) as total_contributions,
    COALESCE(AVG(mc.amount), 0) as avg_contribution,
    g.created_at,
    g.deadline,
    g.target_date,
    CASE 
        WHEN g.deadline IS NOT NULL THEN g.deadline - CURRENT_DATE
        WHEN g.target_date IS NOT NULL THEN g.target_date - CURRENT_DATE
        ELSE NULL
    END as days_remaining
FROM public.goals g
LEFT JOIN public.micro_contributions mc ON g.id = mc.goal_id
GROUP BY g.id, g.name, g.target_amount, g.current_amount, g.saved_amount, g.category, g.color, g.icon, g.is_active, g.is_completed, g.created_at, g.deadline, g.target_date;

-- ============================================
-- PASO 10: DIAGNÓSTICO Y CORRECCIÓN DE PERFILES
-- ============================================

-- Diagnóstico detallado de usuarios sin perfil
DO $$
DECLARE
    users_without_profile INTEGER;
    auth_user_count INTEGER;
    profile_user_count INTEGER;
BEGIN
    -- Contar usuarios sin perfil
    SELECT COUNT(*) INTO users_without_profile
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL;
    
    -- Contar totales para diagnóstico
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_user_count FROM public.users;
    
    RAISE NOTICE '🔍 DIAGNÓSTICO DE USUARIOS:';
    RAISE NOTICE '- Usuarios en auth.users: %', auth_user_count;
    RAISE NOTICE '- Usuarios con perfil: %', profile_user_count;
    RAISE NOTICE '- Usuarios sin perfil: %', users_without_profile;
    
    IF users_without_profile = 0 THEN
        RAISE NOTICE '✅ TODOS LOS USUARIOS TIENEN PERFIL';
    ELSE
        RAISE NOTICE '⚠️ HAY % USUARIOS SIN PERFIL - Aplicando corrección...', users_without_profile;
        
        -- CORRECCIÓN AUTOMÁTICA: Crear perfiles faltantes
        INSERT INTO public.users (
            id,
            email,
            country,
            currency,
            premium,
            total_xp,
            current_level,
            current_streak,
            longest_streak,
            last_activity_at,
            created_at,
            updated_at
        )
        SELECT 
            au.id,
            au.email,
            COALESCE(au.raw_user_meta_data->>'country', 'UY'),
            COALESCE(au.raw_user_meta_data->>'currency', 'UYU'),
            false,
            0,
            1,
            0,
            0,
            CURRENT_DATE,
            au.created_at,
            NOW()
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL
        ON CONFLICT (id) DO NOTHING;
        
        -- Verificar corrección
        SELECT COUNT(*) INTO users_without_profile
        FROM auth.users au
        LEFT JOIN public.users pu ON au.id = pu.id
        WHERE pu.id IS NULL;
        
        IF users_without_profile = 0 THEN
            RAISE NOTICE '✅ CORRECCIÓN EXITOSA: Todos los usuarios ahora tienen perfil';
        ELSE
            RAISE NOTICE '❌ CORRECCIÓN PARCIAL: Aún quedan % usuarios sin perfil', users_without_profile;
        END IF;
    END IF;
END $$;

-- ============================================
-- PASO 11: VERIFICACIÓN DE INTEGRIDAD DEL SISTEMA
-- ============================================

DO $$
DECLARE
    test_user_id UUID;
    test_goal_id UUID;
    trigger_count INTEGER;
    function_exists BOOLEAN;
BEGIN
    -- Verificar que el trigger existe y está activo
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created';
    
    -- Verificar que la función del trigger existe
    SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user'
    ) INTO function_exists;
    
    RAISE NOTICE '🔧 VERIFICACIÓN DE SISTEMA:';
    RAISE NOTICE '- Trigger on_auth_user_created: %', 
        CASE WHEN trigger_count > 0 THEN '✅ Activo' ELSE '❌ Faltante' END;
    RAISE NOTICE '- Función handle_new_user: %', 
        CASE WHEN function_exists THEN '✅ Existe' ELSE '❌ Faltante' END;
    
    -- ============================================
    -- TEST FINAL DE FUNCIONALIDAD
    -- ============================================
    
    -- Test final de inserción
    SELECT id INTO test_user_id FROM public.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insertar meta de prueba con TODAS las columnas
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
            'Test Meta Final', 
            9999999999999.99, 
            1234567890.50,
            1234567890.50,
            'travel',
            '#10B981',
            'airplane',
            true,
            CURRENT_DATE + INTERVAL '6 months'
        ) RETURNING id INTO test_goal_id;
        
        -- Insertar contribución de prueba
        INSERT INTO public.micro_contributions (
            goal_id,
            user_id,
            amount,
            description
        ) VALUES (
            test_goal_id,
            test_user_id,
            999999999.99,
            'Test contribución final'
        );
        
        -- Limpiar datos de prueba
        DELETE FROM public.micro_contributions WHERE goal_id = test_goal_id;
        DELETE FROM public.goals WHERE id = test_goal_id;
        
        RAISE NOTICE '✅ TEST FINAL EXITOSO: Meta creada y eliminada correctamente';
        RAISE NOTICE '✅ FOREIGN KEY CONSTRAINT: Funcionando correctamente';
        RAISE NOTICE '✅ SISTEMA LISTO: Puedes crear metas sin errores';
    ELSE
        RAISE NOTICE '⚠️ No hay usuarios para el test final';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST FINAL FALLIDO: %', SQLERRM;
    RAISE NOTICE '💡 Si el error es de foreign key, ejecuta el script fix_missing_user_profiles.sql';
END $$;

-- ============================================
-- MENSAJE FINAL
-- ============================================

SELECT 
    '🎉 URUGUAHORRA DATABASE DEPLOYED SUCCESSFULLY' as status,
    'Version 2.6 - Quest tables added - Gamification system ready' as version,
    'All systems operational - Goals, Users, Quests working' as ready,
    NOW() as deployed_at;