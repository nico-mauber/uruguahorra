import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { useRouter } from 'expo-router';
import { useStreakNotifications } from '@/hooks/useStreakNotifications';

export const NotificationsBanner: React.FC = () => {
  const { theme } = useTheme();
  const router = useRouter();
  const { permissionsGranted, settings, scheduledNotifications } =
    useStreakNotifications();

  // No mostrar si ya está configurado correctamente
  if (permissionsGranted && settings.enabled && scheduledNotifications > 0) {
    return null;
  }

  const getStatusInfo = () => {
    if (!permissionsGranted) {
      return {
        icon: 'notifications-off',
        title: '🔔 Activa las notificaciones',
        message: 'Nunca te olvides de ahorrar con recordatorios diarios',
        color: '#F59E0B',
        bgColor: '#FEF3C7',
        actionText: 'Configurar',
      };
    }

    if (!settings.enabled) {
      return {
        icon: 'notifications-outline',
        title: '⏰ Configura tus recordatorios',
        message: 'Elige cuándo quieres recibir avisos de ahorro',
        color: '#6366F1',
        bgColor: '#EEF2FF',
        actionText: 'Activar',
      };
    }

    return {
      icon: 'checkmark-circle',
      title: '✅ Notificaciones configuradas',
      message: 'Estás listo para mantener tu racha de ahorro',
      color: '#10B981',
      bgColor: '#ECFDF5',
      actionText: 'Ver',
    };
  };

  const status = getStatusInfo();

  const handlePress = () => {
    router.push('/notifications');
  };

  const styles = StyleSheet.create({
    container: {
      margin: 16,
      marginBottom: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: status.bgColor,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: status.color,
    },
    iconContainer: {
      marginRight: 12,
    },
    textContainer: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    message: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    actionButton: {
      backgroundColor: status.color,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginLeft: 8,
    },
    actionText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={status.icon as any} size={24} color={status.color} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{status.title}</Text>
          <Text style={styles.message}>{status.message}</Text>
        </View>
        <View style={styles.actionButton}>
          <Text style={styles.actionText}>{status.actionText}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};
