import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useTheme } from '@theme';

export interface NotificationSettingsProps {
  onClose?: () => void;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onClose,
}) => {
  const { colors: _colors } = useTheme();
  const {
    isInitialized,
    permissionsGranted,
    settings,
    scheduledNotifications,
    requestPermissions,
    updateSettings,
    sendTestNotification,
    cancelAllNotifications,
  } = useStreakNotifications();

  const [isLoading, setIsLoading] = useState(false);

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsLoading(true);

    if (enabled && !permissionsGranted) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Permisos necesarios',
          'Para recibir recordatorios de racha, necesitas habilitar las notificaciones en la configuración de tu dispositivo.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Ir a Configuración',
              onPress: () => {
                // En una implementación real, podrías abrir la configuración del sistema
                Alert.alert(
                  'Info',
                  'Ve a Configuración > Aplicaciones > Uruguahorra > Notificaciones'
                );
              },
            },
          ]
        );
        setIsLoading(false);
        return;
      }
    }

    await updateSettings({ enabled });
    setIsLoading(false);
  };



  const handleTestNotification = async () => {
    if (!permissionsGranted) {
      Alert.alert(
        'Permisos necesarios',
        'Necesitas habilitar las notificaciones primero.'
      );
      return;
    }

    setIsLoading(true);
    await sendTestNotification();
    setIsLoading(false);

    Alert.alert(
      '🧪 Prueba enviada',
      'Recibirás una notificación de prueba en unos segundos.'
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Cancelar notificaciones',
      '¿Estás seguro de que quieres cancelar todas las notificaciones programadas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            await cancelAllNotifications();
            setIsLoading(false);
          },
        },
      ]
    );
  };


  if (!isInitialized) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Inicializando notificaciones...
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="notifications" size={24} color="#6366F1" />
          <Text style={styles.title}>Notificaciones de Racha</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Recordatorios habilitados</Text>
              <Text style={styles.settingDescription}>
                Recibir notificaciones diarias para mantener tu racha
              </Text>
            </View>
            <Switch
              value={settings.enabled && permissionsGranted}
              onValueChange={handleToggleNotifications}
              disabled={isLoading}
              trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
            />
          </View>

          {!permissionsGranted && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.warningText}>
                Las notificaciones están deshabilitadas. Toca el interruptor
                para habilitarlas.
              </Text>
            </View>
          )}
        </View>

        {settings.enabled && permissionsGranted && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⏰ Recordatorio Diario</Text>

              <View style={styles.fixedTimeContainer}>
                <Text style={styles.fixedTimeText}>8:00 PM</Text>
                <Text style={styles.fixedTimeLabel}>Horario fijo</Text>
              </View>

              <Text style={styles.settingDescription}>
                {Platform.OS === 'web'
                  ? 'Recordatorios no disponibles en versión web'
                  : 'Recibirás un recordatorio diario automático a las 8:00 PM'
                }
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Alertas de Racha Automáticas</Text>
              
              <View style={styles.alertsInfoContainer}>
                <Text style={styles.alertsInfoTitle}>Sistema de alertas escalonadas:</Text>
                <Text style={styles.alertsInfoItem}>• 12 horas antes de perder la racha</Text>
                <Text style={styles.alertsInfoItem}>• 6 horas antes</Text>
                <Text style={styles.alertsInfoItem}>• 3 horas antes</Text>
                <Text style={styles.alertsInfoItem}>• 30 minutos antes</Text>
              </View>

              <Text style={styles.settingDescription}>
                {Platform.OS === 'web'
                  ? 'Alertas no disponibles en versión web - usa la app móvil'
                  : 'Las alertas se configuran automáticamente cuando tienes una racha activa'
                }
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📊 Estado</Text>

              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Text style={styles.statusValue}>
                    {scheduledNotifications}
                  </Text>
                  <Text style={styles.statusLabel}>
                    Notificaciones programadas
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <Button
                title="🧪 Probar notificación"
                onPress={handleTestNotification}
                variant="outline"
                style={styles.actionButton}
                disabled={isLoading}
              />

              <Button
                title="🗑️ Cancelar todas"
                onPress={handleClearAll}
                variant="outline"
                style={styles.actionButton}
                disabled={isLoading || scheduledNotifications === 0}
              />
            </View>
          </>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  card: {
    margin: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  fixedTimeContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  fixedTimeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  fixedTimeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  alertsInfoContainer: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertsInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  alertsInfoItem: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  statusContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  actions: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 0,
  },
});

export default NotificationSettings;
