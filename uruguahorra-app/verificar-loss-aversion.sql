-- ============================================
-- VERIFICAR POR QUÉ NO APARECE LOSS AVERSION
-- ============================================

-- Ver comparación mensual detallada
SELECT '📈 COMPARACIÓN MENSUAL DETALLADA:' as check_type;

WITH monthly_data AS (
    SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month_key,
        TO_CHAR(transaction_date, 'Mon YYYY') as month_display,
        SUM(amount) as monthly_total,
        COUNT(*) as transactions_count
    FROM public.transactions 
    WHERE user_id = '3f44afc7-3016-4c00-9fc0-b1f20e0ad35c'
    AND transaction_date >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), TO_CHAR(transaction_date, 'Mon YYYY')
    ORDER BY month_key DESC
)
SELECT 
    month_display as mes,
    monthly_total as total_mes,
    transactions_count as transacciones,
    LAG(monthly_total) OVER (ORDER BY month_key DESC) as mes_anterior,
    CASE 
        WHEN LAG(monthly_total) OVER (ORDER BY month_key DESC) IS NOT NULL THEN
            ROUND(
                ((monthly_total - LAG(monthly_total) OVER (ORDER BY month_key DESC)) / 
                 LAG(monthly_total) OVER (ORDER BY month_key DESC) * 100), 1
            )
        ELSE NULL 
    END as porcentaje_cambio,
    CASE 
        WHEN LAG(monthly_total) OVER (ORDER BY month_key DESC) IS NOT NULL 
             AND monthly_total > LAG(monthly_total) OVER (ORDER BY month_key DESC) * 1.1 
        THEN '🎯 LOSS AVERSION TRIGGER - ACTIVO'
        WHEN LAG(monthly_total) OVER (ORDER BY month_key DESC) IS NOT NULL
        THEN '❌ Loss Aversion inactivo - cambio <10%'
        ELSE '❓ Sin datos del mes anterior'
    END as loss_aversion_status
FROM monthly_data;

-- Verificar el cálculo exacto que usa analytics.service.ts
SELECT '🧠 VERIFICACIÓN ANALYTICS SERVICE:' as check_type;

-- Simular la lógica de analytics.service.ts líneas 506-523
WITH monthly_insights AS (
    SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month_key,
        SUM(amount) as totalSpent
    FROM public.transactions 
    WHERE user_id = '3f44afc7-3016-4c00-9fc0-b1f20e0ad35c'
    AND transaction_date >= CURRENT_DATE - INTERVAL '60 days'
    GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
    ORDER BY month_key DESC
    LIMIT 2
),
loss_aversion_check AS (
    SELECT 
        (ARRAY_AGG(totalSpent ORDER BY month_key DESC))[1] as lastMonthSpend,
        (ARRAY_AGG(totalSpent ORDER BY month_key DESC))[2] as previousMonthSpend
    FROM monthly_insights
)
SELECT 
    'Mes actual: $' || COALESCE(lastMonthSpend, 0) as mes_actual,
    'Mes anterior: $' || COALESCE(previousMonthSpend, 0) as mes_anterior,
    CASE 
        WHEN previousMonthSpend > 0 THEN
            ROUND(((lastMonthSpend - previousMonthSpend) / previousMonthSpend) * 100, 1)
        ELSE 0 
    END as increase_percent,
    CASE 
        WHEN previousMonthSpend > 0 AND 
             ((lastMonthSpend - previousMonthSpend) / previousMonthSpend) * 100 > 10 
        THEN '✅ Loss Aversion debería aparecer (>10%)'
        WHEN previousMonthSpend > 0 
        THEN '❌ Loss Aversion no aparece (≤10%)'
        ELSE '❌ Faltan datos del mes anterior'
    END as should_trigger
FROM loss_aversion_check;

SELECT '💡 POSIBLES SOLUCIONES:' as solutions;