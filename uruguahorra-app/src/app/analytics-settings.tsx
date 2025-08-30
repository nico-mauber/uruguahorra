import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useAnalyticsPreferences } from '@/hooks/useAnalyticsPreferences';
import { useAuth } from '@/contexts/SimpleAuthContext';
import {
  SettingSection,
  NumberInput,
  FeatureToggle,
  PreferencePicker,
} from '@components';
import { DATA_VALIDATION } from '@/config/analytics.config';
import { useToast } from '@/hooks/useToast';
import { ToastNotification } from '@/components/settings/ToastNotification';

export default function AnalyticsSettingsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError, toast, hideToast } = useToast();

  const {
    preferences,
    isLoading,
    error,
    updateTimePreferences,
    updateUIPreferences,
    updateFeaturePreferences,
    updateLocalizationPreferences,
    resetPreferences,
  } = useAnalyticsPreferences();

  // Local state for immediate UI updates
  const [localPreferences, setLocalPreferences] = useState({
    spendingPatternsDays: preferences?.spending_patterns_days ?? 30,
    monthlyInsightsMonths: preferences?.monthly_insights_months ?? 6,
    forecastDays: preferences?.forecast_days ?? 30,
    defaultTab: preferences?.default_tab ?? 'insights',
    maxInsightsPerType: preferences?.max_insights_per_type ?? 2,
    enablePsychologicalInsights:
      preferences?.enable_psychological_insights ?? true,
    enableSpendingForecast: preferences?.enable_spending_forecast ?? true,
    enablePushNotifications: preferences?.enable_push_notifications ?? false,
    preferredLanguage: preferences?.preferred_language ?? 'es',
    currency: preferences?.currency ?? 'UYU',
    dateFormat: preferences?.date_format ?? 'DD/MM/YYYY',
  });

  // Update local state when preferences load
  useEffect(() => {
    if (preferences) {
      setLocalPreferences({
        spendingPatternsDays: preferences.spending_patterns_days,
        monthlyInsightsMonths: preferences.monthly_insights_months,
        forecastDays: preferences.forecast_days,
        defaultTab: preferences.default_tab,
        maxInsightsPerType: preferences.max_insights_per_type,
        enablePsychologicalInsights: preferences.enable_psychological_insights,
        enableSpendingForecast: preferences.enable_spending_forecast,
        enablePushNotifications: preferences.enable_push_notifications,
        preferredLanguage: preferences.preferred_language,
        currency: preferences.currency,
        dateFormat: preferences.date_format,
      });
    }
  }, [preferences]);

  // Auto-save time preferences
  const handleTimePreferenceChange = async (field: string, value: number) => {
    setLocalPreferences((prev) => ({ ...prev, [field]: value }));

    // Auto-save immediately
    const updates: any = {};
    if (field === 'spendingPatternsDays') updates.spendingPatternsDays = value;
    if (field === 'monthlyInsightsMonths')
      updates.monthlyInsightsMonths = value;
    if (field === 'forecastDays') updates.forecastDays = value;

    const success = await updateTimePreferences(updates);
    if (!success) {
      showError('Error al guardar la configuración');
    }
  };

  // Auto-save UI preferences
  const handleUIPreferenceChange = async (
    field: string,
    value: string | boolean | number
  ) => {
    setLocalPreferences((prev) => ({ ...prev, [field]: value }));

    // Auto-save immediately
    const updates: any = {};
    if (field === 'defaultTab') updates.defaultTab = value;
    if (field === 'maxInsightsPerType') updates.maxInsightsPerType = value;

    const success = await updateUIPreferences(updates);
    if (!success) {
      showError('Error al guardar la configuración');
    }
  };

  // Auto-save feature toggles
  const handleFeatureToggle = async (field: string, value: boolean) => {
    setLocalPreferences((prev) => ({ ...prev, [field]: value }));

    // Auto-save immediately
    const updates: any = {};
    if (field === 'enablePsychologicalInsights')
      updates.enablePsychologicalInsights = value;
    if (field === 'enableSpendingForecast')
      updates.enableSpendingForecast = value;
    if (field === 'enablePushNotifications')
      updates.enablePushNotifications = value;

    const success = await updateFeaturePreferences(updates);
    if (!success) {
      showError('Error al guardar la configuración');
    }
  };

  // Auto-save localization preferences
  const handleLocalizationChange = async (field: string, value: string) => {
    setLocalPreferences((prev) => ({ ...prev, [field]: value }));

    // Auto-save immediately
    const updates: any = {};
    if (field === 'preferredLanguage') {
      updates.preferredLanguage = value;
      // TODO: Trigger language change in the app
    }
    if (field === 'currency') updates.currency = value;
    if (field === 'dateFormat') updates.dateFormat = value;

    const success = await updateLocalizationPreferences(updates);
    if (!success) {
      showError('Error al guardar la configuración');
    } else {
      showSuccess('Configuración actualizada');
    }
  };

  const handleReset = () => {
    Alert.alert(
      '🔄 Resetear Configuración',
      '¿Estás seguro de que quieres restaurar todas las preferencias a sus valores por defecto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Resetear',
          style: 'destructive',
          onPress: async () => {
            const success = await resetPreferences();
            if (success) {
              showSuccess('Configuración restaurada a valores por defecto');
            } else {
              showError('Error al resetear la configuración');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
          Cargando configuración...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Ionicons name="warning-outline" size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          Error al cargar configuración
        </Text>
        <Text
          style={[styles.errorDescription, { color: colors.text.secondary }]}
        >
          {error}
        </Text>
      </View>
    );
  }

  const tabOptions = [
    {
      value: 'insights',
      label: '🧠 Insights',
      description: 'Análisis psicológicos',
    },
    {
      value: 'patterns',
      label: '📈 Patrones',
      description: 'Tendencias de gasto',
    },
    {
      value: 'forecast',
      label: '🔮 Proyección',
      description: 'Pronósticos futuros',
    },
  ];

  const languageOptions = [
    { value: 'es', label: '🇺🇾 Español', description: 'Idioma español' },
    { value: 'en', label: '🇺🇸 English', description: 'English language' },
  ];

  const currencyOptions = [
    { value: 'UYU', label: '$ UYU', description: 'Peso Uruguayo' },
    { value: 'USD', label: '$ USD', description: 'Dólar Estadounidense' },
    { value: 'EUR', label: '€ EUR', description: 'Euro' },
  ];

  const dateFormatOptions = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', description: '27/08/2025' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', description: '08/27/2025' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', description: '2025-08-27' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Configuración de Analytics
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Períodos de Análisis */}
        <SettingSection
          title="Períodos de Análisis"
          subtitle="Configura los rangos de tiempo para tus análisis"
          icon="📊"
        >
          <NumberInput
            label="Días para patrones de gasto"
            value={localPreferences.spendingPatternsDays}
            onChangeValue={(value) =>
              handleTimePreferenceChange('spendingPatternsDays', value)
            }
            min={7}
            max={DATA_VALIDATION.MAX_PATTERN_DAYS}
            suffix="días"
            step={1}
          />

          <NumberInput
            label="Meses para insights mensuales"
            value={localPreferences.monthlyInsightsMonths}
            onChangeValue={(value) =>
              handleTimePreferenceChange('monthlyInsightsMonths', value)
            }
            min={1}
            max={DATA_VALIDATION.MAX_INSIGHT_MONTHS}
            suffix="meses"
            step={1}
          />

          <NumberInput
            label="Días para pronósticos"
            value={localPreferences.forecastDays}
            onChangeValue={(value) =>
              handleTimePreferenceChange('forecastDays', value)
            }
            min={7}
            max={DATA_VALIDATION.MAX_FORECAST_DAYS}
            suffix="días"
            step={1}
          />
        </SettingSection>

        {/* Características */}
        <SettingSection
          title="Características"
          subtitle="Habilita o deshabilita funciones específicas"
          icon="🧠"
        >
          <FeatureToggle
            label="Insights Psicológicos"
            description="Análisis de comportamiento financiero"
            value={localPreferences.enablePsychologicalInsights}
            onValueChange={(value) =>
              handleFeatureToggle('enablePsychologicalInsights', value)
            }
            icon="brain-outline"
          />

          <FeatureToggle
            label="Pronósticos de Gasto"
            description="Proyecciones futuras basadas en patrones"
            value={localPreferences.enableSpendingForecast}
            onValueChange={(value) =>
              handleFeatureToggle('enableSpendingForecast', value)
            }
            icon="trending-up-outline"
          />

          <FeatureToggle
            label="Notificaciones Push"
            description="Recordatorios y alertas de gastos"
            value={localPreferences.enablePushNotifications}
            onValueChange={(value) =>
              handleFeatureToggle('enablePushNotifications', value)
            }
            icon="notifications-outline"
          />
        </SettingSection>

        {/* Interfaz - Simplificada */}
        <SettingSection
          title="Interfaz"
          subtitle="Personaliza la experiencia visual"
          icon="🎛️"
        >
          <PreferencePicker
            label="Tab por defecto"
            value={localPreferences.defaultTab}
            options={tabOptions}
            onValueChange={(value) =>
              handleUIPreferenceChange('defaultTab', value)
            }
            icon="tabs-outline"
          />

          <NumberInput
            label="Máximo insights por tipo"
            value={localPreferences.maxInsightsPerType}
            onChangeValue={(value) =>
              handleUIPreferenceChange('maxInsightsPerType', value)
            }
            min={1}
            max={5}
            suffix="insights"
            step={1}
          />
        </SettingSection>

        {/* Localización */}
        <SettingSection
          title="Localización"
          subtitle="Idioma, moneda y formato de fecha"
          icon="🌍"
        >
          <PreferencePicker
            label="Idioma"
            value={localPreferences.preferredLanguage}
            options={languageOptions}
            onValueChange={(value) =>
              handleLocalizationChange('preferredLanguage', value)
            }
            icon="language-outline"
          />

          <PreferencePicker
            label="Moneda"
            value={localPreferences.currency}
            options={currencyOptions}
            onValueChange={(value) =>
              handleLocalizationChange('currency', value)
            }
            icon="cash-outline"
          />

          <PreferencePicker
            label="Formato de fecha"
            value={localPreferences.dateFormat}
            options={dateFormatOptions}
            onValueChange={(value) =>
              handleLocalizationChange('dateFormat', value)
            }
            icon="calendar-outline"
          />
        </SettingSection>
      </ScrollView>

      {/* Reset Button Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.resetButton,
            { backgroundColor: colors.error + '15', borderColor: colors.error },
          ]}
          onPress={handleReset}
        >
          <Ionicons name="refresh-outline" size={20} color={colors.error} />
          <Text style={[styles.resetButtonText, { color: colors.error }]}>
            Resetear Configuración
          </Text>
        </TouchableOpacity>
      </View>

      {/* Toast Notification */}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        duration={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorDescription: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 48, // Account for status bar
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 100, // Account for footer
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32, // Account for home indicator
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  resetButton: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
