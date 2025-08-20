/**
 * Componente para mostrar prompt de instalación PWA personalizado
 */
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../theme/ThemeContext';
import { Button } from './Button';
import { Card } from './Card';

interface PWAInstallPromptProps {
  visible: boolean;
  onDismiss: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({
  visible,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const { isInstallable, promptInstall } = usePWA();

  // Solo mostrar en web y si es instalable
  if (Platform.OS !== 'web' || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    try {
      await promptInstall();
      onDismiss();
    } catch (error) {
      console.error('Error installing PWA:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={styles.container}>
          <Card style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.icon, { color: colors.primary }]}>📱</Text>
              <Text style={[styles.title, { color: colors.text }]}>
                ¡Instala Uruguahorra!
              </Text>
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]}>
              Instala la app en tu dispositivo para acceder más rápido y recibir
              notificaciones de tus metas de ahorro.
            </Text>

            <View style={styles.benefits}>
              <Text
                style={[styles.benefitItem, { color: colors.textSecondary }]}
              >
                ✨ Acceso rápido desde tu pantalla de inicio
              </Text>
              <Text
                style={[styles.benefitItem, { color: colors.textSecondary }]}
              >
                🔔 Notificaciones de progreso
              </Text>
              <Text
                style={[styles.benefitItem, { color: colors.textSecondary }]}
              >
                📴 Funciona sin conexión a internet
              </Text>
              <Text
                style={[styles.benefitItem, { color: colors.textSecondary }]}
              >
                🚀 Carga más rápida
              </Text>
            </View>

            <View style={styles.actions}>
              <Button
                title="Instalar Ahora"
                onPress={handleInstall}
                style={styles.installButton}
              />
              <TouchableOpacity
                onPress={onDismiss}
                style={styles.dismissButton}
              >
                <Text
                  style={[styles.dismissText, { color: colors.textSecondary }]}
                >
                  Ahora no
                </Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    padding: 24,
    margin: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  benefits: {
    marginBottom: 24,
  },
  benefitItem: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  installButton: {
    marginBottom: 8,
  },
  dismissButton: {
    padding: 12,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
