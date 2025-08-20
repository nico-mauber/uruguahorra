/**
 * Componente para mostrar el estado de la PWA (conexión, actualizaciones, etc.)
 */
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { usePWA } from '../hooks/usePWA';
import { useTheme } from '../theme/ThemeContext';

export const PWAStatus: React.FC = () => {
  const { theme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Esperar a que el componente esté montado para evitar problemas de hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Solo obtener el estado PWA después de que el componente esté montado
  const pwaHookResult = usePWA();
  const { isOnline, hasUpdate, updateApp, isStandalone } = isMounted
    ? pwaHookResult
    : {
        isOnline: true,
        hasUpdate: false,
        updateApp: () => {},
        isStandalone: false,
      };

  // Solo mostrar en web y después del montaje
  if (Platform.OS !== 'web' || !isMounted) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Indicador de conexión */}
      <View style={styles.statusItem}>
        <View
          style={[
            styles.indicator,
            { backgroundColor: isOnline ? theme.success : theme.error },
          ]}
        />
        <Text style={[styles.statusText, { color: theme.textSecondary }]}>
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </Text>
      </View>

      {/* Indicador de instalación */}
      {isStandalone && (
        <View style={styles.statusItem}>
          <View
            style={[styles.indicator, { backgroundColor: theme.primary }]}
          />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>
            📱 App instalada
          </Text>
        </View>
      )}

      {/* Notificación de actualización */}
      {hasUpdate && (
        <TouchableOpacity
          style={[styles.updateBanner, { backgroundColor: theme.warning }]}
          onPress={updateApp}
        >
          <Text style={styles.updateText}>
            📱 Nueva versión disponible - Toca para actualizar
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  updateBanner: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
