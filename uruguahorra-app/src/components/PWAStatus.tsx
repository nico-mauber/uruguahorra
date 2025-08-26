/**
 * PWA Status Component - Psychologically Optimized
 * Shows connection status, app installation, and updates with psychological colors
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
import { useTheme } from '@theme';
import { textStyles } from '@theme';

export const PWAStatus: React.FC = () => {
  const { colors } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  // Wait for component to mount to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Only get PWA state after component is mounted
  const pwaHookResult = usePWA();
  const { isOnline, hasUpdate, updateApp, isStandalone } = isMounted
    ? pwaHookResult
    : {
        isOnline: true,
        hasUpdate: false,
        updateApp: () => {},
        isStandalone: false,
      };

  // Only show on web and after mounting
  if (Platform.OS !== 'web' || !isMounted) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Connection indicator */}
      <View style={styles.statusItem}>
        <View
          style={[
            styles.indicator,
            {
              backgroundColor: isOnline ? colors.success : colors.error,
            },
          ]}
        />
        <Text
          style={[
            styles.statusText,
            { color: colors.text.secondary },
            textStyles.metadata,
          ]}
        >
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </Text>
      </View>

      {/* Installation indicator */}
      {isStandalone && (
        <View style={styles.statusItem}>
          <View
            style={[styles.indicator, { backgroundColor: colors.primary }]}
          />
          <Text
            style={[
              styles.statusText,
              { color: colors.text.secondary },
              textStyles.metadata,
            ]}
          >
            📱 App instalada
          </Text>
        </View>
      )}

      {/* Update notification */}
      {hasUpdate && (
        <TouchableOpacity
          style={[styles.updateBanner, { backgroundColor: colors.warning }]}
          onPress={updateApp}
        >
          <Text style={[styles.updateText, { color: colors.text.inverse }]}>
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
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
