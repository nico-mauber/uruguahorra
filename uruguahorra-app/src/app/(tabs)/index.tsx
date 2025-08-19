import React, { useEffect, useRef } from 'react';
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
import { useRouter } from 'expo-router';
import { Button, Card, ProgressBar } from '@components';
import { GoalSelectionModal } from '@/components/GoalSelectionModal';
import { useTheme } from '@theme';
import { useAuthStore } from '@store/useAuthStore';
import { useGoalsStore } from '@store/useGoalsStore';
import { UserGamificationStats } from '@features/gamification/types/gamification.types';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';
import { GoalsService } from '@/services/goals.service';
import { ChallengesService } from '@/services/challenges.service';
import {
  LevelBadge,
  XPProgressBar,
  StreakDisplay,
  LevelsService,
} from '@/features/gamification';
import { GamificationService } from '@/features/gamification';

export default function DashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, checkSession, isLoading: authLoading } = useAuthStore();
  const { goals, isLoading, error, fetchGoals, getTotalSaved } =
    useGoalsStore();

  const [refreshing, setRefreshing] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [hasShownWelcome, setHasShownWelcome] = React.useState(false);
  const [gamificationStats, setGamificationStats] =
    React.useState<UserGamificationStats | null>(null);
  const [showGoalSelection, setShowGoalSelection] = React.useState(false);
  const [pendingSaveAmount, setPendingSaveAmount] = React.useState(0);

  // Usar useRef para rastrear si ya se cargaron las metas
  const goalsLoadedRef = useRef(false);
  const initializingRef = useRef(false);

  // Función para cargar estadísticas de gamificación
  const loadGamificationStats = async (userId: string) => {
    try {
      const stats = await GamificationService.getUserStats(userId);
      setGamificationStats(stats);
      logger.success(LogModule.UI, 'Estadísticas de gamificación cargadas');
    } catch (error) {
      logger.error(
        LogModule.UI,
        'Error cargando estadísticas de gamificación',
        error
      );
      // No mostrar error al usuario, usar valores por defecto
      setGamificationStats({
        totalXP: 0,
        level: 1,
        levelInfo: { level: 1, progress: 0, nextLevelXP: 4, currentLevelXP: 0 },
        streak: {
          current_streak: 0,
          max_streak: 0,
          last_activity_at: new Date().toISOString(),
          streak_protections_used: 0,
        },
        activeQuests: [],
      });
    }
  };

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
          await Promise.all([
            fetchGoals(updatedUser.id),
            loadGamificationStats(updatedUser.id),
          ]);
          logger.success(
            LogModule.UI,
            'Datos del usuario cargados exitosamente'
          );

          // Mostrar bienvenida para nuevos usuarios o usuarios que regresan
          if (!hasShownWelcome) {
            setTimeout(() => {
              const firstName = updatedUser.email?.split('@')[0] || '';
              ToastService.welcome(firstName);
              setHasShownWelcome(true);
            }, 1500);
          }
        }
      } catch (error) {
        logger.error(LogModule.UI, 'Error inicializando dashboard', error);
        goalsLoadedRef.current = false;
      } finally {
        setInitializing(false);
      }
    };

    initializeUser();
  }, [checkSession, fetchGoals, hasShownWelcome]);

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
    logger.info(LogModule.UI, 'Refrescando datos del dashboard');

    try {
      await Promise.all([
        fetchGoals(user.id, true),
        loadGamificationStats(user.id),
      ]);
      logger.success(LogModule.UI, 'Dashboard refrescado');
      ToastService.quickSuccess('Información actualizada');
    } catch (error: unknown) {
      logger.error(LogModule.UI, 'Error refrescando dashboard', error);
      ToastService.handleError(error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchGoals]);

  const handleQuickSave = async (amount: number) => {
    if (!user || goals.length === 0) {
      ToastService.warning(
        'Sin metas',
        'Crea una meta primero para poder ahorrar'
      );
      return;
    }

    // Si hay más de una meta, mostrar modal de selección
    if (goals.length > 1) {
      setPendingSaveAmount(amount);
      setShowGoalSelection(true);
      return;
    }

    // Si solo hay una meta, aplicar el ahorro directamente
    await applySavingToGoal(goals[0].id, amount);
  };

  const applySavingToGoal = async (goalId: string, amount: number) => {
    if (!user) return;

    try {
      const selectedGoal = goals.find((g) => g.id === goalId);
      if (!selectedGoal) {
        ToastService.error('Meta no encontrada');
        return;
      }

      ToastService.loading(`Ahorrando $${amount}...`);

      // 1. Crear contribución y actualizar saved_amount en la DB
      await GoalsService.addContribution({
        user_id: user.id,
        goal_id: goalId,
        amount,
        source: 'manual',
        description: 'Ahorro rápido desde dashboard',
      });

      // 2. Procesar evento de gamificación
      const gamificationResult =
        await GamificationService.processGamificationEvent(
          user.id,
          'contribution',
          { amount }
        );

      // 3. Actualizar datos del dashboard DESPUÉS de crear la contribución
      await Promise.all([
        fetchGoals(user.id, true), // Esto actualizará el monto ahorrado
        loadGamificationStats(user.id), // Esto actualizará el XP
      ]);

      // 4. Actualizar el estado local de gamificationStats inmediatamente
      if (gamificationResult.xpEarned > 0) {
        setGamificationStats((prevStats) => {
          if (!prevStats) return prevStats;
          const newTotalXP = prevStats.totalXP + gamificationResult.xpEarned;
          const newLevel = LevelsService.getLevel(newTotalXP);
          const newLevelInfo = LevelsService.getLevelProgress(newTotalXP);

          return {
            ...prevStats,
            totalXP: newTotalXP,
            level: newLevel,
            levelInfo: newLevelInfo,
          };
        });
      }

      // 5. Verificar desafíos de ahorro
      await ChallengesService.checkSavingsChallenges(user.id, amount);

      // 6. Mostrar toast de éxito con XP
      ToastService.savingSuccess(amount, selectedGoal.name);

      if (gamificationResult.xpEarned > 0) {
        setTimeout(() => {
          ToastService.quickSuccess(
            `+${gamificationResult.xpEarned} XP ganado!`
          );
        }, 1000);
      }

      if (gamificationResult.levelUp) {
        setTimeout(() => {
          ToastService.levelUp(gamificationResult.newLevel!);
        }, 2000);
      }

      logger.success(LogModule.UI, 'Ahorro rápido completado', {
        amount,
        goalName: selectedGoal.name,
      });
    } catch (error: unknown) {
      logger.error(LogModule.UI, 'Error en ahorro rápido', error);
      ToastService.handleError(error);
    }
  };

  const handleGoalSelection = (goalId: string) => {
    applySavingToGoal(goalId, pendingSaveAmount);
    setPendingSaveAmount(0);
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
    gamificationSection: {
      marginBottom: 24,
    },
    gamificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    levelContainer: {
      alignItems: 'center',
    },
    xpProgressContainer: {
      flex: 1,
      marginLeft: 16,
    },
    streakContainer: {
      marginTop: 16,
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
    quickSaveSection: {
      marginBottom: 24,
    },
    quickSaveButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    goalsSection: {
      marginBottom: 24,
    },
    goalCard: {
      marginBottom: 12,
    },
    goalCardContent: {
      padding: 16,
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
      flex: 1,
    },
    goalAmount: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    goalProgress: {
      marginTop: 8,
    },
    viewAllButton: {
      marginTop: 8,
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

        {gamificationStats && (
          <View style={styles.gamificationSection}>
            {/* Nivel y progreso de XP */}
            <Card>
              <View style={styles.gamificationHeader}>
                <View style={styles.levelContainer}>
                  <LevelBadge
                    level={gamificationStats.level}
                    size="large"
                    showLabel
                  />
                </View>

                <View style={styles.xpProgressContainer}>
                  <XPProgressBar
                    currentXP={gamificationStats.totalXP}
                    animated={true}
                    showLabels={true}
                  />
                </View>
              </View>

              {/* Racha */}
              <View style={styles.streakContainer}>
                <StreakDisplay
                  streak={gamificationStats.streak}
                  size="medium"
                  showProtections={true}
                />
              </View>
            </Card>
          </View>
        )}

        <View style={styles.statsRow}>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Nivel</Text>
            <Text style={styles.statValue}>
              {gamificationStats?.level || 1}
            </Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>XP Total</Text>
            <Text style={styles.statValue}>
              {gamificationStats?.totalXP || 0}
            </Text>
          </Card>
          <Card style={styles.statCard} padding="small">
            <Text style={styles.statLabel}>Ahorrado</Text>
            <Text style={styles.statValue}>${getTotalSaved().toFixed(0)}</Text>
          </Card>
        </View>

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

        {goals.length > 0 && (
          <View style={styles.goalsSection}>
            <View style={styles.goalHeader}>
              <Text style={styles.sectionTitle}>Mis metas activas</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                <Text style={{ color: theme.primary, fontSize: 14 }}>
                  Ver todas →
                </Text>
              </TouchableOpacity>
            </View>
            {goals.slice(0, 3).map((goal) => {
              const progress = (goal.savedAmount / goal.targetAmount) * 100;
              return (
                <Card key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalCardContent}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalName} numberOfLines={1}>
                        {goal.name}
                      </Text>
                      <Text style={styles.goalAmount}>
                        ${goal.savedAmount.toFixed(0)} / $
                        {goal.targetAmount.toFixed(0)}
                      </Text>
                    </View>
                    <View style={styles.goalProgress}>
                      <ProgressBar
                        progress={progress}
                        showLabel
                        color={progress >= 100 ? theme.success : theme.primary}
                      />
                    </View>
                  </View>
                </Card>
              );
            })}
            {goals.length > 3 && (
              <Button
                title={`Ver ${goals.length - 3} metas más`}
                variant="outline"
                onPress={() => router.push('/(tabs)/goals')}
                style={styles.viewAllButton}
              />
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          try {
            logger.info(LogModule.NAV, 'Navegando a crear meta desde FAB');
            router.push('/create-goal');
          } catch (error: unknown) {
            logger.error(
              LogModule.NAV,
              'Error navegando a crear meta desde FAB',
              error
            );
            ToastService.handleError(error);
          }
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <GoalSelectionModal
        visible={showGoalSelection}
        goals={goals}
        onClose={() => setShowGoalSelection(false)}
        onSelectGoal={handleGoalSelection}
        pendingAmount={pendingSaveAmount}
      />
    </SafeAreaView>
  );
}
