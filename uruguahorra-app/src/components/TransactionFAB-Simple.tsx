import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { QuickTransactionModal } from './QuickTransactionModal';
import { useTransactionsStore } from '@/store/useTransactionsStore';

const { width, height } = Dimensions.get('window');

interface TransactionFABProps {
  userId: string;
  onTransactionCreated?: (transaction: any) => void;
  showGoalOption?: boolean;
}

export const TransactionFAB: React.FC<TransactionFABProps> = ({
  userId,
  onTransactionCreated,
  showGoalOption = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'expense' | 'income' | null>(null);
  const router = useRouter();

  const { frequentCategories } = useTransactionsStore();

  // Animaciones
  const expandAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;

    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(rotateAnim, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();

    setIsExpanded(!isExpanded);
  };

  const openModal = (type: 'expense' | 'income' | null = null) => {
    setModalType(type);
    setModalVisible(true);
    setIsExpanded(false);

    // Reset animations
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNewGoal = () => {
    setIsExpanded(false);
    // Reset animations
    Animated.parallel([
      Animated.spring(expandAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
    router.push('/create-goal');
  };

  const handleTransactionCreated = (transaction: any) => {
    setModalVisible(false);
    setModalType(null);
    onTransactionCreated?.(transaction);
  };

  // Posición discreta como sidebar pequeño
  const bottomOffset = 150; // Altura desde el bottom, más arriba para no estorbar

  return (
    <>
      {/* Overlay cuando está expandido */}
      {isExpanded && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={toggleExpand}
        />
      )}

      {/* Container principal - estilo sidebar discreto */}
      <View style={[styles.container, { bottom: bottomOffset, right: 16 }]}>
        {/* Botones de acción rápida */}
        <Animated.View
          style={[
            styles.actionsContainer,
            {
              opacity: expandAnim,
              transform: [
                {
                  translateY: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isExpanded ? 'auto' : 'none'}
        >
          {/* Gasto rápido */}
          <TouchableOpacity
            style={[styles.actionButton, styles.expenseButton]}
            onPress={() => openModal('expense')}
            activeOpacity={0.8}
          >
            <Ionicons name="remove" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Gasto</Text>
          </TouchableOpacity>

          {/* Ingreso rápido */}
          <TouchableOpacity
            style={[styles.actionButton, styles.incomeButton]}
            onPress={() => openModal('income')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Ingreso</Text>
          </TouchableOpacity>

          {/* Nueva meta - Solo si showGoalOption es true */}
          {showGoalOption && (
            <TouchableOpacity
              style={[styles.actionButton, styles.goalButton]}
              onPress={handleNewGoal}
              activeOpacity={0.8}
            >
              <Ionicons name="flag" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Nueva meta</Text>
            </TouchableOpacity>
          )}

        </Animated.View>

        {/* Botón principal FAB */}
        <TouchableOpacity
          style={[styles.fab, isExpanded && styles.fabExpanded]}
          onPress={toggleExpand}
          activeOpacity={0.9}
        >
          {/* Fondo con gradiente simulado */}
          <View style={styles.fabGradient}>
            <Animated.View
              style={[
                styles.fabIcon,
                {
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '45deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Animated.View>
          </View>

          {/* Indicador de transacciones pendientes (opcional) */}
          <View style={styles.pulseDot} />
        </TouchableOpacity>
      </View>

      {/* Modal de transacción rápida */}
      <QuickTransactionModal
        visible={modalVisible}
        userId={userId}
        initialType={modalType}
        onClose={() => {
          setModalVisible(false);
          setModalType(null);
        }}
        onTransactionCreated={handleTransactionCreated}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 998,
  },

  container: {
    position: 'absolute',
    right: 20,
    alignItems: 'center',
    zIndex: 999,
  },

  actionsContainer: {
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    gap: 8,
  },

  expenseButton: {
    backgroundColor: '#FF6B6B',
  },

  incomeButton: {
    backgroundColor: '#51CF66',
  },

  goalButton: {
    backgroundColor: '#8B5CF6',
  },

  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },

  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#339AF0',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 6,
  },

  fabExpanded: {
    shadowOpacity: 0.25,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },

  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#339AF0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#74C0FC',
    opacity: 0.9,
  },

  fabIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  pulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD93D',
    shadowColor: '#FFD93D',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
});
