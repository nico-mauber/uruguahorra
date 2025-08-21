import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';
import { SubscriptionsService } from '@/services/subscriptions.service';
import { Ionicons } from '@expo/vector-icons';
import type { Database } from '@/lib/supabase';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export function SubscriptionManager() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
    }
  }, [user?.id]);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const activeSubscription =
        await SubscriptionsService.getActiveSubscription(user!.id);
      setSubscription(activeSubscription);
    } catch (error) {
      console.error('Error cargando suscripción:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar suscripción',
      '¿Estás seguro que deseas cancelar tu suscripción Premium? Mantendrás el acceso hasta el final del período actual.',
      [
        { text: 'No, mantener', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          onPress: cancelSubscription,
          style: 'destructive',
        },
      ]
    );
  };

  const cancelSubscription = async () => {
    if (!subscription) return;

    try {
      setIsUpdating(true);
      await SubscriptionsService.cancelSubscription(subscription.id, true);
      await loadSubscription();
      Alert.alert(
        'Cancelación programada',
        'Tu suscripción se cancelará al final del período actual.'
      );
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      Alert.alert(
        'Error',
        'No se pudo cancelar la suscripción. Inténtalo nuevamente.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;

    try {
      setIsUpdating(true);
      await SubscriptionsService.reactivateSubscription(subscription.id);
      await loadSubscription();
      Alert.alert(
        'Suscripción reactivada',
        'Tu suscripción Premium ha sido reactivada exitosamente.'
      );
    } catch (error) {
      console.error('Error reactivando suscripción:', error);
      Alert.alert(
        'Error',
        'No se pudo reactivar la suscripción. Inténtalo nuevamente.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleManageSubscription = () => {
    if (subscription?.provider === 'mercadopago') {
      // Abrir gestión de MercadoPago
      Alert.alert(
        'Gestionar suscripción',
        'Para gestionar tu suscripción de MercadoPago, contacta con soporte.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-UY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return theme.success;
      case 'cancelled':
        return theme.warning;
      case 'past_due':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'cancelled':
        return 'Cancelada';
      case 'past_due':
        return 'Pago pendiente';
      case 'trial':
        return 'Prueba gratuita';
      default:
        return status;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    subscriptionCard: {
      marginBottom: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    premiumIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      marginLeft: 'auto',
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    actionsContainer: {
      marginTop: 16,
    },
    actionButton: {
      marginBottom: 12,
    },
    noSubscription: {
      textAlign: 'center',
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 32,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.noSubscription}>Cargando información...</Text>
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mi suscripción</Text>
          <Text style={styles.subtitle}>
            No tienes una suscripción Premium activa
          </Text>
        </View>
        <Text style={styles.noSubscription}>
          Suscríbete a Premium para desbloquear todas las funciones de
          Uruguahorra
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi suscripción</Text>
        <Text style={styles.subtitle}>Gestiona tu suscripción Premium</Text>
      </View>

      <Card style={styles.subscriptionCard}>
        <View style={styles.cardHeader}>
          <View style={styles.premiumIcon}>
            <Ionicons name="diamond" size={20} color={theme.primary} />
          </View>
          <Text style={styles.cardTitle}>Premium</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(subscription.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getStatusText(subscription.status)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Plan</Text>
          <Text style={styles.infoValue}>
            {subscription.plan === 'premium' ? 'Premium' : subscription.plan}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Proveedor</Text>
          <Text style={styles.infoValue}>
            {subscription.provider === 'mercadopago'
              ? 'MercadoPago'
              : subscription.provider}
          </Text>
        </View>

        {subscription.start_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inicio</Text>
            <Text style={styles.infoValue}>
              {formatDate(subscription.start_date)}
            </Text>
          </View>
        )}

        {subscription.end_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Próxima renovación</Text>
            <Text style={styles.infoValue}>
              {formatDate(subscription.end_date)}
            </Text>
          </View>
        )}

        {subscription.cancelled_at && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cancelada el</Text>
            <Text style={styles.infoValue}>
              {formatDate(subscription.cancelled_at)}
            </Text>
          </View>
        )}

        <View style={styles.actionsContainer}>
          {subscription.status === 'active' &&
            !subscription.cancel_at_period_end && (
              <>
                <Button
                  title="Gestionar suscripción"
                  variant="outline"
                  onPress={handleManageSubscription}
                  style={styles.actionButton}
                  disabled={isUpdating}
                />
                <Button
                  title="Cancelar suscripción"
                  variant="outline"
                  onPress={handleCancelSubscription}
                  style={styles.actionButton}
                  disabled={isUpdating}
                />
              </>
            )}

          {subscription.cancel_at_period_end && (
            <Button
              title="Reactivar suscripción"
              onPress={handleReactivateSubscription}
              style={styles.actionButton}
              loading={isUpdating}
            />
          )}

          {subscription.status === 'past_due' && (
            <Button
              title="Actualizar método de pago"
              onPress={handleManageSubscription}
              style={styles.actionButton}
              disabled={isUpdating}
            />
          )}
        </View>
      </Card>
    </ScrollView>
  );
}
