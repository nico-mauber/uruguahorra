-- Remove export functionality column and update defaults for hidden settings
-- Date: 2025-08-28

-- Remove enable_export_functionality column if it exists
ALTER TABLE analytics_preferences 
DROP COLUMN IF EXISTS enable_export_functionality;

-- Update default values for settings that are now hidden but always active
ALTER TABLE analytics_preferences 
ALTER COLUMN show_quick_stats SET DEFAULT true,
ALTER COLUMN hide_completed_insights SET DEFAULT true,
ALTER COLUMN prefer_high_impact_insights SET DEFAULT true,
ALTER COLUMN cache_interval SET DEFAULT 300000,
ALTER COLUMN auto_refresh SET DEFAULT true;

-- Update existing records to ensure hidden settings have correct values
UPDATE analytics_preferences 
SET 
  show_quick_stats = true,
  hide_completed_insights = true,
  prefer_high_impact_insights = true,
  cache_interval = 300000,
  auto_refresh = true
WHERE 
  show_quick_stats = false 
  OR hide_completed_insights = false 
  OR prefer_high_impact_insights = false
  OR cache_interval != 300000
  OR auto_refresh = false;

-- Update the update_analytics_preferences function to remove export parameter
CREATE OR REPLACE FUNCTION update_analytics_preferences(
    p_user_id UUID,
    p_spending_patterns_days INTEGER DEFAULT NULL,
    p_monthly_insights_months INTEGER DEFAULT NULL,
    p_forecast_days INTEGER DEFAULT NULL,
    p_default_tab VARCHAR DEFAULT NULL,
    p_show_quick_stats BOOLEAN DEFAULT NULL,
    p_max_insights_per_type INTEGER DEFAULT NULL,
    p_hide_completed_insights BOOLEAN DEFAULT NULL,
    p_prefer_high_impact_insights BOOLEAN DEFAULT NULL,
    p_enable_psychological_insights BOOLEAN DEFAULT NULL,
    p_enable_spending_forecast BOOLEAN DEFAULT NULL,
    p_enable_push_notifications BOOLEAN DEFAULT NULL,
    p_preferred_language VARCHAR DEFAULT NULL,
    p_currency VARCHAR DEFAULT NULL,
    p_date_format VARCHAR DEFAULT NULL,
    p_cache_interval INTEGER DEFAULT NULL,
    p_auto_refresh BOOLEAN DEFAULT NULL
)
RETURNS analytics_preferences AS $$
DECLARE
    v_result analytics_preferences;
BEGIN
    -- Update preferences
    UPDATE analytics_preferences
    SET
        spending_patterns_days = COALESCE(p_spending_patterns_days, spending_patterns_days),
        monthly_insights_months = COALESCE(p_monthly_insights_months, monthly_insights_months),
        forecast_days = COALESCE(p_forecast_days, forecast_days),
        default_tab = COALESCE(p_default_tab, default_tab),
        -- These are now always true and hidden from user
        show_quick_stats = true,
        max_insights_per_type = COALESCE(p_max_insights_per_type, max_insights_per_type),
        hide_completed_insights = true,
        prefer_high_impact_insights = true,
        enable_psychological_insights = COALESCE(p_enable_psychological_insights, enable_psychological_insights),
        enable_spending_forecast = COALESCE(p_enable_spending_forecast, enable_spending_forecast),
        enable_push_notifications = COALESCE(p_enable_push_notifications, enable_push_notifications),
        preferred_language = COALESCE(p_preferred_language, preferred_language),
        currency = COALESCE(p_currency, currency),
        date_format = COALESCE(p_date_format, date_format),
        -- These are now always default values and hidden from user
        cache_interval = 300000,
        auto_refresh = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;

    -- If no rows were updated, create new preferences
    IF NOT FOUND THEN
        INSERT INTO analytics_preferences (
            user_id,
            spending_patterns_days,
            monthly_insights_months,
            forecast_days,
            default_tab,
            show_quick_stats,
            max_insights_per_type,
            hide_completed_insights,
            prefer_high_impact_insights,
            enable_psychological_insights,
            enable_spending_forecast,
            enable_push_notifications,
            preferred_language,
            currency,
            date_format,
            cache_interval,
            auto_refresh
        )
        VALUES (
            p_user_id,
            COALESCE(p_spending_patterns_days, 30),
            COALESCE(p_monthly_insights_months, 6),
            COALESCE(p_forecast_days, 30),
            COALESCE(p_default_tab, 'insights'),
            true, -- always true
            COALESCE(p_max_insights_per_type, 2),
            true, -- always true
            true, -- always true
            COALESCE(p_enable_psychological_insights, true),
            COALESCE(p_enable_spending_forecast, true),
            COALESCE(p_enable_push_notifications, false),
            COALESCE(p_preferred_language, 'es'),
            COALESCE(p_currency, 'UYU'),
            COALESCE(p_date_format, 'DD/MM/YYYY'),
            300000, -- always default
            true -- always true
        )
        RETURNING * INTO v_result;
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Update the reset function as well
CREATE OR REPLACE FUNCTION reset_analytics_preferences(p_user_id UUID)
RETURNS analytics_preferences AS $$
DECLARE
    v_result analytics_preferences;
BEGIN
    UPDATE analytics_preferences
    SET
        spending_patterns_days = 30,
        monthly_insights_months = 6,
        forecast_days = 30,
        default_tab = 'insights',
        show_quick_stats = true,
        max_insights_per_type = 2,
        hide_completed_insights = true,
        prefer_high_impact_insights = true,
        enable_psychological_insights = true,
        enable_spending_forecast = true,
        enable_push_notifications = false,
        preferred_language = 'es',
        currency = 'UYU',
        date_format = 'DD/MM/YYYY',
        cache_interval = 300000,
        auto_refresh = true,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;