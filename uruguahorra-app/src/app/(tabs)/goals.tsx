import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Card, ProgressBar, Button } from '@components';
import { GoalDetailModal } from '@/components/GoalDetailModal';
import { useTheme } from '@theme';
import { useAuth } from '@/contexts';
import { useGoalsStore } from '@store/useGoalsStore';
import { Ionicons } from '@expo/vector-icons';
import { logger, LogModule } from '@/utils/logger';
import { ToastService } from '@/utils/toast';

export default function GoalsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { goals, isLoading, fetchGoals, getGoalProgress, getTotalSaved } =
    useGoalsStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<{
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    targetDate: string;
    category?: string;
  } | null>(null);
  const [showGoalDetail, setShowGoalDetail] = useState(false);

  // Animaciones para las cards
  const fadeAnims = React.useRef(
    goals.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (user?.id) {
      fetchGoals(user.id);
    }
  }, [user?.id, fetchGoals]);

  useEffect(() => {
    // Animar la entrada de las cards
    goals.forEach((_, index) => {
      Animated.timing(fadeAnims[index] || new Animated.Value(0), {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        useNativeDriver: true,
      }).start();
    });
  }, [goals, fadeAnims]);

  const onRefresh = React.useCallback(async () => {
    if (!user?.id) return;

    setRefreshing(true);
    try {
      await fetchGoals(user.id, true);
      ToastService.quickSuccess('Metas actualizadas');
    } catch (error) {
      logger.error(LogModule.UI, 'Error refrescando metas', error);
      ToastService.handleError(error);
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, fetchGoals]);

  const handleGoalPress = (goal: {
    id: string;
    name: string;
    targetAmount: number;
    savedAmount: number;
    targetDate: string;
    category?: string;
  }) => {
    setSelectedGoal(goal);
    setShowGoalDetail(true);
  };

  const calculateDaysLeft = (targetDate: string) => {
    const days = Math.ceil(
      (new Date(targetDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const getGoalIcon = (category?: string) => {
    switch (category) {
      case 'emergency':
        return 'shield-checkmark';
      case 'travel':
        return 'airplane';
      case 'debt':
        return 'card';
      case 'purchase':
        return 'cart';
      default:
        return 'flag';
    }
  };

  const getGoalColor = (progress: number) => {
    if (progress >= 100) return theme.success;
    if (progress >= 75) return theme.primary;
    if (progress >= 50) return theme.warning;
    return theme.textSecondary;
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      padding: 20,
      paddingBottom: 10,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    statsContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingBottom: 20,
      gap: 12,
    },
    statCard: {
      flex: 1,
    },
    statCardContent: {
      alignItems: 'center',
      padding: 16,
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 0,
    },
    goalCard: {
      marginBottom: 16,
      overflow: 'hidden',
    },
    goalCardContent: {
      padding: 16,
    },
    goalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    goalInfo: {
      flex: 1,
      marginRight: 12,
    },
    goalName: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    goalCategory: {
      fontSize: 12,
      color: theme.textSecondary,
      textTransform: 'capitalize',
    },
    goalIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
    },
    amountsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    amountColumn: {
      flex: 1,
    },
    amountLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 2,
    },
    amountValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    progressSection: {
      marginBottom: 12,
    },
    footerContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    daysLeft: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    completedBadge: {
      backgroundColor: theme.success + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    completedText: {
      fontSize: 12,
      color: theme.success,
      fontWeight: '600',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 40,
    },
    emptyIcon: {
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
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
  });

  if (isLoading && goals.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const activeGoals = goals.filter((g) => g.isActive !== false);
  const completedGoals = goals.filter(
    (g) => getGoalProgress(g.id) >= 100
  ).length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Metas</Text>
        <Text style={styles.headerSubtitle}>
          Administra y sigue el progreso de tus objetivos de ahorro
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <Card style={styles.statCard} padding="none">
          <View style={styles.statCardContent}>
            <Text style={styles.statValue}>{activeGoals.length}</Text>
            <Text style={styles.statLabel}>Metas Activas</Text>
          </View>
        </Card>
        <Card style={styles.statCard} padding="none">
          <View style={styles.statCardContent}>
            <Text style={styles.statValue}>${getTotalSaved().toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Ahorrado</Text>
          </View>
        </Card>
        <Card style={styles.statCard} padding="none">
          <View style={styles.statCardContent}>
            <Text style={styles.statValue}>{completedGoals}</Text>
            <Text style={styles.statLabel}>Completadas</Text>
          </View>
        </Card>
      </View>

      <ScrollView
        contentContainerStyle={
          activeGoals.length === 0 ? { flex: 1 } : styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
      >
        {activeGoals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="flag-outline"
              size={64}
              color={theme.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>No tienes metas activas</Text>
            <Text style={styles.emptyText}>
              Crea tu primera meta de ahorro y comienza a construir tu futuro
              financiero
            </Text>
            <Button
              title="Crear mi primera meta"
              onPress={() => router.push('/create-goal')}
              variant="primary"
            />
          </View>
        ) : (
          activeGoals.map((goal, index) => {
            const progress = getGoalProgress(goal.id);
            const daysLeft = calculateDaysLeft(goal.targetDate);
            const isCompleted = progress >= 100;

            return (
              <Animated.View
                key={goal.id}
                style={{
                  opacity: fadeAnims[index] || 1,
                  transform: [
                    {
                      translateY: (
                        fadeAnims[index] || new Animated.Value(0)
                      ).interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  onPress={() => handleGoalPress(goal)}
                  activeOpacity={0.7}
                >
                  <Card style={styles.goalCard}>
                    <View style={styles.goalCardContent}>
                      <View style={styles.goalHeader}>
                        <View style={styles.goalInfo}>
                          <Text style={styles.goalName}>{goal.name}</Text>
                          {goal.category && (
                            <Text style={styles.goalCategory}>
                              {goal.category}
                            </Text>
                          )}
                        </View>
                        <View
                          style={[
                            styles.goalIcon,
                            {
                              backgroundColor: getGoalColor(progress) + '20',
                            },
                          ]}
                        >
                          <Ionicons
                            name={
                              getGoalIcon(
                                goal.category
                              ) as keyof typeof Ionicons.glyphMap
                            }
                            size={24}
                            color={getGoalColor(progress)}
                          />
                        </View>
                      </View>

                      <View style={styles.amountsContainer}>
                        <View style={styles.amountColumn}>
                          <Text style={styles.amountLabel}>Ahorrado</Text>
                          <Text style={styles.amountValue}>
                            ${goal.savedAmount.toFixed(0)}
                          </Text>
                        </View>
                        <View style={styles.amountColumn}>
                          <Text style={styles.amountLabel}>Meta</Text>
                          <Text style={styles.amountValue}>
                            ${goal.targetAmount.toFixed(0)}
                          </Text>
                        </View>
                        <View style={styles.amountColumn}>
                          <Text style={styles.amountLabel}>Restante</Text>
                          <Text style={styles.amountValue}>
                            ${(goal.targetAmount - goal.savedAmount).toFixed(0)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.progressSection}>
                        <ProgressBar
                          progress={progress}
                          showLabel
                          color={getGoalColor(progress)}
                        />
                      </View>

                      <View style={styles.footerContainer}>
                        {isCompleted ? (
                          <View style={styles.completedBadge}>
                            <Text style={styles.completedText}>
                              ✓ Completada
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.daysLeft}>
                            {daysLeft > 0
                              ? `${daysLeft} días restantes`
                              : 'Meta vencida'}
                          </Text>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={theme.textSecondary}
                        />
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => {
          try {
            logger.info(LogModule.NAV, 'Navegando a crear meta desde Goals');
            router.push('/create-goal');
          } catch (error) {
            logger.error(
              LogModule.NAV,
              'Error navegando a crear meta desde Goals',
              error
            );
            ToastService.handleError(error);
          }
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {selectedGoal && (
        <GoalDetailModal
          visible={showGoalDetail}
          goal={selectedGoal}
          onClose={() => {
            setShowGoalDetail(false);
            setSelectedGoal(null);
          }}
          onGoalUpdate={() => {
            if (user?.id) {
              fetchGoals(user.id, true);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
