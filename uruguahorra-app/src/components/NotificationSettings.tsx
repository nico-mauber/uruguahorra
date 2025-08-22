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
  const { theme } = useTheme();
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

  const handleTimeChange = async (hour: number, minute: number) => {
    setIsLoading(true);
    await updateSettings({
      reminderTime: { hour, minute },
    });
    setIsLoading(false);
  };

  const handleWarningHoursChange = async (hours: number) => {
    setIsLoading(true);
    await updateSettings({
      warningHours: hours,
    });
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

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
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

              <TouchableOpacity
                style={styles.timeSelector}
                onPress={() => {
                  // Aquí podrías abrir un picker de tiempo
                  Alert.alert(
                    'Cambiar hora',
                    'Esta funcionalidad se implementaría con un time picker nativo o modal.'
                  );
                }}
              >
                <Text style={styles.timeText}>
                  {formatTime(
                    settings.reminderTime.hour,
                    settings.reminderTime.minute
                  )}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <Text style={styles.settingDescription}>
                Te recordaremos hacer tu microaporte diario a esta hora
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>⚠️ Alerta de Racha</Text>

              <View style={styles.warningHoursContainer}>
                {[1, 2, 4, 6].map((hours) => (
                  <TouchableOpacity
                    key={hours}
                    style={[
                      styles.hourOption,
                      settings.warningHours === hours &&
                        styles.hourOptionSelected,
                    ]}
                    onPress={() => handleWarningHoursChange(hours)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.hourOptionText,
                        settings.warningHours === hours &&
                          styles.hourOptionTextSelected,
                      ]}
                    >
                      {hours}h
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.settingDescription}>
                Te avisaremos cuando tu racha esté a punto de romperse
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
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  warningHoursContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  hourOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginRight: 8,
  },
  hourOptionSelected: {
    backgroundColor: '#6366F1',
  },
  hourOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  hourOptionTextSelected: {
    color: '#FFFFFF',
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
