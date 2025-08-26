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
import { useTransactionsStore } from '@/store/useTransactionsStore';

const { width, height } = Dimensions.get('window');

interface TransactionFABProps {
  userId: string;
  onTransactionCreated?: (transaction: any) => void;
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
    'expense' | 'income' | null
  >(null);

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

  const handleQuickAction = (type: 'expense' | 'income') => {
    setQuickActionType(type);
    setShowModal(true);
    collapseMenu();
  };

  const handleFrequentTransactionPress = (transaction: any) => {
    // TODO: Pre-llenar modal con datos de transacción frecuente
    setShowModal(true);
    collapseMenu();
  };

  const handleModalClose = () => {
    setShowModal(false);
    setQuickActionType(null);
  };

  const handleTransactionCreated = (transaction: any) => {
    setShowModal(false);
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

  const quickActionTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -80],
  });

  const frequentActionTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -140],
  });

  return (
    <>
      {/* Overlay para cerrar menu */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={collapseMenu}
        >
          <BlurView intensity={20} style={StyleSheet.absoluteFill} />
        </TouchableOpacity>
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
                        outputRange: [0, -140 - index * 60],
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

          {/* Ingreso rápido */}
          <Animated.View
            style={[
              styles.quickActionWrapper,
              {
                transform: [
                  { scale: quickActionScale },
                  { translateY: quickActionTranslateY },
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
                    translateY: quickActionTranslateY.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -140],
                    }),
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
          <LinearGradient
            colors={['#51CF66', '#40C057']}
            style={styles.fabGradient}
          >
            <Animated.View
              style={{
                transform: [{ rotate: rotation }],
              }}
            >
              <Ionicons name="add" size={32} color="#FFFFFF" />
            </Animated.View>
          </LinearGradient>
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
    zIndex: 998,
  },

  quickActionsContainer: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },

  quickActionWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },

  quickActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  expenseButton: {
    backgroundColor: '#FF6B6B',
  },

  incomeButton: {
    backgroundColor: '#51CF66',
  },

  frequentActionButton: {
    backgroundColor: '#339AF0',
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
    marginTop: 4,
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '500',
    maxWidth: 60,
    textAlign: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});
