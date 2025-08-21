import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';
import { NotificationSettings, NotificationTesting } from '@/components';
import { Button, Card } from '@/components';

/**
 * Ejemplo de pantalla de configuración que integra las notificaciones
 * Esta sería una pantalla real en tu app donde los usuarios pueden configurar sus notificaciones
 */
export default function SettingsScreen() {
  const [activeView, setActiveView] = useState<'settings' | 'testing' | null>(null);
  
  const {
    isInitialized,
    permissionsGranted,
    settings,
    scheduledNotifications,
    sendTestNotification,
    scheduleQuickTest,
    initialize,
  } = useStreakNotifications();

  const handleQuickTest = async () => {
    if (!permissionsGranted) {
      Alert.alert(
        'Permisos necesarios',
        'Para probar las notificaciones, primero debes habilitar los permisos.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configurar', onPress: () => setActiveView('settings') },
        ]
      );
      return;
    }

    try {
      await scheduleQuickTest();
      Alert.alert(
        '🚀 Prueba programada',
        'Recibirás 3 notificaciones de prueba en los próximos 25 segundos (5s, 15s, 25s).',
        [{ text: 'Entendido' }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo programar la prueba');
    }
  };

  const handleSimpleTest = async () => {
    if (!permissionsGranted) {
      Alert.alert('Error', 'Los permisos de notificación no están habilitados');
      return;
    }

    try {
      await sendTestNotification();
      Alert.alert(
        '🧪 Prueba enviada',
        'Recibirás una notificación de prueba en 5 segundos.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar la notificación de prueba');
    }
  };

  if (activeView === 'settings') {
    return (
      <NotificationSettings onClose={() => setActiveView(null)} />
    );
  }

  if (activeView === 'testing') {
    return (
      <NotificationTesting onClose={() => setActiveView(null)} />
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Configuración</Text>
        <Text style={styles.subtitle}>Gestiona tus preferencias y notificaciones</Text>
      </View>

      {/* Sección de Notificaciones */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Notificaciones de Racha</Text>
        
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Estado del sistema:</Text>
            <Text style={[
              styles.statusValue,
              { color: isInitialized ? '#10B981' : '#F59E0B' }
            ]}>
              {isInitialized ? 'Inicializado' : 'Inicializando...'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Permisos:</Text>
            <Text style={[
              styles.statusValue,
              { color: permissionsGranted ? '#10B981' : '#EF4444' }
            ]}>
              {permissionsGranted ? 'Concedidos' : 'Denegados'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Recordatorios habilitados:</Text>
            <Text style={[
              styles.statusValue,
              { color: settings.enabled ? '#10B981' : '#6B7280' }
            ]}>
              {settings.enabled ? 'Sí' : 'No'}
            </Text>
          </View>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Notificaciones programadas:</Text>
            <Text style={styles.statusValue}>{scheduledNotifications}</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="⚙️ Configurar Notificaciones"
            onPress={() => setActiveView('settings')}
            variant="primary"
            style={styles.button}
          />
        </View>
      </Card>

      {/* Sección de Testing (solo en desarrollo) */}
      {__DEV__ && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>🧪 Herramientas de Desarrollo</Text>
          <Text style={styles.sectionDescription}>
            Estas herramientas están disponibles solo en modo desarrollo para probar las notificaciones.
          </Text>

          <View style={styles.devButtonsContainer}>
            <Button
              title="🚀 Prueba Rápida"
              onPress={handleQuickTest}
              variant="outline"
              style={styles.devButton}
            />
            
            <Button
              title="🧪 Prueba Simple"
              onPress={handleSimpleTest}
              variant="outline"
              style={styles.devButton}
            />
            
            <Button
              title="🛠️ Herramientas Avanzadas"
              onPress={() => setActiveView('testing')}
              variant="outline"
              style={styles.devButton}
            />
          </View>

          <View style={styles.devInfo}>
            <Text style={styles.devInfoText}>
              💡 <Text style={styles.devInfoBold}>Consejos:</Text>
            </Text>
            <Text style={styles.devInfoText}>
              • La "Prueba Rápida" programa 3 notificaciones en secuencia
            </Text>
            <Text style={styles.devInfoText}>
              • La "Prueba Simple" envía 1 notificación en 5 segundos
            </Text>
            <Text style={styles.devInfoText}>
              • Las herramientas avanzadas permiten configurar tiempos personalizados
            </Text>
          </View>
        </Card>
      )}

      {/* Otras secciones de configuración */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Cuenta</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Editar Perfil"
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Cambiar Contraseña"
            variant="outline"
            style={styles.button}
          />
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Gamificación</Text>
        <View style={styles.buttonContainer}>
          <Button
            title="Ver Logros"
            variant="outline"
            style={styles.button}
          />
          <Button
            title="Configurar Metas"
            variant="outline"
            style={styles.button}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  statusContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    marginBottom: 0,
  },
  devButtonsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  devButton: {
    marginBottom: 0,
  },
  devInfo: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  devInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
    marginBottom: 4,
  },
  devInfoBold: {
    fontWeight: '600',
  },
});
