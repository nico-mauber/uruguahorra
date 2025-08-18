import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button, Card } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { Ionicons } from '@expo/vector-icons';

export default function PaywallScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubscribe = async () => {
    setIsLoading(true);
    // Simulación de proceso de pago
    setTimeout(() => {
      setIsLoading(false);
      Alert.alert(
        '¡Felicidades!',
        'Tu suscripción Premium ha sido activada exitosamente.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }, 2000);
  };
  
  const features = [
    { icon: 'infinite', title: 'Metas ilimitadas', description: 'Crea todas las metas que necesites' },
    { icon: 'analytics', title: 'Reportes avanzados', description: 'Análisis detallado de tus gastos' },
    { icon: 'people', title: 'Pods de ahorro', description: 'Ahorra en grupo con amigos' },
    { icon: 'school', title: 'Contenido educativo completo', description: 'Acceso a todos los cursos' },
    { icon: 'cloud-upload', title: 'Importaciones ilimitadas', description: 'Sube todos tus CSV' },
    { icon: 'flash', title: 'Retos exclusivos', description: 'Desafíos especiales con más XP' },
  ];
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    premiumBadge: {
      backgroundColor: theme.warning + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
    },
    premiumText: {
      color: theme.warning,
      fontWeight: '600',
      fontSize: 14,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
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
      borderColor: theme.primary,
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
      color: theme.text,
      marginBottom: 4,
    },
    planPrice: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.primary,
    },
    planPeriod: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    planDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    savingBadge: {
      backgroundColor: theme.success + '20',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    savingText: {
      color: theme.success,
      fontSize: 12,
      fontWeight: '600',
    },
    featuresSection: {
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
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
      backgroundColor: theme.primary + '10',
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
      color: theme.text,
      marginBottom: 2,
    },
    featureDescription: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    footer: {
      marginTop: 16,
      marginBottom: 32,
    },
    footerText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    currentPlanBadge: {
      backgroundColor: theme.info + '20',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'center',
      marginBottom: 16,
    },
    currentPlanText: {
      color: theme.info,
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
        
        {user?.premium && (
          <View style={styles.currentPlanBadge}>
            <Text style={styles.currentPlanText}>Ya eres Premium</Text>
          </View>
        )}
        
        <View style={styles.plansContainer}>
          <Card
            style={[
              styles.planCard,
              selectedPlan === 'annual' && styles.selectedPlan,
            ]}
            onTouchEnd={() => setSelectedPlan('annual')}
          >
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Plan Anual</Text>
                <Text style={styles.planPrice}>
                  $39.99<Text style={styles.planPeriod}>/año</Text>
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
          
          <Card
            style={[
              styles.planCard,
              selectedPlan === 'monthly' && styles.selectedPlan,
            ]}
            onTouchEnd={() => setSelectedPlan('monthly')}
          >
            <View style={styles.planHeader}>
              <View style={styles.planInfo}>
                <Text style={styles.planName}>Plan Mensual</Text>
                <Text style={styles.planPrice}>
                  $4.99<Text style={styles.planPeriod}>/mes</Text>
                </Text>
                <Text style={styles.planDescription}>
                  Cancela cuando quieras
                </Text>
              </View>
            </View>
          </Card>
        </View>
        
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Todo lo que incluye Premium</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons
                  name={feature.icon as any}
                  size={20}
                  color={theme.primary}
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
        
        <Button
          title={
            selectedPlan === 'annual'
              ? 'Suscribirse por $39.99/año'
              : 'Suscribirse por $4.99/mes'
          }
          size="large"
          loading={isLoading}
          onPress={handleSubscribe}
          disabled={user?.premium}
        />
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Puedes cancelar en cualquier momento desde tu perfil.{'\n'}
            Los pagos se procesan de forma segura a través de Stripe.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}