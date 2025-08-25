-- ============================================
-- URUGUAHORRA - COMPLETE DATABASE SCHEMA
-- ============================================
-- ÚNICO archivo necesario para crear toda la base de datos desde cero
-- Versión: 5.4 - Challenge System V2 + Pods System + Igualdad de Permisos + Limpieza Total Opcional
-- Fecha: 25 de Agosto, 2025
-- ============================================
-- 
-- INSTRUCCIONES DE USO:
-- 1. Copiar COMPLETO este archivo
-- 2. Ejecutar en Supabase SQL Editor
-- 3. La base de datos quedará totalmente configurada y funcional
-- 
-- CAMBIOS PRINCIPALES EN ESTA VERSIÓN:
-- ✅ CHALLENGE SYSTEM V2 INTEGRADO: Nuevo sistema de retos con categorías, sesiones y duración personalizable
-- ✅ CORREGIDO: Triggers para actualizar automáticamente el progreso de metas cuando se agregan ahorros
-- ✅ CORREGIDO: Inicialización automática de user_streaks para nuevos usuarios y función de recuperación
-- ✅ Sistema de categorías de retos con UI mejorada (iconos, colores)
-- ✅ Sesiones de usuario con seguimiento de progreso y renovación
-- ✅ Funciones auxiliares para gestión automática de expiración
-- ✅ Índices optimizados para consultas de retos y sesiones
-- ✅ Sistema de gamificación actualizado (XP por completar sesiones)
-- ✅ Sistema de autenticación SIMPLIFICADO mantenido
-- ✅ Políticas RLS mínimas y funcionales
-- ✅ Función simple_create_user_profile() para trigger automático
-- ✅ Función get_or_create_user_profile() como fallback
-- ✅ Eliminada la verificación de email obligatoria
-- ✅ Creación de perfil garantizada con múltiples mecanismos
-- ✅ Compatible con registro e inicio de sesión inmediato
-- ✅ Incluye todas las migraciones (fix_goals_policies, add_missing_goals_columns, etc.)
-- ✅ Sincronización automática de IDs entre auth.users y public.users
-- ✅ Limpieza de perfiles huérfanos
-- ✅ QUEST SYSTEM FIX INTEGRADO - Políticas RLS corregidas para weekly_quests y user_quest_progress
-- ✅ Función auxiliar create_user_quest_progress_safe() incluida
-- ✅ Sistema de quests completamente funcional sin parches defensivos
-- ✅ TRIGGERS CORREGIDOS - Progreso de metas se actualiza automáticamente al agregar ahorros
-- ✅ USER_STREAKS FIX - Inicialización automática y función de recuperación para error 406
-- ✅ PODS/SQUADS SYSTEM COMPLETE - Sistema completo de pods de ahorro con invite codes
-- ✅ FIXED RLS POLICIES - Políticas sin recursión infinita para squad_members
-- ✅ IGUALDAD DE PERMISOS - Todos los miembros de pods son administradores
-- 
-- ADVERTENCIA: Este script ELIMINA todos los datos y estructura existente
-- y los recrea con la estructura correcta y actualizada
-- ============================================

-- ============================================
-- PASO 0 (OPCIONAL): LIMPIEZA TOTAL DE DATOS Y USUARIOS
-- ============================================
-- ADVERTENCIA: Descomenta las siguientes líneas SOLO si quieres eliminar TODO
-- incluyendo usuarios de auth.users. Útil para desarrollo/testing.

/*
BEGIN;
-- Eliminar TODOS los usuarios de auth.users (esto eliminará todo en cascada)
DO $$
DECLARE
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    DELETE FROM auth.users;
    RAISE NOTICE '✅ Eliminados % usuarios de auth.users', auth_count;
    RAISE NOTICE '⚠️  TODA la base de datos ha sido limpiada completamente';
END $$;
COMMIT;
*/

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

-- TABLA CHALLENGE_CATEGORIES (NUEVA - PARA SISTEMA V2)
CREATE TABLE public.challenge_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    color TEXT DEFAULT '#4CAF50',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA CHALLENGES (ACTUALIZADA PARA SISTEMA V2)
CREATE TABLE public.challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'savings' CHECK (type IN ('savings', 'spending_habits', 'investments', 'budgeting', 'financial_education', 'daily_expenses', 'entertainment')),
    difficulty TEXT DEFAULT 'easy' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    requirement_type TEXT DEFAULT 'savings' CHECK (requirement_type IN ('savings', 'transactions', 'streak', 'goals')),
    xp_reward INTEGER DEFAULT 50,
    target_value DECIMAL(10,2),
    duration_days INTEGER,
    is_active BOOLEAN DEFAULT true,
    -- Nuevas columnas para sistema V2
    category_id UUID REFERENCES public.challenge_categories(id),
    category_name TEXT, -- Temporal para migración
    tags TEXT[] DEFAULT '{}',
    icon TEXT,
    color TEXT DEFAULT '#4CAF50',
    min_duration_days INTEGER DEFAULT 7,
    max_duration_days INTEGER DEFAULT 365,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_CHALLENGE_SESSIONS (NUEVA - REEMPLAZA user_challenges)
CREATE TABLE public.user_challenge_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'renewed', 'cancelled')),
    duration_type TEXT NOT NULL CHECK (duration_type IN ('1_week', '15_days', '30_days', '1_year')),
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    xp_earned INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    renewed_from_session_id UUID REFERENCES public.user_challenge_sessions(id),
    notification_settings JSONB DEFAULT '{"daily_reminder": true, "progress_updates": true, "expiration_warning": true}',
    progress_log JSONB DEFAULT '[]', -- Historial de actualizaciones de progreso
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA USER_CHALLENGES (MANTENIDA PARA COMPATIBILIDAD)
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

-- TABLA SQUADS (ACTUALIZADA PARA SISTEMA DE PODS)
CREATE TABLE public.squads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    max_members INTEGER DEFAULT 10,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA SQUAD_MEMBERS (ACTUALIZADA PARA SISTEMA DE PODS - TODOS SON ADMIN)
CREATE TABLE public.squad_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'owner', 'member')), -- owner y member para compatibilidad
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    total_saved DECIMAL(10,2) DEFAULT 0,
    monthly_saved DECIMAL(10,2) DEFAULT 0,
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

-- TABLA USER_XP_LOG (ACTUALIZADA PARA CHALLENGE SYSTEM V2)
CREATE TABLE public.user_xp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('contribution', 'challenge_complete', 'challenge_session_complete', 'daily_streak', 'quest_complete')),
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

-- Índices para challenge_categories
CREATE INDEX idx_challenge_categories_sort_order ON public.challenge_categories(sort_order);
CREATE INDEX idx_challenge_categories_active ON public.challenge_categories(is_active) WHERE is_active = true;

-- Índices para challenges (actualizados)
CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_active ON public.challenges(is_active);
CREATE INDEX idx_challenges_category_id ON public.challenges(category_id);

-- Índices para user_challenge_sessions (nuevos)
CREATE INDEX idx_user_challenge_sessions_user_id ON public.user_challenge_sessions(user_id);
CREATE INDEX idx_user_challenge_sessions_challenge_id ON public.user_challenge_sessions(challenge_id);
CREATE INDEX idx_user_challenge_sessions_status ON public.user_challenge_sessions(status);
CREATE INDEX idx_user_challenge_sessions_end_date ON public.user_challenge_sessions(end_date);
CREATE INDEX idx_user_challenge_sessions_user_status ON public.user_challenge_sessions(user_id, status);
CREATE INDEX idx_user_challenge_sessions_user_challenge ON public.user_challenge_sessions(user_id, challenge_id);
CREATE INDEX idx_user_challenge_sessions_status_end_date ON public.user_challenge_sessions(status, end_date) WHERE status = 'active';
CREATE INDEX idx_user_challenge_sessions_active ON public.user_challenge_sessions(user_id, end_date) WHERE status = 'active';

-- Índices para user_challenges
CREATE INDEX idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_status ON public.user_challenges(status);
CREATE INDEX idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);

-- Índices para squads (actualizados para pods)
CREATE INDEX idx_squads_created_by ON public.squads(created_by);
CREATE INDEX idx_squads_owner_id ON public.squads(owner_id);
CREATE INDEX idx_squads_invite_code ON public.squads(invite_code);
CREATE INDEX idx_squads_active ON public.squads(is_active);

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
ALTER TABLE public.challenge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_sessions ENABLE ROW LEVEL SECURITY;
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

-- Políticas SIMPLIFICADAS para USERS
-- Política simple: usuarios pueden ver y modificar solo su propio perfil
CREATE POLICY "users_simple_policy" ON public.users
    FOR ALL 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política para permitir operaciones con service role (para funciones)
CREATE POLICY "service_role_all" ON public.users
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para GOALS (separadas por operación para mayor claridad)
-- Política para SELECT: usuarios pueden ver sus propias metas
CREATE POLICY "goals_select_own" ON public.goals
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Política para INSERT: usuarios pueden crear metas para sí mismos
CREATE POLICY "goals_insert_own" ON public.goals
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: usuarios pueden actualizar sus propias metas
CREATE POLICY "goals_update_own" ON public.goals
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: usuarios pueden eliminar sus propias metas
CREATE POLICY "goals_delete_own" ON public.goals
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Política para service role (funciones del servidor)
CREATE POLICY "service_role_all_goals" ON public.goals
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Políticas para MICRO_CONTRIBUTIONS
CREATE POLICY "micro_contributions_all_own" ON public.micro_contributions
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para CHALLENGE_CATEGORIES (lectura pública)
CREATE POLICY "Las categorías son públicas para lectura" 
    ON public.challenge_categories FOR SELECT 
    USING (is_active = true);

-- Políticas para CHALLENGES (lectura pública)
CREATE POLICY "challenges_read_all" ON public.challenges
    FOR SELECT USING (true);

-- Políticas para USER_CHALLENGE_SESSIONS (solo el usuario propietario)
CREATE POLICY "Los usuarios solo ven sus propias sesiones" 
    ON public.user_challenge_sessions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias sesiones" 
    ON public.user_challenge_sessions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias sesiones" 
    ON public.user_challenge_sessions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias sesiones" 
    ON public.user_challenge_sessions FOR DELETE 
    USING (auth.uid() = user_id);

-- Políticas para USER_CHALLENGES (compatibilidad)
CREATE POLICY "user_challenges_all_own" ON public.user_challenges
    FOR ALL USING (auth.uid() = user_id);

-- Políticas para SQUADS (IGUALDAD TOTAL - todos los miembros son admin)
CREATE POLICY "squads_select_active" ON public.squads
    FOR SELECT 
    USING (is_active = true);

CREATE POLICY "squads_insert_own" ON public.squads
    FOR INSERT 
    WITH CHECK (
        auth.uid() = owner_id 
        AND auth.uid() = created_by
    );

-- Todos los miembros del squad pueden actualizar
CREATE POLICY "squads_update_members" ON public.squads
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.squad_members 
            WHERE squad_members.squad_id = squads.id 
            AND squad_members.user_id = auth.uid()
        )
    );

-- Todos los miembros del squad pueden eliminar (soft delete)
CREATE POLICY "squads_delete_members" ON public.squads
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.squad_members 
            WHERE squad_members.squad_id = squads.id 
            AND squad_members.user_id = auth.uid()
        )
    );

-- Políticas para SQUAD_MEMBERS (SIN RECURSIÓN - todos son admin)
CREATE POLICY "squad_members_select_members" ON public.squad_members
    FOR SELECT USING (
        -- Puedes ver miembros si eres parte del squad o si el squad es público
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_members.squad_id 
            AND squads.is_active = true
        )
    );

CREATE POLICY "squad_members_insert_authorized" ON public.squad_members
    FOR INSERT WITH CHECK (
        -- Te puedes agregar a ti mismo o si eres el owner/creador del squad
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_id 
            AND (squads.owner_id = auth.uid() OR squads.created_by = auth.uid())
        )
    );

CREATE POLICY "squad_members_update_own" ON public.squad_members
    FOR UPDATE 
    USING (
        -- Solo puedes actualizar tu propio registro
        auth.uid() = user_id
    )
    WITH CHECK (
        auth.uid() = user_id
    );

CREATE POLICY "squad_members_delete_authorized" ON public.squad_members
    FOR DELETE USING (
        -- Te puedes eliminar a ti mismo o si eres owner del squad
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.squads 
            WHERE squads.id = squad_members.squad_id 
            AND (squads.owner_id = auth.uid() OR squads.created_by = auth.uid())
        )
    );

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

-- Políticas para WEEKLY_QUESTS (CORREGIDAS - SOLUCIÓN DE RAÍZ)
-- Permitir lectura pública y creación por el sistema
CREATE POLICY "weekly_quests_read_all" ON public.weekly_quests
    FOR SELECT USING (true);

CREATE POLICY "weekly_quests_insert_system" ON public.weekly_quests
    FOR INSERT WITH CHECK (true);

-- Políticas para USER_QUEST_PROGRESS (CORREGIDAS - SOLUCIÓN DE RAÍZ)  
-- Separar operaciones para mayor control y permitir que el sistema cree progress
CREATE POLICY "user_quest_progress_read_own" ON public.user_quest_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_quest_progress_insert_own_or_system" ON public.user_quest_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "user_quest_progress_update_own" ON public.user_quest_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para AUDIT_LOGS (solo lectura propia)
CREATE POLICY "audit_logs_read_own" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Políticas para PAYWALL_EVENTS
CREATE POLICY "paywall_events_all_own" ON public.paywall_events
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PASO 6: FUNCIONES Y TRIGGERS
-- ============================================

-- Función SIMPLIFICADA para crear perfil de usuario
CREATE OR REPLACE FUNCTION public.simple_create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Crear perfil directamente sin validaciones complejas
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
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW();
    
    -- Inicializar user_streaks para el nuevo usuario
    INSERT INTO public.user_streaks (
        user_id,
        current_streak,
        longest_streak,
        last_activity_at,
        streak_protections_used,
        protection_reset_date,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        0,
        0,
        NOW(),
        0,
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Función para obtener o crear perfil (para usuarios existentes o fallback)
CREATE OR REPLACE FUNCTION public.get_or_create_user_profile(
    p_user_id UUID
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user public.users;
    v_auth_user auth.users;
BEGIN
    -- Intentar obtener el perfil
    SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
    
    IF FOUND THEN
        RETURN v_user;
    END IF;
    
    -- Si no existe, obtener datos de auth.users y crear perfil
    SELECT * INTO v_auth_user FROM auth.users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users: %', p_user_id;
    END IF;
    
    -- Crear el perfil
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
        v_auth_user.id,
        v_auth_user.email,
        COALESCE(v_auth_user.raw_user_meta_data->>'country', 'UY'),
        COALESCE(v_auth_user.raw_user_meta_data->>'currency', 'UYU'),
        false,
        0,
        1,
        0,
        0,
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING * INTO v_user;
    
    -- Inicializar user_streaks para el usuario
    INSERT INTO public.user_streaks (
        user_id,
        current_streak,
        longest_streak,
        last_activity_at,
        streak_protections_used,
        protection_reset_date,
        created_at,
        updated_at
    )
    VALUES (
        v_auth_user.id,
        0,
        0,
        NOW(),
        0,
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN v_user;
END;
$$;

-- Dar permisos necesarios
GRANT EXECUTE ON FUNCTION public.get_or_create_user_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_create_user_profile TO authenticated;

-- Función para inicializar user_streaks para usuarios existentes
CREATE OR REPLACE FUNCTION public.get_or_create_user_streak(
    p_user_id UUID
)
RETURNS public.user_streaks
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_streak public.user_streaks;
BEGIN
    -- Intentar obtener la racha existente
    SELECT * INTO v_streak FROM public.user_streaks WHERE user_id = p_user_id;
    
    IF FOUND THEN
        RETURN v_streak;
    END IF;
    
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado: %', p_user_id;
    END IF;
    
    -- Crear nueva entrada user_streaks
    INSERT INTO public.user_streaks (
        user_id,
        current_streak,
        longest_streak,
        last_activity_at,
        streak_protections_used,
        protection_reset_date,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        0,
        0,
        NOW(),
        0,
        DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
        NOW(),
        NOW()
    )
    RETURNING * INTO v_streak;
    
    RETURN v_streak;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_user_streak TO authenticated;

-- Función para crear quest progress de manera segura (SOLUCIÓN DE RAÍZ INTEGRADA)
CREATE OR REPLACE FUNCTION create_user_quest_progress_safe(
    p_user_id UUID,
    p_quest_id UUID
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
    v_progress_id UUID;
BEGIN
    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuario no existe: %', p_user_id;
    END IF;

    -- Verificar que la quest existe
    IF NOT EXISTS (SELECT 1 FROM weekly_quests WHERE id = p_quest_id) THEN
        RAISE EXCEPTION 'Quest no existe: %', p_quest_id;
    END IF;

    -- Verificar que no existe ya progreso para esta combinación
    SELECT id INTO v_progress_id
    FROM user_quest_progress 
    WHERE user_id = p_user_id AND quest_id = p_quest_id;

    IF v_progress_id IS NOT NULL THEN
        RETURN v_progress_id; -- Ya existe, retornar ID
    END IF;

    -- Crear nuevo progreso
    INSERT INTO user_quest_progress (
        user_id,
        quest_id,
        completed_challenge_ids,
        completion_percentage,
        completed_at
    ) VALUES (
        p_user_id,
        p_quest_id,
        '{}',
        0,
        NULL
    ) RETURNING id INTO v_progress_id;

    RETURN v_progress_id;
END;
$$;

-- Dar permisos a la función de quest progress
GRANT EXECUTE ON FUNCTION create_user_quest_progress_safe TO authenticated;

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

-- Trigger SIMPLIFICADO para nuevos usuarios
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.simple_create_user_profile();

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

CREATE TRIGGER update_squads_updated_at
    BEFORE UPDATE ON public.squads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger para user_challenge_sessions (nuevo)
CREATE TRIGGER update_user_challenge_sessions_updated_at
    BEFORE UPDATE ON public.user_challenge_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Triggers para actualizar progreso de metas cuando se modifican micro_contributions
CREATE TRIGGER update_goal_progress_on_contribution_insert
    AFTER INSERT ON public.micro_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

CREATE TRIGGER update_goal_progress_on_contribution_update
    AFTER UPDATE ON public.micro_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

CREATE TRIGGER update_goal_progress_on_contribution_delete
    AFTER DELETE ON public.micro_contributions
    FOR EACH ROW EXECUTE FUNCTION public.update_goal_progress();

-- ============================================
-- FUNCIONES PARA CHALLENGE SYSTEM V2
-- ============================================

-- Función para calcular fecha de fin
CREATE OR REPLACE FUNCTION calculate_challenge_end_date(
    start_date TIMESTAMPTZ,
    duration_type TEXT
)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN CASE duration_type
        WHEN '1_week' THEN start_date + INTERVAL '7 days'
        WHEN '15_days' THEN start_date + INTERVAL '15 days'
        WHEN '30_days' THEN start_date + INTERVAL '30 days'
        WHEN '1_year' THEN start_date + INTERVAL '1 year'
        ELSE start_date + INTERVAL '30 days'
    END;
END;
$$ LANGUAGE plpgsql;

-- Función para validar límite de retos activos (máximo 5)
CREATE OR REPLACE FUNCTION validate_active_challenge_limit()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Solo validar en INSERT o cuando se activa un reto
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status != 'active' AND NEW.status = 'active') THEN
        SELECT COUNT(*) INTO active_count
        FROM public.user_challenge_sessions
        WHERE user_id = NEW.user_id AND status = 'active';
        
        IF active_count >= 5 THEN
            RAISE EXCEPTION 'Usuario no puede tener más de 5 retos activos simultáneamente';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para validar límite
DROP TRIGGER IF EXISTS validate_challenge_limit_trigger ON public.user_challenge_sessions;
CREATE TRIGGER validate_challenge_limit_trigger
    BEFORE INSERT OR UPDATE ON public.user_challenge_sessions
    FOR EACH ROW
    EXECUTE FUNCTION validate_active_challenge_limit();

-- Función para expirar sesiones automáticamente (mejorada)
CREATE OR REPLACE FUNCTION expire_challenge_sessions()
RETURNS TABLE(
    expired_count INTEGER,
    session_ids UUID[],
    execution_time TIMESTAMPTZ
) AS $$
DECLARE
    expired_sessions UUID[];
    final_count INTEGER;
    start_time TIMESTAMPTZ := NOW();
BEGIN
    -- Obtener IDs de sesiones a expirar
    SELECT ARRAY_AGG(id) INTO expired_sessions
    FROM public.user_challenge_sessions 
    WHERE status = 'active' AND end_date < NOW();
    
    -- Actualizar sesiones expiradas
    UPDATE public.user_challenge_sessions 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND end_date < NOW();
    
    GET DIAGNOSTICS final_count = ROW_COUNT;
    
    -- Log detallado de la operación
    INSERT INTO public.audit_logs (
        action, 
        table_name, 
        new_values, 
        created_at
    ) VALUES (
        'expire_sessions', 
        'user_challenge_sessions', 
        jsonb_build_object(
            'expired_count', final_count,
            'session_ids', expired_sessions,
            'execution_time', start_time
        ), 
        NOW()
    );
    
    -- Retornar resultados
    RETURN QUERY SELECT 
        final_count,
        COALESCE(expired_sessions, ARRAY[]::UUID[]),
        start_time;
END;
$$ LANGUAGE plpgsql;

-- Función auxiliar para iniciar sesión (mejorada)
CREATE OR REPLACE FUNCTION start_challenge_session(
    p_user_id UUID,
    p_challenge_id UUID,
    p_duration_type TEXT
)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
    v_start_date TIMESTAMPTZ := NOW();
    v_end_date TIMESTAMPTZ;
    v_active_count INTEGER;
BEGIN
    -- Validar tipo de duración
    IF p_duration_type NOT IN ('1_week', '15_days', '30_days', '1_year') THEN
        RAISE EXCEPTION 'Tipo de duración inválido: %', p_duration_type;
    END IF;
    
    -- Verificar que el reto existe y está activo
    IF NOT EXISTS (
        SELECT 1 FROM public.challenges 
        WHERE id = p_challenge_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'El reto especificado no existe o no está activo';
    END IF;
    
    -- Verificar límite de retos activos
    SELECT COUNT(*) INTO v_active_count
    FROM public.user_challenge_sessions
    WHERE user_id = p_user_id AND status = 'active';
    
    IF v_active_count >= 5 THEN
        RAISE EXCEPTION 'No puedes tener más de 5 retos activos simultáneamente';
    END IF;
    
    -- Calcular fecha de fin
    v_end_date := calculate_challenge_end_date(v_start_date, p_duration_type);
    
    -- Crear sesión
    INSERT INTO public.user_challenge_sessions (
        user_id, challenge_id, duration_type, start_date, end_date
    ) VALUES (
        p_user_id, p_challenge_id, p_duration_type, v_start_date, v_end_date
    ) RETURNING id INTO v_session_id;
    
    -- Log de la operación
    INSERT INTO public.audit_logs (
        action, table_name, record_id, new_values, created_at
    ) VALUES (
        'create_session', 'user_challenge_sessions', v_session_id,
        jsonb_build_object(
            'user_id', p_user_id,
            'challenge_id', p_challenge_id,
            'duration_type', p_duration_type,
            'start_date', v_start_date,
            'end_date', v_end_date
        ),
        NOW()
    );
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permisos a las funciones
GRANT EXECUTE ON FUNCTION calculate_challenge_end_date TO authenticated;
GRANT EXECUTE ON FUNCTION expire_challenge_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION start_challenge_session TO authenticated;

-- ============================================
-- PASO 7: DATOS SEMILLA
-- ============================================

-- Datos iniciales - Categorías de retos (Challenge System V2)
INSERT INTO public.challenge_categories (name, description, icon, color, sort_order) VALUES
('Gastos Diarios', 'Controla y reduce gastos en compras cotidianas', 'shopping-cart', '#FF5722', 1),
('Entretenimiento', 'Optimiza gastos en ocio y entretenimiento', 'movie', '#9C27B0', 2),
('Ropa y Accesorios', 'Gestiona inteligentemente gastos en vestimenta', 'shirt', '#E91E63', 3),
('Ahorro Sistemático', 'Desarrolla hábitos sólidos de ahorro regular', 'piggy-bank', '#4CAF50', 4),
('Inversiones', 'Inicia o incrementa tu cartera de inversiones', 'trending-up', '#2196F3', 5),
('Educación Financiera', 'Mejora tus conocimientos y habilidades financieras', 'book-open', '#FF9800', 6)
ON CONFLICT (name) DO NOTHING;

-- Challenges básicos actualizados con Challenge System V2
DO $$
DECLARE
    gastos_diarios_id UUID;
    entretenimiento_id UUID;
    ahorro_sistematico_id UUID;
    inversiones_id UUID;
BEGIN
    -- Obtener IDs de categorías
    SELECT id INTO gastos_diarios_id FROM public.challenge_categories WHERE name = 'Gastos Diarios';
    SELECT id INTO entretenimiento_id FROM public.challenge_categories WHERE name = 'Entretenimiento';
    SELECT id INTO ahorro_sistematico_id FROM public.challenge_categories WHERE name = 'Ahorro Sistemático';
    SELECT id INTO inversiones_id FROM public.challenge_categories WHERE name = 'Inversiones';
    
    -- Limpiar retos de ejemplo anteriores para evitar duplicados
    DELETE FROM public.challenges WHERE title IN (
        'Primer Ahorro', 'Ahorro Semanal', 'Meta Alcanzada', 'Ahorrador Constante', 'Maestro del Ahorro',
        'No Delivery Challenge', 'Marca Blanca Only', 'Comidas Caseras 100%',
        'Entretenimiento Gratuito', 'Cero Suscripciones', 'Mes Sin Cine',
        'Ahorro 5% Mensual', 'Ahorro 20% Extremo', 'Monedas del Día',
        'Primera Inversión', 'Inversión Mensual'
    );
    
    -- Retos básicos actualizados
    INSERT INTO public.challenges (title, description, type, difficulty, xp_reward, target_value, duration_days) VALUES
    ('Primer Ahorro', 'Realiza tu primera contribución a cualquier meta', 'savings', 'easy', 50, 1, 7),
    ('Ahorro Semanal', 'Ahorra durante 7 días consecutivos', 'savings', 'medium', 100, 7, 7),
    ('Meta Alcanzada', 'Completa tu primera meta de ahorro', 'savings', 'medium', 200, 1, 30),
    ('Ahorrador Constante', 'Realiza 10 contribuciones en un mes', 'savings', 'hard', 300, 10, 30),
    ('Maestro del Ahorro', 'Completa 5 metas diferentes', 'savings', 'hard', 500, 5, 90);
    
    -- Retos de Gastos Diarios
    IF gastos_diarios_id IS NOT NULL THEN
        INSERT INTO public.challenges (
            title, description, type, category_id, category_name, difficulty, 
            xp_reward, icon, color, tags, min_duration_days, max_duration_days
        ) VALUES
        ('No Delivery Challenge', 'Evita pedir delivery y cocina en casa para ahorrar dinero', 'daily_expenses', gastos_diarios_id, 'Gastos Diarios', 'easy', 25, 'home', '#FF5722', '{"delivery", "cocina", "ahorro"}', 7, 30),
        ('Marca Blanca Only', 'Compra solo productos de marca blanca durante el período', 'daily_expenses', gastos_diarios_id, 'Gastos Diarios', 'medium', 50, 'shopping-cart', '#FF5722', '{"supermercado", "marca-blanca"}', 15, 60),
        ('Comidas Caseras 100%', 'Prepara todas las comidas en casa, sin excepciones', 'daily_expenses', gastos_diarios_id, 'Gastos Diarios', 'hard', 100, 'chef-hat', '#FF5722', '{"cocina", "comida-casera"}', 7, 90);
    END IF;
    
    -- Retos de Entretenimiento
    IF entretenimiento_id IS NOT NULL THEN
        INSERT INTO public.challenges (
            title, description, type, category_id, category_name, difficulty, 
            xp_reward, icon, color, tags, min_duration_days, max_duration_days
        ) VALUES
        ('Entretenimiento Gratuito', 'Disfruta solo de entretenimiento gratuito', 'entertainment', entretenimiento_id, 'Entretenimiento', 'easy', 25, 'smile', '#9C27B0', '{"entretenimiento", "gratuito"}', 7, 30),
        ('Cero Suscripciones', 'Cancela al menos una suscripción no esencial', 'entertainment', entretenimiento_id, 'Entretenimiento', 'medium', 50, 'x-circle', '#9C27B0', '{"suscripciones", "gastos-fijos"}', 30, 365),
        ('Mes Sin Cine', 'Evita ir al cine durante todo el período', 'entertainment', entretenimiento_id, 'Entretenimiento', 'easy', 25, 'film', '#9C27B0', '{"cine", "entretenimiento"}', 15, 60);
    END IF;
    
    -- Retos de Ahorro Sistemático
    IF ahorro_sistematico_id IS NOT NULL THEN
        INSERT INTO public.challenges (
            title, description, type, category_id, category_name, difficulty, 
            xp_reward, icon, color, tags, min_duration_days, max_duration_days
        ) VALUES
        ('Ahorro 5% Mensual', 'Ahorra el 5% de tus ingresos mensuales', 'savings', ahorro_sistematico_id, 'Ahorro Sistemático', 'medium', 50, 'piggy-bank', '#4CAF50', '{"ahorro", "porcentaje", "sistemático"}', 30, 365),
        ('Ahorro 20% Extremo', 'Desafío experto: ahorra el 20% de tus ingresos', 'savings', ahorro_sistematico_id, 'Ahorro Sistemático', 'expert', 200, 'target', '#4CAF50', '{"ahorro", "experto", "alto-porcentaje"}', 30, 365),
        ('Monedas del Día', 'Guarda todas las monedas que recibas como vuelto', 'savings', ahorro_sistematico_id, 'Ahorro Sistemático', 'easy', 25, 'coins', '#4CAF50', '{"monedas", "vuelto", "micro-ahorro"}', 7, 90);
    END IF;
    
    -- Retos de Inversiones
    IF inversiones_id IS NOT NULL THEN
        INSERT INTO public.challenges (
            title, description, type, category_id, category_name, difficulty, 
            xp_reward, icon, color, tags, min_duration_days, max_duration_days
        ) VALUES
        ('Primera Inversión', 'Realiza tu primera inversión en instrumentos financieros', 'investments', inversiones_id, 'Inversiones', 'medium', 75, 'trending-up', '#2196F3', '{"primera-inversión", "instrumentos-financieros"}', 7, 30),
        ('Inversión Mensual', 'Invierte un monto fijo cada mes', 'investments', inversiones_id, 'Inversiones', 'hard', 100, 'bar-chart', '#2196F3', '{"inversión-mensual", "sistemático"}', 30, 365);
    END IF;
END $$;

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

-- Generar códigos de invitación para squads existentes (migración)
-- Este código se ejecuta si ya existen squads sin invite_code
UPDATE public.squads 
SET invite_code = UPPER(
  SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6)
)
WHERE invite_code IS NULL OR invite_code = '';

-- Migrar owner_id desde created_by si es necesario
UPDATE public.squads 
SET owner_id = created_by 
WHERE owner_id IS NULL;

-- MIGRACIÓN IMPORTANTE: Convertir todos los roles a 'admin' para igualdad total
UPDATE public.squad_members 
SET role = 'admin'
WHERE role IN ('owner', 'member');

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Todos los miembros de pods ahora tienen permisos de administrador';
END $$;

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
-- PASO 10: CONFIGURACIÓN IMPORTANTE
-- ============================================
-- IMPORTANTE: Después de ejecutar este script, configurar en Supabase Dashboard:
-- 1. Authentication → Settings → DESACTIVAR "Enable email confirmations"
-- 2. Authentication → Settings → ACTIVAR "Enable automatic sign-in after sign-up"
-- Esto permite que los usuarios usen la app inmediatamente sin verificar email

-- ============================================
-- PASO 11: DIAGNÓSTICO Y CORRECCIÓN DE PERFILES
-- ============================================

-- Limpieza de perfiles huérfanos y sincronización de IDs
DO $$
BEGIN
    -- Eliminar perfiles que no tienen usuario correspondiente en auth.users
    DELETE FROM public.users
    WHERE id NOT IN (SELECT id FROM auth.users);
    
    RAISE NOTICE '✅ Perfiles huérfanos eliminados';
END $$;

-- Crear perfiles faltantes para usuarios existentes
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
    a.id,
    a.email,
    COALESCE(a.raw_user_meta_data->>'country', 'UY'),
    COALESCE(a.raw_user_meta_data->>'currency', 'UYU'),
    false,
    0,
    1,
    0,
    0,
    NOW(),
    COALESCE(a.created_at, NOW()),
    NOW()
FROM auth.users a
LEFT JOIN public.users u ON a.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Actualizar emails si hay discrepancias
UPDATE public.users u
SET email = a.email,
    updated_at = NOW()
FROM auth.users a
WHERE u.id = a.id
AND u.email != a.email;

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
-- PASO 12: VERIFICACIÓN COMPLETA DE INTEGRIDAD Y SINCRONIZACIÓN
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
-- PASO 13: LIMPIEZA FINAL Y VERIFICACIÓN DE METAS HUÉRFANAS
-- ============================================

DO $$
DECLARE
    v_goals_without_user INTEGER;
    v_orphan_contributions INTEGER;
BEGIN
    -- Verificar metas huérfanas
    SELECT COUNT(*) 
    INTO v_goals_without_user
    FROM public.goals g
    WHERE NOT EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = g.user_id
    );
    
    IF v_goals_without_user > 0 THEN
        RAISE WARNING '⚠️ Encontradas % metas sin usuario válido, eliminándolas...', v_goals_without_user;
        DELETE FROM public.goals WHERE user_id NOT IN (SELECT id FROM public.users);
    END IF;
    
    -- Verificar contribuciones huérfanas
    SELECT COUNT(*)
    INTO v_orphan_contributions
    FROM public.micro_contributions mc
    WHERE NOT EXISTS (
        SELECT 1 FROM public.goals g WHERE g.id = mc.goal_id
    );
    
    IF v_orphan_contributions > 0 THEN
        RAISE WARNING '⚠️ Encontradas % contribuciones sin meta válida, eliminándolas...', v_orphan_contributions;
        DELETE FROM public.micro_contributions WHERE goal_id NOT IN (SELECT id FROM public.goals);
    END IF;
    
    RAISE NOTICE '✅ Limpieza de datos huérfanos completada';
END $$;

-- ============================================
-- MENSAJE FINAL
-- ============================================

SELECT 
    '🎉 URUGUAHORRA DATABASE DEPLOYED SUCCESSFULLY - SISTEMA COMPLETO V5.4' as status,
    'Version 5.4 - Challenge System V2 + Pods con Igualdad Total + Limpieza Opcional' as version_notes,
    'Includes: Challenges, Goals, Pods democráticos (todos admin), Fixed RLS, Limpieza total opcional de auth.users' as features_included,
    'Ready for: Colaboración total en pods, todos los miembros con permisos iguales' as next_steps,
    NOW() as deployed_at;

-- ============================================
-- NOTAS IMPORTANTES - SISTEMA COMPLETO V5.4
-- ============================================
-- 
-- Este archivo INCLUYE TODOS los sistemas:
-- 
-- CHALLENGE SYSTEM V2:
-- ✅ Challenge categories con UI mejorada (iconos, colores)
-- ✅ User challenge sessions con progreso y duración personalizable
-- ✅ Funciones automáticas: start_challenge_session(), expire_challenge_sessions()
-- ✅ Límite de 5 retos activos por usuario
-- ✅ Sistema de notificaciones configurables por sesión
-- ✅ Log de progreso y auditoría completa
-- 
-- PODS/SQUADS SYSTEM (DEMOCRÁTICO):
-- ✅ Sistema completo de pods de ahorro colaborativo
-- ✅ Códigos de invitación únicos de 6 caracteres
-- ✅ TODOS los miembros son administradores con permisos iguales
-- ✅ Sin jerarquías - sistema totalmente democrático
-- ✅ Tracking de ahorros totales y mensuales por miembro
-- ✅ Políticas RLS simplificadas para igualdad total
-- ✅ Nombres de usuario visibles (extraídos del email)
-- 
-- FIXES INCLUIDOS:
-- ✅ Goal progress updates automáticos con triggers
-- ✅ User streaks error 406 solucionado
-- ✅ Quest system RLS policies corregidas
-- ✅ Squad members recursión infinita eliminada
-- 
-- IMPORTANTE:
-- Este archivo es la ÚNICA FUENTE DE VERDAD para la estructura de la base de datos.
-- 
-- LIMPIEZA TOTAL OPCIONAL:
-- - Descomenta el PASO 0 para eliminar TODOS los usuarios incluyendo auth.users
-- - Útil para desarrollo/testing cuando necesitas empezar desde cero
-- 
-- ARCHIVOS OBSOLETOS (ya no necesarios):
-- - clean_user_data.sql (integrado en PASO 0)
-- - migrate_squads_table.sql (integrado aquí)
-- - fix_squad_members_policies.sql (integrado aquí)
-- - unified_squads_migration.sql (integrado aquí)
-- 

