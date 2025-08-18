-- =================================
-- GAMIFICATION MODULE TABLES
-- =================================
-- Este archivo contiene las definiciones de tablas para el módulo de gamificación
-- Ejecutar después de tener las tablas base del sistema

-- 1. Tabla para log de XP
CREATE TABLE IF NOT EXISTS user_xp_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('contribution', 'challenge_complete', 'daily_streak', 'quest_complete')),
    xp_earned INTEGER NOT NULL CHECK (xp_earned >= 0),
    event_data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_xp_log
CREATE INDEX IF NOT EXISTS idx_user_xp_log_user_id ON user_xp_log(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_log_created_at ON user_xp_log(created_at);
CREATE INDEX IF NOT EXISTS idx_user_xp_log_event_type ON user_xp_log(event_type);

-- 2. Tabla para rachas de usuarios
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    max_streak INTEGER NOT NULL DEFAULT 0 CHECK (max_streak >= 0),
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    streak_protections_used INTEGER NOT NULL DEFAULT 0 CHECK (streak_protections_used >= 0),
    protection_reset_date DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_streaks  
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current_streak ON user_streaks(current_streak);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_activity ON user_streaks(last_activity_at);

-- 3. Tabla para quests semanales
CREATE TABLE IF NOT EXISTS weekly_quests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    week_start_date DATE NOT NULL,
    challenge_ids UUID[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para weekly_quests
CREATE INDEX IF NOT EXISTS idx_weekly_quests_week_start ON weekly_quests(week_start_date);
CREATE INDEX IF NOT EXISTS idx_weekly_quests_active ON weekly_quests(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_quests_unique_week ON weekly_quests(week_start_date) WHERE is_active = TRUE;

-- 4. Tabla para progreso de quests de usuarios
CREATE TABLE IF NOT EXISTS user_quest_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id UUID NOT NULL REFERENCES weekly_quests(id) ON DELETE CASCADE,
    completed_challenge_ids UUID[] NOT NULL DEFAULT '{}',
    completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    completed_at TIMESTAMPTZ NULL
);

-- Índices para user_quest_progress
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_id ON user_quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_quest_id ON user_quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_completed ON user_quest_progress(completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_quest_progress_unique ON user_quest_progress(user_id, quest_id);

-- =================================
-- ROW LEVEL SECURITY (RLS)
-- =================================

-- Habilitar RLS en todas las tablas
ALTER TABLE user_xp_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quest_progress ENABLE ROW LEVEL SECURITY;

-- Políticas para user_xp_log
CREATE POLICY "Users can view their own XP log" ON user_xp_log
    FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can insert their own XP log" ON user_xp_log
    FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);

-- Políticas para user_streaks
CREATE POLICY "Users can view their own streaks" ON user_streaks
    FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can insert their own streaks" ON user_streaks
    FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);

CREATE POLICY "Users can update their own streaks" ON user_streaks
    FOR UPDATE USING (auth.uid()::UUID = user_id);

-- Políticas para weekly_quests (lectura pública)
CREATE POLICY "Anyone can view active weekly quests" ON weekly_quests
    FOR SELECT USING (is_active = TRUE);

-- Políticas para user_quest_progress
CREATE POLICY "Users can view their own quest progress" ON user_quest_progress
    FOR SELECT USING (auth.uid()::UUID = user_id);

CREATE POLICY "Users can insert their own quest progress" ON user_quest_progress
    FOR INSERT WITH CHECK (auth.uid()::UUID = user_id);

CREATE POLICY "Users can update their own quest progress" ON user_quest_progress
    FOR UPDATE USING (auth.uid()::UUID = user_id);

-- =================================
-- TRIGGERS
-- =================================

-- Trigger para actualizar updated_at en user_streaks
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_streaks_updated_at 
    BEFORE UPDATE ON user_streaks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =================================
-- VIEWS ÚTILES
-- =================================

-- Vista para estadísticas de XP por usuario
CREATE OR REPLACE VIEW user_xp_stats AS
SELECT 
    user_id,
    SUM(xp_earned) as total_xp,
    COUNT(*) as total_events,
    SUM(CASE WHEN event_type = 'contribution' THEN xp_earned ELSE 0 END) as contribution_xp,
    SUM(CASE WHEN event_type = 'challenge_complete' THEN xp_earned ELSE 0 END) as challenge_xp,
    SUM(CASE WHEN event_type = 'daily_streak' THEN xp_earned ELSE 0 END) as streak_xp,
    SUM(CASE WHEN event_type = 'quest_complete' THEN xp_earned ELSE 0 END) as quest_xp,
    MAX(created_at) as last_xp_earned
FROM user_xp_log 
GROUP BY user_id;

-- Vista para rankings globales
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY total_xp DESC) as rank,
    user_id,
    total_xp,
    FLOOR(SQRT(total_xp) / 2) as level
FROM user_xp_stats
ORDER BY total_xp DESC;

-- Vista para estadísticas de rachas
CREATE OR REPLACE VIEW streak_stats AS
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
FROM user_streaks;

-- =================================
-- COMENTARIOS EN TABLAS
-- =================================

COMMENT ON TABLE user_xp_log IS 'Log de todos los eventos de XP del usuario';
COMMENT ON TABLE user_streaks IS 'Rachas de actividad de usuarios con protecciones';
COMMENT ON TABLE weekly_quests IS 'Quests semanales con challenges asignados';
COMMENT ON TABLE user_quest_progress IS 'Progreso individual de usuarios en quests';

COMMENT ON COLUMN user_xp_log.event_data IS 'Metadata del evento (amount, challengeId, etc.)';
COMMENT ON COLUMN user_streaks.streak_protections_used IS 'Protecciones usadas este mes (max 1)';
COMMENT ON COLUMN weekly_quests.challenge_ids IS 'Array de UUIDs de challenges para esta quest';
COMMENT ON COLUMN user_quest_progress.completed_challenge_ids IS 'Array de UUIDs de challenges completados';