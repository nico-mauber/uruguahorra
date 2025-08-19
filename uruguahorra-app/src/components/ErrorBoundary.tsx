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
import { errorHandler, getUserErrorMessage } from '@/utils/error-handler';
import { ERROR_MESSAGES } from '@/utils/error-messages';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  userMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      userMessage: ERROR_MESSAGES.GENERIC.UNKNOWN,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generar ID único para el error
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Obtener mensaje seguro para el usuario (sin exponer detalles técnicos)
    const userMessage = getUserErrorMessage(error);

    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId,
      userMessage,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Manejar el error de forma segura
    const appError = errorHandler.handle(error, {
      action: 'RENDER_ERROR',
      resource: errorInfo.componentStack?.split('\n')[0] || 'Unknown Component',
    });

    // Log interno con detalles completos (no expuestos al usuario)
    logger.error(LogModule.UI, 'Error capturado por ErrorBoundary', {
      errorId: this.state.errorId,
      errorCode: appError.code,
      category: appError.category,
      componentStack: errorInfo.componentStack,
      // Solo en desarrollo incluir stack trace
      ...((__DEV__ || process.env.NODE_ENV === 'development') && {
        errorMessage: error.message,
        stack: error.stack,
      }),
    });

    this.setState({
      error,
      errorInfo,
    });

    // Callback personalizado de error
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      userMessage: ERROR_MESSAGES.GENERIC.UNKNOWN,
    });
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

            <Text style={styles.subtitle}>{this.state.userMessage}</Text>

            {/* Mostrar ID del error para soporte (sin detalles técnicos) */}
            {this.state.errorId && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Código de referencia:</Text>
                <Text style={styles.errorText}>{this.state.errorId}</Text>
                <Text style={styles.errorHint}>
                  Proporciona este código al contactar soporte
                </Text>
              </View>
            )}

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
                  // Log seguro sin exponer información sensible
                  logger.info(LogModule.UI, 'Usuario reportó error', {
                    errorId: this.state.errorId,
                    // NO incluir: error.message, stack trace, etc.
                  });
                  // TODO: Integrar con servicio de reporte (Sentry, etc.)
                }}
                style={styles.reportButton}
              />
            </View>

            {/* Solo mostrar detalles técnicos en desarrollo */}
            {(__DEV__ || process.env.NODE_ENV === 'development') && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>
                  Debug Info (Development Only):
                </Text>
                <Text style={styles.debugText}>
                  Error: {this.state.error?.message}
                </Text>
                <Text style={styles.debugText} numberOfLines={10}>
                  Stack: {this.state.error?.stack}
                </Text>
                {this.state.errorInfo?.componentStack && (
                  <Text style={styles.debugText} numberOfLines={10}>
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
  errorHint: {
    fontSize: 11,
    color: '#666666',
    marginTop: 8,
    fontStyle: 'italic',
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
    // Usar el error handler seguro
    const appError = errorHandler.handle(error, {
      action: 'MANUAL_ERROR',
      resource: errorInfo?.componentStack?.split('\n')[0] || 'Unknown',
    });

    // Log seguro sin exponer información sensible
    logger.error(LogModule.UI, 'Error manejado manualmente', {
      errorCode: appError.code,
      category: appError.category,
      // Solo en desarrollo
      ...((__DEV__ || process.env.NODE_ENV === 'development') && {
        originalError: error.message,
        stack: error.stack,
      }),
    });
  };
};

// Componente de error boundary más simple para casos específicos
export const SimpleErrorBoundary: React.FC<{
  children: ReactNode;
  message?: string;
}> = ({ children, message }) => {
  return (
    <ErrorBoundary
      fallback={(error, reset) => {
        // Usar mensaje seguro, no el error original
        const safeMessage = message || getUserErrorMessage(error);
        return (
          <View style={styles.simpleContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
            <Text style={styles.simpleMessage}>{safeMessage}</Text>
            <TouchableOpacity onPress={reset} style={styles.simpleButton}>
              <Text style={styles.simpleButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
