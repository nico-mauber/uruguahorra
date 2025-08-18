-- ============================================
-- URUGUAHORRA - MASTER DATABASE SCHEMA
-- ============================================
-- Archivo maestro unificado para crear la base de datos completa desde cero
-- Incluye: Schema completo, RLS, políticas, índices, funciones, triggers y datos semilla
-- Versión: 1.0
-- Fecha: 2024-08-18
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================
-- VERIFICAR Y LIMPIAR ESTRUCTURAS EXISTENTES
-- ============================================

-- Solo limpiar si las estructuras existen
DO $$
BEGIN
    -- Eliminar triggers si existen
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    
    -- Eliminar triggers de tablas si las tablas existen
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals') THEN
        DROP TRIGGER IF EXISTS update_goals_updated_at ON public.goals;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'squads') THEN
        DROP TRIGGER IF EXISTS update_squads_updated_at ON public.squads;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
        DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
    END IF;

    -- Eliminar funciones existentes
    DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
    DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
    DROP FUNCTION IF EXISTS public.update_user_stats(UUID) CASCADE;

    -- Eliminar vistas existentes
    DROP VIEW IF EXISTS public.user_dashboard CASCADE;
    DROP VIEW IF EXISTS public.squad_rankings CASCADE;
    DROP VIEW IF EXISTS public.challenge_stats CASCADE;

    -- Eliminar tablas en orden inverso de dependencias (solo si existen)
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

-- ============================================
-- CREACIÓN DE TABLAS PRINCIPALES
-- ============================================

-- TABLA: users (perfiles de usuario)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    country TEXT DEFAULT 'UY',
    currency TEXT DEFAULT 'UYU',
    premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos adicionales para gamificación
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_country CHECK (country ~ '^[A-Z]{2}$'),
    CONSTRAINT valid_currency CHECK (currency ~ '^[A-Z]{3}$')
);

-- TABLA: goals (metas de ahorro)
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'emergency' CHECK (category IN ('emergency', 'travel', 'debt', 'purchase', 'other')),
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    target_date DATE NOT NULL,
    saved_amount NUMERIC(12,2) DEFAULT 0 CHECK (saved_amount >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Campos específicos según categoría
    destination TEXT, -- para viajes
    interest_rate NUMERIC(5,2), -- para deudas
    description TEXT, -- para compras y otros
    
    CONSTRAINT valid_goal_name CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT target_date_future CHECK (target_date >= CURRENT_DATE),
    CONSTRAINT saved_amount_not_exceed_target CHECK (saved_amount <= target_amount)
);

-- TABLA: micro_contributions (aportes a metas)
CREATE TABLE IF NOT EXISTS public.micro_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL CHECK (source IN ('manual', 'roundup', 'automatic', 'challenge_reward', 'interest')),
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_contribution_amount CHECK (amount > 0 AND amount <= 1000000)
);

-- TABLA: challenges (catálogo de desafíos)
CREATE TABLE IF NOT EXISTS public.challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'achievement')),
    points INTEGER NOT NULL CHECK (points > 0),
    description TEXT NOT NULL,
    icon TEXT DEFAULT 'star',
    requirement_type TEXT CHECK (requirement_type IN ('savings', 'streak', 'transactions', 'learning', 'social')),
    requirement_value NUMERIC CHECK (requirement_value > 0),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_challenge_title CHECK (LENGTH(TRIM(title)) > 0)
);

-- TABLA: user_challenges (progreso en desafíos)
CREATE TABLE IF NOT EXISTS public.user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'claimed')),
    progress NUMERIC DEFAULT 0 CHECK (progress >= 0),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    
    UNIQUE(user_id, challenge_id),
    CONSTRAINT progress_completed_logic CHECK (
        (status = 'done' AND completed_at IS NOT NULL) OR 
        (status != 'done' AND completed_at IS NULL)
    )
);

-- TABLA: squads (grupos de ahorro social)
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
    max_members INTEGER DEFAULT 10 CHECK (max_members > 0 AND max_members <= 100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_squad_name CHECK (LENGTH(TRIM(name)) > 0)
);

-- TABLA: squad_members (miembros de squads)
CREATE TABLE IF NOT EXISTS public.squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    total_saved NUMERIC(12,2) DEFAULT 0 CHECK (total_saved >= 0),
    monthly_saved NUMERIC(12,2) DEFAULT 0 CHECK (monthly_saved >= 0),
    
    UNIQUE(squad_id, user_id)
);

-- TABLA: transactions_raw (transacciones importadas)
CREATE TABLE IF NOT EXISTS public.transactions_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'UYU',
    category TEXT,
    description TEXT DEFAULT '',
    merchant TEXT,
    transaction_date TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('csv', 'manual', 'api', 'bank_sync')),
    file_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_transaction_amount CHECK (amount != 0)
);

-- TABLA: learnings (contenido educativo)
CREATE TABLE IF NOT EXISTS public.learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_sec INTEGER NOT NULL CHECK (duration_sec > 0),
    tags TEXT[] DEFAULT '{}',
    url TEXT,
    category TEXT CHECK (category IN ('budgeting', 'saving', 'investing', 'debt', 'financial_planning', 'economics')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    points INTEGER DEFAULT 10 CHECK (points > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_learning_title CHECK (LENGTH(TRIM(title)) > 0)
);

-- TABLA: user_progress (progreso educativo)
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    learning_id UUID NOT NULL REFERENCES public.learnings(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_spent_sec INTEGER CHECK (time_spent_sec > 0),
    
    UNIQUE(user_id, learning_id)
);

-- TABLA: subscriptions (suscripciones premium)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'mercadopago', 'apple', 'google')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    plan TEXT NOT NULL CHECK (plan IN ('free', 'premium_monthly', 'premium_yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_subscription_period CHECK (
        (current_period_start IS NULL AND current_period_end IS NULL) OR
        (current_period_start IS NOT NULL AND current_period_end IS NOT NULL AND current_period_end > current_period_start)
    )
);

-- TABLA: paywall_events (eventos del paywall)
CREATE TABLE IF NOT EXISTS public.paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event TEXT NOT NULL CHECK (event IN ('view', 'click_upgrade', 'dismiss', 'purchase_started', 'purchase_completed', 'purchase_failed')),
    feature TEXT,
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    CONSTRAINT valid_paywall_event CHECK (LENGTH(TRIM(event)) > 0)
);

-- TABLA: audit_logs (logs de auditoría)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    changes JSONB DEFAULT '{}',
    event_timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    
    CONSTRAINT valid_audit_action CHECK (LENGTH(TRIM(action)) > 0)
);

-- ============================================
-- CONFIGURACIÓN DE ROW LEVEL SECURITY (RLS)
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

-- ============================================
-- POLÍTICAS RLS OPTIMIZADAS
-- ============================================

-- POLÍTICAS para users
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_insert_system" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- POLÍTICAS para goals
CREATE POLICY "goals_select_own" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "goals_insert_own" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_update_own" ON public.goals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "goals_delete_own" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- POLÍTICAS para micro_contributions
CREATE POLICY "contributions_select_own" ON public.micro_contributions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "contributions_insert_own" ON public.micro_contributions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contributions_update_own" ON public.micro_contributions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS para challenges (público, solo lectura)
CREATE POLICY "challenges_select_all" ON public.challenges FOR SELECT USING (active = TRUE);

-- POLÍTICAS para user_challenges
CREATE POLICY "user_challenges_select_own" ON public.user_challenges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_challenges_insert_own" ON public.user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_challenges_update_own" ON public.user_challenges FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS para squads
CREATE POLICY "squads_select_member" ON public.squads FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.squad_members WHERE squad_id = squads.id AND user_id = auth.uid())
);
CREATE POLICY "squads_insert_own" ON public.squads FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "squads_update_owner" ON public.squads FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "squads_delete_owner" ON public.squads FOR DELETE USING (auth.uid() = owner_id);

-- POLÍTICAS para squad_members
CREATE POLICY "squad_members_select_member" ON public.squad_members FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = squad_members.squad_id AND sm.user_id = auth.uid())
);
CREATE POLICY "squad_members_insert_own" ON public.squad_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "squad_members_update_own" ON public.squad_members FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "squad_members_delete_own" ON public.squad_members FOR DELETE USING (auth.uid() = user_id);

-- POLÍTICAS para transactions_raw
CREATE POLICY "transactions_select_own" ON public.transactions_raw FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON public.transactions_raw FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON public.transactions_raw FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_delete_own" ON public.transactions_raw FOR DELETE USING (auth.uid() = user_id);

-- POLÍTICAS para learnings (público, solo lectura)
CREATE POLICY "learnings_select_all" ON public.learnings FOR SELECT USING (is_active = TRUE);

-- POLÍTICAS para user_progress
CREATE POLICY "user_progress_select_own" ON public.user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_progress_insert_own" ON public.user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_progress_update_own" ON public.user_progress FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS para subscriptions
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subscriptions_insert_own" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subscriptions_update_own" ON public.subscriptions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS para paywall_events
CREATE POLICY "paywall_events_select_own" ON public.paywall_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "paywall_events_insert_own" ON public.paywall_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- POLÍTICAS para audit_logs
CREATE POLICY "audit_logs_select_own" ON public.audit_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_logs_insert_system" ON public.audit_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ÍNDICES OPTIMIZADOS
-- ============================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_premium ON public.users(premium) WHERE premium = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON public.users(last_activity_date DESC);

-- Índices para goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON public.goals(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON public.goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON public.goals(created_at DESC);

-- Índices para micro_contributions
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON public.micro_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_goal_id ON public.micro_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_contributions_created_at ON public.micro_contributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contributions_source ON public.micro_contributions(source);
CREATE INDEX IF NOT EXISTS idx_contributions_user_goal ON public.micro_contributions(user_id, goal_id);

-- Índices para challenges
CREATE INDEX IF NOT EXISTS idx_challenges_active ON public.challenges(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenges_type ON public.challenges(type);

-- Índices para user_challenges
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON public.user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON public.user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_status ON public.user_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed_at ON public.user_challenges(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Índices para squads
CREATE INDEX IF NOT EXISTS idx_squads_owner_id ON public.squads(owner_id);
CREATE INDEX IF NOT EXISTS idx_squads_invite_code ON public.squads(invite_code);
CREATE INDEX IF NOT EXISTS idx_squads_active ON public.squads(is_active) WHERE is_active = TRUE;

-- Índices para squad_members
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON public.squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON public.squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_joined_at ON public.squad_members(joined_at DESC);

-- Índices para transactions_raw
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions_raw(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions_raw(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions_raw(user_id, transaction_date DESC);

-- Índices para learnings
CREATE INDEX IF NOT EXISTS idx_learnings_active ON public.learnings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_learnings_category ON public.learnings(category);
CREATE INDEX IF NOT EXISTS idx_learnings_difficulty ON public.learnings(difficulty);

-- Índices para user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_learning_id ON public.user_progress(learning_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON public.user_progress(completed_at DESC);

-- Índices para subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON public.subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON public.subscriptions(user_id, status) WHERE status = 'active';

-- Índices para paywall_events
CREATE INDEX IF NOT EXISTS idx_paywall_events_user_id ON public.paywall_events(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_event ON public.paywall_events(event);
CREATE INDEX IF NOT EXISTS idx_paywall_events_timestamp ON public.paywall_events(event_timestamp DESC);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Función para manejar nuevos usuarios de Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (
        id, 
        email, 
        country, 
        currency, 
        premium, 
        created_at, 
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'country', 'UY'),
        COALESCE(NEW.raw_user_meta_data->>'currency', 'UYU'),
        FALSE,
        NEW.created_at,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION 
    WHEN OTHERS THEN
        -- Log del error sin fallar el proceso de registro
        RAISE LOG 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Función para calcular estadísticas del usuario
CREATE OR REPLACE FUNCTION public.update_user_stats(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    completed_challenges INTEGER;
    total_saved NUMERIC;
    new_xp INTEGER;
    new_level INTEGER;
BEGIN
    -- Contar desafíos completados
    SELECT COUNT(*) INTO completed_challenges
    FROM public.user_challenges
    WHERE user_id = p_user_id AND status = 'done';
    
    -- Calcular total ahorrado
    SELECT COALESCE(SUM(saved_amount), 0) INTO total_saved
    FROM public.goals
    WHERE user_id = p_user_id;
    
    -- Calcular XP y nivel
    new_xp := (completed_challenges * 50) + (total_saved::INTEGER / 10);
    new_level := GREATEST(1, (SQRT(new_xp) / 2)::INTEGER + 1);
    
    -- Actualizar estadísticas del usuario
    UPDATE public.users 
    SET 
        total_xp = new_xp,
        current_level = new_level,
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$;

-- ============================================
-- TRIGGERS AUTOMÁTICOS
-- ============================================

-- Trigger para manejar nuevos usuarios de Auth
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON public.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at 
    BEFORE UPDATE ON public.goals
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_squads_updated_at 
    BEFORE UPDATE ON public.squads
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DATOS SEMILLA (SEED DATA)
-- ============================================

-- Insertar challenges de ejemplo
INSERT INTO public.challenges (title, type, points, description, icon, requirement_type, requirement_value, active) VALUES
('Primera Meta', 'achievement', 50, 'Crea tu primera meta de ahorro y comienza tu viaje hacia la libertad financiera', 'trophy', 'savings', 1, true),
('Racha de 7 Días', 'weekly', 100, 'Ahorra durante 7 días consecutivos sin fallar', 'flame', 'streak', 7, true),
('Ahorro Rápido', 'daily', 20, 'Realiza un aporte de al menos $100 hoy', 'zap', 'savings', 100, true),
('Maestro del Redondeo', 'achievement', 75, 'Activa el redondeo automático y úsalo 10 veces', 'calculator', 'transactions', 10, true),
('Estudiante Financiero', 'monthly', 150, 'Completa 5 lecciones de educación financiera este mes', 'school', 'learning', 5, true),
('Social Saver', 'achievement', 100, 'Únete a un squad de ahorro y comienza a competir con amigos', 'people', 'social', 1, true),
('Meta Mensual', 'monthly', 200, 'Ahorra al menos $1000 en un solo mes', 'calendar', 'savings', 1000, true),
('Racha de Oro', 'achievement', 300, 'Mantén una racha de ahorro de 30 días consecutivos', 'star', 'streak', 30, true),
('Diversificador', 'achievement', 150, 'Crea 3 metas de ahorro de diferentes categorías', 'layers', 'savings', 3, true),
('Ahorrador Consistente', 'weekly', 80, 'Realiza al menos 5 aportes esta semana', 'refresh', 'transactions', 5, true),
('Ninja del Presupuesto', 'achievement', 250, 'Mantén tus gastos bajo control por 30 días', 'target', 'savings', 30, true),
('Cazador de Ofertas', 'monthly', 120, 'Ahorra al menos $200 en ofertas y descuentos este mes', 'gift', 'savings', 200, true);

-- Insertar learnings de ejemplo
INSERT INTO public.learnings (title, description, duration_sec, tags, url, category, difficulty, points) VALUES
('Introducción al Presupuesto Personal', 'Aprende los conceptos básicos para crear y mantener un presupuesto personal efectivo. Descubre cómo rastrear tus ingresos y gastos.', 300, ARRAY['presupuesto', 'básico', 'finanzas'], 'https://example.com/presupuesto-101', 'budgeting', 'beginner', 10),
('La Regla 50/30/20', 'Descubre cómo dividir tus ingresos de manera inteligente: 50% necesidades, 30% deseos, 20% ahorros e inversiones.', 420, ARRAY['presupuesto', 'ahorro', 'gastos'], 'https://example.com/regla-50-30-20', 'budgeting', 'beginner', 15),
('Fondo de Emergencia: Tu Red de Seguridad', 'Por qué necesitas un fondo de emergencia de 3-6 meses de gastos y cómo construirlo paso a paso sin sacrificar tu calidad de vida.', 480, ARRAY['ahorro', 'emergencia', 'seguridad'], 'https://example.com/fondo-emergencia', 'saving', 'intermediate', 20),
('Interés Compuesto: El Poder del Tiempo', 'Entiende cómo el interés compuesto puede multiplicar tus ahorros. La diferencia entre empezar a los 20 vs los 30 años.', 600, ARRAY['inversión', 'interés', 'largo plazo'], 'https://example.com/interes-compuesto', 'investing', 'intermediate', 25),
('Cómo Salir de Deudas Rápidamente', 'Estrategias probadas: método bola de nieve vs avalancha. Casos reales de personas que eliminaron sus deudas.', 540, ARRAY['deuda', 'estrategia', 'pagos'], 'https://example.com/eliminar-deudas', 'debt', 'intermediate', 20),
('Inversión para Principiantes', 'Conceptos básicos: acciones, bonos, fondos mutuos. Cómo empezar a invertir con poco dinero y bajo riesgo.', 720, ARRAY['inversión', 'mercados', 'principiante'], 'https://example.com/inversion-101', 'investing', 'beginner', 30),
('Planificación para el Retiro', 'Nunca es temprano para pensar en tu retiro. Estrategias según tu edad y cómo calcular cuánto necesitas.', 900, ARRAY['retiro', 'planificación', 'futuro'], 'https://example.com/planificar-retiro', 'financial_planning', 'advanced', 35),
('Psicología del Dinero', 'Cómo tus emociones y sesgos cognitivos afectan tus decisiones financieras. Aprende a tomar decisiones racionales.', 450, ARRAY['psicología', 'comportamiento', 'decisiones'], 'https://example.com/psicologia-dinero', 'economics', 'intermediate', 18),
('Automatiza tus Finanzas', 'Configura sistemas automáticos para ahorrar e invertir sin esfuerzo. Apps y herramientas que te ayudarán.', 360, ARRAY['automatización', 'tecnología', 'ahorro'], 'https://example.com/automatizar-finanzas', 'saving', 'beginner', 15),
('Inflación: Protege tu Dinero', 'Qué es la inflación, cómo afecta tus ahorros y estrategias para proteger tu poder adquisitivo a largo plazo.', 480, ARRAY['inflación', 'economía', 'protección'], 'https://example.com/entender-inflacion', 'economics', 'advanced', 25),
('Diversificación de Inversiones', 'No pongas todos los huevos en una canasta. Aprende a diversificar tu portafolio para minimizar riesgos.', 540, ARRAY['inversión', 'diversificación', 'riesgo'], 'https://example.com/diversificar', 'investing', 'intermediate', 22),
('Finanzas Personales en Uruguay', 'Guía específica para Uruguay: bancos, inversiones locales, beneficios fiscales y oportunidades únicas.', 600, ARRAY['uruguay', 'local', 'beneficios'], 'https://example.com/finanzas-uruguay', 'financial_planning', 'intermediate', 28);

-- ============================================
-- VISTAS OPTIMIZADAS
-- ============================================

-- Vista para dashboard del usuario
CREATE OR REPLACE VIEW public.user_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    u.premium,
    u.total_xp,
    u.current_level,
    u.current_streak,
    COUNT(DISTINCT g.id) as total_goals,
    COUNT(DISTINCT g.id) FILTER (WHERE g.is_active = true) as active_goals,
    COALESCE(SUM(g.saved_amount), 0) as total_saved,
    COALESCE(SUM(g.target_amount), 0) as total_target,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'done') as challenges_completed,
    COUNT(DISTINCT up.id) as learnings_completed,
    CASE 
        WHEN COUNT(DISTINCT g.id) FILTER (WHERE g.is_active = true) > 0 THEN
            ROUND((SUM(g.saved_amount) / NULLIF(SUM(g.target_amount), 0) * 100)::NUMERIC, 2)
        ELSE 0 
    END as overall_progress_percentage
FROM public.users u
LEFT JOIN public.goals g ON u.id = g.user_id
LEFT JOIN public.user_challenges uc ON u.id = uc.user_id
LEFT JOIN public.user_progress up ON u.id = up.user_id
GROUP BY u.id, u.email, u.premium, u.total_xp, u.current_level, u.current_streak;

-- Vista para ranking de squads
CREATE OR REPLACE VIEW public.squad_rankings AS
SELECT 
    s.id as squad_id,
    s.name as squad_name,
    s.description,
    COUNT(DISTINCT sm.user_id) as member_count,
    COALESCE(SUM(sm.total_saved), 0) as total_squad_savings,
    COALESCE(AVG(sm.monthly_saved), 0) as avg_monthly_savings,
    RANK() OVER (ORDER BY SUM(sm.total_saved) DESC) as savings_rank,
    RANK() OVER (ORDER BY AVG(sm.monthly_saved) DESC) as monthly_rank
FROM public.squads s
LEFT JOIN public.squad_members sm ON s.id = sm.squad_id
WHERE s.is_active = true
GROUP BY s.id, s.name, s.description;

-- Vista para estadísticas de challenges
CREATE OR REPLACE VIEW public.challenge_stats AS
SELECT 
    c.id,
    c.title,
    c.type,
    c.points,
    COUNT(DISTINCT uc.user_id) as total_participants,
    COUNT(DISTINCT uc.user_id) FILTER (WHERE uc.status = 'done') as completions,
    CASE 
        WHEN COUNT(DISTINCT uc.user_id) > 0 THEN
            ROUND((COUNT(DISTINCT uc.user_id) FILTER (WHERE uc.status = 'done')::FLOAT / COUNT(DISTINCT uc.user_id) * 100)::NUMERIC, 2)
        ELSE 0 
    END as completion_rate
FROM public.challenges c
LEFT JOIN public.user_challenges uc ON c.id = uc.challenge_id
WHERE c.active = true
GROUP BY c.id, c.title, c.type, c.points;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.users IS 'Perfiles de usuario vinculados con Supabase Auth, incluye gamificación';
COMMENT ON TABLE public.goals IS 'Metas de ahorro con categorías y campos específicos por tipo';
COMMENT ON TABLE public.micro_contributions IS 'Aportes individuales hacia metas con diferentes fuentes';
COMMENT ON TABLE public.challenges IS 'Catálogo de desafíos gamificados para motivar el ahorro';
COMMENT ON TABLE public.user_challenges IS 'Progreso y estado de usuarios en los desafíos';
COMMENT ON TABLE public.squads IS 'Grupos de ahorro social para competir con amigos';
COMMENT ON TABLE public.squad_members IS 'Miembros de squads con estadísticas de ahorro';
COMMENT ON TABLE public.transactions_raw IS 'Transacciones importadas desde CSV o registradas manualmente';
COMMENT ON TABLE public.learnings IS 'Contenido educativo de finanzas personales con gamificación';
COMMENT ON TABLE public.user_progress IS 'Progreso de usuarios en el contenido educativo';
COMMENT ON TABLE public.subscriptions IS 'Suscripciones premium de usuarios';
COMMENT ON TABLE public.paywall_events IS 'Eventos de interacción con el paywall para analytics';
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría de acciones importantes del sistema';

-- ============================================
-- VERIFICACIONES FINALES
-- ============================================

-- Sincronizar usuarios existentes de Auth a public.users (si hay usuarios)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        INSERT INTO public.users (id, email, country, currency, premium, created_at, updated_at)
        SELECT 
            au.id,
            au.email,
            COALESCE(au.raw_user_meta_data->>'country', 'UY') as country,
            COALESCE(au.raw_user_meta_data->>'currency', 'UYU') as currency,
            FALSE as premium,
            au.created_at,
            NOW() as updated_at
        FROM auth.users au
        WHERE NOT EXISTS (
            SELECT 1 FROM public.users pu WHERE pu.id = au.id
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Usuarios existentes sincronizados desde auth.users';
    ELSE
        RAISE NOTICE 'No hay usuarios en auth.users para sincronizar';
    END IF;
END
$$;

-- Verificar que las políticas se crearon correctamente
DO $$ 
DECLARE 
    policy_count INTEGER;
    table_count INTEGER;
BEGIN
    -- Contar políticas RLS creadas
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    -- Contar tablas creadas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'goals', 'micro_contributions', 'challenges', 'user_challenges',
        'squads', 'squad_members', 'transactions_raw', 'learnings', 'user_progress',
        'subscriptions', 'paywall_events', 'audit_logs'
    );
    
    RAISE NOTICE 'Creación completada: % tablas, % políticas RLS', table_count, policy_count;
END $$;

-- ============================================
-- MENSAJE FINAL DE CONFIRMACIÓN
-- ============================================

-- Mensaje final simple
SELECT '🎉 BASE DE DATOS URUGUAHORRA CREADA EXITOSAMENTE' as mensaje, NOW() as timestamp;

-- Mostrar estadísticas finales
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    challenges_count INTEGER;
    learnings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN (
        'users', 'goals', 'micro_contributions', 'challenges', 'user_challenges',
        'squads', 'squad_members', 'transactions_raw', 'learnings', 'user_progress',
        'subscriptions', 'paywall_events', 'audit_logs'
    );
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO challenges_count FROM public.challenges;
    SELECT COUNT(*) INTO learnings_count FROM public.learnings;
    
    RAISE NOTICE '✅ Setup completado exitosamente:';
    RAISE NOTICE '   📋 Tablas creadas: %', table_count;
    RAISE NOTICE '   🔒 Políticas RLS: %', policy_count;
    RAISE NOTICE '   🏆 Challenges: %', challenges_count;
    RAISE NOTICE '   📚 Learnings: %', learnings_count;
    RAISE NOTICE '   🚀 ¡Base de datos lista para usar!';
END
$$;

-- ============================================
-- FIN DEL SCHEMA MAESTRO
-- ============================================