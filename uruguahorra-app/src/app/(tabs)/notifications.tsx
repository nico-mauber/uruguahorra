import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';
import { Card, Button } from '@components';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const {
    isInitialized,
    permissionsGranted,
    settings,
    scheduledNotifications,
    initialize,
    requestPermissions,
    setupDailyReminder,
    setupStreakWarning,
    cancelAllNotifications,
    updateSettings,
    sendTestNotification,
    sendTestStreakReminder,
    sendTestStreakWarning,
    scheduleQuickTest,
  } = useStreakNotifications();

  const [isLoading, setIsLoading] = useState(false);
  const [showTimeOptions, setShowTimeOptions] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleToggleNotifications = async () => {
    if (!permissionsGranted) {
      setIsLoading(true);
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permisos Requeridos',
          'Para recibir notificaciones de racha, necesitas conceder permisos en la configuración de tu dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Configuración',
              onPress: () => {
                // En una app real, abrirías la configuración del dispositivo
                Alert.alert(
                  'Información',
                  'Ve a Configuración > Notificaciones > UruguAhorra'
                );
              },
            },
          ]
        );
      }
      setIsLoading(false);
      return;
    }

    const newEnabled = !settings.enabled;
    await updateSettings({ enabled: newEnabled });

    if (newEnabled) {
      // Configurar notificaciones con la configuración actual
      await setupDailyReminder(
        settings.reminderTime.hour,
        settings.reminderTime.minute
      );
      await setupStreakWarning(settings.warningHours);
    } else {
      await cancelAllNotifications();
    }
  };

  const handleReminderTimeChange = async (hour: number, minute: number) => {
    await updateSettings({
      reminderTime: { hour, minute },
    });

    if (settings.enabled) {
      await setupDailyReminder(hour, minute);
    }
    setShowTimeOptions(false);
  };

  const handleWarningHoursChange = async (hours: number) => {
    await updateSettings({
      warningHours: hours,
    });

    if (settings.enabled) {
      await setupStreakWarning(hours);
    }
  };

  const getStatusColor = () => {
    if (!isInitialized) return '#FFA500'; // orange
    if (!permissionsGranted) return '#EF4444'; // red
    if (!settings.enabled) return '#6B7280'; // gray
    return '#10B981'; // green
  };

  const getStatusText = () => {
    if (!isInitialized) return 'Inicializando...';
    if (!permissionsGranted) return 'Sin permisos';
    if (!settings.enabled) return 'Desactivadas';
    return 'Activas';
  };

  const timeOptions = [
    { hour: 8, minute: 0, label: '8:00 AM' },
    { hour: 12, minute: 0, label: '12:00 PM' },
    { hour: 18, minute: 0, label: '6:00 PM' },
    { hour: 20, minute: 0, label: '8:00 PM' },
  ];

  const warningOptions = [
    { hours: 2, label: '2 horas antes' },
    { hours: 4, label: '4 horas antes' },
    { hours: 6, label: '6 horas antes' },
    { hours: 12, label: '12 horas antes' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.primary,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text.primary,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    statusCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    statusHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    statusIcon: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
    },
    statusTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      flex: 1,
    },
    statusSubtitle: {
      fontSize: 14,
      color: colors.text.secondary,
      marginBottom: 8,
    },
    toggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 8,
    },
    toggleLabel: {
      fontSize: 16,
      color: colors.text.primary,
    },
    configSection: {
      marginTop: 16,
    },
    configTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    configItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.primary,
    },
    configLabel: {
      fontSize: 16,
      color: colors.text.primary,
    },
    configValue: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    timeOptionsContainer: {
      marginTop: 12,
    },
    timeOption: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.border.primary,
    },
    timeOptionSelected: {
      backgroundColor: colors.primary + '20',
      borderColor: colors.primary,
    },
    timeOptionText: {
      fontSize: 16,
      color: colors.text.primary,
      textAlign: 'center',
    },
    testSection: {
      marginTop: 24,
    },
    testTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 12,
    },
    testButtons: {
      gap: 12,
    },
    testButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    testButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    actionButton: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con botón de regreso */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notificaciones</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Estado de las notificaciones */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View
              style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}
            />
            <Text style={styles.statusTitle}>Estado de Notificaciones</Text>
          </View>

          <Text style={styles.statusSubtitle}>{getStatusText()}</Text>

          {scheduledNotifications > 0 && (
            <Text style={styles.statusSubtitle}>
              {scheduledNotifications} notificación
              {scheduledNotifications > 1 ? 'es' : ''} programada
              {scheduledNotifications > 1 ? 's' : ''}
            </Text>
          )}

          <View style={styles.toggleContainer}>
            <Text style={styles.toggleLabel}>
              {permissionsGranted
                ? 'Activar Notificaciones'
                : 'Solicitar Permisos'}
            </Text>
            <Switch
              value={permissionsGranted && settings.enabled}
              onValueChange={handleToggleNotifications}
              disabled={isLoading}
              trackColor={{ false: colors.border.primary, true: colors.primary + '40' }}
              thumbColor={
                permissionsGranted && settings.enabled
                  ? colors.primary
                  : '#f4f3f4'
              }
            />
          </View>
        </Card>

        {/* Configuración (solo si los permisos están concedidos) */}
        {permissionsGranted && (
          <>
            <Card style={styles.statusCard}>
              <Text style={styles.configTitle}>Configuración</Text>

              <TouchableOpacity
                style={styles.configItem}
                onPress={() => setShowTimeOptions(!showTimeOptions)}
                disabled={!settings.enabled}
              >
                <Text
                  style={[
                    styles.configLabel,
                    !settings.enabled && { color: colors.text.secondary },
                  ]}
                >
                  Horario de Recordatorio
                </Text>
                <Text
                  style={[
                    styles.configValue,
                    !settings.enabled && { color: colors.text.secondary },
                  ]}
                >
                  {String(settings.reminderTime.hour).padStart(2, '0')}:
                  {String(settings.reminderTime.minute).padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              {showTimeOptions && settings.enabled && (
                <View style={styles.timeOptionsContainer}>
                  {timeOptions.map((option) => (
                    <TouchableOpacity
                      key={`${option.hour}-${option.minute}`}
                      style={[
                        styles.timeOption,
                        settings.reminderTime.hour === option.hour &&
                          settings.reminderTime.minute === option.minute &&
                          styles.timeOptionSelected,
                      ]}
                      onPress={() =>
                        handleReminderTimeChange(option.hour, option.minute)
                      }
                    >
                      <Text style={styles.timeOptionText}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  Alerta de Racha en Riesgo
                </Text>
                <View style={styles.timeOptionsContainer}>
                  {warningOptions.map((option) => (
                    <TouchableOpacity
                      key={option.hours}
                      style={[
                        styles.timeOption,
                        settings.warningHours === option.hours &&
                          styles.timeOptionSelected,
                      ]}
                      onPress={() => handleWarningHoursChange(option.hours)}
                      disabled={!settings.enabled}
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          !settings.enabled && { color: colors.text.secondary },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </Card>

            {/* Sección de pruebas (solo en desarrollo) */}
            {__DEV__ && settings.enabled && (
              <Card style={styles.statusCard}>
                <Text style={styles.testTitle}>Pruebas (Desarrollo)</Text>

                <View style={styles.testButtons}>
                  <Button
                    title="Enviar Notificación de Prueba"
                    onPress={sendTestNotification}
                    style={styles.actionButton}
                    disabled={isLoading}
                  />

                  <Button
                    title="Prueba Recordatorio de Racha (5s)"
                    onPress={() => sendTestStreakReminder(5)}
                    style={styles.actionButton}
                    disabled={isLoading}
                  />

                  <Button
                    title="Prueba Alerta de Riesgo (5s)"
                    onPress={() => sendTestStreakWarning(5)}
                    style={styles.actionButton}
                    disabled={isLoading}
                  />

                  <Button
                    title="Prueba Rápida Múltiple"
                    onPress={scheduleQuickTest}
                    style={styles.actionButton}
                    disabled={isLoading}
                  />
                </View>
              </Card>
            )}
          </>
        )}

        <Text style={styles.infoText}>
          Las notificaciones te ayudarán a mantener tu racha de ahorro activa.
          {'\n\n'}
          Recibirás recordatorios diarios y alertas cuando tu racha esté en
          riesgo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
