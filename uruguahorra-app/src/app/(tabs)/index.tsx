import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Button, Card, ProgressBar } from '@components';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useGoalsStore } from '@store/useGoalsStore';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    user,
    updateUserXP,
    checkSession,
    isLoading: authLoading,
  } = useAuthStore();
  const {
    goals,
    isLoading,
    error,
    fetchGoals,
    addContribution,
    getGoalProgress,
    getTotalSaved,
  } = useGoalsStore();

  const [refreshing, setRefreshing] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);

  // Usar useRef para rastrear si ya se cargaron las metas
  const goalsLoadedRef = useRef(false);
  const initializingRef = useRef(false);

  // Inicializar dashboard una sola vez
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    logger.info(LogModule.UI, 'Inicializando dashboard');

    const initializeUser = async () => {
      try {
        const currentUser = useAuthStore.getState().user;

        if (!currentUser) {
          await checkSession();
        }

        const updatedUser = useAuthStore.getState().user;

        if (updatedUser?.id && !goalsLoadedRef.current) {
          goalsLoadedRef.current = true;
          await fetchGoals(updatedUser.id);
          logger.success(LogModule.UI, 'Metas cargadas exitosamente');
        }
      } catch (error) {
        logger.error(LogModule.UI, 'Error inicializando dashboard', error);
        goalsLoadedRef.current = false;
      } finally {
        setInitializing(false);
      }
    };

    initializeUser();
  }, [checkSession, fetchGoals]);

  // Cargar metas cuando el usuario cambia (comentado para evitar duplicación)
  // Este efecto ya no es necesario porque la carga inicial se hace en el primer useEffect
  /*
  useEffect(() => {
    console.log('Usuario cambió:', user);
    
    if (user?.id && !initializing) {
      console.log('Usuario disponible, cargando metas para ID:', user.id);
      fetchGoals(user.id).then(() => {
        console.log('fetchGoals completado');
      }).catch(err => {
        console.error('Error en fetchGoals:', err);
      });
    }
  }, [user?.id, initializing]);
  */

  // REMOVIDO: useFocusEffect causaba loops infinitos
  // Las metas se cargan una sola vez en el useEffect inicial
  // y el usuario puede refrescar manualmente con pull-to-refresh

  // Función para refrescar metas
  const onRefresh = React.useCallback(async () => {
    if (!user?.id) return;

    setRefreshing(true);
    logger.info(LogModule.UI, 'Refrescando metas');

    try {
      await fetchGoals(user.id, true);
      logger.success(LogModule.UI, 'Metas refrescadas');
    } catch (error) {
      logger.error(LogModule.UI, 'Error refrescando metas', error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchGoals]);

  const handleQuickSave = async (amount: number) => {
    if (goals.length > 0) {
      await addContribution(goals[0].id, amount, 'manual');
      updateUserXP(amount * 2);
      logger.success(LogModule.UI, 'Ahorro rápido completado', { amount });
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      padding: 20,
    },
    header: {
      marginBottom: 24,
    },
    greeting: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      marginHorizontal: 6,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    statUnit: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 16,
    },
    goalCard: {
      marginBottom: 16,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    goalAmount: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    goalDate: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 4,
    },
    quickSaveSection: {
      marginBottom: 24,
    },
    quickSaveButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    streakCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      marginBottom: 16,
    },
    streakInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    streakText: {
      marginLeft: 12,
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    addButton: {
      position: 'absolute',
      bottom: 24,
      right: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: theme.error + '20',
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: theme.error,
      textAlign: 'center',
    },
    emptyCard: {
      padding: 24,
      alignItems: 'center',
    },
    emptyText: {
      color: theme.textSecondary,
      textAlign: 'center',
      fontSize: 16,
      marginBottom: 16,
    },
    createGoalButton: {
      marginTop: 8,
    },
  });

  // Mostrar loading mientras se inicializa el usuario o se cargan las metas
  if (initializing || authLoading || (isLoading && goals.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>
            {initializing ? 'Verificando sesión...' : 'Cargando tus metas...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirigir si no hay usuario
  if (!initializing && !user) {
    router.replace('/(auth)/onboarding');
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>
            ¡Hola, {user?.email?.split('@')[0]}!
          </Text>
          <Text style={styles.subtitle}>Tu progreso de hoy</Text>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Nivel</Text>
            <Text style={styles.statValue}>{user?.level || 1}</Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>XP Total</Text>
            <Text style={styles.statValue}>{user?.totalXP || 0}</Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Ahorrado</Text>
            <Text style={styles.statValue}>${getTotalSaved().toFixed(0)}</Text>
          </Card>
        </View>

        <Card style={styles.streakCard} variant="outlined">
          <View style={styles.streakInfo}>
            <Ionicons name="flame" size={32} color={theme.warning} />
            <Text style={styles.streakText}>
              {user?.streak || 0} días de racha
            </Text>
          </View>
          <Ionicons name="shield-checkmark" size={24} color={theme.success} />
        </Card>

        {goals.length > 0 && (
          <View style={styles.quickSaveSection}>
            <Text style={styles.sectionTitle}>Ahorro rápido</Text>
            <View style={styles.quickSaveButtons}>
              <Button
                title="$50"
                variant="outline"
                onPress={() => handleQuickSave(50)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="$100"
                variant="outline"
                onPress={() => handleQuickSave(100)}
                style={{ flex: 1, marginHorizontal: 8 }}
              />
              <Button
                title="$200"
                variant="outline"
                onPress={() => handleQuickSave(200)}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>Mis metas activas</Text>
          {goals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="flag" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>
                No tienes metas activas. ¡Crea una para empezar a ahorrar!
              </Text>
              <Button
                title="Crear nueva meta"
                onPress={() => {
                  logger.info(LogModule.NAV, 'Navegando a crear meta');
                  router.push('/create-goal');
                }}
                style={styles.createGoalButton}
              />
            </Card>
          ) : (
            goals.map((goal) => {
              const progress = getGoalProgress(goal.id);
              const daysLeft = Math.ceil(
                (new Date(goal.targetDate).getTime() - new Date().getTime()) /
                  (1000 * 60 * 60 * 24)
              );

              return (
                <Card key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={styles.goalDate}>
                        {daysLeft > 0
                          ? `${daysLeft} días restantes`
                          : 'Meta vencida'}
                      </Text>
                    </View>
                    <Text style={styles.goalAmount}>
                      ${goal.savedAmount.toFixed(0)} / $
                      {goal.targetAmount.toFixed(0)}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={progress}
                    showLabel
                    color={theme.primary}
                  />
                </Card>
              );
            })
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          logger.info(LogModule.NAV, 'Navegando a crear meta');
          router.push('/create-goal');
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
