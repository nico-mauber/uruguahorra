-- ============================================
-- URUGUAHORRA - COMPLETE DATABASE SCHEMA
-- ============================================
-- Archivo maestro unificado para crear la base de datos completa desde cero
-- Incluye: Schema completo, RLS, políticas, índices, funciones, triggers, vistas y datos semilla
-- Versión: 2.0
-- Fecha: 2024-12-19
-- ============================================

-- ============================================
-- PASO 1: HABILITAR EXTENSIONES NECESARIAS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- PASO 2: LIMPIAR ESTRUCTURAS EXISTENTES (OPCIONAL)
-- ============================================
-- Descomenta esta sección si necesitas limpiar una base existente
/*
DO $$
BEGIN
    -- Eliminar vistas
    DROP VIEW IF EXISTS public.xp_leaderboard CASCADE;
    DROP VIEW IF EXISTS public.streak_stats CASCADE;
    DROP VIEW IF EXISTS public.user_xp_stats CASCADE;
    DROP VIEW IF EXISTS public.user_dashboard CASCADE;
    DROP VIEW IF EXISTS public.squad_rankings CASCADE;
    DROP VIEW IF EXISTS public.challenge_stats CASCADE;
    
    -- Eliminar triggers
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
    DROP TRIGGER IF EXISTS update_users_updated_at ON public.users CASCADE;
    DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals CASCADE;
    DROP TRIGGER IF EXISTS update_squads_updated_at ON public.squads CASCADE;
    DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions CASCADE;
    DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON public.user_streaks CASCADE;
    
    -- Eliminar funciones
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS public.update_user_stats(UUID) CASCADE;
    
    -- Eliminar tablas (en orden inverso de dependencias)
    DROP TABLE IF EXISTS public.user_quest_progress CASCADE;
    DROP TABLE IF EXISTS public.weekly_quests CASCADE;
    DROP TABLE IF EXISTS public.user_streaks CASCADE;
    DROP TABLE IF EXISTS public.user_xp_log CASCADE;
    DROP TABLE IF EXISTS public.audit_logs CASCADE;
    DROP TABLE IF EXISTS public.paywall_events CASCADE;
    DROP TABLE IF EXISTS public.subscriptions CASCADE;
    DROP TABLE IF EXISTS public.user_progress CASCADE;
    DROP TABLE IF EXISTS public.learnings CASCADE;
    DROP TABLE IF EXISTS public.transactions_raw CASCADE;
    DROP TABLE IF EXISTS public.squad_members CASCADE;
    DROP TABLE IF EXISTS public.squads CASCADE;
    DROP TABLE IF EXISTS public.user_challenges CASCADE;
    DROP TABLE IF EXISTS public.challenges CASCADE;
    DROP TABLE IF EXISTS public.micro_contributions CASCADE;
    DROP TABLE IF EXISTS public.goals CASCADE;
    DROP TABLE IF EXISTS public.users CASCADE;
    
    RAISE NOTICE 'Limpieza de estructuras existentes completada';
END
$$;
*/

-- ============================================
-- PASO 3: CREAR FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar el campo updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Función para manejar nuevos usuarios desde auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ language plpgsql security definer;

-- ============================================
-- PASO 4: CREAR TABLAS PRINCIPALES
-- ============================================

-- TABLA: users (perfiles de usuario con gamificación)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    country TEXT DEFAULT 'UY',
    currency TEXT DEFAULT 'UYU',
    premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos de gamificación
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    
    -- Validaciones
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_country CHECK (country ~ '^[A-Z]{2}$'),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$'),
    CONSTRAINT valid_xp CHECK (total_xp >= 0),
    CONSTRAINT valid_level CHECK (current_level >= 1)
);

-- TABLA: goals (metas de ahorro)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount DECIMAL(10, 2) NOT NULL,
    saved_amount DECIMAL(10, 2) DEFAULT 0,
    target_date DATE NOT NULL,
    category TEXT,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT 'flag',
    is_active BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_amounts CHECK (target_amount > 0),
    CONSTRAINT saved_amount_not_exceed_target CHECK (saved_amount <= target_amount),
    CONSTRAINT saved_amount_not_negative CHECK (saved_amount >= 0),
    CONSTRAINT valid_target_date CHECK (target_date > CURRENT_DATE)
);

-- TABLA: micro_contributions (contribuciones a metas)
CREATE TABLE IF NOT EXISTS public.micro_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    source TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_contribution_amount CHECK (amount > 0),
    CONSTRAINT valid_source CHECK (source IN ('manual', 'roundup', 'automatic', 'challenge_reward'))
);

-- TABLA: challenges (desafíos gamificados)
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    bonus_amount DECIMAL(10, 2) DEFAULT 0,
    requirements JSONB NOT NULL DEFAULT '{}',
    icon TEXT DEFAULT 'trophy',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_challenge_type CHECK (type IN ('daily', 'weekly', 'monthly', 'achievement')),
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
    CONSTRAINT valid_xp_reward CHECK (xp_reward > 0)
);

-- TABLA: user_challenges (progreso en desafíos)
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    progress JSONB DEFAULT '{}',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Evitar duplicados
    CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

-- TABLA: squads (grupos sociales)
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    max_members INTEGER DEFAULT 10,
    is_public BOOLEAN DEFAULT true,
    invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_max_members CHECK (max_members > 0 AND max_members <= 50)
);

-- TABLA: squad_members (miembros de squads)
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member')),
    CONSTRAINT unique_squad_member UNIQUE (squad_id, user_id)
);

-- TABLA: transactions_raw (transacciones importadas)
CREATE TABLE IF NOT EXISTS public.transactions_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    category TEXT,
    import_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: learnings (contenido educativo)
CREATE TABLE IF NOT EXISTS public.learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    difficulty_level TEXT DEFAULT 'beginner',
    xp_reward INTEGER DEFAULT 10,
    reading_time_minutes INTEGER DEFAULT 5,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_difficulty_level CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT valid_xp CHECK (xp_reward >= 0)
);

-- TABLA: user_progress (progreso en learnings)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learning_id UUID NOT NULL REFERENCES public.learnings(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Evitar duplicados
    CONSTRAINT unique_user_learning UNIQUE (user_id, learning_id)
);

-- TABLA: subscriptions (suscripciones premium)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    status TEXT NOT NULL,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_plan_type CHECK (plan_type IN ('monthly', 'yearly', 'lifetime')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'cancelled', 'expired', 'trial'))
);

-- TABLA: paywall_events (eventos de paywall)
CREATE TABLE IF NOT EXISTS public.paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    feature_blocked TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_event_type CHECK (event_type IN ('shown', 'clicked', 'dismissed', 'converted'))
);

-- TABLA: audit_logs (logs de auditoría)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PASO 5: CREAR TABLAS DE GAMIFICACIÓN
-- ============================================

-- TABLA: user_xp_log (registro de XP ganado)
CREATE TABLE IF NOT EXISTS public.user_xp_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_event_type CHECK (event_type IN ('contribution', 'challenge_complete', 'daily_streak', 'quest_complete', 'learning_complete')),
    CONSTRAINT valid_xp CHECK (xp_earned >= 0)
);

-- TABLA: user_streaks (rachas de usuarios)
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    max_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    streak_protections_used INTEGER NOT NULL DEFAULT 0,
    protection_reset_date DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Validaciones
    CONSTRAINT valid_streaks CHECK (current_streak >= 0 AND max_streak >= 0),
    CONSTRAINT valid_protections CHECK (streak_protections_used >= 0)
);

-- TABLA: weekly_quests (misiones semanales)
CREATE TABLE IF NOT EXISTS public.weekly_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    challenge_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLA: user_quest_progress (progreso en misiones)
CREATE TABLE IF NOT EXISTS public.user_quest_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES public.weekly_quests(id) ON DELETE CASCADE,
    completed_challenge_ids UUID[] NOT NULL DEFAULT '{}',
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NULL,
    
    -- Validaciones
    CONSTRAINT valid_percentage CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    CONSTRAINT unique_user_quest UNIQUE (user_id, quest_id)
);

-- ============================================
-- PASO 6: CREAR ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Índices para users
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_country ON public.users(country);
CREATE INDEX idx_users_premium ON public.users(premium);
CREATE INDEX idx_users_total_xp ON public.users(total_xp DESC);
CREATE INDEX idx_users_level ON public.users(current_level DESC);

-- Índices para goals
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_is_active ON public.goals(is_active);
CREATE INDEX idx_goals_category ON public.goals(category);
CREATE INDEX idx_goals_target_date ON public.goals(target_date);

-- Índices para micro_contributions
CREATE INDEX idx_micro_contributions_user_id ON public.micro_contributions(user_id);
CREATE INDEX idx_micro_contributions_goal_id ON public.micro_contributions(goal_id);
CREATE INDEX idx_micro_contributions_source ON public.micro_contributions(source);
CREATE INDEX idx_micro_contributions_created_at ON public.micro_contributions(created_at DESC);

-- Índices para challenges
CREATE INDEX idx_challenges_type ON public.challenges(type);
CREATE INDEX idx_challenges_difficulty ON public.challenges(difficulty);
CREATE INDEX idx_challenges_is_active ON public.challenges(is_active);

-- Índices para user_challenges
CREATE INDEX idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);
CREATE INDEX idx_user_challenges_is_completed ON public.user_challenges(is_completed);

-- Índices para squads
CREATE INDEX idx_squads_created_by ON public.squads(created_by);
CREATE INDEX idx_squads_invite_code ON public.squads(invite_code);
CREATE INDEX idx_squads_is_public ON public.squads(is_public);

-- Índices para squad_members
CREATE INDEX idx_squad_members_squad_id ON public.squad_members(squad_id);
CREATE INDEX idx_squad_members_user_id ON public.squad_members(user_id);

-- Índices para user_xp_log
CREATE INDEX idx_user_xp_log_user_id ON public.user_xp_log(user_id);
CREATE INDEX idx_user_xp_log_created_at ON public.user_xp_log(created_at DESC);
CREATE INDEX idx_user_xp_log_event_type ON public.user_xp_log(event_type);

-- Índices para user_streaks
CREATE INDEX idx_user_streaks_user_id ON public.user_streaks(user_id);
CREATE INDEX idx_user_streaks_current_streak ON public.user_streaks(current_streak DESC);
CREATE INDEX idx_user_streaks_last_activity ON public.user_streaks(last_activity_at);

-- Índices para weekly_quests
CREATE INDEX idx_weekly_quests_week_start ON public.weekly_quests(week_start_date);
CREATE INDEX idx_weekly_quests_active ON public.weekly_quests(is_active);
CREATE UNIQUE INDEX idx_weekly_quests_unique_week ON public.weekly_quests(week_start_date) WHERE is_active = TRUE;

-- Índices para user_quest_progress
CREATE INDEX idx_user_quest_progress_user_id ON public.user_quest_progress(user_id);
CREATE INDEX idx_user_quest_progress_quest_id ON public.user_quest_progress(quest_id);
CREATE INDEX idx_user_quest_progress_completed ON public.user_quest_progress(completed_at);

-- Índices para subscriptions
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_ends_at ON public.subscriptions(ends_at);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- PASO 7: CREAR TRIGGERS
-- ============================================

-- Trigger para crear perfil de usuario automáticamente
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers para actualizar updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_squads_updated_at
    BEFORE UPDATE ON public.squads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON public.user_streaks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PASO 8: HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paywall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 9: CREAR POLÍTICAS RLS
-- ============================================

-- Políticas para users
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Políticas para goals
CREATE POLICY "Users can view their own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para micro_contributions
CREATE POLICY "Users can view their own contributions" ON public.micro_contributions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contributions" ON public.micro_contributions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para challenges (lectura pública, sin modificación)
CREATE POLICY "Anyone can view active challenges" ON public.challenges
    FOR SELECT USING (is_active = true);

-- Políticas para user_challenges
CREATE POLICY "Users can view their own challenge progress" ON public.user_challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own challenge progress" ON public.user_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge progress" ON public.user_challenges
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para squads
CREATE POLICY "Anyone can view public squads" ON public.squads
    FOR SELECT USING (is_public = true OR created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM squad_members WHERE squad_id = id AND user_id = auth.uid()));

CREATE POLICY "Users can create squads" ON public.squads
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Squad owners can update their squads" ON public.squads
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Squad owners can delete their squads" ON public.squads
    FOR DELETE USING (auth.uid() = created_by);

-- Políticas para squad_members
CREATE POLICY "Squad members can view their squad members" ON public.squad_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM squad_members sm WHERE sm.squad_id = squad_id AND sm.user_id = auth.uid())
    );

CREATE POLICY "Users can join squads" ON public.squad_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave squads" ON public.squad_members
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para learnings (lectura pública)
CREATE POLICY "Anyone can view published learnings" ON public.learnings
    FOR SELECT USING (is_published = true);

-- Políticas para user_progress
CREATE POLICY "Users can view their own learning progress" ON public.user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning progress" ON public.user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning progress" ON public.user_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subscriptions" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para user_xp_log
CREATE POLICY "Users can view their own XP log" ON public.user_xp_log
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP log" ON public.user_xp_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para user_streaks
CREATE POLICY "Users can view their own streaks" ON public.user_streaks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks" ON public.user_streaks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks" ON public.user_streaks
    FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para weekly_quests
CREATE POLICY "Anyone can view active weekly quests" ON public.weekly_quests
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Authenticated users can insert weekly quests" ON public.weekly_quests
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update weekly quests" ON public.weekly_quests
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Políticas para user_quest_progress
CREATE POLICY "Users can view their own quest progress" ON public.user_quest_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quest progress" ON public.user_quest_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quest progress" ON public.user_quest_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- PASO 10: CREAR VISTAS ÚTILES
-- ============================================

-- Vista: Dashboard de usuario
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    u.id,
    u.email,
    u.country,
    u.currency,
    u.premium,
    u.total_xp,
    u.current_level,
    u.current_streak,
    u.longest_streak,
    COUNT(DISTINCT g.id) as total_goals,
    COUNT(DISTINCT g.id) FILTER (WHERE g.is_active = true) as active_goals,
    COALESCE(SUM(g.saved_amount), 0) as total_saved,
    COALESCE(SUM(g.target_amount) FILTER (WHERE g.is_active = true), 0) as total_target,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.is_completed = true) as completed_challenges
FROM public.users u
LEFT JOIN public.goals g ON u.id = g.user_id
LEFT JOIN public.user_challenges uc ON u.id = uc.user_id
GROUP BY u.id;

-- Vista: Estadísticas de XP por usuario
CREATE OR REPLACE VIEW public.user_xp_stats AS
SELECT 
    user_id,
    SUM(xp_earned) as total_xp,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_type = 'contribution' THEN xp_earned ELSE 0 END) as contribution_xp,
    SUM(CASE WHEN event_type = 'challenge_complete' THEN xp_earned ELSE 0 END) as challenge_xp,
    SUM(CASE WHEN event_type = 'daily_streak' THEN xp_earned ELSE 0 END) as streak_xp,
    SUM(CASE WHEN event_type = 'quest_complete' THEN xp_earned ELSE 0 END) as quest_xp,
    MAX(created_at) as last_xp_earned
FROM public.user_xp_log 
GROUP BY user_id;

-- Vista: Leaderboard global
CREATE OR REPLACE VIEW public.xp_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) as rank,
    u.id as user_id,
    u.email,
    u.total_xp,
    u.current_level as level,
    u.current_streak,
    u.country
FROM public.users u
WHERE u.total_xp > 0
ORDER BY u.total_xp DESC;

-- Vista: Estadísticas de rachas
CREATE OR REPLACE VIEW public.streak_stats AS
SELECT 
    user_id,
    current_streak,
    max_streak,
    last_activity_at,
    streak_protections_used,
    CASE 
        WHEN last_activity_at > NOW() - INTERVAL '48 hours' THEN 'active'
        ELSE 'broken'
    END as streak_status
FROM public.user_streaks;

-- Vista: Rankings de squads
CREATE OR REPLACE VIEW public.squad_rankings AS
SELECT 
    s.id,
    s.name,
    COUNT(DISTINCT sm.user_id) as member_count,
    COALESCE(AVG(u.total_xp), 0) as avg_xp,
    COALESCE(SUM(u.total_xp), 0) as total_xp,
    COALESCE(AVG(u.current_level), 1) as avg_level
FROM public.squads s
LEFT JOIN public.squad_members sm ON s.id = sm.squad_id
LEFT JOIN public.users u ON sm.user_id = u.id
GROUP BY s.id
ORDER BY total_xp DESC;

-- Vista: Estadísticas de challenges
CREATE OR REPLACE VIEW public.challenge_stats AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.difficulty,
    COUNT(DISTINCT uc.user_id) as total_attempts,
    COUNT(DISTINCT uc.user_id) FILTER (WHERE uc.is_completed = true) as completions,
    CASE 
        WHEN COUNT(DISTINCT uc.user_id) > 0 
        THEN (COUNT(DISTINCT uc.user_id) FILTER (WHERE uc.is_completed = true)::float / COUNT(DISTINCT uc.user_id) * 100)
        ELSE 0 
    END as completion_rate
FROM public.challenges c
LEFT JOIN public.user_challenges uc ON c.id = uc.challenge_id
GROUP BY c.id;

-- ============================================
-- PASO 11: INSERTAR DATOS SEMILLA (OPCIONAL)
-- ============================================

-- Insertar challenges de ejemplo
INSERT INTO public.challenges (title, description, type, difficulty, xp_reward, bonus_amount, requirements, icon)
VALUES 
    ('Primera Meta', 'Crea tu primera meta de ahorro', 'achievement', 'easy', 50, 0, '{"type": "create_goal", "count": 1}', 'flag'),
    ('Ahorro Diario', 'Ahorra cualquier cantidad hoy', 'daily', 'easy', 10, 0, '{"type": "daily_save", "min_amount": 1}', 'cash'),
    ('Racha de 7 Días', 'Mantén una racha de ahorro por 7 días', 'weekly', 'medium', 100, 5, '{"type": "streak", "days": 7}', 'fire'),
    ('Maestro Ahorrador', 'Ahorra $1000 en total', 'achievement', 'hard', 500, 50, '{"type": "total_saved", "amount": 1000}', 'trophy'),
    ('Lector Ávido', 'Completa 5 lecciones de educación financiera', 'achievement', 'medium', 200, 0, '{"type": "complete_learnings", "count": 5}', 'book')
ON CONFLICT DO NOTHING;

-- Insertar learnings de ejemplo
INSERT INTO public.learnings (title, content, category, difficulty_level, xp_reward, reading_time_minutes)
VALUES 
    ('¿Qué es el ahorro?', 'El ahorro es la práctica de reservar una parte de tus ingresos...', 'basics', 'beginner', 10, 3),
    ('Creando tu primer presupuesto', 'Un presupuesto es una herramienta fundamental para controlar tus finanzas...', 'budgeting', 'beginner', 15, 5),
    ('La regla 50/30/20', 'Esta regla sugiere dividir tus ingresos: 50% necesidades, 30% deseos, 20% ahorro...', 'budgeting', 'intermediate', 20, 7),
    ('Inversión para principiantes', 'Invertir es hacer que tu dinero trabaje para ti...', 'investing', 'intermediate', 25, 10),
    ('Interés compuesto', 'El interés compuesto es la octava maravilla del mundo...', 'investing', 'advanced', 30, 8)
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 12: COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

-- Comentarios en tablas principales
COMMENT ON TABLE public.users IS 'Tabla principal de usuarios con datos de perfil y gamificación';
COMMENT ON TABLE public.goals IS 'Metas de ahorro de los usuarios';
COMMENT ON TABLE public.micro_contributions IS 'Contribuciones individuales a las metas';
COMMENT ON TABLE public.challenges IS 'Desafíos gamificados del sistema';
COMMENT ON TABLE public.user_challenges IS 'Progreso de usuarios en desafíos';
COMMENT ON TABLE public.squads IS 'Grupos sociales de usuarios';
COMMENT ON TABLE public.learnings IS 'Contenido educativo de finanzas personales';
COMMENT ON TABLE public.user_xp_log IS 'Registro detallado de XP ganado por eventos';
COMMENT ON TABLE public.user_streaks IS 'Rachas de actividad con sistema de protecciones';
COMMENT ON TABLE public.weekly_quests IS 'Misiones semanales con desafíos asignados';

-- Comentarios en columnas importantes
COMMENT ON COLUMN public.users.total_xp IS 'Experiencia total acumulada del usuario';
COMMENT ON COLUMN public.goals.saved_amount IS 'Monto actualmente ahorrado para esta meta';
COMMENT ON COLUMN public.user_streaks.streak_protections_used IS 'Protecciones usadas este mes (máximo 1)';
COMMENT ON COLUMN public.weekly_quests.challenge_ids IS 'Array de UUIDs de challenges para esta quest';

-- ============================================
-- FIN DEL SCRIPT
-- ============================================

-- Verificación final
DO $$
BEGIN
    RAISE NOTICE '✅ Base de datos creada exitosamente';
    RAISE NOTICE '📊 Tablas creadas: 17';
    RAISE NOTICE '🔍 Vistas creadas: 6';
    RAISE NOTICE '🔒 RLS habilitado en todas las tablas';
    RAISE NOTICE '📈 Índices optimizados creados';
    RAISE NOTICE '🎯 Datos semilla insertados';
END
$$;