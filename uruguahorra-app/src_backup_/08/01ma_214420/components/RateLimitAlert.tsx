/**
 * Componente de alerta para mensajes de rate limiting
 * Muestra información sobre bloqueos de seguridad al usuario
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert as RNAlert,
  Platform,
} from 'react-native';
import { useAuthStore } from '@/store/useAuthStore';

interface RateLimitAlertProps {
  visible?: boolean;
  onDismiss?: () => void;
  title?: string;
  message?: string;
  type?: 'warning' | 'blocked';
}

/**
 * Componente de alerta personalizado para rate limiting
 */
export const RateLimitAlert: React.FC<RateLimitAlertProps> = ({
  visible = false,
  onDismiss,
  title = 'Límite de intentos',
  message = 'Has excedido el número de intentos permitidos.',
  type = 'blocked',
}) => {
  if (!visible && Platform.OS !== 'web') {
    return null;
  }

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // En web, usar alert nativo
  if (Platform.OS === 'web') {
    if (visible && typeof window !== 'undefined') {
      setTimeout(() => {
        window.alert(`${title}\n\n${message}`);
        handleDismiss();
      }, 100);
    }
    return null;
  }

  // En móvil, usar modal personalizado
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.alertContainer,
            type === 'warning' ? styles.warningAlert : styles.blockedAlert,
          ]}
        >
          {/* Icono */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>{type === 'warning' ? '⚠️' : '🔒'}</Text>
          </View>

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          <Text style={styles.message}>{message}</Text>

          {/* Botón de cerrar */}
          <TouchableOpacity
            style={[
              styles.button,
              type === 'warning' ? styles.warningButton : styles.blockedButton,
            ]}
            onPress={handleDismiss}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Hook para usar alertas de rate limiting con el store
 */
export const useRateLimitAlert = () => {
  const { rateLimitError, clearRateLimitError } = useAuthStore();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.alert(`${title}\n\n${message}`);
      }
    } else {
      RNAlert.alert(
        title,
        message,
        [
          {
            text: 'Entendido',
            style: 'default',
          },
        ],
        {
          cancelable: true,
        }
      );
    }
  };

  const showWarning = (
    remainingAttempts: number,
    operation: string = 'autenticación'
  ) => {
    const title = `Advertencia - ${operation}`;
    const message = `Te quedan ${remainingAttempts} intentos antes de que tu cuenta sea bloqueada temporalmente.`;
    showAlert(title, message);
  };

  const showBlocked = (
    retryAfterMs: number,
    operation: string = 'autenticación'
  ) => {
    const seconds = Math.ceil(retryAfterMs / 1000);
    const minutes = Math.ceil(seconds / 60);
    const hours = Math.ceil(minutes / 60);

    let timeMessage = '';
    if (hours > 1) {
      timeMessage = `${hours} horas`;
    } else if (minutes > 1) {
      timeMessage = `${minutes} minutos`;
    } else {
      timeMessage = `${seconds} segundos`;
    }

    const title = `Acceso bloqueado - ${operation}`;
    const message = `Demasiados intentos fallidos. Por favor, intenta nuevamente en ${timeMessage}.`;
    showAlert(title, message);
  };

  return {
    rateLimitError,
    clearRateLimitError,
    showAlert,
    showWarning,
    showBlocked,
  };
};

/**
 * Componente integrado que lee automáticamente del store
 */
export const RateLimitAlertContainer: React.FC = () => {
  const { rateLimitError, clearRateLimitError } = useAuthStore();

  if (!rateLimitError) {
    return null;
  }

  return (
    <RateLimitAlert
      visible={!!rateLimitError}
      message={rateLimitError}
      onDismiss={clearRateLimitError}
      type="blocked"
    />
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    minWidth: 280,
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  warningAlert: {
    borderTopWidth: 4,
    borderTopColor: '#FF9500',
  },
  blockedAlert: {
    borderTopWidth: 4,
    borderTopColor: '#FF3B30',
  },
  iconContainer: {
    marginBottom: 16,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  warningButton: {
    backgroundColor: '#FF9500',
  },
  blockedButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
