import React, { Component, ReactNode, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Actualizar el estado para mostrar la UI de error
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log del error
    logger.error(LogModule.UI, 'Error capturado por ErrorBoundary', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Callback personalizado de error
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Renderizar fallback personalizado si se proporciona
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset);
      }

      // UI de error por defecto
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
            </View>

            <Text style={styles.title}>¡Oops! Algo salió mal</Text>

            <Text style={styles.subtitle}>
              La aplicación encontró un error inesperado. No te preocupes, tus
              datos están seguros.
            </Text>

            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Detalles del error:</Text>
              <Text style={styles.errorText}>
                {this.state.error?.message || 'Error desconocido'}
              </Text>
            </View>

            <View style={styles.buttons}>
              <Button
                title="Intentar de nuevo"
                onPress={this.reset}
                style={styles.retryButton}
              />

              <Button
                title="Reportar problema"
                variant="outline"
                onPress={() => {
                  // Aquí podrías integrar con un servicio de reporte de errores
                  // como Sentry, Bugsnag, etc.
                  logger.error(LogModule.UI, 'Usuario reportó error', {
                    error: this.state.error?.message,
                    stack: this.state.error?.stack,
                  });
                }}
                style={styles.reportButton}
              />
            </View>

            {__DEV__ && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>
                  Debug Info (Development Only):
                </Text>
                <Text style={styles.debugText}>{this.state.error?.stack}</Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.debugText}>
                    Component Stack: {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  errorContainer: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FEB2B2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    width: '100%',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C53030',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#822727',
    fontFamily: 'monospace',
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#4A9EFF',
  },
  reportButton: {
    borderColor: '#4A9EFF',
  },
  debugContainer: {
    marginTop: 32,
    backgroundColor: '#F7F7F7',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#718096',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
});

// Hook para usar error boundaries de forma más sencilla
export const useErrorHandler = () => {
  return (error: Error, errorInfo?: ErrorInfo) => {
    logger.error(LogModule.UI, 'Error manejado manualmente', {
      error: error.message,
      stack: error.stack,
      ...errorInfo,
    });
  };
};

// Componente de error boundary más simple para casos específicos
export const SimpleErrorBoundary: React.FC<{
  children: ReactNode;
  message?: string;
}> = ({ children, message = 'Ha ocurrido un error' }) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <View style={styles.simpleContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
          <Text style={styles.simpleMessage}>{message}</Text>
          <TouchableOpacity onPress={reset} style={styles.simpleButton}>
            <Text style={styles.simpleButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
