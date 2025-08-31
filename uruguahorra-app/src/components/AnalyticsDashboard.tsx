import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components';
import { useTheme } from '@theme';
import { useSpendingAnalytics } from '@/hooks/useSpendingAnalytics';
import { useAnalyticsPreferences } from '@/hooks/useAnalyticsPreferences';
import { SpendingAnalytics } from '@components';
import { logger, LogModule } from '@/utils/logger';
import { getInsightTypeConfig, UI_CONFIG } from '@/config/analytics.config';
import type { PsychologicalInsight } from '@/services/analytics.service';
import { useTransactionsStore } from '@/store/useTransactionsStore';

interface PsychologicalInsightCardProps {
  insight: PsychologicalInsight;
}

const PsychologicalInsightCard: React.FC<PsychologicalInsightCardProps> = ({
  insight,
}) => {
  const { colors } = useTheme();

  const getInsightVisualConfig = () => {
    // Default config to use as fallback
    const defaultConfig = {
      icon: 'information-circle-outline' as const,
      colorKey: 'primary' as const,
      priority: 5,
    };

    // Get the config using the improved function that handles case conversion
    const typeConfig = getInsightTypeConfig(insight.type);

    // Use default if no config found
    const config = typeConfig || defaultConfig;

    // Ensure colorKey exists
    if (!config.colorKey) {
      config.colorKey = 'primary';
    }

    // Map color keys to actual colors
    const colorMap: Record<string, string> = {
      error: colors.error,
      primary: colors.primary,
      info: colors.info,
      success: colors.success,
    };

    // Get the color with fallback
    const iconColor = colorMap[config.colorKey] || colors.primary;

    return {
      backgroundColor: iconColor + '15',
      borderColor: iconColor,
      icon: config.icon,
      iconColor,
    };
  };

  const config = getInsightVisualConfig();

  return (
    <Card
      style={[
        styles.insightCard,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.insightHeader}>
        <Ionicons
          // @ts-expect-error - Ionicons type issue
          name={config.icon}
          size={24}
          color={config.iconColor}
          style={styles.insightIcon}
        />
        <Text style={[styles.insightTitle, { color: colors.text.primary }]}>
          {insight.title}
        </Text>
      </View>

      <Text
        style={[styles.insightDescription, { color: colors.text.secondary }]}
      >
        {insight.description}
      </Text>

      <Text style={[styles.insightActionable, { color: colors.text.primary }]}>
        💡 {insight.actionable}
      </Text>
    </Card>
  );
};

interface QuickStatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
}

const QuickStatCard: React.FC<QuickStatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
}) => {
  const { colors } = useTheme();

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return colors.error;
      case 'down':
        return colors.success;
      default:
        return colors.text.secondary;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return 'trending-up';
      case 'down':
        return 'trending-down';
      default:
        return 'remove';
    }
  };

  return (
    <Card style={styles.quickStatCard}>
      <View style={styles.quickStatHeader}>
        <Ionicons
          // @ts-expect-error - Ionicons type issue
          name={icon}
          size={18}
          color={colors.primary}
        />
        <Text
          style={[styles.quickStatTitle, { color: colors.text.secondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>

      <Text
        style={[styles.quickStatValue, { color: colors.text.primary }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>

      {subtitle && (
        <View style={styles.quickStatFooter}>
          {trend && (
            <Ionicons
              name={getTrendIcon()}
              size={14}
              color={getTrendColor()}
              style={styles.trendIcon}
            />
          )}
          <Text
            style={[styles.quickStatSubtitle, { color: getTrendColor() }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subtitle}
          </Text>
        </View>
      )}
    </Card>
  );
};

export const AnalyticsDashboard: React.FC = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const {
    preferences,
    getAnalyticsOptions,
    defaultTab,
    showQuickStats,
    featuresEnabled,
  } = useAnalyticsPreferences();

  const [activeTab, setActiveTab] = useState<
    'insights' | 'patterns' | 'forecast'
  >(defaultTab);

  // Get analytics options, may be null while preferences load
  const analyticsOptions = React.useMemo(() => {
    return preferences ? getAnalyticsOptions() : null;
  }, [preferences, getAnalyticsOptions]);

  const {
    spendingPatterns,
    monthlyInsights,
    psychologicalInsights,
    forecast,
    isLoading,
    error,
    refreshAnalytics,
    getTopSpendingCategory,
    getOverallTrend,
    hasData,
  } = useSpendingAnalytics(analyticsOptions);

  // Update active tab when preferences change
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const { clearAnalyticsCache } = useTransactionsStore();

  const handleRefresh = async () => {
    logger.info(LogModule.UI, 'Analytics dashboard refresh triggered - forcing complete cache invalidation');
    
    // Limpiar cache del store de transacciones
    clearAnalyticsCache();
    
    // Forzar refresh completo de analytics
    await refreshAnalytics();
  };

  const handleInsightPress = (insight: PsychologicalInsight) => {
    Alert.alert(
      insight.title,
      `${insight.description}\n\n💡 Acción recomendada:\n${insight.actionable}`,
      [{ text: 'Entendido', style: 'default' }]
    );
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            Error al cargar análisis
          </Text>
          <Text
            style={[styles.errorDescription, { color: colors.text.secondary }]}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <Text style={[styles.retryButtonText, { color: colors.surface }]}>
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const topCategory = getTopSpendingCategory();
  const overallTrend = getOverallTrend();
  const latestMonth = monthlyInsights[0];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerText}>
              <Text
                style={[styles.headerTitle, { color: colors.text.primary }]}
              >
                📊 Análisis Financiero
              </Text>
              {/* Data source indicator */}
              {hasData && (
                <View style={styles.dataSourceIndicator}>
                  <Text
                    style={[
                      styles.dataSourceText,
                      {
                        color:
                          spendingPatterns.length > 0 ||
                          monthlyInsights.length > 0
                            ? colors.success || '#10B981'
                            : colors.warning || '#F59E0B',
                      },
                    ]}
                  >
                    {spendingPatterns.length > 0 || monthlyInsights.length > 0
                      ? '• Datos reales'
                      : '• Datos de demostración'}
                  </Text>
                </View>
              )}
              <Text
                style={[
                  styles.headerSubtitle,
                  { color: colors.text.secondary },
                ]}
              >
                Insights psicológicos y patrones de gasto
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.settingsButton,
                { backgroundColor: colors.surface },
              ]}
              onPress={() => router.push('/analytics-settings')}
            >
              <Ionicons
                name="settings-outline"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Stats - Optimized for mobile */}
        {hasData && showQuickStats && (
          <View style={styles.quickStatsContainer}>
            <View style={styles.quickStatsRow}>
              <QuickStatCard
                title={UI_CONFIG.QUICK_STATS.TOTAL_SPENDING.title}
                value={
                  latestMonth
                    ? `$${latestMonth.totalSpent?.toFixed(0) || '0'}`
                    : 'N/A'
                }
                subtitle={latestMonth ? 'Este mes' : undefined}
                icon={UI_CONFIG.QUICK_STATS.TOTAL_SPENDING.icon}
                trend={overallTrend}
              />
              <QuickStatCard
                title={UI_CONFIG.QUICK_STATS.TOP_CATEGORY.title}
                value={topCategory?.category || 'N/A'}
                subtitle={
                  topCategory
                    ? `$${topCategory.amount?.toFixed(0) || '0'}`
                    : undefined
                }
                icon={UI_CONFIG.QUICK_STATS.TOP_CATEGORY.icon}
              />
            </View>
            <View style={styles.quickStatsFullRow}>
              <QuickStatCard
                title={UI_CONFIG.QUICK_STATS.CURRENT_STREAK.title}
                value={
                  latestMonth ? `${latestMonth.streakDays} días` : '0 días'
                }
                subtitle="Días consecutivos"
                icon={UI_CONFIG.QUICK_STATS.CURRENT_STREAK.icon}
                trend={
                  latestMonth && latestMonth.streakDays > 7 ? 'up' : 'stable'
                }
              />
            </View>
          </View>
        )}

        {/* Tab Navigation - Using config constants */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'insights' && {
                backgroundColor: colors.primary + '15',
                borderBottomColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab('insights')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'insights'
                      ? colors.primary
                      : colors.text.secondary,
                },
              ]}
            >
              {UI_CONFIG.DASHBOARD_TABS.INSIGHTS.icon}{' '}
              {UI_CONFIG.DASHBOARD_TABS.INSIGHTS.title}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'patterns' && {
                backgroundColor: colors.primary + '15',
                borderBottomColor: colors.primary,
              },
            ]}
            onPress={() => setActiveTab('patterns')}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'patterns'
                      ? colors.primary
                      : colors.text.secondary,
                },
              ]}
            >
              {UI_CONFIG.DASHBOARD_TABS.PATTERNS.icon}{' '}
              {UI_CONFIG.DASHBOARD_TABS.PATTERNS.title}
            </Text>
          </TouchableOpacity>

          {/* Show forecast tab only if enabled in preferences */}
          {featuresEnabled?.spendingForecast && (
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'forecast' && {
                  backgroundColor: colors.primary + '15',
                  borderBottomColor: colors.primary,
                },
              ]}
              onPress={() => setActiveTab('forecast')}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      activeTab === 'forecast'
                        ? colors.primary
                        : colors.text.secondary,
                  },
                ]}
              >
                {UI_CONFIG.DASHBOARD_TABS.FORECAST.icon}{' '}
                {UI_CONFIG.DASHBOARD_TABS.FORECAST.title}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {activeTab === 'insights' && (
            <View>
              {featuresEnabled?.psychologicalInsights ? (
                psychologicalInsights.length > 0 ? (
                  psychologicalInsights.map((insight, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleInsightPress(insight)}
                      activeOpacity={0.8}
                    >
                      <PsychologicalInsightCard insight={insight} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <Card style={styles.emptyState}>
                    <Ionicons
                      name="bulb-outline"
                      size={48}
                      color={colors.text.secondary}
                    />
                    <Text
                      style={[
                        styles.emptyStateText,
                        { color: colors.text.secondary },
                      ]}
                    >
                      {isLoading
                        ? 'Generando insights...'
                        : 'Agrega más transacciones para obtener insights personalizados'}
                    </Text>
                  </Card>
                )
              ) : (
                <Card style={styles.emptyState}>
                  <Ionicons
                    name="settings-outline"
                    size={48}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Los insights psicológicos están deshabilitados en tus
                    preferencias.
                  </Text>
                </Card>
              )}
            </View>
          )}

          {activeTab === 'patterns' && (
            <View>
              {spendingPatterns.length > 0 ? (
                <SpendingAnalytics
                  insights={{
                    period_days: 30,
                    total_spent: spendingPatterns.reduce(
                      (sum, p) => sum + p.amount,
                      0
                    ),
                    avg_daily_spend:
                      spendingPatterns.reduce((sum, p) => sum + p.amount, 0) /
                      30,
                    avg_transaction_amount:
                      spendingPatterns.reduce(
                        (sum, p) => sum + p.averageAmount,
                        0
                      ) / spendingPatterns.length,
                    most_expensive_category: topCategory?.category || null,
                    most_frequent_category:
                      spendingPatterns.find(
                        (p) =>
                          p.frequency ===
                          Math.max(
                            ...spendingPatterns.map(
                              (pattern) => pattern.frequency
                            )
                          )
                      )?.category || null,
                    top_categories: spendingPatterns.slice(0, 5).map((p) => ({
                      category_id: null,
                      category_name: p.category,
                      category_color: null,
                      total_amount: p.amount,
                      transaction_count: p.frequency,
                    })),
                    psychology: {
                      avg_regret_level: 3,
                      avg_necessity_level: 3,
                      mood_impact:
                        overallTrend === 'up'
                          ? -1
                          : overallTrend === 'down'
                            ? 1
                            : 0,
                    },
                  }}
                  isLoading={isLoading}
                />
              ) : (
                <Card style={styles.emptyState}>
                  <Ionicons
                    name="analytics-outline"
                    size={48}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {isLoading
                      ? 'Analizando patrones...'
                      : 'No hay suficientes datos para mostrar patrones'}
                  </Text>
                </Card>
              )}
            </View>
          )}

          {featuresEnabled?.spendingForecast && activeTab === 'forecast' && (
            <View>
              {forecast ? (
                <Card style={styles.forecastCard}>
                  <Text
                    style={[
                      styles.forecastTitle,
                      { color: colors.text.primary },
                    ]}
                  >
                    🔮 Proyección próximos {preferences?.forecast_days || 30}{' '}
                    días
                  </Text>
                  <Text
                    style={[styles.forecastAmount, { color: colors.primary }]}
                  >
                    ${forecast?.predicted_amount?.toFixed(0) || '0'}
                  </Text>
                  <Text
                    style={[
                      styles.forecastConfidence,
                      { color: colors.text.secondary },
                    ]}
                  >
                    Confianza: {((forecast?.confidence || 0) * 100).toFixed(1)}%
                  </Text>
                  <Text
                    style={[
                      styles.forecastTrend,
                      {
                        color:
                          forecast?.trend === 'up'
                            ? colors.error
                            : forecast?.trend === 'down'
                              ? colors.success
                              : colors.text.secondary,
                      },
                    ]}
                  >
                    Tendencia:{' '}
                    {forecast?.trend === 'up'
                      ? '📈 Al alza'
                      : forecast?.trend === 'down'
                        ? '📉 A la baja'
                        : '📊 Estable'}
                  </Text>
                </Card>
              ) : (
                <Card style={styles.emptyState}>
                  <Ionicons
                    name="telescope-outline"
                    size={48}
                    color={colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.emptyStateText,
                      { color: colors.text.secondary },
                    ]}
                  >
                    {isLoading
                      ? 'Calculando proyección...'
                      : 'Necesitas más historial para generar proyecciones'}
                  </Text>
                </Card>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
  },
  quickStatsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickStatsFullRow: {
    flexDirection: 'row',
  },
  quickStatCard: {
    flex: 1,
    padding: 12,
    minHeight: 85,
    justifyContent: 'center',
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickStatTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
    opacity: 0.8,
    flexShrink: 1,
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    lineHeight: 20,
  },
  quickStatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  trendIcon: {
    marginRight: 3,
  },
  quickStatSubtitle: {
    fontSize: 10,
    fontWeight: '500',
    flexShrink: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  insightCard: {
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIcon: {
    marginRight: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  insightActionable: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  forecastCard: {
    padding: 20,
    alignItems: 'center',
  },
  forecastTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  forecastAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  forecastConfidence: {
    fontSize: 14,
    marginBottom: 4,
  },
  forecastTrend: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Data source indicator styles
  dataSourceIndicator: {
    marginTop: 2,
    marginBottom: 4,
  },
  dataSourceText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  // Behavioral analytics styles
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});
