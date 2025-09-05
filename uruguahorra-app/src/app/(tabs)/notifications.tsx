import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
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
    setupAutomaticStreakWarnings,
    cancelAllNotifications,
    updateSettings,
  } = useStreakNotifications();

  const [isLoading, setIsLoading] = useState(false);

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

    if (!newEnabled) {
      await cancelAllNotifications();
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
    infoText: {
      fontSize: 14,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: 16,
      lineHeight: 20,
    },
    automaticAlertsInfo: {
      backgroundColor: colors.background,
      padding: 12,
      borderRadius: 8,
      marginTop: 8,
    },
    automaticAlertsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 8,
    },
    automaticAlertsItem: {
      fontSize: 13,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    automaticAlertsNote: {
      fontSize: 12,
      color: colors.text.secondary,
      marginTop: 8,
      fontStyle: 'italic',
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
              trackColor={{
                false: colors.border.primary,
                true: colors.primary + '40',
              }}
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

              <View style={styles.configSection}>
                <Text style={styles.configLabel}>
                  Alertas Automáticas de Racha
                </Text>
                <View style={styles.automaticAlertsInfo}>
                  <Text style={styles.automaticAlertsTitle}>
                    Sistema escalonado fijo:
                  </Text>
                  <Text style={styles.automaticAlertsItem}>
                    • 12 horas antes de perder la racha
                  </Text>
                  <Text style={styles.automaticAlertsItem}>
                    • 6 horas antes
                  </Text>
                  <Text style={styles.automaticAlertsItem}>
                    • 3 horas antes
                  </Text>
                  <Text style={styles.automaticAlertsItem}>
                    • 30 minutos antes
                  </Text>
                  <Text style={styles.automaticAlertsNote}>
                    Se activan automáticamente cuando tienes una racha activa
                  </Text>
                </View>
              </View>
            </Card>
          </>
        )}

        <Text style={styles.infoText}>
          {Platform.OS === 'web'
            ? 'Las notificaciones locales no están disponibles en la versión web. Usa la app móvil para recibir recordatorios automáticos.'
            : 'Las notificaciones te ayudarán a mantener tu racha de ahorro activa. Recibirás recordatorios diarios y alertas cuando tu racha esté en riesgo.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
