-- ============================================
-- URUGUAHORRA DATABASE SCHEMA - VERSIÓN TRANSACCIONAL
-- ============================================
-- Ejecutar todo como una única transacción para garantizar atomicidad
-- Si algo falla, todo se revierte automáticamente
-- ============================================

BEGIN TRANSACTION;

-- ============================================
-- PASO 1: HABILITAR EXTENSIONES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PASO 2: CREAR TODAS LAS TABLAS PRIMERO (sin políticas)
-- ============================================

-- Tabla: users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT auth.uid(),
    email TEXT UNIQUE NOT NULL,
    country TEXT,
    currency TEXT,
    premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: goals
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
    target_date DATE NOT NULL,
    saved_amount NUMERIC(12,2) DEFAULT 0 CHECK (saved_amount >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: micro_contributions
CREATE TABLE IF NOT EXISTS micro_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    source TEXT NOT NULL CHECK (source IN ('manual', 'roundup', 'automatic', 'challenge_reward')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: challenges
CREATE TABLE IF NOT EXISTS challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly', 'achievement')),
    points INTEGER NOT NULL CHECK (points > 0),
    description TEXT NOT NULL,
    icon TEXT,
    requirement_type TEXT CHECK (requirement_type IN ('savings', 'streak', 'transactions', 'learning', 'social')),
    requirement_value NUMERIC,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: user_challenges
CREATE TABLE IF NOT EXISTS user_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'done', 'claimed')),
    progress NUMERIC DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    UNIQUE(user_id, challenge_id)
);

-- Tabla: squads
CREATE TABLE IF NOT EXISTS squads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 0, 9),
    max_members INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: squad_members (DEBE CREARSE DESPUÉS DE squads)
CREATE TABLE IF NOT EXISTS squad_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    total_saved NUMERIC(12,2) DEFAULT 0,
    monthly_saved NUMERIC(12,2) DEFAULT 0,
    UNIQUE(squad_id, user_id)
);

-- Tabla: transactions_raw
CREATE TABLE IF NOT EXISTS transactions_raw (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT NOT NULL,
    category TEXT,
    description TEXT,
    merchant TEXT,
    ts TIMESTAMPTZ NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('csv', 'manual', 'api', 'bank_sync')),
    file_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: learnings
CREATE TABLE IF NOT EXISTS learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_sec INTEGER NOT NULL CHECK (duration_sec > 0),
    tags TEXT[] DEFAULT '{}',
    url TEXT,
    category TEXT CHECK (category IN ('budgeting', 'saving', 'investing', 'debt', 'financial_planning', 'economics')),
    difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    points INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: user_progress
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    learning_id UUID NOT NULL REFERENCES learnings(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    time_spent_sec INTEGER,
    UNIQUE(user_id, learning_id)
);

-- Tabla: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'mercadopago', 'apple', 'google')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    plan TEXT NOT NULL CHECK (plan IN ('free', 'premium_monthly', 'premium_yearly')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: paywall_events
CREATE TABLE IF NOT EXISTS paywall_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event TEXT NOT NULL CHECK (event IN ('view', 'click_upgrade', 'dismiss', 'purchase_started', 'purchase_completed', 'purchase_failed')),
    feature TEXT,
    ts TIMESTAMPTZ DEFAULT NOW(),
    meta JSONB DEFAULT '{}'
);

-- Tabla: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    changes JSONB DEFAULT '{}',
    ts TIMESTAMPTZ DEFAULT NOW(),
    ip TEXT,
    user_agent TEXT,
    session_id TEXT
);

-- ============================================
-- PASO 3: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE learnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paywall_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 4: CREAR POLÍTICAS RLS
-- ============================================

-- Políticas para users
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Políticas para goals
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para micro_contributions
CREATE POLICY "Users can view own contributions" ON micro_contributions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contributions" ON micro_contributions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contributions" ON micro_contributions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para challenges
CREATE POLICY "Everyone can view active challenges" ON challenges
    FOR SELECT USING (active = TRUE);

-- Políticas para user_challenges
CREATE POLICY "Users can view own challenge progress" ON user_challenges
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress" ON user_challenges
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress" ON user_challenges
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para squads (AHORA squad_members YA EXISTE)
CREATE POLICY "Users can view squads they belong to" ON squads
    FOR SELECT USING (
        owner_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM squad_members 
            WHERE squad_members.squad_id = squads.id 
            AND squad_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create squads" ON squads
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Squad owners can update their squads" ON squads
    FOR UPDATE USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Squad owners can delete their squads" ON squads
    FOR DELETE USING (auth.uid() = owner_id);

-- Políticas para squad_members
CREATE POLICY "Users can view squad members of their squads" ON squad_members
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM squad_members sm
            WHERE sm.squad_id = squad_members.squad_id
            AND sm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join squads" ON squad_members
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership" ON squad_members
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave squads" ON squad_members
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para transactions_raw
CREATE POLICY "Users can view own transactions" ON transactions_raw
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions_raw
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions_raw
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions_raw
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas para learnings
CREATE POLICY "Everyone can view active learnings" ON learnings
    FOR SELECT USING (is_active = TRUE);

-- Políticas para user_progress
CREATE POLICY "Users can view own learning progress" ON user_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning progress" ON user_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning progress" ON user_progress
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON subscriptions
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Políticas para paywall_events
CREATE POLICY "Users can view own paywall events" ON paywall_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own paywall events" ON paywall_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas para audit_logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- PASO 5: CREAR TODOS LOS ÍNDICES
-- ============================================

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_premium ON users(premium) WHERE premium = TRUE;

-- Índices para goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_active ON goals(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goals_created_at ON goals(created_at DESC);

-- Índices para micro_contributions
CREATE INDEX IF NOT EXISTS idx_micro_contributions_user_id ON micro_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_micro_contributions_goal_id ON micro_contributions(goal_id);
CREATE INDEX IF NOT EXISTS idx_micro_contributions_created_at ON micro_contributions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_micro_contributions_source ON micro_contributions(source);
CREATE INDEX IF NOT EXISTS idx_micro_contributions_user_goal ON micro_contributions(user_id, goal_id);

-- Índices para challenges
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(type);

-- Índices para user_challenges
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge_id ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_status ON user_challenges(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed_at ON user_challenges(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Índices para squads
CREATE INDEX IF NOT EXISTS idx_squads_owner_id ON squads(owner_id);
CREATE INDEX IF NOT EXISTS idx_squads_invite_code ON squads(invite_code);
CREATE INDEX IF NOT EXISTS idx_squads_active ON squads(is_active) WHERE is_active = TRUE;

-- Índices para squad_members
CREATE INDEX IF NOT EXISTS idx_squad_members_squad_id ON squad_members(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_user_id ON squad_members(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_members_joined_at ON squad_members(joined_at DESC);

-- Índices para transactions_raw
CREATE INDEX IF NOT EXISTS idx_transactions_raw_user_id ON transactions_raw(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_raw_ts ON transactions_raw(ts DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_raw_category ON transactions_raw(category);
CREATE INDEX IF NOT EXISTS idx_transactions_raw_user_ts ON transactions_raw(user_id, ts DESC);

-- Índices para learnings
CREATE INDEX IF NOT EXISTS idx_learnings_active ON learnings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_learnings_category ON learnings(category);
CREATE INDEX IF NOT EXISTS idx_learnings_difficulty ON learnings(difficulty);

-- Índices para user_progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_learning_id ON user_progress(learning_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed_at ON user_progress(completed_at DESC);

-- Índices para subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_active ON subscriptions(user_id, status) WHERE status = 'active';

-- Índices para paywall_events
CREATE INDEX IF NOT EXISTS idx_paywall_events_user_id ON paywall_events(user_id);
CREATE INDEX IF NOT EXISTS idx_paywall_events_event ON paywall_events(event);
CREATE INDEX IF NOT EXISTS idx_paywall_events_ts ON paywall_events(ts DESC);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ============================================
-- PASO 6: CREAR FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_squads_updated_at BEFORE UPDATE ON squads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PASO 7: CREAR VISTAS
-- ============================================

-- Vista para el dashboard del usuario
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
    u.id as user_id,
    u.email,
    u.premium,
    COUNT(DISTINCT g.id) as total_goals,
    COUNT(DISTINCT g.id) FILTER (WHERE g.is_active = true) as active_goals,
    COALESCE(SUM(g.saved_amount), 0) as total_saved,
    COUNT(DISTINCT uc.id) FILTER (WHERE uc.status = 'done') as challenges_completed,
    COUNT(DISTINCT up.id) as learnings_completed
FROM users u
LEFT JOIN goals g ON u.id = g.user_id
LEFT JOIN user_challenges uc ON u.id = uc.user_id
LEFT JOIN user_progress up ON u.id = up.user_id
GROUP BY u.id, u.email, u.premium;

-- Vista para el ranking de squads
CREATE OR REPLACE VIEW squad_rankings AS
SELECT 
    s.id as squad_id,
    s.name as squad_name,
    COUNT(DISTINCT sm.user_id) as member_count,
    COALESCE(SUM(sm.total_saved), 0) as total_squad_savings,
    COALESCE(AVG(sm.monthly_saved), 0) as avg_monthly_savings,
    RANK() OVER (ORDER BY SUM(sm.total_saved) DESC) as ranking
FROM squads s
LEFT JOIN squad_members sm ON s.id = sm.squad_id
WHERE s.is_active = true
GROUP BY s.id, s.name;

-- ============================================
-- PASO 8: INSERTAR DATOS SEMILLA
-- ============================================

-- Insertar 10 challenges de ejemplo
INSERT INTO challenges (title, type, points, description, icon, requirement_type, requirement_value, active) VALUES
('Primera Meta', 'achievement', 50, 'Crea tu primera meta de ahorro', 'trophy', 'savings', 1, true),
('Racha de 7 Días', 'weekly', 100, 'Ahorra durante 7 días consecutivos', 'flame', 'streak', 7, true),
('Ahorro Rápido', 'daily', 20, 'Realiza un aporte de al menos $10 hoy', 'zap', 'savings', 10, true),
('Maestro del Redondeo', 'achievement', 75, 'Activa el redondeo automático y úsalo 10 veces', 'calculator', 'transactions', 10, true),
('Estudiante Financiero', 'monthly', 150, 'Completa 5 lecciones de educación financiera', 'school', 'learning', 5, true),
('Social Saver', 'achievement', 100, 'Únete a un squad de ahorro', 'people', 'social', 1, true),
('Meta Mensual', 'monthly', 200, 'Ahorra al menos $100 en un mes', 'calendar', 'savings', 100, true),
('Racha de Oro', 'achievement', 300, 'Mantén una racha de 30 días', 'star', 'streak', 30, true),
('Diversificador', 'achievement', 150, 'Crea 3 metas de ahorro diferentes', 'layers', 'savings', 3, true),
('Ahorrador Consistente', 'weekly', 80, 'Realiza al menos 5 aportes esta semana', 'refresh', 'transactions', 5, true);

-- Insertar 10 learnings de ejemplo
INSERT INTO learnings (title, description, duration_sec, tags, url, category, difficulty, points) VALUES
('Introducción al Presupuesto Personal', 'Aprende los conceptos básicos para crear y mantener un presupuesto personal efectivo', 300, ARRAY['presupuesto', 'básico', 'finanzas'], 'https://example.com/presupuesto-101', 'budgeting', 'beginner', 10),
('La Regla 50/30/20', 'Descubre cómo dividir tus ingresos de manera inteligente usando la regla 50/30/20', 420, ARRAY['presupuesto', 'ahorro', 'gastos'], 'https://example.com/regla-50-30-20', 'budgeting', 'beginner', 15),
('Fondo de Emergencia: Tu Red de Seguridad', 'Por qué necesitas un fondo de emergencia y cómo construirlo paso a paso', 480, ARRAY['ahorro', 'emergencia', 'seguridad'], 'https://example.com/fondo-emergencia', 'saving', 'intermediate', 20),
('Interés Compuesto: El Poder del Tiempo', 'Entiende cómo el interés compuesto puede multiplicar tus ahorros a largo plazo', 600, ARRAY['inversión', 'interés', 'largo plazo'], 'https://example.com/interes-compuesto', 'investing', 'intermediate', 25),
('Cómo Salir de Deudas Rápidamente', 'Estrategias probadas para eliminar deudas usando los métodos bola de nieve y avalancha', 540, ARRAY['deuda', 'estrategia', 'pagos'], 'https://example.com/eliminar-deudas', 'debt', 'intermediate', 20),
('Inversión para Principiantes', 'Conceptos básicos de inversión: acciones, bonos y fondos mutuos explicados', 720, ARRAY['inversión', 'mercados', 'principiante'], 'https://example.com/inversion-101', 'investing', 'beginner', 30),
('Planificación para el Retiro', 'Nunca es temprano para pensar en tu retiro: estrategias según tu edad', 900, ARRAY['retiro', 'planificación', 'futuro'], 'https://example.com/planificar-retiro', 'financial_planning', 'advanced', 35),
('Psicología del Dinero', 'Cómo tus emociones y sesgos afectan tus decisiones financieras', 450, ARRAY['psicología', 'comportamiento', 'decisiones'], 'https://example.com/psicologia-dinero', 'economics', 'intermediate', 18),
('Automatiza tus Finanzas', 'Configura sistemas automáticos para ahorrar sin esfuerzo', 360, ARRAY['automatización', 'tecnología', 'ahorro'], 'https://example.com/automatizar-finanzas', 'saving', 'beginner', 15),
('Inflación: Protege tu Poder Adquisitivo', 'Entiende qué es la inflación y cómo proteger tus ahorros de ella', 480, ARRAY['inflación', 'economía', 'protección'], 'https://example.com/entender-inflacion', 'economics', 'advanced', 25);

-- ============================================
-- PASO 9: AGREGAR COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE users IS 'Tabla principal de usuarios, vinculada con Supabase Auth';
COMMENT ON TABLE goals IS 'Metas de ahorro definidas por los usuarios';
COMMENT ON TABLE micro_contributions IS 'Aportes individuales hacia las metas de ahorro';
COMMENT ON TABLE challenges IS 'Catálogo de desafíos gamificados disponibles';
COMMENT ON TABLE user_challenges IS 'Progreso de usuarios en los desafíos';
COMMENT ON TABLE squads IS 'Grupos de ahorro colaborativo';
COMMENT ON TABLE squad_members IS 'Miembros de los squads y sus estadísticas';
COMMENT ON TABLE transactions_raw IS 'Transacciones importadas o registradas por usuarios';
COMMENT ON TABLE learnings IS 'Contenido educativo de finanzas personales';
COMMENT ON TABLE user_progress IS 'Progreso de usuarios en el contenido educativo';
COMMENT ON TABLE subscriptions IS 'Suscripciones premium de los usuarios';
COMMENT ON TABLE paywall_events IS 'Eventos de interacción con el paywall';
COMMENT ON TABLE audit_logs IS 'Registro de auditoría de acciones importantes';

-- ============================================
-- FINALIZAR TRANSACCIÓN
-- ============================================
COMMIT;

-- ============================================
-- VERIFICACIÓN POST-MIGRACIÓN
-- ============================================
-- Ejecuta estas queries después de la migración para verificar:

-- 1. Verificar que todas las tablas se crearon
/*
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
*/

-- 2. Verificar que RLS está habilitado
/*
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
*/

-- 3. Verificar datos semilla
/*
SELECT 'challenges' as tabla, COUNT(*) as registros FROM challenges
UNION ALL
SELECT 'learnings' as tabla, COUNT(*) as registros FROM learnings;
*/