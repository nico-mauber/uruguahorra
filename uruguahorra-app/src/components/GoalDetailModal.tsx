import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { GoalsService } from '@/services/goals.service';
import { useAuthStore } from '@store/useAuthStore';
import { ToastService } from '@/utils/toast';
import { logger, LogModule } from '@/utils/logger';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
  category?: string;
  createdAt?: string;
}

interface Contribution {
  id: string;
  amount: number;
  source: string;
  created_at: string;
}

interface GoalDetailModalProps {
  visible: boolean;
  goal: Goal;
  onClose: () => void;
  onGoalUpdate?: () => void;
}

export const GoalDetailModal: React.FC<GoalDetailModalProps> = ({
  visible,
  goal,
  onClose,
  onGoalUpdate,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const screenHeight = Dimensions.get('window').height;

  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isLoadingContributions, setIsLoadingContributions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');

  useEffect(() => {
    if (visible && goal?.id) {
      loadContributions();
    }
  }, [visible, goal?.id]);

  const loadContributions = async () => {
    if (!goal?.id) return;

    setIsLoadingContributions(true);
    try {
      const data = await GoalsService.getGoalContributions(goal.id);
      setContributions(data);
    } catch (error) {
      logger.error(LogModule.UI, 'Error cargando contribuciones', error);
    } finally {
      setIsLoadingContributions(false);
    }
  };

  const handleDeleteGoal = () => {
    Alert.alert(
      'Eliminar meta',
      `¿Estás seguro de que quieres eliminar "${goal.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;

            setIsDeleting(true);
            try {
              await GoalsService.deleteGoal(goal.id, user.id);
              ToastService.success(
                'Meta eliminada',
                `"${goal.name}" ha sido eliminada`
              );
              onGoalUpdate?.();
              onClose();
            } catch (error) {
              logger.error(LogModule.UI, 'Error eliminando meta', error);
              ToastService.handleError(error);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const calculateProgress = () => {
    return Math.min(100, (goal.savedAmount / goal.targetAmount) * 100);
  };

  const calculateDaysLeft = () => {
    const days = Math.ceil(
      (new Date(goal.targetDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const calculateDailyRequired = () => {
    const daysLeft = calculateDaysLeft();
    const remaining = goal.targetAmount - goal.savedAmount;
    if (daysLeft <= 0) return 0;
    return remaining / daysLeft;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatContributionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'manual':
        return 'Manual';
      case 'roundup':
        return 'Redondeo';
      case 'automatic':
        return 'Automático';
      case 'challenge_reward':
        return 'Recompensa';
      default:
        return source;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'manual':
        return 'hand-left';
      case 'roundup':
        return 'sync';
      case 'automatic':
        return 'time';
      case 'challenge_reward':
        return 'trophy';
      default:
        return 'cash';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    content: {
      backgroundColor: theme.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: screenHeight * 0.9,
      paddingBottom: 20,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
      marginRight: 12,
    },
    closeButton: {
      padding: 8,
    },
    tabContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: 20,
    },
    activeTab: {
      backgroundColor: theme.primary + '20',
    },
    tabText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    activeTabText: {
      color: theme.primary,
      fontWeight: '600',
    },
    scrollContent: {
      padding: 20,
    },
    progressCard: {
      marginBottom: 16,
    },
    progressHeader: {
      marginBottom: 16,
    },
    progressValue: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    progressLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
      marginBottom: 16,
    },
    statItem: {
      width: '50%',
      padding: 8,
    },
    statCard: {
      padding: 12,
    },
    statIcon: {
      marginBottom: 8,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    historyContainer: {
      marginBottom: 16,
    },
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    historyIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    historyInfo: {
      flex: 1,
    },
    historyAmount: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
    },
    historySource: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    historyDate: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    emptyHistory: {
      padding: 40,
      alignItems: 'center',
    },
    emptyHistoryText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    actionButtons: {
      padding: 20,
      paddingTop: 0,
      gap: 12,
    },
    deleteButton: {
      marginTop: 8,
    },
    loadingContainer: {
      padding: 40,
      alignItems: 'center',
    },
  });

  const progress = calculateProgress();
  const daysLeft = calculateDaysLeft();
  const dailyRequired = calculateDailyRequired();
  const isCompleted = progress >= 100;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.container}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {goal.name}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'details' && styles.activeTab]}
              onPress={() => setActiveTab('details')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'details' && styles.activeTabText,
                ]}
              >
                Detalles
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'history' && styles.activeTabText,
                ]}
              >
                Historial
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent}>
            {activeTab === 'details' ? (
              <>
                <Card style={styles.progressCard}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressValue}>
                      ${goal.savedAmount.toFixed(0)}
                    </Text>
                    <Text style={styles.progressLabel}>
                      de ${goal.targetAmount.toFixed(0)} ahorrados
                    </Text>
                  </View>
                  <ProgressBar
                    progress={progress}
                    showLabel
                    color={isCompleted ? theme.success : theme.primary}
                  />
                </Card>

                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Card style={styles.statCard}>
                      <Ionicons
                        name="calendar"
                        size={24}
                        color={theme.primary}
                        style={styles.statIcon}
                      />
                      <Text style={styles.statValue}>
                        {daysLeft > 0 ? daysLeft : 0}
                      </Text>
                      <Text style={styles.statLabel}>Días restantes</Text>
                    </Card>
                  </View>

                  <View style={styles.statItem}>
                    <Card style={styles.statCard}>
                      <Ionicons
                        name="trending-up"
                        size={24}
                        color={theme.primary}
                        style={styles.statIcon}
                      />
                      <Text style={styles.statValue}>
                        ${dailyRequired.toFixed(0)}
                      </Text>
                      <Text style={styles.statLabel}>Diario requerido</Text>
                    </Card>
                  </View>

                  <View style={styles.statItem}>
                    <Card style={styles.statCard}>
                      <Ionicons
                        name="flag"
                        size={24}
                        color={theme.primary}
                        style={styles.statIcon}
                      />
                      <Text style={styles.statValue}>
                        {formatDate(goal.targetDate)}
                      </Text>
                      <Text style={styles.statLabel}>Fecha objetivo</Text>
                    </Card>
                  </View>

                  <View style={styles.statItem}>
                    <Card style={styles.statCard}>
                      <Ionicons
                        name="cash"
                        size={24}
                        color={theme.primary}
                        style={styles.statIcon}
                      />
                      <Text style={styles.statValue}>
                        ${(goal.targetAmount - goal.savedAmount).toFixed(0)}
                      </Text>
                      <Text style={styles.statLabel}>Monto restante</Text>
                    </Card>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <Button
                    title={isDeleting ? 'Eliminando...' : 'Eliminar meta'}
                    variant="outline"
                    onPress={handleDeleteGoal}
                    disabled={isDeleting}
                    style={styles.deleteButton}
                  />
                </View>
              </>
            ) : (
              <View style={styles.historyContainer}>
                {isLoadingContributions ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                ) : contributions.length === 0 ? (
                  <View style={styles.emptyHistory}>
                    <Ionicons
                      name="time-outline"
                      size={48}
                      color={theme.textSecondary}
                    />
                    <Text style={styles.emptyHistoryText}>
                      No hay contribuciones aún.{'\n'}
                      ¡Comienza a ahorrar para esta meta!
                    </Text>
                  </View>
                ) : (
                  contributions.map((contribution) => (
                    <View key={contribution.id} style={styles.historyItem}>
                      <View style={styles.historyIcon}>
                        <Ionicons
                          name={
                            getSourceIcon(
                              contribution.source
                            ) as keyof typeof Ionicons.glyphMap
                          }
                          size={20}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.historyInfo}>
                        <Text style={styles.historyAmount}>
                          +${contribution.amount.toFixed(0)}
                        </Text>
                        <Text style={styles.historySource}>
                          {getSourceLabel(contribution.source)}
                        </Text>
                      </View>
                      <Text style={styles.historyDate}>
                        {formatContributionDate(contribution.created_at)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
