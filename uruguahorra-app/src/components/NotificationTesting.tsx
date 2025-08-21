import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';
import { Card } from '@/components/Card';

export interface NotificationTestingProps {
  onClose?: () => void;
}

export const NotificationTesting: React.FC<NotificationTestingProps> = ({
  onClose,
}) => {
  const {
    isInitialized,
    permissionsGranted,
    scheduledNotifications,
    sendTestNotification,
    sendTestStreakReminder,
    sendTestStreakWarning,
    startDevReminder,
    stopDevReminder,
    scheduleQuickTest,
    cancelAllNotifications,
  } = useStreakNotifications();

  const [testDelay, setTestDelay] = useState('5');
  const [reminderDelay, setReminderDelay] = useState('10');
  const [warningDelay, setWarningDelay] = useState('15');
  const [devInterval, setDevInterval] = useState('1');
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>, actionName: string) => {
    if (!permissionsGranted) {
      Alert.alert(
        'Permisos necesarios',
        'Necesitas habilitar las notificaciones primero.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await action();
      Alert.alert('✅ Éxito', `${actionName} ejecutado correctamente`);
    } catch (error) {
      Alert.alert('❌ Error', `Error al ejecutar ${actionName}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const testButtons = [
    {
      id: 'quick-test',
      title: '🚀 Prueba Rápida',
      subtitle: 'Serie de 3 notificaciones (5s, 15s, 25s)',
      action: () => handleAction(scheduleQuickTest, 'Prueba rápida'),
    },
    {
      id: 'test-basic',
      title: '🧪 Notificación Básica',
      subtitle: `En ${testDelay} segundos`,
      action: () => handleAction(sendTestNotification, 'Notificación de prueba'),
      input: {
        value: testDelay,
        onChange: setTestDelay,
        placeholder: 'Segundos',
      },
    },
    {
      id: 'test-reminder',
      title: '🔥 Recordatorio de Racha',
      subtitle: `En ${reminderDelay} segundos`,
      action: () => handleAction(
        () => sendTestStreakReminder(parseInt(reminderDelay)),
        'Recordatorio de racha'
      ),
      input: {
        value: reminderDelay,
        onChange: setReminderDelay,
        placeholder: 'Segundos',
      },
    },
    {
      id: 'test-warning',
      title: '⚠️ Alerta de Racha',
      subtitle: `En ${warningDelay} segundos`,
      action: () => handleAction(
        () => sendTestStreakWarning(parseInt(warningDelay)),
        'Alerta de racha'
      ),
      input: {
        value: warningDelay,
        onChange: setWarningDelay,
        placeholder: 'Segundos',
      },
    },
    {
      id: 'dev-reminder',
      title: '🔄 Recordatorio de Desarrollo',
      subtitle: `Cada ${devInterval} minuto(s) - ¡CUIDADO: Se repite!`,
      action: () => handleAction(
        () => startDevReminder(parseInt(devInterval)),
        'Recordatorio de desarrollo'
      ),
      input: {
        value: devInterval,
        onChange: setDevInterval,
        placeholder: 'Minutos',
      },
      warning: true,
    },
    {
      id: 'stop-dev',
      title: '🛑 Detener Desarrollo',
      subtitle: 'Cancela recordatorios repetitivos',
      action: () => handleAction(stopDevReminder, 'Detener recordatorios'),
      destructive: true,
    },
    {
      id: 'cancel-all',
      title: '🗑️ Cancelar Todas',
      subtitle: 'Cancela todas las notificaciones programadas',
      action: () => {
        Alert.alert(
          'Cancelar todas las notificaciones',
          '¿Estás seguro? Esto cancelará TODAS las notificaciones programadas.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Sí, cancelar todas',
              style: 'destructive',
              onPress: () => handleAction(cancelAllNotifications, 'Cancelar todas'),
            },
          ]
        );
      },
      destructive: true,
    },
  ];

  if (!isInitialized) {
    return (
      <Card style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Inicializando notificaciones...</Text>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Ionicons name="flask" size={24} color="#F59E0B" />
          <Text style={styles.title}>Testing de Notificaciones</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {!permissionsGranted && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={20} color="#F59E0B" />
            <Text style={styles.warningText}>
              Las notificaciones están deshabilitadas. Habilítalas primero en la configuración.
            </Text>
          </View>
        )}

        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>📊 Estado Actual</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {permissionsGranted ? '✅' : '❌'}
              </Text>
              <Text style={styles.statusLabel}>Permisos</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>{scheduledNotifications}</Text>
              <Text style={styles.statusLabel}>Programadas</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusValue}>
                {isInitialized ? '✅' : '⏳'}
              </Text>
              <Text style={styles.statusLabel}>Sistema</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Pruebas Disponibles</Text>
          <Text style={styles.sectionDescription}>
            Estas funciones están disponibles solo en desarrollo para probar el sistema de notificaciones.
          </Text>

          {testButtons.map((button) => (
            <View key={button.id} style={styles.testButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.testButton,
                  button.warning && styles.testButtonWarning,
                  button.destructive && styles.testButtonDestructive,
                ]}
                onPress={button.action}
                disabled={isLoading || (!permissionsGranted && button.id !== 'cancel-all')}
              >
                <View style={styles.testButtonContent}>
                  <Text style={[
                    styles.testButtonTitle,
                    button.warning && styles.testButtonTitleWarning,
                    button.destructive && styles.testButtonTitleDestructive,
                  ]}>
                    {button.title}
                  </Text>
                  <Text style={[
                    styles.testButtonSubtitle,
                    button.warning && styles.testButtonSubtitleWarning,
                    button.destructive && styles.testButtonSubtitleDestructive,
                  ]}>
                    {button.subtitle}
                  </Text>
                </View>
                
                {button.input && (
                  <TextInput
                    style={styles.testInput}
                    value={button.input.value}
                    onChangeText={button.input.onChange}
                    placeholder={button.input.placeholder}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>💡 Consejos de Prueba</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • La "Prueba Rápida" programa 3 notificaciones en secuencia
            </Text>
            <Text style={styles.infoItem}>
              • Los recordatorios de desarrollo se repiten automáticamente
            </Text>
            <Text style={styles.infoItem}>
              • Siempre detén los recordatorios de desarrollo cuando termines
            </Text>
            <Text style={styles.infoItem}>
              • Las notificaciones aparecen incluso si la app está cerrada
            </Text>
          </View>
        </View>
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
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    marginLeft: 8,
    flex: 1,
  },
  statusSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  testButtonContainer: {
    marginBottom: 12,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  testButtonWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  testButtonDestructive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  testButtonContent: {
    flex: 1,
  },
  testButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  testButtonTitleWarning: {
    color: '#92400E',
  },
  testButtonTitleDestructive: {
    color: '#DC2626',
  },
  testButtonSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  testButtonSubtitleWarning: {
    color: '#A16207',
  },
  testButtonSubtitleDestructive: {
    color: '#B91C1C',
  },
  testInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  infoSection: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoList: {
    gap: 6,
  },
  infoItem: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});

export default NotificationTesting;
