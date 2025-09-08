import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuickTransactionModal } from './QuickTransactionModal';
import { VoiceTransactionModal } from './VoiceTransactionModal';
import { useTransactionsStore } from '@/store/useTransactionsStore';

const { width, height } = Dimensions.get('window');

interface TransactionFABProps {
  userId: string;
  onTransactionCreated?: (transaction: any) => void;
  showGoalOption?: boolean;
}

/**
 * TransactionFAB - Botón flotante inteligente para crear transacciones
 *
 * Características psicológicas:
 * - Posición thumb-friendly (bottom right, 16px margin)
 * - Color verde para refuerzo positivo
 * - Animaciones de engagement
 * - Respuesta háptica
 * - Quick actions basadas en frecuencia
 */
export const TransactionFAB: React.FC<TransactionFABProps> = ({
  userId,
  onTransactionCreated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [quickActionType, setQuickActionType] = useState<
    'expense' | 'income' | 'voice' | null
  >(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const { frequentTransactions, fetchFrequentTransactions } =
    useTransactionsStore();

  // Animaciones
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    // Cargar transacciones frecuentes para quick actions
    fetchFrequentTransactions(userId);
  }, [userId]);

  const handleMainPress = () => {
    // Animación de feedback inmediato
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (isExpanded) {
      collapseMenu();
    } else {
      expandMenu();
    }
  };

  const expandMenu = () => {
    setIsExpanded(true);

    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(expandAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const collapseMenu = () => {
    Animated.parallel([
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(expandAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsExpanded(false);
    });
  };

  const handleQuickAction = (type: 'expense' | 'income' | 'voice') => {
    setQuickActionType(type);
    if (type === 'voice') {
      setShowVoiceModal(true);
    } else {
      setShowModal(true);
    }
    collapseMenu();
  };

  const handleFrequentTransactionPress = (transaction: any) => {
    // TODO: Pre-llenar modal con datos de transacción frecuente
    setShowModal(true);
    collapseMenu();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setShowVoiceModal(false);
    setQuickActionType(null);
  };

  const handleTransactionCreated = (transaction: any) => {
    setShowModal(false);
    setShowVoiceModal(false);
    setQuickActionType(null);
    onTransactionCreated?.(transaction);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '135deg'],
  });

  const quickActionScale = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Create separate interpolations for each button's position with better spacing
  const voiceTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -95],
  });

  const incomeTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -112],
  });

  const expenseTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -125],
  });

  const frequentActionTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -300],
  });

  return (
    <>
      {/* Overlay para cerrar menu */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={collapseMenu}
        />
      )}

      {/* Quick Actions */}
      {isExpanded && (
        <View style={styles.quickActionsContainer}>
          {/* Transacciones frecuentes */}
          {frequentTransactions.slice(0, 3).map((transaction, index) => (
            <Animated.View
              key={`frequent-${index}`}
              style={[
                styles.quickActionWrapper,
                {
                  transform: [
                    { scale: quickActionScale },
                    {
                      translateY: frequentActionTranslateY.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -300 - index * 70],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.quickActionButton, styles.frequentActionButton]}
                onPress={() => handleFrequentTransactionPress(transaction)}
              >
                <Text style={styles.frequentEmoji}>
                  {transaction.category_emoji}
                </Text>
                <Text style={styles.frequentAmount}>
                  ${transaction.avg_amount}
                </Text>
              </TouchableOpacity>
              <Text style={styles.quickActionLabel} numberOfLines={1}>
                {transaction.description}
              </Text>
            </Animated.View>
          ))}

          {/* Botón de audio (voz) */}
          <Animated.View
            style={[
              styles.quickActionWrapper,
              {
                transform: [
                  { scale: quickActionScale },
                  {
                    translateY: voiceTranslateY,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.quickActionButton, styles.voiceButton]}
              onPress={() => handleQuickAction('voice')}
            >
              <Ionicons name="mic" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quickActionLabel}>Voz</Text>
          </Animated.View>

          {/* Ingreso rápido */}
          <Animated.View
            style={[
              styles.quickActionWrapper,
              {
                transform: [
                  { scale: quickActionScale },
                  {
                    translateY: incomeTranslateY,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.quickActionButton, styles.incomeButton]}
              onPress={() => handleQuickAction('income')}
            >
              <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quickActionLabel}>Ingreso</Text>
          </Animated.View>

          {/* Gasto rápido */}
          <Animated.View
            style={[
              styles.quickActionWrapper,
              {
                transform: [
                  { scale: quickActionScale },
                  {
                    translateY: expenseTranslateY,
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.quickActionButton, styles.expenseButton]}
              onPress={() => handleQuickAction('expense')}
            >
              <Ionicons name="arrow-down" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.quickActionLabel}>Gasto</Text>
          </Animated.View>
        </View>
      )}

      {/* Main FAB */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.fab}
          onPress={handleMainPress}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.fabGradient,
              {
                transform: [{ rotate: rotation }],
              },
            ]}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Modal de transacción rápida */}
      <QuickTransactionModal
        visible={showModal}
        userId={userId}
        initialType={quickActionType}
        onClose={handleModalClose}
        onTransactionCreated={handleTransactionCreated}
      />

      {/* Modal de transacción por voz */}
      <VoiceTransactionModal
        visible={showVoiceModal}
        userId={userId}
        onClose={handleModalClose}
        onTransactionCreated={handleTransactionCreated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    zIndex: 998,
  },

  quickActionsContainer: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },

  quickActionWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },

  quickActionButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },

  expenseButton: {
    backgroundColor: '#FF5252',
  },

  incomeButton: {
    backgroundColor: '#4CAF50',
  },

  voiceButton: {
    backgroundColor: '#9C27B0',
  },

  frequentActionButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'column',
  },

  frequentEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },

  frequentAmount: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  quickActionLabel: {
    marginTop: 6,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
    maxWidth: 70,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    zIndex: 1000,
  },

  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },

  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#51CF66',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
