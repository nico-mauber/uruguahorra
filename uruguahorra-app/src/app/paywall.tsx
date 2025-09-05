import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';
import { Ionicons } from '@expo/vector-icons';
import { BillingService } from '@/services/billing/BillingService';
import type { SubscriptionPlan } from '@/types/billing';
import { SubscriptionsService } from '@/services/subscriptions.service';
import { useAnalytics, AnalyticsEvents } from '@/hooks/useAnalytics';

export default function PaywallScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const analytics = useAnalytics();
  const [selectedPlan, setSelectedPlan] = useState<
    'premium_monthly' | 'premium_yearly'
  >('premium_yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    loadPlans();
    checkPremiumStatus();

    // Track paywall viewed
    analytics.track(AnalyticsEvents.PAYWALL_VIEWED, {
      user_id: user?.id,
      source: 'paywall_screen',
    });
  }, [user?.id]);

  const loadPlans = async () => {
    try {
      const allPlans = BillingService.getAllPlans();
      setPlans(allPlans);
    } catch (error) {
      console.error('Error cargando planes:', error);
    }
  };

  const checkPremiumStatus = async () => {
    if (!user?.id) return;
    
    try {
      const isPremium = await SubscriptionsService.isPremiumUser(user.id);
      setIsPremiumUser(isPremium);
    } catch (error) {
      console.error('Error verificando estado premium:', error);
      setIsPremiumUser(false); // Fallback to false on error
    }
  };

  const handleSubscribe = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión para suscribirte');
      return;
    }

    if (isPremiumUser) {
      Alert.alert('Info', 'Ya tienes una suscripción activa');
      return;
    }

    setIsLoading(true);

    try {
      const plan = plans.find((p) => p.id === selectedPlan);

      // Track checkout started
      if (plan) {
        analytics.track(AnalyticsEvents.CHECKOUT_STARTED, {
          plan_id: plan.id,
          plan_type: selectedPlan,
          amount: plan.price,
          currency: plan.currency,
          period: selectedPlan.includes('yearly') ? 'yearly' : 'monthly',
        });
      }

      const successUrl = `${window.location.origin}/(tabs)?subscription=success`;
      const cancelUrl = `${window.location.origin}/paywall?subscription=cancelled`;

      const checkout = await BillingService.createCheckout(
        selectedPlan,
        user.id,
        successUrl,
        cancelUrl
      );

      // Abrir URL de checkout de MercadoPago
      if (checkout.url) {
        console.log('Redirigiendo a MercadoPago:', checkout.url);
        console.log('Platform:', Platform.OS);

        try {
          if (Platform.OS === 'web') {
            // Para web, abrir en nueva pestaña
            window.open(checkout.url, '_blank');
          } else if (Platform.OS === 'ios' || Platform.OS === 'android') {
            // Para móvil, verificar si se puede abrir la URL
            const canOpen = await Linking.canOpenURL(checkout.url);
            console.log('Can open URL:', canOpen);

            if (canOpen) {
              await Linking.openURL(checkout.url);
            } else {
              // Si no se puede abrir directamente, mostrar error
              console.error('No se puede abrir la URL directamente');
              Alert.alert(
                'Error',
                'No se pudo abrir el link de pago. Por favor, intenta desde un navegador web.',
                [{ text: 'OK' }]
              );
            }
          }
        } catch (error) {
          console.error('Error abriendo URL:', error);
          Alert.alert(
            'Error',
            'Hubo un problema al abrir el link de pago. Intenta nuevamente.'
          );
        }
      } else {
        console.error('No se recibió URL de checkout');
        Alert.alert(
          'Error',
          'No se pudo obtener la URL de pago. Inténtalo nuevamente.'
        );
      }
    } catch (error) {
      console.error('Error al crear checkout:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar el pago. Inténtalo nuevamente.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // const currentPlan = plans.find((p) => p.id === selectedPlan); // Defined but never used
  const monthlyPlan = plans.find((p) => p.id === 'premium_monthly');
  const yearlyPlan = plans.find((p) => p.id === 'premium_yearly');

  const features = [
    {
      icon: 'infinite',
      title: 'Metas ilimitadas',
      description: 'Crea todas las metas que necesites',
    },
    {
      icon: 'analytics',
      title: 'Reportes avanzados',
      description: 'Análisis detallado de tus gastos',
    },
    {
      icon: 'people',
      title: 'Pods de ahorro',
      description: 'Ahorra en grupo con amigos',
    },
    {
      icon: 'school',
      title: 'Contenido educativo completo',
      description: 'Acceso a todos los cursos',
    },
    {
      icon: 'cloud-upload',
      title: 'Importaciones ilimitadas',
      description: 'Sube todos tus CSV',
    },
    {
      icon: 'flash',
      title: 'Retos exclusivos',
      description: 'Desafíos especiales con más XP',
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    premiumBadge: {
      backgroundColor: colors.warning + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
    },
    premiumText: {
      color: colors.warning,
      fontWeight: '600',
      fontSize: 14,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    plansContainer: {
      marginBottom: 32,
    },
    planCard: {
      marginBottom: 16,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedPlan: {
      borderColor: colors.primary,
    },
    planHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    planInfo: {
      flex: 1,
    },
    planName: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 4,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.primary,
    },
    planPeriod: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    planDescription: {
      fontSize: 14,
      color: colors.text.secondary,
      marginTop: 4,
    },
    savingBadge: {
      backgroundColor: colors.success + '20',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    savingText: {
      color: colors.success,
      fontSize: 12,
      fontWeight: '600',
    },
    featuresSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 16,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary + '10',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    footer: {
      marginTop: 16,
      marginBottom: 32,
    },
    footerText: {
      fontSize: 12,
      color: colors.text.secondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    currentPlanBadge: {
      backgroundColor: colors.info + '20',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'center',
      marginBottom: 16,
    },
    currentPlanText: {
      color: colors.info,
      fontSize: 12,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>Desbloquea todo el potencial</Text>
          <Text style={styles.subtitle}>
            Lleva tu ahorro al siguiente nivel con funciones exclusivas
          </Text>
        </View>

        {isPremiumUser && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Ya eres Premium</Text>
          </View>
        )}

        <View style={styles.plansContainer}>
          <TouchableOpacity
            onPress={() => setSelectedPlan('premium_yearly')}
            disabled={isLoading}
          >
            <Card
              style={[
                styles.planCard,
                selectedPlan === 'premium_yearly' && styles.selectedPlan,
              ]}
            >
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Plan Anual</Text>
                  <Text style={styles.planPrice}>
                    ${yearlyPlan?.price || 39.99}
                    <Text style={styles.planPeriod}>/año</Text>
                  </Text>
                  <Text style={styles.planDescription}>
                    Equivale a $3.33/mes
                  </Text>
                </View>
                <View style={styles.savingBadge}>
                  <Text style={styles.savingText}>Ahorra 33%</Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedPlan('premium_monthly')}
            disabled={isLoading}
          >
            <Card
              style={[
                styles.planCard,
                selectedPlan === 'premium_monthly' && styles.selectedPlan,
              ]}
            >
              <View style={styles.planHeader}>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Plan Mensual</Text>
                  <Text style={styles.planPrice}>
                    ${monthlyPlan?.price || 15}
                    <Text style={styles.planPeriod}>/mes</Text>
                  </Text>
                  <Text style={styles.planDescription}>
                    Cancela cuando quieras
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Todo lo que incluye Premium</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name={feature.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button
          title={
            selectedPlan === 'premium_yearly'
              ? `Suscribirse por $${yearlyPlan?.price || 39.99}/año`
              : `Suscribirse por $${monthlyPlan?.price || 1}/mes`
          }
          size="large"
          loading={isLoading}
          onPress={handleSubscribe}
          disabled={isPremiumUser}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Puedes cancelar en cualquier momento desde tu perfil.{'\n'}
            Los pagos se procesan de forma segura a través de MercadoPago.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
