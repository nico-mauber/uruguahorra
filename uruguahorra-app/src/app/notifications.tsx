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
import { Card, Button } from '@components';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    isInitialized,
    permissionsGranted,
    settings,
    scheduledNotifications,
    initialize,
    requestPermissions,
    updateSettings,
    sendTestNotification,
    cancelAllNotifications,
  } = useStreakNotifications();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  const handleToggleNotifications = async (enabled: boolean) => {
    setIsLoading(true);

    if (enabled && !permissionsGranted) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(
          '🔔 Permisos necesarios',
          'Para recibir recordatorios de ahorro, necesitas habilitar las notificaciones. Ve a la configuración de tu dispositivo y activa las notificaciones para Uruguahorra.',
          [{ text: 'Entendido', style: 'default' }]
        );
        setIsLoading(false);
        return;
      }
    }

    await updateSettings({ enabled });
    setIsLoading(false);
  };

  const handleTimeChange = (hour: number, minute: number) => {
    Alert.alert(
      '⏰ Cambiar hora',
      `¿Quieres recibir el recordatorio a las ${hour
        .toString()
        .padStart(2, '0')}:${minute.toString().padStart(2, '0')}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setIsLoading(true);
            await updateSettings({
              reminderTime: { hour, minute },
            });
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const showTimeOptions = () => {
    const timeOptions = [
      { hour: 8, minute: 0, label: '08:00 - Mañana' },
      { hour: 12, minute: 0, label: '12:00 - Mediodía' },
      { hour: 18, minute: 0, label: '18:00 - Tarde' },
      { hour: 20, minute: 0, label: '20:00 - Noche' },
      { hour: 21, minute: 0, label: '21:00 - Noche' },
    ];

    Alert.alert(
      '⏰ Elige tu hora favorita',
      'Selecciona cuándo quieres recibir el recordatorio diario:',
      [
        ...timeOptions.map((option) => ({
          text: option.label,
          onPress: () => handleTimeChange(option.hour, option.minute),
        })),
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleWarningHoursChange = async (hours: number) => {
    setIsLoading(true);
    await updateSettings({ warningHours: hours });
    setIsLoading(false);
  };

  const handleTestNotification = async () => {
    if (!permissionsGranted) {
      Alert.alert(
        '⚠️ Sin permisos',
        'Necesitas habilitar las notificaciones primero para poder enviar una prueba.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await sendTestNotification();
      Alert.alert(
        '🧪 ¡Prueba enviada!',
        'Deberías recibir una notificación de prueba en unos segundos.',
        [{ text: 'Perfecto', style: 'default' }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        'No se pudo enviar la notificación de prueba. Intenta nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      '🗑️ Cancelar notificaciones',
      '¿Estás seguro de que quieres cancelar todas las notificaciones programadas? Podrás activarlas nuevamente cuando quieras.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, cancelar todas',
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
    return `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;
  };

  const getTimeDisplayString = () => {
    const { hour, minute } = settings.reminderTime;
    return formatTime(hour, minute);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
      marginRight: 12,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    notInitializedCard: {
      alignItems: 'center',
      padding: 32,
    },
    notInitializedText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 16,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    sectionIcon: {
      marginRight: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    settingCard: {
      marginBottom: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    settingInfo: {
      flex: 1,
      marginRight: 16,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    warningContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F59E0B' + '20',
      padding: 16,
      borderRadius: 12,
      marginTop: 12,
    },
    warningText: {
      fontSize: 14,
      color: '#F59E0B',
      marginLeft: 12,
      flex: 1,
      lineHeight: 20,
    },
    timeSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    timeText: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.primary,
    },
    warningHoursContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
      gap: 8,
    },
    hourOption: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      minWidth: 50,
      alignItems: 'center',
    },
    hourOptionSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    hourOptionText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    hourOptionTextSelected: {
      color: '#FFFFFF',
    },
    statusContainer: {
      backgroundColor: theme.surface,
      padding: 20,
      borderRadius: 12,
      alignItems: 'center',
    },
    statusValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.primary,
      marginBottom: 4,
    },
    statusLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    actions: {
      gap: 12,
    },
    actionButton: {
      marginBottom: 0,
    },
    permissionSection: {
      marginBottom: 32,
    },
    permissionStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
    },
    permissionStatusGranted: {
      backgroundColor: '#10B981' + '20',
    },
    permissionStatusDenied: {
      backgroundColor: '#EF4444' + '20',
    },
    permissionStatusText: {
      flex: 1,
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '500',
    },
    permissionStatusGrantedText: {
      color: '#10B981',
    },
    permissionStatusDeniedText: {
      color: '#EF4444',
    },
  });

  if (!isInitialized) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Notificaciones</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.notInitializedCard}>
            <Ionicons
              name="notifications-outline"
              size={48}
              color={theme.textSecondary}
            />
            <Text style={styles.notInitializedText}>
              Iniciando sistema de notificaciones...
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Notificaciones</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Estado de permisos */}
        <View style={styles.permissionSection}>
          <View
            style={[
              styles.permissionStatus,
              permissionsGranted
                ? styles.permissionStatusGranted
                : styles.permissionStatusDenied,
            ]}
          >
            <Ionicons
              name={permissionsGranted ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={permissionsGranted ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.permissionStatusText,
                permissionsGranted
                  ? styles.permissionStatusGrantedText
                  : styles.permissionStatusDeniedText,
              ]}
            >
              {permissionsGranted
                ? 'Notificaciones habilitadas'
                : 'Notificaciones deshabilitadas'}
            </Text>
          </View>
        </View>

        {/* Control principal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="notifications"
              size={24}
              color={theme.primary}
              style={styles.sectionIcon}
            />
            <Text style={styles.sectionTitle}>Recordatorios de Racha</Text>
          </View>

          <Card style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Activar recordatorios</Text>
                <Text style={styles.settingDescription}>
                  Recibe notificaciones diarias para mantener tu racha de ahorro
                  activa
                </Text>
              </View>
              <Switch
                value={settings.enabled && permissionsGranted}
                onValueChange={handleToggleNotifications}
                disabled={isLoading}
                trackColor={{
                  false: theme.border,
                  true: theme.primary + '80',
                }}
                thumbColor={
                  settings.enabled && permissionsGranted
                    ? theme.primary
                    : '#f4f3f4'
                }
                ios_backgroundColor={theme.border}
              />
            </View>

            {!permissionsGranted && (
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Para recibir recordatorios, necesitas habilitar las
                  notificaciones en la configuración de tu dispositivo.
                </Text>
              </View>
            )}
          </Card>
        </View>

        {/* Configuración avanzada (solo si está habilitado) */}
        {settings.enabled && permissionsGranted && (
          <>
            {/* Hora del recordatorio */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="time"
                  size={24}
                  color={theme.primary}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Hora del recordatorio</Text>
              </View>

              <Card style={styles.settingCard}>
                <TouchableOpacity
                  style={styles.timeSelector}
                  onPress={showTimeOptions}
                  disabled={isLoading}
                >
                  <Text style={styles.timeText}>{getTimeDisplayString()}</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>

                <Text style={styles.settingDescription}>
                  Te recordaremos hacer tu microaporte diario a esta hora
                </Text>
              </Card>
            </View>

            {/* Alerta de racha en peligro */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="warning"
                  size={24}
                  color="#F59E0B"
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>
                  Alerta de racha en peligro
                </Text>
              </View>

              <Card style={styles.settingCard}>
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
              </Card>
            </View>

            {/* Estado actual */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="bar-chart"
                  size={24}
                  color={theme.primary}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Estado actual</Text>
              </View>

              <Card style={styles.settingCard}>
                <View style={styles.statusContainer}>
                  <Text style={styles.statusValue}>
                    {scheduledNotifications}
                  </Text>
                  <Text style={styles.statusLabel}>
                    Notificaciones programadas
                  </Text>
                </View>
              </Card>
            </View>

            {/* Acciones */}
            <View style={styles.section}>
              <View style={styles.actions}>
                <Button
                  title="🧪 Enviar prueba"
                  onPress={handleTestNotification}
                  variant="outline"
                  style={styles.actionButton}
                  disabled={isLoading}
                />

                {scheduledNotifications > 0 && (
                  <Button
                    title="🗑️ Cancelar todas"
                    onPress={handleClearAll}
                    variant="outline"
                    style={styles.actionButton}
                    disabled={isLoading}
                  />
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
