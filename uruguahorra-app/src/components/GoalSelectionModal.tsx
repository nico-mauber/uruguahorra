import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';
import { ToastService } from '@/utils/toast';
import { GoalsService } from '@/services/goals.service';
import { useAuth } from '@/contexts';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate: string;
}

interface GoalSelectionModalProps {
  visible: boolean;
  goals: Goal[];
  onClose: () => void;
  onSelectGoal: (goalId: string, adjustedAmount?: number) => void;
  pendingAmount: number;
}

export const GoalSelectionModal: React.FC<GoalSelectionModalProps> = ({
  visible,
  goals,
  onClose,
  onSelectGoal,
  pendingAmount,
}) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const screenHeight = Dimensions.get('window').height;
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [newTargetAmount, setNewTargetAmount] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleGoalSelection = (goalId: string) => {
    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    // Verificar si la meta ya está completada
    if (goal.savedAmount >= goal.targetAmount) {
      Alert.alert(
        '🎯 Meta completada',
        `"${goal.name}" ya está completada. ¿Qué quieres hacer con $${pendingAmount}?`,
        [
          {
            text: 'Aumentar objetivo',
            onPress: () => {
              setEditingGoalId(goalId);
              setNewTargetAmount((goal.targetAmount + pendingAmount).toString());
            },
          },
          {
            text: 'Elegir otra meta',
            style: 'cancel',
          },
        ]
      );
      return;
    }

    const maxAllowed = goal.targetAmount - goal.savedAmount;

    if (pendingAmount > maxAllowed) {
      Alert.alert(
        'Monto excede el objetivo',
        `Esta meta solo necesita $${maxAllowed.toFixed(0)} más para completarse. ¿Qué deseas hacer?`,
        [
          {
            text: 'Ajustar monto',
            onPress: () => {
              // Ajustar al máximo permitido
              onSelectGoal(goalId, maxAllowed);
              onClose();
            },
          },
          {
            text: 'Editar objetivo',
            onPress: () => {
              setEditingGoalId(goalId);
              setNewTargetAmount(goal.targetAmount.toString());
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } else {
      onSelectGoal(goalId);
      onClose();
    }
  };

  const handleUpdateTarget = async (goalId: string) => {
    const newTarget = parseFloat(newTargetAmount);
    const goal = goals.find((g) => g.id === goalId);

    if (!goal || !user) return;

    if (isNaN(newTarget) || newTarget <= 0) {
      ToastService.warning('Monto inválido', 'Ingresa un monto válido');
      return;
    }

    if (newTarget < goal.savedAmount) {
      ToastService.warning(
        'Objetivo muy bajo',
        `El objetivo debe ser mayor a lo ya ahorrado ($${goal.savedAmount.toFixed(0)})`
      );
      return;
    }

    setIsUpdating(true);
    try {
      await GoalsService.updateGoal(goalId, {
        target_amount: newTarget,
      });

      ToastService.success('Objetivo actualizado');
      setEditingGoalId(null);
      setNewTargetAmount('');

      // Ahora aplicar el ahorro con el nuevo objetivo
      onSelectGoal(goalId);
      onClose();
    } catch (error) {
      ToastService.handleError(error);
    } finally {
      setIsUpdating(false);
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
      maxHeight: screenHeight * 0.8,
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
    },
    closeButton: {
      padding: 8,
    },
    amountContainer: {
      backgroundColor: theme.primary + '20',
      padding: 16,
      margin: 20,
      marginTop: 0,
      borderRadius: 12,
      alignItems: 'center',
    },
    amountLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    amountValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.primary,
    },
    scrollContent: {
      padding: 20,
      paddingTop: 0,
    },
    goalCard: {
      marginBottom: 16,
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
    goalInfo: {
      flex: 1,
    },
    goalName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    goalAmount: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    selectButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginLeft: 12,
    },
    selectButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    progressContainer: {
      marginTop: 8,
    },
    daysLeft: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 8,
    },
    emptyContainer: {
      padding: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    editContainer: {
      backgroundColor: theme.warning + '20',
      padding: 16,
      borderRadius: 8,
      marginTop: 8,
    },
    editTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    editInput: {
      height: 48,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 16,
      color: theme.text,
      backgroundColor: theme.surface,
      marginBottom: 12,
    },
    editButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    warningBadge: {
      backgroundColor: theme.warning + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    warningText: {
      fontSize: 12,
      color: theme.warning,
      fontWeight: '600',
    },
  });

  const calculateDaysLeft = (targetDate: string) => {
    const days = Math.ceil(
      (new Date(targetDate).getTime() - new Date().getTime()) /
        (1000 * 60 * 60 * 24)
    );
    return days > 0 ? `${days} días restantes` : 'Meta vencida';
  };

  const calculateProgress = (savedAmount: number, targetAmount: number) => {
    return Math.min(100, (savedAmount / targetAmount) * 100);
  };

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
            <Text style={styles.headerTitle}>Selecciona una meta</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Monto a ahorrar</Text>
            <Text style={styles.amountValue}>${pendingAmount}</Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            {goals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No tienes metas activas disponibles
                </Text>
              </View>
            ) : (
              goals.map((goal) => {
                const maxAllowed = goal.targetAmount - goal.savedAmount;
                const exceedsLimit = pendingAmount > maxAllowed;

                return (
                  <TouchableOpacity
                    key={goal.id}
                    onPress={() => handleGoalSelection(goal.id)}
                    activeOpacity={0.7}
                  >
                    <Card style={styles.goalCard}>
                      <View style={styles.goalCardContent}>
                        <View style={styles.goalHeader}>
                          <View style={styles.goalInfo}>
                            <Text style={styles.goalName}>{goal.name}</Text>
                            <Text style={styles.goalAmount}>
                              ${goal.savedAmount.toFixed(0)} / $
                              {goal.targetAmount.toFixed(0)}
                            </Text>
                            {exceedsLimit && (
                              <View style={styles.warningBadge}>
                                <Text style={styles.warningText}>
                                  Máx: ${maxAllowed.toFixed(0)}
                                </Text>
                              </View>
                            )}
                          </View>
                          <TouchableOpacity
                            style={styles.selectButton}
                            onPress={() => handleGoalSelection(goal.id)}
                          >
                            <Text style={styles.selectButtonText}>
                              Seleccionar
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.progressContainer}>
                          <ProgressBar
                            progress={calculateProgress(
                              goal.savedAmount,
                              goal.targetAmount
                            )}
                            showLabel
                            color={theme.primary}
                          />
                        </View>

                        <Text style={styles.daysLeft}>
                          {calculateDaysLeft(goal.targetDate)}
                        </Text>

                        {editingGoalId === goal.id && (
                          <View style={styles.editContainer}>
                            <Text style={styles.editTitle}>
                              Editar objetivo de la meta
                            </Text>
                            <TextInput
                              style={styles.editInput}
                              placeholder="Nuevo objetivo"
                              placeholderTextColor={theme.textSecondary}
                              value={newTargetAmount}
                              onChangeText={setNewTargetAmount}
                              keyboardType="numeric"
                              autoFocus
                            />
                            <View style={styles.editButtons}>
                              <Button
                                title="Cancelar"
                                variant="outline"
                                onPress={() => {
                                  setEditingGoalId(null);
                                  setNewTargetAmount('');
                                }}
                                style={{ flex: 1 }}
                              />
                              <Button
                                title={
                                  isUpdating ? 'Actualizando...' : 'Actualizar'
                                }
                                variant="primary"
                                onPress={() => handleUpdateTarget(goal.id)}
                                disabled={isUpdating}
                                style={{ flex: 1 }}
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
