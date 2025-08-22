import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configurar el handler de notificaciones
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TestNotificationsScreen() {
  useEffect(() => {
    // Inicializar permisos automáticamente
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    if (!Device.isDevice) {
      Alert.alert(
        'Error',
        'Las notificaciones no funcionan en simuladores. Usa un dispositivo físico.'
      );
      return;
    }

    // Solicitar permisos
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos denegados',
        'Necesitas habilitar las notificaciones para usar esta función.'
      );
      return;
    }

    console.log('✅ Notificaciones configuradas correctamente');
    Alert.alert(
      '✅ Listo',
      'Las notificaciones están configuradas. ¡Ya puedes probar!'
    );
  };

  // Función más simple posible para enviar notificación
  const sendTestNotification = async () => {
    try {
      console.log('🧪 Programando notificación de prueba...');

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 ¡Funciona!',
          body: 'Esta es tu primera notificación de prueba. ¡El sistema está funcionando!',
          data: { timestamp: Date.now() },
        },
        trigger: { seconds: 3 }, // 3 segundos
      });

      console.log('✅ Notificación programada con ID:', notificationId);
      Alert.alert(
        '🚀 Notificación programada',
        'Recibirás una notificación en 3 segundos. ¡Mira la parte superior de tu pantalla!'
      );
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert(
        'Error',
        'No se pudo enviar la notificación: ' + error.message
      );
    }
  };

  const sendQuickSequence = async () => {
    try {
      console.log('🚀 Programando secuencia de prueba...');

      // 3 notificaciones en secuencia
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '1️⃣ Primera notificación',
          body: 'Esta es la primera de 3 notificaciones de prueba',
        },
        trigger: { seconds: 3 },
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '2️⃣ Segunda notificación',
          body: '¡Genial! El sistema está funcionando correctamente',
        },
        trigger: { seconds: 8 },
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '3️⃣ ¡Última notificación!',
          body: '🎉 ¡Felicidades! Tu sistema de notificaciones está listo',
        },
        trigger: { seconds: 13 },
      });

      Alert.alert(
        '🎯 Secuencia programada',
        'Recibirás 3 notificaciones:\n• En 3 segundos\n• En 8 segundos\n• En 13 segundos\n\n¡Mantente atento!'
      );
    } catch (error) {
      console.error('❌ Error:', error);
      Alert.alert('Error', 'No se pudo programar la secuencia');
    }
  };

  const cancelAllNotifications = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    Alert.alert('🗑️ Cancelado', 'Todas las notificaciones han sido canceladas');
    console.log('🗑️ Todas las notificaciones canceladas');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 Prueba de Notificaciones</Text>
      <Text style={styles.subtitle}>
        Usa estos botones para probar las notificaciones inmediatamente
      </Text>

      <TouchableOpacity style={styles.button} onPress={sendTestNotification}>
        <Text style={styles.buttonText}>🚀 Notificación en 3 segundos</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.primaryButton]}
        onPress={sendQuickSequence}
      >
        <Text style={[styles.buttonText, styles.primaryButtonText]}>
          🎯 Secuencia de 3 notificaciones
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.dangerButton]}
        onPress={cancelAllNotifications}
      >
        <Text style={[styles.buttonText, styles.dangerButtonText]}>
          🗑️ Cancelar todas
        </Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>💡 Instrucciones:</Text>
        <Text style={styles.instructionsText}>
          1. Aprieta "Notificación en 3 segundos" y espera{'\n'}
          2. Verás la notificación en la parte superior{'\n'}
          3. Si no aparece, revisa los permisos{'\n'}
          4. Las notificaciones funcionan mejor en dispositivo físico
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryButtonText: {
    color: 'white',
  },
  dangerButtonText: {
    color: 'white',
  },
  instructions: {
    marginTop: 40,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#6366F1',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
});
