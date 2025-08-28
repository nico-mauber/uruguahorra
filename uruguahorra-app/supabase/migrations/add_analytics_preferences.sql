-- ============================================
-- ANALYTICS PREFERENCES SYSTEM
-- ============================================
-- Adds user-specific analytics preferences and configuration
-- Version: 1.0
-- Date: August 27, 2025
-- ============================================

BEGIN;

-- ==================== USER ANALYTICS PREFERENCES TABLE ====================

CREATE TABLE IF NOT EXISTS public.user_analytics_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Time period preferences
    spending_patterns_days INTEGER DEFAULT 30 CHECK (spending_patterns_days >= 7 AND spending_patterns_days <= 365),
    monthly_insights_months INTEGER DEFAULT 6 CHECK (monthly_insights_months >= 1 AND monthly_insights_months <= 48),
    forecast_days INTEGER DEFAULT 30 CHECK (forecast_days >= 7 AND forecast_days <= 365),
    
    -- UI preferences
    default_tab TEXT DEFAULT 'insights' CHECK (default_tab IN ('insights', 'patterns', 'forecast')),
    show_quick_stats BOOLEAN DEFAULT true,
    max_insights_per_type INTEGER DEFAULT 2 CHECK (max_insights_per_type >= 1 AND max_insights_per_type <= 5),
    hide_completed_insights BOOLEAN DEFAULT true,
    prefer_high_impact_insights BOOLEAN DEFAULT true,
    
    -- Feature preferences
    enable_psychological_insights BOOLEAN DEFAULT true,
    enable_spending_forecast BOOLEAN DEFAULT true,
    enable_push_notifications BOOLEAN DEFAULT false,
    enable_export_functionality BOOLEAN DEFAULT false,
    
    -- Localization preferences
    preferred_language TEXT DEFAULT 'es' CHECK (preferred_language IN ('es', 'en')),
    currency TEXT DEFAULT 'UYU' CHECK (currency IN ('UYU', 'USD', 'EUR')),
    date_format TEXT DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
    
    -- Cache and performance preferences
    cache_interval INTEGER DEFAULT 300000 CHECK (cache_interval >= 30000 AND cache_interval <= 1800000), -- 30s to 30min
    auto_refresh BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one preference per user
    UNIQUE(user_id)
);

-- ==================== INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_user_analytics_preferences_user_id 
ON public.user_analytics_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_analytics_preferences_updated_at 
ON public.user_analytics_preferences(updated_at);

-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE public.user_analytics_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own analytics preferences" ON public.user_analytics_preferences
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own analytics preferences" ON public.user_analytics_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own analytics preferences" ON public.user_analytics_preferences
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own analytics preferences" ON public.user_analytics_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- ==================== FUNCTIONS ====================

-- Function to get or create user analytics preferences with defaults
CREATE OR REPLACE FUNCTION get_or_create_analytics_preferences(p_user_id UUID)
RETURNS public.user_analytics_preferences AS $$
DECLARE
    preferences public.user_analytics_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO preferences 
    FROM public.user_analytics_preferences 
    WHERE user_id = p_user_id;
    
    -- If no preferences exist, create default ones
    IF NOT FOUND THEN
        INSERT INTO public.user_analytics_preferences (user_id)
        VALUES (p_user_id)
        RETURNING * INTO preferences;
        
        RAISE NOTICE 'Created default analytics preferences for user %', p_user_id;
    END IF;
    
    RETURN preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update analytics preferences
CREATE OR REPLACE FUNCTION update_analytics_preferences(
    p_user_id UUID,
    p_spending_patterns_days INTEGER DEFAULT NULL,
    p_monthly_insights_months INTEGER DEFAULT NULL,
    p_forecast_days INTEGER DEFAULT NULL,
    p_default_tab TEXT DEFAULT NULL,
    p_show_quick_stats BOOLEAN DEFAULT NULL,
    p_max_insights_per_type INTEGER DEFAULT NULL,
    p_hide_completed_insights BOOLEAN DEFAULT NULL,
    p_prefer_high_impact_insights BOOLEAN DEFAULT NULL,
    p_enable_psychological_insights BOOLEAN DEFAULT NULL,
    p_enable_spending_forecast BOOLEAN DEFAULT NULL,
    p_enable_push_notifications BOOLEAN DEFAULT NULL,
    p_preferred_language TEXT DEFAULT NULL,
    p_currency TEXT DEFAULT NULL,
    p_date_format TEXT DEFAULT NULL,
    p_cache_interval INTEGER DEFAULT NULL,
    p_auto_refresh BOOLEAN DEFAULT NULL
)
RETURNS public.user_analytics_preferences AS $$
DECLARE
    updated_preferences public.user_analytics_preferences;
BEGIN
    -- Ensure preferences exist first
    PERFORM get_or_create_analytics_preferences(p_user_id);
    
    -- Update only provided values
    UPDATE public.user_analytics_preferences SET
        spending_patterns_days = COALESCE(p_spending_patterns_days, spending_patterns_days),
        monthly_insights_months = COALESCE(p_monthly_insights_months, monthly_insights_months),
        forecast_days = COALESCE(p_forecast_days, forecast_days),
        default_tab = COALESCE(p_default_tab, default_tab),
        show_quick_stats = COALESCE(p_show_quick_stats, show_quick_stats),
        max_insights_per_type = COALESCE(p_max_insights_per_type, max_insights_per_type),
        hide_completed_insights = COALESCE(p_hide_completed_insights, hide_completed_insights),
        prefer_high_impact_insights = COALESCE(p_prefer_high_impact_insights, prefer_high_impact_insights),
        enable_psychological_insights = COALESCE(p_enable_psychological_insights, enable_psychological_insights),
        enable_spending_forecast = COALESCE(p_enable_spending_forecast, enable_spending_forecast),
        enable_push_notifications = COALESCE(p_enable_push_notifications, enable_push_notifications),
        preferred_language = COALESCE(p_preferred_language, preferred_language),
        currency = COALESCE(p_currency, currency),
        date_format = COALESCE(p_date_format, date_format),
        cache_interval = COALESCE(p_cache_interval, cache_interval),
        auto_refresh = COALESCE(p_auto_refresh, auto_refresh),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING * INTO updated_preferences;
    
    RETURN updated_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset analytics preferences to defaults
CREATE OR REPLACE FUNCTION reset_analytics_preferences(p_user_id UUID)
RETURNS public.user_analytics_preferences AS $$
DECLARE
    reset_preferences public.user_analytics_preferences;
BEGIN
    -- Delete existing preferences
    DELETE FROM public.user_analytics_preferences WHERE user_id = p_user_id;
    
    -- Create new default preferences
    INSERT INTO public.user_analytics_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO reset_preferences;
    
    RAISE NOTICE 'Reset analytics preferences to defaults for user %', p_user_id;
    
    RETURN reset_preferences;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== UPDATED_AT TRIGGER ====================

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_analytics_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_analytics_preferences_updated_at_trigger
    BEFORE UPDATE ON public.user_analytics_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_user_analytics_preferences_updated_at();

-- ==================== GRANTS ====================

-- Grant access to authenticated users
GRANT ALL ON public.user_analytics_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_analytics_preferences(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_analytics_preferences(UUID, INTEGER, INTEGER, INTEGER, TEXT, BOOLEAN, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION reset_analytics_preferences(UUID) TO authenticated;

-- ==================== SEED DEFAULT PREFERENCES ====================

-- Auto-create preferences for existing users (optional)
DO $$
DECLARE
    user_record RECORD;
    preferences_count INTEGER;
BEGIN
    -- Count existing users without preferences
    SELECT COUNT(*) INTO preferences_count
    FROM auth.users u
    LEFT JOIN public.user_analytics_preferences uap ON u.id = uap.user_id
    WHERE uap.user_id IS NULL;
    
    RAISE NOTICE 'Found % users without analytics preferences', preferences_count;
    
    -- Create default preferences for users who don't have them
    FOR user_record IN 
        SELECT u.id, u.email
        FROM auth.users u
        LEFT JOIN public.user_analytics_preferences uap ON u.id = uap.user_id
        WHERE uap.user_id IS NULL
        LIMIT 100 -- Process in batches to avoid timeouts
    LOOP
        INSERT INTO public.user_analytics_preferences (user_id)
        VALUES (user_record.id)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE NOTICE 'Created default preferences for user % (%)', user_record.id, user_record.email;
    END LOOP;
    
    RAISE NOTICE '✅ Analytics preferences system installed successfully';
END $$;

COMMIT;

-- ==================== VALIDATION ====================

-- Verify installation
DO $$
DECLARE
    table_count INTEGER;
    function_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Check table exists
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_analytics_preferences';
    
    -- Check functions exist
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public' 
    AND routine_name IN ('get_or_create_analytics_preferences', 'update_analytics_preferences', 'reset_analytics_preferences');
    
    -- Check policies exist
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_analytics_preferences';
    
    RAISE NOTICE '=== ANALYTICS PREFERENCES INSTALLATION SUMMARY ===';
    RAISE NOTICE 'Tables created: % (expected: 1)', table_count;
    RAISE NOTICE 'Functions created: % (expected: 3)', function_count;
    RAISE NOTICE 'RLS policies created: % (expected: 4)', policy_count;
    
    IF table_count = 1 AND function_count = 3 AND policy_count = 4 THEN
        RAISE NOTICE '✅ Installation completed successfully!';
    ELSE
        RAISE WARNING '⚠️ Installation may be incomplete. Please check the logs above.';
    END IF;
END $$;