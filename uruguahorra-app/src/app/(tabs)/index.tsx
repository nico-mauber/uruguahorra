import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Button,
  Card,
  ProgressBar,
  PodsList,
  TransactionFAB,
} from '@components';
import { GoalSelectionModal } from '@/components/GoalSelectionModal';
import { GoalDetailModal } from '@/components/GoalDetailModal';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';
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
// import { useAnalytics } from '@/hooks/useAnalytics';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { goals, isLoading, error, fetchGoals, getTotalSaved } =
    useGoalsStore();
  // const analytics = useAnalytics(); // No usado por ahora

  // Feature flags - Pods always enabled
  const isPodsAhorroEnabled = true;

  const [refreshing, setRefreshing] = React.useState(false);
  const [initializing, setInitializing] = React.useState(true);
  const [hasShownWelcome, setHasShownWelcome] = React.useState(false);
  const [gamificationStats, setGamificationStats] =
    React.useState<UserGamificationStats | null>(null);
  const [showGoalSelection, setShowGoalSelection] = React.useState(false);
  const [pendingSaveAmount, setPendingSaveAmount] = React.useState(0);
  const [manualAmount, setManualAmount] = React.useState('');
  const [showManualInput, setShowManualInput] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [selectedGoalForDetail, setSelectedGoalForDetail] = React.useState<any>(null);
  const [showGoalDetail, setShowGoalDetail] = React.useState(false);

  // Usar useRef para rastrear si ya se cargaron las metas
  const goalsLoadedRef = useRef(false);
  const initializingRef = useRef(false);

  // Handler para nueva transacción
  const handleTransactionCreated = (transaction: unknown) => {
    logger.success(LogModule.UI, 'Nueva transacción creada', { transaction });
    ToastService.quickSuccess('Transacción registrada exitosamente');

    // Refrescar datos si es necesario
    if (user?.id) {
      // Pequeño delay para que la transacción se procese
      setTimeout(() => {
        onRefresh();
      }, 500);
    }
  };

  // Función optimizada para cargar estadísticas de gamificación (SOLO cuando sea necesario)
  const loadGamificationStats = async (
    userId: string,
    skipQuests: boolean = false // REVERTIDO: Intentar cargar quests con inicialización robusta
  ) => {
    try {
      // SOLUCIÓN DE RAÍZ: Cargar stats completas con inicialización robusta de quests
      const stats = await GamificationService.getUserBasicStats(userId, {
        skipQuests,
      });
      setGamificationStats(stats);
      logger.success(
        LogModule.UI,
        'Estadísticas de gamificación cargadas completamente'
      );
    } catch (error) {
      logger.error(
        LogModule.UI,
        'Error cargando estadísticas de gamificación',
        error
      );
      throw error; // REVERTIDO: Propagar error en lugar de ocultarlo con valores por defecto
    }
  };

  // Inicializar dashboard una sola vez
  useEffect(() => {
    if (initializingRef.current) return;

    initializingRef.current = true;
    logger.info(LogModule.UI, 'Inicializando dashboard');

    const initializeUser = async () => {
      try {
        // AuthProvider se encarga automáticamente de la sesión
        if (user?.id && !goalsLoadedRef.current) {
          goalsLoadedRef.current = true;
          await Promise.all([
            fetchGoals(user.id),
            loadGamificationStats(user.id),
          ]);
          logger.success(
            LogModule.UI,
            'Datos del usuario cargados exitosamente'
          );

          // Mostrar bienvenida para nuevos usuarios o usuarios que regresan
          if (!hasShownWelcome) {
            setTimeout(() => {
              const firstName = user.email?.split('@')[0] || '';
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
  }, [fetchGoals, hasShownWelcome, user]);

  // Redirigir si no hay usuario (debe estar ANTES de cualquier return condicional)
  useEffect(() => {
    // Solo redirigir si definitivamente no hay usuario y no estamos cargando
    if (!initializing && !authLoading && !user) {
      logger.warn(LogModule.NAV, 'No hay usuario, redirigiendo a onboarding');
      // Pequeño delay para evitar conflictos con la navegación principal
      setTimeout(() => {
        router.replace('/(auth)/simple-onboarding');
      }, 200);
    }
  }, [initializing, authLoading, user, router]);

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
    // Prevenir múltiples clics mientras se procesa el ahorro
    if (isSaving) {
      logger.warn(LogModule.UI, 'Intento de ahorro duplicado bloqueado');
      return;
    }

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

    // Si solo hay una meta, validar que no exceda el límite
    const goal = goals[0];

    // Validar si la meta ya está completada
    if (goal.savedAmount >= goal.targetAmount) {
      ToastService.warning(
        '🎯 Meta completada',
        `"${goal.name}" ya está completada. Ve al detalle de la meta para aumentar el objetivo o crea una nueva meta.`
      );
      return;
    }

    const maxAllowed = goal.targetAmount - goal.savedAmount;

    if (amount > maxAllowed) {
      ToastService.warning(
        'Monto excede el objetivo',
        `El máximo permitido es $${maxAllowed.toFixed(0)}`
      );
      setPendingSaveAmount(amount);
      setShowGoalSelection(true);
      return;
    }

    // Si solo hay una meta y el monto es válido, aplicar el ahorro directamente
    await applySavingToGoal(goals[0].id, amount);
  };

  const handleManualSave = () => {
    const amount = parseFloat(manualAmount);

    if (isNaN(amount) || amount <= 0) {
      ToastService.warning(
        'Monto inválido',
        'Ingresa un monto válido mayor a 0'
      );
      return;
    }

    setManualAmount('');
    setShowManualInput(false);
    Keyboard.dismiss();
    handleQuickSave(amount);
  };

  const applySavingToGoal = async (goalId: string, amount: number) => {
    if (!user) return;

    // Prevenir múltiples ejecuciones concurrentes
    if (isSaving) {
      logger.warn(LogModule.UI, 'Operación de ahorro ya en progreso');
      return;
    }

    try {
      setIsSaving(true); // Marcar como en progreso

      const selectedGoal = goals.find((g) => g.id === goalId);
      if (!selectedGoal) {
        ToastService.error('Meta no encontrada');
        return;
      }

      // Validar que el monto no exceda el objetivo
      const maxAllowed = selectedGoal.targetAmount - selectedGoal.savedAmount;

      // Si la meta ya está completada (savedAmount >= targetAmount)
      if (selectedGoal.savedAmount >= selectedGoal.targetAmount) {
        ToastService.warning(
          '🎯 Meta ya completada',
          `"${selectedGoal.name}" ya está completada. ¿Quieres crear una nueva meta o aumentar el objetivo de esta?`
        );
        return;
      }

      if (amount > maxAllowed) {
        ToastService.error(
          'Monto excede el objetivo',
          `El máximo permitido para esta meta es $${maxAllowed.toFixed(0)}`
        );
        return;
      }

      ToastService.loading(`Ahorrando $${amount}...`);

      // 1. Crear contribución (el trigger de la BD actualizará saved_amount automáticamente)
      await GoalsService.addContribution({
        user_id: user.id,
        goal_id: goalId,
        amount,
        source: 'manual',
        description: 'Ahorro rápido desde dashboard',
      });

      // 2. OPTIMIZACIÓN CRÍTICA: Usar el servicio ultra-optimizado
      // Solo otorga XP y calcula nivel, sin toda la cascada de gamificación
      const { OptimizedGamificationService } = await import(
        '@/features/gamification/optimized.service'
      );
      const gamificationResult =
        await OptimizedGamificationService.processContributionOptimized(
          user.id,
          amount
        );

      // NUEVA FUNCIONALIDAD: Actualizar racha después de contribución
      let updatedStreak = null;
      try {
        const { StreaksService } = await import(
          '@/features/gamification/services/streaks.service'
        );
        updatedStreak = await StreaksService.updateStreak(user.id);
        logger.success(
          LogModule.UI,
          'Racha actualizada después de contribución',
          { updatedStreak }
        );
      } catch (error) {
        logger.warn(
          LogModule.UI,
          'Error actualizando racha, continuando',
          error
        );
      }

      // 3. OPTIMIZACIÓN: Solo recargar goals, las stats se actualizan localmente
      await fetchGoals(user.id, true);

      // 4. Actualizar el estado local de gamificationStats inmediatamente SIN recargar
      setGamificationStats((prevStats) => {
        if (!prevStats) return prevStats;

        const newTotalXP =
          prevStats.totalXP + (gamificationResult.xpEarned || 0);
        const newLevel = LevelsService.getLevel(newTotalXP);
        const newLevelInfo = LevelsService.getLevelProgress(newTotalXP);

        return {
          ...prevStats,
          totalXP: newTotalXP,
          level: newLevel,
          levelInfo: newLevelInfo,
          // Actualizar racha si se obtuvo
          ...(updatedStreak && {
            streak: {
              current_streak: updatedStreak.current_streak,
              longest_streak: updatedStreak.longest_streak,
              last_activity_at: updatedStreak.last_activity_at,
              streak_protections_used: updatedStreak.streak_protections_used,
              protection_reset_date: updatedStreak.protection_reset_date,
              id: updatedStreak.id,
              user_id: updatedStreak.user_id,
              created_at: updatedStreak.created_at,
              updated_at: updatedStreak.updated_at,
            },
          }),
        };
      });

      // 5. Las contribuciones ya no están ligadas a retos
      // Los retos requieren check-in manual diario desde la pestaña Retos

      // 6. También verificar desafíos de ahorro del sistema legacy (compatibilidad)
      await ChallengesService.checkSavingsChallenges(user.id, amount);

      // 7. Mostrar toast de éxito con XP
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
    } finally {
      setIsSaving(false); // Liberar el bloqueo al finalizar
    }
  };

  const handleGoalSelection = (goalId: string, adjustedAmount?: number) => {
    // Prevenir múltiples selecciones mientras se procesa
    if (isSaving) {
      logger.warn(
        LogModule.UI,
        'Selección de meta bloqueada - ahorro en progreso'
      );
      return;
    }

    const amountToSave = adjustedAmount ?? pendingSaveAmount;
    applySavingToGoal(goalId, amountToSave);
    setPendingSaveAmount(0);
  };

  const handleGoalCardPress = (goal: any) => {
    setSelectedGoalForDetail(goal);
    setShowGoalDetail(true);
  };

  const handleGoalDetailClose = () => {
    setShowGoalDetail(false);
    setSelectedGoalForDetail(null);
  };

  const handleGoalUpdate = async () => {
    if (user?.id) {
      await fetchGoals(user.id, true);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
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
      color: colors.text.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 16,
      color: colors.text.secondary,
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
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    statCard: {
      flex: 1,
      marginHorizontal: 4,
      paddingVertical: 8,
      paddingHorizontal: 8,
    },
    statLabel: {
      fontSize: 11,
      color: colors.text.secondary,
      marginBottom: 2,
      textAlign: 'center',
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text.primary,
      textAlign: 'center',
    },
    statUnit: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: 16,
    },
    quickSaveSection: {
      marginBottom: 24,
    },
    quickSaveMainButton: {
      marginTop: 8,
      minHeight: 56,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
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
      color: colors.text.primary,
      flex: 1,
    },
    goalAmount: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    goalProgress: {
      marginTop: 8,
    },
    viewAllButton: {
      marginTop: 8,
    },
    manualInputContainer: {
      marginTop: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border.primary,
    },
    manualInputHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    manualInputTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.primary,
    },
    manualInputClose: {
      padding: 4,
    },
    manualInput: {
      height: 56,
      borderWidth: 2,
      borderColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      backgroundColor: colors.background,
      textAlign: 'center',
      marginBottom: 12,
    },
    manualInputButtons: {
      flexDirection: 'row',
      gap: 12,
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
      color: colors.text.secondary,
    },
    errorContainer: {
      padding: 16,
      backgroundColor: colors.error + '20',
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
    },
    // Pods Section Styles
    podsSection: {
      marginTop: 24,
      marginBottom: 16,
    },
    sectionHeader: {
      marginBottom: 12,
    },
    sectionSubtitle: {
      fontSize: 14,
      marginTop: 4,
    },
    podCard: {
      marginBottom: 8,
    },
    podContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    podInfo: {
      flex: 1,
      marginRight: 16,
    },
    podTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    podDescription: {
      fontSize: 14,
      marginBottom: 8,
    },
    podProgress: {
      marginTop: 4,
    },
    podProgressText: {
      fontSize: 12,
      marginTop: 4,
    },
    joinPodButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    joinPodButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    featureFlagNote: {
      fontSize: 12,
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
    },
    // Estilos para el botón de transacciones
    transactionsSection: {
      marginBottom: 24,
    },
    transactionsButton: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    transactionButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    transactionButtonIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    transactionButtonText: {
      flex: 1,
    },
    transactionButtonTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#FFFFFF',
      marginBottom: 2,
    },
    transactionButtonSubtitle: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.8)',
    },
  });

  // Mostrar loading mientras se inicializa el usuario o se cargan las metas
  if (initializing || authLoading || (isLoading && goals.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {initializing ? 'Verificando sesión...' : 'Cargando tus metas...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirigir si no hay usuario
  if (!initializing && !user) {
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
            colors={[colors.primary]}
            tintColor={colors.primary}
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
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Nivel</Text>
            <Text style={styles.statValue}>
              {gamificationStats?.level || 1}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>XP Total</Text>
            <Text style={styles.statValue}>
              {gamificationStats?.totalXP || 0}
            </Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Ahorrado</Text>
            <Text style={styles.statValue}>${getTotalSaved().toFixed(0)}</Text>
          </Card>
        </View>

        {/* Botón de Transacciones */}
        <View style={styles.transactionsSection}>
          <TouchableOpacity
            style={styles.transactionsButton}
            onPress={() => router.push('/transactions')}
            activeOpacity={0.7}
          >
            <View style={styles.transactionButtonContent}>
              <View style={styles.transactionButtonIcon}>
                <Ionicons name="receipt" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.transactionButtonText}>
                <Text style={styles.transactionButtonTitle}>
                  Ver Transacciones
                </Text>
                <Text style={styles.transactionButtonSubtitle}>
                  Ingresos y gastos detallados
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {goals.length > 0 && (
          <View style={styles.quickSaveSection}>
            <Text style={styles.sectionTitle}>
              Ahorro rápido para tus metas
            </Text>

            {!showManualInput ? (
              <Button
                title="💵 Ingresa tu monto"
                variant="primary"
                onPress={() => setShowManualInput(true)}
                style={styles.quickSaveMainButton}
                disabled={isSaving}
              />
            ) : (
              <View style={styles.manualInputContainer}>
                <View style={styles.manualInputHeader}>
                  <Text style={styles.manualInputTitle}>
                    Monto personalizado
                  </Text>
                  <TouchableOpacity
                    style={styles.manualInputClose}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualAmount('');
                      Keyboard.dismiss();
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={{ position: 'relative' }}>
                  <Text
                    style={{
                      position: 'absolute',
                      left: 16,
                      top: 16,
                      fontSize: 20,
                      fontWeight: '600',
                      color: manualAmount
                        ? colors.text.primary
                        : colors.text.secondary,
                      zIndex: 1,
                    }}
                  >
                    $
                  </Text>
                  <TextInput
                    style={[styles.manualInput, { paddingLeft: 36 }]}
                    placeholder="0"
                    placeholderTextColor={colors.text.secondary}
                    value={manualAmount}
                    onChangeText={(text) => {
                      // Solo permitir números
                      const cleaned = text.replace(/[^0-9]/g, '');
                      setManualAmount(cleaned);
                    }}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={handleManualSave}
                    autoFocus
                  />
                </View>

                <View style={styles.manualInputButtons}>
                  <Button
                    title="Cancelar"
                    variant="outline"
                    onPress={() => {
                      setShowManualInput(false);
                      setManualAmount('');
                      Keyboard.dismiss();
                    }}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title={isSaving ? "Ahorrando..." : "Ahorrar"}
                    variant="primary"
                    onPress={handleManualSave}
                    style={{ flex: 1 }}
                    disabled={!manualAmount || manualAmount === '0' || isSaving}
                    loading={isSaving}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {goals.length > 0 && (
          <View style={styles.goalsSection}>
            <View style={styles.goalHeader}>
              <Text style={styles.sectionTitle}>Mis metas activas</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/goals')}>
                <Text style={{ color: colors.primary, fontSize: 14 }}>
                  Ver todas →
                </Text>
              </TouchableOpacity>
            </View>
            {goals.slice(0, 3).map((goal) => {
              const progress = (goal.savedAmount / goal.targetAmount) * 100;
              return (
                <TouchableOpacity
                  key={goal.id}
                  onPress={() => handleGoalCardPress(goal)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.goalCard}>
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
                          color={
                            progress >= 100 ? colors.success : colors.primary
                          }
                        />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
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

        {/* Pods de Ahorro Section - Funcional */}
        {isPodsAhorroEnabled && <PodsList />}
      </ScrollView>

      {/* TransactionFAB - Sistema completo de transacciones */}
      {user && (
        <TransactionFAB
          userId={user.id}
          onTransactionCreated={handleTransactionCreated}
          showGoalOption={true}
        />
      )}

      <GoalSelectionModal
        visible={showGoalSelection}
        goals={goals}
        onClose={() => setShowGoalSelection(false)}
        onSelectGoal={handleGoalSelection}
        pendingAmount={pendingSaveAmount}
      />

      {selectedGoalForDetail && (
        <GoalDetailModal
          visible={showGoalDetail}
          goal={selectedGoalForDetail}
          onClose={handleGoalDetailClose}
          onGoalUpdate={handleGoalUpdate}
        />
      )}
    </SafeAreaView>
  );
}
